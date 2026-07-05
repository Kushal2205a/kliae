import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import ToolbarPlugin from "./ToolbarPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { ListNode, ListItemNode } from "@lexical/list";
import { CodeNode, CodeHighlightNode, registerCodeHighlighting } from "@lexical/code";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";

function CodeHighlightPlugin() {
    const [editor] = useLexicalComposerContext();
    useEffect(() => registerCodeHighlighting(editor), [editor]);
    return null;
}

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
    code: "font-mono text-xs rounded p-2 my-1 block overflow-x-auto whitespace-pre editor-code-block",
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
function Placeholder() {
    return (
        <div className="absolute left-1 top-1 pointer-events-none text-xs opacity-40">
            Start typing...
        </div>
    );
}

interface LexicalEditorProps {
    initialState?: string;
    onChange?: (editorState: string) => void;
    onAddImage?: () => void;
}

export default function LexicalEditor({
    initialState,
    onChange,
    onAddImage,
}: LexicalEditorProps) {
    const initialConfig = {
        namespace: "KnowledgeGraphEditor",
        theme,
        editorState: initialState || undefined,
        nodes: [
            ListNode,
            ListItemNode,
            CodeNode,
            CodeHighlightNode,
        ],
        onError(error: any) {
            throw error;
        },
    };

    return (
        <LexicalComposer initialConfig={initialConfig}>
            <div className="relative flex h-full flex-col nodrag nowheel">
                <ToolbarPlugin onAddImage={onAddImage} />
                <div className="relative flex-1 min-h-0">
                    <RichTextPlugin
                        contentEditable={
                            <ContentEditable
                                className="
                                    nodrag
                                    nowheel
                                    h-full
                                    px-1
                                    py-1
                                    outline-none
                                    text-xs
                                    leading-5
                                    cursor-text
                                    overflow-y-auto
                                "
                                style={{ color: "var(--app-text)" }}
                            />
                        }
                        placeholder={<Placeholder />}
                        ErrorBoundary={LexicalErrorBoundary}
                    />
                </div>
                <HistoryPlugin />
                <ListPlugin />
                <CodeHighlightPlugin />
                <AutoFocusPlugin defaultSelection="rootEnd" />
                <OnChangePlugin
                    onChange={(editorState) => {
                        onChange?.(JSON.stringify(editorState));
                    }}
                />
            </div>
        </LexicalComposer>
    );
}