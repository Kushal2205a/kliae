import { isTauri } from "@tauri-apps/api/core";
import { readImage } from "@tauri-apps/plugin-clipboard-manager";

function blobExtension(type: string): string {
  return type.split("/")[1]?.replace("jpeg", "jpg") || "png";
}

async function readBrowserClipboardImages(): Promise<File[]> {
  if (!navigator.clipboard?.read) return [];

  try {
    const items = await navigator.clipboard.read();
    const files: File[] = [];
    for (const item of items) {
      for (const type of item.types.filter((candidate) => candidate.startsWith("image/"))) {
        const blob = await item.getType(type);
        files.push(new File([blob], `Pasted image.${blobExtension(type)}`, { type }));
      }
    }
    return files;
  } catch {
    return [];
  }
}

async function readTauriClipboardImage(): Promise<File[]> {
  if (!isTauri()) return [];

  try {
    const image = await readImage();
    try {
      const [{ width, height }, rgba] = await Promise.all([image.size(), image.rgba()]);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) return [];

      context.putImageData(
        new ImageData(new Uint8ClampedArray(rgba), width, height),
        0,
        0,
      );
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      return blob ? [new File([blob], "Pasted image.png", { type: "image/png" })] : [];
    } finally {
      await image.close();
    }
  } catch {
    return [];
  }
}

/** Reads image data when a webview's ClipboardEvent omits native image files. */
export async function readClipboardImages(): Promise<File[]> {
  return isTauri() ? readTauriClipboardImage() : readBrowserClipboardImages();
}
