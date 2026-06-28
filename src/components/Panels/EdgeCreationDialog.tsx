import { useState } from "react";
import { BUILTIN_RELATIONSHIPS } from "../../constants/relationships";

interface EdgeCreationDialogProps {
  sourceLabel: string;
  targetLabel: string;
  onConfirm: (relationshipId: string, customLabel?: string) => void;
  onCancel: () => void;
}

export default function EdgeCreationDialog({
  sourceLabel,
  targetLabel,
  onConfirm,
  onCancel,
}: EdgeCreationDialogProps) {
  const [selectedId, setSelectedId] = useState<string>("uses");
  const [customLabel, setCustomLabel] = useState("");

  const handleConfirm = () => {
    onConfirm(selectedId, selectedId === "custom" ? customLabel : undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#1e1e2e] border border-white/10 rounded-xl p-6 w-full max-w-sm shadow-2xl">
        <h3 className="text-sm font-medium text-white/80 mb-3">Create Relationship</h3>

        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 text-sm mb-4">
          <span className="text-white/80">{sourceLabel}</span>
          <span className="text-white/30 text-xs">──</span>
          <span className="text-blue-400">?</span>
          <span className="text-white/30 text-xs">──➤</span>
          <span className="text-white/80">{targetLabel}</span>
        </div>

        <div className="space-y-1 max-h-48 overflow-y-auto mb-4">
          {BUILTIN_RELATIONSHIPS.map((rel) => (
            <button
              key={rel.id}
              onClick={() => setSelectedId(rel.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left
                ${
                  selectedId === rel.id
                    ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                    : "text-white/60 hover:text-white/80 hover:bg-white/5"
                }
              `}
            >
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: rel.color ?? "#6b7280" }}
              />
              <span>{rel.displayName}</span>
            </button>
          ))}
        </div>

        {selectedId === "custom" && (
          <div className="mb-4">
            <label className="block text-xs text-white/50 mb-1">Custom Label</label>
            <input
              type="text"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#13131a] border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50"
              placeholder="e.g., trains"
            />
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-white/60 hover:text-white/80 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm hover:bg-blue-600 transition-colors"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
