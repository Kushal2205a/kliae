import type { NodeProps } from "@xyflow/react";
import type React from "react";
import type { NodeDefinition } from "../types";

export interface NodeDefinition {
  id: string;
  displayName: string;
  icon: string;
  defaultColor: string;
  component: React.ComponentType<NodeProps>;
  defaultData: () => Record<string, unknown>;
}

const BUILTIN_NODE_DEFINITIONS: NodeDefinition[] = [];

export function registerNodeDefinition(def: NodeDefinition): void {
  const existing = BUILTIN_NODE_DEFINITIONS.findIndex((d) => d.id === def.id);
  if (existing >= 0) {
    BUILTIN_NODE_DEFINITIONS[existing] = def;
  } else {
    BUILTIN_NODE_DEFINITIONS.push(def);
  }
}

export function getNodeDefinition(id: string): NodeDefinition | undefined {
  return BUILTIN_NODE_DEFINITIONS.find((d) => d.id === id);
}

export function getAllNodeDefinitions(): NodeDefinition[] {
  return [...BUILTIN_NODE_DEFINITIONS];
}
