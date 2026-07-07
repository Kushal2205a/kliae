import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

// Renders the auto created anchor node that sits at the center of a node's
// own nested graph, representing that node itself. Deliberately minimal
// compared to BaseNode: no rename, no delete, no content, no double click
// navigation. It still exposes the full set of handles so edges can be
// drawn to and from it like any other node.
function AnchorNode({ data, selected }: NodeProps) {
  const label = ((data as any)?.label as string) ?? "";

  return (
    <div
      style={{
        padding: "10px 20px",
        borderRadius: "var(--radius-card)",
        border: `1.5px dashed ${selected ? "var(--app-border-focus)" : "var(--app-border-strong)"}`,
        boxShadow: selected ? "0 0 0 3px var(--app-border-focus), var(--shadow-2)" : "var(--shadow-1)",
        background: "var(--app-surface-2)",
        color: "var(--app-text)",
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: "0.01em",
        textAlign: "center",
        minWidth: 140,
        userSelect: "none",
        cursor: "default",
      }}
    >
      <Handle type="target" position={Position.Top} id="top-target" className="!w-3 !h-3 !border-2" style={{ background: "var(--app-surface-2)", borderColor: "var(--app-border-strong)" }} />
      <Handle type="source" position={Position.Top} id="top-source" className="!w-3 !h-3 !border-2" style={{ background: "var(--app-surface-2)", borderColor: "var(--app-border-strong)" }} />
      <Handle type="target" position={Position.Bottom} id="bottom-target" className="!w-3 !h-3 !border-2" style={{ background: "var(--app-surface-2)", borderColor: "var(--app-border-strong)" }} />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className="!w-3 !h-3 !border-2" style={{ background: "var(--app-surface-2)", borderColor: "var(--app-border-strong)" }} />
      <Handle type="target" position={Position.Left} id="left-target" className="!w-3 !h-3 !border-2" style={{ background: "var(--app-surface-2)", borderColor: "var(--app-border-strong)" }} />
      <Handle type="source" position={Position.Left} id="left-source" className="!w-3 !h-3 !border-2" style={{ background: "var(--app-surface-2)", borderColor: "var(--app-border-strong)" }} />
      <Handle type="target" position={Position.Right} id="right-target" className="!w-3 !h-3 !border-2" style={{ background: "var(--app-surface-2)", borderColor: "var(--app-border-strong)" }} />
      <Handle type="source" position={Position.Right} id="right-source" className="!w-3 !h-3 !border-2" style={{ background: "var(--app-surface-2)", borderColor: "var(--app-border-strong)" }} />

      {label}
    </div>
  );
}

export default memo(AnchorNode);