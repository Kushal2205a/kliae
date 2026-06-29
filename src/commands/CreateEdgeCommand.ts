import type { Command, CommandContext, RelationshipTypeId } from "../types";

export class CreateEdgeCommand implements Command {
  readonly type = "create-edge";
  readonly label = "Create Edge";

  private graphId: string;
  private sourceId: string;
  private targetId: string;
  private sourceHandle?: string;
  private targetHandle?: string;
  private relationshipId: RelationshipTypeId;
  private customLabel?: string;
  private edgeId?: string;

  constructor(
    graphId: string,
    sourceId: string,
    targetId: string,
    relationshipId: RelationshipTypeId,
    customLabel?: string,
    sourceHandle?: string,
    targetHandle?: string,
  ) {
    this.graphId = graphId;
    this.sourceId = sourceId;
    this.targetId = targetId;
    this.relationshipId = relationshipId;
    this.customLabel = customLabel;
    this.sourceHandle = sourceHandle;
    this.targetHandle = targetHandle;
  }

  async execute(ctx: CommandContext): Promise<void> {
    console.log("[CreateEdgeCommand.execute] handle values:", { sourceHandle: this.sourceHandle, targetHandle: this.targetHandle });
    console.log("[CreateEdgeCommand.execute] edgeService defined:", !!ctx.edgeService);
    try {
      const result = await ctx.edgeService.create(this.graphId, {
        sourceId: this.sourceId,
        targetId: this.targetId,
        sourceHandle: this.sourceHandle,
        targetHandle: this.targetHandle,
        relationshipId: this.relationshipId,
        customLabel: this.customLabel,
      });
      console.log("[CreateEdgeCommand.execute] create SUCCESS, edgeId:", result.edge.id, "sourceHandle:", result.edge.sourceHandle, "targetHandle:", result.edge.targetHandle);

      this.edgeId = result.edge.id;
      ctx.graphService.addEdgeId(this.graphId, result.edge.id, result.view);
    } catch (err) {
      console.error("[CreateEdgeCommand.execute] ERROR:", err);
    }
  }

  undo(ctx: CommandContext): void {
    if (!this.edgeId) return;
    ctx.graphService.removeEdgeId(this.graphId, this.edgeId);
    ctx.edgeService.delete(this.edgeId);
  }
}
