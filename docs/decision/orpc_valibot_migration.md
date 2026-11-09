# oRPC + valibot への移行

## 概要

本プロジェクトの API 層を、**tRPC + zod** から **oRPC + valibot** へ移行した。
あわせて、チャット応答を **SSE ストリーミング**に変更し、**OpenAPI 仕様 + Swagger UI** を自動生成するようにした。

| 変更前 | 変更後 |
| :--- | :--- |
| tRPC | **oRPC**（`@orpc/server`, `@orpc/client`, `@orpc/contract`, `@orpc/openapi`） |
| zod | **valibot**（`valibot`, `@orpc/valibot`） |
| 非ストリーミング | チャットは **SSE ストリーミング** |
| API 型の重複 | **フロント/バック共通コントラクト**（`src/lib/orpc/contract.ts`） |
| API ドキュメントなし | **OpenAPI 仕様 + Swagger UI** |

---

## 背景・課題

### 1. tRPC + zod の制約

- **API 仕様を外部に公開できない**: tRPC は TypeScript の型推論に依存するため、OpenAPI のような機械可読な仕様を標準では出力できない。Swagger UI で確認できる形の API ドキュメントが存在しなかった。
- **スキーマと実装の対応が暗黙的**: ルーター定義と入出力スキーマが同じファイルに混在し、フロント側の型は「実装から推論された結果」としてしか得られない。
- **zod のバンドルサイズ**: zod はスキーマ定義とバリデーションが一体で、クライアントバンドルにも含まれる。フロント/バックでスキーマを共有する構成では、このサイズがそのままクライアントに乗る。

### 2. フロント/バックの型共通化

チャット画面・設定画面のフック（`src/hooks/`）は API の入出力型に依存している。
tRPC ではルーター実装から推論した型をクライアントに渡していたが、これは「サーバー実装を import できる」前提に依存しており、サーバー専用モジュール（DB・認証・環境変数）との境界が曖昧になりやすかった。

### 3. ストリーミングの必要性

チャットアプリでは、LLM の応答を全文生成してから返すと待ち時間が長く、UX を損なう。
応答を差分で逐次表示するには、非ストリーミングの手続き呼び出しでは対応できない。

### 4. API ドキュメントの不在

エンドポイントの一覧・入出力はコードを読むしかなく、新規参加メンバーやレビュー時の確認コストが高かった。

---

## 決定事項

1. **oRPC を採用**し、`@orpc/contract` でフロント/バック共通のコントラクト（`src/lib/orpc/contract.ts`）を定義する
2. **valibot を採用**し、入出力スキーマを `src/app/api/(schema)/` に記述する
3. **OpenAPI 3.1.1 仕様を自動生成**し、**Swagger UI** で配信する（`/api/openapi`, `/api/openapi/spec.json`）
4. チャット応答は oRPC の **`eventIterator`**（SSE）でストリーミングする
5. サーバー実装は `implement(contract)` でコントラクトに束縛し、入出力の型不一致をコンパイル時に検出する

---

## 理由・比較

### tRPC から oRPC へ

| 観点 | tRPC | oRPC |
| :--- | :--- | :--- |
| 型安全性 | 実装から型を推論 | **コントラクトを定義元にして型を推論**（フロント/バック共通） |
| OpenAPI 仕様 | 標準サポートなし | **`@orpc/openapi` で自動生成** |
| Swagger UI | 標準サポートなし | **`OpenAPIReferencePlugin` で配信** |
| REST 互換 | 独自プロトコル | **同じルーターを REST としても公開**（`/api/openapi/chats` 等） |
| ストリーミング | Subscription（WebSocket 前提） | **`eventIterator` で SSE** |
| 実装の縛り | ルーター実装がそのまま定義 | **`implement(contract)` で実装と定義を分離** |

oRPC は「コントラクトを先に定義し、サーバーはそれを実装する」という構造を取れるため、フロント/バックの型共通化と OpenAPI 生成を**同じ定義から**行える。tRPC の型安全性を保ちつつ、REST/OpenAPI 互換とストリーミングを同時に得られる点が決め手となった。

**他の選択肢を選ばなかった理由**:

- **tRPC のまま `trpc-openapi` 等で仕様を生成**: 追加アダプタのメンテナンスが必要で、ストリーミング（Subscription）は WebSocket が前提となり、Next.js の Route Handler と噛み合わない
- **REST API を手書き（Hono 等）**: 型をフロントと共有するには結局スキーマの二重管理か、別の型生成ステップが必要になる

### zod から valibot へ

| 観点 | zod | valibot |
| :--- | :--- | :--- |
| バンドルサイズ | 大きい（スキーマ・バリデーションが一体） | **小さい**（必要な機能だけ tree-shaking 可能） |
| スキーマの記述 | メソッドチェーン（`z.string().uuid()`） | **関数合成**（`v.pipe(v.string(), v.uuid())`） |
| 型推論 | `z.infer` | `v.InferInput` / `v.InferOutput` |
| oRPC 連携 | コミュニティ製アダプタ | **公式の `@orpc/valibot`**（JSON Schema 変換を含む） |

フロント/バックでスキーマを共有する構成では、スキーマがクライアントバンドルに含まれる。valibot は関数ベースで tree-shaking が効くため、実際に使ったバリデータだけがバンドルされる。また `@orpc/valibot` の `experimental_ValibotToJsonSchemaConverter` により、valibot スキーマをそのまま OpenAPI の JSON Schema に変換できる。

### ストリーミングに SSE を選んだ理由

- Next.js の Route Handler（`/api/rpc`, `/api/openapi`）でそのまま扱える
- oRPC の `eventIterator` が SSE を標準でサポートし、クライアントは `Promise<AsyncIterable<イベント>>` として受け取れる
- WebSocket のように別サーバー・接続管理が不要で、Vercel 上でも動作する

---

## 実装構成

### ディレクトリ構成

```
src/lib/orpc/
├── contract.ts   # フロント/バック共通コントラクト（valibot で入出力を定義、OpenAPI の route 情報付き）
├── router.ts     # コントラクトを implement するサーバー実装
├── procedure.ts  # 認証ミドルウェア（未ログインは UNAUTHORIZED）
├── context.ts    # リクエスト単位のコンテキスト（ログインユーザー情報）
└── client.ts     # oRPC クライアント（RPCLink）

src/app/api/rpc/[[...rest]]/route.ts       # RPCHandler（型安全 RPC）
src/app/api/openapi/[[...rest]]/route.ts   # OpenAPIHandler + Swagger UI
src/app/api/(schema)/                      # valibot スキーマ（chat / settings）
```

削除済み: `src/app/api/trpc/`, `src/lib/trpc.ts`

### 責務の分離

- **コントラクト**（`contract.ts`）: method / path / 入出力スキーマのみを持つ。クライアントからも import されるため、`server-only`・DB・認証・環境変数に依存するモジュールは import しない
- **ルーター**（`router.ts`）: `implement(contract)` でコントラクトに束縛し、既存の Controller 層（`src/app/api/(Contoller)/`）を呼び出す。2 層構造（Controller / Repository）は維持
- **認証**（`procedure.ts`）: 認証ミドルウェアをコントラクトの型を保ったまま `.use()` で適用

### URL

| 用途 | URL |
| :--- | :--- |
| 型安全 RPC | `/api/rpc`（例: `POST /api/rpc/chat/getChatsByUserId`） |
| Swagger UI | `/api/openapi` |
| OpenAPI 仕様 JSON | `/api/openapi/spec.json`（OpenAPI 3.1.1） |
| REST 呼び出し | `/api/openapi/chats` など（spec の path そのまま） |

---

## 移行内容（エンドポイントの対応表）

| oRPC 手続き | method / path | input | output |
| :--- | :--- | :--- | :--- |
| `chat.new` | POST `/chats` | `createChatInputSchema` | **eventIterator**（ストリーミング） |
| `chat.updatePinned` | PATCH `/chats/{chatId}/pinned` | `updateChatIsPinnedInputSchema` | `chatSchema` |
| `chat.getChatsByUserId` | GET `/chats` | なし | `chatSchema[]` |
| `chat.branch.structure` | GET `/chats/{chatId}/tree` | `branchStructureInputSchema` | `treeNodeSchema` |
| `chat.branch.sendMessage` | POST `/branches/{branchId}/messages` | `sendMessageInputSchema` | **eventIterator**（ストリーミング） |
| `chat.branch.merge` | POST `/branches/{branchId}/merge` | `mergeBranchInputSchema` | `void` |
| `chat.branch.new` | POST `/branches` | `newBranchInputSchema` | `branchSchema` |
| `chat.branch.getMessages` | GET `/branches/{branchId}/messages` | `getMessageInputSchema` | `messageSchema[]` |
| `settings.get` | GET `/settings` | なし | `settingsStateSchema` |
| `settings.getModels` | GET `/settings/models` | なし | `catalogModelSchema[]` |
| `settings.saveApiKey` | PUT `/settings/api-keys` | `saveApiKeyInputSchema` | `void` |
| `settings.deleteApiKey` | DELETE `/settings/api-keys/{provider}` | `deleteApiKeyInputSchema` | `void` |
| `settings.saveModel` | PUT `/settings/model` | `saveModelInputSchema` | `void` |

手続き名（`chat.branch.sendMessage` 等）は tRPC 時代の構造をそのまま維持しているため、呼び出し側の変更は「`.query()` / `.mutate()` を外す」だけで済んだ。

### クライアント呼び出しの変更

```typescript
// 変更前（tRPC）
const res = await apiClient.chat.branch.sendMessage.mutate(input);

// 変更後（oRPC）
const iterator = await client.chat.branch.sendMessage(input);
for await (const event of iterator) {
  if (event.type === "delta") setStreamingText((prev) => prev + event.text);
  else if (event.type === "done") setMessages([...messages, event.message]);
}
```

### ストリーミングのイベント型

`type` で分岐する判別可能ユニオンとして定義（`contract.ts`）。

```typescript
// テキスト差分（何度でも届く）
{ type: "delta", text: string }

// chat.new の完了イベント（必ず最後の1件）
{ type: "done", chat: Chat, branch: Branch, message: Message }

// chat.branch.sendMessage の完了イベント（必ず最後の1件）
{ type: "done", message: Message }
```

### エラーハンドリングの変更

- tRPC の `TRPCError` → **`ORPCError`**
- 未ログイン: `ORPCError("UNAUTHORIZED", { message: "ログインしてください。" })`（HTTP 401）
- 入力検証失敗: oRPC が自動で `BAD_REQUEST`（valibot の検証結果が `cause` に入る）
- その他: `BAD_REQUEST` / `NOT_FOUND` / `PRECONDITION_FAILED`

---

## 影響・トレードオフ

### メリット

- **型の単一の定義元**: コントラクトをフロント/バックで共有し、入出力の型が必ず一致する（`implement(contract)` によりコンパイル時に検証）
- **API ドキュメントの自動生成**: `.route()` と valibot スキーマから OpenAPI 仕様と Swagger UI が生成され、実装とドキュメントが乖離しない
- **REST 互換**: 同じルーターを `/api/openapi` 配下で REST として呼び出せる
- **UX の向上**: LLM の応答が逐次表示され、待ち時間が体感上短くなる
- **バンドルサイズの削減**: valibot の tree-shaking により、クライアントに載るスキーマが小さくなる

### トレードオフ・注意点

- **学習コスト**: oRPC のコントラクト / `implement` / `eventIterator` という概念は tRPC とは異なる。新規参加者は `contract.ts` → `router.ts` の順に読む必要がある
- **コントラクトの制約**: `contract.ts` はクライアントからも import されるため、サーバー専用モジュールを import できない。スキーマと定数は純粋な定義に保つ必要がある
- **path parameter の命名**: `{chatId}` 等を使う場合、input スキーマのキー名を path parameter 名と一致させる必要がある
- **ストリーミングの状態管理**: 中断（アンマウント・画面遷移）時の挙動をクライアント側で扱う必要がある。サーバーは切断時に LLM 呼び出しを中断し、途中までのテキストを **DB に保存しない**
- **エラーの扱い**: ストリーム開始後に発生したエラーはイベントではなく `ORPCError` として送出されるため、`for await` を `try/catch` で囲む必要がある
- **`@orpc/valibot` の JSON Schema 変換は experimental**: バージョンアップ時に API が変わる可能性がある

---

## 参考

- エンドポイントの詳細・ストリーミング仕様は [API ドキュメント](../APIDOC.md) を参照
- バックエンドの層構造は [バックエンド設計選定理由](./backend_design.md) を参照
