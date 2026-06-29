import { useCallback, useRef, useEffect, useState } from "react";
import { useStore, useReactFlow } from "@xyflow/react";
import type { CanvasTool, DrawingState } from "../../stores/useUIStore";
import type { CanvasObject, DragOverride } from "../../types";

const MIN_SIZE = 24;
const SNAP = 10;
const HANDLE_SIZE = 7;

interface Props {
  objects: CanvasObject[];
  selectedId: string | null;
  currentTool: CanvasTool;
  drawingState: DrawingState | null;
  dragOverridesRef: React.MutableRefObject<Map<string, DragOverride>>;
  onTick: () => void;
  onSelectObject: (id: string | null) => void;
  onDrawingStateChange: (state: DrawingState | null) => void;
  onToolChange: (tool: CanvasTool) => void;
  onCreateObject: (x: number, y: number, w: number, h: number) => void;
  onPreviewMove?: (id: string, x: number, y: number) => void;
  onCommitMove: (id: string, x: number, y: number) => void;
  onCommitResize: (id: string, x: number, y: number, w: number, h: number) => void;
  onDeleteObject: (id: string) => void;
  onEditText: (id: string) => void;
  onGroupNodes?: (objectId: string) => void;
}

const maybeSnap = (v: number, snapToGrid: boolean) => (snapToGrid ? Math.round(v / SNAP) * SNAP : v);

export function CanvasOverlay({
  objects,
  selectedId,
  currentTool,
  drawingState,
  dragOverridesRef,
  onTick,
  onSelectObject,
  onDrawingStateChange,
  onToolChange,
  onCreateObject,
  onPreviewMove,
  onCommitMove,
  onCommitResize,
  onDeleteObject,
  onEditText,
  onGroupNodes,
}: Props) {
  const transform = useStore((s) => s.transform);
  const [panX, panY, zoom] = transform;
  const { screenToFlowPosition } = useReactFlow();

  const dragMetaRef = useRef<{
    type: "move" | "resize";
    objectId: string;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    corner: string;
  } | null>(null);

  const drawStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const selectedObj = selectedId ? objects.find((o) => o.id === selectedId) : null;

  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; objectId: string } | null>(null);
  const closeCtxMenu = useCallback(() => setCtxMenu(null), []);

  const isDrawing = currentTool !== "select";

  // --- Drawing handlers ---
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawing) return;
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      drawStartRef.current = { x: pos.x, y: pos.y };
      onDrawingStateChange({ startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y });
    },
    [isDrawing, screenToFlowPosition, onDrawingStateChange],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawing || !drawingState) return;
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      onDrawingStateChange({ ...drawingState, currentX: pos.x, currentY: pos.y });
    },
    [isDrawing, drawingState, screenToFlowPosition, onDrawingStateChange],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawing || !drawingState) return;
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const rawX = Math.min(drawStartRef.current.x, pos.x);
      const rawY = Math.min(drawStartRef.current.y, pos.y);
      const rawW = Math.abs(pos.x - drawStartRef.current.x);
      const rawH = Math.abs(pos.y - drawStartRef.current.y);
      const snapToGrid = e.altKey;

      let w = maybeSnap(rawW, snapToGrid);
      let h = maybeSnap(rawH, snapToGrid);
      let x = maybeSnap(rawX, snapToGrid);
      let y = maybeSnap(rawY, snapToGrid);

      if (e.shiftKey) {
        const side = Math.max(w, h);
        w = side;
        h = side;
        x = pos.x > drawStartRef.current.x ? maybeSnap(drawStartRef.current.x, snapToGrid) : maybeSnap(drawStartRef.current.x - side, snapToGrid);
        y = pos.y > drawStartRef.current.y ? maybeSnap(drawStartRef.current.y, snapToGrid) : maybeSnap(drawStartRef.current.y - side, snapToGrid);
      }

      onCreateObject(x, y, Math.max(MIN_SIZE, w), Math.max(MIN_SIZE, h));
      onDrawingStateChange(null);
      onToolChange("select");
    },
    [isDrawing, drawingState, screenToFlowPosition, onCreateObject, onDrawingStateChange, onToolChange],
  );

  // --- Selected shape move overlay ---
  const handleMoveStart = useCallback(
    (e: React.PointerEvent) => {
      if (isDrawing || !selectedId) return;
      const obj = objects.find((o) => o.id === selectedId);
      if (!obj) return;
      e.preventDefault();
      e.stopPropagation();
      const ov = dragOverridesRef.current.get(selectedId);
      dragMetaRef.current = {
        type: "move",
        objectId: selectedId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startX: ov?.x ?? obj.x,
        startY: ov?.y ?? obj.y,
        startW: 0,
        startH: 0,
        corner: "",
      };
    },
    [isDrawing, selectedId, objects, dragOverridesRef],
  );

  // --- Resize handlers ---
  const handleResizeStart = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isDrawing || !selectedId) return;
      const target = e.currentTarget as SVGRectElement;
      const corner = target.dataset.corner || "";
      const obj = objects.find((o) => o.id === selectedId);
      if (!obj) return;
      const ov = dragOverridesRef.current.get(selectedId);
      dragMetaRef.current = {
        type: "resize",
        objectId: selectedId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startX: ov?.x ?? obj.x,
        startY: ov?.y ?? obj.y,
        startW: ov?.width ?? obj.width,
        startH: ov?.height ?? obj.height,
        corner,
      };
    },
    [isDrawing, selectedId, objects, dragOverridesRef],
  );

  // --- Global pointer move/up ---
  useEffect(() => {
    const handleGlobalMove = (e: PointerEvent) => {
      const meta = dragMetaRef.current;
      if (!meta) return;

      const dx = (e.clientX - meta.startClientX) / zoom;
      const dy = (e.clientY - meta.startClientY) / zoom;
      const snapToGrid = e.altKey;

      if (meta.type === "move") {
        const nx = maybeSnap(meta.startX + dx, snapToGrid);
        const ny = maybeSnap(meta.startY + dy, snapToGrid);
        dragOverridesRef.current.set(meta.objectId, { x: nx, y: ny });
        onPreviewMove?.(meta.objectId, nx, ny);
      } else if (meta.type === "resize") {
        let nx = meta.startX;
        let ny = meta.startY;
        let nw = meta.startW;
        let nh = meta.startH;

        if (meta.corner.includes("e")) nw = Math.max(MIN_SIZE, maybeSnap(meta.startW + dx, snapToGrid));
        if (meta.corner.includes("s")) nh = Math.max(MIN_SIZE, maybeSnap(meta.startH + dy, snapToGrid));
        if (meta.corner.includes("w")) {
          const newW = Math.max(MIN_SIZE, maybeSnap(meta.startW - dx, snapToGrid));
          nx = meta.startX + (meta.startW - newW);
          nw = newW;
        }
        if (meta.corner.includes("n")) {
          const newH = Math.max(MIN_SIZE, maybeSnap(meta.startH - dy, snapToGrid));
          ny = meta.startY + (meta.startH - newH);
          nh = newH;
        }

        if (e.shiftKey) {
          const side = Math.max(nw, nh);
          nw = side;
          nh = side;
        }

        dragOverridesRef.current.set(meta.objectId, { x: nx, y: ny, width: nw, height: nh });
      }

      onTick();
    };

    const handleGlobalUp = (e: PointerEvent) => {
      const meta = dragMetaRef.current;
      if (!meta) return;

      const dx = (e.clientX - meta.startClientX) / zoom;
      const dy = (e.clientY - meta.startClientY) / zoom;
      const snapToGrid = e.altKey;

      if (meta.type === "move") {
        const nx = maybeSnap(meta.startX + dx, snapToGrid);
        const ny = maybeSnap(meta.startY + dy, snapToGrid);
        dragOverridesRef.current.delete(meta.objectId);
        onCommitMove(meta.objectId, nx, ny);
      } else if (meta.type === "resize") {
        let nx = meta.startX;
        let ny = meta.startY;
        let nw = meta.startW;
        let nh = meta.startH;

        if (meta.corner.includes("e")) nw = Math.max(MIN_SIZE, maybeSnap(meta.startW + dx, snapToGrid));
        if (meta.corner.includes("s")) nh = Math.max(MIN_SIZE, maybeSnap(meta.startH + dy, snapToGrid));
        if (meta.corner.includes("w")) {
          const newW = Math.max(MIN_SIZE, maybeSnap(meta.startW - dx, snapToGrid));
          nx = meta.startX + (meta.startW - newW);
          nw = newW;
        }
        if (meta.corner.includes("n")) {
          const newH = Math.max(MIN_SIZE, maybeSnap(meta.startH - dy, snapToGrid));
          ny = meta.startY + (meta.startH - newH);
          nh = newH;
        }

        if (e.shiftKey) {
          const side = Math.max(nw, nh);
          nw = side;
          nh = side;
        }

        dragOverridesRef.current.delete(meta.objectId);
        onCommitResize(meta.objectId, nx, ny, Math.max(MIN_SIZE, nw), Math.max(MIN_SIZE, nh));
      }

      dragMetaRef.current = null;
      onTick();
    };

    document.addEventListener("pointermove", handleGlobalMove);
    document.addEventListener("pointerup", handleGlobalUp);
    return () => {
      document.removeEventListener("pointermove", handleGlobalMove);
      document.removeEventListener("pointerup", handleGlobalUp);
    };
  }, [zoom, dragOverridesRef, onTick, onPreviewMove, onCommitMove, onCommitResize]);

  // --- Delete / Escape keyboard ---
  useEffect(() => {
    if (!selectedId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        dragOverridesRef.current.delete(selectedId);
        onDeleteObject(selectedId);
      }
      if (e.key === "Escape") {
        setCtxMenu(null);
        dragOverridesRef.current.delete(selectedId);
        onSelectObject(null);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, dragOverridesRef, onDeleteObject, onSelectObject]);

  // --- Close context menu on outside click ---
  useEffect(() => {
    if (!ctxMenu) return;
    const handleClick = () => setCtxMenu(null);
    document.addEventListener("pointerdown", handleClick);
    return () => document.removeEventListener("pointerdown", handleClick);
  }, [ctxMenu]);

  // ========== RENDER ==========

  // Drawing mode
  if (isDrawing) {
    return (
      <svg
        className="absolute inset-0"
        style={{ zIndex: 20, cursor: "crosshair", pointerEvents: "auto" }}
        width="100%"
        height="100%"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {drawingState && (
          <g transform={`translate(${panX},${panY}) scale(${zoom})`}>
            {currentTool === "ellipse" ? (
              <ellipse
                cx={Math.abs(drawingState.currentX + drawStartRef.current.x) / 2}
                cy={Math.abs(drawingState.currentY + drawStartRef.current.y) / 2}
                rx={Math.abs(drawingState.currentX - drawStartRef.current.x) / 2}
                ry={Math.abs(drawingState.currentY - drawStartRef.current.y) / 2}
                fill="rgba(59,130,246,0.08)"
                stroke="#60a5fa"
                strokeWidth={2 / zoom}
                strokeDasharray={`${6 / zoom} ${4 / zoom}`}
              />
            ) : (
              <rect
                x={Math.min(drawStartRef.current.x, drawingState.currentX)}
                y={Math.min(drawStartRef.current.y, drawingState.currentY)}
                width={Math.abs(drawingState.currentX - drawStartRef.current.x)}
                height={Math.abs(drawingState.currentY - drawStartRef.current.y)}
                rx={currentTool === "rounded-rectangle" ? 8 / zoom : 0}
                ry={currentTool === "rounded-rectangle" ? 8 / zoom : 0}
                fill="rgba(59,130,246,0.08)"
                stroke="#60a5fa"
                strokeWidth={2 / zoom}
                strokeDasharray={`${6 / zoom} ${4 / zoom}`}
              />
            )}
          </g>
        )}
      </svg>
    );
  }

  // Select mode — only render when a shape is selected
  if (!selectedId || !selectedObj) return null;

  const ov = dragOverridesRef.current.get(selectedId);
  const x = ov?.x ?? selectedObj.x;
  const y = ov?.y ?? selectedObj.y;
  const w = ov?.width ?? selectedObj.width;
  const h = ov?.height ?? selectedObj.height;
  const hSize = HANDLE_SIZE / zoom;
  const isGrouped =
    ((selectedObj.properties?.groupedNodeIds as string[] | undefined)?.length ?? 0) > 0 ||
    ((selectedObj.properties?.groupedObjectIds as string[] | undefined)?.length ?? 0) > 0;

  const corners = [
    { id: "nw", cx: x, cy: y, cursor: "nw-resize" },
    { id: "ne", cx: x + w, cy: y, cursor: "ne-resize" },
    { id: "sw", cx: x, cy: y + h, cursor: "sw-resize" },
    { id: "se", cx: x + w, cy: y + h, cursor: "se-resize" },
  ];

  const borderRadius = selectedObj.type === "ellipse" ? Math.max(w, h) : (selectedObj.style.borderRadius ?? 0);

  const menuItems: { label: string; action: () => void }[] = [
    {
      label: isGrouped ? "Ungroup Nodes" : "Group Enclosed Nodes",
      action: () => { if (onGroupNodes) onGroupNodes(selectedId); },
    },
    {
      label: "Edit Text",
      action: () => onEditText(selectedId),
    },
    {
      label: "Delete",
      action: () => { dragOverridesRef.current.delete(selectedId); onDeleteObject(selectedId); },
    },
  ];

  return (
    <>
      <svg
        className="absolute inset-0"
        style={{ zIndex: 10, pointerEvents: "none" }}
        width="100%"
        height="100%"
      >
        <g transform={`translate(${panX},${panY}) scale(${zoom})`}>
          {/* Selection outline — dashed white border */}
          {selectedObj.type === "ellipse" ? (
            <ellipse
              cx={x + w / 2}
              cy={y + h / 2}
              rx={Math.max(0, w / 2) + 3 / zoom}
              ry={Math.max(0, h / 2) + 3 / zoom}
              fill="none"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth={1 / zoom}
              strokeDasharray={`${4 / zoom} ${3 / zoom}`}
              style={{ pointerEvents: "none" }}
            />
          ) : (
            <rect
              x={x - 3 / zoom}
              y={y - 3 / zoom}
              width={w + 6 / zoom}
              height={h + 6 / zoom}
              rx={borderRadius + 3 / zoom}
              ry={borderRadius + 3 / zoom}
              fill="none"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth={1 / zoom}
              strokeDasharray={`${4 / zoom} ${3 / zoom}`}
              style={{ pointerEvents: "none" }}
            />
          )}

          {/* Move overlay — only covers the selected shape */}
          <rect
            data-object-id={selectedId}
            x={x}
            y={y}
            width={w}
            height={h}
            fill="transparent"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={1 / zoom}
            rx={borderRadius}
            style={{ pointerEvents: "auto", cursor: "move" }}
            onPointerDown={handleMoveStart}
            onDoubleClick={() => onEditText(selectedId)}
            onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, objectId: selectedId }); }}
          />

          {/* Resize handles */}
          {corners.map((c) => (
            <rect
              key={c.id}
              data-object-id={selectedId}
              data-corner={c.id}
              x={c.cx - hSize / 2}
              y={c.cy - hSize / 2}
              width={hSize}
              height={hSize}
              fill="white"
              stroke="#60a5fa"
              strokeWidth={1.5 / zoom}
              rx={1.5 / zoom}
              style={{ pointerEvents: "auto", cursor: c.cursor }}
              onPointerDown={handleResizeStart}
            />
          ))}
        </g>
      </svg>

      {ctxMenu && (
        <div
          className="fixed z-50 bg-[#1e1e2e] border border-white/10 rounded-lg shadow-xl py-1 min-w-[160px]"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {menuItems.map((item, i) => (
            <button
              key={i}
              className="w-full text-left px-3 py-1.5 text-sm text-white/80 hover:bg-white/10 transition-colors"
              onClick={() => { closeCtxMenu(); item.action(); }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}