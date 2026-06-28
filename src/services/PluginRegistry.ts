import type React from "react";
import type { NodeProps, EdgeProps } from "@xyflow/react";
import type { Plugin, PluginContext, Command } from "../types";
import type { EventBus } from "./EventBus";
import type { NodeService } from "./NodeService";
import type { EdgeService } from "./EdgeService";
import type { GraphService } from "./GraphService";
import type { NavigationService } from "./NavigationService";

export class PluginRegistry {
  private plugins = new Map<string, Plugin>();
  private nodeTypes = new Map<string, React.ComponentType<NodeProps>>();
  private edgeTypes = new Map<string, React.ComponentType<EdgeProps>>();
  private commands = new Map<string, Command>();

  private ctx: PluginContext;

  constructor(
    eventBus: EventBus,
    nodeService: NodeService,
    edgeService: EdgeService,
    graphService: GraphService,
    navigationService: NavigationService,
  ) {
    this.ctx = {
      eventBus,
      nodeService,
      edgeService,
      graphService,
      navigationService,
      registerNodeType: (type, component) => {
        this.nodeTypes.set(type, component);
      },
      registerEdgeType: (type, component) => {
        this.edgeTypes.set(type, component);
      },
      registerCommand: (command) => {
        this.commands.set(command.type, command);
      },
    };

    eventBus.on("node:created", (event) => {
      this.callPluginHooks("onNodeCreated", (p) => p.onNodeCreated?.((event as any).payload.node));
    });

    eventBus.on("node:deleted", (event) => {
      this.callPluginHooks("onNodeDeleted", (p) => p.onNodeDeleted?.((event as any).payload.nodeId));
    });

    eventBus.on("node:updated", (event) => {
      this.callPluginHooks("onNodeUpdated", (p) =>
        p.onNodeUpdated?.((event as any).payload.nodeId, (event as any).payload.changes),
      );
    });

    eventBus.on("edge:created", (event) => {
      this.callPluginHooks("onEdgeCreated", (p) => p.onEdgeCreated?.((event as any).payload.edge));
    });

    eventBus.on("edge:deleted", (event) => {
      this.callPluginHooks("onEdgeDeleted", (p) => p.onEdgeDeleted?.((event as any).payload.edgeId));
    });

    eventBus.on("edge:updated", (event) => {
      this.callPluginHooks("onEdgeUpdated", (p) =>
        p.onEdgeUpdated?.((event as any).payload.edgeId, (event as any).payload.changes),
      );
    });

    eventBus.on("graph:created", (event) => {
      this.callPluginHooks("onGraphChanged", (p) =>
        p.onGraphChanged?.((event as any).payload.graph.id, (event as any).payload.graph),
      );
    });

    eventBus.on("workspace:opened", (event) => {
      this.callPluginHooks("onWorkspaceOpened", (p) =>
        p.onWorkspaceOpened?.((event as any).payload.manifest),
      );
    });
  }

  private callPluginHooks(_hook: string, fn: (plugin: Plugin) => void): void {
    for (const plugin of this.plugins.values()) {
      fn(plugin);
    }
  }

  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.id)) {
      console.warn(`Plugin "${plugin.id}" is already registered. Skipping.`);
      return;
    }
    this.plugins.set(plugin.id, plugin);
    plugin.activate(this.ctx);
  }

  unregister(id: string): void {
    const plugin = this.plugins.get(id);
    if (plugin?.deactivate) {
      plugin.deactivate();
    }
    this.plugins.delete(id);
  }

  getNodeType(type: string): React.ComponentType<NodeProps> | undefined {
    return this.nodeTypes.get(type);
  }

  getEdgeType(type: string): React.ComponentType<EdgeProps> | undefined {
    return this.edgeTypes.get(type);
  }

  getAllNodeTypes(): [string, React.ComponentType<NodeProps>][] {
    return Array.from(this.nodeTypes.entries());
  }

  getAllCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  getCommand(type: string): Command | undefined {
    return this.commands.get(type);
  }

  getPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }
}
