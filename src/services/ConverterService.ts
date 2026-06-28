import type { Graph } from "../types";
import type { NodeService } from "./NodeService";
import type { EdgeService } from "./EdgeService";
import { resolveRelationshipLabel, getRelationshipColor } from "../constants/relationships";

interface ReactFlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    nodeId: string;
    color?: string;
    childGraphId?: string;
    width?: number;
    height?: number;
    tags: string[];
  };
  selected?: boolean;
}

interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  data?: {
    edgeId: string;
    relationshipType: string;
    displayLabel: string;
    description?: string;
    color?: string;
  };
  label?: string;
  selected?: boolean;
}

export class ConverterService {
  private nodeService: NodeService;
  private edgeService: EdgeService;

  constructor(nodeService: NodeService, edgeService: EdgeService) {
    this.nodeService = nodeService;
    this.edgeService = edgeService;
  }

  toReactFlow(graph: Graph): { nodes: ReactFlowNode[]; edges: ReactFlowEdge[] } {
    const nodes: ReactFlowNode[] = [];
    const edges: ReactFlowEdge[] = [];

    for (const nodeId of graph.nodeIds) {
      const node = this.nodeService.getNode(nodeId);
      const view = graph.views.nodeViews[nodeId];
      if (!node || !view) continue;

      nodes.push({
        id: node.id,
        type: node.type,
        position: { x: view.position.x, y: view.position.y },
        data: {
          label: node.label,
          nodeId: node.id,
          color: view.color,
          childGraphId: node.childGraphId,
          width: view.width,
          height: view.height,
          tags: node.tags,
        },
      });
    }

    for (const edgeId of graph.edgeIds) {
      const edge = this.edgeService.getEdge(edgeId);
      if (!edge) continue;

      const displayLabel = resolveRelationshipLabel(edge.relationship);

      edges.push({
        id: edge.id,
        source: edge.sourceId,
        target: edge.targetId,
        type: "custom-edge",
        data: {
          edgeId: edge.id,
          relationshipType: edge.relationship.id,
          displayLabel,
          description: edge.description,
          color: getRelationshipColor(edge.relationship),
        },
        label: displayLabel,
      });
    }

    return { nodes, edges };
  }
}
