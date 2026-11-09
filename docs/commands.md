# プロジェクト・コマンドリファレンス

このドキュメントでは、Eda.ai プロジェクトの開発および運用で使用する主要なコマンドをまとめています。
パッケージマネージャーとして **pnpm** を使用しています。

## 開発環境（devenv）

このプロジェクトは **devenv** で開発環境を定義しています（Node.js 24 と pnpm を提供）。
コマンドはすべて `devenv shell` 経由で実行するか、`devenv shell` に入ってから実行します。

| コマンド | 説明 |
| :--- | :--- |
| `devenv shell` | 開発用シェルに入ります（node / pnpm が利用可能になります）。 |
| `devenv shell '<コマンド>'` | 開発用シェル内でコマンドを一度だけ実行します。 |

## アプリケーションの起動・停止

| コマンド | 説明 |
| :--- | :--- |
| `pnpm dev` | 開発サーバー（Next.js）を起動します。変更はホットリロードで即座に反映されます。 |
| `docker compose up -d` | ローカル開発用のPostgreSQLデータベースコンテナをバックグラウンドで起動します。 |
| `docker compose down` | 起動中のデータベースコンテナを停止・削除します。 |

## データベース操作（reylo）

ORMには **Prisma** ではなく **reylo** を使用しています。
`.sql` ファイル（`src/queries/`）をTypeScriptから直接インポートし、型推論はライブDBのスキーマから行われます。
スキーマ定義は `db/schema.sql` を編集します。

| コマンド | 説明 |
| :--- | :--- |
| `pnpm db:push` | `db/schema.sql` をローカルDBに適用します（DBコンテナがなければ起動します）。 |
| `docker compose exec db psql -U root -d db` | psqlでデータベースの中身を直接確認します。 |

## コード品質管理（Lint, Format, Typecheck）

このプロジェクトでは、コードフォーマッターおよびリンターに **Biome**、型チェックに **TypeScript** を使用しています。

| コマンド | 説明 |
| :--- | :--- |
| `pnpm format` | Biomeによるコードフォーマットと、安全なLintの自動修正を実行します。ファイルの保存時やコミット前に使用します。 |
| `pnpm check` | BiomeによるフォーマットエラーとLintエラーの確認を行います（自動修正は行いません）。CIやGitフックで実行されます。 |
| `pnpm lint` | BiomeによるLintチェックのみを実行します。 |
| `pnpm typecheck` | 型チェックを実行します（`next typegen` 後に `tsc --noEmit --runExternalCode`）。`.sql` クエリの型は reylo がライブDBから推論します。 |

## API ドキュメント（OpenAPI / Swagger UI）

API は oRPC のコントラクト（`src/lib/orpc/contract.ts`）から OpenAPI 3.1.1 仕様を自動生成しています。
`pnpm dev` で開発サーバーを起動した状態で、以下を確認できます。

| URL | 内容 |
| :--- | :--- |
| `http://localhost:3000/api/openapi` | Swagger UI（ブラウザで閲覧・実行） |
| `http://localhost:3000/api/openapi/spec.json` | OpenAPI 仕様 JSON |
| `http://localhost:3000/api/rpc` | oRPC クライアント用の型安全 RPC エンドポイント |

```bash
# 開発サーバー起動後
open http://localhost:3000/api/openapi        # Swagger UI
curl http://localhost:3000/api/openapi/spec.json  # OpenAPI 仕様 JSON
```

- Swagger UI の「Try it out」でリクエストを送る場合は、ブラウザの Cookie によるログイン済みセッションが必要です。
- 仕様の `path` はそのまま REST として呼び出せます（例: `curl http://localhost:3000/api/openapi/chats`）。
- エンドポイントを追加・変更した場合は `src/lib/orpc/contract.ts` を編集すれば、仕様は自動的に更新されます（手動でのドキュメント修正は不要）。

## ビルド・本番環境向け

| コマンド | 説明 |
| :--- | :--- |
| `pnpm build` | 本番環境用にアプリケーションをビルド・最適化します。 |
| `pnpm start` | ビルド済みの本番用Next.jsサーバーを起動します。実行前に `pnpm build` が必要です。 |

## その他・セットアップ関連

| コマンド | 説明 |
| :--- | :--- |
| `pnpm install` | `package.json` に基づき、プロジェクトの依存関係をインストールします。 |
| `pnpm prepare` | Lefthook（Gitフックマネージャー）をインストール・有効化します。これにより、コミット時に自動で各種チェックが走ります。 |
