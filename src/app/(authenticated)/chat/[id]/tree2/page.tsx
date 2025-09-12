"use client";
import {
  type DefaultEdgeOptions,
  type Edge,
  type FitViewOptions,
  Handle,
  type Node,
  type OnConnect,
  type OnEdgesChange,
  type OnNodeDrag,
  type OnNodesChange,
  Position,
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
} from "@xyflow/react";
import { useCallback, useState } from "react";
import "@xyflow/react/dist/style.css";
import PageContainer from "@/components/common/PageContainer";

const initialNodes: Node[] = [
  {
    id: "1",
    data: { label: "Node 1" },
    position: { x: 100, y: 100 },
    type: "custom",
  },
  {
    id: "2",
    data: { label: "Node 2" },
    position: { x: 100, y: 200 },
    type: "custom",
  },
];

const initialEdges: Edge[] = [{ id: "e1-2", source: "1", target: "2" }];

const fitViewOptions: FitViewOptions = {
  padding: 0.2,
};

const defaultEdgeOptions: DefaultEdgeOptions = {
  animated: true,
};

const onNodeDrag: OnNodeDrag = () => {
  // ドラッグイベントのハンドリング（必要に応じて実装）
};

const CustomNode = () => {
  return (
    <>
      <div
        style={{
          padding: 10,
          border: "1px solid #ddd",
          borderRadius: 5,
          background: "#fff",
        }}
      >
        Custom Node
      </div>

      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </>
  );
};

const Page = () => {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const NodeTypes = { custom: CustomNode };

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );
  const onConnect: OnConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [],
  );

  return (
    <PageContainer centerLayout={false}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDrag={onNodeDrag}
        nodeTypes={NodeTypes}
        fitView
        fitViewOptions={fitViewOptions}
        defaultEdgeOptions={defaultEdgeOptions}
      />
    </PageContainer>
  );
};

export default Page;
