import { useEffect, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

interface Props {
    editorState?: string;
}

export default function LoadEditorStatePlugin({
    editorState,
}: Props) {
    const [editor] = useLexicalComposerContext();
    const loaded = useRef(false);

    useEffect(() => {
        if (loaded.current) return;
        if (!editorState) return;

        try {
            const state = editor.parseEditorState(editorState);
            editor.setEditorState(state);
            loaded.current = true;
        } catch (err) {
            console.error("Failed to restore editor state", err);
        }
    }, [editor, editorState]);

    return null;
}