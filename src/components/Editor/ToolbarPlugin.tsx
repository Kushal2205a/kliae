import { useCallback, useEffect, useState } from "react";
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
    Code2,
    ImagePlus,
    Italic,
    List,
    ListOrdered,
    Strikethrough,
    Underline,
} from "lucide-react";

interface ToolbarPluginProps {
    onAddImage?: () => void;
}

export default function ToolbarPlugin({ onAddImage }: ToolbarPluginProps) {
    const [editor] = useLexicalComposerContext();

    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [isUnderline, setIsUnderline] = useState(false);
    const [isStrikethrough, setIsStrikethrough] = useState(false);
    const [isBulletList, setIsBulletList] = useState(false);
    const [isNumberedList, setIsNumberedList] = useState(false);
    const [isCode, setIsCode] = useState(false);

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
            setIsCode($isCodeNode(element));
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
        `}</style>
        <div
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
        </div>
        </>
    );
}