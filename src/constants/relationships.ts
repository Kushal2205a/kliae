import type { RelationshipDefinition, RelationshipTypeId } from "../types";
import { getDefaultRelationshipColorOverrides } from "../services/appSettings";

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

/**
 * BUILTIN_RELATIONSHIPS with any app-wide user color overrides applied
 * (see services/appSettings.ts). Use this instead of the raw
 * BUILTIN_RELATIONSHIPS constant anywhere colors are displayed or looked
 * up, so the settings screen's changes show up everywhere immediately.
 */
export function getEffectiveBuiltinRelationships(): RelationshipDefinition[] {
  const overrides = getDefaultRelationshipColorOverrides();
  return BUILTIN_RELATIONSHIPS.map((r) =>
    overrides[r.id] ? { ...r, color: overrides[r.id] } : r,
  );
}

/** Like getRelationshipDefinition, but reflects app-wide color overrides. */
export function getEffectiveRelationshipDefinition(id: string): RelationshipDefinition | undefined {
  return getEffectiveBuiltinRelationships().find((r) => r.id === id);
}

export function resolveRelationshipLabel(relationship: { id: string; customLabel?: string }): string {
  if (relationship.id === "custom" && relationship.customLabel) {
    return relationship.customLabel;
  }
  const def = BUILTIN_RELATIONSHIPS.find((r) => r.id === relationship.id);
  return def?.displayName ?? relationship.id;
}

/**
 * `customRelationships` (the project's saved custom types — see
 * WorkspaceService.getCustomRelationships()) is optional so existing call
 * sites keep compiling unchanged. Pass it wherever available for correct
 * per-label coloring; without it every custom edge falls back to the
 * generic gray "custom" color regardless of its actual label.
 */
export function getRelationshipColor(
  relationship: { id: string; customLabel?: string },
  customRelationships: RelationshipDefinition[] = [],
): string {
  if (relationship.id === "custom" && relationship.customLabel) {
    const custom = customRelationships.find(
      (r) => r.displayName.toLowerCase() === relationship.customLabel!.toLowerCase(),
    );
    if (custom?.color) return custom.color;
  }
  const overrides = getDefaultRelationshipColorOverrides();
  if (overrides[relationship.id]) return overrides[relationship.id];
  const def = BUILTIN_RELATIONSHIPS.find((r) => r.id === relationship.id);
  return def?.color ?? "#6b7280";
}

/**
 * Single source of truth for the relationship filter key format.
 * Built-in relationships key by their id ("uses", "depends_on", ...).
 * Custom relationships key by their free-text label ("custom:Bug",
 * "custom:Security", ...), since every custom edge shares id "custom"
 * but is meaningfully distinguished by customLabel.
 */
export function getFilterKey(relationship: { id: string; customLabel?: string }): string {
  return relationship.id === "custom" && relationship.customLabel
    ? `custom:${relationship.customLabel}`
    : relationship.id;
}

export function getRelationshipDefinition(id: string): RelationshipDefinition | undefined {
  return BUILTIN_RELATIONSHIPS.find((r) => r.id === id);
}

/**
 * Every custom relationship shares id "custom", so it can't be used as an
 * SVG marker id on its own (all custom edges would collide on one marker).
 * This produces a distinct, DOM-safe id per custom label, e.g.
 * "custom-bug-report" for the label "Bug Report" — so each custom
 * relationship can get its own colored arrowhead, matching its edge color.
 */
export function getRelationshipMarkerKey(relationship: { id: string; customLabel?: string }): string {
  if (relationship.id === "custom" && relationship.customLabel) {
    const slug = relationship.customLabel
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    return `custom-${slug || "unnamed"}`;
  }
  return relationship.id;
}

export const RELATIONSHIP_TYPE_IDS: RelationshipTypeId[] = BUILTIN_RELATIONSHIPS.map((r) => r.id);