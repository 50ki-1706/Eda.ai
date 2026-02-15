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
  /**
   * 新規チャットを作成する
   * LLM にプロンプトを送信してレスポンスと要約を生成し、Chat・Branch・Message を一括で永続化する
   * @param input - ユーザーのプロンプト情報（テキスト・添付ファイル・プロバイダー）
   * @param userId - チャットを作成するユーザーの ID
   * @returns 作成された Chat, Branch, Message のオブジェクト
   */
  create = async (input: CreateChatInput, userId: string) => {
    const llm = getLLMProvider(input.provider);

    // ユーザーのプロンプトに対する LLM のレスポンスを取得
    const resFromLLM = await llm.generateContent(undefined, {
      text: input.promptText,
      file: input.promptFile,
    });

    // プロンプトとレスポンスからチャットのタイトル（要約）を自動生成
    const summary = await llm.generateSummary(input.promptText, resFromLLM);

    return await chatRepository.create(
      summary,
      userId,
      input.promptText,
      input.promptFile?.data ?? null,
      resFromLLM,
    );
  };

  /**
   * 既存チャットにメッセージを送信する
   * 過去の会話履歴を LLM に渡してコンテキストを維持したレスポンスを生成する
   * @param input - メッセージ情報（プロンプト・ブランチ ID・直前メッセージ ID・プロバイダー）
   * @returns 作成されたユーザーメッセージと AI レスポンスを含む Message
   */
  sendMessage = async (input: SendMessageInput) => {
    const llm = getLLMProvider(input.provider);

    // 直前メッセージから親チェーンを辿って会話履歴を取得
    const history = await chatRepository.getMessageChain(input.latestMessageId);

    // 会話履歴付きで LLM にリクエストし、文脈を踏まえたレスポンスを取得
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

  /**
   * ブランチを親ブランチにマージする
   * 対象ブランチとその子孫のメッセージを親ブランチに移動し、ブランチ自体を削除する
   * @param branchId - マージ対象のブランチ ID
   */
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

    // 子孫ブランチ配下のメッセージを全て親ブランチに付け替え
    await chatRepository.updateBranchInMessage(
      parentBranchId,
      descendantBranchIds,
    );

    await chatRepository.deleteBranch(branchId);
  };

  /**
   * 既存メッセージの分岐点から新しいブランチを作成する
   * 指定されたメッセージの親を起点として、別の会話の流れを開始する
   * @param input - ブランチ情報（要約・親ブランチ ID・チャット ID・分岐元メッセージ ID・プロンプト・レスポンス）
   * @returns 作成された Branch
   */
  createBranch = async (input: NewBranchInput) => {
    const newBranch = await chatRepository.createBranch(
      input.summary,
      input.parentBranchId,
      input.chatId,
    );

    // 分岐元メッセージを取得し、その親を新ブランチの最初のメッセージの親として設定
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
    const { chatId, isPinned } = input;
    return await chatRepository.updateChatIsPinned(chatId, isPinned);
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
   * UI のツリービュー描画用に RawNodeDatum 形式へ変換して返す
   * @param input - チャット ID
   * @returns ルートブランチを起点としたツリー構造
   */
  branchStructure = async (input: BranchStructureInput) => {
    const allBranches = await chatRepository.getAllBranchesInChat(input.chatId);
    return buildBranchTree(allBranches);
  };
}

/**
 * ブランチ配列から「親 ID → 子 ID の配列」のマップを構築する
 * ブランチ間の親子関係を効率的に探索するための前処理として使用する
 * @param allBranches - チャット内の全ブランチ配列
 * @returns 親ブランチ ID をキー、子ブランチ ID の配列を値とする Map
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
 * BFS（幅優先探索）で指定ブランチ以下の全子孫ブランチ ID を収集する
 * マージ時に対象ブランチ配下のメッセージを一括で親ブランチに移動するために使用する
 * @param branchId - 探索の起点となるブランチ ID（自身も結果に含まれる）
 * @param allBranches - チャット内の全ブランチ配列
 * @returns 起点ブランチ + 全子孫ブランチの ID 配列
 */
const collectDescendantBranchIds = (
  branchId: string,
  allBranches: Branch[],
): string[] => {
  const childrenMap = buildChildrenMap(allBranches);

  // 起点ブランチ自身も含めて収集を開始
  const descendantIds: string[] = [branchId];
  const queue: string[] = [branchId];

  // キューが空になるまで子ブランチを幅優先で辿る
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
 * フラットなブランチ配列を UI 描画用のツリー構造（RawNodeDatum）に変換する
 *
 * 変換の仕組み:
 * 1. parentBranchId が null のブランチをルートノードとして特定
 * 2. branchMap（ID → ノード）を使い、各ブランチを親ノードの children に追加
 * 3. allBranches が createdAt 昇順であるため、親が必ず子より先に処理される
 *
 * @param allBranches - チャット内の全ブランチ配列（createdAt 昇順）
 * @returns ルートブランチを起点としたツリー構造
 * @throws TRPCError ルートブランチが見つからない場合
 */
const buildBranchTree = (allBranches: Branch[]): RawNodeDatum => {
  // ルートブランチ（parentBranchId が null）を特定
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

  // ID → ノードのマップを構築し、子ノードの挿入先を O(1) で参照可能にする
  const branchMap = new Map<string, RawNodeDatum>();
  branchMap.set(parentBranch.id, rootNode);

  for (const branch of allBranches) {
    if (branch.id === parentBranch.id) continue;

    const childNode: RawNodeDatum = {
      name: branch.summary,
      attributes: { id: branch.id },
      children: [],
    };

    // 親ノードの children に追加し、自身もマップに登録
    branchMap.get(branch.parentBranchId ?? "")?.children?.push(childNode);
    branchMap.set(branch.id, childNode);
  }

  return rootNode;
};
