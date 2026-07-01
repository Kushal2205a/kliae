import { Undo2, Redo2, Search, Plus, LogOut, MousePointer2, Square, Circle, Squircle, Moon, Sun, Filter, X } from "lucide-react";
import Breadcrumbs from "../Navigation/Breadcrumbs";
import type { Breadcrumb } from "../../types";
import type { CanvasTool } from "../../stores/useUIStore";
import { useUIStore } from "../../stores/useUIStore";
import { useFilterStore } from "../../stores/useFilterStore";
import { BUILTIN_RELATIONSHIPS} from "../../constants/relationships";
import { useState, useRef, useEffect } from "react";

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

export default function Header({
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
      <span className="text-sm font-semibold mr-2 truncate max-w-[180px] flex items-center gap-2" style={{ color: "var(--app-text)" }}>
        {onGoHome && (
          <button
            onClick={onGoHome}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            style={{ color: "var(--app-muted)" }}
            title="Back to Main Menu"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        )}
        {workspaceName}
      </span>

      <div className="flex-1 flex items-center min-w-0">
        <Breadcrumbs breadcrumbs={breadcrumbs} onNavigate={onNavigateBreadcrumb} />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {currentTool !== undefined && onToolChange && (
          <>
            <div
              className="flex items-center gap-1 rounded-xl border p-1 shadow-inner"
              style={{ background: "var(--app-surface-2)", borderColor: "var(--app-border)" }}
            >
              {tools.map((tool) => {
                const Icon = tool.icon;
                const active = currentTool === tool.id;
                return (
                  <button
                    key={tool.id}
                    onClick={() => onToolChange(tool.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                      active ? "bg-white/15 text-white shadow-sm" : "hover:bg-white/10"
                    }`}
                    style={{ color: active ? undefined : "var(--app-muted)" }}
                    title={tool.label}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tool.label === "Select" ? null : <span>{tool.label}</span>}
                  </button>
                );
              })}
            </div>
            <div className="w-px h-6 mx-1" style={{ background: "var(--app-border)" }} />
          </>
        )}

        <button
          onClick={onAddNode}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold text-sm hover:bg-white/15 transition-all duration-150"
          style={{ background: "var(--app-surface-2)", border: "1px solid var(--app-border)", color: "var(--app-text)" }}
          title="Add Node (Ctrl+N)"
        >
          <Plus className="w-4 h-4" />
          <span>Add Node</span>
        </button>

        <div className="w-px h-6 mx-1" style={{ background: "var(--app-border)" }} />

        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          style={{ color: "var(--app-muted)" }}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          style={{ color: "var(--app-muted)" }}
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <div className="w-px h-6 mx-1" style={{ background: "var(--app-border)" }} />

        <button
          onClick={onOpenCommandPalette}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          style={{ color: "var(--app-muted)" }}
          title="Command Palette (Ctrl+Shift+P)"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Filter popover */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setFilterOpen((v) => !v)}
            className={`p-2 rounded-lg transition-colors ${filterActive ? "bg-white/15" : "hover:bg-white/10"}`}
            style={{ color: filterActive ? "var(--app-text)" : "var(--app-muted)" }}
            title="Filter by relationship type"
          >
            <Filter className="w-4 h-4" />
          </button>

          {filterOpen && (
            <div
              className="absolute right-0 top-10 z-50 w-56 rounded-xl border shadow-2xl py-2"
              style={{ background: "var(--app-surface)", borderColor: "var(--app-border)" }}
            >
              <div className="flex items-center justify-between px-3 pb-2 border-b" style={{ borderColor: "var(--app-border)" }}>
                <span className="text-xs font-semibold" style={{ color: "var(--app-muted)" }}>
                  Filter by relationship
                </span>
                {filterActive && (
                  <button
                    onClick={() => { clearFilter(); setFilterOpen(false); }}
                    className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors"
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
                  className={`w-full text-left text-xs px-2 py-1.5 rounded-lg transition-colors ${filterActive ? "bg-white/10" : "hover:bg-white/5"}`}
                  style={{ color: "var(--app-text)" }}
                >
                  {filterActive ? "✓ Filter active" : "Enable filter"}
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
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs hover:bg-white/5 transition-colors"
                      style={{ color: "var(--app-text)" }}
                    >
                      <span
                        className="flex-shrink-0 w-2 h-2 rounded-full"
                        style={{ background: checked ? color : "transparent", border: `1.5px solid ${color}` }}
                      />
                      <span className="flex-1 text-left">{label}</span>
                      {checked && <span style={{ color: "var(--app-muted)" }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={toggleThemeMode}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          style={{ color: "var(--app-muted)" }}
          title={themeMode === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        >
          {themeMode === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}