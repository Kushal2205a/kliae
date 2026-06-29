import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import ToolbarPlugin from "./ToolbarPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import LoadEditorStatePlugin from "./LoadEditorStatePlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { $getRoot } from "lexical";
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



function Placeholder() {
    return (
        <div
            className="absolute left-1 top-1 pointer-events-none text-xs opacity-40"
        >
            Start typing...
        </div>
    );
}
import { ListNode, ListItemNode } from "@lexical/list";


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
        nodes: [
            ListNode,
            ListItemNode,
        ],
        onError(error: any) {
            throw error;
        },
    };
    return (
        <LexicalComposer initialConfig={initialConfig}>
            <div
                className="relative flex h-full flex-col nodrag nowheel"
            >
                <ToolbarPlugin
                    onAddImage={onAddImage}
                />
                <RichTextPlugin
                    contentEditable={
                        <ContentEditable
                            className="
                                        nodrag
                                        nowheel
                                        flex-1
                                        min-h-0
                                        px-1
                                        py-1
                                        outline-none
                                        text-xs
                                        leading-5
                                        cursor-text
                                        overflow-y-auto
                                       "
                            style={{
                                color: "var(--app-text)",
                            }}
                        />
                    }
                    placeholder={<Placeholder />}
                    ErrorBoundary={LexicalErrorBoundary}
                />

                <HistoryPlugin />
                <ListPlugin />
                <LoadEditorStatePlugin
                    editorState={initialState}
                />
                <OnChangePlugin
                    onChange={(editorState) => {
                        onChange?.(
                            JSON.stringify(editorState)
                        );
                    }}
                />
            </div>
        </LexicalComposer>
    );
}