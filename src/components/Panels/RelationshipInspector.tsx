import { useState, useEffect, useCallback } from "react";
import { X, Trash2 } from "lucide-react";
import type { Edge } from "../../types";
import type { EdgeService } from "../../services/EdgeService";
import type { NodeService } from "../../services/NodeService";
import type { CommandHistoryService } from "../../services/CommandHistoryService";
import { UpdateEdgeCommand } from "../../commands/UpdateEdgeCommand";
import { DeleteEdgeCommand } from "../../commands/DeleteEdgeCommand";
import { BUILTIN_RELATIONSHIPS, resolveRelationshipLabel } from "../../constants/relationships";

interface RelationshipInspectorProps {
  edgeId: string;
  graphId: string;
  edgeService: EdgeService;
  nodeService: NodeService;
  commandHistoryService: CommandHistoryService;
  onClose: () => void;
}

export default function RelationshipInspector({
  edgeId,
  graphId,
  edgeService,
  nodeService,
  commandHistoryService,
  onClose,
}: RelationshipInspectorProps) {
  const edge = edgeService.getEdge(edgeId);
  const sourceNode = edge ? nodeService.getNode(edge.sourceId) : undefined;
  const targetNode = edge ? nodeService.getNode(edge.targetId) : undefined;

  const [relationshipId, setRelationshipId] = useState<string>(edge?.relationship.id ?? "uses");
  const [customLabel, setCustomLabel] = useState(edge?.relationship.customLabel ?? "");
  const [description, setDescription] = useState(edge?.description ?? "");

  useEffect(() => {
    if (edge) {
      setRelationshipId(edge.relationship.id);
      setCustomLabel(edge.relationship.customLabel ?? "");
      setDescription(edge.description ?? "");
    }
  }, [edge]);

  const handleSave = useCallback(() => {
    if (!edge) return;
    const oldData: Partial<Edge> = {
      relationship: { ...edge.relationship },
      description: edge.description,
    };
    const newData: Partial<Edge> = {
      relationship: {
        id: relationshipId as any,
        customLabel: relationshipId === "custom" ? customLabel : undefined,
      },
      description: description || undefined,
    };
    commandHistoryService.execute(new UpdateEdgeCommand(edge.id, oldData, newData));
  }, [edge, relationshipId, customLabel, description, commandHistoryService]);

  const handleDelete = useCallback(() => {
    if (!edge) return;
    commandHistoryService.execute(new DeleteEdgeCommand(graphId, edge.id));
    onClose();
  }, [edge, graphId, commandHistoryService, onClose]);

  if (!edge) {
    return (
      <div className="p-4 text-white/50 text-sm">Edge not found</div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white/80">Relationship</h3>
        <button
          onClick={onClose}
          className="p-1 rounded text-white/40 hover:text-white/80 hover:bg-white/5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 text-sm">
        <span className="text-white/80">{sourceNode?.label ?? "?"}</span>
        <span className="text-white/30 text-xs">──</span>
        <span className="text-blue-400 font-medium">
          {resolveRelationshipLabel(edge.relationship)}
        </span>
        <span className="text-white/30 text-xs">──➤</span>
        <span className="text-white/80">{targetNode?.label ?? "?"}</span>
      </div>

      <div>
        <label className="block text-xs text-white/50 mb-1">Type</label>
        <select
          value={relationshipId}
          onChange={(e) => { setRelationshipId(e.target.value); handleSave(); }}
          className="w-full px-3 py-2 rounded-lg bg-[#13131a] border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50"
        >
          {BUILTIN_RELATIONSHIPS.map((rel) => (
            <option key={rel.id} value={rel.id}>
              {rel.displayName}
            </option>
          ))}
        </select>
      </div>

      {relationshipId === "custom" && (
        <div>
          <label className="block text-xs text-white/50 mb-1">Custom Label</label>
          <input
            type="text"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            onBlur={handleSave}
            className="w-full px-3 py-2 rounded-lg bg-[#13131a] border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50"
            placeholder="e.g., trains"
          />
        </div>
      )}

      <div>
        <label className="block text-xs text-white/50 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={handleSave}
          className="w-full px-3 py-2 rounded-lg bg-[#13131a] border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 min-h-[60px] resize-none"
          placeholder="Describe this relationship..."
          rows={3}
        />
      </div>

      <button
        onClick={handleDelete}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors text-sm"
      >
        <Trash2 className="w-4 h-4" />
        Delete Relationship
      </button>
    </div>
  );
}
