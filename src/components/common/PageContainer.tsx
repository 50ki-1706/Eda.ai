import type React from "react";
import styles from "./PageContainer.module.css";

interface PageContainerProps {
  children: React.ReactNode;
  /**
   * デフォルトのセンタリングレイアウトを使用するかどうか
   * false にすると、幅・高さ100%で素のコンテナとして機能
   */
  centerLayout?: boolean;
  /** 背景色（"transparent" の場合は透過） */
  bgColor?: string;
}

const PageContainer: React.FC<PageContainerProps> = ({
  children,
  centerLayout = true,
  bgColor = "transparent",
}) => (
  <div
    className={`${styles.container} ${centerLayout ? styles.center : styles.stretch}`}
    style={bgColor !== "transparent" ? { backgroundColor: bgColor } : undefined}
  >
    {children}
  </div>
);

export default PageContainer;
