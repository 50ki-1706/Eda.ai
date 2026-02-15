import type { RawNodeDatum } from "@/types/tree";
import type { Branch } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { Gemini } from "../(LLM)/gemini";
import { OpenRouter } from "../(LLM)/openrouter";
import { ChatRepository } from "../(Repository)/chat";
import type {
  BranchStructureInput,
  CreateChatInput,
  NewBranchInput,
  SendMessageInput,
  UpdateChatIsPinnedInput,
} from "../(schema)/chat";

const gemini = new Gemini();
const openRouter = new OpenRouter();
const chatRepository = new ChatRepository();

export class ChatController {
  create = async (input: CreateChatInput, userId: string) => {
    let resFromLLM: string;
    let summary: string;

    if (input.provider === "openrouter") {
      resFromLLM = await openRouter.generateContent(undefined, {
        text: input.promptText,
        file: input.promptFile,
      });
      summary = await openRouter.generateContent(undefined, {
        text: openRouter.generateSummaryPrompt(input.promptText, resFromLLM),
      });
    } else {
      resFromLLM = await gemini.generateContent(undefined, {
        text: input.promptText,
        file: input.promptFile,
      });
      summary = await gemini.generateContent(undefined, {
        text: gemini.generateSummaryPrompt(input.promptText, resFromLLM),
      });
    }

    const result = await chatRepository.create(
      summary,
      userId,
      input.promptText,
      input.promptFile?.data ?? null,
      resFromLLM,
    );

    return result;
  };

  sendMessage = async (input: SendMessageInput) => {
    const history = await chatRepository.getMessageChain(input.latestMessageId);
    let res: string;

    if (input.provider === "openrouter") {
      const formattedHistory = openRouter.formatHistoryForOpenRouter(history);
      res = await openRouter.generateContent(formattedHistory, {
        text: input.promptText,
        file: input.promptFile,
      });
    } else {
      const formattedHistory = gemini.formatHistoryForGemini(history);
      res = await gemini.generateContent(formattedHistory, {
        text: input.promptText,
        file: input.promptFile,
      });
    }

    const newMessage = await chatRepository.createMessage(
      input.branchId,
      input.promptText,
      input.promptFile?.data ?? null,
      res,
      input.latestMessageId,
    );

    return newMessage;
  };

  mergeBranch = async (branchId: string) => {
    const branch = await chatRepository.getSpecificBranch(branchId);
    if (!branch) throw new Error("Branch not found");

    const parentBranchId = branch.parentBranchId;
    if (!parentBranchId) throw new Error("Parent branch not found");

    // 全ブランチを一括取得し、メモリ上で子孫を探索（N+1 回避）
    const allBranches = await chatRepository.getAllBranchesInChat(
      branch.chatId,
    );
    const descendantBranchIds = this.collectDescendantBranchIds(
      branchId,
      allBranches,
    );

    await chatRepository.updateBranchInMessage(
      parentBranchId,
      descendantBranchIds,
    );

    await chatRepository.deleteBranch(branchId);
  };

  createBranch = async (input: NewBranchInput) => {
    const newBranch = await chatRepository.createBranch(
      input.summary,
      input.parentBranchId,
      input.chatId,
    );
    const message = await chatRepository.getSpecificMessage(input.messageId);
    if (!message)
      throw new TRPCError({ code: "NOT_FOUND", message: "Message not found" });

    if (message.parentId) {
      await chatRepository.createMessage(
        newBranch.id,
        input.promptText,
        null,
        input.response,
        message.parentId,
      );
    } else {
      await chatRepository.createMessage(
        newBranch.id,
        input.promptText,
        null,
        input.response,
        null,
      );
    }

    return newBranch;
  };

  getMessages = async (branchId: string) => {
    return await chatRepository.getMessages(branchId);
  };

  private collectDescendantBranchIds = (
    branchId: string,
    allBranches: Branch[],
  ): string[] => {
    // 親子関係をマップに構築
    const childrenMap = new Map<string, string[]>();
    for (const branch of allBranches) {
      if (branch.parentBranchId) {
        const children = childrenMap.get(branch.parentBranchId) ?? [];
        children.push(branch.id);
        childrenMap.set(branch.parentBranchId, children);
      }
    }

    // BFS で子孫ブランチ ID を収集
    const descendantIds: string[] = [branchId];
    const queue: string[] = [branchId];

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (!currentId) break;

      const children = childrenMap.get(currentId) ?? [];
      for (const childId of children) {
        descendantIds.push(childId);
        queue.push(childId);
      }
    }

    return descendantIds;
  };

  updateChatIsPinned = async (input: UpdateChatIsPinnedInput) => {
    const { chatId, isPinned } = input;
    return await chatRepository.updateChatIsPinned(chatId, isPinned);
  };

  getChatsByUserId = async (userId: string) => {
    return await chatRepository.getChatsByUserId(userId);
  };

  branchStructure = async (input: BranchStructureInput) => {
    // 全ブランチを一括取得（N+1 回避）
    const allBranches = await chatRepository.getAllBranchesInChat(input.chatId);
    const parentBranch = allBranches.find((b) => b.parentBranchId === null);
    if (!parentBranch) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Parent branch not found",
      });
    }

    const branchStructure: RawNodeDatum = {
      name: parentBranch.summary,
      attributes: { id: parentBranch.id },
      children: [],
    };

    const branchMap = new Map<string, RawNodeDatum>();
    branchMap.set(parentBranch.id, branchStructure);

    // createdAt 昇順で取得しているため、親が必ず先に処理される
    for (const branch of allBranches) {
      if (branch.id === parentBranch.id) continue;

      const childNode: RawNodeDatum = {
        name: branch.summary,
        attributes: { id: branch.id },
        children: [],
      };

      branchMap.get(branch.parentBranchId ?? "")?.children?.push(childNode);
      branchMap.set(branch.id, childNode);
    }

    return branchStructure;
  };
}
