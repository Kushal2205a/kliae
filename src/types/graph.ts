export const NODE_SCHEMA_VERSION = 1;
export const EDGE_SCHEMA_VERSION = 2;
export const GRAPH_SCHEMA_VERSION = 3;

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
  content?: NodeContentDocument;
  tags: string[];
  childGraphId?: string;
  contentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NodeContentDocument {
  schemaVersion: 1;
  blocks: NodeContentBlock[];
}

export type NodeContentBlock =
    | ParagraphContentBlock
    | RichTextContentBlock
    | ImageContentBlock;

export interface ParagraphContentBlock {
  id: string;
  type: "paragraph";
  text: string;
  listStyle?: "bullet" | "number";
  strikethrough?: boolean;
}

export interface RichTextContentBlock {
  id: string;
  type: "richtext";
  editorState: string;
}


export interface CodeContentBlock {
  id: string;
  type: "code";
  language?: string;
  text: string;
}

export interface ImageContentBlock {
  id: string;
  type: "image";
  src: string;
  alt?: string;
}

export interface Edge {
  schemaVersion: typeof EDGE_SCHEMA_VERSION;
  id: string;
  sourceId: string;
  targetId: string;
  sourceHandle?: string;
  targetHandle?: string;
  relationship: {
    id: RelationshipTypeId;
    customLabel?: string;
  };
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CanvasObjectStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  borderRadius: number;
}

export interface CanvasObject {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  style: CanvasObjectStyle;
  text?: string;
  properties?: Record<string, unknown>;
}

export const DEFAULT_CANVAS_STYLE: CanvasObjectStyle = {
  fill: "rgba(161, 161, 170, 0.10)",
  stroke: "rgba(212, 212, 216, 0.85)",
  strokeWidth: 2,
  opacity: 1,
  borderRadius: 8,
};

export type DragOverride = Partial<{ x: number; y: number; width: number; height: number }>;

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
  canvas: {
    objects: CanvasObject[];
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