import { ANCHOR_NODE_TYPE, type Command, type CommandContext, type Node } from "../types";

export class UpdateNodeCommand implements Command {
  readonly type = "update-node";
  readonly label = "Update Node";

  private nodeId: string;
  private oldData: Partial<Node>;
  private newData: Partial<Node>;

  constructor(nodeId: string, oldData: Partial<Node>, newData: Partial<Node>) {
    this.nodeId = nodeId;
    this.oldData = { ...oldData };
    this.newData = { ...newData };
  }

  async execute(ctx: CommandContext): Promise<void> {
    await this.updateNodeAndNestedGraph(ctx, this.newData);
  }

  async undo(ctx: CommandContext): Promise<void> {
    await this.updateNodeAndNestedGraph(ctx, this.oldData);
  }

  /** Keep the generated nested-graph identity in sync with its parent node. */
  private async updateNodeAndNestedGraph(
    ctx: CommandContext,
    changes: Partial<Node>,
  ): Promise<void> {
    const node = await ctx.nodeService.update(this.nodeId, changes);
    if (typeof changes.label !== "string" || !node.childGraphId) return;

    const childGraph = ctx.graphService.getGraph(node.childGraphId);
    if (!childGraph) return;

    childGraph.name = changes.label;
    await ctx.graphService.save(childGraph);

    const anchorId = childGraph.nodeIds.find(
      (id) => ctx.nodeService.getNode(id)?.type === ANCHOR_NODE_TYPE,
    );
    if (anchorId) {
      await ctx.nodeService.update(anchorId, { label: changes.label });
    }
  }
}
