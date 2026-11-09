# リビルド後のリファクタリング方針

## 概要

`feat!/rebuild` ブランチでバックエンド（oRPC + valibot）、UI（CSS Modules）、データアクセス（reylo）を一新した。
そのリビルドで残った**型・責務の重複**と**移行時の名残**を整理し、以降の変更コストを下げるための方針をまとめる。

コードの振る舞い（API の入出力・画面の挙動）は変えない。

---

## 背景・課題

リビルドは「動く状態」を優先して段階的に進めたため、次のような負債が残っていた。

| 課題 | 具体例 |
| :--- | :--- |
| 型の定義元が分散 | `CatalogModel` が `(LLM)/catalog.ts`（`server-only`）、`ProviderStatus` / `SettingsState` が `(Contoller)/settings.ts` にあり、クライアントがサーバー層を import していた |
| 型の重複 | `RawNodeDatum`（`src/types/tree.ts`）と `TreeNode`（`contract.ts`）が同じ構造を二重に表現し、ルーターで毎回変換していた |
| 入力型の二重エクスポート | `XxxInputPayload`（`InferInput`）と `XxxInput`（`InferOutput`）を両方公開していたが、実際に使われていたのは後者のみ |
| ストリーミング処理の重複 | `chat.new` と `chat.branch.sendMessage` の `for await` 消費ロジックが 2 つのフックにほぼ同じ形で存在 |
| 位置引数の多い Repository | `createMessage(branchId, promptText, promptFile, response, parentId)` のように同型の引数が並び、取り違えても型で検出できなかった |
| 未使用コード | `src/lib/_unused.ts`、空の `src/constants/index.ts`・`src/schema/index.ts`、`LLMProvider.generateContent`、`useMessageInput` の未使用引数 |
| 移行時の名残 | CI・README の `prisma generate`、ドキュメント内の存在しないファイル名（`Sidebar.tsx`、`PageContainer.tsx`） |

---

## 決定事項

### 1. ドメイン型は `src/types/index.ts` を単一定義元にする

`Chat` / `Branch` / `Message` / `TreeNode` / `CatalogModel` / `ProviderStatus` / `SettingsState` をすべて `src/types` に集約した。

- クライアントはサーバー層（`(LLM)/`・`(Contoller)/`）ではなく `@/types` から型を import する
- `src/types` は `@/constants/models` 以外に依存しない（クライアント安全）

### 2. 出力スキーマは `satisfies` で型と一致を保証する

valibot スキーマはコントラクト（`src/lib/orpc/contract.ts`）に置き、`v.GenericSchema<ドメイン型>` を `satisfies` で満たすことをコンパイル時に検証する。

```typescript
export const chatSchema = v.object({ /* ... */ }) satisfies v.GenericSchema<Chat>;
```

これにより「型を変えたのにスキーマを直し忘れる」事故が型エラーとして検出される。
入力スキーマは従来どおり `src/app/api/(schema)/` に置き、`v.InferOutput` の型だけを公開する。

### 3. ツリー変換は Controller 層の純粋関数に閉じる

`RawNodeDatum` を廃止し、Controller が `TreeNode`（`attributes.id` と `children` が必須）を直接返す。
ルーターは変換せずにそのまま返すため、`normalizeTreeNode` のような中間処理が不要になった。

ブランチの親子関係を扱う処理（子孫の収集・ツリー構築）は `(Contoller)/branchTree.ts` に純粋関数として分離した。

### 4. Repository の引数はオブジェクトで受け取る

同型の引数が並ぶメソッド（メッセージ作成・チャット作成）はオブジェクト引数に変更した。
呼び出し側で引数の意味が読めるようになり、取り違えが型で検出される。

### 5. ストリーミングの消費は共通フックに集約する

`useChatStream`（`src/hooks/common/useChatStream.ts`）が `delta` の追記・`done` の通知・アンマウント時の中断を担当する。
各画面のフック（`useMessageInput` / `useFirstMessageInput`）は「完了時に何をするか」だけを書く。

### 6. 画面をまたぐ状態はフック単位で分ける

`useUserSettings`（設定の取得・保存）を `useModelPicker`（ピッカーの開閉・絞り込み）から分離した。
1 つのフックが「データ取得」と「UI 状態」の両方を抱えないようにする。

---

## 影響・トレードオフ

### メリット

- **型の参照先が一意**: クライアントがサーバー実装に依存しなくなり、`server-only` の境界が明確になる
- **スキーマと型の乖離を検出**: `satisfies` により、どちらかの変更漏れがコンパイルエラーになる
- **重複の削減**: ストリーミング消費・ツリー変換・型エクスポートの重複がなくなった
- **不要コードの削除**: 未使用ファイル・メソッド・引数を削除し、読むべきコードが減った

### トレードオフ・注意点

- **`src/types` の肥大化**: ドメイン型が 1 ファイルに集まるため、増えすぎたら `types/` 配下で分割する
- **`satisfies` の記述量**: スキーマごとに型引数を書く必要があるが、型とスキーマの対応が明示される利点が上回る
- **`(Contoller)` の綴り**: ディレクトリ名の誤記（Controller → Contoller）は import パスに広く影響するため、今回は変更せず据え置いた

---

## 参考

- API の仕様は [API ドキュメント](../APIDOC.md) を参照
- 層構造の考え方は [バックエンド設計選定理由](./backend_design.md) を参照
- oRPC への移行経緯は [oRPC + valibot への移行](./orpc_valibot_migration.md) を参照
