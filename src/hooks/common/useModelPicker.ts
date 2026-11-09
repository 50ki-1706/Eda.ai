"use client";

import type { CatalogModel } from "@/app/api/(LLM)/catalog";
import {
  type ApiKeyProvider,
  buildModelId,
  defaultModelId,
  parseModelId,
  providerMeta,
} from "@/constants/models";
import { apiClient } from "@/lib/trpc";
import { useCallback, useEffect, useMemo, useState } from "react";

/** モデルピッカーに渡す、プロバイダーごとの利用可否 */
export interface ProviderAvailability {
  provider: ApiKeyProvider;
  registered: boolean;
}

interface UseModelPickerArgs {
  /** 現在選択中のモデル ID */
  modelId: string;
  /** 選択中のモデルを変更する */
  onModelChange: (modelId: string) => void;
  /** プロバイダーごとの API キー登録状況 */
  availability: ProviderAvailability[];
  /** プロバイダーから取得した最新のモデル一覧 */
  models: CatalogModel[];
}

/** モデルを探す（見つからなければ undefined） */
const findModel = (
  models: CatalogModel[],
  id: string,
): CatalogModel | undefined => models.find((model) => model.id === id);

/**
 * モデルピッカーの開閉状態と、選択肢の絞り込みを扱うフック
 * - API キー未登録のプロバイダーのモデルは選択不可として表示する
 * - 外側クリック・Escape で閉じる
 */
export const useModelPicker = ({
  modelId,
  onModelChange,
  availability,
  models,
}: UseModelPickerArgs) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const registeredProviders = useMemo(
    () =>
      new Set(
        availability
          .filter((item) => item.registered)
          .map((item) => item.provider),
      ),
    [availability],
  );

  const selected =
    findModel(models, modelId) ?? findModel(models, defaultModelId);

  /** 検索語で絞り込んだモデル（ラベル・ID の部分一致） */
  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return models;
    return models.filter(
      (model) =>
        model.label.toLowerCase().includes(keyword) ||
        model.modelId.toLowerCase().includes(keyword),
    );
  }, [models, query]);

  /** プロバイダーごとにグループ化した選択肢 */
  const grouped = useMemo(() => {
    const groups = new Map<ApiKeyProvider, CatalogModel[]>();
    for (const model of filtered) {
      const list = groups.get(model.provider) ?? [];
      list.push(model);
      groups.set(model.provider, list);
    }
    return [...groups.entries()];
  }, [filtered]);

  const select = (model: CatalogModel) => {
    if (!registeredProviders.has(model.provider)) return;
    onModelChange(model.id);
    setOpen(false);
    setQuery("");
  };

  const toggle = () => setOpen((prev) => !prev);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  // Escape キーで閉じる
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  return {
    open,
    toggle,
    close,
    select,
    selected,
    grouped,
    query,
    setQuery,
    registeredProviders,
    providerLabel: (provider: ApiKeyProvider) => providerMeta[provider].label,
  };
};

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
    const fetchSettings = async () => {
      try {
        const [settings, catalog] = await Promise.all([
          apiClient.settings.get.query(),
          apiClient.settings.getModels.query(),
        ]);
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
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  /** 選択をサーバーへ保存する（失敗時は呼び出し側でトースト表示） */
  const persistModel = useCallback(async (nextModelId: string) => {
    setModelId(nextModelId);
    await apiClient.settings.saveModel.mutate({ modelId: nextModelId });
  }, []);

  return { modelId, availability, models, loading, persistModel, setModelId };
};

export { buildModelId, parseModelId };
