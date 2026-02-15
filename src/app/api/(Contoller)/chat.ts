import type { RawNodeDatum } from "@/types/tree";
import type { Branch } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { getLLMProvider } from "../(LLM)/provider";
import { ChatRepository } from "../(Repository)/chat";
import type {
  BranchStructureInput,
  CreateChatInput,
  NewBranchInput,
  SendMessageInput,
  UpdateChatIsPinnedInput,
} from "../(schema)/chat";

const chatRepository = new ChatRepository();

export class ChatController {
  create = async (input: CreateChatInput, userId: string) => {
    const llm = getLLMProvider(input.provider);

    const resFromLLM = await llm.generateContent(undefined, {
      text: input.promptText,
      file: input.promptFile,
    });

    const summary = await llm.generateSummary(input.promptText, resFromLLM);

    return await chatRepository.create(
      summary,
      userId,
      input.promptText,
      input.promptFile?.data ?? null,
      resFromLLM,
    );
  };

  sendMessage = async (input: SendMessageInput) => {
    const llm = getLLMProvider(input.provider);
    const history = await chatRepository.getMessageChain(input.latestMessageId);

    const res = await llm.generateContent(history, {
      text: input.promptText,
      file: input.promptFile,
    });

    return await chatRepository.createMessage(
      input.branchId,
      input.promptText,
      input.promptFile?.data ?? null,
      res,
      input.latestMessageId,
    );
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
    const descendantBranchIds = collectDescendantBranchIds(
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

    await chatRepository.createMessage(
      newBranch.id,
      input.promptText,
      null,
      input.response,
      message.parentId,
    );

    return newBranch;
  };

  getMessages = async (branchId: string) => {
    return await chatRepository.getMessages(branchId);
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
    return buildBranchTree(allBranches);
  };
}

/**
 * ブランチ配列から親子関係マップを構築する
 */
const buildChildrenMap = (allBranches: Branch[]): Map<string, string[]> => {
  const childrenMap = new Map<string, string[]>();
  for (const branch of allBranches) {
    if (branch.parentBranchId) {
      const children = childrenMap.get(branch.parentBranchId) ?? [];
      children.push(branch.id);
      childrenMap.set(branch.parentBranchId, children);
    }
  }
  return childrenMap;
};

/**
 * BFS で指定ブランチ以下の全子孫ブランチ ID を収集する
 */
const collectDescendantBranchIds = (
  branchId: string,
  allBranches: Branch[],
): string[] => {
  const childrenMap = buildChildrenMap(allBranches);

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

/**
 * フラットなブランチ配列をツリー構造（RawNodeDatum）に変換する
 * allBranches は createdAt 昇順であることを前提とする
 */
const buildBranchTree = (allBranches: Branch[]): RawNodeDatum => {
  const parentBranch = allBranches.find((b) => b.parentBranchId === null);
  if (!parentBranch) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Parent branch not found",
    });
  }

  const rootNode: RawNodeDatum = {
    name: parentBranch.summary,
    attributes: { id: parentBranch.id },
    children: [],
  };

  const branchMap = new Map<string, RawNodeDatum>();
  branchMap.set(parentBranch.id, rootNode);

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

  return rootNode;
};
