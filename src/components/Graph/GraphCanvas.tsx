import { useCallback, useEffect, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Connection,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import ConceptNode from "./ConceptNode";
import CustomEdge from "./CustomEdge";
import { useUIStore } from "../../stores/useUIStore";
import { MoveNodeCommand } from "../../commands/MoveNodeCommand";
import { DeleteEdgeCommand } from "../../commands/DeleteEdgeCommand";
import type { ConverterService } from "../../services/ConverterService";
import type { CommandHistoryService } from "../../services/CommandHistoryService";
import type { GraphService } from "../../services/GraphService";
import type { NavigationService } from "../../services/NavigationService";
import type { Graph } from "../../types";

const nodeTypes = { concept: ConceptNode };
const edgeTypes = { "custom-edge": CustomEdge };

interface GraphCanvasInnerProps {
  graph: Graph;
  converterService: ConverterService;
  commandHistoryService: CommandHistoryService;
  graphService: GraphService;
  navigationService: NavigationService;
}

function GraphCanvasInner({
  graph,
  converterService,
  commandHistoryService,
  navigationService,
}: GraphCanvasInnerProps) {
  const openCreateEdgeDialog = useUIStore((s) => s.openCreateEdgeDialog);
  const openRelationshipInspector = useUIStore((s) => s.openRelationshipInspector);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => converterService.toReactFlow(graph),
    [graph, converterService],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = converterService.toReactFlow(graph);
    setNodes(newNodes);
    setEdges(newEdges);
  }, [graph, converterService, setNodes, setEdges]);

  const onNodesChangeWrapper = useCallback(
    (changes: any) => {
      for (const change of changes) {
        if (change.type === "position" && change.dragging === false) {
          const node = nodes.find((n: any) => n.id === change.id);
          if (node && change.position) {
            commandHistoryService.execute(
              new MoveNodeCommand(
                graph.id,
                (node.data as any).nodeId,
                { x: node.position.x, y: node.position.y },
                change.position,
              ),
            );
          }
        }
      }
      onNodesChange(changes);
    },
    [graph.id, nodes, commandHistoryService, onNodesChange],
  );

  const onEdgesChangeWrapper = useCallback(
    (changes: any) => {
      for (const change of changes) {
        if (change.type === "remove") {
          const edge = edges.find((e: any) => e.id === change.id);
          if (edge?.data?.edgeId) {
            commandHistoryService.execute(
              new DeleteEdgeCommand(graph.id, (edge.data as any).edgeId),
            );
          }
        }
      }
      onEdgesChange(changes);
    },
    [graph.id, edges, commandHistoryService, onEdgesChange],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      openCreateEdgeDialog(connection.source, connection.target);
    },
    [openCreateEdgeDialog],
  );

  const onNodeDoubleClick = useCallback(
    (_event: any, node: any) => {
      const data = node.data as any;
      if (data.childGraphId) {
        navigationService.navigateToGraph(data.childGraphId, data.nodeId);
      }
    },
    [navigationService],
  );

  const onEdgeClick = useCallback(
    (_event: any, edge: any) => {
      if (edge.data?.edgeId) {
        openRelationshipInspector(edge.data.edgeId);
      }
    },
    [openRelationshipInspector],
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChangeWrapper}
        onEdgesChange={onEdgesChangeWrapper}
        onConnect={onConnect}
        onNodeDoubleClick={onNodeDoubleClick}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.1}
        maxZoom={4}
        defaultEdgeOptions={{
          type: "custom-edge",
          animated: false,
        }}
      >
        <Background color="#ffffff10" gap={20} />
        <Controls className="!bg-[#1e1e2e] !border-white/10 !text-white" />
        <MiniMap
          className="!border-white/10"
          style={{ backgroundColor: "#1e1e2e" }}
          nodeColor="#3b82f6"
          maskColor="#00000060"
        />
      </ReactFlow>
    </div>
  );
}

export default function GraphCanvas(props: GraphCanvasInnerProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
