"use client";
import PageContainer from "@/components/common/PageContainer";
import Sidebar from "@/components/common/Sidebar";
import useTree from "@/hooks/domain/chat/tree/useTree";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import FormLabel from "@mui/material/FormLabel";
import Switch from "@mui/material/Switch";
import dynamic from "next/dynamic";
import type { RawNodeDatum } from "react-d3-tree";

// Tree はクライアントのみで描画
const Tree = dynamic(() => import("react-d3-tree").then((m) => m.default), {
  ssr: false,
});

export default function Page() {
  const {
    translate,
    handleBranchMerge,
    handleBranchNavigation,
    handleClick,
    isChecked,
    setIsChecked,
    branchStructure,
  } = useTree();

  if (!translate || !branchStructure) return null;

  const renderCustomNode = ({ nodeDatum }: { nodeDatum: RawNodeDatum }) => {
    const W = 200;
    const H = 50;
    const branchId: string | number | boolean | undefined =
      nodeDatum?.attributes?.id;
    const isLeaf = !nodeDatum.children || nodeDatum.children.length === 0;
    return (
      <g
        role={branchId ? "button" : undefined}
        tabIndex={branchId ? 0 : -1}
        onClick={() =>
          handleClick(
            branchId as string,
            handleBranchMerge,
            handleBranchNavigation,
          )
        }
        onKeyDown={(e) => {
          if (!branchId || typeof branchId !== "string") return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleBranchNavigation(branchId);
          }
        }}
        style={{ cursor: branchId ? "pointer" : "default" }}
      >
        {/* 背景と枠線 */}
        <rect
          width={W}
          height={H}
          x={-W / 2}
          y={-H / 2}
          rx={6}
          ry={6}
          fill={isLeaf ? "#222" : "#000"} // 子ノードがない場合は色を変更
          stroke="#222"
          strokeWidth={1}
        />
        <rect
          width={W - 6}
          height={H - 6}
          x={-(W - 6) / 2}
          y={-(H - 6) / 2}
          rx={4}
          ry={4}
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={1}
        />
        {/* テキストを foreignObject でラップ */}
        <foreignObject x={-W / 2} y={-H / 2} width={W} height={H}>
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontFamily: "monospace",
              fontSize: 12,
              fontWeight: 500,
              textAlign: "center",
              pointerEvents: "none",
              userSelect: "none",
              padding: "0 5px",
            }}
          >
            {nodeDatum.name.length > 24
              ? `${nodeDatum.name.slice(0, 24)}...`
              : nodeDatum.name}
          </div>
        </foreignObject>
      </g>
    );
  };

  return (
    <PageContainer
      centerLayout={false}
      bgColor={isChecked ? "#A0A0A0" : "#fff"}
    >
      <div className="w-full h-screen flex">
        <style jsx>{`
          .detroit-path {
            stroke: #000;
            stroke-width: 2;
            fill: none;
            stroke-linecap: round;
            opacity: 0.9;
          }
          .detroit-path:hover {
            stroke: #444;
            stroke-width: 3;
          }
        `}</style>
        <style jsx global>{`
          /* react-d3-tree のデフォルト文字色(黒)を上書き */
          .rd3t-node text {
            fill: #fff !important;
            stroke: none;
          }
          .rd3t-node text tspan {
            fill: #fff !important;
          }
        `}</style>
        <Sidebar />

        <div
          id="treeWrapper"
          style={{
            width: "100%",
            height: "100%",
          }}
        >
          {/* グラデーション等不要になったため defs を削除 */}
          <Tree
            data={branchStructure}
            pathFunc="diagonal"
            separation={{ siblings: 2.5, nonSiblings: 3 }}
            translate={{ x: 300, y: 310 }}
            nodeSize={{ x: 300, y: 120 }}
            renderCustomNodeElement={renderCustomNode}
            zoomable
            enableLegacyTransitions
            initialDepth={2}
            pathClassFunc={() => "detroit-path"}
          />
        </div>
        <FormGroup className="w-30 flex  items-center pt-2 pr-2">
          <FormLabel component="legend">merge mode</FormLabel>
          <FormControlLabel
            control={
              <Switch
                checked={isChecked}
                onChange={() => setIsChecked(!isChecked)}
              />
            }
            label=""
            sx={{ ml: 1 }}
          />
        </FormGroup>
      </div>
    </PageContainer>
  );
}
