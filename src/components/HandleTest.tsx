import { useCallback, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  type Connection,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const initialNodes: Node[] = [
  {
    id: "a",
    type: "test-node",
    position: { x: 0, y: 100 },
    data: { label: "Node A" },
  },
  {
    id: "b",
    type: "test-node",
    position: { x: 400, y: 100 },
    data: { label: "Node B" },
  },
];

const nodeTypes = { "test-node": TestNode };

function TestNode({ data }: { data: any }) {
  return (
    <div
      style={{
        background: "#1e1e2e",
        color: "white",
        padding: "16px 20px",
        borderRadius: 8,
        border: "2px solid #ffffff20",
        minWidth: 140,
        textAlign: "center",
        fontSize: 14,
      }}
    >
      {/* Left — source + target overlapping */}
      <Handle type="target" position={Position.Left} id="left-target" />
      <Handle type="source" position={Position.Left} id="left-source" />

      {/* Right — source + target overlapping */}
      <Handle type="target" position={Position.Right} id="right-target" />
      <Handle type="source" position={Position.Right} id="right-source" />

      {/* Top — source + target overlapping */}
      <Handle type="target" position={Position.Top} id="top-target" />
      <Handle type="source" position={Position.Top} id="top-source" />

      {/* Bottom — source + target overlapping */}
      <Handle type="target" position={Position.Bottom} id="bottom-target" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" />

      <div>{data.label}</div>
    </div>
  );
}

export default function HandleTest() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [log, setLog] = useState<string[]>([]);

  const addLog = useCallback((msg: string) => {
    setLog((prev) => [...prev, msg]);
    console.log(msg);
  }, []);

  const onConnect = useCallback(
    (connection: Connection) => {
      const edge = {
        id: `e-${Date.now()}`,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        type: "default",
      };
      addLog(`[onConnect] ${JSON.stringify(edge)}`);
      setEdges((eds) => [...eds, edge]);
    },
    [addLog, setEdges],
  );

  const test1 = useCallback(() => {
    const edge1 = { id: "e1", source: "a", target: "b", sourceHandle: "right-source", targetHandle: "left-target", type: "default" };
    const edge2 = { id: "e2", source: "a", target: "b", sourceHandle: "top-source", targetHandle: "bottom-target", type: "default" };
    addLog(`[test1] right-source → left-target: ${JSON.stringify(edge1)}`);
    addLog(`[test1] top-source → bottom-target: ${JSON.stringify(edge2)}`);
    setEdges([edge1, edge2]);
  }, [addLog, setEdges]);

  const test2 = useCallback(() => {
    const edge3 = { id: "e3", source: "a", target: "b", sourceHandle: "left-source", targetHandle: "right-target", type: "default" };
    const edge4 = { id: "e4", source: "a", target: "b", sourceHandle: "bottom-source", targetHandle: "top-target", type: "default" };
    addLog(`[test2] left-source → right-target: ${JSON.stringify(edge3)}`);
    addLog(`[test2] bottom-source → top-target: ${JSON.stringify(edge4)}`);
    setEdges([edge3, edge4]);
  }, [addLog, setEdges]);

  const clear = useCallback(() => {
    setEdges([] as any);
  }, [setEdges]);

  return (
    <div style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "8px 16px", background: "#181825", display: "flex", gap: 8, alignItems: "center", borderBottom: "1px solid #ffffff15" }}>
        <span style={{ color: "white", fontSize: 13, fontWeight: 600 }}>React Flow Handle Test</span>
        <button onClick={test1} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #3b82f680", background: "#3b82f620", color: "#93c5fd", cursor: "pointer", fontSize: 12 }}>
          Test 1: right→left, top→bottom
        </button>
        <button onClick={test2} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #a855f780", background: "#a855f720", color: "#d8b4fe", cursor: "pointer", fontSize: 12 }}>
          Test 2: left→right, bottom→top
        </button>
        <button onClick={clear} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #ef444480", background: "#ef444420", color: "#fca5a5", cursor: "pointer", fontSize: 12 }}>
          Clear
        </button>
      </div>
      <div style={{ flex: 1, position: "relative" }}>
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.1}
            maxZoom={4}
          >
            <Background color="#ffffff10" gap={20} />
            <Controls className="!bg-[#1e1e2e] !border-white/10 !text-white" />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
      <div style={{ height: 200, background: "#0d0d14", borderTop: "1px solid #ffffff15", overflowY: "auto", padding: 8, fontFamily: "monospace", fontSize: 11 }}>
        <div style={{ color: "#ffffff60", marginBottom: 4, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>Console Log</div>
        {log.map((msg, i) => (
          <div key={i} style={{ color: "#e0e0e0", padding: "2px 0", borderBottom: "1px solid #ffffff08", whiteSpace: "pre-wrap" }}>
            {msg}
          </div>
        ))}
        {log.length === 0 && <div style={{ color: "#ffffff30", fontStyle: "italic" }}>No output yet. Click a test button or drag a connection.</div>}
      </div>
    </div>
  );
}
