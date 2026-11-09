import { apiKeyProviders } from "@/constants/models";
import z from "zod";

/** 設定画面で扱う入力スキーマ（API キー・モデル選択） */

export const saveApiKeyInputSchema = z.object({
  provider: z.enum(apiKeyProviders),
  apiKey: z.string().min(1, "API キーを入力してください"),
});

export const deleteApiKeyInputSchema = z.object({
  provider: z.enum(apiKeyProviders),
});

export const saveModelInputSchema = z.object({
  modelId: z.string().min(1),
});

export type SaveApiKeyInput = z.infer<typeof saveApiKeyInputSchema>;
export type DeleteApiKeyInput = z.infer<typeof deleteApiKeyInputSchema>;
export type SaveModelInput = z.infer<typeof saveModelInputSchema>;
