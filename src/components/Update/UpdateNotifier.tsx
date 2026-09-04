import { useEffect, useRef, useState } from "react";
import { Download, RotateCw, X } from "lucide-react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { useEscapeKey } from "../../hooks/useEscapeKey";

// Module-level guard: this component can mount/unmount as the app switches
// between the welcome screen, loading state, and workspace view, but we only
// ever want to hit the update endpoint once per app session.
let hasCheckedThisSession = false;

type NotifierState =
  | { phase: "idle" }
  | { phase: "downloading"; version: string; progress: number | null }
  | { phase: "ready"; version: string }
  | { phase: "dismissed" };

export default function UpdateNotifier() {
  const [state, setState] = useState<NotifierState>({ phase: "idle" });
  const updateRef = useRef<Update | null>(null);
  useEscapeKey(() => setState({ phase: "dismissed" }), state.phase === "ready");

  useEffect(() => {
    if (hasCheckedThisSession) return;
    hasCheckedThisSession = true;

    (async () => {
      try {
        const update = await check();
        if (!update) return;

        updateRef.current = update;
        setState({ phase: "downloading", version: update.version, progress: null });

        let contentLength = 0;
        let downloaded = 0;

        await update.downloadAndInstall((event) => {
          switch (event.event) {
            case "Started":
              contentLength = event.data.contentLength ?? 0;
              break;
            case "Progress":
              downloaded += event.data.chunkLength;
              setState((prev) =>
                prev.phase === "downloading"
                  ? {
                      ...prev,
                      progress: contentLength > 0 ? Math.min(1, downloaded / contentLength) : null,
                    }
                  : prev,
              );
              break;
            case "Finished":
              break;
          }
        });

        setState({ phase: "ready", version: update.version });
      } catch (err) {
        // Silent failure: a flaky network or unreachable release endpoint
        // shouldn't interrupt someone trying to use the app.
        console.error("Update check failed:", err);
      }
    })();
  }, []);

  if (state.phase === "idle" || state.phase === "dismissed") return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] w-72 rounded-xl border shadow-2xl backdrop-blur-xl px-4 py-3"
      style={{ background: "var(--app-panel)", borderColor: "var(--app-border)", color: "var(--app-text)" }}
    >
      {state.phase === "downloading" && (
        <>
          <div className="flex items-center gap-2 mb-2">
            <Download className="w-4 h-4 flex-shrink-0" style={{ color: "var(--app-accent)" }} />
            <span className="text-sm font-medium">Downloading update {state.version}</span>
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--app-surface-2)" }}>
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{
                background: "var(--app-accent)",
                width: state.progress !== null ? `${Math.round(state.progress * 100)}%` : "35%",
              }}
            />
          </div>
        </>
      )}

      {state.phase === "ready" && (
        <>
          <div className="flex items-start gap-2 mb-3">
            <RotateCw className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "var(--app-accent)" }} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">Update {state.version} ready</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--app-muted)" }}>
                Restart to finish installing.
              </div>
            </div>
            <button
              onClick={() => setState({ phase: "dismissed" })}
              className="p-0.5 rounded hover:bg-white/10 transition-colors flex-shrink-0"
              style={{ color: "var(--app-muted)" }}
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => relaunch()}
              className="flex-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors hover:opacity-90"
              style={{ background: "var(--app-accent)", color: "var(--app-bg)" }}
            >
              Restart Now
            </button>
            <button
              onClick={() => setState({ phase: "dismissed" })}
              className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-white/10"
              style={{ color: "var(--app-muted)", border: "1px solid var(--app-border)" }}
            >
              Later
            </button>
          </div>
        </>
      )}
    </div>
  );
}
