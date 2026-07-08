import type { ReactNode } from "react";
import { Eye, Pencil, Settings } from "lucide-react";
import Header from "./Header";
import type { Breadcrumb } from "../../types";
import type { CanvasTool } from "../../stores/useUIStore";
import { useUIStore } from "../../stores/useUIStore";

interface AppShellProps {
  workspaceName: string;
  breadcrumbs: Breadcrumb[];
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onNavigateBreadcrumb: (index: number) => void;
  onOpenCommandPalette: () => void;
  onAddNode: () => void;
  onGoHome?: () => void;
  currentTool?: CanvasTool;
  onToolChange?: (tool: CanvasTool) => void;
  /** Opens the project-specific settings panel (e.g. custom relationship colors). */
  onOpenProjectSettings?: () => void;
  children: ReactNode;
  sidebar?: ReactNode;
}

// Icon size shared by the floating canvas controls, matching the header's scale.
const ICON = "w-4 h-4";

export default function AppShell({
  workspaceName,
  breadcrumbs,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onNavigateBreadcrumb,
  onOpenCommandPalette,
  onAddNode,
  onGoHome,
  currentTool,
  onToolChange,
  onOpenProjectSettings,
  children,
  sidebar,
}: AppShellProps) {
  const contentMode = useUIStore((s) => s.contentMode);
  const toggleContentMode = useUIStore((s) => s.toggleContentMode);
  const themeMode = useUIStore((s) => s.themeMode);

  return (
    <div className="w-full h-full flex flex-col text-white" data-theme={themeMode} style={{ background: "var(--app-bg)", color: "var(--app-text)" }}>
      <Header
        workspaceName={workspaceName}
        breadcrumbs={breadcrumbs}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={onUndo}
        onRedo={onRedo}
        onNavigateBreadcrumb={onNavigateBreadcrumb}
        onOpenCommandPalette={onOpenCommandPalette}
        onAddNode={onAddNode}
        onGoHome={onGoHome}
        currentTool={currentTool}
        onToolChange={onToolChange}
      />
      <div className="flex-1 flex overflow-hidden">
        {sidebar && (
          <aside className="w-72 border-r overflow-y-auto" style={{ background: "var(--app-surface)", borderColor: "var(--app-border)" }}>
            {sidebar}
          </aside>
        )}
        <main className="flex-1 relative overflow-hidden">
          {children}

          {/* One grouped floating cluster for canvas level controls, instead of
              two independently positioned circles that read as unrelated. */}
          <div
            className="absolute right-4 top-4 z-40 flex flex-col items-center rounded-full border shadow-xl backdrop-blur overflow-hidden"
            style={{ background: "var(--app-panel)", borderColor: "var(--app-border)" }}
          >
            {onOpenProjectSettings && (
              <>
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center transition-colors hover:bg-[var(--app-hover)]"
                  style={{ color: "var(--app-muted)" }}
                  title="Project settings"
                  onClick={onOpenProjectSettings}
                >
                  <Settings className={ICON} />
                </button>
                <div className="w-6 h-px" style={{ background: "var(--app-border)" }} />
              </>
            )}
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center transition-colors hover:bg-[var(--app-hover)]"
              style={{ color: "var(--app-muted)" }}
              title={contentMode === "edit" ? "Switch to view mode" : "Switch to edit mode"}
              onClick={toggleContentMode}
            >
              {contentMode === "edit" ? <Eye className={ICON} /> : <Pencil className={ICON} />}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}