import type { Message } from "@prisma/client";
import { Gemini } from "./gemini";
import { OpenRouter } from "./openrouter";

/** メッセージコンテンツの型（テキスト + 任意のファイル添付） */
type MessageContent = {
  text: string;
  file?: { data: string; mimeType: string };
};

/** LLMプロバイダーの共通インターフェース */
export interface LLMProvider {
  /** メッセージ履歴を元にコンテンツを生成する */
  generateContent(
    history: Message[] | undefined,
    messageContent: MessageContent,
  ): Promise<string>;

  /** 会話の要約（タイトル）を生成する */
  generateSummary(inputText: string, aiResponse: string): Promise<string>;
}

/** Gemini を LLMProvider インターフェースでラップするアダプター */
class GeminiProvider implements LLMProvider {
  private readonly gemini = new Gemini();

  generateContent = async (
    history: Message[] | undefined,
    messageContent: MessageContent,
  ): Promise<string> => {
    const formattedHistory = history
      ? this.gemini.formatHistoryForGemini(history)
      : undefined;
    return this.gemini.generateContent(formattedHistory, messageContent);
  };

  generateSummary = async (
    inputText: string,
    aiResponse: string,
  ): Promise<string> => {
    const prompt = this.gemini.generateSummaryPrompt(inputText, aiResponse);
    return this.gemini.generateContent(undefined, { text: prompt });
  };
}

/** OpenRouter を LLMProvider インターフェースでラップするアダプター */
class OpenRouterProvider implements LLMProvider {
  private readonly openRouter = new OpenRouter();

  generateContent = async (
    history: Message[] | undefined,
    messageContent: MessageContent,
  ): Promise<string> => {
    const formattedHistory = history
      ? this.openRouter.formatHistoryForOpenRouter(history)
      : undefined;
    return this.openRouter.generateContent(formattedHistory, messageContent);
  };

  generateSummary = async (
    inputText: string,
    aiResponse: string,
  ): Promise<string> => {
    const prompt = this.openRouter.generateSummaryPrompt(inputText, aiResponse);
    return this.openRouter.generateContent(undefined, { text: prompt });
  };
}

// モジュールスコープでシングルトンとして保持（既存の挙動を維持）
const geminiProvider = new GeminiProvider();
const openRouterProvider = new OpenRouterProvider();

/** プロバイダー名から対応する LLMProvider インスタンスを返すファクトリ */
export const getLLMProvider = (provider: string): LLMProvider => {
  switch (provider) {
    case "openrouter":
      return openRouterProvider;
    case "gemini":
      return geminiProvider;
    default:
      return geminiProvider;
  }
};
