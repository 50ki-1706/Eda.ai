import type { ApiKeyProvider } from "@/constants/models";

/**
 * アプリケーション全体で使うドメイン型
 *
 * DB は snake_case カラムだが、reylo クエリのエイリアスで camelCase に揃えている。
 * createdAt / updatedAt は reylo の型推論上 string（実行時は postgres.js が Date を返す）。
 *
 * API の入出力スキーマ（valibot）は `src/lib/orpc/contract.ts` に定義しており、
 * ここで定義した型と一致していることを `satisfies` でコンパイル時に検証している。
 */

export interface Chat {
  id: string;
  summary: string;
  isPinned: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: string;
  summary: string;
  parentBranchId: string | null;
  chatId: string;
  createdAt: string;
}

export interface Message {
  id: string;
  promptText: string;
  promptFile: string | null;
  parentId: string | null;
  response: string;
  branchId: string;
  createdAt: string;
}

/**
 * ブランチツリーのノード（自己参照）
 *
 * ブランチツリー画面（`StoryTree`）の描画にそのまま使えるよう、
 * `attributes.id` にブランチ ID を必ず持たせた形で API から返す。
 */
export interface TreeNode {
  /** ノードのラベル（ブランチの要約） */
  name: string;
  /** `id` にブランチ ID を持つ */
  attributes: { id: string };
  children: TreeNode[];
}

/**
 * LLM プロバイダーのカタログに載るモデル（プロバイダーをまたいで正規化した形）
 *
 * サーバー（カタログ取得）とクライアント（モデルピッカー）の双方で使うため、
 * サーバー専用モジュールには依存させない。
 */
export interface CatalogModel {
  /** プロバイダーをまたいで一意な ID（`<provider>:<modelId>`） */
  id: string;
  provider: ApiKeyProvider;
  /** プロバイダーへ渡すモデル ID */
  modelId: string;
  label: string;
  /** 画像入力に対応しているか */
  supportsVision: boolean;
  /** 入力・出力ともに無料か */
  isFree: boolean;
  /** コンテキスト長（不明なら undefined） */
  contextLength?: number;
}

/** 設定画面に返す、プロバイダーごとの登録状況 */
export interface ProviderStatus {
  provider: ApiKeyProvider;
  label: string;
  description: string;
  consoleUrl: string;
  keyPlaceholder: string;
  /** キーが登録済みか */
  registered: boolean;
  /** 登録済みキーのヒント（未登録なら null） */
  keyHint: string | null;
  /** カタログから取得できたモデル数 */
  modelCount: number;
}

/** 設定画面に返す全体の状態 */
export interface SettingsState {
  providers: ProviderStatus[];
  /** 各プロバイダーの公開カタログから取得した最新のモデル一覧 */
  models: CatalogModel[];
  /** 現在選択中のモデル ID */
  modelId: string;
  /** 現在のモデルが利用可能（= 対応プロバイダーのキーが登録済み）か */
  modelAvailable: boolean;
}
