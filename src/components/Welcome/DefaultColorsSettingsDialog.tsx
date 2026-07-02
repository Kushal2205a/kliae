import { useState } from "react";
import { X, RotateCcw } from "lucide-react";
import { BUILTIN_RELATIONSHIPS, getEffectiveBuiltinRelationships } from "../../constants/relationships";
import { setDefaultRelationshipColor, resetDefaultRelationshipColor } from "../../services/appSettings";

interface DefaultColorsSettingsDialogProps {
  onClose: () => void;
}

// Every built-in relationship except the generic "custom" placeholder —
// custom relationship colors are edited per-project instead.
const EDITABLE_RELATIONSHIPS = BUILTIN_RELATIONSHIPS.filter((r) => r.id !== "custom");

export default function DefaultColorsSettingsDialog({ onClose }: DefaultColorsSettingsDialogProps) {
  // getEffectiveBuiltinRelationships() reads straight from localStorage, so
  // this component re-reads it after every edit via a bump counter rather
  // than holding its own copy of the override state.
  const [, setVersion] = useState(0);
  const effective = getEffectiveBuiltinRelationships();
  const colorFor = (id: string) => effective.find((r) => r.id === id)?.color ?? "#6b7280";
  const isOverridden = (id: string) => {
    const original = BUILTIN_RELATIONSHIPS.find((r) => r.id === id)?.color;
    return colorFor(id) !== original;
  };

  const handleChange = (id: string, color: string) => {
    setDefaultRelationshipColor(id, color);
    setVersion((v) => v + 1);
  };

  const handleReset = (id: string) => {
    resetDefaultRelationshipColor(id);
    setVersion((v) => v + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        className="rounded-xl p-6 w-full max-w-sm shadow-2xl"
        style={{ background: "var(--app-surface)", border: "1px solid var(--app-border)" }}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-medium" style={{ color: "var(--app-text)" }}>
            Default Relationship Colors
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg transition-colors hover:bg-white/10"
            style={{ color: "var(--app-muted)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs mb-4" style={{ color: "var(--app-muted)" }}>
          Applies to every workspace. Custom relationship colors are edited per-project.
        </p>

        <div className="space-y-1 max-h-80 overflow-y-auto">
          {EDITABLE_RELATIONSHIPS.map((rel) => (
            <div key={rel.id} className="flex items-center gap-3 px-1 py-1.5">
              <label className="relative flex-shrink-0">
                <input
                  type="color"
                  value={colorFor(rel.id)}
                  onChange={(e) => handleChange(rel.id, e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                  title={`Pick a color for ${rel.displayName}`}
                />
              </label>
              <span className="flex-1 text-sm" style={{ color: "var(--app-text)" }}>
                {rel.displayName}
              </span>
              {isOverridden(rel.id) && (
                <button
                  onClick={() => handleReset(rel.id)}
                  title="Reset to default color"
                  className="p-1 rounded transition-colors hover:bg-white/10"
                  style={{ color: "var(--app-muted)" }}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm transition-colors hover:bg-white/15"
            style={{ background: "var(--app-surface-2)", border: "1px solid var(--app-border)", color: "var(--app-text)" }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}