import { useCallback, useEffect, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import {
    $getSelection,
    $isRangeSelection,
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
import {
    Bold,
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
        "p-1 rounded text-white/45 hover:text-white/80 hover:bg-white/10 transition-colors";
    const active = "bg-white/15 !text-white";

    return (
        /*
         * KEY: onMouseDown on the container calls e.preventDefault() so the
         * browser never moves focus away from the contenteditable, keeping
         * the Lexical selection alive. Each button then uses onClick (which
         * fires after mouseup without needing focus) to dispatch the command.
         * This is exactly how the official Lexical Playground does it.
         */
        <div
            className="mb-2 flex items-center gap-1 nodrag nowheel"
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

            <div className="w-px h-4 bg-white/15 mx-0.5" />

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

            <div className="w-px h-4 bg-white/15 mx-0.5" />

            <button
                type="button"
                className={btn}
                title="Add image"
                onClick={() => onAddImage?.()}
            >
                <ImagePlus className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}