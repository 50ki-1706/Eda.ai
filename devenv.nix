# devenv 環境定義
# Node.js 24（reylo の要件）と pnpm を提供する
{ pkgs, ... }:

{
  packages = [
    pkgs.nodejs_24
    pkgs.pnpm
  ];

  # devenv 起動時に .env を読み込む
  dotenv.enable = true;
}
