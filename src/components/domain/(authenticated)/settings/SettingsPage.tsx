"use client";

import type { SettingsState } from "@/app/api/(Contoller)/settings";
import AppShell from "@/components/common/AppShell";
import Toast from "@/components/common/Toast";
import { apiClient } from "@/lib/trpc";
import { KeyRound, Palette, Settings2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import ApiKeyForm from "./ApiKeyForm";
import styles from "./SettingsPage.module.css";

/**
 * 設定画面
 * 各プロバイダーの API キー登録・削除と、アプリの表示設定を行う
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

  const registeredCount =
    state?.providers.filter((provider) => provider.registered).length ?? 0;

  return (
    <AppShell scrollable>
      <div className={styles.page}>
        <header className={styles.header}>
          <span className={styles.headerIcon} aria-hidden="true">
            <Settings2 size={18} />
          </span>
          <div>
            <h1 className={styles.title}>設定</h1>
            <p className={styles.lead}>
              利用するプロバイダーの API
              キーを登録すると、そのプロバイダーのモデルを選べるようになります。キーは暗号化して保存され、画面には末尾のみ表示されます。
            </p>
          </div>
        </header>

        {loading && (
          <p className={styles.status}>
            <span className="eda-spinner" aria-hidden="true" /> 読み込み中…
          </p>
        )}

        {state && (
          <>
            <section className={styles.section} aria-labelledby="settings-keys">
              <div className={styles.sectionHeader}>
                <h2 id="settings-keys" className={styles.sectionTitle}>
                  <KeyRound size={16} aria-hidden="true" />
                  API キー
                </h2>
                <span className={styles.sectionMeta}>
                  {registeredCount} / {state.providers.length} 登録済み
                </span>
              </div>
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
            </section>

            <section
              className={styles.section}
              aria-labelledby="settings-appearance"
            >
              <div className={styles.sectionHeader}>
                <h2 id="settings-appearance" className={styles.sectionTitle}>
                  <Palette size={16} aria-hidden="true" />
                  外観
                </h2>
              </div>
              <p className={styles.sectionText}>
                テーマはサイドバー下部のボタンから「ライト / ダーク /
                システム」を切り替えられます。選択内容はこのブラウザに保存されます。
              </p>
            </section>
          </>
        )}
      </div>

      <Toast message={toast} onClose={() => setToast(null)} />
    </AppShell>
  );
}
