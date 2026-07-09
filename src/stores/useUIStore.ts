import { create } from "zustand";

export type CanvasTool = "select" | "rectangle" | "rounded-rectangle" | "ellipse";
export type ContentMode = "view" | "edit";
export type ThemeMode = "dark" | "light";

export interface DrawingState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface UIState {
  relationshipInspectorOpen: boolean;
  selectedEdgeId: string | null;
  commandPaletteOpen: boolean;
  createEdgeDialog: {
    open: boolean;
    sourceId: string | null;
    targetId: string | null;
    sourceHandle: string | null;
    targetHandle: string | null;
  };

  currentTool: CanvasTool;
  contentMode: ContentMode;
  themeMode: ThemeMode;
  selectedCanvasObjectId: string | null;
  drawingState: DrawingState | null;
  selectedNodeIds: string[];
  pendingEditNodeId: string | null;

  setPendingEditNodeId: (id: string | null) => void;
  

  openRelationshipInspector: (edgeId: string) => void;
  closeRelationshipInspector: () => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  openCreateEdgeDialog: (sourceId: string, targetId: string, sourceHandle?: string | null, targetHandle?: string | null) => void;
  closeCreateEdgeDialog: () => void;
  setCurrentTool: (tool: CanvasTool) => void;
  setContentMode: (mode: ContentMode) => void;
  toggleContentMode: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  toggleThemeMode: () => void;
  setSelectedCanvasObjectId: (id: string | null) => void;
  setDrawingState: (state: DrawingState | null) => void;
  setSelectedNodeIds: (ids: string[]) => void;
}

export const useUIStore = create<UIState>((set) => ({
  relationshipInspectorOpen: false,
  selectedEdgeId: null,
  commandPaletteOpen: false,
  createEdgeDialog: { open: false, sourceId: null, targetId: null, sourceHandle: null, targetHandle: null },

  currentTool: "select",
  contentMode: "view",
  themeMode: "dark",
  selectedCanvasObjectId: null,
  drawingState: null,
  selectedNodeIds: [],
  pendingEditNodeId: null,

  openRelationshipInspector: (edgeId) =>
    set({ relationshipInspectorOpen: true, selectedEdgeId: edgeId }),
  closeRelationshipInspector: () =>
    set({ relationshipInspectorOpen: false, selectedEdgeId: null }),
  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),
  openCreateEdgeDialog: (sourceId, targetId, sourceHandle, targetHandle) =>
    set({ createEdgeDialog: { open: true, sourceId, targetId, sourceHandle: sourceHandle ?? null, targetHandle: targetHandle ?? null } }),
  closeCreateEdgeDialog: () =>
    set({ createEdgeDialog: { open: false, sourceId: null, targetId: null, sourceHandle: null, targetHandle: null } }),

  setCurrentTool: (tool) => set({ currentTool: tool, selectedCanvasObjectId: null, drawingState: null }),
  setContentMode: (mode) => set({ contentMode: mode }),
  toggleContentMode: () => set((state) => ({ contentMode: state.contentMode === "edit" ? "view" : "edit" })),
  setThemeMode: (mode) => set({ themeMode: mode }),
  toggleThemeMode: () => set((state) => ({ themeMode: state.themeMode === "dark" ? "light" : "dark" })),
  setSelectedCanvasObjectId: (id) => set({ selectedCanvasObjectId: id }),
  setDrawingState: (state) => set({ drawingState: state }),
  setSelectedNodeIds: (ids) => set({ selectedNodeIds: ids }),
  setPendingEditNodeId: (id) => set({ pendingEditNodeId: id }),
}));