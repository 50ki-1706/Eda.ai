import type { Message } from "@/types";
import { generateText } from "ai";
import type { CatalogModel } from "./catalog";
import { resolveLanguageModel } from "./resolveModel";
import {
  type MessageContent,
  type ModelCredentials,
  buildMessages,
  buildSummaryPrompt,
  systemPrompt,
} from "./types";

/** LLM 呼び出しの共通インターフェース */
export interface LLMProvider {
  /** メッセージ履歴を元にコンテンツを生成する */
  generateContent(
    history: Message[] | undefined,
    messageContent: MessageContent,
  ): Promise<string>;

  /** 会話の要約（タイトル）を生成する */
  generateSummary(inputText: string, aiResponse: string): Promise<string>;
}

/**
 * モデル定義と資格情報から LLMProvider を生成する
 *
 * 資格情報はリクエスト単位で受け取るため、モジュールスコープでの
 * シングルトン化はせず、呼び出しごとにインスタンスを作る。
 */
export const createLLMProvider = (
  option: CatalogModel,
  credentials: ModelCredentials,
): LLMProvider => {
  const resolved = resolveLanguageModel(option, credentials);

  const generate = async (
    history: Message[] | undefined,
    messageContent: MessageContent,
  ): Promise<string> => {
    const { text } = await generateText({
      model: resolved.model,
      system: systemPrompt,
      messages: buildMessages(history, messageContent),
      providerOptions: resolved.providerOptions,
    });

    return text;
  };

  return {
    generateContent: generate,

    generateSummary: async (inputText: string, aiResponse: string) => {
      const prompt = buildSummaryPrompt(inputText, aiResponse);
      return await generate(undefined, { text: prompt });
    },
  };
};
