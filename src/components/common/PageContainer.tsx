import { Container } from "@mui/material";
import type React from "react";
interface PageContainerProps {
  children: React.ReactNode;
  /**
   * デフォルトのセンタリングレイアウトを使用するかどうか
   * false にすると、幅・高さ100%で素のコンテナとして機能
   */
  centerLayout?: boolean;
  bgColor?: string;
}

const PageContainer: React.FC<PageContainerProps> = ({
  children,
  centerLayout = true,
  bgColor = "transparent",
}) => (
  <Container
    maxWidth={false}
    disableGutters
    sx={{
      width: "100%",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: centerLayout ? "center" : "stretch",
      justifyContent: centerLayout ? "center" : "flex-start",
      backgroundColor: bgColor,
    }}
  >
    {children}
  </Container>
);

export default PageContainer;
