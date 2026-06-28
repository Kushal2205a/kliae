import type React from "react";
import type { NodeProps, EdgeProps } from "@xyflow/react";
import type { Command } from "./command";
import type { AppEvent } from "./event";
import type { Node, Edge, Graph } from "./graph";
import type { WorkspaceManifest } from "./workspace";
import type { EventBus } from "../services/EventBus";
import type { NodeService } from "../services/NodeService";
import type { EdgeService } from "../services/EdgeService";
import type { GraphService } from "../services/GraphService";
import type { NavigationService } from "../services/NavigationService";

export interface PluginContext {
  eventBus: EventBus;
  nodeService: NodeService;
  edgeService: EdgeService;
  graphService: GraphService;
  navigationService: NavigationService;
  registerNodeType(type: string, component: React.ComponentType<NodeProps>): void;
  registerEdgeType(type: string, component: React.ComponentType<EdgeProps>): void;
  registerCommand(command: Command): void;
}

export interface Plugin {
  id: string;
  name: string;
  version: string;
  activate(ctx: PluginContext): void;
  deactivate?(): void;
  onWorkspaceOpened?(manifest: WorkspaceManifest): void;
  onWorkspaceClosed?(id: string): void;
  onNodeCreated?(node: Node): void;
  onNodeDeleted?(id: string): void;
  onNodeUpdated?(id: string, changes: Partial<Node>): void;
  onEdgeCreated?(edge: Edge): void;
  onEdgeDeleted?(id: string): void;
  onEdgeUpdated?(id: string, changes: Partial<Edge>): void;
  onGraphChanged?(id: string, graph: Graph): void;
}
