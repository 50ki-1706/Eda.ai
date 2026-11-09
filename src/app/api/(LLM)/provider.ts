import type { CatalogModel, Message } from "@/types";
import { generateText, streamText } from "ai";
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
  /**
   * メッセージ履歴を元にコンテンツをストリーミング生成する（テキスト差分を逐次返す）
   *
   * 差分を yield し終えると、ジェネレーターの return 値として生成された全文を返す。
   * 呼び出し側が最終テキストを必要としない場合は、`for await` で差分だけを消費してよい。
   * @param signal - クライアント切断などで中断するための AbortSignal
   */
  streamContent(
    history: Message[] | undefined,
    messageContent: MessageContent,
    signal?: AbortSignal,
  ): AsyncGenerator<string, string, unknown>;

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

  // ストリーミング生成。差分を yield し、最後に全文を return する
  const stream = async function* (
    history: Message[] | undefined,
    messageContent: MessageContent,
    signal?: AbortSignal,
  ): AsyncGenerator<string, string, unknown> {
    const result = streamText({
      model: resolved.model,
      system: systemPrompt,
      messages: buildMessages(history, messageContent),
      providerOptions: resolved.providerOptions,
      abortSignal: signal,
    });

    // 差分を逐次流しつつ、呼び出し側でも全文を組み立てられるよう連結しておく
    let fullText = "";
    try {
      for await (const delta of result.textStream) {
        fullText += delta;
        yield delta;
      }
    } finally {
      // 中断（クライアント切断）時は以降の受信を止める
      if (signal?.aborted) {
        result.textStream.cancel().catch(() => {
          // 中断時のキャンセル失敗は無視してよい
        });
      }
    }

    // textStream を消費し終えた後は result.text が解決するため、SDK 側の全文を優先する
    try {
      const finalText = await result.text;
      return finalText || fullText;
    } catch {
      // abort などで全文取得に失敗した場合は、受信済みの差分を返す
      return fullText;
    }
  };

  return {
    streamContent: stream,

    /** 要約は逐次表示しないため、非ストリーミングで全文を取得する */
    generateSummary: async (inputText: string, aiResponse: string) => {
      const { text } = await generateText({
        model: resolved.model,
        system: systemPrompt,
        messages: buildMessages(undefined, {
          text: buildSummaryPrompt(inputText, aiResponse),
        }),
        providerOptions: resolved.providerOptions,
      });

      return text;
    },
  };
};
