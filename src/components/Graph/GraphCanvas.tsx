import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Connection,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import ConceptNode from "./ConceptNode";
import AnchorNode from "./AnchorNode";
import CustomEdge from "./CustomEdge";
import { BUILTIN_RELATIONSHIPS, getFilterKey, getRelationshipMarkerKey } from "../../constants/relationships";
import { useUIStore } from "../../stores/useUIStore";
import { useFilterStore } from "../../stores/useFilterStore";
import { GraphCallbacksProvider } from "./GraphCallbacks";
import { CanvasRenderer } from "../Canvas/CanvasRenderer";
import { CanvasOverlay } from "../Canvas/CanvasOverlay";
import { MoveNodeCommand } from "../../commands/MoveNodeCommand";
import { CreateCanvasObjectCommand, UpdateCanvasObjectCommand, DeleteCanvasObjectCommand } from "../../commands/CanvasCommands";
import { DeleteEdgeCommand } from "../../commands/DeleteEdgeCommand";
import { DeleteNodesCommand } from "../../commands/DeleteNodesCommand";
import { PasteWithEdgesCommand, type PasteEdgeInput } from "../../commands/PasteWithEdgesCommand";
import { PasteNodesCommand, type PasteNodeInput } from "../../commands/PasteNodesCommand";
import type { ConverterService } from "../../services/ConverterService";
import type { CommandHistoryService } from "../../services/CommandHistoryService";
import type { WorkspaceService } from "../../services/WorkspaceService";
import type { Graph, CanvasObject, DragOverride, NodeContentDocument } from "../../types";
import { DEFAULT_CANVAS_STYLE, ANCHOR_NODE_TYPE } from "../../types";

const nodeTypes = { concept: ConceptNode, anchor: AnchorNode };
const edgeTypes = { "custom-edge": CustomEdge };
const EDGE_MARKER_REF_X = 0.5;

function hitTestCanvasObject(pos: { x: number; y: number }, obj: CanvasObject): boolean {
  if (obj.type === "ellipse") {
    const cx = obj.x + obj.width / 2;
    const cy = obj.y + obj.height / 2;
    const rx = Math.max(1, obj.width / 2);
    const ry = Math.max(1, obj.height / 2);
    return ((pos.x - cx) ** 2) / (rx ** 2) + ((pos.y - cy) ** 2) / (ry ** 2) <= 1;
  }
  return pos.x >= obj.x && pos.x <= obj.x + obj.width && pos.y >= obj.y && pos.y <= obj.y + obj.height;
}

/** Single source of truth for a flow node's rendered width/height. */
function getNodeDims(node: any): { width: number; height: number } {
  const width = node.measured?.width ?? node.width ?? (typeof node.data?.width === "number" ? node.data.width : 160);
  const height = node.measured?.height ?? node.height ?? (typeof node.data?.height === "number" ? node.data.height : 56);
  return { width, height };
}

function rectsOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return !(
    a.x + a.width <= b.x ||
    a.x >= b.x + b.width ||
    a.y + a.height <= b.y ||
    a.y >= b.y + b.height
  );
}

type Rect = { x: number; y: number; width: number; height: number };

// Default dims assumed for a brand-new node before it has rendered/measured
// itself. Matches BaseNode's fallback width/height.
const NEW_NODE_WIDTH = 160;
const NEW_NODE_HEIGHT = 56;

const NEW_IMAGE_NODE_WIDTH = 280;
const NEW_IMAGE_NODE_HEIGHT = 220;

function stripExtension(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx > 0 ? filename.slice(0, idx) : filename;
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      result ? resolve(result) : reject(new Error("Failed to read file"));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}


const SPAWN_VIEWPORT_TRIES = 20;
const SPAWN_EXPANSION_ROUNDS = 3;
const SPAWN_EXPANSION_TRIES_PER_ROUND = 15;
const SPAWN_EXPANSION_STEP = 0.25; // +25% of original viewport size per round

const SPAWN_CASCADE_STEP = 32;
const SPAWN_CASCADE_MAX_TRIES = 40;

function collectExistingRects(existingNodes: any[]): Rect[] {
  return existingNodes
    .map((node) => {
      const position = node.positionAbsolute ?? node.position;
      if (!position) return null;
      const { width, height } = getNodeDims(node);
      return { x: position.x, y: position.y, width, height };
    })
    .filter((r): r is Rect => r !== null);
}

function candidateCollides(candidate: { x: number; y: number }, existingRects: Rect[]): boolean {
  const candidateRect: Rect = { ...candidate, width: NEW_NODE_WIDTH, height: NEW_NODE_HEIGHT };
  return existingRects.some((r) => rectsOverlap(candidateRect, r));
}

/** Uniformly random point inside `rect`, inset so the new node fully fits within it. */
function randomPointInRect(rect: Rect): { x: number; y: number } {
  const minX = rect.x;
  const maxX = rect.x + rect.width - NEW_NODE_WIDTH;
  const minY = rect.y;
  const maxY = rect.y + rect.height - NEW_NODE_HEIGHT;

  const x = maxX > minX ? minX + Math.random() * (maxX - minX) : rect.x + rect.width / 2 - NEW_NODE_WIDTH / 2;
  const y = maxY > minY ? minY + Math.random() * (maxY - minY) : rect.y + rect.height / 2 - NEW_NODE_HEIGHT / 2;
  return { x, y };
}

/** `rect` padded outward by `factor` of its own width/height on every side. */
function expandRect(rect: Rect, factor: number): Rect {
  const padX = rect.width * factor;
  const padY = rect.height * factor;
  return { x: rect.x - padX, y: rect.y - padY, width: rect.width + padX * 2, height: rect.height + padY * 2 };
}

/**
 * Last-resort fallback: walks a diagonal cascade (like Figma/Miro paste
 * offset) from `origin` until it finds a spot that doesn't overlap any
 * existing node. Always terminates.
 */
function cascadeFallback(origin: { x: number; y: number }, existingRects: Rect[]): { x: number; y: number } {
  let candidate = { x: origin.x, y: origin.y };
  for (let i = 0; i < SPAWN_CASCADE_MAX_TRIES; i++) {
    if (!candidateCollides(candidate, existingRects)) return candidate;
    candidate = { x: origin.x + SPAWN_CASCADE_STEP * (i + 1), y: origin.y + SPAWN_CASCADE_STEP * (i + 1) };
  }
  return candidate;
}

/**
 * Picks a random, node-free spawn point within the current viewport.
 * Phase 1: sample randomly inside the visible viewport rect.
 * Phase 2: if the viewport is packed, expand the search rect outward in
 * three rounds (+25%, +50%, +75% of the original size) and keep sampling.
 * Phase 3: if still nothing, fall back to a guaranteed diagonal cascade
 * from the viewport center.
 */
function findFreeSpawnPosition(viewportRect: Rect, existingNodes: any[]): { x: number; y: number } {
  const existingRects = collectExistingRects(existingNodes);

  for (let i = 0; i < SPAWN_VIEWPORT_TRIES; i++) {
    const candidate = randomPointInRect(viewportRect);
    if (!candidateCollides(candidate, existingRects)) return candidate;
  }

  for (let round = 1; round <= SPAWN_EXPANSION_ROUNDS; round++) {
    const rect = expandRect(viewportRect, SPAWN_EXPANSION_STEP * round);
    for (let i = 0; i < SPAWN_EXPANSION_TRIES_PER_ROUND; i++) {
      const candidate = randomPointInRect(rect);
      if (!candidateCollides(candidate, existingRects)) return candidate;
    }
  }

  const origin = {
    x: viewportRect.x + viewportRect.width / 2 - NEW_NODE_WIDTH / 2,
    y: viewportRect.y + viewportRect.height / 2 - NEW_NODE_HEIGHT / 2,
  };
  return cascadeFallback(origin, existingRects);
}

function getFlowNodeCenter(node: any, positionOverride?: { x: number; y: number }): { x: number; y: number } | null {
  const position = positionOverride ?? node.positionAbsolute ?? node.position;
  if (!position) return null;

  const { width, height } = getNodeDims(node);
  return {
    x: position.x + width / 2,
    y: position.y + height / 2,
  };
}

function getCoveredNodeIds(obj: CanvasObject, flowNodes: any[]): string[] {
  return flowNodes
    .filter((node) => {
      const center = getFlowNodeCenter(node);
      return center ? hitTestCanvasObject(center, obj) : false;
    })
    .map((node) => node.id);
}

/** Returns IDs of other canvas objects whose centre falls inside `obj`. */
function getCoveredCanvasObjects(obj: CanvasObject, canvasObjects: CanvasObject[]): string[] {
  return canvasObjects
    .filter((other) => {
      if (other.id === obj.id) return false;
      const cx = other.x + other.width / 2;
      const cy = other.y + other.height / 2;
      return hitTestCanvasObject({ x: cx, y: cy }, obj);
    })
    .map((other) => other.id);
}

export interface GraphCanvasHandle {
  /** Finds a random, node-free spot to spawn a new node within (or near) the current viewport. */
  getSpawnPosition: () => { x: number; y: number };
  /** Copies the currently-selected nodes into the in-memory clipboard. No-op if nothing is selected. */
  copySelectedNodes: () => void;
  /** Pastes the clipboard as new nodes near the last known cursor position. No-op if the clipboard is empty. */
  pasteClipboard: () => void;
  /** Deletes all currently-selected nodes (and their edges) as one undoable step. No-op if nothing is selected. */
  deleteSelectedNodes: () => void;
}

interface GraphCanvasInnerProps {
  graph: Graph;
  focusPosition?: { x: number; y: number };
  converterService: ConverterService;
  commandHistoryService: CommandHistoryService;
  workspaceService: WorkspaceService;
  onRenameNode: (nodeId: string, newLabel: string) => void;
  onAddNodeContent: (nodeId: string) => void;
  onUpdateNodeContent: (nodeId: string, content: NodeContentDocument) => void;
  onResizeNode: (nodeId: string, width: number, height: number) => void;
  onOpenNodeGraph: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onGraphChanged: () => void;
}

const GraphCanvasInner = forwardRef<GraphCanvasHandle, GraphCanvasInnerProps>(function GraphCanvasInner({
  graph,
  focusPosition,
  converterService,
  commandHistoryService,
  workspaceService,
  onRenameNode,
  onAddNodeContent,
  onUpdateNodeContent,
  onResizeNode,
  onOpenNodeGraph,
  onDeleteNode,
  onGraphChanged,
}, ref) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const openCreateEdgeDialog = useUIStore((s) => s.openCreateEdgeDialog);
  const openRelationshipInspector = useUIStore((s) => s.openRelationshipInspector);
  const currentTool = useUIStore((s) => s.currentTool);
  const selectedCanvasObjectId = useUIStore((s) => s.selectedCanvasObjectId);
  const setSelectedCanvasObjectId = useUIStore((s) => s.setSelectedCanvasObjectId);
  const drawingState = useUIStore((s) => s.drawingState);
  const setCurrentTool = useUIStore((s) => s.setCurrentTool);
  const setDrawingState = useUIStore((s) => s.setDrawingState);
  const selectedNodeIds = useUIStore((s) => s.selectedNodeIds);
  const setSelectedNodeIds = useUIStore((s) => s.setSelectedNodeIds);
  const filterActive = useFilterStore((s) => s.active);
  const selectedFilterKeys = useFilterStore((s) => s.selectedKeys);
  const { screenToFlowPosition, getNodes, setCenter } = useReactFlow();

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => converterService.toReactFlow(graph),
    [graph, converterService],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // --- Selection clipboard + last-known cursor position (flow coords) ---
  // Clipboard lives in a ref (not the UI store): it's write-heavy on every
  // Ctrl+C and doesn't need to drive any re-render on its own.
  const clipboardRef = useRef<{
    nodes: { data: Record<string, unknown>; position: { x: number; y: number }; width?: number; height?: number }[];
    edges: { sourceIndex: number; targetIndex: number; relationshipId: string; customLabel?: string; sourceHandle?: string; targetHandle?: string }[];
  }>({ nodes: [], edges: [] });
  const lastCursorFlowPosRef = useRef<{ x: number; y: number } | null>(null);
  const [copyNotice, setCopyNotice] = useState<{ nodeCount: number; edgeCount: number } | null>(null);
  const copyNoticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onPaneMouseMove = useCallback(
    (event: React.MouseEvent) => {
      lastCursorFlowPosRef.current = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    },
    [screenToFlowPosition],
  );

  const copySelectedNodes = useCallback(() => {
    const selected = getNodes().filter((n: any) => n.selected && n.type !== ANCHOR_NODE_TYPE);
    if (selected.length === 0) return;

    const indexById = new Map(selected.map((n: any, i: number) => [n.id, i]));

    const copiedEdges = (edges as any[])
      .filter((e) => indexById.has(e.source) && indexById.has(e.target) && e.data?.relationshipType)
      .map((e) => ({
        sourceIndex: indexById.get(e.source)!,
        targetIndex: indexById.get(e.target)!,
        relationshipId: e.data.relationshipType as string,
        customLabel: e.data.customLabel as string | undefined,
        sourceHandle: e.sourceHandle as string | undefined,
        targetHandle: e.targetHandle as string | undefined,
      }));

    clipboardRef.current = {
      nodes: selected.map((n: any) => {
        // Deliberately do NOT use getNodeDims()/`measured` here. `measured`
        // is whatever the node's box happens to be rendered at right now,
        // which can include transient, selection-only chrome (e.g. the
        // expand chevron shown on a selected node). Baking that into the
        // pasted node's forced width/height permanently inflates its box
        // even after the chrome is gone. Only carry over a size the user
        // actually set explicitly (persisted on data.width/height) — an
        // un-resized node should paste at its own natural auto-size, same
        // as a brand-new node would.
        const width = typeof n.data?.width === "number" ? n.data.width : undefined;
        const height = typeof n.data?.height === "number" ? n.data.height : undefined;
        return { data: { ...n.data }, position: { ...n.position }, width, height };
      }),
      edges: copiedEdges,
    };

    if (copyNoticeTimeoutRef.current) clearTimeout(copyNoticeTimeoutRef.current);
    setCopyNotice({ nodeCount: selected.length, edgeCount: copiedEdges.length });
    copyNoticeTimeoutRef.current = setTimeout(() => setCopyNotice(null), 1600);
  }, [getNodes, edges]);

  const pasteClipboard = useCallback(() => {
    const clipboard = clipboardRef.current;
    if (clipboard.nodes.length === 0) return;

    // Anchor the paste near the last known cursor position, falling back to
    // a free spot in the viewport if the cursor was never tracked yet.
    const bounds = wrapperRef.current?.getBoundingClientRect();
    const fallbackAnchor = bounds
      ? findFreeSpawnPosition(
        {
          x: screenToFlowPosition({ x: bounds.left, y: bounds.top }).x,
          y: screenToFlowPosition({ x: bounds.left, y: bounds.top }).y,
          width: bounds.width,
          height: bounds.height,
        },
        getNodes(),
      )
      : { x: 0, y: 0 };
    const anchor = lastCursorFlowPosRef.current ?? fallbackAnchor;

    // Preserve relative layout between copied nodes: shift everyone by the
    // same delta so the group's top-left corner lands at `anchor`.
    const minX = Math.min(...clipboard.nodes.map((c) => c.position.x));
    const minY = Math.min(...clipboard.nodes.map((c) => c.position.y));

    const nodeInputs: PasteNodeInput[] = clipboard.nodes.map((c) => ({
      type: (c.data.type as string) ?? "concept",
      label: (c.data.label as string) ?? "Copy",
      tags: Array.isArray(c.data.tags) ? [...(c.data.tags as string[])] : [],
      content: c.data.content as any,
      position: { x: anchor.x + (c.position.x - minX), y: anchor.y + (c.position.y - minY) },
      width: c.width,
      height: c.height,
      color: c.data.color as string | undefined,
    }));

    const edgeInputs: PasteEdgeInput[] = clipboard.edges.map((e) => ({
      sourceIndex: e.sourceIndex,
      targetIndex: e.targetIndex,
      relationshipId: e.relationshipId as any,
      customLabel: e.customLabel,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    }));

    void (async () => {
      await commandHistoryService.execute(new PasteWithEdgesCommand(graph.id, nodeInputs, edgeInputs));
      onGraphChanged();
    })();
  }, [commandHistoryService, graph.id, getNodes, screenToFlowPosition, onGraphChanged]);

  const deleteSelectedNodes = useCallback(() => {
    const ids = getNodes()
      .filter((n: any) => n.selected && n.type !== ANCHOR_NODE_TYPE)
      .map((n: any) => (n.data?.nodeId as string | undefined) ?? n.id);
    if (ids.length === 0) return;
    void (async () => {
      await commandHistoryService.execute(new DeleteNodesCommand(graph.id, ids));
      onGraphChanged();
    })();
  }, [commandHistoryService, graph.id, getNodes, onGraphChanged]);

  const createImageNodeFromFile = useCallback(
    async (file: File, position: { x: number; y: number }) => {
      if (!file.type.startsWith("image/")) return;

      const src = await readFileAsDataURL(file);
      const label = stripExtension(file.name) || "Image";

      const nodeInput: PasteNodeInput = {
        type: "concept",
        label,
        tags: [],
        content: {
          schemaVersion: 1,
          blocks: [{ id: crypto.randomUUID(), type: "image", src, alt: file.name }],
        },
        position: {
          x: position.x - NEW_IMAGE_NODE_WIDTH / 2,
          y: position.y - NEW_IMAGE_NODE_HEIGHT / 2,
        },
        width: NEW_IMAGE_NODE_WIDTH,
        height: NEW_IMAGE_NODE_HEIGHT,
      };

      await commandHistoryService.execute(new PasteNodesCommand(graph.id, [nodeInput]));
      onGraphChanged();
    },
    [commandHistoryService, graph.id, onGraphChanged],
  );

  // Dropping image files from the OS directly onto the canvas
  const onDragOver = useCallback((event: React.DragEvent) => {
    if (event.dataTransfer.types.includes("Files")) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    }
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      const files = Array.from(event.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
      if (files.length === 0) return;
      event.preventDefault();

      const dropPosition = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      files.forEach((file, i) => {
        void createImageNodeFromFile(file, { x: dropPosition.x + i * 24, y: dropPosition.y + i * 24 });
      });
    },
    [screenToFlowPosition, createImageNodeFromFile],
  );

  // Pasting an image from the clipboard (e.g. a copied screenshot) onto the canvas
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      // Don't hijack paste while typing in a text field or the rich text editor
      if (active?.isContentEditable || active?.tagName === "INPUT" || active?.tagName === "TEXTAREA") {
        return;
      }

      const items = Array.from(event.clipboardData?.items ?? []);
      const imageFiles = items
        .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
        .map((item) => item.getAsFile())
        .filter((f): f is File => f !== null);

      if (imageFiles.length === 0) {
        // No image on the OS clipboard (e.g. the user copied our own nodes
        // with Ctrl+C), so fall back to the canvas's internal node clipboard.
        event.preventDefault();
        pasteClipboard();
        return;
      }
      event.preventDefault();

      const anchor = lastCursorFlowPosRef.current ?? { x: 0, y: 0 };
      imageFiles.forEach((file, i) => {
        void createImageNodeFromFile(file, { x: anchor.x + i * 24, y: anchor.y + i * 24 });
      });
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [createImageNodeFromFile, pasteClipboard]);

  useEffect(() => {
    return () => {
      if (copyNoticeTimeoutRef.current) clearTimeout(copyNoticeTimeoutRef.current);
    };
  }, []);

  useImperativeHandle(ref, () => ({
    getSpawnPosition: () => {
      const bounds = wrapperRef.current?.getBoundingClientRect();
      if (!bounds) return { x: 0, y: 0 };

      const topLeft = screenToFlowPosition({ x: bounds.left, y: bounds.top });
      const bottomRight = screenToFlowPosition({ x: bounds.right, y: bounds.bottom });
      const viewportRect = {
        x: topLeft.x,
        y: topLeft.y,
        width: bottomRight.x - topLeft.x,
        height: bottomRight.y - topLeft.y,
      };

      return findFreeSpawnPosition(viewportRect, getNodes());
    },
    copySelectedNodes,
    pasteClipboard,
    deleteSelectedNodes,
  }), [screenToFlowPosition, getNodes, copySelectedNodes, pasteClipboard, deleteSelectedNodes]);


  // --- Zip state: stores each bundle's current zip-point ratio (0–1) ---
  // Keyed by `${sourceNodeId}:${relationshipType}`.
  // Defaults to FORK_RATIO (0.30) when absent.
  const [zipTMap, setZipTMap] = useState<Map<string, number>>(new Map());

  // Stable callback passed into every bundle-leader edge so CustomEdge can
  // update the zip position without knowing about GraphCanvas internals.
  const onZipDrag = useCallback((bundleKey: string, newZipT: number) => {
    setZipTMap((prev) => {
      const next = new Map(prev);
      next.set(bundleKey, newZipT);
      return next;
    });
  }, []);

  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = converterService.toReactFlow(graph);
    setNodes(newNodes);
    setEdges(newEdges);
  }, [graph, converterService, setNodes, setEdges]);

  // Track the latest focusPosition without making the recenter effect
  // below depend on it directly. If it depended on focusPosition directly,
  // dragging a node around while already inside this graph would keep
  // yanking the camera back to it; instead we only want to look at it once,
  // at the moment navigation happens.
  const focusPositionRef = useRef(focusPosition);
  focusPositionRef.current = focusPosition;

  // The canvas is reused across graph navigation rather than remounted, so
  // `fitView` (which only runs on initial mount) never fires again once you
  // navigate to a different graph. Without this, whatever pan and zoom you
  // had in the previous graph carries straight over, and the node that
  // contextually matters here (either this graph's anchor when drilling
  // down, or the real node you just came from when breadcrumbing back up)
  // can land far outside the visible viewport. Recenter every time the
  // active graph changes, but only on actual navigation (graph.id), not on
  // every in place edit of the current graph.
  useEffect(() => {
    const pos = focusPositionRef.current;
    if (pos) {
      setCenter(pos.x, pos.y, { zoom: 1, duration: 250 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph.id, setCenter]);

  // Keep the UI store's selectedNodeIds in sync with React Flow's own
  // per-node `selected` flag, so other components (e.g. the selection
  // toolbar) can react to selection without reaching into ReactFlow state.
  useEffect(() => {
    const ids = nodes.filter((n: any) => n.selected).map((n: any) => n.id);
    const prev = selectedNodeIds;
    const changed = ids.length !== prev.length || ids.some((id, i) => id !== prev[i]);
    if (changed) setSelectedNodeIds(ids);
  }, [nodes, selectedNodeIds, setSelectedNodeIds]);



  // Edges surviving the active relationship filter. Must run BEFORE the
  // bundle-geometry pass below (finding 5 in the handoff): bundling off
  // raw `edges` would compute zip-points using edges that are about to be
  // hidden, producing wrong geometry for whatever actually remains.
  const filteredEdges = useMemo(() => {
    console.log({
      filterActive,
      selectedFilterKeys: [...selectedFilterKeys],
      edgeTypes: edges
        .filter((e) => e.data?.relationshipType)
        .map((e) => ({
          relationship: e.data!.relationshipType,
          custom: e.data?.customLabel,
          key: getFilterKey({
            id: e.data!.relationshipType,
            customLabel: e.data?.customLabel,
          }),
        })),
    });


    if (!filterActive || selectedFilterKeys.size === 0) return edges;
    return (edges as any[]).filter((edge) =>
      selectedFilterKeys.has(
        getFilterKey({ id: edge.data?.relationshipType, customLabel: edge.data?.customLabel }),
      ),
    );



  }, [edges, filterActive, selectedFilterKeys]);

  // When a filter is active, dim nodes that have no surviving edges so the
  // graph stays spatially readable. We don't remove them (that disrupts drag
  // state and position tracking) — we fade them instead. Nodes that are the
  // source OR target of at least one surviving edge stay full-opacity.
  const displayNodes = useMemo(() => {
    if (!filterActive || selectedFilterKeys.size === 0) return nodes;

    const connectedNodeIds = new Set<string>();
    for (const edge of filteredEdges as any[]) {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    }

    return (nodes as any[]).map((node) =>
      connectedNodeIds.has(node.id)
        ? node
        : {
          ...node,
          style: { ...node.style, opacity: 0.2, pointerEvents: "none" },
        },
    );
  }, [nodes, filteredEdges, filterActive, selectedFilterKeys]);


  //
  // Two-pass design:
  //   Pass 1 — iterate leader edges, compute the zip point (position + geometry)
  //            for each bundle and store in bundleDataMap.
  //   Pass 2 — map over ALL edges; any edge whose (source, relationshipType)
  //            belongs to a bundle gets the zip data injected so CustomEdge can
  //            render the trunk-then-diverge path and handle label dragging.
  const edgesWithOrigins = useMemo(() => {
    const FORK_RATIO = 0.30;
    const MIN_FORWARD_PX = 28;

    type BundleData = {
      zipX: number; zipY: number;
      bundleDx: number; bundleDy: number;
      bundleHx: number; bundleHy: number;
      bundleAxisLength: number;
    };
    const bundleDataMap = new Map<string, BundleData>();

    // --- Pass 1: build bundle geometry for every leader edge ---
    for (const edge of filteredEdges as any[]) {
      if (!edge.data?.isBundleLeader || !edge.data?.bundleTargetIds?.length) continue;

      const sourceNode = nodes.find((n: any) => n.id === edge.source);
      if (!sourceNode) continue;

      const { width: sw, height: sh } = getNodeDims(sourceNode);
      const sx = sourceNode.position.x + sw / 2;
      const sy = sourceNode.position.y + sh / 2;

      let dx = 0, dy = 0, count = 0;
      const targetCenters: { x: number; y: number }[] = [];

      for (const targetId of edge.data.bundleTargetIds) {
        const tn = nodes.find((n: any) => n.id === targetId);
        if (!tn) continue;
        const { width: tw, height: th } = getNodeDims(tn);
        const tx = tn.position.x + tw / 2;
        const ty = tn.position.y + th / 2;
        targetCenters.push({ x: tx, y: ty });
        dx += tx - sx;
        dy += ty - sy;
        count++;
      }

      if (count === 0) continue;

      const dirLen = Math.sqrt(dx * dx + dy * dy);
      if (dirLen > 0) { dx /= dirLen; dy /= dirLen; }

      // Compute perpendicular extents for vertical centering
      let minPerp = Infinity, maxPerp = -Infinity;
      if (dirLen > 0) {
        for (const { x: tx, y: ty } of targetCenters) {
          const perp = -(tx - sx) * dy + (ty - sy) * dx;
          if (perp < minPerp) minPerp = perp;
          if (perp > maxPerp) maxPerp = perp;
        }
      }

      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      const borderDist = Math.min(
        absX > 0.001 ? (sw / 2) / absX : Infinity,
        absY > 0.001 ? (sh / 2) / absY : Infinity,
      );

      const hx = sx + dx * (isFinite(borderDist) ? borderDist : 0);
      const hy = sy + dy * (isFinite(borderDist) ? borderDist : 0);

      // Average target centroid
      const avgTx = targetCenters.reduce((s, c) => s + c.x, 0) / count;
      const avgTy = targetCenters.reduce((s, c) => s + c.y, 0) / count;

      // Along-axis distance from source border to average target centroid.
      // This is the denominator for the zipT ratio and the drag projection.
      const borderToAvgAlongAxis = (avgTx - hx) * dx + (avgTy - hy) * dy;

      // Resolve the current zip ratio for this bundle.
      // Users can drag the label to change it; FORK_RATIO is the default.
      const bundleKey = `${edge.source}:${edge.data.relationshipType}:${edge.data.customLabel ?? ""}`;
      const zipT = zipTMap.get(bundleKey) ?? FORK_RATIO;
      const forwardDist = Math.max(borderToAvgAlongAxis * zipT, MIN_FORWARD_PX);

      const perpMid = isFinite(minPerp) ? (minPerp + maxPerp) / 2 : 0;

      bundleDataMap.set(bundleKey, {
        zipX: hx + dx * forwardDist + (-dy) * perpMid,
        zipY: hy + dy * forwardDist + (dx) * perpMid,
        bundleDx: dx,
        bundleDy: dy,
        bundleHx: hx,
        bundleHy: hy,
        // Guard against degenerate (zero-length) bundles.
        bundleAxisLength: Math.max(borderToAvgAlongAxis, 1),
      });
    }



    // --- Pass 2: annotate every surviving edge that belongs to a bundle ---
    return (filteredEdges as any[]).map((edge: any) => {
      const bundleKey = `${edge.source}:${edge.data?.relationshipType}:${edge.data?.customLabel ?? ""}`;
      const bundleData = bundleDataMap.get(bundleKey);

      // Singleton edges (no bundle) are returned unchanged — no behaviour diff.
      if (!bundleData) return edge;

      return {
        ...edge,
        data: {
          ...edge.data,
          // Keep bundleOriginX/Y for backward compat with any other consumers.
          bundleOriginX: bundleData.zipX,
          bundleOriginY: bundleData.zipY,
          // Zip-specific fields consumed by CustomEdge.
          zipX: bundleData.zipX,
          zipY: bundleData.zipY,
          bundleDx: bundleData.bundleDx,
          bundleDy: bundleData.bundleDy,
          bundleHx: bundleData.bundleHx,
          bundleHy: bundleData.bundleHy,
          bundleAxisLength: bundleData.bundleAxisLength,
          bundleKey,
          isInBundle: true,
          onZipDrag,
        },
      };
    });
  }, [nodes, filteredEdges, zipTMap, onZipDrag]);

  // --- Canvas drag overrides for real-time rendering ---
  const dragOverridesRef = useRef<Map<string, DragOverride>>(new Map());
  const groupedDragStartRef = useRef<{
    objectId: string;
    nodePositions: Map<string, { x: number; y: number }>;
    objectPositions: Map<string, { x: number; y: number }>;
  } | null>(null);
  const [tick, setTick] = useState(0);
  const forceRender = useCallback(() => setTick((t) => t + 1), []);

  // --- Canvas object selection via ReactFlow onPointerDown ---
  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (currentTool !== "select") return;
      const target = event.target as HTMLElement;
      if (target.closest(".react-flow__node, .react-flow__edge")) return;

      const pos = screenToFlowPosition({ x: event.clientX, y: event.clientY });

      for (let i = graph.canvas.objects.length - 1; i >= 0; i--) {
        const obj = graph.canvas.objects[i];
        if (hitTestCanvasObject(pos, obj)) {
          setSelectedCanvasObjectId(obj.id);
          event.preventDefault();
          return;
        }
      }

      setSelectedCanvasObjectId(null);
    },
    [currentTool, graph.canvas.objects, screenToFlowPosition, setSelectedCanvasObjectId],
  );

  // --- Node drag handling ---
  const onNodesChangeWrapper = useCallback(
    (changes: any) => {
      for (const change of changes) {
        if (change.type === "position" && change.dragging === false) {
          const node = nodes.find((n: any) => n.id === change.id);
          if (!node || !change.position) continue;
          void (async () => {
            const nId = node.data?.nodeId as string | undefined;
            if (nId) {
              await commandHistoryService.execute(
                new MoveNodeCommand(graph.id, nId, { x: node.position.x, y: node.position.y }, change.position),
              );
            }

            const movedCenter = getFlowNodeCenter(node, change.position);
            if (!movedCenter) return;

            for (const obj of graph.canvas.objects) {
              const groupedIds = (obj.properties?.groupedNodeIds as string[] | undefined) ?? [];
              if (!groupedIds.includes(change.id) || hitTestCanvasObject(movedCenter, obj)) continue;

              await commandHistoryService.execute(
                new UpdateCanvasObjectCommand(graph.id, obj.id, {
                  properties: {
                    ...obj.properties,
                    groupedNodeIds: groupedIds.filter((id) => id !== change.id),
                  },
                }),
              );
            }
          })();
        }
      }
      onNodesChange(changes);
    },
    [graph.id, graph.canvas.objects, nodes, commandHistoryService, onNodesChange],
  );

  // --- Edge handling ---
  const onEdgesChangeWrapper = useCallback(
    (changes: any) => {
      for (const change of changes) {
        if (change.type === "remove") {
          const edge = edges.find((e: any) => e.id === change.id);
          if (edge?.data?.edgeId) {
            commandHistoryService.execute(new DeleteEdgeCommand(graph.id, (edge.data as any).edgeId));
          }
        }
      }
      onEdgesChange(changes);
    },
    [graph.id, edges, commandHistoryService, onEdgesChange],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      openCreateEdgeDialog(connection.source, connection.target, connection.sourceHandle, connection.targetHandle);
    },
    [openCreateEdgeDialog],
  );

  const onNodeDoubleClick = useCallback(
    (_event: any, node: any) => {
      if (node.type === ANCHOR_NODE_TYPE) return;
      const data = node.data as any;
      if (data.nodeId) {
        onOpenNodeGraph(data.nodeId);
      }
    },
    [onOpenNodeGraph],
  );

  const onEdgeClick = useCallback(
    (_event: any, edge: any) => {
      if (edge.data?.edgeId) {
        openRelationshipInspector(edge.data.edgeId);
      }
    },
    [openRelationshipInspector],
  );

  // --- Canvas command helpers ---
  const executeCmd = useCallback(
    async (cmd: any) => {
      await commandHistoryService.execute(cmd);
    },
    [commandHistoryService],
  );

  const handleCreateObject = useCallback(
    (x: number, y: number, w: number, h: number) => {
      const id = crypto.randomUUID();
      const type = currentTool === "ellipse" ? "ellipse" : currentTool === "rounded-rectangle" ? "rounded-rectangle" : "rectangle";
      const obj: CanvasObject = {
        id,
        type,
        x,
        y,
        width: w,
        height: h,
        zIndex: graph.canvas.objects.length,
        style: { ...DEFAULT_CANVAS_STYLE, borderRadius: type === "rounded-rectangle" ? 8 : 0 },
      };
      executeCmd(new CreateCanvasObjectCommand(graph.id, obj));
    },
    [graph.id, graph.canvas.objects.length, currentTool, executeCmd],
  );

  const handleCommitMove = useCallback(
    async (id: string, x: number, y: number) => {
      const shape = graph.canvas.objects.find((o) => o.id === id);
      const oldX = shape?.x ?? 0;
      const oldY = shape?.y ?? 0;
      const groupedIds = shape?.properties?.groupedNodeIds as string[] | undefined;
      const groupedObjectIds = shape?.properties?.groupedObjectIds as string[] | undefined;
      const dragStart = groupedDragStartRef.current?.objectId === id ? groupedDragStartRef.current : null;

      await executeCmd(new UpdateCanvasObjectCommand(graph.id, id, { x, y }));
      const dx = x - oldX;
      const dy = y - oldY;
      if (dx === 0 && dy === 0) {
        groupedDragStartRef.current = null;
        return;
      }

      // Move direct child nodes
      if (groupedIds && groupedIds.length > 0) {
        const finalPositions = new Map<string, { x: number; y: number }>();
        for (const nodeId of groupedIds) {
          const node = nodes.find((n) => n.id === nodeId);
          const oldPos = dragStart?.nodePositions.get(nodeId) ?? (node ? { x: node.position.x - dx, y: node.position.y - dy } : null);
          if (!oldPos) continue;
          const newPos = { x: oldPos.x + dx, y: oldPos.y + dy };
          finalPositions.set(nodeId, newPos);
          await commandHistoryService.execute(new MoveNodeCommand(graph.id, nodeId, oldPos, newPos));
        }
        setNodes((nds) =>
          nds.map((node) => {
            const position = finalPositions.get(node.id);
            return position ? { ...node, position } : node;
          }),
        );
      }

      // Move inner canvas groups — clear their preview overrides first, then persist
      if (groupedObjectIds && groupedObjectIds.length > 0) {
        for (const objId of groupedObjectIds) {
          const innerObj = graph.canvas.objects.find((o) => o.id === objId);
          if (!innerObj) continue;
          dragOverridesRef.current.delete(objId);
          await executeCmd(new UpdateCanvasObjectCommand(graph.id, objId, {
            x: innerObj.x + dx,
            y: innerObj.y + dy,
          }));
        }
      }

      groupedDragStartRef.current = null;
    },
    [graph, executeCmd, commandHistoryService, setNodes, nodes, dragOverridesRef],
  );

  const handlePreviewMove = useCallback(
    (id: string, x: number, y: number) => {
      const shape = graph.canvas.objects.find((o) => o.id === id);
      const groupedIds = shape?.properties?.groupedNodeIds as string[] | undefined;
      const groupedObjectIds = shape?.properties?.groupedObjectIds as string[] | undefined;
      if (!shape) return;
      if ((!groupedIds || groupedIds.length === 0) && (!groupedObjectIds || groupedObjectIds.length === 0)) return;

      const dx = x - shape.x;
      const dy = y - shape.y;

      if (groupedDragStartRef.current?.objectId !== id) {
        groupedDragStartRef.current = {
          objectId: id,
          nodePositions: new Map(
            nodes
              .filter((node) => groupedIds?.includes(node.id))
              .map((node) => [node.id, { x: node.position.x, y: node.position.y }]),
          ),
          objectPositions: new Map(
            (groupedObjectIds ?? []).flatMap((objId) => {
              const inner = graph.canvas.objects.find((o) => o.id === objId);
              return inner ? [[objId, { x: inner.x, y: inner.y }] as [string, { x: number; y: number }]] : [];
            }),
          ),
        };
      }

      const { nodePositions, objectPositions } = groupedDragStartRef.current;

      // Preview-move direct child nodes
      setNodes((nds) =>
        nds.map((node) => {
          const start = nodePositions.get(node.id);
          return start ? { ...node, position: { x: start.x + dx, y: start.y + dy } } : node;
        }),
      );

      // Preview-move inner canvas groups (updates CanvasRenderer via dragOverridesRef)
      for (const [objId, startPos] of objectPositions) {
        dragOverridesRef.current.set(objId, { x: startPos.x + dx, y: startPos.y + dy });
      }
    },
    [graph.canvas.objects, nodes, setNodes, dragOverridesRef],
  );

  const handleCommitResize = useCallback(
    async (id: string, x: number, y: number, w: number, h: number) => {
      const obj = graph.canvas.objects.find((o) => o.id === id);
      const groupedIds = (obj?.properties?.groupedNodeIds as string[] | undefined) ?? [];
      const groupedObjectIds = (obj?.properties?.groupedObjectIds as string[] | undefined) ?? [];
      const changes: Record<string, unknown> = { x, y, width: w, height: h };

      if (obj && (groupedIds.length > 0 || groupedObjectIds.length > 0)) {
        const resizedObj: CanvasObject = { ...obj, x, y, width: w, height: h };
        changes.properties = {
          ...obj.properties,
          groupedNodeIds: getCoveredNodeIds(resizedObj, getNodes()),
          groupedObjectIds: getCoveredCanvasObjects(resizedObj, graph.canvas.objects),
        };
      }

      await executeCmd(new UpdateCanvasObjectCommand(graph.id, id, changes));
    },
    [graph.id, graph.canvas.objects, executeCmd, getNodes],
  );

  const handleDeleteObject = useCallback(
    async (id: string) => {
      setSelectedCanvasObjectId(null);
      await executeCmd(new DeleteCanvasObjectCommand(graph.id, id));
    },
    [graph.id, executeCmd, setSelectedCanvasObjectId],
  );

  const handleEditText = useCallback(
    async (id: string) => {
      const obj = graph.canvas.objects.find((o) => o.id === id);
      if (!obj) return;
      const newText = prompt("Edit text:", obj.text || "");
      if (newText !== null) {
        await executeCmd(new UpdateCanvasObjectCommand(graph.id, id, { text: newText || "" }));
      }
    },
    [graph.id, graph.canvas.objects, executeCmd],
  );

  const handleGroupNodes = useCallback(
    async (objectId: string) => {
      const obj = graph.canvas.objects.find((o) => o.id === objectId);
      if (!obj) return;

      const existing = (obj.properties?.groupedNodeIds as string[] | undefined) ?? [];
      const allNodes = getNodes();
      const nodeIdsToGroup = getCoveredNodeIds(obj, allNodes);
      const objectIdsToGroup = getCoveredCanvasObjects(obj, graph.canvas.objects);

      if (existing.length > 0) {
        await executeCmd(new UpdateCanvasObjectCommand(graph.id, objectId, {
          properties: { ...obj.properties, groupedNodeIds: [], groupedObjectIds: [] },
        }));
      } else if (nodeIdsToGroup.length > 0 || objectIdsToGroup.length > 0) {
        await executeCmd(new UpdateCanvasObjectCommand(graph.id, objectId, {
          properties: { ...obj.properties, groupedNodeIds: nodeIdsToGroup, groupedObjectIds: objectIdsToGroup },
        }));
      }
    },
    [graph.id, graph.canvas.objects, executeCmd, getNodes],
  );

  const customRelationships = workspaceService.getCustomRelationships();
  // Only recompute the marker defs when the set of custom relationships
  // actually changes (additive-only, so length is a sufficient signal) —
  // avoids rebuilding this SVG on every unrelated re-render.
  const customRelationshipsKey = customRelationships.map((r) => r.displayName).join("|");

  const edgeMarkers = useMemo(() => (
    <svg aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}>
      <defs>
        {BUILTIN_RELATIONSHIPS.map((rel) => (
          <marker
            key={rel.id}
            id={`edge-arrow-${rel.id}`}
            viewBox="-10 -10 20 20"
            refX={EDGE_MARKER_REF_X}
            refY="0"
            markerWidth="10"
            markerHeight="10"
            markerUnits="strokeWidth"
            orient="auto"
          >
            <polyline
              points="-5,-4 0,0 -5,4 -5,-4"
              fill={rel.color}
              stroke={rel.color}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </marker>
        ))}
        {customRelationships.map((rel) => (
          <marker
            key={getRelationshipMarkerKey({ id: "custom", customLabel: rel.displayName })}
            id={`edge-arrow-${getRelationshipMarkerKey({ id: "custom", customLabel: rel.displayName })}`}
            viewBox="-10 -10 20 20"
            refX={EDGE_MARKER_REF_X}
            refY="0"
            markerWidth="10"
            markerHeight="10"
            markerUnits="strokeWidth"
            orient="auto"
          >
            <polyline
              points="-5,-4 0,0 -5,4 -5,-4"
              fill={rel.color}
              stroke={rel.color}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </marker>
        ))}
      </defs>
    </svg>
  ), [customRelationshipsKey]);

  const hasNodes = graph.nodeIds.length > 0;
  const hasEdges = graph.edgeIds.length > 0;
  const hasCanvasObjects = graph.canvas.objects.length > 0;
  const isEmpty = !hasNodes && !hasEdges && !hasCanvasObjects;

  return (
    <div
      ref={wrapperRef}
      className="w-full h-full relative"
      style={{ background: "var(--app-bg)" }}
      onMouseMove={onPaneMouseMove}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {edgeMarkers}
      <CanvasRenderer
        objects={graph.canvas.objects}
        selectedId={selectedCanvasObjectId}
        dragOverridesRef={dragOverridesRef}
        tick={tick}
      />
      {isEmpty && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
          <div className="bg-[#141414]/80 backdrop-blur-sm rounded-xl border border-white/10 px-8 py-6 text-center shadow-2xl">
            <div className="text-4xl mb-3 opacity-30">⬡</div>
            <h3 className="text-white/70 font-medium text-sm mb-1">This graph is empty</h3>
            <p className="text-white/40 text-xs">
              Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/60 text-[11px] font-mono">Ctrl+N</kbd> or click{" "}
              <span className="text-white/80">+ Add Node</span> to get started
            </p>
          </div>
        </div>
      )}
      <GraphCallbacksProvider value={{ onRenameNode, onAddNodeContent, onUpdateNodeContent, onResizeNode, onDeleteNode }}>
        <ReactFlow
          nodes={displayNodes}
          edges={edgesWithOrigins}
          onNodesChange={onNodesChangeWrapper}
          onEdgesChange={onEdgesChangeWrapper}
          onConnect={onConnect}
          onNodeDoubleClick={onNodeDoubleClick}
          onEdgeClick={onEdgeClick}
          deleteKeyCode={null}
          onPointerDown={onPointerDown}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          minZoom={0.1}
          maxZoom={4}
          multiSelectionKeyCode={["Shift", "Meta", "Control"]}
          selectionKeyCode="Shift"
          selectionOnDrag={currentTool === "select"}
          panOnDrag={true}
          defaultEdgeOptions={{
            type: "custom-edge",
            animated: false,
          }}
        >
          <Background color="var(--app-grid)" gap={18} size={1.4} />
          <Controls />
          <MiniMap
            pannable
            zoomable
            style={{ backgroundColor: "var(--app-surface)" }}
            nodeColor="var(--app-accent)"
            maskColor="rgba(0,0,0,0.35)"
          />
        </ReactFlow>
      </GraphCallbacksProvider>
      <CanvasOverlay
        objects={graph.canvas.objects}
        selectedId={selectedCanvasObjectId}
        currentTool={currentTool}
        drawingState={drawingState}
        dragOverridesRef={dragOverridesRef}
        onTick={forceRender}
        onSelectObject={setSelectedCanvasObjectId}
        onDrawingStateChange={setDrawingState}
        onToolChange={setCurrentTool}
        onCreateObject={handleCreateObject}
        onPreviewMove={handlePreviewMove}
        onCommitMove={handleCommitMove}
        onCommitResize={handleCommitResize}
        onDeleteObject={handleDeleteObject}
        onEditText={handleEditText}
        onGroupNodes={handleGroupNodes}
      />
      {copyNotice !== null && (
        <div
          className="absolute left-1/2 top-16 z-50 -translate-x-1/2 rounded-lg border px-3 py-1.5 text-xs font-medium shadow-2xl backdrop-blur"
          style={{ background: "var(--app-panel)", borderColor: "var(--app-border)", color: "var(--app-text)" }}
        >
          Copied {copyNotice.nodeCount} {copyNotice.nodeCount === 1 ? "node" : "nodes"}
          {copyNotice.edgeCount > 0
            ? ` + ${copyNotice.edgeCount} ${copyNotice.edgeCount === 1 ? "edge" : "edges"}`
            : ""}
        </div>
      )}
      {selectedNodeIds.length > 2 && (
        <div
          className="absolute left-1/2 top-3 z-40 -translate-x-1/2 flex items-center gap-1 rounded-xl border px-2 py-1.5 shadow-2xl backdrop-blur"
          style={{ background: "var(--app-panel)", borderColor: "var(--app-border)" }}
        >
          <span className="px-2 text-xs font-medium" style={{ color: "var(--app-muted)" }}>
            {selectedNodeIds.length} selected
          </span>
          <div className="w-px h-5" style={{ background: "var(--app-border)" }} />
          <button
            type="button"
            onClick={copySelectedNodes}
            className="px-2.5 py-1 rounded-lg text-xs font-medium hover:bg-white/10 transition-colors"
            style={{ color: "var(--app-text)" }}
            title="Copy (Ctrl+C)"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={deleteSelectedNodes}
            className="px-2.5 py-1 rounded-lg text-xs font-medium hover:bg-red-500/20 transition-colors"
            style={{ color: "#f87171" }}
            title="Delete (Del)"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
});

const GraphCanvas = forwardRef<GraphCanvasHandle, GraphCanvasInnerProps>(function GraphCanvas(props, ref) {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner {...props} ref={ref} />
    </ReactFlowProvider>
  );
});

export default GraphCanvas;