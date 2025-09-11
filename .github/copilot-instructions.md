# Copilot 指示書（Eda.ai プロジェクト用）

この指示書は、CopilotがEda.aiプロジェクトで生産的に作業するためのガイドラインです。
コードレビュー観点（再利用性・可読性・命名・型安全性）は従来通り厳守してください。

## アーキテクチャ概要

- **Next.js App Router構成**（`src/app/`配下）で、Server Component/Client Componentを明確に分離。
- **認証はbetter-auth**（`src/auth.ts`）で一元管理。Google認証・セッション管理はbetter-authのAPI経由。
- **DBはPrisma/PosgreSQL**。スキーマは`prisma/schema.prisma`、マイグレーションは`npx prisma migrate dev`。
- **型・ドメイン分離**：型は`src/types/`、ドメインロジックは`src/components/domain/`、共通UIは`src/components/common/`。
- **API/DBアクセスはRepositoryパターン**：`src/app/api/(Repository)/`や`src/app/api/(Controller)/`で責務分離。

## 開発ワークフロー

- **初回セットアップ**
  1. `npm i`
  2. `.env`を配布ファイルから設置
  3. `docker compose up -d` でDB起動
  4. `npx prisma migrate dev` でマイグレ
  5. `npm run dev` で開発サーバ起動

- **コミット前チェック**
  - `lefthook`で`biome check`（lint/format）と`typecheck`（型チェック）が自動実行
  - エラー時は`npm run format`や型修正必須

- **コミットメッセージ**
  - [Conventional Commits](https://www.conventionalcommits.org/ja/v1.0.0/) に従う
  - フォーマット: `<type>[optional scope]: <description>`
    - 例: `feat: add user authentication`, `fix: resolve login bug`
  - 主なタイプ: `feat` (新機能), `fix` (バグ修正), `docs` (ドキュメント), `style` (スタイル), `refactor` (リファクタ), `test` (テスト), `chore` (その他)
  - 破壊的変更: `!` を付ける (例: `feat!: change API`)
  - 理由: 自動化ツール（リリースノート生成、バージョン管理）との連携を容易にするため

- **認証フロー**
  - サインイン/サインアウトはServer Action（例: `src/app/actions/auth.ts`）で実装し、クライアントからは`<form action={handleSignOut}>`等で呼び出す
  - APIルート`/api/auth/[...auth]`はbetter-authの`toNextJsHandler`で自動生成

## プロジェクト固有のコーディング規約

- **命名規則**
  - カスタム関数で`on`始まりは禁止（例外: 組み込みイベント）
- **型安全性**
  - `as`による型アサーションは原則禁止。型ガードやジェネリクスを優先
- **再利用性**
  - 型・UI・ロジックは共通化を最優先。重複実装は避ける
- **可読性**
  - 早期リターン推奨。ネスト深い場合は関数分割

## 主要ディレクトリ・ファイル

- `src/auth.ts` … better-auth認証設定
- `src/app/actions/` … Server Actions（認証・DB操作等）
- `src/app/api/` … APIルート/Controller/Repository
- `src/components/common/` … 汎用UI
- `src/components/domain/` … ドメイン固有UI
- `prisma/schema.prisma` … DBスキーマ

## 外部依存・統合

- **better-auth** … 認証
- **Prisma** … ORM
- **MUI** … UIコンポーネント
- **lefthook/biome** … Lint/Format/型チェック自動化

---

不明点や追加したい観点があればご指摘ください。内容を随時アップデートします。
