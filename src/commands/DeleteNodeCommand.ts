import type { Command, CommandContext } from "../types";

export class DeleteNodeCommand implements Command {
  readonly type = "delete-node";
  readonly label = "Delete Node";
  readonly shortcut = "Delete";

  private graphId: string;
  private nodeId: string;
  private storedNode: string | null = null;
  private storedView: string | null = null;
  private relatedEdges: { edgeId: string; graphId: string }[] = [];

  constructor(graphId: string, nodeId: string) {
    this.graphId = graphId;
    this.nodeId = nodeId;
  }

  async execute(ctx: CommandContext): Promise<void> {
    const node = ctx.nodeService.getNode(this.nodeId);
    if (node) {
      this.storedNode = JSON.stringify(node);
    }
    const view = ctx.nodeService.getView(this.nodeId, this.graphId);
    if (view) {
      this.storedView = JSON.stringify(view);
    }

    const graph = ctx.graphService.getGraph(this.graphId);
    if (graph) {
      for (const edgeId of graph.edgeIds) {
        const edge = ctx.edgeService.getEdge(edgeId);
        if (edge && (edge.sourceId === this.nodeId || edge.targetId === this.nodeId)) {
          this.relatedEdges.push({ edgeId, graphId: this.graphId });
          ctx.graphService.removeEdgeId(this.graphId, edgeId);
          ctx.edgeService.delete(edgeId);
        }
      }
    }

    console.log(
      "Delete command graph:",
      this.graphId,
      ctx.graphService.getGraph(this.graphId)?.nodeIds
    );

    ctx.graphService.removeNodeId(this.graphId, this.nodeId);
    console.log(
      "After remove:",
      ctx.graphService.getGraph(this.graphId)?.nodeIds
    );
    ctx.nodeService.delete(this.nodeId);
  }

  undo(ctx: CommandContext): void {
    if (this.storedNode) {
      const node = JSON.parse(this.storedNode);
      ctx.nodeService.setNode(node);

      if (this.storedView) {
        const view = JSON.parse(this.storedView);
        ctx.nodeService.setView(this.graphId, view);
        ctx.graphService.addNodeId(this.graphId, node.id, view);
      }
    }

    for (const { edgeId, graphId } of this.relatedEdges) {
      const edge = ctx.edgeService.getEdge(edgeId);
      if (edge) {
        ctx.edgeService.setEdge(edge);
        const view = ctx.edgeService.getView(edgeId, graphId);
        if (view) {
          ctx.graphService.addEdgeId(graphId, edgeId, view);
        }
      }
    }
  }
}
