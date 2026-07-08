import { X } from "lucide-react";

interface ShortcutItem {
  keys: string[];
  label: string;
}

interface ShortcutGroup {
  title: string;
  items: ShortcutItem[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "General",
    items: [
      { keys: ["Ctrl", "N"], label: "Add node" },
      { keys: ["Ctrl", "Shift", "P"], label: "Open command palette" },
      { keys: ["Ctrl", "Z"], label: "Undo" },
      { keys: ["Ctrl", "Shift", "Z"], label: "Redo" },
      { keys: ["Delete"], label: "Delete selection" },
      { keys: ["Escape"], label: "Close dialog / deselect" },
    ],
  },
  {
    title: "Editing",
    items: [
      { keys: ["Ctrl", "C"], label: "Copy" },
      { keys: ["Ctrl", "V"], label: "Paste" },
    ],
  },
];

function KeyCap({ children }: { children: string }) {
  return (
    <kbd
      className="px-1.5 py-0.5 rounded-md border text-[11px] font-mono leading-none"
      style={{ background: "var(--app-surface-2)", borderColor: "var(--app-border)", color: "var(--app-text)" }}
    >
      {children}
    </kbd>
  );
}

interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ShortcutsModal({ open, onClose }: ShortcutsModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[420px] max-h-[80vh] overflow-y-auto border shadow-2xl"
        style={{ background: "var(--app-panel)", borderColor: "var(--app-border)", borderRadius: "var(--radius-card)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-4 py-3 border-b sticky top-0"
          style={{ borderColor: "var(--app-border)", background: "var(--app-panel)" }}
        >
          <span className="text-sm font-semibold" style={{ color: "var(--app-text)" }}>
            Keyboard shortcuts
          </span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--app-hover)] transition-colors"
            style={{ color: "var(--app-muted)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-3 space-y-4">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title}>
              <div className="text-xs font-semibold mb-2" style={{ color: "var(--app-muted)" }}>
                {group.title}
              </div>
              <div className="space-y-1.5">
                {group.items.map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-xs">
                    <span style={{ color: "var(--app-text)" }}>{item.label}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k, i) => (
                        <span key={i} className="flex items-center gap-1">
                          <KeyCap>{k}</KeyCap>
                          {i < item.keys.length - 1 && (
                            <span style={{ color: "var(--app-muted)" }}>+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}