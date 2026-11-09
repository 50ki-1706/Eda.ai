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

/** メッセージ作成に必要な値 */
export interface NewMessageParams {
  branchId: string;
  promptText: string;
  promptFile: string | null;
  response: string;
  /** 親メッセージ ID（ブランチ最初のメッセージなら null） */
  parentId: string | null;
}

/**
 * チャット・ブランチ・メッセージの永続化を担当するリポジトリ
 *
 * 引数は取り違えを防ぐため、位置引数ではなくオブジェクトで受け取る。
 * ビジネスロジックは持たず、クエリの実行とトランザクションの境界だけを扱う。
 */
export class ChatRepository {
  /**
   * 新規チャットを Chat → Branch → Message の順で 1 トランザクションで作成する
   * 最初のブランチは必ず `main`（親なし）になる
   */
  createChatWithFirstMessage = async (params: {
    summary: string;
    userId: string;
    message: Omit<NewMessageParams, "branchId" | "parentId">;
  }) => {
    return await db.begin(async (tx) => {
      const chat = await createChat.run(tx, {
        summary: params.summary,
        user_id: params.userId,
      });

      const branch = await createBranch.run(tx, {
        summary: "main",
        parent_branch_id: null,
        chat_id: chat.id,
      });

      const message = await createMessage.run(tx, {
        prompt_text: params.message.promptText,
        prompt_file: params.message.promptFile,
        parent_id: null,
        response: params.message.response,
        branch_id: branch.id,
      });

      return { chat, branch, message };
    });
  };

  createMessage = async (params: NewMessageParams) => {
    return await createMessage.run(db, {
      prompt_text: params.promptText,
      prompt_file: params.promptFile,
      parent_id: params.parentId,
      response: params.response,
      branch_id: params.branchId,
    });
  };

  getMessage = async (messageId: string) => {
    return await getMessage.run(db, { id: messageId });
  };

  getBranch = async (branchId: string) => {
    return await getBranch.run(db, { id: branchId });
  };

  createBranch = async (params: {
    summary: string;
    parentBranchId: string;
    chatId: string;
  }) => {
    return await createBranch.run(db, {
      summary: params.summary,
      parent_branch_id: params.parentBranchId,
      chat_id: params.chatId,
    });
  };

  deleteBranch = async (branchId: string) => {
    await deleteBranch.run(db, { branch_id: branchId });
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
  getBranchesInChat = async (chatId: string) => {
    return await listBranchesInChat.run(db, { chat_id: chatId });
  };

  /**
   * 指定ブランチ群のメッセージを別ブランチへ一括で付け替える（マージ時に使用）
   */
  moveMessagesToBranch = async (params: {
    targetBranchId: string;
    sourceBranchIds: string[];
  }) => {
    await moveMessagesToBranch.run(db, {
      branch_id: params.targetBranchId,
      branch_ids: params.sourceBranchIds,
    });
  };
}
