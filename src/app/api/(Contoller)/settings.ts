import {
  type ApiKeyProvider,
  apiKeyProviders,
  defaultModelId,
  parseModelId,
  providerMeta,
} from "@/constants/models";
import { createKeyHint, decryptApiKey, encryptApiKey } from "@/lib/crypto";
import type { CatalogModel, ProviderStatus, SettingsState } from "@/types";
import { ORPCError } from "@orpc/server";
import {
  getAllCatalogModels,
  getCatalogModels,
  isKnownModel,
} from "../(LLM)/catalog";
import { type LLMProvider, createLLMProvider } from "../(LLM)/provider";
import { UserSettingsRepository } from "../(Repository)/userSettings";
import type {
  DeleteApiKeyInput,
  SaveApiKeyInput,
  SaveModelInput,
} from "../(schema)/settings";

const userSettingsRepository = new UserSettingsRepository();

export class SettingsController {
  /**
   * プロバイダー名が有効か検証する
   * @throws ORPCError 未対応のプロバイダーの場合
   */
  private assertProvider = (provider: string): ApiKeyProvider => {
    if (!(apiKeyProviders as readonly string[]).includes(provider)) {
      throw new ORPCError("BAD_REQUEST", {
        message: `未対応のプロバイダーです: ${provider}`,
      });
    }
    return provider as ApiKeyProvider;
  };

  /**
   * 保存済みモデル ID をカタログと突き合わせて解決する
   *
   * カタログから消えている（廃止された）モデルの場合は、
   * キーが登録済みのプロバイダーの先頭モデル → 既定モデルの順にフォールバックする。
   */
  private resolveSelectedModel = (
    savedModelId: string | undefined,
    models: CatalogModel[],
    registeredProviders: Set<string>,
  ): string => {
    if (savedModelId && models.some((model) => model.id === savedModelId)) {
      return savedModelId;
    }

    // 廃止されたモデル: キー登録済みプロバイダーの先頭モデルへ切り替える
    const fallback = models.find((model) =>
      registeredProviders.has(model.provider),
    );
    if (fallback) return fallback.id;

    // キー未登録、またはカタログ取得に失敗した場合は既定モデル
    return savedModelId ?? defaultModelId;
  };

  /**
   * 設定画面用の状態（登録状況・最新モデル一覧・選択中モデル）を取得する
   * @param userId - 対象ユーザーの ID
   */
  getSettings = async (userId: string): Promise<SettingsState> => {
    const [keys, savedModelId, models] = await Promise.all([
      userSettingsRepository.listApiKeys(userId),
      userSettingsRepository.getModelId(userId),
      getAllCatalogModels(),
    ]);

    const hintByProvider = new Map<string, string>(
      keys.map((key) => [key.provider, key.keyHint]),
    );

    const modelCountByProvider = new Map<string, number>();
    for (const model of models) {
      modelCountByProvider.set(
        model.provider,
        (modelCountByProvider.get(model.provider) ?? 0) + 1,
      );
    }

    const providers: ProviderStatus[] = apiKeyProviders.map((provider) => {
      const meta = providerMeta[provider];
      const keyHint = hintByProvider.get(provider) ?? null;
      return {
        provider,
        label: meta.label,
        description: meta.description,
        consoleUrl: meta.consoleUrl,
        keyPlaceholder: meta.keyPlaceholder,
        registered: keyHint !== null,
        keyHint,
        modelCount: modelCountByProvider.get(provider) ?? 0,
      };
    });

    const modelId = this.resolveSelectedModel(
      savedModelId,
      models,
      new Set(hintByProvider.keys()),
    );
    const selectedProvider = parseModelId(modelId).provider;

    return {
      providers,
      models,
      modelId,
      modelAvailable: hintByProvider.has(selectedProvider),
    };
  };

  /**
   * モデルピッカー用に、最新のモデル一覧だけを取得する
   *
   * 設定画面と分けることで、チャット画面では登録状況を取得せずに済む。
   */
  getModels = async (): Promise<CatalogModel[]> => {
    return await getAllCatalogModels();
  };

  /**
   * API キーを登録する（暗号化して保存）
   * @param input - プロバイダーと API キー
   * @param userId - 対象ユーザーの ID
   */
  saveApiKey = async (input: SaveApiKeyInput, userId: string) => {
    const provider = this.assertProvider(input.provider);
    const apiKey = input.apiKey.trim();

    if (apiKey.length < 8) {
      throw new ORPCError("BAD_REQUEST", {
        message: "API キーが短すぎます。正しいキーを入力してください。",
      });
    }

    return await userSettingsRepository.upsertApiKey(
      userId,
      provider,
      encryptApiKey(apiKey),
      createKeyHint(apiKey),
    );
  };

  /**
   * API キーを削除する
   * @param input - プロバイダー
   * @param userId - 対象ユーザーの ID
   */
  deleteApiKey = async (input: DeleteApiKeyInput, userId: string) => {
    const provider = this.assertProvider(input.provider);
    await userSettingsRepository.deleteApiKey(userId, provider);
  };

  /**
   * 選択中モデルを保存する
   *
   * 保存前に現行カタログへ存在するか検証し、廃止済みモデルを保存しない。
   * @param input - モデル ID
   * @param userId - 対象ユーザーの ID
   */
  saveModel = async (input: SaveModelInput, userId: string) => {
    const { provider, modelId } = parseModelId(input.modelId);
    const validProvider = this.assertProvider(provider);

    if (!modelId) {
      throw new ORPCError("BAD_REQUEST", {
        message: `モデル ID の形式が不正です: ${input.modelId}`,
      });
    }

    if (!(await isKnownModel(validProvider, modelId))) {
      throw new ORPCError("BAD_REQUEST", {
        message: `このモデルは現在利用できません: ${input.modelId}`,
      });
    }

    return await userSettingsRepository.saveModelId(userId, input.modelId);
  };

  /**
   * 指定ユーザー・モデルで利用する LLMProvider を組み立てる
   *
   * モデルが属するプロバイダーの API キーを復号して渡す。
   * キーが未登録の場合は、設定画面へ誘導できるエラーを返す。
   *
   * @param userId - 対象ユーザーの ID
   * @param modelId - 使用するモデル ID（未指定なら保存済み設定 → 既定モデル）
   * @throws ORPCError モデル未登録、または API キー未登録の場合
   */
  resolveLLMProvider = async (
    userId: string,
    modelId?: string,
  ): Promise<{ llm: LLMProvider; option: CatalogModel }> => {
    const savedModelId =
      modelId ?? (await userSettingsRepository.getModelId(userId));
    const targetId = savedModelId ?? defaultModelId;

    const { provider, modelId: rawModelId } = parseModelId(targetId);
    const validProvider = this.assertProvider(provider);

    if (!rawModelId) {
      throw new ORPCError("BAD_REQUEST", {
        message: `モデル ID の形式が不正です: ${targetId}`,
      });
    }

    // カタログから最新のモデル情報を取得して検証する
    const catalog = await getCatalogModels(validProvider);
    const option = catalog.find((model) => model.modelId === rawModelId);

    if (!option) {
      throw new ORPCError("BAD_REQUEST", {
        message:
          catalog.length === 0
            ? `${providerMeta[validProvider].label} のモデル一覧を取得できませんでした。時間をおいて再試行してください。`
            : `このモデルは現在利用できません: ${targetId}。モデルピッカーから別のモデルを選択してください。`,
      });
    }

    const encryptedKey = await userSettingsRepository.getEncryptedApiKey(
      userId,
      validProvider,
    );

    if (!encryptedKey) {
      throw new ORPCError("PRECONDITION_FAILED", {
        message: `${providerMeta[validProvider].label} の API キーが未登録です。設定画面から API キーを登録してください。`,
      });
    }

    const llm = createLLMProvider(option, {
      apiKey: decryptApiKey(encryptedKey),
      gatewayApiKey: process.env.AI_GATEWAY_API_KEY,
    });

    return { llm, option };
  };
}
