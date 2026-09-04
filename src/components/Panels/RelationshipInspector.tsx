import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowDown, X, Trash2, ChevronDown } from "lucide-react";
import type { Edge } from "../../types";
import type { EdgeService } from "../../services/EdgeService";
import type { NodeService } from "../../services/NodeService";
import type { CommandHistoryService } from "../../services/CommandHistoryService";
import type { WorkspaceService } from "../../services/WorkspaceService";
import { UpdateEdgeCommand } from "../../commands/UpdateEdgeCommand";
import { DeleteEdgeCommand } from "../../commands/DeleteEdgeCommand";
import { getEffectiveBuiltinRelationships, getEffectiveRelationshipDefinition } from "../../constants/relationships";
import RelationshipColorDisc from "../UI/RelationshipColorDisc";
import { useEscapeKey } from "../../hooks/useEscapeKey";

interface RelationshipInspectorProps {
  edgeId: string;
  graphId: string;
  edgeService: EdgeService;
  nodeService: NodeService;
  commandHistoryService: CommandHistoryService;
  workspaceService: WorkspaceService;
  onClose: () => void;
  onGraphChanged?: () => void;
}

export default function RelationshipInspector({
  edgeId,
  graphId,
  edgeService,
  nodeService,
  commandHistoryService,
  workspaceService,
  onClose,
  onGraphChanged,
}: RelationshipInspectorProps) {
  const edge = edgeService.getEdge(edgeId);
  const sourceNode = edge ? nodeService.getNode(edge.sourceId) : undefined;
  const targetNode = edge ? nodeService.getNode(edge.targetId) : undefined;
  const customRelationships = workspaceService.getCustomRelationships();
  // Read fresh each render so app-wide default color overrides (edited from
  // the welcome screen) show up without needing a page reload.
  const nonCustomBuiltins = getEffectiveBuiltinRelationships().filter((rel) => rel.id !== "custom");

  const [relationshipId, setRelationshipId] = useState<string>(edge?.relationship.id ?? "uses");
  const [customLabel, setCustomLabel] = useState(edge?.relationship.customLabel ?? "");
  const [description, setDescription] = useState(edge?.description ?? "");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEscapeKey(onClose);
  useEscapeKey(() => setDropdownOpen(false), dropdownOpen);

  useEffect(() => {
    if (edge) {
      setRelationshipId(edge.relationship.id);
      setCustomLabel(edge.relationship.customLabel ?? "");
      setDescription(edge.description ?? "");
    }
  }, [edge]);

  // For a custom edge, prefer the saved project definition (correct color)
  // over the generic gray "custom" fallback.
  const currentRel =
    relationshipId === "custom" && customLabel
      ? customRelationships.find((r) => r.displayName.toLowerCase() === customLabel.toLowerCase())
      ?? getEffectiveRelationshipDefinition(relationshipId)
      : getEffectiveRelationshipDefinition(relationshipId);
  const isNewCustomSelected =
    relationshipId === "custom" &&
    !customRelationships.some((r) => r.displayName.toLowerCase() === customLabel.toLowerCase());
  const currentRelationshipLabel =
    relationshipId === "custom" && customLabel
      ? customLabel
      : currentRel?.displayName ?? relationshipId;

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  const commitSave = useCallback(
    (relId: string, label: string, desc: string) => {
      if (!edge) return;
      const oldData: Partial<Edge> = {
        relationship: { ...edge.relationship },
        description: edge.description,
      };
      const newData: Partial<Edge> = {
        relationship: {
          id: relId as any,
          customLabel: relId === "custom" ? label : undefined,
        },
        description: desc || undefined,
      };
      commandHistoryService.execute(new UpdateEdgeCommand(edge.id, oldData, newData));
      onGraphChanged?.();
    },
    [edge, commandHistoryService, onGraphChanged],
  );

  const handleSelect = useCallback(
    (newId: string) => {
      setRelationshipId(newId);
      setDropdownOpen(false);
      commitSave(newId, customLabel, description);
    },
    [customLabel, description, commitSave],
  );

  const handleSelectCustom = useCallback(
    (label: string) => {
      setRelationshipId("custom");
      setCustomLabel(label);
      setDropdownOpen(false);
      commitSave("custom", label, description);
    },
    [description, commitSave],
  );

  const handleDelete = useCallback(() => {
    if (!edge) return;
    commandHistoryService.execute(new DeleteEdgeCommand(graphId, edge.id));
    onClose();
    onGraphChanged?.();
  }, [edge, graphId, commandHistoryService, onClose, onGraphChanged]);

  if (!edge) {
    return (
      <div className="p-4 text-white/50 text-sm">Edge not found</div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium" style={{ color: "var(--app-text)" }}>Relationship</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg transition-colors hover:bg-white/10"
          style={{ color: "var(--app-muted)" }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div
        className="min-w-0 rounded-xl border px-3 py-3"
        style={{ background: "var(--app-surface-2)", borderColor: "var(--app-border)" }}
      >
        <div className="min-w-0">
          <div className="mb-0.5 text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--app-muted)" }}>
            From
          </div>
          <div className="truncate text-sm font-medium" title={sourceNode?.label} style={{ color: "var(--app-text)" }}>
            {sourceNode?.label ?? "?"}
          </div>
        </div>

        <div className="my-2 flex min-w-0 items-center gap-2 pl-0.5">
          <ArrowDown className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--app-muted)" }} />
          <RelationshipColorDisc color={currentRel?.color} />
          <span className="truncate text-xs font-medium" style={{ color: currentRel?.color ?? "var(--app-accent)" }}>
            {currentRelationshipLabel}
          </span>
        </div>

        <div className="min-w-0">
          <div className="mb-0.5 text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--app-muted)" }}>
            To
          </div>
          <div className="truncate text-sm font-medium" title={targetNode?.label} style={{ color: "var(--app-text)" }}>
            {targetNode?.label ?? "?"}
          </div>
        </div>
      </div>

      <div className="relative" ref={dropdownRef}>
        <label className="block text-xs mb-1" style={{ color: "var(--app-muted)" }}>Type</label>
        <button
          onClick={() => setDropdownOpen((v) => !v)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm focus:outline-none transition-colors hover:bg-white/5"
          style={{ background: "var(--app-surface-2)", border: "1px solid var(--app-border)", color: "var(--app-text)" }}
        >
          <RelationshipColorDisc color={currentRel?.color} />
          <span className="flex-1 text-left">
            {currentRelationshipLabel}
          </span>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
            style={{ color: "var(--app-muted)" }}
          />
        </button>
        {dropdownOpen && (
          <div
            className="absolute left-0 right-0 top-full mt-1 z-50 max-h-48 overflow-y-auto rounded-xl border p-1"
            style={{
              background: "var(--app-surface)",
              borderColor: "var(--app-border)",
              boxShadow: "var(--shadow-2)",
            }}
          >
            {nonCustomBuiltins.map((rel) => (
              <button
                key={rel.id}
                aria-pressed={relationshipId === rel.id}
                onClick={() => handleSelect(rel.id)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left hover:bg-white/5"
                style={{
                  background: relationshipId === rel.id ? "var(--app-surface)" : undefined,
                  color: relationshipId === rel.id ? "var(--app-text)" : "var(--app-muted)",
                }}
              >
                <RelationshipColorDisc color={rel.color} selected={relationshipId === rel.id} />
                <span className="flex-1">{rel.displayName}</span>
              </button>
            ))}

            {customRelationships.length > 0 && (
              <>
                <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wide" style={{ color: "var(--app-muted)" }}>
                  Custom
                </div>
                {customRelationships.map((rel) => {
                  const isSelected =
                    relationshipId === "custom" &&
                    customLabel.toLowerCase() === rel.displayName.toLowerCase();
                  return (
                    <button
                      key={rel.displayName}
                      aria-pressed={isSelected}
                      onClick={() => handleSelectCustom(rel.displayName)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left hover:bg-white/5"
                      style={{
                        background: isSelected ? "var(--app-surface)" : undefined,
                        color: isSelected ? "var(--app-text)" : "var(--app-muted)",
                      }}
                    >
                      <RelationshipColorDisc color={rel.color} selected={isSelected} />
                      <span className="flex-1">{rel.displayName}</span>
                    </button>
                  );
                })}
              </>
            )}

            <button
              aria-pressed={isNewCustomSelected}
              onClick={() => handleSelect("custom")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left hover:bg-white/5"
              style={{
                background:
                  isNewCustomSelected ? "var(--app-surface)" : undefined,
                color: "var(--app-muted)",
              }}
            >
              <RelationshipColorDisc
                color="#6b7280"
                selected={isNewCustomSelected}
              />
              <span className="flex-1">Custom...</span>
            </button>
          </div>
        )}
      </div>

      {relationshipId === "custom" && (
        <div>
          <label className="block text-xs mb-1" style={{ color: "var(--app-muted)" }}>Custom Label</label>
          <input
            type="text"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            onBlur={(e) => commitSave(relationshipId, e.target.value, description)}
            className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none transition-colors"
            style={{ background: "var(--app-surface-2)", border: "1px solid var(--app-border)", color: "var(--app-text)" }}
            placeholder="e.g., trains"
          />
        </div>
      )}

      <div>
        <label className="block text-xs mb-1" style={{ color: "var(--app-muted)" }}>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={(e) => commitSave(relationshipId, customLabel, e.target.value)}
          className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none min-h-[60px] resize-none transition-colors"
          style={{ background: "var(--app-surface-2)", border: "none", color: "var(--app-text)" }}
          placeholder="Describe this relationship..."
          rows={3}
        />
      </div>

      <button
        onClick={handleDelete}
        className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-red-500/10 transition-colors text-sm"
        style={{ color: "var(--app-muted)" }}
        onMouseEnter={e => (e.currentTarget.style.color = "#f87171")}
        onMouseLeave={e => (e.currentTarget.style.color = "var(--app-muted)")}
      >
        <Trash2 className="w-4 h-4" />
        Delete Relationship
      </button>
    </div>
  );
}
