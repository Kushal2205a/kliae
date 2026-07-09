import { memo, useState, useCallback, useRef, useEffect, useLayoutEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Handle, NodeResizer, Position, type NodeProps } from "@xyflow/react";
import { ChevronRight, X } from "lucide-react";
import { useGraphCallbacks } from "./GraphCallbacks";
import { useRelationshipIndex } from "../../constants/RelationshipIndexContext";
import { useUIStore } from "../../stores/useUIStore";
import { useFilterStore } from "../../stores/useFilterStore";
import type { ImageContentBlock, NodeContentDocument } from "../../types";
import type { RichTextContentBlock } from "../../types";
import LexicalEditor from "../../components/Editor/LexicalEditor";
import ReadOnlyLexicalViewer from "../../components/Editor/ReadOnlyLexicalViewer";

// ─── helpers ────────────────────────────────────────────────────────────────

function getRichTextBlock(
  content: NodeContentDocument | undefined,
): RichTextContentBlock | null {
  return (
    content?.blocks.find(
      (block): block is RichTextContentBlock => block.type === "richtext",
    ) ?? null
  );
}

// ─── component ──────────────────────────────────────────────────────────────

function BaseNode({ id, data, selected }: NodeProps) {
  const { label, color: nodeColor, childGraphId, content, width, height } = data as any;
  const color = nodeColor ?? "#71717a";
  const nodeWidth = typeof width === "number" ? width : undefined;
  const nodeHeight = typeof height === "number" ? height : undefined;
  const nodeContent = content as NodeContentDocument | undefined;
  const hasContent = !!nodeContent;
  const contentEditing = useUIStore((s) => s.contentMode === "edit");
  const pendingEditNodeId = useUIStore((s) => s.pendingEditNodeId);
  const filterActive = useFilterStore((s) => s.active);
  const selectedFilterKeys = useFilterStore((s) => s.selectedKeys);
  const indexVersion = useFilterStore((s) => s.indexVersion); // cache-buster: bumped by RelationshipIndexService on every mutation
  const relationshipIndex = useRelationshipIndex();

  // True when this is a collapsed component node whose child graph (or any of
  // its descendants) contains at least one edge matching the active filter.
  // Memoised on indexVersion so it re-checks whenever the index mutates.
  const subtreeHasMatch = useMemo(() => {
    if (!filterActive || selectedFilterKeys.size === 0 || !childGraphId) return false;
    if (!relationshipIndex) return false;
    const subtreeKeys = relationshipIndex.getSubtreeTypes(childGraphId);
    for (const key of subtreeKeys) {
      if (selectedFilterKeys.has(key)) return true;
    }
    return false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterActive, selectedFilterKeys, childGraphId, relationshipIndex, indexVersion]);

  // The nested-graph chevron shows only when the child graph holds actual
  // content beyond its auto-generated anchor reference (i.e. it is not just
  // an empty graph created by an accidental double-click).
  const hasNestedContent = useMemo(() => {
    if (!childGraphId || !relationshipIndex) return false;
    return relationshipIndex.hasContentBeyondAnchor(childGraphId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childGraphId, relationshipIndex, indexVersion]);
  const { onRenameNode, onAddNodeContent, onUpdateNodeContent, onResizeNode, onDeleteNode } = useGraphCallbacks();

  const saveTimeout = useRef<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(label);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [previewImage, setPreviewImage] = useState<ImageContentBlock | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const richTextBlock = getRichTextBlock(nodeContent);
  const imageBlocks = useMemo(
    () => nodeContent?.blocks.filter((block): block is ImageContentBlock => block.type === "image") ?? [],
    [nodeContent],
  );

  // Node has images but no text block — affects image layout
  const imageOnlyContent = hasContent && imageBlocks.length > 0 && !richTextBlock;
  const shouldFillImageArea = imageBlocks.length > 0 && !!nodeHeight;

  // The node must never be resizable narrower than its own toolbar needs
  // when in edit mode, or buttons get clipped at the edge with no way to
  // reach them (the overflow-hidden wrapper hides the scrollable overflow).
  const dynamicMinWidth = useMemo(() => {
    const BASE_MIN_WIDTH = 180;
    const TOOLBAR_MIN_WIDTH = 300; // enough for all 7 buttons + 3 dividers + padding
    return hasContent && contentEditing
      ? Math.max(BASE_MIN_WIDTH, TOOLBAR_MIN_WIDTH)
      : BASE_MIN_WIDTH;
  }, [hasContent, contentEditing]);

  // The node must never be resizable below the space its own header/toolbar
  // need, or content visually escapes the rounded border (and sits under
  // the resize handles). Account for: title row, the divider + a sliver of
  // content (~72px base), plus the toolbar row when in edit mode (~40px).
  const dynamicMinHeight = useMemo(() => {
    const BASE_MIN_HEIGHT = 72;
    const CONTENT_DIVIDER_HEIGHT = 24; // divider + minimal text line
    const TOOLBAR_HEIGHT = 40; // toolbar row + its bottom margin

    let min = BASE_MIN_HEIGHT;
    if (hasContent) {
      min += CONTENT_DIVIDER_HEIGHT;
      if (contentEditing) {
        min += TOOLBAR_HEIGHT;
      }
    }
    return min;
  }, [hasContent, contentEditing]);

  useEffect(() => {
    if (nodeHeight && nodeHeight < dynamicMinHeight) {
      onResizeNode(id, Math.max(nodeWidth ?? 180, dynamicMinWidth), dynamicMinHeight);
    } else if (nodeWidth && nodeWidth < dynamicMinWidth) {
      onResizeNode(id, dynamicMinWidth, nodeHeight ?? dynamicMinHeight);
    }
  }, [dynamicMinHeight, dynamicMinWidth, nodeHeight, nodeWidth, id, onResizeNode]);

  // ── title editing ──────────────────────────────────────────────────────────

  useLayoutEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const startEditing = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditValue(label);
    setEditing(true);
  }, [label]);

  // Newly created nodes drop straight into edit mode so the user can just
  // type the name instead of clicking in to rename. The store flag is
  // consumed (cleared) here so it only fires once, for this node.
  useEffect(() => {
    if (pendingEditNodeId === id) {
      setEditValue(label);
      setEditing(true);
      useUIStore.getState().setPendingEditNodeId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingEditNodeId, id]);

  const commitEdit = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== label) {
      onRenameNode(id, trimmed);
    }
    setEditing(false);
  }, [editValue, label, id, onRenameNode]);

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === "Escape") {
      setEditValue(label);
      setEditing(false);
    }
  }, [label]);

  // ── context menu ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [ctxMenu]);

  // ── content actions ────────────────────────────────────────────────────────

  const handleAddContent = useCallback(() => {
    onAddNodeContent(id);
    useUIStore.getState().setContentMode("edit");
  }, [id, onAddNodeContent]);

  /** Debounced save of Lexical EditorState JSON. */
  const updateRichText = useCallback(
    (editorState: string) => {
      if (!nodeContent) return;

      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }

      saveTimeout.current = window.setTimeout(() => {
        const richText = getRichTextBlock(nodeContent);

        let nextContent: NodeContentDocument;

        if (richText) {
          nextContent = {
            ...nodeContent,
            blocks: nodeContent.blocks.map((block) =>
              block.type === "richtext" ? { ...block, editorState } : block,
            ),
          };
        } else {
          nextContent = {
            ...nodeContent,
            blocks: [
              { id: crypto.randomUUID(), type: "richtext", editorState },
              ...nodeContent.blocks.filter((b) => b.type !== "paragraph"),
            ],
          };
        }

        onUpdateNodeContent(id, nextContent);
      }, 300);
    },
    [id, nodeContent, onUpdateNodeContent],
  );

  useEffect(() => {
    return () => {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }
    };
  }, []);

  /** Appends an image block directly onto the content document. */
  const handleImageSelected = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !hasContent || !nodeContent) return;

    const reader = new FileReader();
    reader.onload = () => {
      const src = typeof reader.result === "string" ? reader.result : "";
      if (!src) return;
      const imageBlock: ImageContentBlock = {
        id: crypto.randomUUID(),
        type: "image",
        src,
        alt: file.name,
      };
      onUpdateNodeContent(id, {
        ...nodeContent,
        blocks: [...nodeContent.blocks, imageBlock],
      });
    };
    reader.readAsDataURL(file);
  }, [hasContent, nodeContent, id, onUpdateNodeContent]);

  /** Removes a single image block from the content document. */
  const handleDeleteImage = useCallback((imageId: string) => {
    if (!nodeContent) return;
    onUpdateNodeContent(id, {
      ...nodeContent,
      blocks: nodeContent.blocks.filter((b) => b.id !== imageId),
    });
  }, [nodeContent, id, onUpdateNodeContent]);

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div
        className={`
          relative flex h-full w-full flex-col px-4 py-3.5 border
          ${nodeWidth ? "" : imageOnlyContent ? "max-w-none" : "max-w-[320px]"}
          transition-all duration-150
        `}
        style={{
          borderColor: selected ? "var(--app-border-focus)" : `${color}55`,
          borderRadius: "var(--radius-card)",
          boxShadow: selected ? "0 0 0 3px var(--app-border-focus), var(--shadow-2)" : "var(--shadow-1)",
          width: nodeWidth ? "100%" : undefined,
          height: nodeHeight ? "100%" : undefined,
          minWidth: dynamicMinWidth,
          background: "var(--app-surface)",
          color: "var(--app-text)",
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setCtxMenu({ x: e.clientX, y: e.clientY });
        }}
      >
        <NodeResizer
          isVisible={selected}
          minWidth={dynamicMinWidth}
          minHeight={dynamicMinHeight}
          lineClassName="!border-white/50"
          handleClassName="!h-2 !w-2 !rounded-sm !border !border-black/40 !bg-white/80"
          onResizeEnd={(_event, params) => {
            onResizeNode(id, Math.round(params.width), Math.round(params.height));
          }}
        />

        <Handle type="target" position={Position.Top} id="top-target" className="!w-3 !h-3 !border-2" style={{ background: "var(--app-surface-2)", borderColor: "var(--app-border-strong)" }} />
        <Handle type="source" position={Position.Top} id="top-source" className="!w-3 !h-3 !border-2" style={{ background: "var(--app-surface-2)", borderColor: "var(--app-border-strong)" }} />
        <Handle type="target" position={Position.Bottom} id="bottom-target" className="!w-3 !h-3 !border-2" style={{ background: "var(--app-surface-2)", borderColor: "var(--app-border-strong)" }} />
        <Handle type="source" position={Position.Bottom} id="bottom-source" className="!w-3 !h-3 !border-2" style={{ background: "var(--app-surface-2)", borderColor: "var(--app-border-strong)" }} />
        <Handle type="target" position={Position.Left} id="left-target" className="!w-3 !h-3 !border-2" style={{ background: "var(--app-surface-2)", borderColor: "var(--app-border-strong)" }} />
        <Handle type="source" position={Position.Left} id="left-source" className="!w-3 !h-3 !border-2" style={{ background: "var(--app-surface-2)", borderColor: "var(--app-border-strong)" }} />
        <Handle type="target" position={Position.Right} id="right-target" className="!w-3 !h-3 !border-2" style={{ background: "var(--app-surface-2)", borderColor: "var(--app-border-strong)" }} />
        <Handle type="source" position={Position.Right} id="right-source" className="!w-3 !h-3 !border-2" style={{ background: "var(--app-surface-2)", borderColor: "var(--app-border-strong)" }} />

        <div className="relative flex flex-1 min-h-0 flex-col overflow-hidden">

        {/* Title */}
        <div className="flex flex-shrink-0 items-center justify-center gap-2">
          {editing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleTitleKeyDown}
              className="text-[13.5px] font-semibold tracking-[-0.01em] border rounded px-1 py-0.5 outline-none min-w-0 flex-1 text-center"
              style={{ background: "var(--app-bg)", color: "var(--app-text)", borderColor: "var(--app-border-focus)" }}
            />
          ) : (
            <span
              className="text-[13.5px] font-semibold tracking-[-0.01em] truncate cursor-pointer hover:bg-[var(--app-hover)] rounded px-1 -mx-1 text-center"
              onDoubleClick={startEditing}
              title="Double-click to rename"
            >
              {label}
            </span>
          )}
          {hasNestedContent && (
            <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--app-muted)" }} />
          )}
          {subtreeHasMatch && (
            <span
              className="flex-shrink-0 w-2 h-2 rounded-full"
              style={{ background: "var(--app-accent)" }}
              title="Contains matching relationships in nested graph"
            />
          )}
        </div>

        {/* Content */}
        {hasContent && (
          <>
            <div className="my-3.5 flex-shrink-0 border-t" style={{ borderColor: "var(--app-border)" }} />

            {contentEditing ? (
              <>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelected}
                />
                <div className="flex-1 min-h-0">
                  <LexicalEditor
                    initialState={richTextBlock?.editorState}
                    onChange={updateRichText}
                    onAddImage={() => imageInputRef.current?.click()}
                  />
                </div>
              </>
            ) : (
              richTextBlock && (
                <ReadOnlyLexicalViewer editorState={richTextBlock.editorState} />
              )
            )}

            {imageBlocks.length > 0 && (
              <div className={`mt-3 flex flex-col gap-2 overflow-hidden ${shouldFillImageArea ? "min-h-0 flex-1" : imageOnlyContent ? "items-start" : ""}`}>
                {imageBlocks.map((block) => (
                  <div key={block.id} className="relative group/img">
                    <button
                      type="button"
                      className={`nodrag nowheel cursor-zoom-in rounded border bg-black/20 p-0 w-full ${shouldFillImageArea ? "flex min-h-0 flex-1 items-center justify-center overflow-hidden" : ""}`}
                      style={{ borderColor: "var(--app-border)" }}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => setPreviewImage(block)}
                    >
                      <img
                        src={block.src}
                        alt={block.alt ?? ""}
                        className={`${shouldFillImageArea ? "h-full max-h-full w-full max-w-full" : nodeWidth || !imageOnlyContent ? "max-h-48 w-full" : "max-h-none max-w-none w-auto"} rounded object-contain`}
                        draggable={false}
                      />
                    </button>

                    {contentEditing && (
                      <button
                        type="button"
                        title="Delete image"
                        className="
                          nodrag nowheel
                          absolute top-1 right-1
                          flex items-center justify-center
                          w-5 h-5 rounded-full
                          bg-black/60 text-white/70
                          opacity-0 group-hover/img:opacity-100
                          hover:!opacity-100 hover:bg-red-500/80 hover:text-white
                          transition-opacity
                        "
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteImage(block.id);
                        }}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        </div>
      </div>

      {previewImage && createPortal(
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-8"
          onPointerDown={() => setPreviewImage(null)}
        >
          <img
            src={previewImage.src}
            alt={previewImage.alt ?? ""}
            className="max-h-full max-w-full rounded-lg border bg-[var(--app-surface-2)] object-contain"
            style={{ borderColor: "var(--app-border)", boxShadow: "var(--shadow-3)" }}
          />
        </div>,
        document.body,
      )}

      {ctxMenu && createPortal(
        <div
          className="fixed z-50 bg-[var(--app-surface-2)] border rounded-lg py-1 min-w-[150px]"
          style={{ left: ctxMenu.x, top: ctxMenu.y, borderColor: "var(--app-border)", boxShadow: "var(--shadow-3)" }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {!hasContent ? (
            <button
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-[var(--app-hover)] transition-colors" style={{ color: "var(--app-text-secondary)" }}
              onClick={() => {
                setCtxMenu(null);
                handleAddContent();
              }}
            >
              Add Content
            </button>
          ) : (
            <button
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-[var(--app-hover)] transition-colors" style={{ color: "var(--app-text-secondary)" }}
              onClick={() => {
                setCtxMenu(null);
                useUIStore.getState().setContentMode("edit");
              }}
            >
              Edit Content
            </button>
          )}
          <button
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-[var(--app-danger-hover)] transition-colors"
            style={{ color: "var(--app-danger-text)" }}
            onClick={() => {
              setCtxMenu(null);
              onDeleteNode(id);
            }}
          >
            Delete Node
          </button>
        </div>,
        document.body,
      )}
    </>
  );
}

export default memo(BaseNode);