"use client";

import { useTheme } from "@/hooks/common/useTheme";
import type React from "react";
import styles from "./AppShell.module.css";
import AppSidebar from "./AppSidebar";

interface AppShellProps {
  children: React.ReactNode;
  /** サイドバーを表示するか（ログイン画面などでは false） */
  withSidebar?: boolean;
  /** メイン領域のスクロールを有効にするか */
  scrollable?: boolean;
}

/**
 * アプリ共通のシェル
 *
 * サイドバー + メインコンテンツの2カラム構成を提供する。
 * テーマの適用（`.dark` クラスの付け替え）もここで行う。
 */
export default function AppShell({
  children,
  withSidebar = true,
  scrollable = false,
}: AppShellProps) {
  // テーマを <html> に反映する（描画結果には影響しない副作用のみ）
  useTheme();

  return (
    <div className={styles.shell}>
      {withSidebar && <AppSidebar />}
      <main
        className={styles.main}
        data-scrollable={scrollable || undefined}
        data-full={!withSidebar || undefined}
      >
        {children}
      </main>
    </div>
  );
}
