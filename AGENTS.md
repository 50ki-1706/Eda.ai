## Post-Implementation Verification

コードベースに変更を加えた後は、**必ず** `verify` skill をロードし、記載されている確認手順に従うこと。これは省略可能な推奨事項ではなく、実装プロセスの一部として必須である。

# Project Overview: Eda.ai

Eda.ai is a visual, branching AI chat application built on Next.js (App Router).
It features a unique branching architecture where each `Chat` can spawn multiple `Branch` instances, and each `Branch` contains a linear sequence of `Message` records—enabling users to explore alternative conversation paths, similar to version control for chat.

**Core Feature**: Visual branching AI chat with tree-structured conversation paths (`Chat -> Branch -> Message`).

## Tech Stack

| Category        | Technology        | Details/Version                 |
| --------------- | ----------------- | ------------------------------- |
| **Framework**   | Next.js           | v16.4（App Router / Turbopack） |
| **Language**    | TypeScript        | v7.1（`contentMappers` で `.sql` / `.module.css` を型付け） |
| **UI Library**  | React             | v19.2                           |
| **Styling**     | CSS Modules       | `*.module.css` + `typed-css-modules-mapper`（Tailwind / MUI は使用しない） |
| **Icons**       | lucide-react      | v0.488                          |
| **Database**    | PostgreSQL        | Docker-based operation          |
| **DBアクセス**   | reylo             | v0.7.0（`.sql` 直接インポート、型はライブDBから推論。Prisma は廃止済み） |
| **Auth**        | Better Auth       | v1.7（kysely アダプター）        |
| **API**         | oRPC              | v1.16（コントラクト + `implement`、SSE ストリーミング） |
| **Validation**  | valibot           | v1.5（`@orpc/valibot` で OpenAPI の JSON Schema へ変換） |
| **State**       | zustand           | v5（UI 状態のみ。サーバーデータは各フックで取得） |
| **API Docs**    | OpenAPI + Swagger UI | `/api/openapi`（コントラクトから自動生成、OpenAPI 3.1.1） |
| **Streaming**   | SSE (eventIterator) | チャット応答を `text/event-stream` で逐次返す |
| **LLM**         | AI SDK            | v7（AI Gateway / OpenRouter / OpenCode Zen） |
| **Lint/Format** | Biome             | Executed on commit via Lefthook |

## Directory Structure (`src/`)

- **`app/`**: Next.js App Router route definitions
  - `(authenticated)/`: Routes requiring authentication
  - `(unauthenticated)/`: Publicly accessible routes (login, etc.)
  - `actions/`: Server Actions definitions
  - `api/`: API Routes (Next.js API Handlers)
    - `rpc/`: oRPC の型安全 RPC ハンドラー（`/api/rpc`）
    - `openapi/`: OpenAPI ハンドラー + Swagger UI（`/api/openapi`、仕様 JSON は `/api/openapi/spec.json`）
    - `(schema)/`: valibot スキーマ（`chat/`, `settings/`）
    - `(Contoller)/`: ビジネスロジック層（`chat.ts`, `settings.ts`, `branchTree.ts`）
    - `(Repository)/`: データアクセス層（reylo の `.sql` を呼ぶ）
    - `(LLM)/`: LLM プロバイダー層（カタログ取得・モデル解決・生成）
- **`components/`**: UI components
- **`lib/`**: Application configuration and instance initialization
  - `db.ts`: postgres.js クライアント（アプリのクエリ用・reylo と組み合わせる）
  - `auth.ts`, `auth-client.ts`: Better Auth configuration
  - `orpc/`: oRPC 関連（フロント/バック共通）
    - `contract.ts`: フロント/バック共通コントラクト（valibot で入出力を定義、OpenAPI の route 情報付き）
    - `router.ts`: コントラクトを `implement` するサーバー実装
    - `procedure.ts`: 認証ミドルウェア（未ログインは `UNAUTHORIZED`）
    - `context.ts`: リクエスト単位のコンテキスト
    - `client.ts`: oRPC クライアント（`RPCLink`）。アプリからは `import { client } from "@/lib/orpc/client"` で利用
- **`hooks/`**: Custom React hooks（`common/` は画面非依存、`domain/` は画面ごと）
- **`types/`**: ドメイン型の単一定義元（`Chat` / `Branch` / `Message` / `TreeNode` / `CatalogModel` / `SettingsState` など）
- **`queries/`**: reylo の `.sql` クエリ（1 ファイル 1 ステートメント）
- **`utils/`**: 純粋なユーティリティ関数

## Documentation Structure (`docs/`)

For detailed specifications, always refer to the documentation files in the `docs/` directory:

| File                           | When to Read                                                                                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/database.md`             | **For ER diagrams, table definitions, and self-referencing tree structures (Branch/Message).** Read this to understand the full data model and relationships. |
| `docs/commands.md`             | **For terminal commands.** Read this for setup, execution, database migrations, and quality control commands (pnpm, docker, reylo, biome).                   |
| `docs/APIDOC.md`               | **For API endpoints.** Read this for oRPC procedures, streaming events, and endpoint specifications.                                                          |
| `docs/page-transition.md`      | **For routing and page flows.** Read this to understand navigation patterns and page transitions.                                                             |
| `docs/design/design_system.md` | **For UI component rules.** Read this to understand the design system, component conventions, and styling patterns.                                           |
| `docs/design/color-palette.md` | **For styling and colors.** Read this for color definitions and theming guidance.                                                                             |
| `docs/decision/`               | **For architecture decisions (ADRs).** Read files in this directory to understand why certain technologies and patterns were chosen.                          |

## Data Model Overview

The core models are:

- **User**: The application user. Holds `Account`, `Session`, and `Chat` records.
- **Chat**: A conversation container. Can have multiple `Branch` instances.
- **Branch**: A conversation branch (tree-structured, similar to Git branches). Supports recursive parent-child relationships.
- **Message**: A single message within a `Branch`.

> **Important**: For detailed schema relationships, field definitions, and the ER diagram, you **MUST** refer to `docs/database.md`.

## Development Guidelines

### Tools

- **Formatter/Linter**: `Biome` is used. Commits automatically trigger lint/type checks via `Lefthook`.
- **Authentication**: `Better Auth` handles authentication. Server-side config is in `src/lib/auth.ts`, client-side in `src/lib/auth-client.ts`.
- **API/Data Fetching**: `oRPC`（`client` を `@/lib/orpc/client` から import）と `Server Actions` を適切に使い分ける。エンドポイントは `src/lib/orpc/contract.ts` で定義し、`src/app/api/rpc` と `src/app/api/openapi` が同じルーターを公開する。
- **Validation**: 入力スキーマは `valibot` で記述する（`src/app/api/(schema)/`）。出力スキーマはコントラクトに定義し、`satisfies` で `src/types` のドメイン型と一致することを検証する。コントラクトの `.input()` / `.output()` に指定すると、検証と OpenAPI 仕様の生成が自動で行われる。
- **型の参照元**: ドメイン型は必ず `@/types` から import する（サーバー層のファイルから import しない）。
- **Streaming**: チャット応答は oRPC の `eventIterator`（SSE）で返す。クライアントは `for await` で `delta` / `done` イベントを消費する。

> **Important**: For setup, execution, and quality control commands, you **MUST** refer to `docs/commands.md`.

## Crucial Agent Instruction

**Code comments and newly created documentation files MUST be written in Japanese.**
You may think and output conversational responses in English if permitted, but the codebase artifacts (comments, inline docs, new markdown files) must remain in Japanese.
