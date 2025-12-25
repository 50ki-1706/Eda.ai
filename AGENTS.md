# プロジェクト概要: Eda.ai

Eda.ai は、Next.js (App Router) をベースにしたチャットアプリケーションプロジェクトです。
Prisma を用いたデータベース操作、Better Auth による認証、tRPC/Server Actions によるデータフェッチを採用しています。
特徴として、チャットにおける「ブランチ（分岐）」機能を持つデータモデル（Project -> Chat -> Branch -> Message）が存在します。

## 技術スタック

| カテゴリ        | 技術              | 詳細/バージョン            |
| --------------- | ----------------- | -------------------------- |
| **Framework**   | Next.js           | v15.3.1 (App Router)       |
| **Language**    | TypeScript        | v5.9.2                     |
| **UI Library**  | React             | v19.0.0                    |
| **Styling**     | Tailwind CSS      | v4.0                       |
| **Components**  | MUI (Material UI) | v7.0.2 (Tailwindと併用)    |
| **Database**    | PostgreSQL        | Dockerで運用               |
| **ORM**         | Prisma            | v6.6.0                     |
| **Auth**        | Better Auth       | v1.2.7                     |
| **API/State**   | tRPC, SWR         | Server Actionsも併用       |
| **Lint/Format** | Biome             | Lefthookでコミット時に実行 |

## ディレクトリ構成 (`src/`)

- **`app/`**: Next.js App Router のルート定義
  - `(authenticated)/`: 認証が必要なルート群
  - `(unauthenticated)/`: 未認証でもアクセス可能なルート群（ログイン画面など）
  - `actions/`: Server Actions 定義
  - `api/`: API Routes (Next.js API Handler)
- **`components/`**: UIコンポーネント
- **`lib/`**: アプリケーション設定・インスタンス初期化
  - `auth.ts`, `auth-client.ts`: Better Auth 設定
  - `prisma.ts`: Prisma Client インスタンス
  - `trpc.ts`: tRPC 設定
- **`hooks/`**: カスタムフック
- **`types/`**: 型定義
- **`schema/`**: バリデーションスキーマなど

## データモデル概要

`prisma/schema.prisma` に基づく主要モデルの関係性:

- **User**: ユーザー。Account, Session, Project, Chat を持つ。
- **Project**: チャットを管理するプロジェクト単位。
- **Chat**: チャットセッション。
- **Branch**: チャットの分岐（Gitのような木構造を持つ）。再帰的な親子関係 (`parentBranch`) を持つ。
- **Message**: 各ブランチ内のメッセージ。

## 開発ガイドライン

### セットアップと実行

1. **依存関係インストール**: `npm install`
2. **DB起動**: `docker compose up -d`
3. **マイグレーション**: `npx prisma migrate dev`
4. **開発サーバ起動**: `npm run dev`

### コード品質管理

- **Formatter/Linter**: `Biome` を使用。`npm run check`, `npm run format` で実行可能。
- **Git Hooks**: `Lefthook` により、コミット時に自動チェック（Lint/Typecheck）が走ります。
- **言語**: コメントアウトやドキュメントは日本語で記述すること。

### 認証フロー

- Better Auth を使用。
- `src/lib/auth.ts` でサーバーサイド設定、`src/lib/auth-client.ts` でクライアントサイド設定を管理。

### API / データフェッチ

- tRPC および Server Actions を適材適所で使い分ける方針と見受けられます。
- `src/app/api` には tRPC や Auth 用のエンドポイントが配置されています。
