import type { RefObject } from "react";
import { useStore } from "@xyflow/react";
import type { CanvasObject, DragOverride } from "../../types";

const MIN_STROKE_PX = 1.2;

interface Props {
  objects: CanvasObject[];
  selectedId: string | null;
  dragOverridesRef: RefObject<Map<string, DragOverride>>;
  tick: number;
}

export function CanvasRenderer({ objects, selectedId, dragOverridesRef, tick }: Props) {
  const transform = useStore((s) => s.transform);
  const [panX, panY, zoom] = transform;

  void tick;

  if (objects.length === 0) return null;

  const sorted = [...objects].sort((a, b) => a.zIndex - b.zIndex);
  const overrides = dragOverridesRef.current;

  const strokePx = (sw: number) => Math.max(MIN_STROKE_PX, sw) / zoom;

  return (
    <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%">
      <g transform={`translate(${panX},${panY}) scale(${zoom})`}>
        {sorted.map((obj) => {
          const ov = overrides.get(obj.id);
          const x = ov?.x ?? obj.x;
          const y = ov?.y ?? obj.y;
          const w = ov?.width ?? obj.width;
          const h = ov?.height ?? obj.height;
          const isSelected = obj.id === selectedId;
          const sw = isSelected ? obj.style.strokeWidth + 1.5 : obj.style.strokeWidth;
          const isGrouped = ((obj.properties?.groupedNodeIds as string[] | undefined)?.length ?? 0) > 0;

          const shape = (() => {
            if (obj.type === "ellipse") {
              return (
                <ellipse
                  cx={x + w / 2}
                  cy={y + h / 2}
                  rx={Math.max(0, w / 2)}
                  ry={Math.max(0, h / 2)}
                  fill={obj.style.fill}
                  stroke={isSelected ? "var(--app-accent)" : obj.style.stroke}
                  strokeWidth={strokePx(sw)}
                  opacity={obj.style.opacity}
                />
              );
            }
            const r = obj.type === "rounded-rectangle" ? (obj.style.borderRadius ?? 8) : 0;
            return (
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx={r}
                ry={r}
                fill={obj.style.fill}
                stroke={isSelected ? "var(--app-accent)" : obj.style.stroke}
                strokeWidth={strokePx(sw)}
                opacity={obj.style.opacity}
              />
            );
          })();

          return (
            <g key={obj.id}>
              {shape}
              {isGrouped && (
                <rect
                  x={x + w - 14}
                  y={y + 2}
                  width={12}
                  height={12}
                  rx={2}
                  ry={2}
                  fill="rgba(34,197,94,0.85)"
                />
              )}
              {obj.text && (
                <text
                  x={x + w / 2}
                  y={y - 8}
                  fill="#ffffff"
                  fontSize={Math.max(10, 12 / zoom)}
                  fontFamily="sans-serif"
                  textAnchor="middle"
                >
                  {obj.text}
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}