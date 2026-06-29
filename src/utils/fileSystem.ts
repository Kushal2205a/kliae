import { invoke } from "@tauri-apps/api/core";

export async function readTextFile(path: string): Promise<string> {
  return await invoke<string>("read_file", { path });
}

export async function writeTextFile(path: string, content: string): Promise<void> {
  await invoke("write_file", { path, content });
}

export async function exists(path: string): Promise<boolean> {
  return await invoke<boolean>("file_exists", { path });
}

export async function mkdir(path: string): Promise<void> {
  await invoke("create_dir", { path });
}

export async function remove(path: string): Promise<void> {
  await invoke("delete_file", { path });
}

export async function readDir(path: string): Promise<{ name: string; isDir: boolean }[]> {
  return await invoke<{ name: string; isDir: boolean }[]>("read_dir", { path });
}

// Keep these for backwards compatibility with code that imports them:
export async function readJSON<T>(path: string): Promise<T> {
  const content = await readTextFile(path);
  return JSON.parse(content) as T;
}

export async function writeJSON(path: string, data: unknown): Promise<void> {
  await writeTextFile(path, JSON.stringify(data, null, 2));
}

export async function ensureDir(path: string): Promise<void> {
  const dirExists = await exists(path);
  if (!dirExists) {
    await mkdir(path);
  }
}
