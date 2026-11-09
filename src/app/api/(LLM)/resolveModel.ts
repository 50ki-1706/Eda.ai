import type { CatalogModel } from "@/types";
import { createGateway } from "@ai-sdk/gateway";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { ModelCredentials, ResolvedModel } from "./types";

/**
 * モデル定義と資格情報から、AI SDK の LanguageModel を解決する
 *
 * - google     : AI Gateway へ接続し、ユーザーキーを BYOK としてリクエスト単位で渡す
 * - openrouter : OpenRouter へ直接接続する
 * - opencode   : OpenCode Zen の OpenAI 互換エンドポイントへ直接接続する
 */

/** OpenCode Zen の OpenAI 互換エンドポイント */
const OPENCODE_BASE_URL = "https://opencode.ai/inference/openai/v1";

/** Google AI Studio キーを AI Gateway の BYOK で使う際のプロバイダースラッグ */
const GATEWAY_GOOGLE_SLUG = "google";

export const resolveLanguageModel = (
  option: CatalogModel,
  credentials: ModelCredentials,
): ResolvedModel => {
  switch (option.provider) {
    case "google": {
      if (!credentials.gatewayApiKey) {
        throw new Error(
          "AI_GATEWAY_API_KEY が設定されていません。Google AI Studio のキーは AI Gateway 経由で利用するため、サーバー側の設定が必要です。",
        );
      }

      const gateway = createGateway({ apiKey: credentials.gatewayApiKey });

      return {
        model: gateway(option.modelId),
        providerOptions: {
          gateway: {
            // ユーザーの Google AI Studio キーをリクエスト単位で使用する
            byok: {
              [GATEWAY_GOOGLE_SLUG]: [{ apiKey: credentials.apiKey }],
            },
            // キーが無効な場合に Gateway のシステム資格情報へ
            // こっそりフォールバックしないよう、プロバイダーを固定する
            only: [GATEWAY_GOOGLE_SLUG],
          },
        },
      };
    }

    case "openrouter": {
      const openrouter = createOpenRouter({ apiKey: credentials.apiKey });
      return { model: openrouter.chat(option.modelId) };
    }

    case "opencode": {
      const opencode = createOpenAICompatible({
        name: "opencode",
        baseURL: OPENCODE_BASE_URL,
        apiKey: credentials.apiKey,
      });
      return { model: opencode.chatModel(option.modelId) };
    }

    default: {
      // 網羅性チェック（新しいプロバイダーを追加した際にここで型エラーになる）
      const exhaustive: never = option.provider;
      throw new Error(`未対応のプロバイダーです: ${String(exhaustive)}`);
    }
  }
};
