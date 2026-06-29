import type { Command, CommandContext, CanvasObject } from "../types";

export class CreateCanvasObjectCommand implements Command {
  readonly type = "create-canvas-object";
  readonly label = "Create Canvas Object";

  private graphId: string;
  private object: CanvasObject;

  constructor(graphId: string, object: CanvasObject) {
    this.graphId = graphId;
    this.object = object;
  }

  async execute(ctx: CommandContext): Promise<void> {
    ctx.graphService.addCanvasObject(this.graphId, this.object);
    const graph = ctx.graphService.getGraph(this.graphId);
    if (graph) await ctx.graphService.save(graph);
  }

  undo(ctx: CommandContext): void {
    ctx.graphService.removeCanvasObject(this.graphId, this.object.id);
  }
}

export class UpdateCanvasObjectCommand implements Command {
  readonly type = "update-canvas-object";
  readonly label = "Update Canvas Object";

  private graphId: string;
  private objectId: string;
  private changes: Record<string, unknown>;
  private previousState: Record<string, unknown> | null = null;

  constructor(graphId: string, objectId: string, changes: Record<string, unknown>) {
    this.graphId = graphId;
    this.objectId = objectId;
    this.changes = changes;
  }

  async execute(ctx: CommandContext): Promise<void> {
    const graph = ctx.graphService.getGraph(this.graphId);
    if (!graph) return;
    const obj = graph.canvas.objects.find((o) => o.id === this.objectId);
    if (!obj) return;

    this.previousState = {};
    for (const key of Object.keys(this.changes)) {
      (this.previousState as any)[key] = (obj as any)[key];
    }

    Object.assign(obj, this.changes);
    await ctx.graphService.save(graph);
  }

  undo(ctx: CommandContext): void {
    if (!this.previousState) return;
    const graph = ctx.graphService.getGraph(this.graphId);
    if (!graph) return;
    const obj = graph.canvas.objects.find((o) => o.id === this.objectId);
    if (!obj) return;
    Object.assign(obj, this.previousState);
  }
}

export class DeleteCanvasObjectCommand implements Command {
  readonly type = "delete-canvas-object";
  readonly label = "Delete Canvas Object";

  private graphId: string;
  private objectId: string;
  private storedObject: string | null = null;

  constructor(graphId: string, objectId: string) {
    this.graphId = graphId;
    this.objectId = objectId;
  }

  async execute(ctx: CommandContext): Promise<void> {
    const graph = ctx.graphService.getGraph(this.graphId);
    if (!graph) return;
    const obj = graph.canvas.objects.find((o) => o.id === this.objectId);
    if (obj) this.storedObject = JSON.stringify(obj);
    ctx.graphService.removeCanvasObject(this.graphId, this.objectId);
    await ctx.graphService.save(graph);
  }

  undo(ctx: CommandContext): void {
    if (!this.storedObject) return;
    const graph = ctx.graphService.getGraph(this.graphId);
    if (!graph) return;
    ctx.graphService.addCanvasObject(this.graphId, JSON.parse(this.storedObject));
  }
}
