# Design System

Eda.ai のUIは、**Tailwind CSS (v4)** と **Material UI (MUI v7)** を併用するハイブリッドなアプローチで構築されています。
このドキュメントでは、カラーパレット（`color-palette.md`）以外のデザインシステム要素（レイアウト、タイポグラフィ、スペーシング、シェイプなど）についてまとめます。

## 1. ライブラリと基本方針

- **Tailwind CSS v4 (`@tailwindcss`)**:
  - 全体的なグローバルスタイルのリセット、ユーティリティクラスによる基本構造、ダークモードの変数管理（`@custom-variant dark`）を担当しています。
  - 主に `globals.css` において、shadcn/ui に準拠したCSS変数が定義されています。
- **Material UI (MUI)**:
  - コンポーネントの実装（ボタン、入力欄、ドロワー、スタックレイアウト等）の主軸として利用されています。
  - スタイリングは主に MUI の `sx` プロップを用いてインラインで行われています。
  - テーマの拡張（`createTheme` や `ThemeProvider`）は行わず、デフォルトのテーマをベースにローカルでオーバライドする手法が採られています。

## 2. レイアウト & スペーシング

レイアウト設計は主に MUI の `Box`, `Stack`, `Container` が用いられています。

- **PageContainer (`src/components/common/PageContainer.tsx`)**:
  - 画面全体のルートを包むラッパーです。
  - `100vh`, `width: 100%` を基本とし、デフォルトで中身を中央配置（`display: flex`, `alignItems: "center"`, `justifyContent: "center"`）します。
  - `disableGutters` を有効にしており、ブラウザのデフォルトマージンを排除しています。
- **Spacing (MUI `theme.spacing`)**:
  - `Stack` の `spacing` プロップを多用しています。（例: `spacing={2}` = 16px, `spacing={4}` = 32px）
  - パディングやマージンも `px: 2`, `py: 6`, `mb: 1`, `my: 2.5` など MUI の単位（1単位=8px）に依存しています。

## 3. シェイプとBorder Radius

要素の角丸設定は、グローバルCSS変数とMUIのインライン指定の両方が混在しています。

- **グローバル変数 (`globals.css`)**:
  - 基本 Radius: `--radius: 0.625rem` (10px)
  - 派生 Radius: `--radius-sm` (6px), `--radius-md` (8px), `--radius-lg` (10px), `--radius-xl` (14px)
- **MUIにおける固有の指定**:
  - **メッセージ入力バー (`MessageInputBar`)**: 丸みを帯びたピル（Pill）形状を採用 (`borderRadius: 999`)
  - **チャットメッセージ吹き出し (`ChatMessage`)**: やや控えめな角丸 (`borderRadius: 2` = 16px ※テーマによる)
  - **サイドバー開閉ボタン**: 片側だけの特殊な角丸 (`borderRadius: "0 10px 10px 0"`)
  - **ツリーのノード等**: `borderRadius: 5` などの固定値。

## 4. タイポグラフィ

フォントファミリーはCSS変数として定義されていますが、Next.jsの組み込みフォント（通常は`next/font`）から供給されることを前提としています。

- **Font Family (`globals.css`)**:
  - Sans-serif: `var(--font-geist-sans)`
  - Monospace: `var(--font-geist-mono)`
- **Font Weight / Size**:
  - 見出し部分（`Title.tsx`など）では `fontWeight={900}` などの強いウェイトが使用されています。
  - ツリービュー内のラベルなどでは `fontFamily: "monospace"`, `fontSize: 12`, `fontWeight: 500` のように個別に指定されています。
  - アイコンフォント（MUI Icons）は `fontSize="small"` などMUIの標準サイズプロップを利用。

## 5. シャドウとボーダー

フラットデザインをベースとしつつ、入力欄などのフォーカス状態の表現に重点を置いています。

- **シャドウ (Box Shadow)**:
  - リッチなドロップシャドウはほとんど使用されておらず、メッセージ入力バーでは明示的に `boxShadow: "none"` が指定されています。
- **ボーダー (Border)**:
  - 入力欄の枠線はデフォルトで `borderColor: "divider"` (またはアルファ付きの薄い色) が設定され、フォーカス時に `borderColor: "primary.main"` と `borderWidth: 1.5` で強調される設計です。
  - サイドバー (`Drawer`) の背景には、単色ではなく `radial-gradient` による微かな立体感が演出されています。
