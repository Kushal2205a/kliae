import { useEffect, useState } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $generateHtmlFromNodes } from "@lexical/html";
import { ListNode, ListItemNode } from "@lexical/list";
import { CodeNode, CodeHighlightNode } from "@lexical/code";

// Shared with LexicalEditor.tsx — consider extracting to lexicalTheme.ts
const theme = {
    paragraph: "leading-6",
    text: {
        bold: "font-bold",
        italic: "italic",
        underline: "underline",
        strikethrough: "line-through",
        underlineStrikethrough: "underline line-through",
    },
    list: {
        ul: "list-disc pl-4 ml-1",
        ol: "list-decimal pl-4 ml-1",
        listitem: "leading-5",
        nested: {
            listitem: "list-none",
        },
    },
    code:"font-mono text-xs rounded p-2 my-1 block overflow-x-auto whitespace-pre editor-code-block",
    codeHighlight: {
        comment:        "text-[#5c6370] italic",
        prolog:         "text-[#5c6370]",
        doctype:        "text-[#5c6370]",
        cdata:          "text-[#5c6370]",
        keyword:        "text-[#c678dd]",
        atrule:         "text-[#c678dd]",
        important:      "text-[#c678dd]",
        regex:          "text-[#c678dd]",
        selector:       "text-[#98c379]",
        string:         "text-[#98c379]",
        char:           "text-[#98c379]",
        inserted:       "text-[#98c379]",
        "class-name":   "text-[#e5c07b]",
        class:          "text-[#e5c07b]",
        function:       "text-[#61afef]",
        builtin:        "text-[#61afef]",
        number:         "text-[#d19a66]",
        boolean:        "text-[#d19a66]",
        constant:       "text-[#d19a66]",
        symbol:         "text-[#d19a66]",
        deleted:        "text-[#e06c75]",
        property:       "text-[#e06c75]",
        tag:            "text-[#e06c75]",
        namespace:      "text-[#e06c75]",
        entity:         "text-[#e06c75]",
        attr:           "text-[#e06c75]",
        operator:       "text-[#56b6c2]",
        url:            "text-[#56b6c2]",
        variable:       "text-[#e06c75]",
        punctuation:    "text-[#abb2bf]",
    },
};

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
        theme,
        nodes: [ListNode, ListItemNode, CodeNode, CodeHighlightNode],
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