import { initTRPC } from "@trpc/server";
import { authMiddleware } from "../middleware";

import { ZodError } from "zod";

import { ChatController } from "../../../(Contoller)/chat";
import {
  branchStructureInputSchema as generalBranchStructureInputSchema,
  createChatInputSchema as generalCreateChatInputSchema,
  getMessageInputSchema as generalGetMessageInputSchema,
  mergeBranchInputSchema as generalMergeBranchInputSchema,
  newBranchInputSchema as generalNewBranchInputSchema,
  sendMessageInputSchema as generalSendMessageInputSchema,
  updateChatIsPinnedInputSchema,
} from "../../../(schema)/chat";

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
      .mutation(async ({ input }) => {
        return await chatController.sendMessage(input);
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

export const apiRoutes = router({
  chat: chatRouter,
});

export type ApiRoutes = typeof apiRoutes;
