import type { Content, Part } from "@google/genai";
import { GoogleGenAI } from "@google/genai";
import type { MessageInProject } from "@prisma/client";

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
          systemInstruction: "日本語で簡潔めに回答してください。",
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
    history: MessageInProject[],
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

  generateSummaryPrompt = (inputText: string) => {
    return `以下の質問からあなたが回答することを一行で教えてください${inputText}`;
  };
}
