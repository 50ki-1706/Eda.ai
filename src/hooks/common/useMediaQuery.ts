"use client";

import { useEffect, useState } from "react";

/**
 * CSS メディアクエリの一致状態を購読するフック
 *
 * 初期値は false とし、マウント後に実際の値を反映する
 * （サーバー描画時に window を参照しないため）。
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return matches;
};

/** デザインシステムの唯一のブレークポイント（768px 以上 = デスクトップ） */
export const useIsDesktop = () => useMediaQuery("(min-width: 768px)");
