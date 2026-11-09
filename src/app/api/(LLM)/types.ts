import type { Message } from "@/types";
import type { LanguageModel, generateText } from "ai";

/**
 * AI SDK の providerOptions の型
 * `ai` パッケージが型を再エクスポートしていないため、
 * generateText の引数型から導出して SDK のバージョンに追従させる
 */
export type ProviderOptions = NonNullable<
  Parameters<typeof generateText>[0]["providerOptions"]
>;

/**
 * LLM 呼び出しの共通型と、会話履歴の変換処理
 *
 * プロバイダーごとの差（AI Gateway の BYOK / 直接接続）は
 * `resolveLanguageModel` で吸収し、ここでは AI SDK の共通形式に揃える。
 */

/** メッセージコンテンツの型（テキスト + 任意のファイル添付） */
export type MessageContent = {
  text: string;
  file?: { data: string; mimeType: string };
};

/** モデル呼び出しに必要な資格情報 */
export type ModelCredentials = {
  /** プロバイダーの API キー（復号済み） */
  apiKey: string;
  /** AI Gateway 経由の場合の Gateway キー */
  gatewayApiKey?: string;
};

/** 会話履歴を AI SDK のメッセージ配列へ変換する */
export const buildMessages = (
  history: Message[] | undefined,
  messageContent: MessageContent,
) => {
  type AssistantMessage = { role: "assistant"; content: string };
  type UserMessage = {
    role: "user";
    content:
      | string
      | Array<
          | { type: "text"; text: string }
          // AI SDK v7 では画像も file パート + mediaType で渡す（image パートは非推奨）
          | { type: "file"; data: string; mediaType: string }
        >;
  };

  const messages: Array<UserMessage | AssistantMessage> = [];

  // 過去のやり取りを user / assistant の交互メッセージとして積む
  if (history) {
    for (const message of history) {
      messages.push({ role: "user", content: message.promptText });
      messages.push({ role: "assistant", content: message.response });
    }
  }

  // 新しいユーザーメッセージ（ファイルがある場合はマルチパート）
  if (messageContent.file) {
    messages.push({
      role: "user",
      content: [
        { type: "text", text: messageContent.text },
        {
          type: "file",
          data: messageContent.file.data,
          mediaType: messageContent.file.mimeType,
        },
      ],
    });
  } else {
    messages.push({ role: "user", content: messageContent.text });
  }

  return messages;
};

/** チャットのタイトル（要約）生成用プロンプト */
export const buildSummaryPrompt = (
  inputText: string,
  aiResponse?: string,
): string => {
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

/** アシスタントの共通システムプロンプト */
export const systemPrompt =
  "You are a helpful assistant that helps people find information.";

/** モデル解決結果（モデル本体と、Gateway 用の providerOptions） */
export type ResolvedModel = {
  model: LanguageModel;
  /** AI SDK の providerOptions（Gateway の BYOK 指定などに使用） */
  providerOptions?: ProviderOptions;
};
