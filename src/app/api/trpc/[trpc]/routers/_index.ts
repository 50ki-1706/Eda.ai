import { authMiddleware } from "../middleware";
import { router } from "../trpc";

import { ProjectController } from "@/app/api/(Contoller)/project";
import { ProjectRepository } from "@/app/api/(Repository)/project";
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
import {
  deleteProjectSchema,
  instructionSchema,
} from "../../../(schema)/project";
import {
  branchStructureInputSchema,
  mergeBranchInputSchema,
  newBranchInputSchema,
} from "../../../(schema)/project/branch";
import {
  chatListInputSchema,
  getMessageInputSchema,
  newChatInputSchema as projectNewChatInputSchema,
  sendMessageInputSchema,
} from "../../../(schema)/project/chat";

export const procedure = authMiddleware;

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
      .input(generalSendMessageInputSchema)
      .mutation(async ({ input }) => {
        try {
          console.debug("SendMessage input:", input);
          return await chatController.sendMessage(input);
        } catch (error) {
          console.error("SendMessage error:", error);
          throw error;
        }
      }),
    merge: procedure
      .input(generalMergeBranchInputSchema)
      .mutation(async ({ input }) => {
        await chatController.mergeBranch(input.branchId);
      }),
    new: procedure
      .input(generalNewBranchInputSchema)
      .mutation(async ({ input }) => {
        return await chatController.createBranch(input);
      }),
    getMessages: procedure
      .input(generalGetMessageInputSchema)
      .query(async ({ input }) => {
        return await chatController.getMessages(input.branchId);
      }),
  }),
});

const projectController = new ProjectController();
const projectRepository = new ProjectRepository();
export const projectRouter = router({
  delete: procedure.input(deleteProjectSchema).mutation(async ({ input }) => {
    await projectRepository.deleteProject(input.projectId);
  }),

  list: procedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    return await projectRepository.getProjectList(userId);
  }),
  updateInstruction: procedure
    .input(instructionSchema)
    .mutation(async ({ input }) => {
      await projectRepository.updateInstruction(
        input.projectId,
        input.instruction,
      );
    }),
  chat: router({
    list: procedure.input(chatListInputSchema).query(async ({ input }) => {
      return await projectRepository.getChatList(input.projectId);
    }),
    new: procedure
      .input(projectNewChatInputSchema)
      .mutation(async ({ input }) => {
        return await projectController.createChat(input);
      }),
    branch: router({
      structure: procedure
        .input(branchStructureInputSchema)
        .query(async ({ input }) => {
          return await projectController.branchStructure(input);
        }),
      getMessage: procedure
        .input(getMessageInputSchema)
        .query(async ({ input }) => {
          return await projectRepository.getMessages(input.branchId);
        }),
      sendMessage: procedure
        .input(sendMessageInputSchema)
        .mutation(async ({ input }) => {
          return await projectController.sendMessage(input);
        }),
      new: procedure.input(newBranchInputSchema).mutation(async ({ input }) => {
        return await projectRepository.createBranch(
          input.summary,
          input.parentBranchId,
          input.chatId,
        );
      }),
      merge: procedure
        .input(mergeBranchInputSchema)
        .mutation(async ({ input }) => {
          await projectController.mergeBranch(input.branchId);
        }),
    }),
  }),
});

export const apiRoutes = router({
  project: projectRouter,
  chat: chatRouter,
});

export type ApiRoutes = typeof apiRoutes;
