import { ChevronRight, Home } from "lucide-react";
import type { Breadcrumb } from "../../types";

interface BreadcrumbsProps {
  breadcrumbs: Breadcrumb[];
  onNavigate: (index: number) => void;
}

export default function Breadcrumbs({ breadcrumbs, onNavigate }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center gap-1 text-sm text-white/60">
      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.graphId} className="flex items-center gap-1">
          {index > 0 && <ChevronRight className="w-3 h-3 text-white/30" />}
          <button
            onClick={() => onNavigate(index)}
            className={`
              px-2 py-0.5 rounded transition-colors
              ${
                index === breadcrumbs.length - 1
                  ? "text-white/90 font-medium"
                  : "hover:text-white/80 hover:bg-white/5"
              }
            `}
          >
            {index === 0 ? (
              <span className="flex items-center gap-1">
                <Home className="w-3 h-3" />
                {crumb.graphName}
              </span>
            ) : (
              <span>{crumb.nodeLabel ?? crumb.graphName}</span>
            )}
          </button>
        </div>
      ))}
    </nav>
  );
}
