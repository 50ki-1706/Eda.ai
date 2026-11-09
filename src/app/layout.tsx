import "@/app/globals.css";
import type { Metadata, Viewport } from "next";
import { Source_Code_Pro } from "next/font/google";
import type React from "react";

// 全画面で使用する等幅フォント。SIL OFL 1.1 のオープンソースフォント。
const sourceCodePro = Source_Code_Pro({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-source-code-pro",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Eda.ai",
  description: "New Branched AI Chat",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

type RootLayoutProps = {
  children: React.ReactNode;
};
const RootLayout: React.FC<RootLayoutProps> = (props) => (
  // lang は日本語UIのため ja を指定する
  // テーマ（.dark クラス）はハイドレーション後に AppShell の useTheme が適用する
  <html lang="ja" className={sourceCodePro.variable} suppressHydrationWarning>
    <body>{props.children}</body>
  </html>
);

export default RootLayout;
