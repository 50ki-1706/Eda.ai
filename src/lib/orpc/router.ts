import { ChatController } from "@/app/api/(Contoller)/chat";
import { SettingsController } from "@/app/api/(Contoller)/settings";
import { ORPCError, implement } from "@orpc/server";
import type { ORPCContext } from "./context";
import { contract } from "./contract";
import { authMiddleware } from "./procedure";

/**
 * コントラクトを実装する oRPC ルーター
 *
 * `implement(contract)` により、各手続きの入出力がコントラクトと
 * 一致していることがコンパイル時に検証される。
 * 認証が必要な手続きには `authed` ミドルウェアを適用する。
 */
const os = implement(contract).$context<ORPCContext>();

/** 認証必須のプロシージャ（コントラクトの型を保ったまま認証を挟む） */
const authed = os.use(authMiddleware);

const chatController = new ChatController();
const settingsController = new SettingsController();

/* -------------------------------------------------------------------------- */
/* chat                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * 新規チャットを作成する（ストリーミング）
 * LLM の応答を delta イベントで逐次返し、完了時に done イベントを返す
 */
export const createChat = authed.chat.new.handler(async function* ({
  input,
  context,
  signal,
}) {
  yield* chatController.createStream(input, context.user.id, signal);
});

/** チャットのピン留め状態を切り替える */
export const updatePinned = authed.chat.updatePinned.handler(
  async ({ input }) => {
    const chat = await chatController.updateChatIsPinned(input);

    // 対象チャットが存在しない場合は NOT_FOUND を返す
    if (!chat) {
      throw new ORPCError("NOT_FOUND", { message: "Chat not found" });
    }

    return chat;
  },
);

/** ログインユーザーが所有するチャット一覧を取得する */
export const getChatsByUserId = authed.chat.getChatsByUserId.handler(
  async ({ context }) => {
    return await chatController.getChatsByUserId(context.user.id);
  },
);

/** チャット内のブランチ構造をツリー形式で取得する */
export const branchStructure = authed.chat.branch.structure.handler(
  async ({ input }) => {
    return await chatController.branchStructure(input);
  },
);

/**
 * ブランチにメッセージを送信する（ストリーミング）
 * LLM の応答を delta イベントで逐次返し、完了時に done イベントを返す
 */
export const sendMessage = authed.chat.branch.sendMessage.handler(
  async function* ({ input, context, signal }) {
    yield* chatController.sendMessageStream(input, context.user.id, signal);
  },
);

/** ブランチを親ブランチにマージする */
export const mergeBranch = authed.chat.branch.merge.handler(
  async ({ input }) => {
    await chatController.mergeBranch(input.branchId);
  },
);

/** 既存メッセージの分岐点から新しいブランチを作成する */
export const createBranch = authed.chat.branch.new.handler(
  async ({ input }) => {
    return await chatController.createBranch(input);
  },
);

/** 指定ブランチ内のメッセージ一覧を取得する */
export const getMessages = authed.chat.branch.getMessages.handler(
  async ({ input }) => {
    return await chatController.getMessages(input.branchId);
  },
);

/* -------------------------------------------------------------------------- */
/* settings                                                                    */
/* -------------------------------------------------------------------------- */

/** 登録済み API キー・モデル一覧・選択中モデルを取得する */
export const getSettings = authed.settings.get.handler(async ({ context }) => {
  return await settingsController.getSettings(context.user.id);
});

/** モデルピッカー用に、各プロバイダーの最新モデル一覧を取得する */
export const getModels = authed.settings.getModels.handler(async () => {
  return await settingsController.getModels();
});

/** API キーを登録する（サーバー側で暗号化して保存） */
export const saveApiKey = authed.settings.saveApiKey.handler(
  async ({ input, context }) => {
    await settingsController.saveApiKey(input, context.user.id);
  },
);

/** API キーを削除する */
export const deleteApiKey = authed.settings.deleteApiKey.handler(
  async ({ input, context }) => {
    await settingsController.deleteApiKey(input, context.user.id);
  },
);

/** 選択中モデルを保存する */
export const saveModel = authed.settings.saveModel.handler(
  async ({ input, context }) => {
    await settingsController.saveModel(input, context.user.id);
  },
);

/* -------------------------------------------------------------------------- */
/* ルーター                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * アプリ全体のルーター
 * コントラクトの構造と一致していることが型で強制される
 */
export const router = os.router({
  chat: {
    new: createChat,
    updatePinned,
    getChatsByUserId,
    branch: {
      structure: branchStructure,
      sendMessage,
      merge: mergeBranch,
      new: createBranch,
      getMessages,
    },
  },
  settings: {
    get: getSettings,
    getModels,
    saveApiKey,
    deleteApiKey,
    saveModel,
  },
});
