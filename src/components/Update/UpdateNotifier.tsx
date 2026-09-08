import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Download, RefreshCw, Sparkles, X } from "lucide-react";
import { check, type DownloadEvent, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { useEscapeKey } from "../../hooks/useEscapeKey";

// The notifier is mounted next to App so switching views cannot discard it.
// This guard also protects development remounts from checking twice.
let hasCheckedThisSession = false;

type NotifierState =
  | { phase: "idle" }
  | { phase: "available"; version: string; currentVersion: string; notes?: string }
  | { phase: "downloading"; version: string; progress: number | null }
  | { phase: "installing"; version: string }
  | { phase: "ready"; version: string }
  | { phase: "error"; version: string; message: string; retry: "install" | "restart" }
  | { phase: "dismissed" };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The update could not be installed.";
}

export default function UpdateNotifier() {
  const [state, setState] = useState<NotifierState>({ phase: "idle" });
  const updateRef = useRef<Update | null>(null);
  const canDismiss = state.phase === "available" || state.phase === "ready" || state.phase === "error";

  const dismiss = () => {
    const update = updateRef.current;
    updateRef.current = null;
    setState({ phase: "dismissed" });
    if (update) void update.close().catch(() => undefined);
  };

  useEscapeKey(dismiss, canDismiss);

  useEffect(() => {
    if (hasCheckedThisSession) return;
    hasCheckedThisSession = true;

    void (async () => {
      try {
        const update = await check({ timeout: 30_000 });
        if (!update) return;

        updateRef.current = update;
        setState({
          phase: "available",
          version: update.version,
          currentVersion: update.currentVersion,
          notes: update.body?.trim() || undefined,
        });
      } catch (error) {
        // An unreachable release endpoint should never interrupt app startup.
        console.error("Update check failed:", error);
      }
    })();
  }, []);

  const installUpdate = async () => {
    const update = updateRef.current;
    if (!update) return;

    setState({ phase: "downloading", version: update.version, progress: null });

    let contentLength = 0;
    let downloaded = 0;

    const onDownload = (event: DownloadEvent) => {
      switch (event.event) {
        case "Started":
          contentLength = event.data.contentLength ?? 0;
          downloaded = 0;
          break;
        case "Progress":
          downloaded += event.data.chunkLength;
          setState((previous) =>
            previous.phase === "downloading"
              ? {
                  ...previous,
                  progress: contentLength > 0 ? Math.min(1, downloaded / contentLength) : null,
                }
              : previous,
          );
          break;
        case "Finished":
          setState({ phase: "installing", version: update.version });
          break;
      }
    };

    try {
      // Keeping download and install separate lets the app show honest progress.
      // On Windows install() exits the app and hands off to the passive updater;
      // on Linux and macOS the user can choose when to restart afterward.
      await update.download(onDownload);
      setState({ phase: "installing", version: update.version });
      await update.install();
      setState({ phase: "ready", version: update.version });
    } catch (error) {
      console.error("Update installation failed:", error);
      setState({
        phase: "error",
        version: update.version,
        message: errorMessage(error),
        retry: "install",
      });
    }
  };

  const restart = async () => {
    try {
      await relaunch();
    } catch (error) {
      console.error("App restart failed:", error);
      setState({
        phase: "error",
        version: state.phase === "ready" ? state.version : "",
        message: errorMessage(error),
        retry: "restart",
      });
    }
  };

  if (state.phase === "idle" || state.phase === "dismissed") return null;

  const isBusy = state.phase === "downloading" || state.phase === "installing";

  return (
    <aside
      className="fixed bottom-5 right-5 z-[100] w-[22rem] max-w-[calc(100vw-2.5rem)] overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-xl"
      style={{
        background: "color-mix(in srgb, var(--app-panel) 94%, transparent)",
        borderColor: "var(--app-border-strong)",
        color: "var(--app-text)",
        boxShadow: "var(--shadow-3)",
      }}
      role={state.phase === "available" ? "dialog" : "status"}
      aria-live={isBusy ? "polite" : "off"}
      aria-label="Application update"
    >
      <div className="h-0.5 w-full" style={{ background: "var(--app-accent)" }} />
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div
            className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl"
            style={{ background: "var(--app-active)", color: "var(--app-text)" }}
          >
            {state.phase === "available" && <Sparkles className="h-4 w-4" />}
            {state.phase === "downloading" && <Download className="h-4 w-4" />}
            {state.phase === "installing" && <RefreshCw className="h-4 w-4 animate-spin" />}
            {state.phase === "ready" && <CheckCircle2 className="h-4 w-4" />}
            {state.phase === "error" && (
              <AlertCircle className="h-4 w-4" style={{ color: "var(--app-danger-text)" }} />
            )}
          </div>

          <div className="min-w-0 flex-1">
            {state.phase === "available" && (
              <>
                <div className="text-sm font-semibold">Kliae {state.version} is available</div>
                <div className="mt-1 text-xs leading-5" style={{ color: "var(--app-muted)" }}>
                  You’re on {state.currentVersion}. Update securely in the app, or keep working and do it later.
                </div>
                {state.notes && (
                  <div
                    className="mt-2 max-h-16 overflow-y-auto whitespace-pre-line rounded-lg px-2.5 py-2 text-xs leading-4"
                    style={{ background: "var(--app-surface-2)", color: "var(--app-text-secondary)" }}
                  >
                    {state.notes}
                  </div>
                )}
              </>
            )}

            {state.phase === "downloading" && (
              <>
                <div className="text-sm font-semibold">Downloading Kliae {state.version}</div>
                <div className="mt-1 text-xs" style={{ color: "var(--app-muted)" }}>
                  {state.progress === null
                    ? "Preparing the secure update…"
                    : `${Math.round(state.progress * 100)}% complete`}
                </div>
              </>
            )}

            {state.phase === "installing" && (
              <>
                <div className="text-sm font-semibold">Applying update</div>
                <div className="mt-1 text-xs leading-5" style={{ color: "var(--app-muted)" }}>
                  Kliae {state.version} is being installed. Keep the app open for a moment.
                </div>
              </>
            )}

            {state.phase === "ready" && (
              <>
                <div className="text-sm font-semibold">Update complete</div>
                <div className="mt-1 text-xs leading-5" style={{ color: "var(--app-muted)" }}>
                  Restart when you’re ready to use Kliae {state.version}.
                </div>
              </>
            )}

            {state.phase === "error" && (
              <>
                <div className="text-sm font-semibold">Update didn’t finish</div>
                <div className="mt-1 break-words text-xs leading-5" style={{ color: "var(--app-muted)" }}>
                  {state.message}
                </div>
              </>
            )}
          </div>

          {canDismiss && (
            <button
              type="button"
              onClick={dismiss}
              className="flex-shrink-0 rounded-lg p-1 transition-colors hover:bg-[var(--app-hover)]"
              style={{ color: "var(--app-muted)" }}
              aria-label="Dismiss update"
              title="Not now"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {state.phase === "downloading" && (
          <div
            className="mt-3 h-1.5 w-full overflow-hidden rounded-full"
            style={{ background: "var(--app-surface-2)" }}
          >
            <div
              className={`h-full rounded-full transition-[width] duration-200 ${state.progress === null ? "animate-pulse" : ""}`}
              style={{
                background: "var(--app-accent)",
                width: state.progress === null ? "32%" : `${Math.round(state.progress * 100)}%`,
              }}
            />
          </div>
        )}

        {state.phase === "available" && (
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => void installUpdate()}
              className="flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-opacity hover:opacity-90"
              style={{ background: "var(--app-text)", color: "var(--app-bg)" }}
            >
              Update now
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-[var(--app-hover)]"
              style={{ borderColor: "var(--app-border)", color: "var(--app-muted)" }}
            >
              Not now
            </button>
          </div>
        )}

        {state.phase === "ready" && (
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => void restart()}
              className="flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-opacity hover:opacity-90"
              style={{ background: "var(--app-text)", color: "var(--app-bg)" }}
            >
              Restart now
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-[var(--app-hover)]"
              style={{ borderColor: "var(--app-border)", color: "var(--app-muted)" }}
            >
              Later
            </button>
          </div>
        )}

        {state.phase === "error" && (
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => void (state.retry === "restart" ? restart() : installUpdate())}
              className="flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-opacity hover:opacity-90"
              style={{ background: "var(--app-text)", color: "var(--app-bg)" }}
            >
              Try again
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-[var(--app-hover)]"
              style={{ borderColor: "var(--app-border)", color: "var(--app-muted)" }}
            >
              Later
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
