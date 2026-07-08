import { getFilterKey } from "../constants/relationships";
import { ANCHOR_NODE_TYPE } from "../types";
import type { GraphService } from "./GraphService";
import type { NodeService } from "./NodeService";
import type { EdgeService } from "./EdgeService";
import type { EventBus } from "./EventBus";

/**
 * Maintains a flat index of graphId → Set<filterKey> for every graph in the
 * workspace, updated incrementally from edge events rather than recomputed from
 * scratch on every query.
 *
 * getSubtreeTypes(graphId) walks downward through childGraphId links and unions
 * the own keys of every reachable graph — so a collapsed component node whose
 * nested graph (or any of its descendants) contains a matching edge reports true.
 *
 * Re-render triggering: this is a plain class, not a reactive store. After each
 * mutation it calls onInvalidate(), which the caller should wire to
 * useFilterStore.getState().incrementIndexVersion() so any component reading
 * indexVersion from the store will re-render and re-query the index.
 */
export class RelationshipIndexService {
  // graphId → Set of filterKeys present in that graph's own edges
  private graphKeys = new Map<string, Set<string>>();
  // edgeId → graphId — needed because edge:deleted carries only edgeId
  private edgeToGraph = new Map<string, string>();

  private graphService: GraphService;
  private nodeService: NodeService;
  private edgeService: EdgeService;
  private onInvalidate: () => void;
  private unsubscribers: Array<() => void> = [];

  constructor(
    graphService: GraphService,
    nodeService: NodeService,
    edgeService: EdgeService,
    eventBus: EventBus,
    onInvalidate: () => void,
  ) {
    this.graphService = graphService;
    this.nodeService = nodeService;
    this.edgeService = edgeService;
    this.onInvalidate = onInvalidate;

    this.build();
    this.subscribe(eventBus);
  }

  // ── public API ─────────────────────────────────────────────────────────────

  /**
   * Returns the union of all filter keys present in the graph rooted at
   * graphId and every graph reachable by following Node.childGraphId links
   * downward. Cycle-safe via a visited set.
   */
  getSubtreeTypes(graphId: string): Set<string> {
    const result = new Set<string>();
    this.collectSubtreeTypes(graphId, result, new Set());
    return result;
  }

  /**
   * True when the graph rooted at graphId holds anything beyond the
   * auto-generated anchor node that references its parent. Used to decide
   * whether a node's nested-graph chevron should be shown: an empty nested
   * graph (anchor only) should not display the indicator.
   */
  hasContentBeyondAnchor(graphId: string): boolean {
    const graph = this.graphService.getGraph(graphId);
    if (!graph) return false;

    if (graph.edgeIds.length > 0) return true;

    for (const nodeId of graph.nodeIds) {
      const node = this.nodeService.getNode(nodeId);
      if (node && node.type !== ANCHOR_NODE_TYPE) return true;
    }

    return false;
  }

  dispose(): void {
    for (const unsub of this.unsubscribers) unsub();
    this.unsubscribers = [];
  }

  // ── index construction ─────────────────────────────────────────────────────

  private build(): void {
    this.graphKeys.clear();
    this.edgeToGraph.clear();

    for (const graph of this.graphService.getAllGraphs()) {
      const keys = new Set<string>();
      for (const edgeId of graph.edgeIds) {
        const edge = this.edgeService.getEdge(edgeId);
        if (!edge) continue;
        keys.add(getFilterKey(edge.relationship));
        this.edgeToGraph.set(edgeId, graph.id);
      }
      this.graphKeys.set(graph.id, keys);
    }
  }

  /**
   * Recompute the key set for a single graph from its current edgeIds.
   * Called after edge:deleted and edge:updated, since we can't cheaply
   * determine whether other edges in the same graph still carry the key.
   */
  private recomputeGraph(graphId: string): void {
    const graph = this.graphService.getGraph(graphId);
    if (!graph) {
      this.graphKeys.delete(graphId);
      return;
    }
    const keys = new Set<string>();
    for (const edgeId of graph.edgeIds) {
      const edge = this.edgeService.getEdge(edgeId);
      if (!edge) continue;
      keys.add(getFilterKey(edge.relationship));
    }
    this.graphKeys.set(graphId, keys);
  }

  // ── event subscriptions ────────────────────────────────────────────────────

  private subscribe(eventBus: EventBus): void {
    this.unsubscribers.push(
      // edge:created carries view.graphId — O(1) incremental add.
      eventBus.on("edge:created", (event) => {
        if (event.type !== "edge:created") return;
        const { edge, view } = event.payload;
        const key = getFilterKey(edge.relationship);
        this.edgeToGraph.set(edge.id, view.graphId);
        if (!this.graphKeys.has(view.graphId)) {
          this.graphKeys.set(view.graphId, new Set());
        }
        this.graphKeys.get(view.graphId)!.add(key);
        this.onInvalidate();
      }),

      // edge:deleted carries only edgeId — look up graphId from internal map,
      // then recompute that graph's key set (can't just remove the key since
      // other edges in the same graph may share it).
      eventBus.on("edge:deleted", (event) => {
        if (event.type !== "edge:deleted") return;
        const { edgeId } = event.payload;
        const graphId = this.edgeToGraph.get(edgeId);
        this.edgeToGraph.delete(edgeId);
        if (graphId) {
          this.recomputeGraph(graphId);
          this.onInvalidate();
        }
      }),

      // edge:updated may change relationship type/customLabel — recompute.
      eventBus.on("edge:updated", (event) => {
        if (event.type !== "edge:updated") return;
        const { edgeId } = event.payload;
        const graphId = this.edgeToGraph.get(edgeId);
        if (graphId) {
          this.recomputeGraph(graphId);
          this.onInvalidate();
        }
      }),
    );
  }

  // ── subtree walk ───────────────────────────────────────────────────────────

  private collectSubtreeTypes(
    graphId: string,
    result: Set<string>,
    visited: Set<string>,
  ): void {
    if (visited.has(graphId)) return; // cycle guard
    visited.add(graphId);

    // Own edges
    const ownKeys = this.graphKeys.get(graphId);
    if (ownKeys) {
      for (const key of ownKeys) result.add(key);
    }

    // Recurse into child graphs via Node.childGraphId
    const graph = this.graphService.getGraph(graphId);
    if (!graph) return;
    for (const nodeId of graph.nodeIds) {
      const node = this.nodeService.getNode(nodeId);
      if (node?.childGraphId) {
        this.collectSubtreeTypes(node.childGraphId, result, visited);
      }
    }
  }
}