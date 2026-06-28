import type { ValidationIssue } from "../types";
import type { NodeService } from "./NodeService";
import type { EdgeService } from "./EdgeService";
import type { GraphService } from "./GraphService";

export class WorkspaceValidator {
  private nodeService: NodeService;
  private edgeService: EdgeService;
  private graphService: GraphService;

  constructor(
    nodeService: NodeService,
    edgeService: EdgeService,
    graphService: GraphService,
    _workspaceService: any,
  ) {
    this.nodeService = nodeService;
    this.edgeService = edgeService;
    this.graphService = graphService;
  }

  validateAll(): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const graphs = this.graphService.getAllGraphs();
    const allNodeIds = new Set(this.nodeService.getAllNodes().map((n) => n.id));
    const allEdgeIds = new Set(this.edgeService.getAllEdges().map((e) => e.id));
    const allGraphIds = new Set(graphs.map((g) => g.id));

    for (const graph of graphs) {
      issues.push(...this.validateGraph(graph.id, allNodeIds, allEdgeIds, allGraphIds));
    }

    issues.push(...this.validateCircularReferences(allGraphIds));

    return issues;
  }

  validateGraphById(graphId: string): ValidationIssue[] {
    const allNodeIds = new Set(this.nodeService.getAllNodes().map((n) => n.id));
    const allEdgeIds = new Set(this.edgeService.getAllEdges().map((e) => e.id));
    const allGraphIds = new Set(this.graphService.getAllGraphs().map((g) => g.id));
    return this.validateGraph(graphId, allNodeIds, allEdgeIds, allGraphIds);
  }

  private validateGraph(
    graphId: string,
    allNodeIds: Set<string>,
    allEdgeIds: Set<string>,
    allGraphIds: Set<string>,
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const graph = this.graphService.getGraph(graphId);
    if (!graph) {
      issues.push({
        severity: "error",
        code: "graph-not-found",
        message: `Graph "${graphId}" not found in memory`,
        sourceObject: { type: "graph", id: graphId },
      });
      return issues;
    }

    for (const nodeId of graph.nodeIds) {
      if (!allNodeIds.has(nodeId)) {
        issues.push({
          severity: "error",
          code: "missing-node",
          message: `Graph "${graph.name}" references node "${nodeId}" which does not exist`,
          sourceObject: { type: "node", id: nodeId },
          graphId,
        });
      } else {
        const node = this.nodeService.getNode(nodeId);
        if (node?.childGraphId && !allGraphIds.has(node.childGraphId)) {
          issues.push({
            severity: "warning",
            code: "missing-child-graph",
            message: `Node "${node.label}" references child graph "${node.childGraphId}" which does not exist`,
            sourceObject: { type: "node", id: nodeId },
            graphId,
          });
        }
      }
    }

    for (const edgeId of graph.edgeIds) {
      if (!allEdgeIds.has(edgeId)) {
        issues.push({
          severity: "error",
          code: "missing-edge",
          message: `Graph "${graph.name}" references edge "${edgeId}" which does not exist`,
          sourceObject: { type: "edge", id: edgeId },
          graphId,
        });
      } else {
        const edge = this.edgeService.getEdge(edgeId);
        if (edge) {
          if (!allNodeIds.has(edge.sourceId)) {
            issues.push({
              severity: "error",
              code: "orphan-edge-source",
              message: `Edge "${edgeId}" references missing source node "${edge.sourceId}"`,
              sourceObject: { type: "edge", id: edgeId },
              graphId,
            });
          }
          if (!allNodeIds.has(edge.targetId)) {
            issues.push({
              severity: "error",
              code: "orphan-edge-target",
              message: `Edge "${edgeId}" references missing target node "${edge.targetId}"`,
              sourceObject: { type: "edge", id: edgeId },
              graphId,
            });
          }
          if (edge.sourceId === edge.targetId) {
            issues.push({
              severity: "warning",
              code: "self-referencing-edge",
              message: `Edge "${edgeId}" connects a node to itself`,
              sourceObject: { type: "edge", id: edgeId },
              graphId,
            });
          }
        }
      }
    }

    return issues;
  }

  private validateCircularReferences(allGraphIds: Set<string>): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (const graphId of allGraphIds) {
      const visited = new Set<string>();

      const detectCycle = (currentId: string, path: string[]): boolean => {
        if (path.includes(currentId)) {
          issues.push({
            severity: "error",
            code: "circular-child-graph",
            message: `Circular reference detected: ${path.concat(currentId).join(" → ")}`,
            sourceObject: { type: "graph", id: currentId },
          });
          return true;
        }
        if (visited.has(currentId)) return false;
        visited.add(currentId);

        const graph = this.graphService.getGraph(currentId);
        if (!graph) return false;

        for (const nodeId of graph.nodeIds) {
          const node = this.nodeService.getNode(nodeId);
          if (node?.childGraphId && allGraphIds.has(node.childGraphId)) {
            if (detectCycle(node.childGraphId, [...path, currentId])) {
              return true;
            }
          }
        }
        return false;
      };

      detectCycle(graphId, []);
    }

    return issues;
  }
}
