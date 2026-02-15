import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { Message } from "@prisma/client";
import { generateText } from "ai";

// 利用可能なモデルの定義
export const openRouterModels = [
  "z-ai/glm-4.5-air:free",
  "arcee-ai/trinity-large-preview:free",
] as const;

export type OpenRouterModel = (typeof openRouterModels)[number];

export class OpenRouter {
  private openrouter;

  constructor() {
    this.openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    });
  }

  /**
   * テキスト生成（会話履歴 + プロンプトを受け取り、テキストを返す）
   * Gemini クラスの generateContent と同等のインターフェース
   */
  generateContent = async (
    history: Array<{ role: "user" | "assistant"; content: string }> | undefined,
    messageContent: {
      text: string;
      file?: { data: string; mimeType: string };
    },
    model: OpenRouterModel = openRouterModels[1],
  ): Promise<string> => {
    const messages = this.buildMessages(history, messageContent);

    const { text } = await generateText({
      model: this.openrouter.chat(model),
      system: "You are a helpful assistant that helps people find information.",
      messages,
    });

    return text;
  };

  /**
   * DB の Message[] を Vercel AI SDK 用の messages 配列に変換
   * Gemini クラスの formatHistoryForGemini と同等
   */
  formatHistoryForOpenRouter = (
    history: Message[],
  ): Array<{ role: "user" | "assistant"; content: string }> => {
    return history.flatMap((message) => {
      const userMessage: { role: "user" | "assistant"; content: string } = {
        role: "user",
        content: message.promptText,
      };

      const assistantMessage: {
        role: "user" | "assistant";
        content: string;
      } = {
        role: "assistant",
        content: message.response,
      };

      return [userMessage, assistantMessage];
    });
  };

  /**
   * チャット要約用プロンプト生成
   * Gemini クラスの generateSummaryPrompt と同等
   */
  generateSummaryPrompt = (inputText: string, aiResponse?: string): string => {
    return `あなたは、会話の要点を瞬時に把握し、的確なタイトルを付ける専門家です。

    以下の制約条件に従って、与えられた会話の冒頭部分から、内容全体を最もよく表す簡潔なタイトルを生成してください。

    # 制約条件
    * 言語：会話で使われている言語と同じ言語を使用する（例：日本語の会話なら日本語）。
    * 文字数：非常に短く、5〜10単語（または20文字）程度に収める。
    * 内容：会話の最初の質問、または中心的なトピックを反映させる。
    * 形式：タイトルとして自然な名詞や体言止めを基本とする。挨拶や一般的な表現（「こんにちは」「教えてください」など）は含めない。
    * 出力：生成したタイトルのみを出力し、他の文章は含めない。

    # 会話の冒頭部分
    ${inputText}
    ${aiResponse ? `AIの最初の回答: ${aiResponse}` : ""}

    以上の条件を満たすタイトルを生成してください。`;
  };

  /**
   * 会話履歴とプロンプトから Vercel AI SDK の messages 配列を構築する
   */
  private buildMessages = (
    history: Array<{ role: "user" | "assistant"; content: string }> | undefined,
    messageContent: {
      text: string;
      file?: { data: string; mimeType: string };
    },
  ) => {
    type UserMessage = {
      role: "user";
      content:
        | string
        | Array<
            { type: "text"; text: string } | { type: "image"; image: string }
          >;
    };
    type AssistantMessage = {
      role: "assistant";
      content: string;
    };
    type ChatMessage = UserMessage | AssistantMessage;

    const messages: ChatMessage[] = [];

    // 会話履歴を追加
    if (history) {
      for (const msg of history) {
        if (msg.role === "user") {
          messages.push({ role: "user", content: msg.content });
        } else {
          messages.push({ role: "assistant", content: msg.content });
        }
      }
    }

    // 新しいユーザーメッセージを追加（ファイルがある場合はマルチパート）
    if (messageContent.file) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: messageContent.text },
          { type: "image", image: messageContent.file.data },
        ],
      });
    } else {
      messages.push({
        role: "user",
        content: messageContent.text,
      });
    }

    return messages;
  };
}
