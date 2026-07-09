import type { Command, CommandContext } from "../types";

export class CreateNodeCommand implements Command {
  readonly type = "create-node";
  readonly label = "Create Concept Node";
  readonly shortcut = "Ctrl+N";

  private graphId: string;
  private nodeId?: string;
  private nodeLabel: string;
  private position?: { x: number; y: number };

  /** The id of the node once created, so callers can act on it after execute() resolves. */
  get createdNodeId(): string | undefined {
    return this.nodeId;
  }

  constructor(graphId: string, nodeLabel: string, position?: { x: number; y: number }) {
    this.graphId = graphId;
    this.nodeLabel = nodeLabel;
    this.position = position;
  }

  async execute(ctx: CommandContext): Promise<void> {
    const result = await ctx.nodeService.create(this.graphId, {
      label: this.nodeLabel,
    });

    this.nodeId = result.node.id;

    if (this.position) {
      ctx.nodeService.updateView(this.graphId, result.node.id, { position: this.position });
    }

    ctx.graphService.addNodeId(this.graphId, result.node.id, result.view);
  }

  undo(ctx: CommandContext): void {
    if (!this.nodeId) return;
    ctx.graphService.removeNodeId(this.graphId, this.nodeId);
    ctx.nodeService.delete(this.nodeId);
  }
}