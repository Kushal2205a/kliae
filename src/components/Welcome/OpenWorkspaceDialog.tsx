import { open } from "@tauri-apps/plugin-dialog";
import { useEscapeKey } from "../../hooks/useEscapeKey";

interface OpenWorkspaceDialogProps {
  onConfirm: (path: string) => void;
  onCancel: () => void;
}

export default function OpenWorkspaceDialog({
  onConfirm,
  onCancel,
}: OpenWorkspaceDialogProps) {
  useEscapeKey(onCancel);

  const handleBrowse = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select Workspace Folder",
    });
    if (selected) {
      onConfirm(selected);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="rounded-xl p-6 w-full max-w-md shadow-2xl" style={{ background: "var(--app-surface)", border: "1px solid var(--app-border)" }}>
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--app-text)" }}>Open Workspace</h2>

        <p className="text-sm mb-4" style={{ color: "var(--app-muted)" }}>
          Select the folder containing a workspace manifest.json file.
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm transition-colors hover:bg-white/5"
            style={{ color: "var(--app-muted)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleBrowse}
            className="px-4 py-2 rounded-lg text-sm transition-colors hover:bg-white/15"
            style={{ background: "var(--app-surface-2)", border: "1px solid var(--app-border)", color: "var(--app-text)" }}
          >
            Browse Folders
          </button>
        </div>
      </div>
    </div>
  );
}
