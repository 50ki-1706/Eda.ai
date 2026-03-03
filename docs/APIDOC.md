# API Documentation

このドキュメントは、利用可能なAPIエンドポイントの概要、その使用法、および期待される入力/出力スキーマを提供します。
現在のAPIはtRPCの `apiClient` を介して利用できます。

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
  provider: "gemini" | "openrouter",
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
  provider: "gemini" | "openrouter",
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
