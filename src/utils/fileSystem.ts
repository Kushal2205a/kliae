import { readTextFile, writeTextFile, exists, mkdir, remove, readDir } from "@tauri-apps/plugin-fs";

export { exists, mkdir, remove, readDir };

export async function readJSON<T>(path: string): Promise<T> {
  const content = await readTextFile(path);
  return JSON.parse(content) as T;
}

export async function writeJSON(path: string, data: unknown): Promise<void> {
  await writeTextFile(path, JSON.stringify(data, null, 2));
}

export async function readText(path: string): Promise<string> {
  return await readTextFile(path);
}

export async function writeText(path: string, content: string): Promise<void> {
  await writeTextFile(path, content);
}

export async function ensureDir(path: string): Promise<void> {
  const dirExists = await exists(path);
  if (!dirExists) {
    await mkdir(path, { recursive: true });
  }
}
