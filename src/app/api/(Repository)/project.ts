import { prisma } from "@/lib/prisma";

export class ProjectRepository {
  getProjectList = async (userId: string) => {
    return await prisma.project.findMany({
      where: { userId },
    });
  };

  updateInstruction = async (projectId: string, instruction: string) => {
    await prisma.project.update({
      where: { id: projectId },
      data: { instruction },
    });
  };

  getChatList = async (projectId: string) => {
    return await prisma.chatInProject.findMany({
      where: { projectId },
      include: { branches: true },
    });
  };

  //ユーザーがメッセージ（promptText, promptFile）を入力したら、自動でチャットとmainブランチを作成するロジックが必要。
  createChat = async (
    summary: string,
    projectId: string,
    promptText: string,
    promptFile: string | null,
    response: string,
  ) => {
    return await prisma.$transaction(async (tx) => {
      // ChatInProjectを作成
      const newChat = await tx.chatInProject.create({
        data: {
          summary,
          projectId,
        },
      });

      // BranchInProjectを作成
      const newBranch = await tx.branchInProject.create({
        data: {
          summary: summary,
          parentBranchId: null,
          chatId: newChat.id,
        },
      });

      // MessageInProjectを作成
      const newMessage = await tx.messageInProject.create({
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

  getMessages = async (branchId: string) => {
    return await prisma.messageInProject.findMany({
      where: { branchId },
      orderBy: { createdAt: "asc" }, // 作成日時で昇順にソート
    });
  };

  createMessage = async (
    branchId: string,
    promptText: string,
    promptFile: string | null,
    response: string,
    parentId: string,
  ) => {
    return await prisma.messageInProject.create({
      data: {
        promptText,
        promptFile,
        parentId,
        response,
        branchId,
      },
    });
  };

  getSpecificMessage = async (messageId: string) => {
    const message = await prisma.messageInProject.findUnique({
      where: { id: messageId },
    });

    return message;
  };

  createBranch = async (
    summary: string,
    parentBranchId: string,
    chatId: string,
  ) => {
    return await prisma.branchInProject.create({
      data: {
        summary,
        parentBranchId,
        chatId,
      },
    });
  };

  getSpecificBranch = async (id: string) => {
    return await prisma.branchInProject.findUnique({
      where: { id },
    });
  };

  getDescendantBranches = async (baseBranchId: string) => {
    return prisma.branchInProject.findUnique({
      where: { id: baseBranchId },
      include: { childBranches: true },
    });
  };

  //chat内で一番古いブランチを取得する
  getParentBranchInChat = async (chatId: string) => {
    const branches = await prisma.branchInProject.findMany({
      where: { chatId },
      orderBy: { createdAt: "asc" },
      include: { childBranches: true },
    });
    const parentBranch = branches[0];

    return parentBranch;
  };

  //特定のbranch（branchIdsは紐付いている全てのブランチ）を親ブランチにマージする
  updateBranchInMessage = async (newBranchId: string, branchIds: string[]) => {
    return await prisma.messageInProject.updateMany({
      where: {
        branchId: {
          in: branchIds,
        },
      },
      data: {
        branchId: newBranchId,
      },
    });
  };

  deleteProject = async (id: string) => {
    return await prisma.project.delete({
      where: { id },
    });
  };
}
