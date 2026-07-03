import { memo} from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  type EdgeProps,
} from "@xyflow/react";
import { getRelationshipMarkerKey } from "../../constants/relationships";

const LABEL_OFFSET_Y = 14;
const EDGE_LABEL_BG_ALPHA = "26";
const EDGE_LABEL_SELECTED_BG_ALPHA = "3d";

/**
 * Builds an SVG path string for a bundled edge.
 *
 * The path has two segments:
 *   1. Trunk  — a straight line from the source handle to the zip point.
 *              All edges in the same bundle share this geometry, giving the
 *              "zipped together" visual.
 *   2. Diverge — a cubic bezier from the zip point to the target handle.
 *              The curve exits the zip point in the bundle's primary direction
 *              and then sweeps to the target, producing the fan-out effect.
 */
function buildBundlePath(
  sourceX: number,
  sourceY: number,
  zipX: number,
  zipY: number,
  targetX: number,
  targetY: number,
  bundleDx: number,
  bundleDy: number,
): string {
  const dist = Math.hypot(targetX - zipX, targetY - zipY);
  // Scale the bezier handles relative to the remaining distance so short
  // and long diverge segments both curve proportionally.
  const curveSize = Math.min(dist * 0.55, 140);

  // CP1: exits the zip point continuing in the trunk's direction.
  const cp1x = zipX + bundleDx * curveSize;
  const cp1y = zipY + bundleDy * curveSize;

  // CP2: approaches the target from the bundle-direction side so the
  // arrowhead arrives pointing roughly along the bundle axis.
  const cp2x = targetX - bundleDx * curveSize * 0.4;
  const cp2y = targetY - bundleDy * curveSize * 0.4;

  return (
    `M ${sourceX},${sourceY} ` +
    `L ${zipX},${zipY} ` +
    `C ${cp1x},${cp1y} ${cp2x},${cp2y} ${targetX},${targetY}`
  );
}

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
  const { screenToFlowPosition } = useReactFlow();

  // Fallback bezier — used for non-bundled (singleton) edges.
  const [defaultEdgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeData = data as any;
  const color            = edgeData?.color            ?? "#71717a";
  const label            = edgeData?.displayLabel     ?? "";
  const relationshipType = edgeData?.relationshipType ?? "custom";
  const customLabel      = edgeData?.customLabel;
  const isBundleLeader   = edgeData?.isBundleLeader   ?? true;
  const bundleOriginX    = edgeData?.bundleOriginX;
  const bundleOriginY    = edgeData?.bundleOriginY;
  const markerEnd        = `url(#edge-arrow-${getRelationshipMarkerKey({ id: relationshipType, customLabel })})`;

  // --- Zip / bundle data (injected by GraphCanvas.edgesWithOrigins) ---
  const isInBundle: boolean                                      = edgeData?.isInBundle      ?? false;
  const zipX: number | undefined                                 = edgeData?.zipX;
  const zipY: number | undefined                                 = edgeData?.zipY;
  const bundleDx: number                                         = edgeData?.bundleDx        ?? 1;
  const bundleDy: number                                         = edgeData?.bundleDy        ?? 0;
  const bundleHx: number                                         = edgeData?.bundleHx        ?? 0;
  const bundleHy: number                                         = edgeData?.bundleHy        ?? 0;
  const bundleAxisLength: number                                 = edgeData?.bundleAxisLength ?? 1;
  const bundleKey: string                                        = edgeData?.bundleKey        ?? "";
  const onZipDrag: ((key: string, t: number) => void) | undefined = edgeData?.onZipDrag;

  // --- Derived display flags ---
  const isBundleLabel = isBundleLeader && bundleOriginX != null;
  const isZippable    = isBundleLabel && !!onZipDrag;

  // --- Edge path ---
  // Bundled edges use the trunk-then-diverge path; singletons keep the
  // standard bezier so existing behaviour is completely unchanged.
  const edgePath =
    isInBundle && zipX != null && zipY != null
      ? buildBundlePath(sourceX, sourceY, zipX, zipY, targetX, targetY, bundleDx, bundleDy)
      : defaultEdgePath;

  // --- Label position ---
  const displayLabelX = isBundleLabel ? bundleOriginX : labelX;
  const displayLabelY = isBundleLabel ? bundleOriginY : labelY;
  const labelOffsetY  = isBundleLabel ? 0 : LABEL_OFFSET_Y;
  const bgAlpha       = selected ? EDGE_LABEL_SELECTED_BG_ALPHA : EDGE_LABEL_BG_ALPHA;

  // --- Drag handlers ---
  // We use pointer-capture so the label keeps receiving events even when the
  // cursor moves off it mid-drag. Cursor style is set directly on the element
  // via currentTarget to avoid a state-driven re-render during the drag loop.

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isZippable) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.style.cursor = "grabbing";
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // e.buttons is 0 when no button is pressed, i.e. not dragging.
    if (!isZippable || !e.buttons) return;
    e.stopPropagation();

    // Convert screen coords → flow-space coords.
    const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });

    // Project the cursor position onto the bundle's primary axis.
    // The axis runs from (bundleHx, bundleHy) in direction (bundleDx, bundleDy).
    const relX  = flowPos.x - bundleHx;
    const relY  = flowPos.y - bundleHy;
    const along = relX * bundleDx + relY * bundleDy;

    // Map that distance to a 0–1 ratio along the full axis length.
    // Clamp to [0.05, 0.95] so the label can't fly into the node or the targets.
    const newT =
      bundleAxisLength > 0
        ? Math.max(0.05, Math.min(0.95, along / bundleAxisLength))
        : 0.3;

    onZipDrag!(bundleKey, newT);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    e.currentTarget.style.cursor = isZippable ? "grab" : "default";
  };

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

      {label && isBundleLeader && (
        <EdgeLabelRenderer>
          <div
            className={`absolute px-2.5 py-1 rounded-md text-xs font-medium tracking-[-0.005em]${isZippable ? " nopan" : ""}`}
            style={{
              transform: `translate(-50%, -50%) translate(${displayLabelX}px, ${displayLabelY - labelOffsetY}px)`,
              backgroundColor: isBundleLabel
                ? "var(--app-surface)"
                : `${color}${bgAlpha}`,
              color,
              border: `1px solid ${color}${selected ? "70" : "40"}`,
              maxWidth: 200,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              // Zippable labels are interactive; singleton labels stay passive.
              pointerEvents: isZippable ? "auto" : "none",
              cursor:       isZippable ? "grab"  : "default",
              userSelect:   "none",
            }}
            onPointerDown={isZippable ? handlePointerDown : undefined}
            onPointerMove={isZippable ? handlePointerMove : undefined}
            onPointerUp={isZippable ? handlePointerUp : undefined}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export default memo(CustomEdge);