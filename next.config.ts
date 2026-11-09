import type { NextConfig } from "next";
import { withReylo } from "reylo/next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "**",
      },
    ],
  },
};

// withReylo で .sql ファイルをインポート可能にする（Turbopack/webpack 両対応）
export default withReylo(nextConfig);
