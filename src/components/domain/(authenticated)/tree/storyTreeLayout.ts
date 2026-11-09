/**
 * ストーリーツリーの描画位置を計算するモジュール
 *
 * デザインコンセプト:
 * 「物語の分岐」を可視化する、Deloitte のストーリー到達ツリーを参考にした独自レイアウト。
 * 深さ（=物語の進行）を横軸に、兄弟ノードを縦方向に重ならないよう配置する。
 *
 * アルゴリズム:
 * 1. 葉ノードに縦方向の位置を順番に割り当てる（左から読むと物語の選択肢の並びになる）
 * 2. 親ノードは子ノード位置の中央に置く（物語の幹が分岐点で束ねられるイメージ）
 */

import type { TreeNode } from "@/types";

/** ノードの描画サイズと余白 */
export const STORY_NODE_WIDTH = 200;
export const STORY_NODE_HEIGHT = 50;
/** 深さ方向（横）の間隔 */
export const STORY_LEVEL_GAP = 100;
/** 兄弟方向（縦）の最小間隔 */
export const STORY_SIBLING_GAP = 60;

export interface LayoutNode {
  /** ブランチID（属性の id） */
  id: string;
  /** 表示ラベル */
  name: string;
  /** 深さ（ルート = 0）。物語の到達レベルを表す */
  depth: number;
  /** 横方向の中心座標 */
  x: number;
  /** 縦方向の中心座標 */
  y: number;
  /** 子ノード */
  children: LayoutNode[];
  /** 葉（物語の最新到達点）かどうか */
  isLeaf: boolean;
}

export interface StoryTreeLayout {
  root: LayoutNode;
  /** 描画対象の全ノード（ルート含む、深さ優先順） */
  nodes: LayoutNode[];
  /** エッジ（親→子）のリスト */
  edges: { parent: LayoutNode; child: LayoutNode }[];
  /** ツリー全体の外接矩形 */
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

/** ノード間の縦方向間隔 */
const VERTICAL_STEP = STORY_NODE_HEIGHT + STORY_SIBLING_GAP;
/** 深さ間の横方向間隔 */
const HORIZONTAL_STEP = STORY_NODE_WIDTH + STORY_LEVEL_GAP;

/**
 * ツリーノード（`TreeNode`）を描画用の LayoutNode ツリーへ変換し、座標を割り当てる
 */
export const layoutStoryTree = (data: TreeNode): StoryTreeLayout => {
  const nodes: LayoutNode[] = [];
  const edges: { parent: LayoutNode; child: LayoutNode }[] = [];

  // 葉ノードに割り当てる次の縦座標（インデックスカウンタ）
  let nextLeafY = 0;

  /**
   * 再帰的にノードを構築し、座標を決定する
   * 戻り値はこの部分木が占める縦方向の幅の中心
   */
  const build = (
    node: TreeNode,
    depth: number,
  ): { node: LayoutNode; centerY: number; height: number } => {
    const children = (node.children ?? []).map((child) =>
      build(child, depth + 1),
    );

    const isLeaf = children.length === 0;

    let centerY: number;
    let subtreeHeight: number;
    if (isLeaf) {
      // 葉は順番に縦に並べる
      centerY = nextLeafY * VERTICAL_STEP;
      subtreeHeight = VERTICAL_STEP;
      nextLeafY += 1;
    } else {
      // 親は子の中心位置の平均に置き、部分木の高さを子の合計から求める
      const childCenters = children.map((c) => c.centerY);
      centerY = (childCenters[0] + childCenters[childCenters.length - 1]) / 2;
      const first = childCenters[0] - VERTICAL_STEP / 2;
      const last = childCenters[childCenters.length - 1] + VERTICAL_STEP / 2;
      subtreeHeight = last - first;
    }

    const layoutNode: LayoutNode = {
      id: node.attributes?.id ?? "",
      name: node.name,
      depth,
      x: depth * HORIZONTAL_STEP,
      y: centerY,
      children: children.map((c) => c.node),
      isLeaf,
    };

    nodes.push(layoutNode);
    for (const child of children) {
      edges.push({ parent: layoutNode, child: child.node });
    }

    return { node: layoutNode, centerY, height: subtreeHeight };
  };

  const result = build(data, 0);
  const root = result.node;

  // ノードの矩形を含む外接矩形を計算する
  const minX = Math.min(...nodes.map((n) => n.x - STORY_NODE_WIDTH / 2));
  const maxX = Math.max(...nodes.map((n) => n.x + STORY_NODE_WIDTH / 2));
  const minY = Math.min(...nodes.map((n) => n.y - STORY_NODE_HEIGHT / 2));
  const maxY = Math.max(...nodes.map((n) => n.y + STORY_NODE_HEIGHT / 2));

  return {
    root,
    nodes,
    edges,
    bounds: { minX, minY, maxX, maxY },
  };
};
