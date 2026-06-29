import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";

interface CreateWorkspaceDialogProps {
  onConfirm: (path: string, name: string) => void;
  onCancel: () => void;
}

export default function CreateWorkspaceDialog({
  onConfirm,
  onCancel,
}: CreateWorkspaceDialogProps) {
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
      <div className="bg-[#1e1e2e] border border-white/10 rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-lg font-semibold text-white mb-4">Create Workspace</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#13131a] border border-white/10 text-white text-sm focus:outline-none focus:border-white/20"
              placeholder="My Knowledge Graph"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1">Folder</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={folderPath ?? ""}
                readOnly
                className="flex-1 px-3 py-2 rounded-lg bg-[#13131a] border border-white/10 text-white/50 text-sm"
                placeholder="Select a folder..."
              />
              <button
                onClick={handleBrowse}
                className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 transition-colors"
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
            className="px-4 py-2 rounded-lg text-white/60 hover:text-white/80 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm hover:bg-blue-600 transition-colors"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
