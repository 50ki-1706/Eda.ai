"use client";

import { type ThemeMode, useUiStore } from "@/stores/uiStore";
import { useEffect } from "react";

/** OS のダークモード設定を判定する（ブラウザ環境のみ） */
const systemPrefersDark = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
};

/** テーマ指定から実際にダークで描画するかを解決する */
const resolveDark = (mode: ThemeMode): boolean => {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return systemPrefersDark();
};

/**
 * カラーテーマを `<html>` の `.dark` クラスへ反映するフック
 *
 * - テーマの選択値は zustand（uiStore）に保持する
 * - system の場合は OS 設定の変化に追従する
 */
export const useTheme = () => {
  const themeMode = useUiStore((state) => state.themeMode);
  const setThemeMode = useUiStore((state) => state.setThemeMode);

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      root.classList.toggle("dark", resolveDark(themeMode));
    };
    apply();

    if (themeMode !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [themeMode]);

  /** ライト → ダーク → システムの順に切り替える */
  const cycleTheme = () => {
    const next: ThemeMode =
      themeMode === "light"
        ? "dark"
        : themeMode === "dark"
          ? "system"
          : "light";
    setThemeMode(next);
  };

  return { themeMode, setThemeMode, cycleTheme };
};
