import { useState, useEffect, useRef, useCallback } from "react";

interface CommandItem {
  type: string;
  label: string;
  description?: string;
  shortcut?: string;
}

interface CommandPaletteProps {
  commands: CommandItem[];
  onExecute: (command: CommandItem) => void;
  onClose: () => void;
}

export default function CommandPalette({
  commands,
  onExecute,
  onClose,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query
    ? commands.filter(
        (cmd) =>
          cmd.label.toLowerCase().includes(query.toLowerCase()) ||
          cmd.type.toLowerCase().includes(query.toLowerCase()),
      )
    : commands;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" && filtered[selectedIndex]) {
        onExecute(filtered[selectedIndex]);
        onClose();
        return;
      }
    },
    [filtered, selectedIndex, onExecute, onClose],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60">
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border shadow-2xl"
        style={{ background: "var(--app-surface)", borderColor: "var(--app-border)" }}
      >
        <div className="p-3 border-b" style={{ borderColor: "var(--app-border)" }}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-sm focus:outline-none placeholder:text-[var(--app-muted)]"
            style={{ color: "var(--app-text)" }}
            placeholder="Type a command..."
          />
        </div>
        <div className="max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-4 text-white/30 text-sm text-center">
              No commands found
            </div>
          ) : (
            filtered.map((cmd, index) => (
              <button
                key={cmd.type}
                onClick={() => {
                  onExecute(cmd);
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`
                  w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors
                  ${
                    index === selectedIndex
                      ? "bg-[var(--app-active)] text-[var(--app-text)]"
                      : "text-[var(--app-muted)] hover:bg-[var(--app-hover)] hover:text-[var(--app-text)]"
                  }
                `}
              >
                <span className="flex-1">{cmd.label}</span>
                {cmd.shortcut && (
                  <span className="text-xs font-mono" style={{ color: "var(--app-muted)" }}>{cmd.shortcut}</span>
                )}
              </button>
            ))
          )}
        </div>
        <div className="border-t px-4 py-2 text-xs" style={{ borderColor: "var(--app-border)", color: "var(--app-muted)" }}>
          ↑↓ Navigate &middot; Enter Select &middot; Esc Close
        </div>
      </div>
    </div>
  );
}
