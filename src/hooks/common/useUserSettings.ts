"use client";

import { type ApiKeyProvider, defaultModelId } from "@/constants/models";
import { client } from "@/lib/orpc/client";
import type { CatalogModel } from "@/types";
import { useCallback, useEffect, useState } from "react";

/** モデルピッカーに渡す、プロバイダーごとの利用可否 */
export interface ProviderAvailability {
  provider: ApiKeyProvider;
  registered: boolean;
}

/**
 * ユーザーの設定（API キー登録状況・選択中モデル）と最新モデル一覧を取得するフック
 *
 * モデル一覧はサーバー側でキャッシュされたものを取得するため、
 * プロバイダーのカタログ更新が自動的に反映される。
 */
export const useUserSettings = () => {
  const [modelId, setModelId] = useState<string>(defaultModelId);
  const [availability, setAvailability] = useState<ProviderAvailability[]>([]);
  const [models, setModels] = useState<CatalogModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchSettings = async () => {
      try {
        const [settings, catalog] = await Promise.all([
          client.settings.get(),
          client.settings.getModels(),
        ]);
        if (cancelled) return;

        setModelId(settings.modelId);
        setModels(catalog);
        setAvailability(
          settings.providers.map((provider) => ({
            provider: provider.provider,
            registered: provider.registered,
          })),
        );
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  /** 選択をサーバーへ保存する（失敗時は呼び出し側でトースト表示） */
  const persistModel = useCallback(async (nextModelId: string) => {
    setModelId(nextModelId);
    await client.settings.saveModel({ modelId: nextModelId });
  }, []);

  return { modelId, availability, models, loading, persistModel };
};
