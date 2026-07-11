import { useState } from "react";
import { FolderOpen, Clock, Moon, Sun, Trash2, Settings } from "lucide-react";
import type { RecentWorkspace } from "../../types";
import { useUIStore } from "../../stores/useUIStore";
import DefaultColorsSettingsDialog from "./DefaultColorsSettingsDialog";

interface WelcomeScreenProps {
  recents: RecentWorkspace[];
  onCreateWorkspace: () => void;
  onOpenWorkspace: () => void;
  onOpenRecent: (path: string) => void;
  onDeleteRecent: (path: string) => void;
}

export default function WelcomeScreen({
  recents,
  onCreateWorkspace,
  onOpenWorkspace,
  onOpenRecent,
  onDeleteRecent,
}: WelcomeScreenProps) {
  const themeMode = useUIStore((s) => s.themeMode);
  const toggleThemeMode = useUIStore((s) => s.toggleThemeMode);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div
      className="w-full h-full flex items-center justify-center relative"
      data-theme={themeMode}
      style={{
        background: "var(--app-bg)",
        color: "var(--app-text)",
        backgroundImage: `radial-gradient(${themeMode === "dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"} 1.4px, transparent 1.4px)`,
        backgroundSize: "18px 18px",
      }}
    >
      <button
        onClick={() => setShowSettings(true)}
        className="absolute top-6 right-16 p-2 rounded-lg hover:bg-white/10 transition-colors"
        style={{ color: "var(--app-muted)" }}
        title="Default relationship colors"
      >
        <Settings className="w-4 h-4" />
      </button>
      <button
        onClick={toggleThemeMode}
        className="absolute top-6 right-6 p-2 rounded-lg hover:bg-white/10 transition-colors"
        style={{ color: "var(--app-muted)" }}
        title={themeMode === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      >
        {themeMode === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {showSettings && <DefaultColorsSettingsDialog onClose={() => setShowSettings(false)} />}
      <div className="max-w-md w-full px-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl mb-2" style={{ color: "var(--app-text)" }}>
            <span style={{ fontFamily: "'Courier New', monospace", fontWeight: 400 }}>Klia</span>
            <span className="font-bold">∈</span>
          </h1>
          <p className="text-sm" style={{ color: "var(--app-muted)" }}>
            A graph based learning environment
          </p>
        </div>

        <div className="space-y-3 mb-8">
          <button
            onClick={onCreateWorkspace}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left hover:bg-white/5"
            style={{ background: "var(--app-surface-2)", border: "1px solid var(--app-border)", color: "var(--app-text)" }}
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-lg" style={{ background: "var(--app-surface)" }}>
              <FolderOpen className="w-5 h-5" style={{ color: "var(--app-accent)" }} />
            </div>
            <div>
              <div className="font-medium text-sm">Create Workspace</div>
              <div className="text-xs" style={{ color: "var(--app-muted)" }}>Start a new knowledge graph</div>
            </div>
          </button>

          <button
            onClick={onOpenWorkspace}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left hover:bg-white/5"
            style={{ background: "var(--app-surface-2)", border: "1px solid var(--app-border)", color: "var(--app-muted)" }}
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-lg" style={{ background: "var(--app-surface)" }}>
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="font-medium text-sm">Open Workspace</div>
              <div className="text-xs" style={{ color: "var(--app-muted)" }}>Browse for an existing workspace</div>
            </div>
          </button>
        </div>

        {recents.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3 text-xs uppercase tracking-wider" style={{ color: "var(--app-muted)" }}>
              <Clock className="w-3 h-3" />
              Recent Workspaces
            </div>
            <div className="space-y-1">
              {recents.slice(0, 5).map((recent) => (
                <div
                  key={recent.path}
                  className="group w-full flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors hover:bg-white/5"
                  style={{ color: "var(--app-muted)" }}
                >
                  <button
                    onClick={() => onOpenRecent(recent.path)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <FolderOpen className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{recent.name}</span>
                  </button>
                  <span className="text-xs flex-shrink-0" style={{ color: "var(--app-muted)" }}>
                    {new Date(recent.lastOpened).toLocaleDateString()}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteRecent(recent.path);
                    }}
                    className="flex-shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10"
                    style={{ color: "var(--app-muted)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--app-muted)")}
                    title="Remove from recents"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}