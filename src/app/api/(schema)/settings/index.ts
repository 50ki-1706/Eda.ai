import { apiKeyProviders } from "@/constants/models";
import * as v from "valibot";

/**
 * 設定画面で扱う入力スキーマ（API キー・モデル選択）
 *
 * oRPC のコントラクト（`src/lib/orpc/contract.ts`）とサーバー実装の双方から参照される。
 * 入力型は `v.InferInput`、出力型は `v.InferOutput` で導出する。
 */

export const saveApiKeyInputSchema = v.object({
  provider: v.picklist(apiKeyProviders),
  apiKey: v.pipe(v.string(), v.minLength(1, "API キーを入力してください")),
});

export const deleteApiKeyInputSchema = v.object({
  provider: v.picklist(apiKeyProviders),
});

export const saveModelInputSchema = v.object({
  modelId: v.pipe(v.string(), v.minLength(1)),
});

/** 入力型（コントラクトの `.input()`・サーバー実装の引数で使う） */
export type SaveApiKeyInputPayload = v.InferInput<typeof saveApiKeyInputSchema>;
export type DeleteApiKeyInputPayload = v.InferInput<
  typeof deleteApiKeyInputSchema
>;
export type SaveModelInputPayload = v.InferInput<typeof saveModelInputSchema>;

/** 出力型（バリデーション後の型。既存のエクスポート名を維持する） */
export type SaveApiKeyInput = v.InferOutput<typeof saveApiKeyInputSchema>;
export type DeleteApiKeyInput = v.InferOutput<typeof deleteApiKeyInputSchema>;
export type SaveModelInput = v.InferOutput<typeof saveModelInputSchema>;
