# API Documentation

このドキュメントは、利用可能なAPIエンドポイントの概要、その使用法、および期待される入力/出力スキーマを提供します。
現在のAPIはtRPCの `apiClient` を介して利用できます。

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

## Chat API

### `chat.new`

新しいチャットを作成します。LLM にプロンプトを送信してレスポンスと要約を生成し、Chat・Branch・Message を一括で永続化します。

```typescript
const res = await apiClient.chat.new.mutate(input);
```

**Input:**

```typescript
{
  promptText: string,
  promptFile?: { data: string; mimeType: string }, // base64 encoded string
  modelId?: string, // 例: "google:google/gemini-2.5-flash"
}
```

**Response:**

```typescript
{
  chat: {
    id: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
    summary: string;
    isPinned: boolean;
  },
  branch: {
    id: string;
    createdAt: Date;
    summary: string;
    parentBranchId: string | null;
    chatId: string;
    isMerged: boolean;
  },
  message: {
    id: string;
    createdAt: Date;
    promptText: string;
    promptFile: string | null;
    branchId: string;
    parentId: string | null;
    response: string;
  }
}
```

### `chat.branch.sendMessage`

特定のブランチにメッセージを送信します。過去の会話履歴をLLMに渡してコンテキストを維持したレスポンスを生成します。

```typescript
const res = await apiClient.chat.branch.sendMessage.mutate(input);
```

**Input:**

```typescript
{
  promptText: string,
  promptFile?: { data: string; mimeType: string }, // base64 encoded string
  branchId: string, // uuid
  latestMessageId: string, // uuid
  modelId?: string, // 例: "openrouter:google/gemini-2.5-flash"
}
```

**Response:**

```typescript
{
  id: string,
  createdAt: Date,
  promptText: string,
  promptFile: string | null,
  branchId: string,
  parentId: string | null,
  response: string,
}
```

### `chat.branch.merge`

ブランチをその親にマージします。

```typescript
const res = await apiClient.chat.branch.merge.mutate(input);
```

**Input:**

```typescript
{
  branchId: string, // uuid
}
```

**Response:**
`void`

### `chat.branch.new`

親ブランチから新しいブランチを作成します。

```typescript
const res = await apiClient.chat.branch.new.mutate(input);
```

**Input:**

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

**Response:**

```typescript
{
  id: string,
  summary: string,
  parentBranchId: string | null,
  chatId: string,
  createdAt: Date,
  isMerged: boolean,
}
```

### `chat.branch.getMessages`

特定のブランチのすべてのメッセージを取得します。

```typescript
const res = await apiClient.chat.branch.getMessages.query(input);
```

**Input:**

```typescript
{
  branchId: string, // uuid
}
```

**Response:**

```typescript
[
  {
    id: string,
    promptText: string,
    promptFile: string | null,
    response: string,
    parentId: string | null,
    branchId: string,
    createdAt: Date,
  }
]
```

### `chat.branch.structure`

特定のチャットに紐づくブランチを木構造で取得します。

```typescript
const res = await apiClient.chat.branch.structure.query(input);
```

**Input:**

```typescript
{
  chatId: string, // uuid
}
```

**Response:**

```typescript
// react-d3-tree の RawNodeDatum 互換オブジェクト
{
  name: string,
  attributes?: { id: string },
  children?: RawNodeDatum[],
}
```

### `chat.updatePinned`

チャットのピン留め状態を更新します。

```typescript
const res = await apiClient.chat.updatePinned.mutate(input);
```

**Input:**

```typescript
{
  chatId: string, // uuid
  isPinned: boolean,
}
```

**Response:**

```typescript
{
  id: string,
  userId: string,
  createdAt: Date,
  updatedAt: Date,
  summary: string,
  isPinned: boolean,
}
```

### `chat.getChatsByUserId`

現在のユーザーのチャット一覧を取得します（ピン留めが上に来るよう並び替えられます）。

```typescript
const res = await apiClient.chat.getChatsByUserId.query();
```

**Input:**
`None`

**Response:**

```typescript
[
  {
    id: string,
    userId: string,
    createdAt: Date,
    updatedAt: Date,
    summary: string,
    isPinned: boolean,
  }
]
```

## Settings API

ユーザーの API キーと選択中モデルを管理します。API キーはサーバー側で AES-256-GCM により暗号化して保存され、平文・復号値がクライアントへ返ることはありません。

### `settings.get`

登録済み API キー・モデル一覧・選択中モデルを取得します。

```typescript
const res = await apiClient.settings.get.query();
```

**Input:**
`None`

**Response:**

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

```typescript
const res = await apiClient.settings.getModels.query();
```

**Input:**
`None`

**Response:**

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

```typescript
const res = await apiClient.settings.saveApiKey.mutate(input);
```

**Input:**

```typescript
{
  provider: "openrouter" | "opencode" | "google",
  apiKey: string,
}
```

**Response:**

```typescript
{
  provider: string,
  keyHint: string,
  createdAt: Date,
  updatedAt: Date,
}
```

### `settings.deleteApiKey`

API キーを削除します。

```typescript
await apiClient.settings.deleteApiKey.mutate(input);
```

**Input:**

```typescript
{
  provider: "openrouter" | "opencode" | "google",
}
```

**Response:**
`void`

### `settings.saveModel`

選択中モデルを保存します。

```typescript
const res = await apiClient.settings.saveModel.mutate(input);
```

**Input:**

```typescript
{
  modelId: string, // 例: "google:google/gemini-2.5-flash"
}
```

**Response:**

```typescript
{
  modelId: string,
  updatedAt: Date,
}
```
