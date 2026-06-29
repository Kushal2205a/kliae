import { useState, useEffect, useCallback, useRef } from "react";
import { X, Trash2, ChevronDown } from "lucide-react";
import type { Edge } from "../../types";
import type { EdgeService } from "../../services/EdgeService";
import type { NodeService } from "../../services/NodeService";
import type { CommandHistoryService } from "../../services/CommandHistoryService";
import { UpdateEdgeCommand } from "../../commands/UpdateEdgeCommand";
import { DeleteEdgeCommand } from "../../commands/DeleteEdgeCommand";
import { BUILTIN_RELATIONSHIPS, resolveRelationshipLabel, getRelationshipDefinition } from "../../constants/relationships";

interface RelationshipInspectorProps {
  edgeId: string;
  graphId: string;
  edgeService: EdgeService;
  nodeService: NodeService;
  commandHistoryService: CommandHistoryService;
  onClose: () => void;
  onGraphChanged?: () => void;
}

export default function RelationshipInspector({
  edgeId,
  graphId,
  edgeService,
  nodeService,
  commandHistoryService,
  onClose,
  onGraphChanged,
}: RelationshipInspectorProps) {
  const edge = edgeService.getEdge(edgeId);
  const sourceNode = edge ? nodeService.getNode(edge.sourceId) : undefined;
  const targetNode = edge ? nodeService.getNode(edge.targetId) : undefined;

  const [relationshipId, setRelationshipId] = useState<string>(edge?.relationship.id ?? "uses");
  const [customLabel, setCustomLabel] = useState(edge?.relationship.customLabel ?? "");
  const [description, setDescription] = useState(edge?.description ?? "");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (edge) {
      setRelationshipId(edge.relationship.id);
      setCustomLabel(edge.relationship.customLabel ?? "");
      setDescription(edge.description ?? "");
    }
  }, [edge]);

  const currentRel = getRelationshipDefinition(relationshipId);

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

      <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ background: "var(--app-surface-2)" }}>
        <span style={{ color: "var(--app-text)" }}>{sourceNode?.label ?? "?"}</span>
        <span className="text-xs" style={{ color: "var(--app-muted)" }}>──</span>
        <span className="font-medium" style={{ color: "var(--app-accent)" }}>
          {resolveRelationshipLabel(edge.relationship)}
        </span>
        <span className="text-xs" style={{ color: "var(--app-muted)" }}>──➤</span>
        <span style={{ color: "var(--app-text)" }}>{targetNode?.label ?? "?"}</span>
      </div>

      <div className="relative" ref={dropdownRef}>
        <label className="block text-xs mb-1" style={{ color: "var(--app-muted)" }}>Type</label>
        <button
          onClick={() => setDropdownOpen((v) => !v)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm focus:outline-none transition-colors hover:bg-white/5"
          style={{ background: "var(--app-surface-2)", border: "1px solid var(--app-border)", color: "var(--app-text)" }}
        >
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: currentRel?.color ?? "#6b7280" }}
          />
          <span className="flex-1 text-left">{currentRel?.displayName ?? relationshipId}</span>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
            style={{ color: "var(--app-muted)" }}
          />
        </button>
        {dropdownOpen && (
          <div className="absolute left-0 right-0 top-full mt-1 z-50 p-1 rounded-xl shadow-xl max-h-48 overflow-y-auto" style={{ background: "var(--app-surface-2)", border: "1px solid var(--app-border)" }}>
            {BUILTIN_RELATIONSHIPS.map((rel) => (
              <button
                key={rel.id}
                onClick={() => handleSelect(rel.id)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left hover:bg-white/5"
                style={{
                  background: relationshipId === rel.id ? "var(--app-surface)" : undefined,
                  color: relationshipId === rel.id ? "var(--app-text)" : "var(--app-muted)",
                }}
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: rel.color ?? "#6b7280" }}
                />
                <span className="flex-1">{rel.displayName}</span>
                {relationshipId === rel.id && (
                  <span className="text-xs" style={{ color: "var(--app-muted)" }}>✓</span>
                )}
              </button>
            ))}
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