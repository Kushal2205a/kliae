import type { Graph } from "../types";
import type { NodeService } from "./NodeService";
import type { EdgeService } from "./EdgeService";
import type { WorkspaceService } from "./WorkspaceService";
import { resolveRelationshipLabel, getRelationshipColor } from "../constants/relationships";

interface ReactFlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
  style?: Record<string, unknown>;
  selected?: boolean;
  draggable?: boolean;
}

interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type: string;
  data?: {
    edgeId: string;
    relationshipType: string;
    customLabel?: string;
    displayLabel: string;
    description?: string;
    color?: string;
    bundleId?: string;
    bundleSize?: number;
    isBundleLeader?: boolean;
    bundleTargetIds?: string[];
    bundleOriginX?: number;
    bundleOriginY?: number;
  };
  label?: string;
  selected?: boolean;
}

export class ConverterService {
  private nodeService: NodeService;
  private edgeService: EdgeService;
  private workspaceService: WorkspaceService;

  constructor(nodeService: NodeService, edgeService: EdgeService, workspaceService: WorkspaceService) {
    this.nodeService = nodeService;
    this.edgeService = edgeService;
    this.workspaceService = workspaceService;
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
        style: {
          width: view.width,
          height: view.height,
        },
        data: {
          label: node.label,
          content: node.content,
          nodeId: node.id,
          color: view.color,
          childGraphId: node.childGraphId,
          width: view.width,
          height: view.height,
          tags: node.tags,
        },
      });
    }

    const customRelationships = this.workspaceService.getCustomRelationships();

    for (const edgeId of graph.edgeIds) {
      const edge = this.edgeService.getEdge(edgeId);
      if (!edge) continue;

      const displayLabel = resolveRelationshipLabel(edge.relationship);
      const relationshipColor = getRelationshipColor(edge.relationship, customRelationships);

      edges.push({
        id: edge.id,
        source: edge.sourceId,
        target: edge.targetId,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        type: "custom-edge",
        data: {
          edgeId: edge.id,
          relationshipType: edge.relationship.id,
          customLabel: edge.relationship.customLabel,
          displayLabel,
          description: edge.description,
          color: relationshipColor,
        },
        label: displayLabel,
      });
    }

    const edgeGroups = new Map<string, ReactFlowEdge[]>();
    for (const edge of edges) {
      const key = `${edge.source}:${edge.data!.relationshipType}:${edge.data!.customLabel ?? ""}`;
      if (!edgeGroups.has(key)) edgeGroups.set(key, []);
      edgeGroups.get(key)!.push(edge);
    }

    for (const [bundleId, group] of edgeGroups) {
      if (group.length < 2) continue;

      group.sort((a, b) => a.id.localeCompare(b.id));
      const bundleSize = group.length;

      const leader = group[0];
      if (leader.data) {
        leader.data.bundleId = bundleId;
        leader.data.bundleSize = bundleSize;
        leader.data.isBundleLeader = true;
        leader.data.bundleTargetIds = group.map((e) => e.target);
        leader.data.displayLabel = `${leader.data.displayLabel} [${bundleSize}]`;
      }

      for (let i = 1; i < group.length; i++) {
        const edge = group[i];
        if (edge.data) {
          edge.data.bundleId = bundleId;
          edge.data.bundleSize = bundleSize;
          edge.data.isBundleLeader = false;
          edge.data.displayLabel = "";
        }
        edge.label = "";
      }
    }

    return { nodes, edges };
  }
}