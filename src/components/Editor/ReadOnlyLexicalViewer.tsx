import { useEffect } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { ListNode, ListItemNode } from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

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
};

/**
 * Inner plugin — reacts to editorState prop changes so the viewer stays
 * in sync when the parent re-renders with a different node's content.
 * No `loaded` guard: unlike the edit-mode LoadEditorStatePlugin we always
 * want to reflect the current prop (the component is read-only so there is
 * no risk of clobbering in-progress edits).
 */
function LoadStatePlugin({ editorState }: { editorState: string }) {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        if (!editorState) return;
        try {
            const parsed = editor.parseEditorState(editorState);
            editor.setEditorState(parsed);
        } catch (err) {
            console.error("ReadOnlyLexicalViewer: failed to parse editor state", err);
        }
    }, [editor, editorState]);

    return null;
}

interface ReadOnlyLexicalViewerProps {
    editorState: string;
}

export default function ReadOnlyLexicalViewer({ editorState }: ReadOnlyLexicalViewerProps) {
    const initialConfig = {
        namespace: "KnowledgeGraphViewer",
        theme,
        nodes: [ListNode, ListItemNode],
        editable: false,          // no caret, no editing, no cursor blink
        onError(error: Error) {
            console.error("ReadOnlyLexicalViewer error:", error);
        },
    };

    return (
        <LexicalComposer initialConfig={initialConfig}>
            <RichTextPlugin
                contentEditable={
                    <ContentEditable
                        className="text-xs leading-5 outline-none cursor-text nodrag nowheel"
                        style={{ color: "var(--app-text)" }}
                    />
                }
                placeholder={null}
                ErrorBoundary={LexicalErrorBoundary}
            />
            <ListPlugin />
            <LoadStatePlugin editorState={editorState} />
        </LexicalComposer>
    );
}