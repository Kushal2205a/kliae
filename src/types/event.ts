import type { Node, Edge, Graph, NodeView, EdgeView } from "./graph";
import type { WorkspaceManifest } from "./workspace";

export type AppEvent =
  | { type: "node:created"; payload: { node: Node; view: NodeView } }
  | { type: "node:deleted"; payload: { nodeId: string } }
  | { type: "node:updated"; payload: { nodeId: string; changes: Partial<Node> } }
  | { type: "node:viewUpdated"; payload: { nodeId: string; graphId: string; view: Partial<NodeView> } }
  | { type: "edge:created"; payload: { edge: Edge; view: EdgeView } }
  | { type: "edge:deleted"; payload: { edgeId: string } }
  | { type: "edge:updated"; payload: { edgeId: string; changes: Partial<Edge> } }
  | { type: "graph:created"; payload: { graph: Graph } }
  | { type: "graph:deleted"; payload: { graphId: string } }
  | { type: "graph:navigated"; payload: { fromGraphId?: string; toGraphId: string } }
  | { type: "workspace:opened"; payload: { manifest: WorkspaceManifest; path: string } }
  | { type: "workspace:saved"; payload: { path: string } };
