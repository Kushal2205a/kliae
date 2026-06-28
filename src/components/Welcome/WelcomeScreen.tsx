import { BookOpen, FolderOpen, Clock } from "lucide-react";
import type { RecentWorkspace } from "../../types";

interface WelcomeScreenProps {
  recents: RecentWorkspace[];
  onCreateWorkspace: () => void;
  onOpenWorkspace: () => void;
  onOpenRecent: (path: string) => void;
}

export default function WelcomeScreen({
  recents,
  onCreateWorkspace,
  onOpenWorkspace,
  onOpenRecent,
}: WelcomeScreenProps) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-[#13131a]">
      <div className="max-w-md w-full px-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/10 mb-4">
            <BookOpen className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Knowledge Graph</h1>
          <p className="text-sm text-white/50">
            A graph-first learning environment for complex topics
          </p>
        </div>

        <div className="space-y-3 mb-8">
          <button
            onClick={onCreateWorkspace}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 hover:bg-blue-500/20 transition-colors text-left"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="font-medium text-sm">Create Workspace</div>
              <div className="text-xs text-white/40">Start a new knowledge graph</div>
            </div>
          </button>

          <button
            onClick={onOpenWorkspace}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-colors text-left"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/10">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="font-medium text-sm">Open Workspace</div>
              <div className="text-xs text-white/40">Browse for an existing workspace</div>
            </div>
          </button>
        </div>

        {recents.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3 text-white/40 text-xs uppercase tracking-wider">
              <Clock className="w-3 h-3" />
              Recent Workspaces
            </div>
            <div className="space-y-1">
              {recents.slice(0, 5).map((recent) => (
                <button
                  key={recent.path}
                  onClick={() => onOpenRecent(recent.path)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded text-sm text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors text-left"
                >
                  <FolderOpen className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{recent.name}</span>
                  <span className="text-xs text-white/30 ml-auto flex-shrink-0">
                    {new Date(recent.lastOpened).toLocaleDateString()}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
