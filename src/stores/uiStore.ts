"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * アプリシェル（サイドバー・テーマ）のグローバル UI 状態
 *
 * 画面をまたいで保持したい表示状態だけを置く。
 * サーバー由来のデータ（チャット一覧など）はここに入れない。
 */

/** カラーテーマの指定。system は OS の設定に追従する */
export type ThemeMode = "light" | "dark" | "system";

interface UiState {
  /** デスクトップ幅でサイドバーを折りたたむか */
  sidebarCollapsed: boolean;
  /** モバイル幅でドロワーを開いているか */
  drawerOpen: boolean;
  /** カラーテーマ */
  themeMode: ThemeMode;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setDrawerOpen: (open: boolean) => void;
  toggleDrawer: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      drawerOpen: false,
      themeMode: "system",
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setDrawerOpen: (open) => set({ drawerOpen: open }),
      toggleDrawer: () => set((state) => ({ drawerOpen: !state.drawerOpen })),
      setThemeMode: (mode) => set({ themeMode: mode }),
    }),
    {
      name: "eda-ui",
      // ドロワーの開閉は一時的な状態なので永続化しない
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        themeMode: state.themeMode,
      }),
    },
  ),
);
