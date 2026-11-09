# API Documentation

このドキュメントは、利用可能な API エンドポイントの概要、その使用法、および期待される入力/出力スキーマを提供します。

## 概要

本プロジェクトの API は **oRPC** で実装されています。フロントエンドとバックエンドが **同じコントラクト**（`src/lib/orpc/contract.ts`）を共有するため、エンドポイントの入力・出力の型はフロントとバックで自動的に一致します。

| 項目 | 採用技術 | 補足 |
| :--- | :--- | :--- |
| RPC フレームワーク | **oRPC**（`@orpc/server`, `@orpc/client`, `@orpc/contract`, `@orpc/openapi`） | 型安全な手続き呼び出し |
| バリデーション | **valibot**（`valibot`, `@orpc/valibot`） | 入力/出力スキーマと OpenAPI の JSON Schema 変換 |
| 共通コントラクト | `src/lib/orpc/contract.ts` | フロント/バック共通の単一の定義元 |
| ストリーミング | **SSE**（`text/event-stream`）+ oRPC の `eventIterator` | チャットの応答を逐次返す |
| API ドキュメント | **OpenAPI 3.1.1** + **Swagger UI** | コントラクトから自動生成 |

### エンドポイントの URL

| 用途 | URL | 説明 |
| :--- | :--- | :--- |
| 型安全 RPC | `/api/rpc` | oRPC クライアント（`RPCLink`）が使用する基点。例: `POST /api/rpc/chat/getChatsByUserId` |
| Swagger UI | **`/api/openapi`** | ブラウザで API リファレンスを閲覧・実行できる |
| OpenAPI 仕様 JSON | **`/api/openapi/spec.json`** | OpenAPI 3.1.1 形式の仕様（外部ツール連携用） |
| REST 呼び出し | `/api/openapi/<path>` | 仕様の `path` をそのまま使って REST として呼び出せる。例: `GET /api/openapi/chats` |

- 通常のアプリ内通信は **`/api/rpc`**（`client` 経由）を使います。
- **`/api/openapi`** は仕様確認と外部連携用です。どちらも同じルーター（`src/lib/orpc/router.ts`）を共有しています。

### ディレクトリ構成

```
src/lib/orpc/
├── contract.ts   # フロント/バック共通コントラクト（valibot で入出力を定義、OpenAPI の route 情報付き）
├── router.ts     # コントラクトを implement するサーバー実装
├── procedure.ts  # 認証ミドルウェア（未ログインなら UNAUTHORIZED）
├── context.ts    # リクエスト単位のコンテキスト（ログインユーザー情報）
└── client.ts     # oRPC クライアント（RPCLink）

src/app/api/rpc/[[...rest]]/route.ts       # RPCHandler（型安全 RPC）
src/app/api/openapi/[[...rest]]/route.ts   # OpenAPIHandler + Swagger UI
src/app/api/(schema)/                      # valibot スキーマ（chat / settings）
```

## LLM プロバイダーの構成

ユーザーは自分の API キーを登録してアプリを利用します。プロバイダーごとに接続方式が異なります。

| プロバイダー        | 接続方式                                              | キーの登録 |
| ------------------- | ----------------------------------------------------- | ---------- |
| `google`            | Vercel AI Gateway（ユーザーキーを BYOK として送信）   | 必要       |
| `openrouter`        | OpenRouter へ直接接続                                 | 必要       |
| `opencode`          | OpenCode Zen の OpenAI 互換エンドポイントへ直接接続   | 必要       |

- モデルは `<provider>:<modelId>` 形式の ID で指定します（例: `google:google/gemini-2.5-flash`）。
- `modelId` を省略した場合は、ユーザーの保存済み設定 → 既定モデルの順で解決されます。
- **モデル一覧はハードコードせず、各プロバイダーの公開カタログから自動取得します**（`src/app/api/(LLM)/catalog.ts`）。サーバー側で 10 分間キャッシュし、常に最新のモデルがピッカーに表示されます。
  - OpenRouter: `https://openrouter.ai/api/v1/models`
  - OpenCode Zen: `https://opencode.ai/zen/v1/models`
  - Google AI Studio（AI Gateway 経由）: `https://ai-gateway.vercel.sh/v1/models`
- 廃止されたモデルは保存・送信時に `BAD_REQUEST` で拒否されます。
- 対応プロバイダーの API キーが未登録の場合、`PRECONDITION_FAILED` エラーを返します。

## エンドポイント一覧

すべての手続きは認証必須です（認証ミドルウェア `src/lib/orpc/procedure.ts`）。

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

> **path parameter について**: `{chatId}`・`{branchId}`・`{provider}` のような path parameter を使う手続きでは、input スキーマのキー名が path parameter 名と一致している必要があります（例: `branchStructureInputSchema` のキーは `chatId`）。

## クライアントの使い方

`src/lib/orpc/client.ts` がエクスポートする `client` を使います。型はコントラクト（`AppContract`）から `ContractRouterClient<AppContract>` として自動推論されます。

```typescript
import { client } from "@/lib/orpc/client";

// 通常の手続き（.query() / .mutate() は不要。手続きを直接呼び出す）
const chats = await client.chat.getChatsByUserId();
await client.settings.saveModel({ modelId });

const messages = await client.chat.branch.getMessages({ branchId });
```

- ブラウザからは現在のオリジン（`window.location.origin`）の `/api/rpc` へリクエストします。
- サーバーサイドでは `NEXT_PUBLIC_APP_URL` を基点とし、受信リクエストのヘッダー（認証 Cookie を含む）を引き継ぎます。
- ストリーミング手続き（`chat.new` / `chat.branch.sendMessage`）は `Promise<AsyncIterable<イベント>>` を返すため、`for await` で消費します（後述の「ストリーミング仕様」を参照）。

## ストリーミング仕様

`chat.new` と `chat.branch.sendMessage` は oRPC の **`eventIterator`** を返します。クライアント側では `Promise<AsyncIterable<イベント>>` になります。

- プロトコルは **SSE（`text/event-stream`）** です。
- イベントは `type` で分岐する**判別可能ユニオン**です。
- **`done` イベントは必ず最後の 1 件**として届きます（`delta` が 0 件の場合は `done` のみ）。
- エラーはストリーム内のイベントではなく **`ORPCError`** として送出されます。
- クライアント切断時はサーバー側で LLM 呼び出しを中断し、**DB に保存しません**（途中までのテキストは破棄されます）。

### イベント型

```typescript
// テキスト差分（何度でも届く）
{ type: "delta", text: string }

// chat.new の完了イベント（必ず最後の1件）
{ type: "done", chat: Chat, branch: Branch, message: Message }

// chat.branch.sendMessage の完了イベント（必ず最後の1件）
{ type: "done", message: Message }
```

イベントのスキーマはコントラクトで定義されています（`src/lib/orpc/contract.ts`）。

| 手続き | イベントスキーマ |
| :--- | :--- |
| `chat.new` | `createChatEventSchema`（`chatDeltaEventSchema` + `createChatDoneEventSchema`） |
| `chat.branch.sendMessage` | `sendMessageEventSchema`（`chatDeltaEventSchema` + `sendMessageDoneEventSchema`） |

### 利用例

```typescript
const iterator = await client.chat.branch.sendMessage({
  promptText,
  promptFile,
  branchId,
  latestMessageId,
  modelId,
});
for await (const event of iterator) {
  if (event.type === "delta") setStreamingText((prev) => prev + event.text);
  else if (event.type === "done") setMessages([...messages, event.message]);
}
```

`chat.new` も同じ形です。`done` イベントには作成された `chat` / `branch` が入っているため、そのまま画面遷移に使えます。

```typescript
const iterator = await client.chat.new({ promptText, promptFile, modelId });
for await (const event of iterator) {
  if (event.type === "delta") setStreamingText((prev) => prev + event.text);
  else if (event.type === "done") {
    router.push(`/chat/${event.chat.id}/branch/${event.branch.id}`);
  }
}
```

### 中断時の挙動

- 画面を離れるなどで `for await` を抜け、ストリームが中断されると、サーバー側の `AbortSignal` が中断されます。
- サーバーは LLM の呼び出しを中断し、**その時点までのテキストを DB に保存しません**（`chat.new` は Chat・Branch・Message を一括作成しないため、レコード自体が作られません）。
- 中断はエラーではなく、`done` イベントも届きません。クライアントは受信済みの途中経過を破棄してください。

## Chat API

### `chat.new`

新しいチャットを作成します。LLM にプロンプトを送信して**応答をストリーミングで返し**、完了時に要約を生成して Chat・Branch・Message を一括で永続化します。

- **method / path**: `POST /chats`
- **ストリーミング**: あり（`eventIterator`）

```typescript
const iterator = await client.chat.new({
  promptText,
  promptFile,
  modelId,
});
```

**Input**（`createChatInputSchema`）:

```typescript
{
  promptText: string,
  promptFile?: { data: string; mimeType: string }, // base64 encoded string
  modelId?: string, // 例: "google:google/gemini-2.5-flash"
}
```

**Output**（`eventIterator(createChatEventSchema)`）:

```typescript
// delta イベント（0 回以上）
{ type: "delta", text: string }

// done イベント（必ず最後の 1 件）
{
  type: "done",
  chat: Chat,
  branch: Branch,
  message: Message,
}
```

`done` イベントに含まれる各レコードの形:

```typescript
// Chat
{
  id: string;
  userId: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  summary: string;
  isPinned: boolean;
}

// Branch
{
  id: string;
  createdAt: string; // ISO 8601
  summary: string;
  parentBranchId: string | null;
  chatId: string;
}

// Message
{
  id: string;
  createdAt: string; // ISO 8601
  promptText: string;
  promptFile: string | null;
  branchId: string;
  parentId: string | null;
  response: string;
}
```

### `chat.updatePinned`

チャットのピン留め状態を更新します。

- **method / path**: `PATCH /chats/{chatId}/pinned`

```typescript
const res = await client.chat.updatePinned({ chatId, isPinned });
```

**Input**（`updateChatIsPinnedInputSchema`）:

```typescript
{
  chatId: string, // uuid
  isPinned: boolean,
}
```

**Output**（`chatSchema`）:

```typescript
{
  id: string,
  userId: string,
  createdAt: string, // ISO 8601
  updatedAt: string, // ISO 8601
  summary: string,
  isPinned: boolean,
}
```

対象のチャットが存在しない場合は `NOT_FOUND` を返します。

### `chat.getChatsByUserId`

現在のユーザーのチャット一覧を取得します（ピン留めが上に来るよう並び替えられます）。

- **method / path**: `GET /chats`

```typescript
const res = await client.chat.getChatsByUserId();
```

**Input**:
`None`

**Output**（`chatSchema[]`）:

```typescript
[
  {
    id: string,
    userId: string,
    createdAt: string, // ISO 8601
    updatedAt: string, // ISO 8601
    summary: string,
    isPinned: boolean,
  }
]
```

### `chat.branch.structure`

特定のチャットに紐づくブランチを木構造で取得します。

- **method / path**: `GET /chats/{chatId}/tree`

```typescript
const res = await client.chat.branch.structure({ chatId });
```

**Input**（`branchStructureInputSchema`）:

```typescript
{
  chatId: string, // uuid
}
```

**Output**（`treeNodeSchema`、自己参照）:

```typescript
// ブランチツリーのノード（`src/types/index.ts` の TreeNode）
{
  name: string,
  attributes: { id: string },
  children: TreeNode[],
}
```

ルートブランチが見つからない場合は `NOT_FOUND` を返します。

### `chat.branch.sendMessage`

特定のブランチにメッセージを送信します。過去の会話履歴を LLM に渡してコンテキストを維持したレスポンスを**ストリーミングで返し**、完了時に Message を永続化します。

- **method / path**: `POST /branches/{branchId}/messages`
- **ストリーミング**: あり（`eventIterator`）

```typescript
const iterator = await client.chat.branch.sendMessage({
  promptText,
  promptFile,
  branchId,
  latestMessageId,
  modelId,
});
```

**Input**（`sendMessageInputSchema`）:

```typescript
{
  promptText: string,
  promptFile?: { data: string; mimeType: string }, // base64 encoded string
  branchId: string, // uuid
  latestMessageId: string, // uuid
  modelId?: string, // 例: "openrouter:google/gemini-2.5-flash"
}
```

**Output**（`eventIterator(sendMessageEventSchema)`）:

```typescript
// delta イベント（0 回以上）
{ type: "delta", text: string }

// done イベント（必ず最後の 1 件）
{
  type: "done",
  message: {
    id: string,
    createdAt: string, // ISO 8601
    promptText: string,
    promptFile: string | null,
    branchId: string,
    parentId: string | null,
    response: string,
  },
}
```

### `chat.branch.merge`

ブランチをその親にマージします。対象ブランチとその子孫のメッセージを親ブランチへ移動し、ブランチ自体を削除します。

- **method / path**: `POST /branches/{branchId}/merge`

```typescript
await client.chat.branch.merge({ branchId });
```

**Input**（`mergeBranchInputSchema`）:

```typescript
{
  branchId: string, // uuid
}
```

**Output**:
`void`

対象ブランチ、または親ブランチが存在しない場合は `NOT_FOUND` を返します。

### `chat.branch.new`

親ブランチから新しいブランチを作成します。

- **method / path**: `POST /branches`

```typescript
const res = await client.chat.branch.new({
  summary,
  parentBranchId,
  chatId,
  messageId,
  promptText,
  response,
});
```

**Input**（`newBranchInputSchema`）:

```typescript
{
  summary: string,
  parentBranchId: string, // uuid
  chatId: string, // uuid
  messageId: string, // uuid
  promptText: string,
  response: string,
}
```

**Output**（`branchSchema`）:

```typescript
{
  id: string,
  summary: string,
  parentBranchId: string | null,
  chatId: string,
  createdAt: string, // ISO 8601
}
```

分岐元のメッセージが存在しない場合は `NOT_FOUND` を返します。

### `chat.branch.getMessages`

特定のブランチのすべてのメッセージを取得します。

- **method / path**: `GET /branches/{branchId}/messages`

```typescript
const res = await client.chat.branch.getMessages({ branchId });
```

**Input**（`getMessageInputSchema`）:

```typescript
{
  branchId: string, // uuid
}
```

**Output**（`messageSchema[]`）:

```typescript
[
  {
    id: string,
    promptText: string,
    promptFile: string | null,
    response: string,
    parentId: string | null,
    branchId: string,
    createdAt: string, // ISO 8601
  }
]
```

## Settings API

ユーザーの API キーと選択中モデルを管理します。API キーはサーバー側で AES-256-GCM により暗号化して保存され、平文・復号値がクライアントへ返ることはありません。

### `settings.get`

登録済み API キー・モデル一覧・選択中モデルを取得します。

- **method / path**: `GET /settings`

```typescript
const res = await client.settings.get();
```

**Input**:
`None`

**Output**（`settingsStateSchema`）:

```typescript
{
  providers: Array<{
    provider: "openrouter" | "opencode" | "google",
    label: string,
    description: string,
    consoleUrl: string,
    keyPlaceholder: string,
    registered: boolean,
    keyHint: string | null, // 例: "sk-or-…a1b2"（未登録なら null）
    modelCount: number, // カタログから取得できたモデル数
  }>,
  models: Array<{
    id: string, // "<provider>:<modelId>"
    provider: "openrouter" | "opencode" | "google",
    modelId: string,
    label: string,
    supportsVision: boolean,
    isFree: boolean, // 入力・出力ともに無料か
    contextLength?: number,
  }>,
  modelId: string, // 現在選択中のモデル ID
  modelAvailable: boolean, // 対応プロバイダーのキーが登録済みか
}
```

保存済みモデルがカタログから消えている場合、`modelId` はキー登録済みプロバイダーの先頭モデルへ自動的にフォールバックします。

### `settings.getModels`

モデルピッカー用に、各プロバイダーの最新モデル一覧のみを取得します（`settings.get` より軽量）。サーバー側で 10 分間キャッシュされます。

- **method / path**: `GET /settings/models`

```typescript
const res = await client.settings.getModels();
```

**Input**:
`None`

**Output**（`catalogModelSchema[]`）:

```typescript
Array<{
  id: string, // "<provider>:<modelId>"
  provider: "openrouter" | "opencode" | "google",
  modelId: string,
  label: string,
  supportsVision: boolean,
  isFree: boolean,
  contextLength?: number,
}>
```

### `settings.saveApiKey`

API キーを登録・更新します（同じプロバイダーは上書き）。

- **method / path**: `PUT /settings/api-keys`

```typescript
await client.settings.saveApiKey({ provider, apiKey });
```

**Input**（`saveApiKeyInputSchema`）:

```typescript
{
  provider: "openrouter" | "opencode" | "google",
  apiKey: string, // 1 文字以上（8 文字未満はサーバー側で BAD_REQUEST）
}
```

**Output**:
`void`

### `settings.deleteApiKey`

API キーを削除します。

- **method / path**: `DELETE /settings/api-keys/{provider}`

```typescript
await client.settings.deleteApiKey({ provider });
```

**Input**（`deleteApiKeyInputSchema`）:

```typescript
{
  provider: "openrouter" | "opencode" | "google",
}
```

**Output**:
`void`

### `settings.saveModel`

選択中モデルを保存します。保存前に現行カタログへ存在するか検証し、廃止済みモデルは保存しません。

- **method / path**: `PUT /settings/model`

```typescript
await client.settings.saveModel({ modelId });
```

**Input**（`saveModelInputSchema`）:

```typescript
{
  modelId: string, // 例: "google:google/gemini-2.5-flash"
}
```

**Output**:
`void`

## エラー

エラーは oRPC の **`ORPCError`** として送出されます。RPC（`/api/rpc`）ではエラーコードがそのままクライアントに返り、REST（`/api/openapi`）では対応する HTTP ステータスになります。

| コード | HTTP | 発生条件 | 例 |
| :--- | :--- | :--- | :--- |
| `UNAUTHORIZED` | 401 | 未ログイン（認証ミドルウェア） | `ORPCError("UNAUTHORIZED", { message: "ログインしてください。" })` |
| `BAD_REQUEST` | 400 | 入力検証失敗（oRPC が自動で返す。valibot の検証結果が `cause` に入る） | uuid 形式でない `branchId`、空の `apiKey` |
| `BAD_REQUEST` | 400 | 業務上の入力不正 | 廃止されたモデルの指定、未対応のプロバイダー、短すぎる API キー |
| `NOT_FOUND` | 404 | 対象リソースが存在しない | 存在しない `chatId` / `branchId` / `messageId` |
| `PRECONDITION_FAILED` | 412 | 前提条件が満たされない | 対応プロバイダーの API キーが未登録 |

- 入力検証はコントラクトの `.input()`（valibot スキーマ）で自動的に行われます。手続きのハンドラー内で個別に検証する必要はありません。
- ハンドラー内で発生した例外は、`onError` インターセプターによりサーバーログへ出力されます。

## OpenAPI / Swagger UI の使い方

コントラクトの `.route()`（method / path / summary / description / tags）と valibot スキーマから、OpenAPI 3.1.1 仕様が自動生成されます。**手動で仕様を書く必要はありません**。

| URL | 内容 |
| :--- | :--- |
| `/api/openapi` | Swagger UI（ブラウザで閲覧・「Try it out」による実行が可能） |
| `/api/openapi/spec.json` | OpenAPI 仕様 JSON（`@orpc/openapi` の `OpenAPIReferencePlugin` が生成） |

```bash
# 開発サーバー起動後
open http://localhost:3000/api/openapi              # Swagger UI
curl http://localhost:3000/api/openapi/spec.json    # OpenAPI 仕様 JSON
```

### 仕様の確認・実行

1. `pnpm dev` で開発サーバーを起動します。
2. ブラウザで `http://localhost:3000/api/openapi` を開きます。
3. 各エンドポイントの入力・出力スキーマと説明を確認できます。「Try it out」でリクエストを送る場合は、ブラウザの Cookie による**ログイン済みセッション**が必要です。
4. 仕様 JSON を外部ツール（コード生成、API クライアント等）に取り込む場合は `/api/openapi/spec.json` を利用します。

### REST として呼び出す

`/api/openapi` 配下では、仕様の `path` をそのまま REST のエンドポイントとして呼び出せます。

```bash
# チャット一覧を取得
curl http://localhost:3000/api/openapi/chats

# ブランチ内のメッセージ一覧を取得
curl http://localhost:3000/api/openapi/branches/<branchId>/messages
```

ストリーミング手続き（`chat.new` / `chat.branch.sendMessage`）は `text/event-stream` で応答します。

### コントラクトを変更したとき

エンドポイントを追加・変更する場合は `src/lib/orpc/contract.ts` を編集します。`.route()` を付与した時点で Swagger UI と仕様 JSON に反映されるため、ドキュメント側の修正は不要です。

1. `src/lib/orpc/contract.ts` に手続きを追加（`.route()` / `.input()` / `.output()` を付与）
2. `src/lib/orpc/router.ts` に実装を追加（`implement(contract)` により入出力の型不一致はコンパイル時に検出される）
3. `/api/openapi` で仕様を確認
