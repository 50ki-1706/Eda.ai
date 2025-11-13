import type { Content, Part } from "@google/genai";
import { GoogleGenAI } from "@google/genai";
import type { Message } from "@prisma/client";

export const models = ["gemini-2.5-flash-lite", "gemini-2.5-flash"] as const;

export class Gemini {
  generateContent = async (
    history: Content[] | undefined,
    messageContent: { text: string; file?: { data: string; mimeType: string } },
  ) => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = this.formatPrompt(messageContent);

    const response = await ai.chats
      .create({
        model: models[1],
        history: history,
        config: {
          systemInstruction:
            "You are a helpful assistant that helps people find information.",
        },
      })
      .sendMessage({
        message: prompt,
      });

    return response.text ?? "";
  };

  formatPrompt = (messageContent: {
    text: string;
    file?: { data: string; mimeType: string };
  }): Part[] => {
    const parts: Part[] = [{ text: messageContent.text }];

    if (messageContent.file) {
      parts.push({
        inlineData: {
          data: messageContent.file.data,
          mimeType: messageContent.file.mimeType,
        },
      });
    }

    return parts;
  };

  formatHistoryForGemini = (
    history: Message[],
  ): Array<{
    parts: Array<{ text?: string; inlineData?: { data: string | undefined } }>;
    role: string;
  }> => {
    return history.flatMap((message) => {
      const userMessage = {
        parts: [
          {
            text: message.promptText,
          },
        ],
        role: "user",
      };

      // AIのレスポンス
      const modelMessage = {
        parts: [{ text: message.response }],
        role: "model",
      };

      if (message.promptFile) {
        const userFile = {
          parts: [
            {
              inlineData: {
                data: message.promptFile,
                mimeType: "image/jpeg",
              },
            },
          ],
          role: "user",
        };
        return [userMessage, userFile, modelMessage];
      }

      return [userMessage, modelMessage];
    });
  };

  generateSummaryPrompt = (inputText: string, aiResponse?: string) => {
    const basePrompt = `あなたは、会話の要点を瞬時に把握し、的確なタイトルを付ける専門家です。

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

    return basePrompt;
  };
}
