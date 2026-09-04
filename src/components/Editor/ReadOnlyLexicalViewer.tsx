import { useEffect, useState } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $generateHtmlFromNodes } from "@lexical/html";
import { ListNode, ListItemNode } from "@lexical/list";
import { CodeNode, CodeHighlightNode } from "@lexical/code";
import { EquationNode } from "./MathNodes";
import lexicalTheme from "./lexicalTheme";

/**
 * Converts Lexical editor state into static HTML and renders it as a plain
 * <div> instead of a contentEditable element. This ensures the read-only
 * viewer behaves like static content: no text selection on drag, no pointer
 * event capture, and the entire node surface remains draggable via React Flow.
 */
function StaticHtmlRenderer({ editorState: propEditorState }: { editorState: string }) {
    const [editor] = useLexicalComposerContext();
    const [html, setHtml] = useState("");

    useEffect(() => {
        if (!propEditorState) {
            setHtml("");
            return;
        }
        try {
            const parsed = editor.parseEditorState(propEditorState);
            editor.setEditorState(parsed);
            editor.getEditorState().read(() => {
                setHtml($generateHtmlFromNodes(editor, null));
            });
        } catch (err) {
            console.error("ReadOnlyLexicalViewer: failed to parse editor state", err);
        }
    }, [editor, propEditorState]);

    if (!html) return null;

    return (
        <div
            className="text-xs leading-5 nowheel"
            style={{ color: "var(--app-text)", userSelect: "none" }}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}

interface ReadOnlyLexicalViewerProps {
    editorState: string;
}

export default function ReadOnlyLexicalViewer({ editorState }: ReadOnlyLexicalViewerProps) {
    const initialConfig = {
        namespace: "KnowledgeGraphViewer",
        theme: lexicalTheme,
        nodes: [ListNode, ListItemNode, CodeNode, CodeHighlightNode, EquationNode],
        editable: false,
        onError(error: Error) {
            console.error("ReadOnlyLexicalViewer error:", error);
        },
    };

    return (
        <LexicalComposer initialConfig={initialConfig}>
            <StaticHtmlRenderer editorState={editorState} />
        </LexicalComposer>
    );
}
