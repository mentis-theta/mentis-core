
import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ReactMarkdown from 'react-markdown';
import Placeholder from '@tiptap/extension-placeholder';
import type { JSONContent } from '@/types';

interface RichTextRendererProps {
    content: string | JSONContent | undefined;
    className?: string;
    readOnly?: boolean;
    onChange?: (content: JSONContent) => void;
    placeholder?: string;
}

export const RichTextRenderer: React.FC<RichTextRendererProps> = ({ content, className, readOnly = true, onChange, placeholder = '' }) => {
    const isString = typeof content === 'string';

    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({ placeholder })
        ],
        content: content as any,
        editable: !readOnly,
        onUpdate: ({ editor }) => {
            if (onChange) {
                onChange(editor.getJSON());
            }
        },
        editorProps: {
            attributes: {
                class: `prose dark:prose-invert max-w-none focus:outline-none ${className || ''}`,
            },
        },
    }, [readOnly, placeholder]); // Re-create if readOnly changes

    // Sync content if it changes externally
    React.useEffect(() => {
        if (editor && content !== undefined && content !== editor.getJSON() && content !== editor.getHTML()) {
            editor.commands.setContent(content as any);
        }
    }, [content, editor]);

    if (isString) {
        // Legacy support: Render as markdown
        return (
            <div className={`prose dark:prose-invert max-w-none ${className || ''}`}>
                <ReactMarkdown>{content as string}</ReactMarkdown>
            </div>
        );
    }

    return <EditorContent editor={editor} />;
};

export { getPlainTextFromSession } from '../../utils/textUtils';
