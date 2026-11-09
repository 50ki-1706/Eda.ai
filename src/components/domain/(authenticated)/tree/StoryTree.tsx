"use client";

import type { RawNodeDatum } from "@/types/tree";
import { Focus, Minus, Plus } from "lucide-react";
import {
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styles from "./StoryTree.module.css";
import {
  type LayoutNode,
  STORY_NODE_HEIGHT,
  STORY_NODE_WIDTH,
  layoutStoryTree,
} from "./storyTreeLayout";

/**
 * ストーリーツリー
 *
 * Deloitte のストーリー到達ツリーを参考にした、Eda.ai 独自の分岐可視化コンポーネント。
 * reactflow / react-d3-tree に依存せず、SVG のみで描画する。
 *
 * - 左から右へ「物語の進行」をたどるレイアウト
 * - 葉ノード（到達点）は濃い色で強調し、分岐済みノードは黒で描く
 * - ドラッグでパン、ホイールとボタンでズーム、ルートへフォーカスし直すボタン付き
 * - ノードはキーボード操作可能（Enter / Space で選択）
 */

export interface StoryTreeProps {
  /** ツリーデータ（ルートブランチを起点とする RawNodeDatum） */
  data: RawNodeDatum;
  /** ノード選択時のハンドラー（ブランチIDを受け取る） */
  onNodeClick?: (branchId: string) => void;
}

const MIN_SCALE = 0.3;
const MAX_SCALE = 2.5;

type Transform = { x: number; y: number; k: number };

const INITIAL_TRANSFORM: Transform = { x: 80, y: 0, k: 1 };

export function StoryTree({ data, onNodeClick }: StoryTreeProps) {
  const layout = useMemo(() => layoutStoryTree(data), [data]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [transform, setTransform] = useState<Transform>(INITIAL_TRANSFORM);

  // ドラッグによるパン状態
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);

  /** ドラッグで動かした直後のクリックを無視するためのフラグ */
  const wasDraggingRef = useRef(false);

  /** コンテナ中央の座標を取得する */
  const getCenter = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    return { cx: (rect?.width ?? 0) / 2, cy: (rect?.height ?? 0) / 2 };
  }, []);

  /** ルートノードを画面中央に見立てて初期位置へ戻す */
  const resetView = useCallback(() => {
    const { cy } = getCenter();
    setTransform({ x: 80, y: cy - layout.root.y, k: 1 });
  }, [getCenter, layout.root.y]);

  useEffect(() => {
    resetView();
  }, [resetView]);

  /** ホイールでズーム（カーソル位置を中心に） */
  const handleWheel = useCallback((e: ReactWheelEvent<SVGSVGElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    e.preventDefault();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    setTransform((prev) => {
      const k = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, prev.k * (e.deltaY < 0 ? 1.1 : 0.9)),
      );
      const ratio = k / prev.k;
      return {
        k,
        x: offsetX - (offsetX - prev.x) * ratio,
        y: offsetY - (offsetY - prev.y) * ratio,
      };
    });
  }, []);

  /** コンテナ中心で倍率を上げ下げする（ズームボタン用） */
  const zoomByButton = useCallback(
    (factor: number) => {
      const { cx, cy } = getCenter();
      setTransform((prev) => {
        const k = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.k * factor));
        const ratio = k / prev.k;
        return {
          k,
          x: cx - (cx - prev.x) * ratio,
          y: cy - (cy - prev.y) * ratio,
        };
      });
    },
    [getCenter],
  );

  /** 背景ドラッグでパンする */
  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      wasDraggingRef.current = false;
      dragStateRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originX: transform.x,
        originY: transform.y,
        moved: false,
      };
    },
    [transform],
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      const drag = dragStateRef.current;
      if (!drag) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        drag.moved = true;
        wasDraggingRef.current = true;
      }
      setTransform((prev) => ({
        ...prev,
        x: drag.originX + dx,
        y: drag.originY + dy,
      }));
    },
    [],
  );

  const handlePointerUp = useCallback((e: ReactPointerEvent<SVGSVGElement>) => {
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    dragStateRef.current = null;
  }, []);

  const handleNodeClick = useCallback(
    (node: LayoutNode) => {
      // ドラッグで動かした直後はクリックとして扱わない
      if (wasDraggingRef.current) {
        wasDraggingRef.current = false;
        return;
      }
      if (node.id) onNodeClick?.(node.id);
    },
    [onNodeClick],
  );

  /** 親の右端から子の左端へつながる、物語の「道」を描くベジェパス */
  const edgePath = useCallback((parent: LayoutNode, child: LayoutNode) => {
    const startX = parent.x + STORY_NODE_WIDTH / 2;
    const startY = parent.y;
    const endX = child.x - STORY_NODE_WIDTH / 2;
    const endY = child.y;
    const midX = (startX + endX) / 2;
    return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
  }, []);

  /** 1ノードの描画 */
  const renderNode = useCallback(
    (node: LayoutNode) => {
      const label =
        node.name.length > 24 ? `${node.name.slice(0, 24)}...` : node.name;
      return (
        <g
          key={node.id}
          transform={`translate(${node.x}, ${node.y})`}
          role="button"
          tabIndex={node.id ? 0 : -1}
          onClick={() => handleNodeClick(node)}
          onKeyDown={(e) => {
            if (!node.id) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onNodeClick?.(node.id);
            }
          }}
          style={{ cursor: node.id ? "pointer" : "default" }}
        >
          {/* 背景と枠線 */}
          <rect
            width={STORY_NODE_WIDTH}
            height={STORY_NODE_HEIGHT}
            x={-STORY_NODE_WIDTH / 2}
            y={-STORY_NODE_HEIGHT / 2}
            rx={6}
            ry={6}
            fill={node.isLeaf ? "#222" : "#000"}
            stroke="#222"
            strokeWidth={1}
          />
          <rect
            className={styles.nodeInnerRect}
            width={STORY_NODE_WIDTH - 6}
            height={STORY_NODE_HEIGHT - 6}
            x={-(STORY_NODE_WIDTH - 6) / 2}
            y={-(STORY_NODE_HEIGHT - 6) / 2}
            rx={4}
            ry={4}
          />
          {/* テキスト */}
          <foreignObject
            x={-STORY_NODE_WIDTH / 2}
            y={-STORY_NODE_HEIGHT / 2}
            width={STORY_NODE_WIDTH}
            height={STORY_NODE_HEIGHT}
          >
            <div className={styles.nodeLabel}>{label}</div>
          </foreignObject>
        </g>
      );
    },
    [handleNodeClick, onNodeClick],
  );

  return (
    <div ref={containerRef} className={styles.wrapper}>
      <svg
        className={styles.svg}
        role="tree"
        aria-label="ブランチの分岐ツリー"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <g
          transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}
        >
          {/* 物語の道（エッジ） */}
          {layout.edges.map(({ parent, child }) => (
            <path
              key={`${parent.id}-${child.id}`}
              className={styles.edge}
              d={edgePath(parent, child)}
            />
          ))}
          {layout.nodes.map(renderNode)}
        </g>
      </svg>

      {/* ズームコントロール */}
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.controlButton}
          aria-label="拡大"
          title="拡大"
          onClick={() => zoomByButton(1.2)}
        >
          <Plus size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={styles.controlButton}
          aria-label="縮小"
          title="縮小"
          onClick={() => zoomByButton(1 / 1.2)}
        >
          <Minus size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={styles.controlButton}
          aria-label="ルートへ戻る"
          title="ルートへ戻る"
          onClick={resetView}
        >
          <Focus size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default StoryTree;
