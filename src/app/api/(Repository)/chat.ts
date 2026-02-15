import { prisma } from "@/lib/prisma";
import type { Message } from "@prisma/client";

export class ChatRepository {
  create = async (
    summary: string,
    userId: string,
    promptText: string,
    promptFile: string | null,
    response: string,
  ) => {
    return await prisma.$transaction(async (tx) => {
      // 1. Chatを作成
      const newChat = await tx.chat.create({
        data: {
          summary,
          userId,
        },
      });

      // 2. Branchを作成（最初のブランチは "main" とする）
      const newBranch = await tx.branch.create({
        data: {
          summary: "main",
          parentBranchId: null,
          chatId: newChat.id,
        },
      });

      // 3. Messageを作成
      const newMessage = await tx.message.create({
        data: {
          promptText,
          promptFile,
          parentId: null,
          response,
          branchId: newBranch.id,
        },
      });

      return {
        chat: newChat,
        branch: newBranch,
        message: newMessage,
      };
    });
  };

  getSpecificMessage = async (messageId: string) => {
    return await prisma.message.findUnique({
      where: { id: messageId },
    });
  };

  createMessage = async (
    branchId: string,
    promptText: string,
    promptFile: string | null,
    response: string,
    parentId: string | null,
  ) => {
    return await prisma.message.create({
      data: {
        promptText,
        promptFile,
        parentId,
        response,
        branchId,
      },
    });
  };

  getSpecificBranch = async (branchId: string) => {
    return await prisma.branch.findUnique({
      where: { id: branchId },
    });
  };

  getDescendantBranches = async (branchId: string) => {
    return await prisma.branch.findUnique({
      where: { id: branchId },
      include: { childBranches: true },
    });
  };

  updateBranchInMessage = async (
    parentBranchId: string,
    branchIds: string[],
  ) => {
    return await prisma.message.updateMany({
      where: { branchId: { in: branchIds } },
      data: { branchId: parentBranchId },
    });
  };

  createBranch = async (
    summary: string,
    parentBranchId: string,
    chatId: string,
  ) => {
    return await prisma.branch.create({
      data: {
        summary,
        parentBranchId,
        chatId,
      },
    });
  };

  getMessages = async (branchId: string) => {
    return await prisma.message.findMany({
      where: { branchId },
      orderBy: { createdAt: "asc" },
    });
  };

  updateChatIsPinned = async (chatId: string, isPinned: boolean) => {
    return await prisma.chat.update({
      where: { id: chatId },
      data: { isPinned },
    });
  };

  getChatsByUserId = async (userId: string) => {
    return await prisma.chat.findMany({
      where: { userId },
      // ピン留めされているチャットを上位に表示する
      orderBy: { isPinned: "desc" },
    });
  };

  getParentBranchInChat = async (chatId: string) => {
    const branches = await prisma.branch.findMany({
      where: { chatId },
      orderBy: { createdAt: "asc" },
      include: { childBranches: true },
    });
    const parentBranch = branches[0];

    return parentBranch;
  };
  deleteBranch = async (branchId: string) => {
    return await prisma.branch.delete({
      where: { id: branchId },
    });
  };

  /**
   * 再帰 CTE でメッセージの parentId チェーンを一括取得する
   * N+1 回のクエリを 1 回に削減
   */
  getMessageChain = async (messageId: string): Promise<Message[]> => {
    return await prisma.$queryRaw<Message[]>`
      WITH RECURSIVE message_chain AS (
        SELECT * FROM "message" WHERE id = ${messageId}
        UNION ALL
        SELECT m.* FROM "message" m
        INNER JOIN message_chain mc ON m.id = mc."parentId"
      )
      SELECT * FROM message_chain
      ORDER BY "createdAt" ASC
    `;
  };

  /**
   * チャット内の全ブランチを一括取得する
   * ループ内での個別取得（N+1）を回避
   */
  getAllBranchesInChat = async (chatId: string) => {
    return await prisma.branch.findMany({
      where: { chatId },
      orderBy: { createdAt: "asc" },
    });
  };
}
