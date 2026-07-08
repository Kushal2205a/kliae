import { ChevronRight, Home } from "lucide-react";
import type { Breadcrumb } from "../../types";

interface BreadcrumbsProps {
  breadcrumbs: Breadcrumb[];
  onNavigate: (index: number) => void;
}

// One size smaller than the header's primary 16px icon scale, since these
// are secondary navigation, not primary controls, but consistent with each
// other rather than an arbitrary 12px.
const ICON = "w-3.5 h-3.5";

export default function Breadcrumbs({ breadcrumbs, onNavigate }: BreadcrumbsProps) {
  return (
    <nav
      className="flex items-center gap-1 text-sm min-w-0 overflow-x-auto"
      style={{ color: "var(--app-muted)" }}
    >
      {breadcrumbs.map((crumb, index) => {
        const isCurrent = index === breadcrumbs.length - 1;
        return (
          <div key={crumb.graphId} className="flex items-center gap-1 min-w-0 shrink-0">
            {index > 0 && (
              <ChevronRight className={`${ICON} shrink-0`} style={{ color: "var(--app-border)" }} />
            )}
            <button
              onClick={() => onNavigate(index)}
              className="px-2 py-1 rounded-lg transition-colors min-w-0 max-w-[180px] overflow-hidden hover:bg-[var(--app-hover)]"
              style={{
                color: isCurrent ? "var(--app-text)" : "var(--app-muted)",
                fontWeight: isCurrent ? 500 : undefined,
                background: isCurrent ? "var(--app-active)" : undefined,
              }}
            >
              {index === 0 ? (
                <span className="flex items-center gap-1.5">
                  <Home className={`${ICON} shrink-0`} />
                  <span className="truncate">{crumb.graphName}</span>
                </span>
              ) : (
                <span className="truncate block">{crumb.nodeLabel ?? crumb.graphName}</span>
              )}
            </button>
          </div>
        );
      })}
    </nav>
  );
}