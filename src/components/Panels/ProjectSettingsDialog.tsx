import { useState } from "react";
import { X } from "lucide-react";
import type { WorkspaceService } from "../../services/WorkspaceService";

interface ProjectSettingsDialogProps {
  workspaceService: WorkspaceService;
  onClose: () => void;
  /** Called after a color is saved, so the canvas re-colors open edges. */
  onColorsChanged?: () => void;
}

export default function ProjectSettingsDialog({
  workspaceService,
  onClose,
  onColorsChanged,
}: ProjectSettingsDialogProps) {
  // Bump this after each save to re-read workspaceService's in-memory
  // manifest, same pattern as DefaultColorsSettingsDialog.
  const [, setVersion] = useState(0);
  const customRelationships = workspaceService.getCustomRelationships();

  const handleChange = async (displayName: string, color: string) => {
    await workspaceService.updateCustomRelationshipColor(displayName, color);
    setVersion((v) => v + 1);
    onColorsChanged?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        className="rounded-xl p-6 w-full max-w-sm shadow-2xl"
        style={{ background: "var(--app-surface)", border: "1px solid var(--app-border)" }}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-medium" style={{ color: "var(--app-text)" }}>
            Project Settings
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
          Custom relationship colors for this project only.
        </p>

        {customRelationships.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: "var(--app-muted)" }}>
            No custom relationships in this project yet.
          </p>
        ) : (
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {customRelationships.map((rel) => (
              <div key={rel.displayName} className="flex items-center gap-3 px-1 py-1.5">
                <label className="relative w-6 h-6 cursor-pointer shrink-0">
                  <input
                    type="color"
                    value={rel.color ?? "#6b7280"}
                    onChange={(e) => handleChange(rel.displayName, e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    title={`Pick a color for ${rel.displayName}`}
                  />

                  <div
                    className="w-6 h-6 rounded-full border border-white/10"
                    style={{ backgroundColor: rel.color ?? "#6b7280" }}
                  />
                </label>
                <span className="flex-1 text-sm" style={{ color: "var(--app-text)" }}>
                  {rel.displayName}
                </span>
              </div>
            ))}
          </div>
        )}

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