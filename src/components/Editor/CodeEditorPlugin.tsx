import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import {
    $createLineBreakNode,
    $createParagraphNode,
    $getSelection,
    $isLineBreakNode,
    $isRangeSelection,
    $isTextNode,
    COMMAND_PRIORITY_CRITICAL,
    COMMAND_PRIORITY_HIGH,
    KEY_DOWN_COMMAND,
    KEY_ENTER_COMMAND,
} from "lexical";
import type { LexicalEditor, LexicalNode, RangeSelection, TextNode } from "lexical";
import {
    $createCodeHighlightNode,
    $isCodeHighlightNode,
    $isCodeNode,
} from "@lexical/code";
import type { CodeNode } from "@lexical/code";

const PAIRS: Record<string, string> = {
    "(": ")",
    "[": "]",
    "{": "}",
    '"': '"',
    "'": "'",
    "`": "`",
};
const OPENERS = new Set(Object.keys(PAIRS));
const CLOSERS = new Set(Object.values(PAIRS));
const INDENT_UNIT = "\t";
const ENDS_WITH_OPENER = /[{[(][ \t]*$/;
const ENDS_WITH_COLON = /:[ \t]*$/;
const LEADING_WS = /^[ \t]*/;
const WORD_CHAR = /[\w$]/;

interface CodeLineInfo {
    codeNode: CodeNode;
    before: string;
    after: string;
    lineStart: number;
    lineEnd: number;
    /** True when the caret line is the last line of the code block. */
    isLastLine: boolean;
    /** True when the caret line contains only whitespace (or is empty). */
    isBlankLine: boolean;
}

function $getCodeParent(node: LexicalNode | null): CodeNode | null {
    if (!node) return null;
    const candidate = $isCodeNode(node) ? node : node.getParent();
    return candidate && $isCodeNode(candidate) ? candidate : null;
}

function $isSelectionInCode(selection: RangeSelection): boolean {
    const anchor = $getCodeParent(selection.anchor.getNode());
    const focus = $getCodeParent(selection.focus.getNode());
    return !!anchor && !!focus && anchor.is(focus);
}

function $getLineInfo(selection: RangeSelection): CodeLineInfo | null {
    const anchor = selection.anchor;
    if (anchor.type === "element" && !$isCodeNode(anchor.getNode())) return null;
    const codeNode = $getCodeParent(anchor.getNode());
    if (!codeNode) return null;

    const children = codeNode.getChildren();
    let caretIndex: number;
    let caretOffset: number;

    if (anchor.type === "text") {
        caretIndex = children.indexOf(anchor.getNode());
        if (caretIndex < 0) return null;
        caretOffset = anchor.offset;
    } else {
        caretIndex = anchor.offset - 1;
        caretOffset =
            caretIndex >= 0 && caretIndex < children.length
                ? children[caretIndex].getTextContentSize()
                : 0;
    }

    let start = caretIndex;
    while (start >= 0 && !$isLineBreakNode(children[start])) start--;
    start++;
    let end = caretIndex + 1;
    while (end < children.length && !$isLineBreakNode(children[end])) end++;

    let before = "";
    for (let i = start; i <= caretIndex; i++) {
        const text = children[i].getTextContent();
        before += i === caretIndex ? text.slice(0, caretOffset) : text;
    }
    let after = "";
    for (let i = caretIndex + 1; i < end; i++) {
        after += children[i].getTextContent();
    }

    let isBlankLine = true;
    for (let i = start; i < end; i++) {
        if (children[i].getTextContent().trim() !== "") {
            isBlankLine = false;
            break;
        }
    }

    return {
        codeNode,
        before,
        after,
        lineStart: start,
        lineEnd: end,
        isLastLine: end >= children.length,
        isBlankLine,
    };
}

function $shouldIndentOnEnter(info: CodeLineInfo): boolean {
    // Bracket-based languages indent after a line that ends in an opener.
    if (ENDS_WITH_OPENER.test(info.before)) return true;
    // Indentation-based blocks (Python `def main():`, YAML `key:`, C-style
    // `case x:` / `default:`, labeled statements) also open on a trailing colon.
    return ENDS_WITH_COLON.test(info.before);
}

function $exitCodeBlockAtCaret(info: CodeLineInfo): void {
    const codeNode = info.codeNode;

    // Remove the trailing blank line, and the line break that preceded it so
    // the code block does not gain an extra empty line.
    codeNode.splice(info.lineStart, info.lineEnd - info.lineStart, []);
    if (info.lineStart > 0) {
        codeNode.splice(info.lineStart - 1, 1, []);
    }

    const paragraph = $createParagraphNode();
    if (codeNode.getChildrenSize() === 0) {
        // The code block is now completely empty; drop it entirely.
        codeNode.replace(paragraph);
    } else {
        codeNode.insertAfter(paragraph);
    }
    paragraph.select();
}

function $charAtCaret(selection: RangeSelection, direction: 1 | -1): string {
    const anchor = selection.anchor;
    if (anchor.type !== "text") return "";
    const node = anchor.getNode();
    if (!$isTextNode(node)) return "";
    const text = node.getTextContent();
    return direction === 1 ? text[anchor.offset] ?? "" : text[anchor.offset - 1] ?? "";
}

function $splicePoint(selection: RangeSelection): number {
    const anchor = selection.anchor;
    if (anchor.type === "element") return anchor.offset;
    const node = anchor.getNode() as TextNode;
    const size = node.getTextContentSize();
    if (anchor.offset <= 0) return node.getIndexWithinParent();
    if (anchor.offset >= size) return node.getIndexWithinParent() + 1;
    const [beforePart] = node.splitText(anchor.offset);
    return beforePart.getIndexWithinParent() + 1;
}

function $handleEnter(editor: LexicalEditor, event: KeyboardEvent | null): boolean {
    if (!event || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) {
        return false;
    }
    const preselection = $getSelection();
    if (!$isRangeSelection(preselection) || !preselection.isCollapsed()) return false;

    let handled = false;
    editor.update(() => {
        const sel = $getSelection();
        if (!$isRangeSelection(sel) || !sel.isCollapsed()) return;
        const info = $getLineInfo(sel);
        if (!info) return;

        event.preventDefault();
        handled = true;

        // Exit the code block when pressing Enter on a trailing blank line:
        // `code + Enter` (new blank indented line) + `Enter` again leaves the block.
        // The lineStart > 0 guard keeps a brand-new empty code block from exiting
        // on its very first Enter (only once there's at least one prior line).
        if (info.isLastLine && info.isBlankLine && info.lineStart > 0) {
            $exitCodeBlockAtCaret(info);
            return;
        }

        const baseIndent = LEADING_WS.exec(info.before)?.[0] ?? "";
        const newIndent = $shouldIndentOnEnter(info)
            ? baseIndent + INDENT_UNIT
            : baseIndent;

        const inserted: LexicalNode[] = [$createLineBreakNode()];
        if (newIndent) inserted.push($createCodeHighlightNode(newIndent));
        info.codeNode.splice($splicePoint(sel), 0, inserted);

        const lastInserted = inserted[inserted.length - 1];
        if ($isCodeHighlightNode(lastInserted)) {
            lastInserted.select();
        } else {
            lastInserted.selectNext(0, 0);
        }
    });
    return handled;
}

function $handleKeyDown(editor: LexicalEditor, event: KeyboardEvent): boolean {
    if (event.ctrlKey || event.metaKey || event.altKey) return false;
    const key = event.key;
    const isOpener = OPENERS.has(key);
    const isCloser = CLOSERS.has(key);
    if (!isOpener && !isCloser && key !== "Backspace") return false;

    const preselection = $getSelection();
    if (!$isRangeSelection(preselection)) return false;

    let handled = false;
    editor.update(() => {
        const sel = $getSelection();
        if (!$isRangeSelection(sel)) return;
        if (!$isSelectionInCode(sel)) return;

        if (key === "Backspace") {
            if (!sel.isCollapsed()) return;
            const prev = $charAtCaret(sel, -1);
            if (!prev || PAIRS[prev] !== $charAtCaret(sel, 1)) return;
            event.preventDefault();
            handled = true;
            sel.deleteCharacter(true);
            sel.deleteCharacter(true);
            return;
        }

        if (sel.isCollapsed()) {
            const next = $charAtCaret(sel, 1);

            if (isCloser && next === key) {
                const node = sel.anchor.getNode();
                if (!$isTextNode(node)) return;
                event.preventDefault();
                handled = true;
                const off = sel.anchor.offset + 1;
                sel.setTextNodeRange(node, off, node, off);
                return;
            }

            const quotePair = isOpener && PAIRS[key] === key;
            if (quotePair) {
                const info = $getLineInfo(sel);
                if (!info) return;
                const prevChar = info.before.slice(-1);
                if (WORD_CHAR.test(prevChar) || WORD_CHAR.test(next)) return;
            }

            event.preventDefault();
            handled = true;
            sel.insertText(key + PAIRS[key]);
            const anchor = sel.anchor;
            const node = anchor.getNode();
            if ($isTextNode(node)) {
                const off = Math.max(0, anchor.offset - 1);
                sel.setTextNodeRange(node, off, node, off);
            }
            return;
        }

        if (isOpener) {
            const { anchor, focus } = sel;
            if (anchor.type !== "text" || focus.type !== "text") return;
            const backward = sel.isBackward();
            const startPt = backward ? sel.focus : sel.anchor;
            const endPt = backward ? sel.anchor : sel.focus;
            const startNode = startPt.getNode();
            const endNode = endPt.getNode();
            if (!$isTextNode(startNode) || !$isTextNode(endNode)) return;
            event.preventDefault();
            handled = true;
            endNode.spliceText(endPt.offset, 0, PAIRS[key]);
            startNode.spliceText(startPt.offset, 0, key);
            sel.setTextNodeRange(
                startNode,
                startPt.offset + key.length,
                endNode,
                endPt.offset + key.length,
            );
        }
    });
    return handled;
}

export default function CodeEditorPlugin() {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        return mergeRegister(
            editor.registerCommand(
                KEY_ENTER_COMMAND,
                (event) => $handleEnter(editor, event),
                COMMAND_PRIORITY_HIGH,
            ),
            editor.registerCommand(
                KEY_DOWN_COMMAND,
                (event) => $handleKeyDown(editor, event as KeyboardEvent),
                COMMAND_PRIORITY_CRITICAL,
            ),
        );
    }, [editor]);

    return null;
}
