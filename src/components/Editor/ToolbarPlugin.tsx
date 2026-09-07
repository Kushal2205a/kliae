import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import {
    $getSelection,
    $isRangeSelection,
    $createParagraphNode,
    COMMAND_PRIORITY_CRITICAL,
    FORMAT_TEXT_COMMAND,
    SELECTION_CHANGE_COMMAND,
} from "lexical";
import type { TextFormatType } from "lexical";
import {
    $isListNode,
    INSERT_ORDERED_LIST_COMMAND,
    INSERT_UNORDERED_LIST_COMMAND,
    ListNode,
} from "@lexical/list";
import { $getNearestNodeOfType } from "@lexical/utils";
import { $isCodeNode, $createCodeNode } from "@lexical/code";
import { $setBlocksType } from "@lexical/selection";
import {
    Bold,
    Check,
    ChevronDown,
    Code2,
    ImagePlus,
    Italic,
    List,
    ListOrdered,
    Sigma,
    Strikethrough,
    Underline,
} from "lucide-react";
import { EquationEditorDialog, insertEquation } from "./MathNodes";
import { useEscapeKey } from "../../hooks/useEscapeKey";

interface ToolbarPluginProps {
    onAddImage?: () => void;
}

const CODE_LANGUAGES = [
    { value: "javascript", label: "JavaScript" },
    { value: "typescript", label: "TypeScript" },
    { value: "python", label: "Python" },
    { value: "rust", label: "Rust" },
    { value: "go", label: "Go" },
    { value: "java", label: "Java" },
    { value: "c", label: "C" },
    { value: "cpp", label: "C++" },
    { value: "css", label: "CSS" },
    { value: "markup", label: "HTML" },
    { value: "markdown", label: "Markdown" },
    { value: "sql", label: "SQL" },
    { value: "swift", label: "Swift" },
    { value: "objectivec", label: "Objective-C" },
    { value: "diff", label: "Diff" },
] as const;

export default function ToolbarPlugin({ onAddImage }: ToolbarPluginProps) {
    const [editor] = useLexicalComposerContext();

    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [isUnderline, setIsUnderline] = useState(false);
    const [isStrikethrough, setIsStrikethrough] = useState(false);
    const [isBulletList, setIsBulletList] = useState(false);
    const [isNumberedList, setIsNumberedList] = useState(false);
    const [isCode, setIsCode] = useState(false);
    const [codeLanguage, setCodeLanguage] = useState("javascript");
    const toolbarRef = useRef<HTMLDivElement>(null);

    // Language picker dropdown (custom, portal-rendered so the node's
    // overflow-hidden padding can't clip it, unlike a native <select>).
    const [langMenu, setLangMenu] = useState<{
        left: number;
        top: number;
        width: number;
    } | null>(null);
    const langBtnRef = useRef<HTMLButtonElement>(null);
    const langMenuRef = useRef<HTMLDivElement>(null);

    // Equation insert popover (same portal pattern as the language picker so
    // the node's overflow-hidden wrapper can't clip it either).
    const [mathAnchor, setMathAnchor] = useState<{ x: number; y: number } | null>(
        null,
    );
    const mathBtnRef = useRef<HTMLButtonElement>(null);
    useEscapeKey(() => setLangMenu(null), !!langMenu);

    const currentLangLabel =
        CODE_LANGUAGES.find((l) => l.value === codeLanguage)?.label ?? codeLanguage;

    // The language trigger is appended after the code button. Compact nodes
    // cannot show the whole toolbar at once, so reveal the new control as part
    // of the same render instead of leaving its label clipped at the edge.
    useLayoutEffect(() => {
        if (!isCode || !toolbarRef.current) return;
        toolbarRef.current.scrollLeft = toolbarRef.current.scrollWidth;
    }, [isCode]);

    const openLangMenu = useCallback(() => {
        const btn = langBtnRef.current;
        if (!btn) return;
        const rect = btn.getBoundingClientRect();
        // Estimate height so the menu flips above the button when it would
        // otherwise run off the bottom of the window.
        const estHeight = Math.min(CODE_LANGUAGES.length * 28 + 8, 256);
        const below = rect.bottom + 4;
        const fitsBelow = below + estHeight <= window.innerHeight - 8;
        setLangMenu({
            left: rect.left,
            top: fitsBelow ? below : Math.max(8, rect.top - 4 - estHeight),
            width: rect.width,
        });
    }, []);

    const selectLanguage = useCallback(
        (lang: string) => {
            setCodeLanguage(lang);
            setLangMenu(null);
            editor.update(() => {
                const selection = $getSelection();
                if (!$isRangeSelection(selection)) return;
                const anchorNode = selection.anchor.getNode();
                const top =
                    anchorNode.getKey() === "root"
                        ? anchorNode
                        : anchorNode.getTopLevelElementOrThrow();
                if ($isCodeNode(top)) {
                    top.setLanguage(lang);
                }
            });
        },
        [editor]
    );

    // Close the language dropdown on outside click. Escape is handled by the
    // shared dismissible-surface stack.
    useEffect(() => {
        if (!langMenu) return;
        const onPointerDown = (e: PointerEvent) => {
            const target = e.target as Node;
            if (langMenuRef.current?.contains(target)) return;
            if (langBtnRef.current?.contains(target)) return;
            setLangMenu(null);
        };
        document.addEventListener("pointerdown", onPointerDown, true);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown, true);
        };
    }, [langMenu]);

    const $updateToolbar = useCallback(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;

        setIsBold(selection.hasFormat("bold"));
        setIsItalic(selection.hasFormat("italic"));
        setIsUnderline(selection.hasFormat("underline"));
        setIsStrikethrough(selection.hasFormat("strikethrough"));

        const anchorNode = selection.anchor.getNode();
        const element =
            anchorNode.getKey() === "root"
                ? anchorNode
                : anchorNode.getTopLevelElementOrThrow();

        if ($isListNode(element)) {
            const listType = element.getListType();
            setIsBulletList(listType === "bullet");
            setIsNumberedList(listType === "number");
            setIsCode(false);
        } else {
            const parentList = $getNearestNodeOfType(anchorNode, ListNode);
            if (parentList) {
                const listType = parentList.getListType();
                setIsBulletList(listType === "bullet");
                setIsNumberedList(listType === "number");
            } else {
                setIsBulletList(false);
                setIsNumberedList(false);
            }
            const isCode = $isCodeNode(element);
            setIsCode(isCode);
            if (isCode) {
                setCodeLanguage(element.getLanguage() ?? "javascript");
            }
        }
    }, []);

    useEffect(() => {
        return mergeRegister(
            editor.registerUpdateListener(({ editorState }) => {
                editorState.read(() => {
                    $updateToolbar();
                });
            }),
            editor.registerCommand(
                SELECTION_CHANGE_COMMAND,
                () => {
                    $updateToolbar();
                    return false;
                },
                COMMAND_PRIORITY_CRITICAL
            )
        );
    }, [editor, $updateToolbar]);

    const btn =
        "flex-shrink-0 p-1 rounded opacity-40 hover:opacity-90 hover:bg-current/10 transition-colors";
    const active = "!opacity-100 bg-current/15";

    return (
        <>
        {/*
         * KEY: onMouseDown on the container calls e.preventDefault() so the
         * browser never moves focus away from the contenteditable, keeping
         * the Lexical selection alive. Each button then uses onClick (which
         * fires after mouseup without needing focus) to dispatch the command.
         * This is exactly how the official Lexical Playground does it.
         *
         * The toolbar stays a single row and scrolls horizontally (scrollbar
         * hidden) instead of wrapping — wrapping would change the toolbar's
         * height and overflow past nodes that have a fixed/resized height.
         */}
        <style>{`
            .toolbar-scroll {
                scrollbar-width: none;
                -ms-overflow-style: none;
            }
            .toolbar-scroll::-webkit-scrollbar {
                display: none;
            }
            /* Theme-aware language picker. The trigger is a button styled to
               blend with the toolbar in both dark and light mode; the menu is
               rendered in a body portal (see LangMenu below) so the node's
               overflow-hidden padding can never clip or overshadow it. */
            .toolbar-lang-select {
                background-color: var(--app-surface);
                color: var(--app-text);
                border: 1px solid var(--app-border);
                border-radius: var(--radius-sm);
                font-family: inherit;
                cursor: pointer;
                transition: border-color 120ms ease, background-color 120ms ease;
            }
            .toolbar-lang-select:hover {
                border-color: var(--app-border-strong);
                background-color: var(--app-active);
            }
            .toolbar-lang-select:focus-visible {
                outline: none;
                border-color: var(--app-border-focus);
            }
            .toolbar-lang-menu {
                background-color: var(--app-surface);
                color: var(--app-text);
                border: 1px solid var(--app-border);
                border-radius: var(--radius-sm);
                box-shadow: var(--shadow-2);
            }
            .toolbar-lang-option:hover {
                background-color: var(--app-hover);
            }
            .toolbar-lang-option:focus-visible {
                outline: 1px solid var(--app-border-focus);
                outline-offset: -1px;
            }
        `}</style>
        <div
            ref={toolbarRef}
            className="mb-2 flex items-center gap-1 min-w-0 overflow-x-auto overflow-y-hidden nodrag nowheel toolbar-scroll"
            style={{ color: "var(--app-text)" }}
            onMouseDown={(e) => e.preventDefault()}
        >
            <button
                className={`${btn} ${isBold ? active : ""}`}
                title="Bold"
                onClick={() =>
                    editor.dispatchCommand(
                        FORMAT_TEXT_COMMAND,
                        "bold" as TextFormatType
                    )
                }
            >
                <Bold className="w-3.5 h-3.5" />
            </button>

            <button
                className={`${btn} ${isItalic ? active : ""}`}
                title="Italic"
                onClick={() =>
                    editor.dispatchCommand(
                        FORMAT_TEXT_COMMAND,
                        "italic" as TextFormatType
                    )
                }
            >
                <Italic className="w-3.5 h-3.5" />
            </button>

            <button
                className={`${btn} ${isUnderline ? active : ""}`}
                title="Underline"
                onClick={() =>
                    editor.dispatchCommand(
                        FORMAT_TEXT_COMMAND,
                        "underline" as TextFormatType
                    )
                }
            >
                <Underline className="w-3.5 h-3.5" />
            </button>

            <button
                className={`${btn} ${isStrikethrough ? active : ""}`}
                title="Strikethrough"
                onClick={() =>
                    editor.dispatchCommand(
                        FORMAT_TEXT_COMMAND,
                        "strikethrough" as TextFormatType
                    )
                }
            >
                <Strikethrough className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-4 bg-current/15 mx-0.5 flex-shrink-0 self-center" />

            <button
                className={`${btn} ${isBulletList ? active : ""}`}
                title="Bullet list"
                onClick={() =>
                    editor.dispatchCommand(
                        INSERT_UNORDERED_LIST_COMMAND,
                        undefined
                    )
                }
            >
                <List className="w-3.5 h-3.5" />
            </button>

            <button
                className={`${btn} ${isNumberedList ? active : ""}`}
                title="Numbered list"
                onClick={() =>
                    editor.dispatchCommand(
                        INSERT_ORDERED_LIST_COMMAND,
                        undefined
                    )
                }
            >
                <ListOrdered className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-4 bg-current/15 mx-0.5 flex-shrink-0 self-center" />

            <button
                type="button"
                className={btn}
                title="Add image"
                onClick={() => onAddImage?.()}
            >
                <ImagePlus className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-4 bg-current/15 mx-0.5 flex-shrink-0 self-center" />

            <button
                ref={mathBtnRef}
                type="button"
                className={`${btn} ${mathAnchor ? active : ""}`}
                title="Insert equation"
                onClick={(e) => {
                    e.stopPropagation();
                    if (mathAnchor) {
                        setMathAnchor(null);
                        return;
                    }
                    const rect = mathBtnRef.current?.getBoundingClientRect();
                    setMathAnchor(
                        rect
                            ? { x: rect.left, y: rect.bottom + 4 }
                            : { x: 40, y: 40 },
                    );
                }}
            >
                <Sigma className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-4 bg-current/15 mx-0.5 flex-shrink-0 self-center" />

            <button
                className={`${btn} ${isCode ? active : ""}`}
                title="Code block"
                onClick={() =>
                    editor.update(() => {
                        const selection = $getSelection();
                        if (!$isRangeSelection(selection)) return;
                        $setBlocksType(selection, () =>
                            isCode
                                ? $createParagraphNode()
                                : $createCodeNode("javascript")
                        );
                    })
                }
            >
                <Code2 className="w-3.5 h-3.5" />
            </button>

            {isCode && (
                <>
                    <button
                        ref={langBtnRef}
                        type="button"
                        className="toolbar-lang-select flex h-6 flex-shrink-0 items-center gap-1 self-center py-0 pl-1.5 pr-1.5 text-xs"
                        title="Code block language"
                        onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (langMenu) setLangMenu(null);
                            else openLangMenu();
                        }}
                    >
                        <span className="shrink-0 whitespace-nowrap">
                            {currentLangLabel}
                        </span>
                        <ChevronDown
                            className="h-3 w-3 flex-shrink-0"
                            style={{ color: "var(--app-muted)" }}
                            aria-hidden="true"
                        />
                    </button>

                    {langMenu &&
                        createPortal(
                            <div
                                ref={langMenuRef}
                                className="toolbar-lang-menu fixed z-[120] max-h-64 overflow-y-auto py-1"
                                style={{
                                    left: langMenu.left,
                                    top: langMenu.top,
                                    minWidth: langMenu.width,
                                }}
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {CODE_LANGUAGES.map((lang) => {
                                    const selected = lang.value === codeLanguage;
                                    return (
                                        <button
                                            key={lang.value}
                                            type="button"
                                            className={`toolbar-lang-option flex w-full items-center justify-between gap-4 px-2.5 py-1.5 text-left text-xs transition-colors ${
                                                selected
                                                    ? "bg-[var(--app-active)] font-medium text-[var(--app-accent)]"
                                                    : "text-[var(--app-text-secondary)]"
                                            }`}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                selectLanguage(lang.value);
                                            }}
                                        >
                                            <span>{lang.label}</span>
                                            {selected && (
                                                <Check
                                                    className="h-3.5 w-3.5 flex-shrink-0"
                                                    aria-hidden="true"
                                                />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>,
                            document.body
                        )}
                </>
            )}
        </div>

        {mathAnchor && (
            <EquationEditorDialog
                initialLatex=""
                initialInline={false}
                anchor={mathAnchor}
                onSave={(latex, inline) => {
                    insertEquation(editor, latex, inline);
                    setMathAnchor(null);
                }}
                onClose={() => setMathAnchor(null)}
            />
        )}
        </>
    );
}
