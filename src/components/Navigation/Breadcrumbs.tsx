import { ChevronRight, Home } from "lucide-react";
import type { Breadcrumb } from "../../types";

interface BreadcrumbsProps {
  breadcrumbs: Breadcrumb[];
  onNavigate: (index: number) => void;
}

export default function Breadcrumbs({ breadcrumbs, onNavigate }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center gap-1 text-sm min-w-0" style={{ color: "var(--app-muted)" }}>
      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.graphId} className="flex items-center gap-1 min-w-0 overflow-hidden">
          {index > 0 && (
            <ChevronRight className="w-3 h-3 shrink-0" style={{ color: "var(--app-border)" }} />
          )}
          <button
            onClick={() => onNavigate(index)}
            className="px-2 py-0.5 rounded transition-colors min-w-0 overflow-hidden hover:bg-white/5"
            style={{
              color: index === breadcrumbs.length - 1 ? "var(--app-text)" : "var(--app-muted)",
              fontWeight: index === breadcrumbs.length - 1 ? 500 : undefined,
            }}
          >
            {index === 0 ? (
              <span className="flex items-center gap-1">
                <Home className="w-3 h-3 shrink-0" />
                <span className="truncate">{crumb.graphName}</span>
              </span>
            ) : (
              <span className="truncate">{crumb.nodeLabel ?? crumb.graphName}</span>
            )}
          </button>
        </div>
      ))}
    </nav>
  );
}