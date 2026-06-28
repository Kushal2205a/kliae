import type { RelationshipDefinition, RelationshipTypeId } from "../types";

export const BUILTIN_RELATIONSHIPS: RelationshipDefinition[] = [
  { id: "uses",          displayName: "Uses",          inverse: "used_by",          color: "#3b82f6" },
  { id: "depends_on",    displayName: "Depends On",    inverse: "depended_by",       color: "#ef4444" },
  { id: "implements",    displayName: "Implements",    inverse: "implemented_by",    color: "#22c55e" },
  { id: "explains",      displayName: "Explains",      inverse: "explained_by",      color: "#a855f7" },
  { id: "illustrates",   displayName: "Illustrates",   inverse: "illustrated_by",    color: "#f59e0b" },
  { id: "references",    displayName: "References",    inverse: "referenced_by",     color: "#6366f1" },
  { id: "contains",      displayName: "Contains",      inverse: "contained_in",      color: "#ec4899" },
  { id: "compares_to",   displayName: "Compares To",    inverse: "compared_with",     color: "#14b8a6" },
  { id: "produces",      displayName: "Produces",       inverse: "produced_by",       color: "#f97316" },
  { id: "returns",       displayName: "Returns",        inverse: "returned_by",       color: "#8b5cf6" },
  { id: "optimized_by",  displayName: "Optimized By",   inverse: "optimizes",         color: "#06b6d4" },
  { id: "derived_from",  displayName: "Derived From",   inverse: "derives",           color: "#84cc16" },
  { id: "custom",        displayName: "Custom...",       inverse: null,               color: "#6b7280" },
];

export function resolveRelationshipLabel(relationship: { id: string; customLabel?: string }): string {
  if (relationship.id === "custom" && relationship.customLabel) {
    return relationship.customLabel;
  }
  const def = BUILTIN_RELATIONSHIPS.find((r) => r.id === relationship.id);
  return def?.displayName ?? relationship.id;
}

export function getRelationshipColor(relationship: { id: string }): string {
  const def = BUILTIN_RELATIONSHIPS.find((r) => r.id === relationship.id);
  return def?.color ?? "#6b7280";
}

export function getRelationshipDefinition(id: string): RelationshipDefinition | undefined {
  return BUILTIN_RELATIONSHIPS.find((r) => r.id === id);
}

export const RELATIONSHIP_TYPE_IDS: RelationshipTypeId[] = BUILTIN_RELATIONSHIPS.map((r) => r.id);
