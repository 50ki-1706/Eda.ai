# Page Transition & Routing

このドキュメントでは、Eda.ai の Next.js App Router における画面遷移（ページルーティング）とディレクトリ構成について説明します。

## ディレクトリ構成の概要 (`src/app/`)

アプリケーションは Next.js App Router をベースに構築されており、認証済み・未認証の Route Groups (`(authenticated)`, `(unauthenticated)`) を用いて整理されています。

```text
src/app/
├── (unauthenticated)/
│   └── login/
│       └── page.tsx        # ログイン画面
├── (authenticated)/
│   ├── home/
│   │   └── page.tsx        # ホームダッシュボード（新規チャット作成）
│   └── chat/
│       ├── page.tsx        # チャットルート（ダミー・リダイレクト用）
│       └── [id]/
│           ├── branch/
│           │   └── [branchId]/
│           │       └── page.tsx    # チャット画面（特定ブランチでの対話）
│           ├── tree/
│           │   └── page.tsx        # ブランチ木構造ビュー (react-d3-tree)
│           └── tree2/
│               └── page.tsx        # ブランチ木構造ビュー (xyflow/react)
├── api/                    # API Routes (tRPC, Better Auth 等)
├── layout.tsx              # ルートレイアウト
└── page.tsx                # アプリのルート（/loginへリダイレクト）
```

## 画面一覧と遷移フロー

### 1. Root (`/`)
- **コンポーネント:** `src/app/page.tsx`
- **役割:** アプリケーションのエントリーポイント。
- **遷移:** コンテンツは持たず、自動的に **`/login`** へリダイレクトされます。

### 2. ログイン画面 (`/login`)
- **コンポーネント:** `src/app/(unauthenticated)/login/page.tsx`
- **役割:** 未認証ユーザー向けのログイン画面。
- **遷移:**
  - Googleログインボタン押下後、Better Auth を用いたOAuth認証処理が行われます。
  - 認証成功時、自動的に **`/home`** へリダイレクト（`callbackURL: "/home"`）されます。

### 3. ホーム・ダッシュボード (`/home`)
- **コンポーネント:** `src/app/(authenticated)/home/page.tsx`
- **役割:** 認証済みユーザーの初期表示画面。新規チャットのプロンプトを入力するための専用画面です。
- **遷移:**
  - 初回メッセージを送信すると、`chat.new` API を通じて新規チャットとメインブランチが作成され、自動的に **`/chat/[chatId]/branch/[branchId]`** へ遷移します。
  - 画面左上のサイドバー開閉ボタンから、過去のチャットへアクセス可能です。
  - ログアウトボタン押下で認証セッションを破棄し、**`/login`** へ遷移します。

### 4. 個別チャット画面 (`/chat/[id]/branch/[branchId]`)
- **コンポーネント:** `src/app/(authenticated)/chat/[id]/branch/[branchId]/page.tsx`
- **役割:** 既存のチャット（`id`）内の特定のブランチ（`branchId`）の会話履歴を表示し、対話を行うメイン画面。
- **遷移:**
  - チャット上でメッセージを送信したり、既存のメッセージから「分岐」を行ったりすることで、URLパラメータの `[branchId]` が更新される形で画面が切り替わります。
  - サイドバー等からツリー表示へ切り替えることで、**`/chat/[id]/tree`** へ遷移できます。

### 5. ブランチ木構造ビュー (`/chat/[id]/tree` & `/chat/[id]/tree2`)
- **コンポーネント:** `src/app/(authenticated)/chat/[id]/tree/page.tsx` 等
- **役割:** 特定のチャットに属する会話の分岐（ブランチ）全体を可視化する画面。
  - **`/tree`**: `react-d3-tree` ライブラリを用いた標準のツリー表示画面です。
  - **`/tree2`**: `@xyflow/react` を用いた実験的（または別UI）のノードベースグラフ画面です。
- **遷移:**
  - サイドバーから過去のチャットを選択（クリック）すると、**まずこのツリー画面 (`/chat/[id]/tree`) へ遷移**します（`useSidebar.ts` の挙動より）。
  - ツリー画面上で特定のブランチノードをクリックすると、そのブランチのチャット画面 **`/chat/[id]/branch/[branchId]`** へ遷移し、対話を再開できます。

## 共通UIとナビゲーション (Sidebar)

認証済みルート（`/home` や `/chat/*` など）には、ナビゲーションのための共通コンポーネントが組み込まれています。

- **Sidebar (`src/components/common/Sidebar.tsx`)**
  - 現在のユーザーが持つチャットの一覧を取得して表示します（ピン留め順）。
  - **チャット一覧からの選択:** 特定のチャットアイテムをクリックすると、**`/chat/[chatId]/tree/`** へ遷移し、全体の木構造ビューが表示されます。
  - **「新規チャット追加」:** ヘッダーの追加ボタン（＋）をクリックすると、**`/home`** へ遷移し、新しいチャットを開始できます。
