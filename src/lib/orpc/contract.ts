import {
  branchStructureInputSchema,
  createChatInputSchema,
  getMessageInputSchema,
  mergeBranchInputSchema,
  newBranchInputSchema,
  sendMessageInputSchema,
  updateChatIsPinnedInputSchema,
} from "@/app/api/(schema)/chat";
import {
  deleteApiKeyInputSchema,
  saveApiKeyInputSchema,
  saveModelInputSchema,
} from "@/app/api/(schema)/settings";
import { apiKeyProviders } from "@/constants/models";
import { eventIterator, oc } from "@orpc/contract";
import * as v from "valibot";

/**
 * フロントエンド / バックエンド共通の oRPC コントラクト
 *
 * クライアントコンポーネントからも import されるため、
 * `server-only`・DB・認証・環境変数に依存するモジュールは絶対に import しないこと。
 * （スキーマ（`@/app/api/(schema)/*`）と定数（`@/constants/models`）は
 *   どちらもクライアント安全な純粋な定義のみで構成されている）
 *
 * 各手続きには OpenAPI 仕様へ反映するための `.route()` を必ず付与する。
 * path parameter（`{chatId}` など）を使う場合、input スキーマのキー名が
 * path parameter 名と一致している必要がある。
 */

/* -------------------------------------------------------------------------- */
/* 出力スキーマ（DB 由来のドメイン型）                                          */
/* -------------------------------------------------------------------------- */

/** チャット（`src/types/index.ts` の `Chat` と対応） */
export const chatSchema = v.object({
  id: v.string(),
  summary: v.string(),
  isPinned: v.boolean(),
  userId: v.string(),
  createdAt: v.string(),
  updatedAt: v.string(),
});

/** ブランチ（`src/types/index.ts` の `Branch` と対応） */
export const branchSchema = v.object({
  id: v.string(),
  summary: v.string(),
  parentBranchId: v.nullable(v.string()),
  chatId: v.string(),
  createdAt: v.string(),
});

/** メッセージ（`src/types/index.ts` の `Message` と対応） */
export const messageSchema = v.object({
  id: v.string(),
  promptText: v.string(),
  promptFile: v.nullable(v.string()),
  parentId: v.nullable(v.string()),
  response: v.string(),
  branchId: v.string(),
  createdAt: v.string(),
});

/** ブランチツリーのノード（`src/types/tree.ts` の `RawNodeDatum` と対応、自己参照） */
export const treeNodeSchema: v.GenericSchema<{
  name: string;
  attributes: { id: string };
  children: TreeNode[];
}> = v.object({
  name: v.string(),
  attributes: v.object({ id: v.string() }),
  children: v.array(v.lazy(() => treeNodeSchema)),
});

export type TreeNode = v.InferOutput<typeof treeNodeSchema>;

/* -------------------------------------------------------------------------- */
/* 出力スキーマ（設定）                                                          */
/* -------------------------------------------------------------------------- */

/** API キーを登録できるプロバイダー（`@/constants/models` と一致） */
export const apiKeyProviderSchema = v.picklist(apiKeyProviders);

/** カタログ上のモデル（`src/app/api/(LLM)/catalog.ts` の `CatalogModel` と対応） */
export const catalogModelSchema = v.object({
  id: v.string(),
  provider: apiKeyProviderSchema,
  modelId: v.string(),
  label: v.string(),
  supportsVision: v.boolean(),
  isFree: v.boolean(),
  /** コンテキスト長（不明なら undefined） */
  contextLength: v.optional(v.number()),
});

/** プロバイダーごとの登録状況（`src/app/api/(Contoller)/settings.ts` の `ProviderStatus` と対応） */
export const providerStatusSchema = v.object({
  provider: apiKeyProviderSchema,
  label: v.string(),
  description: v.string(),
  consoleUrl: v.string(),
  keyPlaceholder: v.string(),
  /** キーが登録済みか */
  registered: v.boolean(),
  /** 登録済みキーのヒント（未登録なら null） */
  keyHint: v.nullable(v.string()),
  /** カタログから取得できたモデル数 */
  modelCount: v.number(),
});

/** 設定画面に返す全体の状態（`SettingsState` と対応） */
export const settingsStateSchema = v.object({
  providers: v.array(providerStatusSchema),
  /** 各プロバイダーの公開カタログから取得した最新のモデル一覧 */
  models: v.array(catalogModelSchema),
  /** 現在選択中のモデル ID */
  modelId: v.string(),
  /** 現在のモデルが利用可能（= 対応プロバイダーのキーが登録済み）か */
  modelAvailable: v.boolean(),
});

/** 設定系 API の出力型 */
export type CatalogModel = v.InferOutput<typeof catalogModelSchema>;
export type ProviderStatus = v.InferOutput<typeof providerStatusSchema>;
export type SettingsState = v.InferOutput<typeof settingsStateSchema>;

/* -------------------------------------------------------------------------- */
/* ストリーミングのイベントスキーマ                                              */
/* -------------------------------------------------------------------------- */

/** テキスト差分イベント（LLM が生成した文字列の断片） */
export const chatDeltaEventSchema = v.object({
  type: v.literal("delta"),
  text: v.string(),
});

/** `chat.new` の完了イベント（保存済みの Chat / Branch / Message） */
export const createChatDoneEventSchema = v.object({
  type: v.literal("done"),
  chat: chatSchema,
  branch: branchSchema,
  message: messageSchema,
});

/** `chat.branch.sendMessage` の完了イベント（保存済みの Message） */
export const sendMessageDoneEventSchema = v.object({
  type: v.literal("done"),
  message: messageSchema,
});

/** `chat.new` がストリームで流すイベント（判別可能ユニオン） */
export const createChatEventSchema = v.variant("type", [
  chatDeltaEventSchema,
  createChatDoneEventSchema,
]);

/** `chat.branch.sendMessage` がストリームで流すイベント（判別可能ユニオン） */
export const sendMessageEventSchema = v.variant("type", [
  chatDeltaEventSchema,
  sendMessageDoneEventSchema,
]);

/** ストリーミングイベントの型 */
export type ChatDeltaEvent = v.InferOutput<typeof chatDeltaEventSchema>;
export type CreateChatDoneEvent = v.InferOutput<
  typeof createChatDoneEventSchema
>;
export type SendMessageDoneEvent = v.InferOutput<
  typeof sendMessageDoneEventSchema
>;
export type CreateChatEvent = v.InferOutput<typeof createChatEventSchema>;
export type SendMessageEvent = v.InferOutput<typeof sendMessageEventSchema>;

/* -------------------------------------------------------------------------- */
/* コントラクト本体                                                              */
/* -------------------------------------------------------------------------- */

export const contract = {
  chat: {
    /** 新規チャットを作成する（LLM の応答をストリーミングで返し、完了時に保存済みレコードを返す） */
    new: oc
      .route({
        method: "POST",
        path: "/chats",
        summary: "新規チャットを作成する",
        description:
          "プロンプトを LLM に送信し、応答をストリーミングで返します。完了時に Chat・Branch・Message を保存して `done` イベントで返します。",
        tags: ["chat"],
      })
      .input(createChatInputSchema)
      .output(eventIterator(createChatEventSchema)),

    /** チャットのピン留め状態を切り替える */
    updatePinned: oc
      .route({
        method: "PATCH",
        path: "/chats/{chatId}/pinned",
        summary: "チャットのピン留め状態を更新する",
        description: "指定したチャットのピン留め状態を切り替えます。",
        tags: ["chat"],
      })
      .input(updateChatIsPinnedInputSchema)
      .output(chatSchema),

    /** ログインユーザーが所有するチャット一覧を取得する（ピン留め優先） */
    getChatsByUserId: oc
      .route({
        method: "GET",
        path: "/chats",
        summary: "チャット一覧を取得する",
        description:
          "ログインユーザーが所有するチャット一覧を、ピン留め優先で返します。",
        tags: ["chat"],
      })
      .output(v.array(chatSchema)),

    branch: {
      /** チャット内のブランチ構造をツリー形式で取得する */
      structure: oc
        .route({
          method: "GET",
          path: "/chats/{chatId}/tree",
          summary: "ブランチツリーを取得する",
          description:
            "チャット内のブランチ構造を、UI 描画用のツリー形式で返します。",
          tags: ["chat", "branch"],
        })
        .input(branchStructureInputSchema)
        .output(treeNodeSchema),

      /** 既存チャットにメッセージを送信する（LLM の応答をストリーミングで返す） */
      sendMessage: oc
        .route({
          method: "POST",
          path: "/branches/{branchId}/messages",
          summary: "ブランチにメッセージを送信する",
          description:
            "指定したブランチにメッセージを送信し、LLM の応答をストリーミングで返します。完了時に保存済みの Message を `done` イベントで返します。",
          tags: ["chat", "branch"],
        })
        .input(sendMessageInputSchema)
        .output(eventIterator(sendMessageEventSchema)),

      /** ブランチを親ブランチにマージする */
      merge: oc
        .route({
          method: "POST",
          path: "/branches/{branchId}/merge",
          summary: "ブランチを親ブランチにマージする",
          description:
            "対象ブランチとその子孫のメッセージを親ブランチへ移動し、ブランチ自体を削除します。",
          tags: ["chat", "branch"],
        })
        .input(mergeBranchInputSchema)
        .output(v.void()),

      /** 既存メッセージの分岐点から新しいブランチを作成する */
      new: oc
        .route({
          method: "POST",
          path: "/branches",
          summary: "ブランチを新規作成する",
          description:
            "指定したメッセージの親を起点として、新しいブランチを作成します。",
          tags: ["chat", "branch"],
        })
        .input(newBranchInputSchema)
        .output(branchSchema),

      /** 指定ブランチ内のメッセージ一覧を時系列順で取得する */
      getMessages: oc
        .route({
          method: "GET",
          path: "/branches/{branchId}/messages",
          summary: "ブランチ内のメッセージ一覧を取得する",
          description: "指定したブランチ内のメッセージを時系列順で返します。",
          tags: ["chat", "branch"],
        })
        .input(getMessageInputSchema)
        .output(v.array(messageSchema)),
    },
  },

  settings: {
    /** 登録済み API キー・モデル一覧・選択中モデルを取得する */
    get: oc
      .route({
        method: "GET",
        path: "/settings",
        summary: "設定状態を取得する",
        description:
          "登録済み API キーの状況・最新モデル一覧・選択中モデルを返します。",
        tags: ["settings"],
      })
      .output(settingsStateSchema),

    /** モデルピッカー用に、各プロバイダーの最新モデル一覧を取得する */
    getModels: oc
      .route({
        method: "GET",
        path: "/settings/models",
        summary: "モデル一覧を取得する",
        description:
          "モデルピッカー用に、各プロバイダーの最新モデル一覧を返します。",
        tags: ["settings"],
      })
      .output(v.array(catalogModelSchema)),

    /** API キーを登録する（サーバー側で暗号化して保存） */
    saveApiKey: oc
      .route({
        method: "PUT",
        path: "/settings/api-keys",
        summary: "API キーを登録する",
        description: "指定したプロバイダーの API キーを暗号化して保存します。",
        tags: ["settings"],
      })
      .input(saveApiKeyInputSchema)
      .output(v.void()),

    /** API キーを削除する */
    deleteApiKey: oc
      .route({
        method: "DELETE",
        path: "/settings/api-keys/{provider}",
        summary: "API キーを削除する",
        description: "指定したプロバイダーの API キーを削除します。",
        tags: ["settings"],
      })
      .input(deleteApiKeyInputSchema)
      .output(v.void()),

    /** 選択中モデルを保存する */
    saveModel: oc
      .route({
        method: "PUT",
        path: "/settings/model",
        summary: "選択中モデルを保存する",
        description: "モデルピッカーで選択されたモデル ID を保存します。",
        tags: ["settings"],
      })
      .input(saveModelInputSchema)
      .output(v.void()),
  },
} as const;

/** コントラクト全体の型（サーバーの実装・クライアントの型付けに使用） */
export type AppContract = typeof contract;
