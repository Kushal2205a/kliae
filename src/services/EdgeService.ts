import type { Edge, EdgeView, RelationshipTypeId } from "../types";
import { EDGE_SCHEMA_VERSION } from "../types";
import { generateId } from "../utils/idGenerator";
import { writeJSON, exists, remove } from "../utils/fileSystem";
import type { WorkspaceService } from "./WorkspaceService";
import type { EventBus } from "./EventBus";

export class EdgeService {
  private edges = new Map<string, Edge>();
  private views = new Map<string, Map<string, EdgeView>>();
  private workspaceService: WorkspaceService;
  private eventBus: EventBus;

  constructor(workspaceService: WorkspaceService, eventBus: EventBus) {
    this.workspaceService = workspaceService;
    this.eventBus = eventBus;
  }

  getEdge(id: string): Edge | undefined {
    return this.edges.get(id);
  }

  getEdges(ids: string[]): Edge[] {
    return ids.map((id) => this.edges.get(id)).filter(Boolean) as Edge[];
  }

  getAllEdges(): Edge[] {
    return Array.from(this.edges.values());
  }

  getView(edgeId: string, graphId: string): EdgeView | undefined {
    return this.views.get(graphId)?.get(edgeId);
  }

  async create(
    graphId: string,
    data: { sourceId: string; targetId: string; relationshipId: RelationshipTypeId; customLabel?: string; description?: string },
  ): Promise<{ edge: Edge; view: EdgeView }> {
    const now = new Date().toISOString();
    const edgeId = generateId();
    const edge: Edge = {
      schemaVersion: EDGE_SCHEMA_VERSION,
      id: edgeId,
      sourceId: data.sourceId,
      targetId: data.targetId,
      relationship: {
        id: data.relationshipId,
        customLabel: data.customLabel,
      },
      description: data.description,
      createdAt: now,
      updatedAt: now,
    };

    const view: EdgeView = {
      edgeId,
      graphId,
    };

    this.edges.set(edgeId, edge);
    if (!this.views.has(graphId)) {
      this.views.set(graphId, new Map());
    }
    this.views.get(graphId)!.set(edgeId, view);

    await writeJSON(await this.workspaceService.edgePath(edgeId), edge);

    this.eventBus.emit({
      type: "edge:created",
      payload: { edge, view },
    });

    return { edge, view };
  }

  async update(id: string, changes: Partial<Edge>): Promise<Edge> {
    const edge = this.edges.get(id);
    if (!edge) throw new Error(`Edge ${id} not found`);
    Object.assign(edge, changes);
    edge.updatedAt = new Date().toISOString();

    await writeJSON(await this.workspaceService.edgePath(id), edge);

    this.eventBus.emit({
      type: "edge:updated",
      payload: { edgeId: id, changes },
    });

    return edge;
  }

  async delete(id: string): Promise<void> {
    const edge = this.edges.get(id);
    if (!edge) return;

    this.edges.delete(id);
    for (const views of this.views.values()) {
      views.delete(id);
    }

    const edgePath = await this.workspaceService.edgePath(id);
    if (await exists(edgePath)) {
      await remove(edgePath);
    }

    this.eventBus.emit({
      type: "edge:deleted",
      payload: { edgeId: id },
    });
  }

  updateView(graphId: string, edgeId: string, changes: Partial<EdgeView>): EdgeView | undefined {
    const views = this.views.get(graphId);
    if (!views) return undefined;
    const view = views.get(edgeId);
    if (!view) return undefined;
    Object.assign(view, changes);
    return view;
  }

  setEdge(edge: Edge): void {
    this.edges.set(edge.id, edge);
  }

  setView(graphId: string, view: EdgeView): void {
    if (!this.views.has(graphId)) {
      this.views.set(graphId, new Map());
    }
    this.views.get(graphId)!.set(view.edgeId, view);
  }

  clear(): void {
    this.edges.clear();
    this.views.clear();
  }
}
