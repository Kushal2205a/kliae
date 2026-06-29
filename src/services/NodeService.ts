import type { Node, NodeView } from "../types";
import { NODE_SCHEMA_VERSION } from "../types";
import { generateId } from "../utils/idGenerator";
import { writeJSON, exists, remove, ensureDir } from "../utils/fileSystem";
import { readJSON } from "../utils/fileSystem";
import type { WorkspaceService } from "./WorkspaceService";
import type { EventBus } from "./EventBus";

export class NodeService {
  private nodes = new Map<string, Node>();
  private views = new Map<string, Map<string, NodeView>>();
  private workspaceService: WorkspaceService;
  private eventBus: EventBus;

  constructor(workspaceService: WorkspaceService, eventBus: EventBus) {
    this.workspaceService = workspaceService;
    this.eventBus = eventBus;
  }

  getNode(id: string): Node | undefined {
    return this.nodes.get(id);
  }

  getNodes(ids: string[]): Node[] {
    return ids.map((id) => this.nodes.get(id)).filter(Boolean) as Node[];
  }

  getAllNodes(): Node[] {
    return Array.from(this.nodes.values());
  }

  getView(nodeId: string, graphId: string): NodeView | undefined {
    return this.views.get(graphId)?.get(nodeId);
  }

  async create(graphId: string, data: { type?: string; label: string; tags?: string[]; childGraphId?: string }): Promise<{ node: Node; view: NodeView }> {
    const now = new Date().toISOString();
    const nodeId = generateId();
    const node: Node = {
      schemaVersion: NODE_SCHEMA_VERSION,
      id: nodeId,
      type: data.type ?? "concept",
      label: data.label,
      tags: data.tags ?? [],
      childGraphId: data.childGraphId,
      createdAt: now,
      updatedAt: now,
    };

    const view: NodeView = {
      nodeId,
      graphId,
      position: { x: 0, y: 0 },
      color: "#71717a",
    };

    this.nodes.set(nodeId, node);
    if (!this.views.has(graphId)) {
      this.views.set(graphId, new Map());
    }
    this.views.get(graphId)!.set(nodeId, view);

    await persistNode(node, this.workspaceService);

    this.eventBus.emit({
      type: "node:created",
      payload: { node, view },
    });

    return { node, view };
  }

  async update(id: string, changes: Partial<Node>): Promise<Node> {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`Node ${id} not found`);
    Object.assign(node, changes);
    node.updatedAt = new Date().toISOString();

    await persistNode(node, this.workspaceService);

    this.eventBus.emit({
      type: "node:updated",
      payload: { nodeId: id, changes },
    });

    return node;
  }

  async delete(id: string): Promise<void> {
    const node = this.nodes.get(id);
    if (!node) return;

    this.nodes.delete(id);
    for (const views of this.views.values()) {
      views.delete(id);
    }

    const nodePath = await this.workspaceService.nodePath(id);
    if (await exists(nodePath)) {
      await remove(nodePath);
    }

    this.eventBus.emit({
      type: "node:deleted",
      payload: { nodeId: id },
    });
  }

  updateView(graphId: string, nodeId: string, changes: Partial<NodeView>): NodeView | undefined {
    const views = this.views.get(graphId);
    if (!views) return undefined;
    const view = views.get(nodeId);
    if (!view) return undefined;
    Object.assign(view, changes);

    this.eventBus.emit({
      type: "node:viewUpdated",
      payload: { nodeId, graphId, view: changes },
    });

    return view;
  }

  setNode(node: Node): void {
    this.nodes.set(node.id, node);
  }

  setView(graphId: string, view: NodeView): void {
    if (!this.views.has(graphId)) {
      this.views.set(graphId, new Map());
    }
    this.views.get(graphId)!.set(view.nodeId, view);
  }

  clear(): void {
    this.nodes.clear();
    this.views.clear();
  }
}

async function persistNode(node: Node, workspaceService: WorkspaceService): Promise<void> {
  const nodePath = await workspaceService.nodePath(node.id);
  const dir = nodePath.substring(0, nodePath.lastIndexOf("/"));
  await ensureDir(dir);
  await writeJSON(nodePath, node);
}

export async function loadNode(path: string, nodeService: NodeService): Promise<Node | null> {
  try {
    const node = await readJSON<Node>(path);
    nodeService.setNode(node);
    return node;
  } catch {
    return null;
  }
}