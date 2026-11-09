import { initTRPC } from "@trpc/server";
import { authMiddleware } from "../middleware";

import { ZodError } from "zod";

import { ChatController } from "../../../(Contoller)/chat";
import { SettingsController } from "../../../(Contoller)/settings";
import {
  branchStructureInputSchema as generalBranchStructureInputSchema,
  createChatInputSchema as generalCreateChatInputSchema,
  getMessageInputSchema as generalGetMessageInputSchema,
  mergeBranchInputSchema as generalMergeBranchInputSchema,
  newBranchInputSchema as generalNewBranchInputSchema,
  sendMessageInputSchema as generalSendMessageInputSchema,
  updateChatIsPinnedInputSchema,
} from "../../../(schema)/chat";
import {
  deleteApiKeyInputSchema,
  saveApiKeyInputSchema,
  saveModelInputSchema,
} from "../../../(schema)/settings";

const t = initTRPC.create({
  errorFormatter(opts) {
    const { shape, error } = opts;
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.code === "BAD_REQUEST" && error.cause instanceof ZodError
            ? error.cause.flatten()
            : null,
      },
    };
  },
});

export const router = t.router;
export const procedure = t.procedure.use(authMiddleware);

const chatController = new ChatController();
const settingsController = new SettingsController();
export const chatRouter = router({
  new: procedure
    .input(generalCreateChatInputSchema)
    .mutation(async ({ input, ctx }) => {
      return await chatController.create(input, ctx.user.id);
    }),
  updatePinned: procedure
    .input(updateChatIsPinnedInputSchema)
    .mutation(async ({ input }) => {
      return await chatController.updateChatIsPinned(input);
    }),
  getChatsByUserId: procedure.query(async ({ ctx }) => {
    return await chatController.getChatsByUserId(ctx.user.id);
  }),
  branch: router({
    structure: procedure
      .input(generalBranchStructureInputSchema)
      .query(async ({ input }) => {
        return await chatController.branchStructure(input);
      }),
    sendMessage: procedure
      .input(generalSendMessageInputSchema) // 変更
      .mutation(async ({ input, ctx }) => {
        return await chatController.sendMessage(input, ctx.user.id);
      }),
    merge: procedure
      .input(generalMergeBranchInputSchema) // 変更
      .mutation(async ({ input }) => {
        await chatController.mergeBranch(input.branchId);
      }),
    new: procedure
      .input(generalNewBranchInputSchema)
      .mutation(async ({ input }) => {
        // 変更
        return await chatController.createBranch(input);
      }),
    getMessages: procedure
      .input(generalGetMessageInputSchema) // 変更
      .query(async ({ input }) => {
        return await chatController.getMessages(input.branchId);
      }),
  }),
});

export const settingsRouter = router({
  /** 登録済み API キー・モデル一覧・選択中モデルを取得する */
  get: procedure.query(async ({ ctx }) => {
    return await settingsController.getSettings(ctx.user.id);
  }),
  /** モデルピッカー用に、各プロバイダーの最新モデル一覧を取得する */
  getModels: procedure.query(async () => {
    return await settingsController.getModels();
  }),
  /** API キーを登録する（サーバー側で暗号化して保存） */
  saveApiKey: procedure
    .input(saveApiKeyInputSchema)
    .mutation(async ({ input, ctx }) => {
      return await settingsController.saveApiKey(input, ctx.user.id);
    }),
  /** API キーを削除する */
  deleteApiKey: procedure
    .input(deleteApiKeyInputSchema)
    .mutation(async ({ input, ctx }) => {
      await settingsController.deleteApiKey(input, ctx.user.id);
    }),
  /** 選択中モデルを保存する */
  saveModel: procedure
    .input(saveModelInputSchema)
    .mutation(async ({ input, ctx }) => {
      return await settingsController.saveModel(input, ctx.user.id);
    }),
});

export const apiRoutes = router({
  chat: chatRouter,
  settings: settingsRouter,
});

export type ApiRoutes = typeof apiRoutes;
