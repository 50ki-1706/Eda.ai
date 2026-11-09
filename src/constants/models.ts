/**
 * LLM プロバイダーの定義
 *
 * 構成（ハイブリッド）:
 * - `google`     : Vercel AI Gateway 経由。ユーザーの Google AI Studio キーを
 *                  Gateway の BYOK（リクエスト単位）として渡す
 * - `openrouter` : AI Gateway のカタログに存在しないため、OpenRouter へ直接接続する
 * - `opencode`   : 同上。OpenCode Zen の OpenAI 互換エンドポイントへ直接接続する
 *
 * モデル一覧はここにハードコードせず、各プロバイダーの公開カタログから
 * サーバー側（`src/app/api/(LLM)/catalog.ts`）で取得する。
 *
 * このファイルはクライアントからも参照されるため、
 * 環境変数やサーバー専用 API を読み込まないこと。
 */

/** ユーザーが API キーを登録できるプロバイダー */
export const apiKeyProviders = ["openrouter", "opencode", "google"] as const;

export type ApiKeyProvider = (typeof apiKeyProviders)[number];

/** プロバイダーの表示情報 */
export interface ProviderMeta {
  id: ApiKeyProvider;
  label: string;
  /** キーの取得先 */
  consoleUrl: string;
  /** 入力欄のプレースホルダー */
  keyPlaceholder: string;
  /** キー発行元の説明 */
  description: string;
}

export const providerMeta: Record<ApiKeyProvider, ProviderMeta> = {
  openrouter: {
    id: "openrouter",
    label: "OpenRouter",
    consoleUrl: "https://openrouter.ai/keys",
    keyPlaceholder: "sk-or-v1-...",
    description:
      "OpenRouter の API キー。多数のモデルを 1 つのキーで利用できます。",
  },
  opencode: {
    id: "opencode",
    label: "OpenCode Zen",
    consoleUrl: "https://opencode.ai/auth",
    keyPlaceholder: "opencode の API キー",
    description:
      "OpenCode Zen の API キー。OpenAI 互換エンドポイント経由で利用します。",
  },
  google: {
    id: "google",
    label: "Google AI Studio",
    consoleUrl: "https://aistudio.google.com/apikey",
    keyPlaceholder: "AIza...",
    description:
      "Google AI Studio の API キー。Vercel AI Gateway の BYOK 経由で Gemini を利用します。",
  },
};

/**
 * 既定モデル
 *
 * カタログ取得前（初回描画時など）のフォールバックとして使う。
 * カタログに存在しない場合は、取得後に先頭のモデルへ自動で切り替わる。
 */
export const defaultModelId = "google:google/gemini-2.5-flash";

/** モデル ID を `<provider>:<modelId>` 形式に組み立てる */
export const buildModelId = (
  provider: ApiKeyProvider,
  modelId: string,
): string => `${provider}:${modelId}`;

/** モデル ID（`<provider>:<modelId>`）を分解する */
export const parseModelId = (
  id: string,
): { provider: string; modelId: string } => {
  const index = id.indexOf(":");
  if (index < 0) return { provider: "", modelId: id };
  return {
    provider: id.slice(0, index),
    modelId: id.slice(index + 1),
  };
};
