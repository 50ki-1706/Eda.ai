"use client";

import type { CatalogModel } from "@/app/api/(LLM)/catalog";
import type { ApiKeyProvider } from "@/constants/models";
import { useModelPicker } from "@/hooks/common/useModelPicker";
import { Check, ChevronDown, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import styles from "./ModelPicker.module.css";

interface ModelPickerProps {
  /** 現在選択中のモデル ID */
  modelId: string;
  /** 選択中のモデルを変更する */
  onModelChange: (modelId: string) => void;
  /** プロバイダーごとの API キー登録状況 */
  availability: Array<{ provider: ApiKeyProvider; registered: boolean }>;
  /** プロバイダーから取得した最新のモデル一覧 */
  models: CatalogModel[];
  /** 外側のレイアウト調整用クラス */
  className?: string;
}

/**
 * 使用するモデルを選ぶドロップダウン
 * モデル一覧はプロバイダーの公開カタログから取得した最新のものを表示する。
 * API キー未登録のプロバイダーのモデルは無効化し、設定画面への導線を出す。
 */
export default function ModelPicker({
  modelId,
  onModelChange,
  availability,
  models,
  className,
}: ModelPickerProps) {
  const {
    open,
    toggle,
    close,
    select,
    selected,
    grouped,
    query,
    setQuery,
    registeredProviders,
    providerLabel,
  } = useModelPicker({ modelId, onModelChange, availability, models });

  const rootRef = useRef<HTMLDivElement | null>(null);

  // 外側クリックで閉じる
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, close]);

  const hasAnyKey = registeredProviders.size > 0;
  const totalModels = models.length;

  return (
    <div ref={rootRef} className={`${styles.root} ${className ?? ""}`.trim()}>
      <button
        type="button"
        className={styles.trigger}
        onClick={toggle}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="使用するモデルを選択"
      >
        <span className={styles.triggerLabel}>
          {selected ? selected.label : "モデルを選択"}
        </span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>

      {open && (
        <div className={styles.menu} aria-label="モデル一覧">
          <div className={styles.searchRow}>
            <label className={styles.srOnly} htmlFor="model-search">
              モデルを検索
            </label>
            <input
              id="model-search"
              type="search"
              className={styles.search}
              placeholder={`モデルを検索（${totalModels} 件）`}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {grouped.map(([provider, options]) => {
            const enabled = registeredProviders.has(provider);
            return (
              <div key={provider} className={styles.group}>
                <div className={styles.groupHeader}>
                  <span id={`model-group-${provider}`}>
                    {providerLabel(provider)}
                    <span className={styles.groupCount}>{options.length}</span>
                  </span>
                  {!enabled && (
                    <Link
                      href="/settings"
                      className={styles.setupLink}
                      onClick={close}
                    >
                      API キーを登録
                    </Link>
                  )}
                </div>
                <ul
                  className={styles.groupList}
                  aria-labelledby={`model-group-${provider}`}
                >
                  {options.map((option) => {
                    const isSelected = option.id === selected?.id;
                    return (
                      <li key={option.id}>
                        <button
                          type="button"
                          aria-pressed={isSelected}
                          className={styles.option}
                          data-selected={isSelected || undefined}
                          disabled={!enabled}
                          onClick={() => select(option)}
                        >
                          <span className={styles.optionLabel}>
                            {option.label}
                            {option.isFree && (
                              <span className={styles.freeBadge}>無料</span>
                            )}
                            {option.supportsVision && (
                              <ImageIcon
                                size={14}
                                className={styles.visionIcon}
                                aria-label="画像入力に対応"
                              />
                            )}
                          </span>
                          {isSelected && <Check size={16} aria-hidden="true" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}

          {grouped.length === 0 && (
            <p className={styles.empty}>
              {totalModels === 0
                ? "モデル一覧を取得できませんでした。時間をおいて再試行してください。"
                : "該当するモデルがありません。"}
            </p>
          )}

          {!hasAnyKey && totalModels > 0 && (
            <p className={styles.empty}>
              API キーが未登録です。
              <Link href="/settings" onClick={close}>
                設定画面
              </Link>
              でキーを登録してください。
            </p>
          )}
        </div>
      )}
    </div>
  );
}
