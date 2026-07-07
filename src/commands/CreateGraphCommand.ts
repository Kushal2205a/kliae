import type { Command, CommandContext } from "../types";
import { ANCHOR_NODE_TYPE } from "../types";

export class CreateGraphCommand implements Command {
  readonly type = "create-graph";
  readonly label = "Create Graph";

  private name: string;
  private parentNodeId?: string;
  private graphId?: string;
  private anchorNodeId?: string;

  constructor(name: string, parentNodeId?: string) {
    this.name = name;
    this.parentNodeId = parentNodeId;
  }

  async execute(ctx: CommandContext): Promise<void> {
    const graph = await ctx.graphService.create(this.name, this.parentNodeId);
    this.graphId = graph.id;

    if (this.parentNodeId) {
      await ctx.nodeService.update(this.parentNodeId, { childGraphId: graph.id });

      // Seed the new graph with a read only anchor node representing the
      // parent, centered at {0, 0}, so the nested concepts have something
      // to visually and structurally connect back to.
      const parentNode = ctx.nodeService.getNode(this.parentNodeId);
      const { node: anchorNode, view: anchorView } = await ctx.nodeService.create(graph.id, {
        type: ANCHOR_NODE_TYPE,
        label: parentNode?.label ?? this.name,
        tags: [],
      });

      this.anchorNodeId = anchorNode.id;
      ctx.graphService.addNodeId(graph.id, anchorNode.id, anchorView);
    }
  }

  undo(ctx: CommandContext): void {
    if (!this.graphId) return;
    ctx.graphService.delete(this.graphId);

    if (this.anchorNodeId) {
      ctx.nodeService.delete(this.anchorNodeId);
    }

    if (this.parentNodeId) {
      ctx.nodeService.update(this.parentNodeId, { childGraphId: undefined });
    }
  }
}