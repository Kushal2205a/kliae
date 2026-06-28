import { AlertTriangle, X } from "lucide-react";
import type { ValidationIssue } from "../../types";

interface ValidationOverlayProps {
  issues: ValidationIssue[];
  onDismiss: () => void;
}

export default function ValidationOverlay({ issues, onDismiss }: ValidationOverlayProps) {
  if (issues.length === 0) return null;

  const errors = issues.filter((i) => i.severity === "error");

  return (
    <div className="absolute bottom-4 left-4 right-4 z-40">
      <div className="bg-[#1e1e2e] border border-white/10 rounded-lg shadow-xl p-3 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <span className="text-white/80 font-medium">
              {issues.length} issue{issues.length > 1 ? "s" : ""} found
            </span>
            {errors.length > 0 && (
              <span className="text-red-400 text-xs">({errors.length} error{errors.length > 1 ? "s" : ""})</span>
            )}
          </div>
          <button
            onClick={onDismiss}
            className="p-1 rounded text-white/40 hover:text-white/80 hover:bg-white/5"
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
              <span className="text-white/50">{issue.message}</span>
            </div>
          ))}
          {issues.length > 3 && (
            <div className="text-xs text-white/30 pt-1">
              +{issues.length - 3} more issue{issues.length - 3 > 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
