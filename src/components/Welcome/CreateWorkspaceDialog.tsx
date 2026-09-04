import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { useEscapeKey } from "../../hooks/useEscapeKey";

interface CreateWorkspaceDialogProps {
  onConfirm: (path: string, name: string) => void;
  onCancel: () => void;
}

export default function CreateWorkspaceDialog({
  onConfirm,
  onCancel,
}: CreateWorkspaceDialogProps) {
  useEscapeKey(onCancel);

  const [name, setName] = useState("My Knowledge Graph");
  const [folderPath, setFolderPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBrowse = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select Workspace Folder",
    });
    if (selected) {
      setFolderPath(selected);
      setError(null);
    }
  };

  const handleConfirm = () => {
    if (!name.trim()) {
      setError("Please enter a workspace name");
      return;
    }
    if (!folderPath) {
      setError("Please select a folder");
      return;
    }
    onConfirm(folderPath, name.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="rounded-xl p-6 w-full max-w-md shadow-2xl" style={{ background: "var(--app-surface)", border: "1px solid var(--app-border)" }}>
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--app-text)" }}>Create Workspace</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1" style={{ color: "var(--app-muted)" }}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none transition-colors"
              style={{ background: "var(--app-surface-2)", border: "1px solid var(--app-border)", color: "var(--app-text)" }}
              placeholder="My Knowledge Graph"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm mb-1" style={{ color: "var(--app-muted)" }}>Folder</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={folderPath ?? ""}
                readOnly
                className="flex-1 px-3 py-2 rounded-xl text-sm"
                style={{ background: "var(--app-surface-2)", border: "1px solid var(--app-border)", color: "var(--app-muted)" }}
                placeholder="Select a folder..."
              />
              <button
                onClick={handleBrowse}
                className="px-4 py-2 rounded-xl text-sm transition-colors hover:bg-white/10"
                style={{ background: "var(--app-surface-2)", border: "1px solid var(--app-border)", color: "var(--app-text)" }}
              >
                Browse
              </button>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm transition-colors hover:bg-white/5"
            style={{ color: "var(--app-muted)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 rounded-lg text-sm transition-colors hover:bg-white/15"
            style={{ background: "var(--app-surface-2)", border: "1px solid var(--app-border)", color: "var(--app-text)" }}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
