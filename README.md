# Eda.ai

## Eda.aiとは

Eda.aiは、ブランチ機能（checkout、merge）を通じて、柔軟で視覚的なAIチャットを実現するアプリケーションです。

Gitのようなブランチ構造により、会話の分岐や統合を直感的に操作でき、複数の会話の流れを視覚的に管理することができます。

### 活用方法
- 技術的検証
- 企画のアイデア出し
- 各種アイデアの壁打ち

## ローカルでのセットアップ

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. Lefthookの有効化

```bash
pnpm prepare
```

### 3. 環境変数の設定

`.env.example`を`.env`にコピーして使用してください。

```bash
cp .env.example .env
```

### 4. ローカルデータベースの起動

dockerを使用します。

```bash
docker compose up -d
```

### 5. データベースマイグレーション

```bash
pnpm exec prisma migrate dev
```

### 6. 開発サーバーの起動

```bash
pnpm dev
```

## 開発ガイドライン

コミット時に以下のチェックが自動で実行されます（Lefthookによる自動化）。

- **Biome check**: フォーマットとリントの確認
- **Typecheck**: 型エラーの確認

### エラーが出た場合の対処

- Biome checkでエラーが出た場合は、以下のコマンドを実行してから再度コミットしてください：

```bash
pnpm format
```

- Typecheckでエラーが出た場合は、型エラーを修正してから再度コミットしてください。

## ドキュメント

本プロジェクトの各種仕様・設計に関する詳細は、`docs/` ディレクトリ以下のドキュメントをご参照ください。

### 開発・運用ガイド
- [コマンドリファレンス (commands.md)](./docs/commands.md) - ローカル開発やビルド、DB操作で使用できるコマンドの一覧

### アーキテクチャ・データ構造
- [データベース設計 (database.md)](./docs/database.md) - Eda.aiのER図、各テーブルの役割、自己参照（ブランチ・メッセージ）の解説
- [APIドキュメント (APIDOC.md)](./docs/APIDOC.md) - サーバー連携（tRPCやServer Actions）のエンドポイントやデータインターフェース仕様

### 画面・UI・デザイン
- [画面遷移設計 (page-transition.md)](./docs/page-transition.md) - アプリケーション全体の画面フローとルーティング構造
- [デザインシステム (design/design_system.md)](./docs/design/design_system.md) - UIコンポーネントの設計方針と共通化のルール
- [カラーパレット (design/color-palette.md)](./docs/design/color-palette.md) - アプリケーションで使用されるテーマカラーや配色の定義

### 技術選定・意思決定 (ADR)
- [バックエンド設計 (decision/backend_design.md)](./docs/decision/backend_design.md) - バックエンドアーキテクチャの選定理由や全体構成
- [技術選定 (decision/technology_selection.md)](./docs/decision/technology_selection.md) - プロジェクトで採用した主要技術（Next.js, Prisma, Better Authなど）の選定基準と理由
