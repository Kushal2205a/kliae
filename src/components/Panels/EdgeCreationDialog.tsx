import { useState } from "react";
import { getEffectiveBuiltinRelationships } from "../../constants/relationships";
import type { RelationshipDefinition } from "../../types";

interface EdgeCreationDialogProps {
  sourceLabel: string;
  targetLabel: string;
  /** Project's saved custom relationships (WorkspaceService.getCustomRelationships()). */
  customRelationships: RelationshipDefinition[];
  onConfirm: (relationshipId: string, customLabel?: string) => void;
  onCancel: () => void;
}

type Selection =
  | { kind: "builtin"; id: string }
  | { kind: "existing-custom"; label: string }
  | { kind: "new-custom" };

export default function EdgeCreationDialog({
  sourceLabel,
  targetLabel,
  customRelationships,
  onConfirm,
  onCancel,
}: EdgeCreationDialogProps) {
  const [selection, setSelection] = useState<Selection>({ kind: "builtin", id: "uses" });
  const [customLabel, setCustomLabel] = useState("");
  // Read fresh each render so app-wide default color overrides (edited from
  // the welcome screen) are reflected without needing a page reload.
  const nonCustomBuiltins = getEffectiveBuiltinRelationships().filter((r) => r.id !== "custom");
  const [search, setSearch] = useState("");
  const handleConfirm = () => {
    if (selection.kind === "builtin") {
      onConfirm(selection.id);
    } else if (selection.kind === "existing-custom") {
      onConfirm("custom", selection.label);
    } else {
      onConfirm("custom", customLabel);
    }
  };

  const q = search.trim().toLowerCase();

  const filteredBuiltins = nonCustomBuiltins.filter(rel =>
    rel.displayName.toLowerCase().includes(q)
  );

  const filteredCustom = customRelationships.filter(rel =>
    rel.displayName.toLowerCase().includes(q)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="rounded-xl p-6 w-full max-w-sm shadow-2xl" style={{ background: "var(--app-surface)", border: "1px solid var(--app-border)" }}>
        <h3 className="text-sm font-medium mb-3" style={{ color: "var(--app-text)" }}>Create Relationship</h3>

        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-4" style={{ background: "var(--app-surface-2)" }}>
          <span style={{ color: "var(--app-text)" }}>{sourceLabel}</span>
          <span className="text-xs" style={{ color: "var(--app-muted)" }}>──</span>
          <span style={{ color: "var(--app-accent)" }}>?</span>
          <span className="text-xs" style={{ color: "var(--app-muted)" }}>──➤</span>
          <span style={{ color: "var(--app-text)" }}>{targetLabel}</span>
        </div>

        <div className="mb-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search relationships..."
            className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none"
            style={{
              background: "var(--app-surface-2)",
              border: "1px solid var(--app-border)",
              color: "var(--app-text)",
            }}
          />
        </div>

        <div className="space-y-1 max-h-48 overflow-y-auto mb-4">
          {filteredBuiltins.map((rel) => (
            <button
              key={rel.id}
              onClick={() => setSelection({ kind: "builtin", id: rel.id })}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left hover:bg-white/5"
              style={{
                background: selection.kind === "builtin" && selection.id === rel.id ? "var(--app-surface-2)" : undefined,
                color: selection.kind === "builtin" && selection.id === rel.id ? "var(--app-text)" : "var(--app-muted)",
              }}
            >
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: rel.color ?? "#6b7280" }}
              />
              <span>{rel.displayName}</span>
            </button>
          ))}

          {customRelationships.length > 0 && (
            <>
              <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wide" style={{ color: "var(--app-muted)" }}>
                Custom
              </div>
              {filteredCustom.map((rel) => (
                <button
                  key={rel.displayName}
                  onClick={() => setSelection({ kind: "existing-custom", label: rel.displayName })}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left hover:bg-white/5"
                  style={{
                    background: selection.kind === "existing-custom" && selection.label === rel.displayName ? "var(--app-surface-2)" : undefined,
                    color: selection.kind === "existing-custom" && selection.label === rel.displayName ? "var(--app-text)" : "var(--app-muted)",
                  }}
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: rel.color ?? "#6b7280" }}
                  />
                  <span>{rel.displayName}</span>
                </button>
              ))}
            </>
          )}
          {filteredBuiltins.length === 0 &&
            filteredCustom.length === 0 && (
              <div
                className="px-3 py-6 text-center text-sm"
                style={{ color: "var(--app-muted)" }}
              >
                No relationships found.
              </div>
            )}
          <button
            onClick={() => setSelection({ kind: "new-custom" })}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left hover:bg-white/5"
            style={{
              background: selection.kind === "new-custom" ? "var(--app-surface-2)" : undefined,
              color: selection.kind === "new-custom" ? "var(--app-text)" : "var(--app-muted)",
            }}
          >
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: "#6b7280" }} />
            <span>Custom...</span>
          </button>
        </div>

        {selection.kind === "new-custom" && (
          <div className="mb-4">
            <label className="block text-xs mb-1" style={{ color: "var(--app-muted)" }}>Custom Label</label>
            <input
              type="text"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none transition-colors"
              style={{ background: "var(--app-surface-2)", border: "1px solid var(--app-border)", color: "var(--app-text)" }}
              placeholder="e.g., trains"
            />
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm transition-colors hover:bg-white/5"
            style={{ color: "var(--app-muted)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 rounded-lg text-sm transition-colors hover:bg-white/15"
            style={{ background: "var(--app-surface-2)", border: "1px solid var(--app-border)", color: "var(--app-text)" }}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}