import type { RelationshipDefinition } from "./graph";

export const WORKSPACE_SCHEMA_VERSION = 1;

export interface WorkspaceManifest {
  schemaVersion: typeof WORKSPACE_SCHEMA_VERSION;
  id: string;
  name: string;
  rootGraphId: string;
  graphIds: string[];
  /**
   * Custom relationship types created by the user (via "Custom..." in the
   * edge dialog / relationship inspector), scoped to the whole project so
   * they're reusable across every graph/subgraph, not just the one they
   * were first created in. Deduped by displayName (case-insensitive) in
   * WorkspaceService.addCustomRelationship.
   */
  customRelationships: RelationshipDefinition[];
  createdAt: string;
  updatedAt: string;
}

export interface RecentWorkspace {
  path: string;
  name: string;
  lastOpened: string;
}