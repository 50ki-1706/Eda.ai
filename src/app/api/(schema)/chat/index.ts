import * as v from "valibot";

/**
 * チャット関連 API の入力スキーマ（valibot）
 *
 * oRPC のコントラクト（`src/lib/orpc/contract.ts`）とサーバー実装の双方から参照される。
 * 入力型は `v.InferInput`、出力型は `v.InferOutput` で導出する。
 * （バリデーション変換を挟んでいないため現状は両者同型だが、
 * コントラクトの `.input()` / `.output()` の要求に合わせて別名で公開している）
 */

/** プロンプトに添付するファイル（Base64 データと MIME タイプ） */
export const promptFileSchema = v.object({
  data: v.string(),
  mimeType: v.string(),
});

export const createChatInputSchema = v.object({
  promptText: v.string(),
  promptFile: v.optional(promptFileSchema),
  /** 使用するモデルの ID（`<provider>:<modelId>`）。未指定ならユーザー設定を使う */
  modelId: v.optional(v.string()),
});

export const sendMessageInputSchema = v.object({
  promptText: v.string(),
  promptFile: v.optional(promptFileSchema),
  branchId: v.pipe(v.string(), v.uuid()),
  latestMessageId: v.pipe(v.string(), v.uuid()),
  /** 使用するモデルの ID（`<provider>:<modelId>`）。未指定ならユーザー設定を使う */
  modelId: v.optional(v.string()),
});

export const getMessageInputSchema = v.object({
  branchId: v.pipe(v.string(), v.uuid()),
});

export const newBranchInputSchema = v.object({
  summary: v.string(),
  parentBranchId: v.pipe(v.string(), v.uuid()),
  chatId: v.pipe(v.string(), v.uuid()),
  messageId: v.pipe(v.string(), v.uuid()),
  promptText: v.string(),
  response: v.string(),
});

export const mergeBranchInputSchema = v.object({
  branchId: v.pipe(v.string(), v.uuid()),
});

export const updateChatIsPinnedInputSchema = v.object({
  chatId: v.pipe(v.string(), v.uuid()),
  isPinned: v.boolean(),
});

export const branchStructureInputSchema = v.object({
  chatId: v.pipe(v.string(), v.uuid()),
});

/** 入力型（コントラクトの `.input()`・サーバー実装の引数で使う） */
export type CreateChatInputPayload = v.InferInput<typeof createChatInputSchema>;
export type SendMessageInputPayload = v.InferInput<
  typeof sendMessageInputSchema
>;
export type GetMessageInputPayload = v.InferInput<typeof getMessageInputSchema>;
export type NewBranchInputPayload = v.InferInput<typeof newBranchInputSchema>;
export type MergeBranchInputPayload = v.InferInput<
  typeof mergeBranchInputSchema
>;
export type UpdateChatIsPinnedInputPayload = v.InferInput<
  typeof updateChatIsPinnedInputSchema
>;
export type BranchStructureInputPayload = v.InferInput<
  typeof branchStructureInputSchema
>;

/** 出力型（バリデーション後の型。既存のエクスポート名を維持する） */
export type CreateChatInput = v.InferOutput<typeof createChatInputSchema>;
export type SendMessageInput = v.InferOutput<typeof sendMessageInputSchema>;
export type GetMessageInput = v.InferOutput<typeof getMessageInputSchema>;
export type NewBranchInput = v.InferOutput<typeof newBranchInputSchema>;
export type MergeBranchInput = v.InferOutput<typeof mergeBranchInputSchema>;
export type UpdateChatIsPinnedInput = v.InferOutput<
  typeof updateChatIsPinnedInputSchema
>;
export type BranchStructureInput = v.InferOutput<
  typeof branchStructureInputSchema
>;
