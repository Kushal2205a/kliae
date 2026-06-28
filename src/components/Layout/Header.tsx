import { Undo2, Redo2, Search } from "lucide-react";
import Breadcrumbs from "../Navigation/Breadcrumbs";
import type { Breadcrumb } from "../../types";

interface HeaderProps {
  workspaceName: string;
  breadcrumbs: Breadcrumb[];
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onNavigateBreadcrumb: (index: number) => void;
  onOpenCommandPalette: () => void;
}

export default function Header({
  workspaceName,
  breadcrumbs,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onNavigateBreadcrumb,
  onOpenCommandPalette,
}: HeaderProps) {
  return (
    <header className="h-10 bg-[#181825] border-b border-white/5 flex items-center px-3 gap-3 select-none">
      <span className="text-sm font-medium text-white/70 mr-2 truncate max-w-[160px]">
        {workspaceName}
      </span>

      <div className="flex-1 flex items-center">
        <Breadcrumbs breadcrumbs={breadcrumbs} onNavigate={onNavigateBreadcrumb} />
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-1.5 rounded text-white/40 hover:text-white/80 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-1.5 rounded text-white/40 hover:text-white/80 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-white/10 mx-1" />

        <button
          onClick={onOpenCommandPalette}
          className="p-1.5 rounded text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors"
          title="Command Palette (Ctrl+Shift+P)"
        >
          <Search className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
