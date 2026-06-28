export const WORKSPACE_SCHEMA_VERSION = 1;

export interface WorkspaceManifest {
  schemaVersion: typeof WORKSPACE_SCHEMA_VERSION;
  id: string;
  name: string;
  rootGraphId: string;
  graphIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RecentWorkspace {
  path: string;
  name: string;
  lastOpened: string;
}
