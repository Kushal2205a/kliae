import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { EventBus } from "./services/EventBus";
import { PluginRegistry } from "./services/PluginRegistry";
import { WorkspaceService } from "./services/WorkspaceService";
import { NodeService } from "./services/NodeService";
import { EdgeService } from "./services/EdgeService";
import { GraphService } from "./services/GraphService";
import { NavigationService } from "./services/NavigationService";
import { ConverterService } from "./services/ConverterService";
import { CommandHistoryService } from "./services/CommandHistoryService";
import { AutosaveService } from "./services/AutosaveService";
import { WorkspaceValidator } from "./services/WorkspaceValidator";
import { CreateNodeCommand } from "./commands/CreateNodeCommand";
import { CreateEdgeCommand } from "./commands/CreateEdgeCommand";
import { useNavigationStore } from "./stores/useNavigationStore";
import { useGraphStore } from "./stores/useGraphStore";
import { useUIStore } from "./stores/useUIStore";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import type { CommandContext, Graph } from "./types";

import WelcomeScreen from "./components/Welcome/WelcomeScreen";
import CreateWorkspaceDialog from "./components/Welcome/CreateWorkspaceDialog";
import OpenWorkspaceDialog from "./components/Welcome/OpenWorkspaceDialog";
import AppShell from "./components/Layout/AppShell";
import GraphCanvas from "./components/Graph/GraphCanvas";
import RelationshipInspector from "./components/Panels/RelationshipInspector";
import EdgeCreationDialog from "./components/Panels/EdgeCreationDialog";
import CommandPalette from "./components/CommandPalette/CommandPalette";
import ValidationOverlay from "./components/Validation/ValidationOverlay";
import { join } from "@tauri-apps/api/path";
import { exists, readDir } from "@tauri-apps/plugin-fs";
import { readJSON } from "./utils/fileSystem";
import { loadGraph } from "./services/GraphService";
import { loadNode } from "./services/NodeService";

export default function App() {
  const [view, setView] = useState<"welcome" | "workspace">("welcome");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("Knowledge Graph");
  const [currentGraph, setCurrentGraph] = useState<Graph | null>(null);

  const servicesRef = useRef<{
    eventBus: EventBus;
    workspaceService: WorkspaceService;
    nodeService: NodeService;
    edgeService: EdgeService;
    graphService: GraphService;
    navigationService: NavigationService;
    converterService: ConverterService;
    commandHistoryService: CommandHistoryService;
    autosaveService: AutosaveService;
    validator: WorkspaceValidator;
    pluginRegistry: PluginRegistry;
  } | null>(null);

  const navStore = useNavigationStore();
  const graphStore = useGraphStore();
  const uiStore = useUIStore();

  useEffect(() => {
    const eventBus = new EventBus();
    const workspaceService = new WorkspaceService(eventBus);
    const nodeService = new NodeService(workspaceService, eventBus);
    const edgeService = new EdgeService(workspaceService, eventBus);
    const graphService = new GraphService(workspaceService, eventBus);
    const navigationService = new NavigationService(graphService, nodeService, eventBus);
    const converterService = new ConverterService(nodeService, edgeService);
    const validator = new WorkspaceValidator(nodeService, edgeService, graphService, workspaceService);

    const commandCtx: CommandContext = {
      eventBus,
      nodeService,
      edgeService,
      graphService,
      workspaceService,
      navigationService,
    };
    const commandHistoryService = new CommandHistoryService(commandCtx);
    const autosaveService = new AutosaveService(eventBus, graphService, workspaceService);
    const pluginRegistry = new PluginRegistry(eventBus, nodeService, edgeService, graphService, navigationService);

    servicesRef.current = {
      eventBus,
      workspaceService,
      nodeService,
      edgeService,
      graphService,
      navigationService,
      converterService,
      commandHistoryService,
      autosaveService,
      validator,
      pluginRegistry,
    };

    autosaveService.start();

    const unsubNavigated = eventBus.on("graph:navigated", (e) => {
      const event = e as any;
      const toGraphId = event.payload.toGraphId;
      if (toGraphId) {
        const graph = graphService.getGraph(toGraphId);
        if (graph) {
          setCurrentGraph(graph);
          navStore.setCurrentGraphId(graph.id);
          navStore.setBreadcrumbs(navigationService.getBreadcrumbs());
          navStore.setCanGoBack(navigationService.canGoBack());
          navStore.setCanGoForward(navigationService.canGoForward());
        }
      }
    });

    return () => {
      autosaveService.stop();
      unsubNavigated();
    };
  }, []);

  const handleCreateWorkspace = useCallback(
    async (path: string, name: string) => {
      const s = servicesRef.current;
      if (!s) return;

      await s.workspaceService.create(path, name);
      const rootGraph = await s.graphService.create(name);
      await s.workspaceService.save();
      s.navigationService.reset(rootGraph.id);

      setWorkspaceName(name);
      setCurrentGraph(rootGraph);
      navStore.setCurrentGraphId(rootGraph.id);
      navStore.setBreadcrumbs([{ graphId: rootGraph.id, graphName: name }]);
      setView("workspace");
      setShowCreateDialog(false);
    },
    [navStore],
  );

  const handleOpenWorkspace = useCallback(
    async (path: string) => {
      const s = servicesRef.current;
      if (!s) return;

      await s.workspaceService.open(path);
      const manifest = s.workspaceService.getManifest();
      if (!manifest) return;

      const nodesDir = await join(path, "nodes");
      if (await exists(nodesDir)) {
        const entries = await readDir(nodesDir);
        for (const entry of entries) {
          if (entry.name?.endsWith(".json")) {
            const nodePath = await join(nodesDir, entry.name);
            await loadNode(nodePath, s.nodeService);
          }
        }
      }

      const edgesDir = await join(path, "edges");
      if (await exists(edgesDir)) {
        const entries = await readDir(edgesDir);
        for (const entry of entries) {
          if (entry.name?.endsWith(".json")) {
            const edgePath = await join(edgesDir, entry.name);
            try {
              const edgeData: any = await readJSON(edgePath);
              s.edgeService.setEdge(edgeData);
            } catch {}
          }
        }
      }

      const graphsDir = await join(path, "graphs");
      if (await exists(graphsDir)) {
        const entries = await readDir(graphsDir);
        for (const entry of entries) {
          if (entry.name?.endsWith(".json")) {
            const graphPath = await join(graphsDir, entry.name);
            await loadGraph(graphPath, s.graphService);
          }
        }
      }

      const rootGraph = s.graphService.getGraph(manifest.rootGraphId);
      if (rootGraph) {
        s.navigationService.reset(rootGraph.id);
        setCurrentGraph(rootGraph);
        navStore.setCurrentGraphId(rootGraph.id);
        navStore.setBreadcrumbs([{ graphId: rootGraph.id, graphName: rootGraph.name }]);
      }

      setWorkspaceName(manifest.name);
      setView("workspace");
      setShowOpenDialog(false);
    },
    [navStore],
  );

  const refreshGraph = useCallback(() => {
    const s = servicesRef.current;
    if (!s) return;
    const graphId = s.navigationService.getCurrentGraphId();
    if (!graphId) return;
    const graph = s.graphService.getGraph(graphId);
    if (graph) setCurrentGraph({ ...graph });
  }, []);

  const handleUndo = useCallback(() => {
    const s = servicesRef.current;
    if (!s) return;
    s.commandHistoryService.undo();
    refreshGraph();
  }, [refreshGraph]);

  const handleRedo = useCallback(() => {
    const s = servicesRef.current;
    if (!s) return;
    s.commandHistoryService.redo();
    refreshGraph();
  }, [refreshGraph]);

  const handleNavigateBreadcrumb = useCallback(
    (index: number) => {
      const s = servicesRef.current;
      if (!s) return;
      s.navigationService.navigateToBreadcrumb(index);
    },
    [],
  );

  const handleCreateNode = useCallback(() => {
    const s = servicesRef.current;
    if (!s) return;
    const graphId = s.navigationService.getCurrentGraphId();
    if (!graphId) return;
    const cmd = new CreateNodeCommand(graphId, "New Concept");
    s.commandHistoryService.execute(cmd);
    refreshGraph();
  }, [refreshGraph]);

  const shortcuts = useMemo(
    () => ({
      "ctrl+z": handleUndo,
      "ctrl+shift+z": handleRedo,
      "ctrl+n": handleCreateNode,
      "ctrl+shift+p": () => uiStore.openCommandPalette(),
      escape: () => {
        if (uiStore.commandPaletteOpen) uiStore.closeCommandPalette();
      },
    }),
    [handleUndo, handleRedo, handleCreateNode, uiStore],
  );

  useKeyboardShortcuts(shortcuts);

  const handleCreateEdge = useCallback(
    async (relationshipId: string, customLabel?: string) => {
      const s = servicesRef.current;
      if (!s) return;
      const dialog = uiStore.createEdgeDialog;
      if (!dialog.sourceId || !dialog.targetId) return;
      const cmd = new CreateEdgeCommand(
        s.navigationService.getCurrentGraphId() ?? "",
        dialog.sourceId,
        dialog.targetId,
        relationshipId as any,
        customLabel,
      );
      await (s.commandHistoryService.execute as any)(cmd);
      refreshGraph();
      uiStore.closeCreateEdgeDialog();
    },
    [uiStore, refreshGraph],
  );

  const s = servicesRef.current;
  const recents = s?.workspaceService.getRecents() ?? [];

  if (view === "welcome") {
    return (
      <>
        <WelcomeScreen
          recents={recents}
          onCreateWorkspace={() => setShowCreateDialog(true)}
          onOpenWorkspace={() => setShowOpenDialog(true)}
          onOpenRecent={handleOpenWorkspace}
        />
        {showCreateDialog && (
          <CreateWorkspaceDialog
            onConfirm={handleCreateWorkspace}
            onCancel={() => setShowCreateDialog(false)}
          />
        )}
        {showOpenDialog && (
          <OpenWorkspaceDialog
            onConfirm={handleOpenWorkspace}
            onCancel={() => setShowOpenDialog(false)}
          />
        )}
      </>
    );
  }

  if (!s || !currentGraph) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#13131a] text-white/50">
        Loading...
      </div>
    );
  }

  const graphId = currentGraph.id;
  const sourceNodeName =
    uiStore.createEdgeDialog.sourceId && s.nodeService.getNode(uiStore.createEdgeDialog.sourceId)?.label;
  const targetNodeName =
    uiStore.createEdgeDialog.targetId && s.nodeService.getNode(uiStore.createEdgeDialog.targetId)?.label;
  const issues = graphStore.validationIssues;
  const sourceLabel = sourceNodeName ?? "";
  const targetLabel = targetNodeName ?? "";

  return (
    <>
      <AppShell
        workspaceName={workspaceName}
        breadcrumbs={navStore.breadcrumbs}
        canUndo={s.commandHistoryService.canUndo()}
        canRedo={s.commandHistoryService.canRedo()}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onNavigateBreadcrumb={handleNavigateBreadcrumb}
        onOpenCommandPalette={() => uiStore.openCommandPalette()}
        sidebar={
          uiStore.relationshipInspectorOpen && uiStore.selectedEdgeId ? (
            <RelationshipInspector
              edgeId={uiStore.selectedEdgeId}
              graphId={graphId}
              edgeService={s.edgeService}
              nodeService={s.nodeService}
              commandHistoryService={s.commandHistoryService}
              onClose={() => uiStore.closeRelationshipInspector()}
            />
          ) : undefined
        }
      >
        <GraphCanvas
          graph={currentGraph}
          converterService={s.converterService}
          commandHistoryService={s.commandHistoryService}
          graphService={s.graphService}
          navigationService={s.navigationService}
        />
        <ValidationOverlay
          issues={issues}
          onDismiss={() => graphStore.setValidationIssues([])}
        />
      </AppShell>

      {uiStore.createEdgeDialog.open && !!sourceLabel && !!targetLabel && (
        <EdgeCreationDialog
          sourceLabel={sourceLabel}
          targetLabel={targetLabel}
          onConfirm={handleCreateEdge}
          onCancel={() => uiStore.closeCreateEdgeDialog()}
        />
      )}

      {uiStore.commandPaletteOpen && (
        <CommandPalette
          commands={[
            { type: "create-node", label: "Create Concept Node", shortcut: "Ctrl+N" },
            { type: "undo", label: "Undo", shortcut: "Ctrl+Z" },
            { type: "redo", label: "Redo", shortcut: "Ctrl+Shift+Z" },
          ]}
          onExecute={(cmd) => {
            if (cmd.type === "create-node") handleCreateNode();
            if (cmd.type === "undo") handleUndo();
            if (cmd.type === "redo") handleRedo();
          }}
          onClose={() => uiStore.closeCommandPalette()}
        />
      )}
    </>
  );
}
