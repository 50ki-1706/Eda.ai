"use client";

import { useEffect } from "react";
import styles from "./Toast.module.css";

export interface ToastProps {
  /** 表示するメッセージ（null の場合は非表示） */
  message: string | null;
  /** メッセージを閉じるハンドラー */
  onClose: () => void;
  /** 自動で閉じるまでのミリ秒 */
  duration?: number;
}

/**
 * 画面下部に表示するトースト通知
 * Material UI の Snackbar の代替として自前実装した
 */
export default function Toast({
  message,
  onClose,
  duration = 2200,
}: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    // output 要素は暗黙的に role="status" を持つため role 属性は不要
    <output className={styles.toast} aria-live="polite">
      {message}
    </output>
  );
}
