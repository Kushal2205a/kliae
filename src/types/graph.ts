export const NODE_SCHEMA_VERSION = 1;
export const EDGE_SCHEMA_VERSION = 1;
export const GRAPH_SCHEMA_VERSION = 1;

export type RelationshipTypeId =
  | "uses" | "used_by"
  | "depends_on" | "depended_by"
  | "implements" | "implemented_by"
  | "explains" | "explained_by"
  | "illustrates" | "illustrated_by"
  | "references" | "referenced_by"
  | "contains" | "contained_in"
  | "compares_to" | "compared_with"
  | "produces" | "produced_by"
  | "returns" | "returned_by"
  | "optimized_by" | "optimizes"
  | "derived_from" | "derives"
  | "custom";

export interface RelationshipDefinition {
  id: RelationshipTypeId;
  displayName: string;
  inverse: RelationshipTypeId | null;
  color?: string;
}

export interface Node {
  schemaVersion: typeof NODE_SCHEMA_VERSION;
  id: string;
  type: string;
  label: string;
  tags: string[];
  childGraphId?: string;
  contentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Edge {
  schemaVersion: typeof EDGE_SCHEMA_VERSION;
  id: string;
  sourceId: string;
  targetId: string;
  relationship: {
    id: RelationshipTypeId;
    customLabel?: string;
  };
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Graph {
  schemaVersion: typeof GRAPH_SCHEMA_VERSION;
  id: string;
  name: string;
  parentNodeId?: string;
  nodeIds: string[];
  edgeIds: string[];
  views: {
    nodeViews: Record<string, NodeView>;
    edgeViews: Record<string, EdgeView>;
  };
}

export interface NodeView {
  nodeId: string;
  graphId: string;
  position: { x: number; y: number };
  width?: number;
  height?: number;
  color?: string;
  collapsed?: boolean;
}

export interface EdgeView {
  edgeId: string;
  graphId: string;
  color?: string;
}

export interface NodeDefinition {
  id: string;
  displayName: string;
  icon: string;
  defaultColor: string;
  defaultData: () => Record<string, unknown>;
}
