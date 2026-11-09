import type { Branch, Chat, Message } from "@/types";
import { ORPCError } from "@orpc/server";
import { ChatRepository } from "../(Repository)/chat";
import type {
  BranchStructureInput,
  CreateChatInput,
  NewBranchInput,
  SendMessageInput,
  UpdateChatIsPinnedInput,
} from "../(schema)/chat";
import { buildBranchTree, collectBranchAndDescendantIds } from "./branchTree";
import { SettingsController } from "./settings";

const chatRepository = new ChatRepository();
const settingsController = new SettingsController();

/** チャットのストリーミングイベント */
export type ChatStreamEvent =
  | { type: "delta"; text: string }
  | { type: "done"; chat: Chat; branch: Branch; message: Message };

/** ブランチへのメッセージ送信のストリーミングイベント */
export type MessageStreamEvent =
  | { type: "delta"; text: string }
  | { type: "done"; message: Message };

export class ChatController {
  /**
   * 新規チャットをストリーミングで作成する
   * LLM のレスポンスを差分（delta）として逐次返し、完了後に要約を生成して
   * Chat・Branch・Message を一括で永続化し、最後に done イベントで返す
   * @param input - ユーザーのプロンプト情報（テキスト・添付ファイル・モデル ID）
   * @param userId - チャットを作成するユーザーの ID
   * @param signal - クライアント切断時に LLM 呼び出しを中断するための AbortSignal
   */
  createStream = async function* (
    input: CreateChatInput,
    userId: string,
    signal?: AbortSignal,
  ): AsyncGenerator<ChatStreamEvent, void, unknown> {
    // ユーザーが登録した API キーと選択中モデルからプロバイダーを組み立てる
    const { llm } = await settingsController.resolveLLMProvider(
      userId,
      input.modelId,
    );

    // 会話履歴なしで LLM にリクエストし、差分を逐次返しつつ全文を連結する
    let fullText = "";
    for await (const delta of llm.streamContent(
      undefined,
      { text: input.promptText, file: input.promptFile },
      signal,
    )) {
      fullText += delta;
      yield { type: "delta", text: delta };
    }

    // クライアントが切断された場合は、途中までのテキストを破棄して保存しない
    if (signal?.aborted) return;

    // プロンプトとレスポンスからチャットのタイトル（要約）を自動生成
    const summary = await llm.generateSummary(input.promptText, fullText);

    // 要約生成中に切断された場合も保存しない
    if (signal?.aborted) return;

    const { chat, branch, message } =
      await chatRepository.createChatWithFirstMessage({
        summary,
        userId,
        message: {
          promptText: input.promptText,
          promptFile: input.promptFile?.data ?? null,
          response: fullText,
        },
      });

    yield {
      type: "done",
      chat: chat as Chat,
      branch: branch as Branch,
      message: message as Message,
    };
  };

  /**
   * 既存チャットにメッセージをストリーミングで送信する
   * 過去の会話履歴を LLM に渡してコンテキストを維持したレスポンスを逐次返し、
   * 完了後に Message を永続化して done イベントで返す
   * @param input - メッセージ情報（プロンプト・ブランチ ID・直前メッセージ ID・モデル ID）
   * @param userId - 送信するユーザーの ID（API キーの解決に使用）
   * @param signal - クライアント切断時に LLM 呼び出しを中断するための AbortSignal
   */
  sendMessageStream = async function* (
    input: SendMessageInput,
    userId: string,
    signal?: AbortSignal,
  ): AsyncGenerator<MessageStreamEvent, void, unknown> {
    const { llm } = await settingsController.resolveLLMProvider(
      userId,
      input.modelId,
    );

    // 直前メッセージから親チェーンを辿って会話履歴を取得
    const history = await chatRepository.getMessageChain(input.latestMessageId);

    // 会話履歴付きで LLM にリクエストし、差分を逐次返しつつ全文を連結する
    let fullText = "";
    for await (const delta of llm.streamContent(
      history,
      { text: input.promptText, file: input.promptFile },
      signal,
    )) {
      fullText += delta;
      yield { type: "delta", text: delta };
    }

    // クライアントが切断された場合は、途中までのテキストを破棄して保存しない
    if (signal?.aborted) return;

    const message = await chatRepository.createMessage({
      branchId: input.branchId,
      promptText: input.promptText,
      promptFile: input.promptFile?.data ?? null,
      response: fullText,
      parentId: input.latestMessageId,
    });

    yield { type: "done", message: message as Message };
  };

  /**
   * ブランチを親ブランチにマージする
   * 対象ブランチとその子孫のメッセージを親ブランチに移動し、ブランチ自体を削除する
   * @param branchId - マージ対象のブランチ ID
   */
  mergeBranch = async (branchId: string) => {
    const branch = await chatRepository.getBranch(branchId);
    if (!branch) {
      throw new ORPCError("NOT_FOUND", { message: "Branch not found" });
    }

    const parentBranchId = branch.parentBranchId;
    if (!parentBranchId) {
      throw new ORPCError("NOT_FOUND", { message: "Parent branch not found" });
    }

    // 全ブランチを一括取得し、メモリ上で子孫を探索（N+1 回避）
    const branches = await chatRepository.getBranchesInChat(branch.chatId);
    const sourceBranchIds = collectBranchAndDescendantIds(branchId, branches);

    // 子孫ブランチ配下のメッセージを全て親ブランチに付け替えてから、対象ブランチを削除する
    await chatRepository.moveMessagesToBranch({
      targetBranchId: parentBranchId,
      sourceBranchIds,
    });
    await chatRepository.deleteBranch(branchId);
  };

  /**
   * 既存メッセージの分岐点から新しいブランチを作成する
   * 指定されたメッセージの親を起点として、別の会話の流れを開始する
   * @param input - ブランチ情報（要約・親ブランチ ID・チャット ID・分岐元メッセージ ID・プロンプト・レスポンス）
   * @returns 作成された Branch
   */
  createBranch = async (input: NewBranchInput) => {
    // 分岐元メッセージを先に取得し、存在しない場合はブランチを作らない
    const sourceMessage = await chatRepository.getMessage(input.messageId);
    if (!sourceMessage) {
      throw new ORPCError("NOT_FOUND", { message: "Message not found" });
    }

    const newBranch = await chatRepository.createBranch({
      summary: input.summary,
      parentBranchId: input.parentBranchId,
      chatId: input.chatId,
    });

    // 分岐元メッセージの親を、新ブランチの最初のメッセージの親として引き継ぐ
    await chatRepository.createMessage({
      branchId: newBranch.id,
      promptText: input.promptText,
      promptFile: null,
      response: input.response,
      parentId: sourceMessage.parentId,
    });

    return newBranch;
  };

  /**
   * 指定ブランチ内のメッセージ一覧を時系列順で取得する
   * @param branchId - 対象のブランチ ID
   */
  getMessages = async (branchId: string) => {
    return await chatRepository.getMessages(branchId);
  };

  /**
   * チャットのピン留め状態を切り替える
   * @param input - チャット ID とピン留めの真偽値
   */
  updateChatIsPinned = async (input: UpdateChatIsPinnedInput) => {
    return await chatRepository.updateChatIsPinned(
      input.chatId,
      input.isPinned,
    );
  };

  /**
   * ユーザーが所有するチャット一覧を取得する（ピン留め優先）
   * @param userId - 対象ユーザーの ID
   */
  getChatsByUserId = async (userId: string) => {
    return await chatRepository.getChatsByUserId(userId);
  };

  /**
   * チャット内のブランチ構造をツリー形式で取得する
   * UI のツリービュー描画用に `TreeNode` 形式へ変換して返す
   * @param input - チャット ID
   * @returns ルートブランチを起点としたツリー構造
   */
  branchStructure = async (input: BranchStructureInput) => {
    const branches = await chatRepository.getBranchesInChat(input.chatId);
    return buildBranchTree(branches);
  };
}
