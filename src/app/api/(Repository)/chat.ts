import { db } from "@/lib/db";
import createBranch from "@/queries/create_branch.sql";
import createChat from "@/queries/create_chat.sql";
import createMessage from "@/queries/create_message.sql";
import deleteBranch from "@/queries/delete_branch.sql";
import getBranch from "@/queries/get_branch.sql";
import getMessage from "@/queries/get_message.sql";
import getMessageChain from "@/queries/get_message_chain.sql";
import listBranchesInChat from "@/queries/list_branches_in_chat.sql";
import listChatsByUser from "@/queries/list_chats_by_user.sql";
import listMessagesByBranch from "@/queries/list_messages_by_branch.sql";
import moveMessagesToBranch from "@/queries/move_messages_to_branch.sql";
import updateChatPinned from "@/queries/update_chat_pinned.sql";

export class ChatRepository {
  create = async (
    summary: string,
    userId: string,
    promptText: string,
    promptFile: string | null,
    response: string,
  ) => {
    // Chat → Branch → Message を1トランザクションで作成する
    return await db.begin(async (tx) => {
      // 1. Chat を作成
      const newChat = await createChat.run(tx, {
        summary,
        user_id: userId,
      });

      // 2. Branch を作成（最初のブランチは "main" とする）
      const newBranch = await createBranch.run(tx, {
        summary: "main",
        parent_branch_id: null,
        chat_id: newChat.id,
      });

      // 3. Message を作成
      const newMessage = await createMessage.run(tx, {
        prompt_text: promptText,
        prompt_file: promptFile,
        parent_id: null,
        response,
        branch_id: newBranch.id,
      });

      return {
        chat: newChat,
        branch: newBranch,
        message: newMessage,
      };
    });
  };

  getSpecificMessage = async (messageId: string) => {
    return await getMessage.run(db, { id: messageId });
  };

  createMessage = async (
    branchId: string,
    promptText: string,
    promptFile: string | null,
    response: string,
    parentId: string | null,
  ) => {
    return await createMessage.run(db, {
      prompt_text: promptText,
      prompt_file: promptFile,
      parent_id: parentId,
      response,
      branch_id: branchId,
    });
  };

  getSpecificBranch = async (branchId: string) => {
    return await getBranch.run(db, { id: branchId });
  };

  /**
   * 子孫ブランチ配下のメッセージを指定ブランチへ一括で付け替える
   */
  updateBranchInMessage = async (
    parentBranchId: string,
    branchIds: string[],
  ) => {
    await moveMessagesToBranch.run(db, {
      branch_id: parentBranchId,
      branch_ids: branchIds,
    });
  };

  createBranch = async (
    summary: string,
    parentBranchId: string,
    chatId: string,
  ) => {
    return await createBranch.run(db, {
      summary,
      parent_branch_id: parentBranchId,
      chat_id: chatId,
    });
  };

  getMessages = async (branchId: string) => {
    return await listMessagesByBranch.run(db, { branch_id: branchId });
  };

  updateChatIsPinned = async (chatId: string, isPinned: boolean) => {
    return await updateChatPinned.run(db, {
      chat_id: chatId,
      is_pinned: isPinned,
    });
  };

  getChatsByUserId = async (userId: string) => {
    return await listChatsByUser.run(db, { user_id: userId });
  };

  deleteBranch = async (branchId: string) => {
    await deleteBranch.run(db, { branch_id: branchId });
  };

  /**
   * 再帰 CTE でメッセージの parentId チェーンを一括取得する
   * N+1 回のクエリを 1 回に削減
   */
  getMessageChain = async (messageId: string) => {
    return await getMessageChain.run(db, { message_id: messageId });
  };

  /**
   * チャット内の全ブランチを一括取得する
   * ループ内での個別取得（N+1）を回避
   */
  getAllBranchesInChat = async (chatId: string) => {
    return await listBranchesInChat.run(db, { chat_id: chatId });
  };
}
