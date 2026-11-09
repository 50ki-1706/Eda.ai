"use client";

import type { SettingsState } from "@/app/api/(Contoller)/settings";
import { apiClient } from "@/lib/trpc";
import { useCallback, useEffect, useState } from "react";
import ApiKeyForm from "./ApiKeyForm";
import styles from "./SettingsPage.module.css";

/**
 * 設定画面
 * 各プロバイダーの API キー登録・削除と、既定モデルの選択を行う
 */
export default function SettingsPage() {
  const [state, setState] = useState<SettingsState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await apiClient.settings.get.query();
      setState(res);
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      setToast("設定の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <h1 className={styles.title}>設定</h1>
          <p className={styles.lead}>
            利用するプロバイダーの API
            キーを登録すると、そのプロバイダーのモデルを選べるようになります。キーは暗号化して保存され、画面には末尾のみ表示されます。
          </p>
        </header>

        {loading && (
          <p className={styles.status}>
            <span className="eda-spinner" aria-hidden="true" /> 読み込み中…
          </p>
        )}

        {state && (
          <div className={styles.providers}>
            {state.providers.map((provider) => (
              <ApiKeyForm
                key={provider.provider}
                provider={provider}
                onSaved={async (message) => {
                  setToast(message);
                  await load();
                }}
                onError={(message) => setToast(message)}
              />
            ))}
          </div>
        )}
      </div>

      {toast && (
        <output className={styles.toast} aria-live="polite">
          {toast}
        </output>
      )}
    </main>
  );
}
