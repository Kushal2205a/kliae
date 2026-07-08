import { Undo2, Redo, Plus, LogOut, MousePointer2, Square, Circle, Squircle, Moon, Sun, Filter, X, Keyboard, Check } from "lucide-react";
import Breadcrumbs from "../Navigation/Breadcrumbs";
import type { Breadcrumb } from "../../types";
import type { CanvasTool } from "../../stores/useUIStore";
import { useUIStore } from "../../stores/useUIStore";
import { useFilterStore } from "../../stores/useFilterStore";
import { BUILTIN_RELATIONSHIPS} from "../../constants/relationships";
import { useState, useRef, useEffect } from "react";
import ShortcutsModal from "./ShortcutsModal";

interface HeaderProps {
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
}

const tools: { id: CanvasTool; icon: typeof MousePointer2; label: string }[] = [
  { id: "select", icon: MousePointer2, label: "Select" },
  { id: "rectangle", icon: Square, label: "Rect" },
  { id: "rounded-rectangle", icon: Squircle, label: "Round" },
  { id: "ellipse", icon: Circle, label: "Ellipse" },
];

// Every icon in this header shares this size. Mixing 14/16/20px icons across
// one toolbar is the fastest way to make an interface feel unconsidered.
const ICON = "w-4 h-4";

// A quiet container used to group related controls (tool switcher, history,
// utilities) into one visual cluster. Structure communicates relationship
// here instead of hairline dividers between every single button.
function ControlGroup({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-0.5 rounded-xl border p-1"
      style={{ background: "var(--app-surface-2)", borderColor: "var(--app-border)" }}
    >
      {children}
    </div>
  );
}

export default function Header({
  workspaceName,
  breadcrumbs,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onNavigateBreadcrumb,
  onAddNode,
  onGoHome,
  currentTool,
  onToolChange,
}: HeaderProps) {
  const themeMode = useUIStore((s) => s.themeMode);
  const toggleThemeMode = useUIStore((s) => s.toggleThemeMode);
  const filterActive = useFilterStore((s) => s.active);
  const selectedFilterKeys = useFilterStore((s) => s.selectedKeys);
  const toggleActive = useFilterStore((s) => s.toggleActive);
  const toggleKey = useFilterStore((s) => s.toggleKey);
  const clearFilter = useFilterStore((s) => s.clear);

  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Close popover on outside click
  useEffect(() => {
    if (!filterOpen) return;
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [filterOpen]);

  // All available filter keys: builtins (excluding "custom" itself, since custom
  // edges appear under their customLabel keys) plus any custom keys active now.
  const builtinKeys = BUILTIN_RELATIONSHIPS
    .filter((r) => r.id !== "custom")
    .map((r) => ({ key: r.id, label: r.displayName, color: r.color }));

  const activeCustomKeys = Array.from(selectedFilterKeys)
    .filter((k) => k.startsWith("custom:"))
    .map((k) => ({ key: k, label: k.slice(7), color: "#6b7280" }));

  const allFilterOptions = [...builtinKeys, ...activeCustomKeys];

  return (
    <header
      className="h-12 border-b flex items-center px-4 gap-3 select-none backdrop-blur-xl relative z-10"
      style={{ background: "var(--app-panel)", borderColor: "var(--app-border)" }}
    >
      <span className="text-sm font-semibold mr-1 truncate max-w-[180px] flex items-center gap-1.5" style={{ color: "var(--app-text)" }}>
        {onGoHome && (
          <button
            onClick={onGoHome}
            className="p-1.5 rounded-lg hover:bg-[var(--app-hover)] transition-colors"
            style={{ color: "var(--app-muted)" }}
            title="Back to Main Menu"
          >
            <LogOut className={ICON} />
          </button>
        )}
        {workspaceName}
      </span>

      <div className="flex-1 flex items-center min-w-0">
        <Breadcrumbs breadcrumbs={breadcrumbs} onNavigate={onNavigateBreadcrumb} />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {currentTool !== undefined && onToolChange && (
          <ControlGroup>
            {tools.map((tool) => {
              const Icon = tool.icon;
              const active = currentTool === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => onToolChange(tool.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                    active ? "bg-[var(--app-active)] shadow-sm" : "hover:bg-[var(--app-hover)]"
                  }`}
                  style={{ color: active ? "var(--app-text)" : "var(--app-muted)" }}
                  title={tool.label}
                >
                  <Icon className={ICON} />
                  {tool.label === "Select" ? null : <span>{tool.label}</span>}
                </button>
              );
            })}
          </ControlGroup>
        )}

        <button
          onClick={onAddNode}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold text-sm transition-all duration-150 hover:opacity-90"
          style={{ background: "var(--app-text)", color: "var(--app-bg)" }}
          title="Add Node (Ctrl+N)"
        >
          <Plus className={ICON} />
          <span>Add Node</span>
        </button>

        <ControlGroup>
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 rounded-lg hover:bg-[var(--app-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            style={{ color: "var(--app-muted)" }}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className={ICON} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 rounded-lg hover:bg-[var(--app-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            style={{ color: "var(--app-muted)" }}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo className={ICON} />
          </button>
        </ControlGroup>

        <ControlGroup>
          {/* Filter popover */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setFilterOpen((v) => !v)}
              className={`p-1.5 rounded-lg transition-colors ${filterActive ? "bg-[var(--app-active)]" : "hover:bg-[var(--app-hover)]"}`}
              style={{ color: filterActive ? "var(--app-text)" : "var(--app-muted)" }}
              title="Filter by relationship type"
            >
              <Filter className={ICON} />
            </button>

            {filterOpen && (
              <div
                className="absolute right-0 top-11 z-50 w-56 rounded-xl border shadow-2xl py-2"
                style={{ background: "var(--app-surface)", borderColor: "var(--app-border)" }}
              >
                <div className="flex items-center justify-between px-3 pb-2 border-b" style={{ borderColor: "var(--app-border)" }}>
                  <span className="text-xs font-semibold" style={{ color: "var(--app-muted)" }}>
                    Filter by relationship
                  </span>
                  {filterActive && (
                    <button
                      onClick={() => { clearFilter(); setFilterOpen(false); }}
                      className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded hover:bg-[var(--app-hover)] transition-colors"
                      style={{ color: "var(--app-muted)" }}
                    >
                      <X className="w-3 h-3" /> Clear
                    </button>
                  )}
                </div>

                {/* Enable/disable toggle */}
                <div className="px-3 py-2 border-b" style={{ borderColor: "var(--app-border)" }}>
                  <button
                    onClick={toggleActive}
                    className={`w-full flex items-center gap-1.5 text-left text-xs px-2 py-1.5 rounded-lg transition-colors ${filterActive ? "bg-[var(--app-active)]" : "hover:bg-[var(--app-hover)]"}`}
                    style={{ color: "var(--app-text)" }}
                  >
                    {filterActive && <Check className="w-3 h-3" />}
                    {filterActive ? "Filter active" : "Enable filter"}
                  </button>
                </div>

                <div className="py-1 max-h-64 overflow-y-auto">
                  {allFilterOptions.map(({ key, label, color }) => {
                    const checked = selectedFilterKeys.has(key);
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          toggleKey(key);
                          if (!filterActive) toggleActive();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs hover:bg-[var(--app-hover)] transition-colors"
                        style={{ color: "var(--app-text)" }}
                      >
                        <span
                          className="flex-shrink-0 w-2 h-2 rounded-full"
                          style={{ background: checked ? color : "transparent", border: `1.5px solid ${color}` }}
                        />
                        <span className="flex-1 text-left">{label}</span>
                        {checked && <Check className="w-3 h-3" style={{ color: "var(--app-muted)" }} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={toggleThemeMode}
            className="p-1.5 rounded-lg hover:bg-[var(--app-hover)] transition-colors"
            style={{ color: "var(--app-muted)" }}
            title={themeMode === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            {themeMode === "dark" ? <Sun className={ICON} /> : <Moon className={ICON} />}
          </button>

          <button
            onClick={() => setShortcutsOpen(true)}
            className="p-1.5 rounded-lg hover:bg-[var(--app-hover)] transition-colors"
            style={{ color: "var(--app-muted)" }}
            title="Keyboard shortcuts"
          >
            <Keyboard className={ICON} />
          </button>
        </ControlGroup>
      </div>

      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </header>
  );
}