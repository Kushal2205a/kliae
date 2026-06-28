import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { ChevronRight } from "lucide-react";

function BaseNode({ data, selected }: NodeProps) {
  const { label, color: nodeColor, childGraphId } = data as any;
  const color = nodeColor ?? "#3b82f6";

  return (
    <div
      className={`
        relative px-4 py-3 rounded-lg border-2 shadow-lg
        bg-[#1e1e2e] text-white min-w-[160px]
        transition-all duration-150
        ${selected ? "ring-2 ring-white/60 border-white/80" : "border-white/10"}
      `}
      style={{ borderColor: selected ? undefined : `${color}40` }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !border-2 !border-white/30 !bg-[#1e1e2e]"
      />
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="text-sm font-medium truncate">{label}</span>
        {childGraphId && (
          <ChevronRight className="w-4 h-4 text-white/40 flex-shrink-0" />
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !border-2 !border-white/30 !bg-[#1e1e2e]"
      />
    </div>
  );
}

export default memo(BaseNode);
