import type { Branch, TreeNode } from "@/types";
import { ORPCError } from "@orpc/server";

/**
 * ブランチの親子関係を扱う純粋関数
 *
 * DB や oRPC のコンテキストに依存しないため、単体でテストしやすい形にしている。
 * ブランチの配列は `createdAt` 昇順（親が必ず子より先）であることを前提とする。
 */

/**
 * ブランチ配列から「親 ID → 子 ID の配列」のマップを構築する
 * ブランチ間の親子関係を効率的に探索するための前処理として使用する
 * @param branches - チャット内の全ブランチ配列
 * @returns 親ブランチ ID をキー、子ブランチ ID の配列を値とする Map
 */
const buildChildrenMap = (branches: Branch[]): Map<string, string[]> => {
  const childrenMap = new Map<string, string[]>();
  for (const branch of branches) {
    if (!branch.parentBranchId) continue;
    const children = childrenMap.get(branch.parentBranchId) ?? [];
    children.push(branch.id);
    childrenMap.set(branch.parentBranchId, children);
  }
  return childrenMap;
};

/**
 * BFS（幅優先探索）で指定ブランチ以下の全子孫ブランチ ID を収集する
 * マージ時に対象ブランチ配下のメッセージを一括で親ブランチに移動するために使用する
 * @param branchId - 探索の起点となるブランチ ID（自身も結果に含まれる）
 * @param branches - チャット内の全ブランチ配列
 * @returns 起点ブランチ + 全子孫ブランチの ID 配列
 */
export const collectBranchAndDescendantIds = (
  branchId: string,
  branches: Branch[],
): string[] => {
  const childrenMap = buildChildrenMap(branches);
  const collected: string[] = [];
  const queue: string[] = [branchId];

  // キューが空になるまで子ブランチを幅優先で辿る
  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) break;

    collected.push(currentId);
    queue.push(...(childrenMap.get(currentId) ?? []));
  }

  return collected;
};

/**
 * フラットなブランチ配列を UI 描画用のツリー構造（`TreeNode`）に変換する
 *
 * 変換の仕組み:
 * 1. parentBranchId が null のブランチをルートノードとして特定
 * 2. branchMap（ID → ノード）を使い、各ブランチを親ノードの children に追加
 * 3. 配列が createdAt 昇順であるため、親が必ず子より先に処理される
 *
 * @param branches - チャット内の全ブランチ配列（createdAt 昇順）
 * @returns ルートブランチを起点としたツリー構造
 * @throws ORPCError ルートブランチが見つからない場合
 */
export const buildBranchTree = (branches: Branch[]): TreeNode => {
  const rootBranch = branches.find((branch) => branch.parentBranchId === null);
  if (!rootBranch) {
    throw new ORPCError("NOT_FOUND", {
      message: "Parent branch not found",
    });
  }

  const toNode = (branch: Branch): TreeNode => ({
    name: branch.summary,
    attributes: { id: branch.id },
    children: [],
  });

  const rootNode = toNode(rootBranch);

  // ID → ノードのマップを構築し、子ノードの挿入先を O(1) で参照可能にする
  const branchMap = new Map<string, TreeNode>([[rootBranch.id, rootNode]]);

  for (const branch of branches) {
    if (branch.id === rootBranch.id) continue;

    const childNode = toNode(branch);
    // 親が見つからない（不整合なデータ）場合はツリーに載せない
    branchMap.get(branch.parentBranchId ?? "")?.children.push(childNode);
    branchMap.set(branch.id, childNode);
  }

  return rootNode;
};
