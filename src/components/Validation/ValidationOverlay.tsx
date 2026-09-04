import { AlertTriangle, X } from "lucide-react";
import type { ValidationIssue } from "../../types";
import { useEscapeKey } from "../../hooks/useEscapeKey";

interface ValidationOverlayProps {
  issues: ValidationIssue[];
  onDismiss: () => void;
}

export default function ValidationOverlay({ issues, onDismiss }: ValidationOverlayProps) {
  useEscapeKey(onDismiss, issues.length > 0);

  if (issues.length === 0) return null;

  const errors = issues.filter((i) => i.severity === "error");

  return (
    <div className="absolute bottom-4 left-4 right-4 z-40">
      <div
        className="mx-auto max-w-md rounded-xl border p-3"
        style={{ background: "var(--app-surface)", borderColor: "var(--app-border)", boxShadow: "var(--shadow-2)" }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <span className="font-medium" style={{ color: "var(--app-text)" }}>
              {issues.length} issue{issues.length > 1 ? "s" : ""} found
            </span>
            {errors.length > 0 && (
              <span className="text-red-400 text-xs">({errors.length} error{errors.length > 1 ? "s" : ""})</span>
            )}
          </div>
          <button
            onClick={onDismiss}
            className="p-1 rounded-lg transition-colors hover:bg-[var(--app-hover)]"
            style={{ color: "var(--app-muted)" }}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
        <div className="space-y-1">
          {issues.slice(0, 3).map((issue, i) => (
            <div
              key={`${issue.code}-${issue.sourceObject.id}-${i}`}
              className="flex items-start gap-2 text-xs"
            >
              <span
                className={`mt-0.5 flex-shrink-0 ${
                  issue.severity === "error" ? "text-red-400" : "text-yellow-400"
                }`}
              >
                {issue.severity === "error" ? "●" : "○"}
              </span>
              <span style={{ color: "var(--app-muted)" }}>{issue.message}</span>
            </div>
          ))}
          {issues.length > 3 && (
            <div className="pt-1 text-xs" style={{ color: "var(--app-muted)" }}>
              +{issues.length - 3} more issue{issues.length - 3 > 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
