import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";

const LABEL_OFFSET_Y = 14;
const EDGE_LABEL_BG_ALPHA = "15";
const EDGE_LABEL_SELECTED_BG_ALPHA = "28";

function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeData = data as any;
  const color = edgeData?.color ?? "#71717a";
  const label = edgeData?.displayLabel ?? "";
  const relationshipType = edgeData?.relationshipType ?? "custom";
  const markerEnd = `url(#edge-arrow-${relationshipType})`;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: color,
          strokeWidth: selected ? 2.5 : 1.5,
          opacity: selected ? 1 : 0.7,
        }}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            className="absolute px-2 py-0.5 rounded text-xs font-medium pointer-events-none"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY - LABEL_OFFSET_Y}px)`,
              backgroundColor: `${color}${selected ? EDGE_LABEL_SELECTED_BG_ALPHA : EDGE_LABEL_BG_ALPHA}`,
              color: color,
              border: `1px solid ${color}${selected ? "70" : "40"}`,
              maxWidth: 200,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export default memo(CustomEdge);