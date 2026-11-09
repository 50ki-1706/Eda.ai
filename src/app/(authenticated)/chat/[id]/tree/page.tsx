"use client";
import AppShell from "@/components/common/AppShell";
import Toast from "@/components/common/Toast";
import StoryTree from "@/components/domain/(authenticated)/tree/StoryTree";
import useTree from "@/hooks/domain/chat/tree/useTree";
import { GitMerge, MessageSquare, Network } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import styles from "./page.module.css";

/**
 * ブランチツリー画面
 * 会話の分岐構造を俯瞰し、ノードの選択でブランチへ移動／マージできる
 */
export default function Page() {
  const {
    handleBranchMerge,
    handleBranchNavigation,
    handleClick,
    isChecked,
    setIsChecked,
    branchStructure,
    loading,
    chatId,
  } = useTree();
  const [toast, setToast] = useState<string | null>(null);

  // ルートブランチの ID（会話画面へ戻る先）
  const rootBranchId = branchStructure?.attributes?.id ?? "";

  const handleNodeClick = async (branchId: string) => {
    try {
      await handleClick(branchId, handleBranchMerge, handleBranchNavigation);
    } catch (error) {
      console.error("Failed to handle branch click:", error);
      setToast(
        isChecked ? "ブランチのマージに失敗しました" : "画面遷移に失敗しました",
      );
    }
  };

  return (
    <AppShell>
      <div className={styles.layout} data-merge-mode={isChecked || undefined}>
        <header className={styles.header}>
          <div className={styles.headerText}>
            <span className={styles.headerIcon} aria-hidden="true">
              <Network size={16} />
            </span>
            <h1 className={styles.headerTitle}>ブランチツリー</h1>
            <span className={styles.headerHint}>
              ノードをクリックして会話を移動
            </span>
          </div>

          <div className={styles.headerActions}>
            <Link
              href={`/chat/${chatId}/branch/${rootBranchId}`}
              className={styles.headerLink}
              aria-label="会話画面に戻る"
              title="会話画面に戻る"
            >
              <MessageSquare size={16} aria-hidden="true" />
              <span className={styles.headerLinkLabel}>会話に戻る</span>
            </Link>

            <label className={styles.mergeToggle}>
              <GitMerge size={16} aria-hidden="true" />
              <span className={styles.mergeLabel}>マージモード</span>
              <input
                type="checkbox"
                className={styles.switchInput}
                checked={isChecked}
                onChange={() => setIsChecked(!isChecked)}
                aria-label="マージモードを有効にする"
              />
              <span className={styles.switchTrack} aria-hidden="true">
                <span className={styles.switchThumb} />
              </span>
            </label>
          </div>
        </header>

        {/* output 要素は暗黙的に role="status" を持つため role 属性は不要 */}
        {isChecked && (
          <output className={styles.mergeBanner}>
            マージモード: 統合したいブランチのノードをクリックしてください。
          </output>
        )}

        <div className={styles.canvas}>
          {loading && (
            <p className={styles.status}>
              <span className="eda-spinner" aria-hidden="true" />
              ツリーを読み込み中…
            </p>
          )}
          {!loading && !branchStructure && (
            <p className={styles.status}>
              ブランチ構造を取得できませんでした。
            </p>
          )}
          {branchStructure && (
            <StoryTree
              data={branchStructure}
              onNodeClick={(branchId) => {
                void handleNodeClick(branchId);
              }}
            />
          )}
        </div>
      </div>

      <Toast message={toast} onClose={() => setToast(null)} />
    </AppShell>
  );
}
