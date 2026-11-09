"use client";

import { client } from "@/lib/orpc/client";
import type { ProviderStatus } from "@/types";
import { Check, ExternalLink, Trash2 } from "lucide-react";
import { useState } from "react";
import styles from "./ApiKeyForm.module.css";

interface ApiKeyFormProps {
  provider: ProviderStatus;
  /** 保存成功時に呼ばれる（トースト表示と一覧の再取得） */
  onSaved: (message: string) => Promise<void> | void;
  /** エラー時に呼ばれる */
  onError: (message: string) => void;
}

/**
 * 1 プロバイダー分の API キー入力フォーム
 * 登録済みの場合はキーのヒントと削除ボタンを表示する
 */
export default function ApiKeyForm({
  provider,
  onSaved,
  onError,
}: ApiKeyFormProps) {
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      onError("API キーを入力してください");
      return;
    }
    setBusy(true);
    try {
      await client.settings.saveApiKey({
        provider: provider.provider,
        apiKey,
      });
      setApiKey("");
      await onSaved(`${provider.label} の API キーを保存しました`);
    } catch (error) {
      console.error("Failed to save API key:", error);
      onError(
        error instanceof Error ? error.message : "API キーの保存に失敗しました",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await client.settings.deleteApiKey({
        provider: provider.provider,
      });
      await onSaved(`${provider.label} の API キーを削除しました`);
    } catch (error) {
      console.error("Failed to delete API key:", error);
      onError("API キーの削除に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className={styles.card}
      aria-labelledby={`provider-${provider.provider}`}
    >
      <div className={styles.cardHeader}>
        <h2
          id={`provider-${provider.provider}`}
          className={styles.providerName}
        >
          {provider.label}
        </h2>
        {provider.registered ? (
          <span className={styles.badgeRegistered}>
            <Check size={14} aria-hidden="true" /> 登録済み
          </span>
        ) : (
          <span className={styles.badgeUnregistered}>未登録</span>
        )}
      </div>

      <p className={styles.description}>{provider.description}</p>

      {provider.registered && provider.keyHint && (
        <p className={styles.hint}>
          保存済みキー: <code>{provider.keyHint}</code>
        </p>
      )}

      <div className={styles.inputRow}>
        <label className={styles.srOnly} htmlFor={`key-${provider.provider}`}>
          {provider.label} の API キー
        </label>
        <input
          id={`key-${provider.provider}`}
          type="password"
          className={styles.input}
          placeholder={provider.keyPlaceholder}
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          disabled={busy}
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="button"
          className={styles.saveButton}
          onClick={handleSave}
          disabled={busy || !apiKey.trim()}
        >
          {provider.registered ? "更新" : "保存"}
        </button>
        {provider.registered && (
          <button
            type="button"
            className={styles.deleteButton}
            onClick={handleDelete}
            disabled={busy}
            aria-label={`${provider.label} の API キーを削除`}
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      <a
        href={provider.consoleUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.consoleLink}
      >
        API キーを取得する
        <ExternalLink size={14} aria-hidden="true" />
      </a>
    </section>
  );
}
