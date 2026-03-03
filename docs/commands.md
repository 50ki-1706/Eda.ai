# プロジェクト・コマンドリファレンス

このドキュメントでは、Eda.ai プロジェクトの開発および運用で使用する主要なコマンドをまとめています。
パッケージマネージャーとして **pnpm** を使用しています。

## アプリケーションの起動・停止

| コマンド | 説明 |
| :--- | :--- |
| `pnpm dev` | 開発サーバー（Next.js）を起動します。変更はホットリロードで即座に反映されます。 |
| `docker compose up -d` | ローカル開発用のPostgreSQLデータベースコンテナをバックグラウンドで起動します。 |
| `docker compose down` | 起動中のデータベースコンテナを停止・削除します。 |

## データベース操作（Prisma）

| コマンド | 説明 |
| :--- | :--- |
| `pnpm exec prisma migrate dev` | 開発環境のデータベースにマイグレーションを適用し、Prisma Clientを更新します。 |
| `pnpm exec prisma generate` | `schema.prisma` からPrisma Clientの型定義を再生成します（ビルド時や手動での更新時に使用します）。 |
| `pnpm exec prisma studio` | ブラウザ上でデータベースの中身を直接閲覧・編集できるGUIツール（Prisma Studio）を起動します。 |

## コード品質管理（Lint, Format, Typecheck）

このプロジェクトでは、コードフォーマッターおよびリンターに **Biome**、型チェックに **TypeScript** を使用しています。

| コマンド | 説明 |
| :--- | :--- |
| `pnpm format` | Biomeによるコードフォーマットと、安全なLintの自動修正を実行します。ファイルの保存時やコミット前に使用します。 |
| `pnpm check` | BiomeによるフォーマットエラーとLintエラーの確認を行います（自動修正は行いません）。CIやGitフックで実行されます。 |
| `pnpm lint` | BiomeによるLintチェックのみを実行します。 |
| `pnpm typecheck` | TypeScriptの型チェックを実行します（コンパイル結果は出力しません）。型エラーがないか確認します。 |

## ビルド・本番環境向け

| コマンド | 説明 |
| :--- | :--- |
| `pnpm build` | 本番環境用にアプリケーションをビルド・最適化します（実行前に `prisma generate` も自動実行されます）。 |
| `pnpm start` | ビルド済みの本番用Next.jsサーバーを起動します。実行前に `pnpm build` が必要です。 |

## その他・セットアップ関連

| コマンド | 説明 |
| :--- | :--- |
| `pnpm install` | `package.json` に基づき、プロジェクトの依存関係をインストールします。 |
| `pnpm prepare` | Lefthook（Gitフックマネージャー）をインストール・有効化します。これにより、コミット時に自動で各種チェックが走ります。 |
