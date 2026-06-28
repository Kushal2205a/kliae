import { open } from "@tauri-apps/plugin-dialog";

interface OpenWorkspaceDialogProps {
  onConfirm: (path: string) => void;
  onCancel: () => void;
}

export default function OpenWorkspaceDialog({
  onConfirm,
  onCancel,
}: OpenWorkspaceDialogProps) {
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
      <div className="bg-[#1e1e2e] border border-white/10 rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-lg font-semibold text-white mb-4">Open Workspace</h2>

        <p className="text-sm text-white/50 mb-4">
          Select the folder containing a workspace manifest.json file.
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-white/60 hover:text-white/80 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleBrowse}
            className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm hover:bg-blue-600 transition-colors"
          >
            Browse Folders
          </button>
        </div>
      </div>
    </div>
  );
}
