import "server-only";
import { type ApiKeyProvider, apiKeyProviders } from "@/constants/models";
import type { CatalogModel } from "@/types";

/**
 * 各プロバイダーの公開モデルカタログを取得する
 *
 * モデル一覧はハードコードせず、プロバイダーの公開 API から取得することで
 * 常に最新の状態を保つ。取得結果はプロセス内で一定時間キャッシュする。
 *
 * モデルの型（`CatalogModel`）はクライアント（モデルピッカー）でも使うため
 * `src/types/index.ts` に置いている。
 */

/** キャッシュの有効期間（ミリ秒） */
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 分

/** カタログ取得のタイムアウト（ミリ秒） */
const FETCH_TIMEOUT_MS = 8000;

type CacheEntry = { models: CatalogModel[]; expiresAt: number };

// next dev の再評価でもキャッシュを共有する
const globalForCatalog = globalThis as unknown as {
  modelCatalogCache?: Map<ApiKeyProvider, CacheEntry>;
};

const cache: Map<ApiKeyProvider, CacheEntry> =
  globalForCatalog.modelCatalogCache ?? new Map();

if (!globalForCatalog.modelCatalogCache) {
  globalForCatalog.modelCatalogCache = cache;
}

/** タイムアウト付きで JSON を取得する */
const fetchJson = async (url: string, init?: RequestInit): Promise<unknown> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      // 明示的にキャッシュを無効化し、自前の TTL キャッシュで制御する
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`モデル一覧の取得に失敗しました (HTTP ${res.status})`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
};

/** 文字列が配列に含まれるか安全に判定する */
const asArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

/** OpenRouter の `/api/v1/models` を正規化する */
const fetchOpenRouterModels = async (): Promise<CatalogModel[]> => {
  const json = (await fetchJson("https://openrouter.ai/api/v1/models")) as {
    data?: unknown[];
  };

  return asArray(json?.data).flatMap((raw) => {
    const model = raw as {
      id?: unknown;
      name?: unknown;
      context_length?: unknown;
      pricing?: { prompt?: unknown; completion?: unknown };
      architecture?: { input_modalities?: unknown };
    };
    if (typeof model.id !== "string") return [];

    const modalities = asArray(model.architecture?.input_modalities);
    const pricing = model.pricing ?? {};

    return [
      {
        id: `openrouter:${model.id}`,
        provider: "openrouter" as const,
        modelId: model.id,
        label:
          typeof model.name === "string" && model.name.length > 0
            ? model.name
            : model.id,
        supportsVision: modalities.includes("image"),
        isFree:
          String(pricing.prompt ?? "") === "0" &&
          String(pricing.completion ?? "") === "0",
        contextLength:
          typeof model.context_length === "number"
            ? model.context_length
            : undefined,
      },
    ];
  });
};

/** OpenCode Zen の `/zen/v1/models` を正規化する */
const fetchOpenCodeModels = async (): Promise<CatalogModel[]> => {
  const json = (await fetchJson("https://opencode.ai/zen/v1/models")) as {
    data?: unknown[];
  };

  return asArray(json?.data).flatMap((raw) => {
    const model = raw as {
      id?: unknown;
      name?: unknown;
      limit?: { context?: unknown };
      cost?: { text?: { input?: { price?: unknown } } };
      modalities?: { input?: unknown };
    };
    if (typeof model.id !== "string") return [];

    const inputs = asArray(model.modalities?.input);
    const inputPrice = model.cost?.text?.input?.price;

    return [
      {
        id: `opencode:${model.id}`,
        provider: "opencode" as const,
        modelId: model.id,
        label:
          typeof model.name === "string" && model.name.length > 0
            ? model.name
            : model.id,
        // OpenCode は画像を "image/png" のような MIME で列挙する
        supportsVision: inputs.some(
          (item) => typeof item === "string" && item.startsWith("image"),
        ),
        isFree: inputPrice === 0,
        contextLength:
          typeof model.limit?.context === "number"
            ? model.limit.context
            : undefined,
      },
    ];
  });
};

/**
 * AI Gateway の `/v1/models` を正規化する
 *
 * Google AI Studio のキーは Gateway の BYOK で使うため、
 * 言語モデルのうち Google が提供するものだけを対象にする。
 */
const fetchGatewayGoogleModels = async (): Promise<CatalogModel[]> => {
  const json = (await fetchJson("https://ai-gateway.vercel.sh/v1/models")) as {
    data?: unknown[];
  };

  return asArray(json?.data).flatMap((raw) => {
    const model = raw as {
      id?: unknown;
      name?: unknown;
      type?: unknown;
      owned_by?: unknown;
      context_window?: unknown;
      modalities?: { input?: unknown; output?: unknown };
      pricing?: { input?: unknown; output?: unknown };
    };
    if (typeof model.id !== "string") return [];
    // 言語モデルかつ Google 提供のものだけを残す
    if (model.type !== "language" || model.owned_by !== "google") return [];

    // バッチ専用（-batch）と画像生成系（出力に image を含む）はチャットに使えない
    if (model.id.endsWith("-batch")) return [];
    const outputs = asArray(model.modalities?.output);
    if (!outputs.includes("text") || outputs.includes("image")) return [];

    const inputs = asArray(model.modalities?.input);
    const pricing = model.pricing ?? {};

    return [
      {
        id: `google:${model.id}`,
        provider: "google" as const,
        modelId: model.id,
        label:
          typeof model.name === "string" && model.name.length > 0
            ? model.name
            : model.id,
        supportsVision: inputs.includes("image"),
        isFree:
          String(pricing.input ?? "") === "0" &&
          String(pricing.output ?? "") === "0",
        contextLength:
          typeof model.context_window === "number"
            ? model.context_window
            : undefined,
      },
    ];
  });
};

const fetchers: Record<ApiKeyProvider, () => Promise<CatalogModel[]>> = {
  openrouter: fetchOpenRouterModels,
  opencode: fetchOpenCodeModels,
  google: fetchGatewayGoogleModels,
};

/**
 * 指定プロバイダーのモデル一覧を取得する（TTL キャッシュ付き）
 *
 * 取得に失敗した場合は、期限切れでもキャッシュがあればそれを返す。
 * それも無ければ空配列を返し、呼び出し側で他のプロバイダーを表示できるようにする。
 */
export const getCatalogModels = async (
  provider: ApiKeyProvider,
): Promise<CatalogModel[]> => {
  const cached = cache.get(provider);
  if (cached && cached.expiresAt > Date.now()) return cached.models;

  try {
    const models = await fetchers[provider]();
    cache.set(provider, { models, expiresAt: Date.now() + CACHE_TTL_MS });
    return models;
  } catch (error) {
    console.error(`[catalog] ${provider} のモデル取得に失敗:`, error);
    // 期限切れキャッシュがあれば、古くても表示を維持する
    return cached?.models ?? [];
  }
};

/** 全プロバイダーのモデル一覧を並列で取得する */
export const getAllCatalogModels = async (): Promise<CatalogModel[]> => {
  const results = await Promise.all(
    apiKeyProviders.map((provider) => getCatalogModels(provider)),
  );
  return results.flat();
};

/**
 * モデル ID が現行カタログに存在するか検証する
 *
 * 廃止されたモデルを保存・送信してしまうのを防ぐ。
 * カタログ取得に失敗した場合は、送信をブロックしないよう true を返す。
 */
export const isKnownModel = async (
  provider: ApiKeyProvider,
  modelId: string,
): Promise<boolean> => {
  const models = await getCatalogModels(provider);
  if (models.length === 0) return true;
  return models.some((model) => model.modelId === modelId);
};
