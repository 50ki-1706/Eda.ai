# Color Palette & Theming

このプロジェクトのカラーパレットは、Tailwind CSS (v4) と Material UI (MUI) を併用して構成されています。ベースとなるカラーシステムは `src/app/globals.css` で定義された CSS 変数 (OKLCHカラー) に依存しています。

## 1. ベースカラーパレット (Tailwind / globals.css)

CSS変数はライトモード (`:root`) と ダークモード (`.dark`) で切り替えられるように定義されています。shadcn/ui に準拠した構造を持っています。

### 汎用・背景色
- **Background (`--background`)**: ページの背景
  - Light: 白 / Dark: 黒（濃いグレー）
- **Foreground (`--foreground`)**: 基本のテキスト
  - Light: 黒（濃いグレー） / Dark: 白
- **Card / Popover**: カードUIやポップオーバーの背景・文字色

### プライマリー・セカンダリー
- **Primary (`--primary`)**: 主要なボタンやアクセント要素
  - Light: ダークグレー `oklch(0.205 0 0)` / Dark: ライトグレー `oklch(0.922 0 0)`
- **Secondary (`--secondary`)**: 補助的なボタンや要素
  - Light: 薄いグレー `oklch(0.97 0 0)` / Dark: ダークグレー `oklch(0.269 0 0)`

### 状態・その他のカラー
- **Muted**: 無効状態や薄い背景・文字
- **Accent**: ホバー時などのアクセント
- **Destructive**: エラーや削除などの警告色（赤系）
  - Light: `oklch(0.577 0.245 27.325)` / Dark: `oklch(0.704 0.191 22.216)`
- **Border / Input / Ring**: 境界線、入力欄の背景、フォーカス時のリング色

### チャート / サイドバー専用色
- `--chart-1` ~ `--chart-5`: グラフ描画時のカラーセット
- `--sidebar-`, `--sidebar-primary-` 等: サイドバー領域専用のカラー指定

## 2. MUI (Material UI) のテーマ利用状況

MUIコンポーネントにおけるカラー指定は、デフォルトのテーマ拡張と、上記CSS変数やベタ打ちのカラー値が混在しています。

### よく使われるMUIのパレット値 (`sx` プロップ内)
- **`primary.main`**: チャットの自分のメッセージ背景やアクティブな要素 (`bgcolor: "primary.main"`)
- **`background.paper`**: Botのメッセージ背景やカード背景 (`bgcolor: t.palette.background.paper`)
- **`background.default`**: 全体の背景の参照 (`alpha(t.palette.background.default, 0.6)` など)
- **`grey.200`**: Botのアイコンや特定の領域の背景
- **`divider`**: 境界線の色

### 特徴的なカラーの利用
- **Sidebar (`src/components/common/Sidebar.tsx`)**: 
  - ヘッダー等の特定領域で `#000` (黒) や `#fff` (白), `#222` をハードコーディングで利用。
- **Home画面の背景グラデーション (`src/components/domain/(authenticated)/home/HomePage.tsx`)**:
  - `alpha(t.palette.primary.light, 0.06)` や `alpha(t.palette.common.black, 0.02)` を使用した薄い線形グラデーションが設定されています。
