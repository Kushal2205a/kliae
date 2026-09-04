import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import katex from "katex";
import {
    $createParagraphNode,
    $getNodeByKeyOrThrow,
    $getSelection,
    $isRangeSelection,
    $applyNodeReplacement,
    DecoratorNode,
    type DOMExportOutput,
    type EditorConfig,
    type LexicalEditor,
    type LexicalNode,
    type LexicalUpdateJSON,
    type NodeKey,
    type SerializedLexicalNode,
} from "lexical";
import { Pencil, Trash2, X } from "lucide-react";
import type { JSX } from "react";
import { useEscapeKey } from "../../hooks/useEscapeKey";

const KATEX_OPTIONS: katex.KatexOptions = {
    throwOnError: false,
    errorColor: "#e06c75",
};

export type SerializedEquationNode = {
    latex: string;
    inline: boolean;
} & SerializedLexicalNode;

/**
 * A single `equation` node that serves both inline math (sits inside a
 * paragraph, like `$x^2$`) and display math (a standalone block line, like
 * `$$\int_0^1 x^2 dx$$`), distinguished by the `inline` flag. Everything —
 * serialization, persistence, live editing UI, and static HTML export for the
 * read-only viewer — lives here so math "just works" in both editors.
 */
export class EquationNode extends DecoratorNode<JSX.Element> {
    __latex: string;
    __inline: boolean;

    static getType(): string {
        return "equation";
    }

    static clone(node: EquationNode): EquationNode {
        return new EquationNode(node.__latex, node.__inline, node.__key);
    }

    constructor(latex?: string, inline?: boolean, key?: NodeKey) {
        super(key);
        this.__latex = latex || "";
        this.__inline = inline || false;
    }

    getLatex(): string {
        return this.__latex;
    }

    setLatex(latex: string): this {
        const writable = this.getWritable();
        writable.__latex = latex;
        return writable;
    }

    isInline(): boolean {
        return this.__inline;
    }

    setInline(inline: boolean): this {
        const writable = this.getWritable();
        writable.__inline = inline;
        return writable;
    }

    static importJSON(serializedNode: SerializedEquationNode): EquationNode {
        return $createEquationNode(
            serializedNode.latex,
            serializedNode.inline,
        ).updateFromJSON(serializedNode);
    }

    updateFromJSON(
        serializedNode: LexicalUpdateJSON<SerializedEquationNode>,
    ): this {
        return super
            .updateFromJSON(serializedNode)
            .setLatex(serializedNode.latex)
            .setInline(serializedNode.inline);
    }

    exportJSON(): SerializedEquationNode {
        return {
            ...super.exportJSON(),
            latex: this.__latex,
            inline: this.__inline,
        };
    }

    getTextContent(): string {
        return this.__latex;
    }

    createDOM(_config: EditorConfig, _editor: LexicalEditor): HTMLElement {
        return document.createElement(this.__inline ? "span" : "div");
    }

    updateDOM(_prevNode: unknown, _dom: HTMLElement): boolean {
        return false;
    }

    exportDOM(_editor: LexicalEditor): DOMExportOutput {
        const element = document.createElement(this.__inline ? "span" : "div");
        element.className = this.__inline
            ? "equation-node equation-inline"
            : "equation-node equation-block";
        try {
            element.innerHTML = katex.renderToString(this.__latex, {
                ...KATEX_OPTIONS,
                displayMode: !this.__inline,
            });
        } catch {
            element.textContent = this.__latex || "";
        }
        return { element };
    }

    decorate(_editor: LexicalEditor, _config: EditorConfig): JSX.Element {
        return (
            <EquationNodeRenderer
                nodeKey={this.__key}
                latex={this.__latex}
                inline={this.__inline}
            />
        );
    }
}

export function $createEquationNode(
    latex: string,
    inline: boolean,
): EquationNode {
    return $applyNodeReplacement(new EquationNode(latex, inline));
}

export function $isEquationNode(
    node: LexicalNode | null | undefined,
): node is EquationNode {
    return node instanceof EquationNode;
}

/**
 * Insert an equation at the current selection.
 * - inline: splices into the text flow right where the caret is.
 * - display: inserts as a top-level block after the current block, followed
 *   by an empty paragraph so typing continues cleanly below the formula.
 */
export function insertEquation(
    editor: LexicalEditor,
    latex: string,
    inline: boolean,
): void {
    const trimmed = latex.trim();
    editor.update(() => {
        const selection = $getSelection();
        if (!trimmed || !selection || !$isRangeSelection(selection)) return;
        const node = $createEquationNode(trimmed, inline);
        if (inline) {
            selection.insertNodes([node]);
        } else {
            const focusNode = selection.focus.getNode();
            const topNode = focusNode.getTopLevelElementOrThrow();
            topNode.insertAfter(node);
            const paragraph = $createParagraphNode();
            node.insertAfter(paragraph);
            paragraph.select();
        }
    });
}

/**
 * Renders a formula inside the editable composer via KaTeX. Double-clicking
 * (or the pencil affordance) opens the equation editor with live preview,
 * since KaTeX output itself isn't editable in place.
 */
function EquationNodeRenderer({
    nodeKey,
    latex,
    inline,
}: {
    nodeKey: NodeKey;
    latex: string;
    inline: boolean;
}) {
    const [editor] = useLexicalComposerContext();
    const hostRef = useRef<HTMLSpanElement | HTMLDivElement>(null);
    const [editorOpen, setEditorOpen] = useState(false);
    const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;
        try {
            host.innerHTML = katex.renderToString(latex, {
                ...KATEX_OPTIONS,
                displayMode: !inline,
            });
        } catch {
            host.textContent = latex || "";
        }
    }, [latex, inline]);

    const openEditor = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!editor.isEditable()) return;
        const rect = hostRef.current?.getBoundingClientRect();
        setAnchor(
            rect
                ? { x: rect.left, y: rect.bottom + 4 }
                : { x: window.innerWidth / 2, y: window.innerHeight / 3 },
        );
        setEditorOpen(true);
    };

    const closeEditor = () => {
        setEditorOpen(false);
        setAnchor(null);
    };

    const handleSave = (newLatex: string, newInline: boolean) => {
        editor.update(() => {
            const node = $getNodeByKeyOrThrow(nodeKey);
            if (node instanceof EquationNode) {
                node.setLatex(newLatex).setInline(newInline);
            }
        });
        closeEditor();
    };

    const handleDelete = () => {
        editor.update(() => {
            const node = $getNodeByKeyOrThrow(nodeKey);
            node.remove();
        });
        closeEditor();
    };

    return (
        <>
            <span
                className={`equation-host ${
                    inline ? "inline-flex align-middle" : "block"
                }`}
            >
                <span
                    ref={hostRef}
                    className="nodrag nowheel pointer-events-none"
                    aria-label={`Math: ${latex}`}
                />
                {editor.isEditable() && (
                    <button
                        type="button"
                        className="equation-edit-button nodrag nowheel"
                        title="Edit equation"
                        onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                        onClick={openEditor}
                    >
                        <Pencil className="h-3 w-3" />
                    </button>
                )}
            </span>
            {editorOpen &&
                anchor &&
                createPortal(
                    <EquationEditorDialog
                        initialLatex={latex}
                        initialInline={inline}
                        anchor={anchor}
                        onSave={handleSave}
                        onDelete={handleDelete}
                        onClose={closeEditor}
                    />,
                    document.body,
                )}
        </>
    );
}
/**
 * The popover used both for inserting a new equation from the toolbar and for
 * editing an existing formula: raw LaTeX input with a live KaTeX preview and
 * an inline/display toggle. Portaled to body so nothing nests it inside the
 * node, and themed with the app CSS vars so it matches dark + light mode.
 */
export function EquationEditorDialog({
    initialLatex = "",
    initialInline = false,
    anchor,
    onSave,
    onDelete,
    onClose,
}: {
    initialLatex?: string;
    initialInline?: boolean;
    anchor?: { x: number; y: number } | null;
    onSave: (latex: string, inline: boolean) => void;
    onDelete?: () => void;
    onClose: () => void;
}) {
    const [latex, setLatex] = useState(initialLatex);
    const [inline, setInline] = useState(initialInline);
    const previewRef = useRef<HTMLSpanElement | HTMLDivElement>(null);
    useEscapeKey(onClose);

    useEffect(() => {
        const preview = previewRef.current;
        if (!preview) return;
        try {
            preview.innerHTML = katex.renderToString(latex, {
                ...KATEX_OPTIONS,
                displayMode: !inline,
            });
        } catch {
            preview.textContent = latex || "";
        }
    }, [latex, inline]);

    const left = anchor ? Math.max(8, anchor.x) : undefined;
    const top = anchor?.y;

    return createPortal(
        <div
            className="fixed z-[130]"
            style={{ left, top }}
            onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
            }}
        >
            <div
                className="w-[340px] rounded-xl border p-3"
                style={{
                    background: "var(--app-surface-2)",
                    borderColor: "var(--app-border)",
                    boxShadow: "var(--shadow-2)",
                }}
            >
                <div className="mb-2 flex items-center justify-between">
                    <span
                        className="text-xs font-medium"
                        style={{ color: "var(--app-text)" }}
                    >
                        Equation
                    </span>
                    <button
                        type="button"
                        className="rounded p-0.5 transition-colors"
                        style={{ color: "var(--app-muted)" }}
                        onClick={onClose}
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>

                <div className="mb-2 flex gap-1">
                    {(["inline", "display"] as const).map((mode) => {
                        const active = mode === "inline" ? inline : !inline;
                        return (
                            <button
                                key={mode}
                                type="button"
                                className="flex-1 rounded px-2 py-1 text-xs transition-colors"
                                style={{
                                    background: active
                                        ? "var(--app-active)"
                                        : "transparent",
                                    color: active
                                        ? "var(--app-text)"
                                        : "var(--app-muted)",
                                    border: `1px solid ${
                                        active
                                            ? "var(--app-border-focus)"
                                            : "var(--app-border)"
                                    }`,
                                }}
                                onClick={() => setInline(mode === "inline")}
                            >
                                {mode === "inline" ? "Inline" : "Display"}
                            </button>
                        );
                    })}
                </div>

                <textarea
                    autoFocus
                    value={latex}
                    onChange={(e) => setLatex(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            if (latex.trim()) {
                                onSave(latex.trim(), inline);
                            }
                        }
                        if (e.key === "Escape") {
                            e.preventDefault();
                            e.stopPropagation();
                            onClose();
                        }
                    }}
                    rows={3}
                    placeholder="e.g. E = mc^2"
                    className="w-full resize-none rounded border px-2 py-1 font-mono text-xs outline-none"
                    style={{
                        background: "var(--app-bg)",
                        color: "var(--app-text)",
                        borderColor: "var(--app-border)",
                    }}
                />
<div
                    className="mt-2 rounded border p-2 text-[13px] leading-6"
                    style={{
                        background: "var(--app-bg)",
                        borderColor: "var(--app-border)",
                        color: "var(--app-text)",
                        minHeight: "44px",
                    }}
                >
                    <code
                        ref={previewRef}
                        className="katex-wrap block"
                        aria-label="Live equation preview"
                    />
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="flex gap-1.5">
                        {onDelete && (
                            <button
                                type="button"
                                className="rounded p-1.5 transition-colors"
                                title="Delete equation"
                                style={{ color: "var(--app-danger-text)" }}
                                onClick={onDelete}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            className="rounded px-2.5 py-1 text-xs transition-colors"
                            style={{ color: "var(--app-muted)" }}
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="rounded px-3 py-1 text-xs font-medium transition-colors"
                            style={{
                                background: "var(--app-active)",
                                color: "var(--app-text)",
                                border: "1px solid var(--app-border-strong)",
                            }}
                            disabled={!latex.trim()}
                            onClick={() =>
                                latex.trim() && onSave(latex.trim(), inline)
                            }
                        >
                            Insert
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}
