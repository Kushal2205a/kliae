import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import ToolbarPlugin from "./ToolbarPlugin";
import CodeEditorPlugin from "./CodeEditorPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { ListNode, ListItemNode } from "@lexical/list";
import { CodeNode, CodeHighlightNode, registerCodeHighlighting } from "@lexical/code";
import { EquationNode } from "./MathNodes";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";
import lexicalTheme from "./lexicalTheme";

function CodeHighlightPlugin() {
    const [editor] = useLexicalComposerContext();
    useEffect(() => registerCodeHighlighting(editor), [editor]);
    return null;
}

function Placeholder() {
    return (
        <div className="absolute inset-0 -translate-x-px px-1 py-1 pointer-events-none text-xs leading-5 opacity-40">
            Start typing...
        </div>
    );
}

interface LexicalEditorProps {
    initialState?: string;
    onChange?: (editorState: string) => void;
    onAddImage?: () => void;
    autoGrow?: boolean;
}

export default function LexicalEditor({
    initialState,
    onChange,
    onAddImage,
    autoGrow = false,
}: LexicalEditorProps) {
    const initialConfig = {
        namespace: "KnowledgeGraphEditor",
        theme: lexicalTheme,
        editorState: initialState || undefined,
        nodes: [
            ListNode,
            ListItemNode,
            CodeNode,
            CodeHighlightNode,
            EquationNode,
        ],
        onError(error: any) {
            throw error;
        },
    };

    return (
        <LexicalComposer initialConfig={initialConfig}>
            <div className={`relative flex flex-col nodrag nowheel ${autoGrow ? "" : "h-full"}`}>
                <ToolbarPlugin onAddImage={onAddImage} />
                <div className={`relative ${autoGrow ? "" : "flex-1 min-h-0"}`}>
                    <RichTextPlugin
                        contentEditable={
                            <ContentEditable
                                className={`
                                    nodrag
                                    nowheel
                                    px-1
                                    py-1
                                    outline-none
                                    text-xs
                                    leading-5
                                    cursor-text
                                    ${autoGrow ? "min-h-7 overflow-visible" : "h-full overflow-y-auto"}
                                `}
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
                <CodeEditorPlugin />
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
