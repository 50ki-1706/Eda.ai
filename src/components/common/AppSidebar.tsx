"use client";

import { useLogout } from "@/hooks/common/useLogout";
import { useSidebar } from "@/hooks/common/useSidebar";
import { useTheme } from "@/hooks/common/useTheme";
import {
  ChevronLeft,
  GitBranch,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Plus,
  Settings,
  Sun,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import styles from "./AppSidebar.module.css";

/** テーマ切り替えボタンの表示内容 */
const themeIcon = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} as const;

const themeLabel = {
  light: "ライト",
  dark: "ダーク",
  system: "システム",
} as const;

/**
 * アプリ共通のサイドバー
 *
 * - デスクトップ: 折りたたみ可能な固定サイドバー（レール ⇔ フル表示）
 * - モバイル: オーバーレイのドロワー
 * - チャット一覧・新規チャット・設定・テーマ切り替え・ログアウトをまとめる
 */
export default function AppSidebar() {
  const {
    chats,
    loading,
    activeChatId,
    isDesktop,
    sidebarCollapsed,
    drawerOpen,
    toggleSidebar,
    toggleDrawer,
    handleChatClick,
    handleAddChat,
  } = useSidebar();
  const { themeMode, cycleTheme } = useTheme();
  const { handleSignOut } = useLogout();
  const pathname = usePathname();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const expanded = isDesktop ? !sidebarCollapsed : drawerOpen;
  const ThemeIcon = themeIcon[themeMode];

  // モバイルドロワーを開いたら閉じるボタンへフォーカスを移す
  useEffect(() => {
    if (!isDesktop && drawerOpen) closeButtonRef.current?.focus();
  }, [isDesktop, drawerOpen]);

  // モバイルドロワー表示中は Escape で閉じる
  useEffect(() => {
    if (isDesktop || !drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") toggleDrawer();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isDesktop, drawerOpen, toggleDrawer]);

  const handleToggle = () => {
    if (isDesktop) toggleSidebar();
    else toggleDrawer();
  };

  return (
    <>
      {/* モバイル: 画面上部のメニューボタン */}
      {!isDesktop && !drawerOpen && (
        <button
          type="button"
          className={styles.mobileTrigger}
          onClick={toggleDrawer}
          aria-label="メニューを開く"
          aria-expanded={false}
        >
          <Menu size={20} aria-hidden="true" />
        </button>
      )}

      {/* モバイル: ドロワー背後のオーバーレイ */}
      {!isDesktop && drawerOpen && (
        <button
          type="button"
          className={styles.scrim}
          aria-label="メニューを閉じる"
          onClick={toggleDrawer}
        />
      )}

      <aside
        className={styles.sidebar}
        data-expanded={expanded || undefined}
        data-mobile={!isDesktop || undefined}
        data-open={(!isDesktop && drawerOpen) || undefined}
        aria-label="アプリケーションナビゲーション"
      >
        <div className={styles.brandRow}>
          <Link
            href="/home"
            className={styles.brand}
            aria-label="Eda.ai ホーム"
          >
            <span className={styles.brandMark} aria-hidden="true">
              <GitBranch size={18} />
            </span>
            {expanded && <span className={styles.brandName}>Eda.ai</span>}
          </Link>
          <button
            ref={closeButtonRef}
            type="button"
            className={styles.collapseButton}
            onClick={handleToggle}
            aria-label={
              isDesktop
                ? sidebarCollapsed
                  ? "サイドバーを展開"
                  : "サイドバーを折りたたむ"
                : "メニューを閉じる"
            }
            title={isDesktop ? "サイドバーの開閉" : "閉じる"}
          >
            {isDesktop ? (
              <ChevronLeft
                size={18}
                aria-hidden="true"
                className={styles.collapseIcon}
                data-collapsed={sidebarCollapsed || undefined}
              />
            ) : (
              <X size={18} aria-hidden="true" />
            )}
          </button>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.newChatButton}
            onClick={handleAddChat}
            aria-label="新規チャット"
            title="新規チャット"
          >
            <Plus size={18} aria-hidden="true" />
            {expanded && <span>新規チャット</span>}
          </button>
        </div>

        {expanded && (
          <>
            <p className={styles.sectionLabel} id="sidebar-chats-label">
              チャット
            </p>
            <nav
              className={styles.listArea}
              aria-labelledby="sidebar-chats-label"
            >
              {loading && (
                <p className={styles.listStatus}>
                  <span className="eda-spinner" aria-hidden="true" />
                  読み込み中…
                </p>
              )}
              {!loading && chats.length === 0 && (
                <p className={styles.listStatus}>まだチャットがありません。</p>
              )}
              {/* API はピン留め優先・新しい順で返すため、そのまま並べる */}
              <ul className={styles.list}>
                {chats.map((chat) => (
                  <li key={chat.id}>
                    <button
                      type="button"
                      className={styles.listItem}
                      data-active={chat.id === activeChatId ? true : undefined}
                      onClick={() => handleChatClick(chat.id)}
                      title={chat.summary}
                    >
                      <GitBranch
                        size={16}
                        aria-hidden="true"
                        className={styles.listIcon}
                      />
                      <span className={styles.listLabel}>{chat.summary}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </>
        )}

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.footerButton}
            onClick={cycleTheme}
            aria-label={`テーマ: ${themeLabel[themeMode]}（クリックで切り替え）`}
            title={`テーマ: ${themeLabel[themeMode]}`}
          >
            <ThemeIcon size={18} aria-hidden="true" />
            {expanded && (
              <span className={styles.footerLabel}>
                テーマ: {themeLabel[themeMode]}
              </span>
            )}
          </button>
          <Link
            href="/settings"
            className={styles.footerButton}
            data-active={pathname?.startsWith("/settings") || undefined}
            aria-label="設定"
            title="設定"
          >
            <Settings size={18} aria-hidden="true" />
            {expanded && <span className={styles.footerLabel}>設定</span>}
          </Link>
          <button
            type="button"
            className={styles.footerButton}
            onClick={handleSignOut}
            aria-label="ログアウト"
            title="ログアウト"
          >
            <LogOut size={18} aria-hidden="true" />
            {expanded && <span className={styles.footerLabel}>ログアウト</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
