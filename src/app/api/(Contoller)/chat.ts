import type { RawNodeDatum } from "@/types/tree";
import type { Message } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { Gemini } from "../(LLM)/gemini";
import { ChatRepository } from "../(Repository)/chat";
import type {
  BranchStructureInput,
  CreateChatInput,
  NewBranchInput,
  SendMessageInput,
  UpdateChatIsPinnedInput,
} from "../(schema)/chat";

const gemini = new Gemini();
const chatRepository = new ChatRepository();

export class ChatController {
  create = async (input: CreateChatInput, userId: string) => {
    const [summary, resFromLLM] = await Promise.all([
      gemini.generateContent(undefined, {
        text: gemini.generateSummaryPrompt(input.promptText),
      }),
      gemini.generateContent(undefined, {
        text: input.promptText,
        file: input.promptFile,
      }),
    ]);

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
    const history = await this.getMessageHistory(input.latestMessageId);
    const formattedHistory = gemini.formatHistoryForGemini(history);

    const res = await gemini.generateContent(formattedHistory, {
      text: input.promptText,
      file: input.promptFile,
    });

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

    const descendantBranchIds = await this.getDescendantBranches(branchId);

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

  private getMessageHistory = async (messageId: string) => {
    const messageHistory: Message[] = [];
    let currentMessageId: string | null = messageId;

    while (currentMessageId) {
      const message = await chatRepository.getSpecificMessage(currentMessageId);

      if (!message) {
        break;
      }

      messageHistory.unshift(message);

      currentMessageId = message.parentId;
    }

    return messageHistory;
  };

  //幅優先探索でbranchIdの子孫ブランチを取得する
  private getDescendantBranches = async (branchId: string) => {
    const descendantBranchIds: string[] = [branchId];
    const queue: string[] = [branchId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentId = queue.shift();

      if (!currentId) break;

      const currentBranch =
        await chatRepository.getDescendantBranches(currentId);
      if (!currentBranch) break;

      for (const child of currentBranch.childBranches) {
        if (!visited.has(child.id)) {
          visited.add(child.id);
          descendantBranchIds.push(child.id);
          queue.push(child.id);
        }
      }
    }
    return descendantBranchIds;
  };

  updateChatIsPinned = async (input: UpdateChatIsPinnedInput) => {
    const { chatId, isPinned } = input;
    return await chatRepository.updateChatIsPinned(chatId, isPinned);
  };

  getChatsByUserId = async (userId: string) => {
    return await chatRepository.getChatsByUserId(userId);
  };

  branchStructure = async (input: BranchStructureInput) => {
    const parentBranch = await chatRepository.getParentBranchInChat(
      input.chatId,
    );
    if (!parentBranch) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Parent branch not found",
      });
    }

    const branchStructure: RawNodeDatum = {
      name: "main",
      attributes: { id: parentBranch.id },
      children: [],
    };

    const branchMap = new Map<string, RawNodeDatum>();
    const queue: string[] = [parentBranch.id];
    const visited = new Set<string>();

    visited.add(parentBranch.id);
    branchMap.set(parentBranch.id, branchStructure);

    while (queue.length > 0) {
      const currentBranchId = queue.shift();

      if (!currentBranchId) break;

      const branch =
        await chatRepository.getDescendantBranches(currentBranchId);
      if (!branch) break;

      for (const child of branch.childBranches) {
        if (!visited.has(child.id)) {
          visited.add(child.id);
          queue.push(child.id);
          const childNode: RawNodeDatum = {
            name: child.summary,
            attributes: { id: child.id },
            children: [],
          };

          branchMap.get(child.parentBranchId ?? "")?.children?.push(childNode);
          branchMap.set(child.id, childNode);
        }
      }
    }

    return branchStructure;
  };
}
