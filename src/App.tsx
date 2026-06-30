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
import { CreateGraphCommand } from "./commands/CreateGraphCommand";
import { UpdateNodeCommand } from "./commands/UpdateNodeCommand";
import { DeleteNodeCommand } from "./commands/DeleteNodeCommand";
import { ResizeNodeCommand } from "./commands/ResizeNodeCommand";
import type { CanvasTool } from "./stores/useUIStore";
import { useNavigationStore } from "./stores/useNavigationStore";
import { useGraphStore } from "./stores/useGraphStore";
import { useUIStore } from "./stores/useUIStore";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import type { CommandContext, Graph, Node, NodeContentDocument } from "./types";

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
import { exists, readDir, readJSON } from "./utils/fileSystem";
import { loadGraph } from "./services/GraphService";
import { loadNode } from "./services/NodeService";

export default function App() {
  const [view, setView] = useState<"welcome" | "workspace">("welcome");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("Knowledge Graph");
  const [currentGraph, setCurrentGraph] = useState<Graph | null>(null);
  const [servicesReady, setServicesReady] = useState(false);

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
    document.documentElement.setAttribute("data-theme", uiStore.themeMode);
  }, [uiStore.themeMode]);

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
    const autosaveService = new AutosaveService(eventBus, graphService, workspaceService, navigationService);
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
    setServicesReady(true);

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

      const manifest = await s.workspaceService.create(path, name);
      const rootGraph = await s.graphService.create(name);
      manifest.rootGraphId = rootGraph.id;
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

      console.log("[open-workspace] step 1: opening workspace at", path);
      await s.workspaceService.open(path);
      const manifest = s.workspaceService.getManifest();
      if (!manifest) {
        console.warn("[open-workspace] step 1 FAILED: manifest is null");
        return;
      }
      console.log("[open-workspace] step 2: manifest loaded", { name: manifest.name, rootGraphId: manifest.rootGraphId });

      const nodesDir = await join(path, "nodes");
      console.log("[open-workspace] step 3: loading nodes from", nodesDir);
      if (await exists(nodesDir)) {
        const entries = await readDir(nodesDir);
        console.log("[open-workspace] step 3b: found", entries.length, "files in nodes dir");
        for (const entry of entries) {
          if (entry.name?.endsWith(".json")) {
            const nodePath = await join(nodesDir, entry.name);
            const result = await loadNode(nodePath, s.nodeService);
            console.log("[open-workspace] step 3c: loaded node", entry.name, result ? "ok" : "FAILED");
          }
        }
      } else {
        console.warn("[open-workspace] step 3: nodes dir does not exist");
      }

      const edgesDir = await join(path, "edges");
      console.log("[open-workspace] step 4: loading edges from", edgesDir);
      if (await exists(edgesDir)) {
        const entries = await readDir(edgesDir);
        console.log("[open-workspace] step 4b: found", entries.length, "files in edges dir");
        for (const entry of entries) {
          if (entry.name?.endsWith(".json")) {
            const edgePath = await join(edgesDir, entry.name);
            try {
              const edgeData: any = await readJSON(edgePath);
              s.edgeService.setEdge(edgeData);
              console.log("[open-workspace] step 4c: loaded edge", entry.name);
            } catch (e) {
              console.warn("[open-workspace] step 4c: failed to load edge", entry.name, e);
            }
          }
        }
      } else {
        console.warn("[open-workspace] step 4: edges dir does not exist");
      }

      const graphsDir = await join(path, "graphs");
      console.log("[open-workspace] step 5: loading graphs from", graphsDir);
      if (await exists(graphsDir)) {
        const entries = await readDir(graphsDir);
        console.log("[open-workspace] step 5b: found", entries.length, "files in graphs dir");
        for (const entry of entries) {
          if (entry.name?.endsWith(".json")) {
            const graphPath = await join(graphsDir, entry.name);
            const result = await loadGraph(graphPath, s.graphService);
            console.log("[open-workspace] step 5c: loaded graph", entry.name, result ? `ok (id=${result.id}, parentNodeId=${result.parentNodeId})` : "FAILED");
          }
        }
      } else {
        console.warn("[open-workspace] step 5: graphs dir does not exist");
      }

      console.log("[open-workspace] step 6: looking up root graph by manifest.rootGraphId =", manifest.rootGraphId);
      let rootGraph = s.graphService.getGraph(manifest.rootGraphId);
      console.log("[open-workspace] step 6 result:", rootGraph ? `found (name=${rootGraph.name})` : "NOT FOUND");

      if (!rootGraph) {
        const allGraphs = s.graphService.getAllGraphs();
        console.log("[open-workspace] step 6 fallback: total graphs loaded =", allGraphs.length);
        const rootCandidate = allGraphs.find((g) => !g.parentNodeId);
        if (rootCandidate) {
          console.log("[open-workspace] step 6 fallback: using graph without parentNodeId:", rootCandidate.id, rootCandidate.name);
          rootGraph = rootCandidate;
        } else if (allGraphs.length > 0) {
          console.log("[open-workspace] step 6 fallback: using first available graph:", allGraphs[0].id, allGraphs[0].name);
          rootGraph = allGraphs[0];
        } else {
          console.error("[open-workspace] step 6 fallback FAILED: no graphs loaded at all");
        }
      }

      if (rootGraph) {
        s.navigationService.reset(rootGraph.id);
        setCurrentGraph(rootGraph);
        navStore.setCurrentGraphId(rootGraph.id);
        navStore.setBreadcrumbs([{ graphId: rootGraph.id, graphName: rootGraph.name }]);
        console.log("[open-workspace] step 7: navigation initialized, currentGraph set");
      } else {
        console.error("[open-workspace] step 7 FAILED: no root graph available, will show loading screen");
      }

      setWorkspaceName(manifest.name);
      setView("workspace");
      setShowOpenDialog(false);
      console.log("[open-workspace] step 8: view switched to workspace");
    },
    [navStore],
  );

  const refreshGraph = useCallback(() => {
    const s = servicesRef.current;
    if (!s) return;
    const graphId = s.navigationService.getCurrentGraphId();
    if (!graphId) return;
    const graph = s.graphService.getGraph(graphId);
    console.log(
      "Refresh graph object",
      graph
    );
    console.log("Graph nodeIds:", graph?.nodeIds);
    if (graph) setCurrentGraph({ ...graph });
  }, []);

  const handleUndo = useCallback(async () => {
    const s = servicesRef.current;
    if (!s) return;
    await s.commandHistoryService.undo();
    refreshGraph();
  }, [refreshGraph]);

  const handleRedo = useCallback(async () => {
    const s = servicesRef.current;
    if (!s) return;
    await s.commandHistoryService.redo();
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

  const handleRenameNode = useCallback(
    async (nodeId: string, newLabel: string) => {
      const s = servicesRef.current;
      if (!s) return;
      const node = s.nodeService.getNode(nodeId);
      if (!node) return;
      const oldData: Partial<Node> = { label: node.label };
      const newData: Partial<Node> = { label: newLabel };
      await s.commandHistoryService.execute(new UpdateNodeCommand(nodeId, oldData, newData));
      refreshGraph();
    },
    [refreshGraph],
  );

  const handleAddNodeContent = useCallback(
    async (nodeId: string) => {
      const s = servicesRef.current;
      if (!s) return;
      const node = s.nodeService.getNode(nodeId);
      if (!node || node.content) return;

      const content: NodeContentDocument = {
        schemaVersion: 1,
        blocks: [{ id: crypto.randomUUID(), type: "paragraph", text: "" }],
      };

      await s.commandHistoryService.execute(
        new UpdateNodeCommand(nodeId, { content: node.content }, { content }),
      );
      refreshGraph();
    },
    [refreshGraph],
  );

  const handleUpdateNodeContent = useCallback(
    async (nodeId: string, content: NodeContentDocument) => {
      const s = servicesRef.current;
      if (!s) return;
      const node = s.nodeService.getNode(nodeId);
      if (!node) return;

      await s.commandHistoryService.execute(
        new UpdateNodeCommand(nodeId, { content: node.content }, { content }),
      );
      refreshGraph();
    },
    [refreshGraph],
  );

  const handleDeleteNode = useCallback(
    async (nodeId: string) => {
      const s = servicesRef.current;
      if (!s) return;
      const graphId = s.navigationService.getCurrentGraphId();
      if (!graphId) return;

      await s.commandHistoryService.execute(new DeleteNodeCommand(graphId, nodeId));
      console.log(
        s.graphService.getGraph(graphId)?.nodeIds
      );
      refreshGraph();
    },
    [refreshGraph],
  );

  const handleResizeNode = useCallback(
    async (nodeId: string, width: number, height: number) => {
      const s = servicesRef.current;
      if (!s) return;
      const graphId = s.navigationService.getCurrentGraphId();
      if (!graphId) return;
      const view = s.graphService.getGraph(graphId)?.views.nodeViews[nodeId];
      if (!view) return;

      await s.commandHistoryService.execute(
        new ResizeNodeCommand(
          graphId,
          nodeId,
          { width: view.width, height: view.height },
          { width, height },
        ),
      );
      refreshGraph();
    },
    [refreshGraph],
  );

  const handleOpenNodeGraph = useCallback(
    async (nodeId: string) => {
      const s = servicesRef.current;
      if (!s) return;
      const node = s.nodeService.getNode(nodeId);
      if (!node) return;

      let childGraphId = node.childGraphId;
      if (!childGraphId || !s.graphService.getGraph(childGraphId)) {
        await s.commandHistoryService.execute(new CreateGraphCommand(node.label, nodeId));
        childGraphId = s.nodeService.getNode(nodeId)?.childGraphId;
      }

      if (!childGraphId) return;
      s.navigationService.navigateToGraph(childGraphId, nodeId);
    },
    [],
  );

  const handleGoHome = useCallback(() => {
    setView("welcome");
  }, []);

  const handleCreateNode = useCallback(async () => {
    const s = servicesRef.current;
    if (!s) return;
    const graphId = s.navigationService.getCurrentGraphId();
    if (!graphId) return;
    const cmd = new CreateNodeCommand(graphId, "New Concept");
    await s.commandHistoryService.execute(cmd);
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
      console.log("[handleCreateEdge] dialog state:", { sourceId: dialog.sourceId, targetId: dialog.targetId, sourceHandle: dialog.sourceHandle, targetHandle: dialog.targetHandle });
      const cmd = new CreateEdgeCommand(
        s.navigationService.getCurrentGraphId() ?? "",
        dialog.sourceId,
        dialog.targetId,
        relationshipId as any,
        customLabel,
        dialog.sourceHandle ?? undefined,
        dialog.targetHandle ?? undefined,
      );
      await s.commandHistoryService.execute(cmd);
      refreshGraph();
      uiStore.closeCreateEdgeDialog();
    },
    [uiStore, refreshGraph],
  );

  const s = servicesRef.current;
  const recents = servicesReady && s ? s.workspaceService.getRecents() : [];

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
      <div className="w-full h-full flex items-center justify-center text-white/50" style={{ background: "var(--app-bg)" }}>
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
        onAddNode={handleCreateNode}
        onGoHome={handleGoHome}
        currentTool={uiStore.currentTool}
        onToolChange={(tool: CanvasTool) => uiStore.setCurrentTool(tool)}
        sidebar={
          uiStore.relationshipInspectorOpen && uiStore.selectedEdgeId ? (
            <RelationshipInspector
              edgeId={uiStore.selectedEdgeId}
              graphId={graphId}
              edgeService={s.edgeService}
              nodeService={s.nodeService}
              commandHistoryService={s.commandHistoryService}
              onClose={() => uiStore.closeRelationshipInspector()}
              onGraphChanged={refreshGraph}
            />
          ) : undefined
        }
      >
        <GraphCanvas
          graph={currentGraph}
          converterService={s.converterService}
          commandHistoryService={s.commandHistoryService}
          onRenameNode={handleRenameNode}
          onAddNodeContent={handleAddNodeContent}
          onUpdateNodeContent={handleUpdateNodeContent}
          onResizeNode={handleResizeNode}
          onOpenNodeGraph={handleOpenNodeGraph}
          onDeleteNode={handleDeleteNode}
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
