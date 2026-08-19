
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useRef } from 'react';
import { Bold, Italic, List, ListOrdered, Quote, Undo, Redo } from 'lucide-react';
import type { JSONContent } from '@/types';
import { Mark, mergeAttributes } from '@tiptap/core';

export const ForensicHighlight = Mark.create({
    name: 'forensicHighlight',
    addOptions() {
        return { HTMLAttributes: { class: 'underline decoration-orange-500 decoration-wavy decoration-2 underline-offset-4 bg-orange-50/50 cursor-help' } };
    },
    addAttributes() {
        return {
            title: {
                default: null,
                parseHTML: element => element.getAttribute('title'),
                renderHTML: attributes => {
                    if (!attributes.title) return {};
                    return { title: attributes.title };
                }
            }
        }
    },
    parseHTML() { return [{ tag: 'span[data-forensic]' }]; },
    renderHTML({ HTMLAttributes }) { return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-forensic': 'true' }), 0]; },
});

interface RichTextEditorProps {
    content: JSONContent | string;
    onChange: (content: JSONContent) => void;
    editable?: boolean;
    placeholder?: string;
    className?: string;
    isAuditing?: boolean;
    detectedClaims?: Array<{ statement: string, suggested_correction: string }>;
    onPaste?: (text: string, event: ClipboardEvent) => boolean | void;
}

const MenuBar = ({ editor }: { editor: any }) => {
    if (!editor) {
        return null;
    }

    const Button = ({ onClick, isActive, children, title }: any) => (
        <button
            onClick={onClick}
            className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${isActive ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400' : ' text-foreground-muted   '
                }`}
            title={title}
            type="button"
        >
            {children}
        </button>
    );

    return (
        <div className="flex flex-wrap gap-1 p-2 border-b border-border bg-surface rounded-t-lg">
            <Button
                onClick={() => editor.chain().focus().toggleBold().run()}
                isActive={editor.isActive('bold')}
                title="Negrito (Ctrl+B)"
            >
                <Bold className="w-4 h-4" />
            </Button>
            <Button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                isActive={editor.isActive('italic')}
                title="Itálico (Ctrl+I)"
            >
                <Italic className="w-4 h-4" />
            </Button>
            <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1 self-center" />
            <Button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                isActive={editor.isActive('bulletList')}
                title="Lista com marcadores"
            >
                <List className="w-4 h-4" />
            </Button>
            <Button
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                isActive={editor.isActive('orderedList')}
                title="Lista numerada"
            >
                <ListOrdered className="w-4 h-4" />
            </Button>
            <Button
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                isActive={editor.isActive('blockquote')}
                title="Citação"
            >
                <Quote className="w-4 h-4" />
            </Button>
            <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1 self-center" />
            <Button
                onClick={() => editor.chain().focus().undo().run()}
                title="Desfazer (Ctrl+Z)"
            >
                <Undo className="w-4 h-4" />
            </Button>
            <Button
                onClick={() => editor.chain().focus().redo().run()}
                title="Refazer (Ctrl+Y)"
            >
                <Redo className="w-4 h-4" />
            </Button>
        </div>
    );
};

export const RichTextEditor = ({ content, onChange, editable = true, placeholder = 'Digite aqui...', className = '', isAuditing = false, detectedClaims = [], onPaste }: RichTextEditorProps) => {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder,
            }),
            ForensicHighlight
        ],
        content: content, // Initial content
        editable: editable && !isAuditing,
        onUpdate: ({ editor }) => {
            onChange(editor.getJSON());
        },
        editorProps: {
            attributes: {
                class: 'prose dark:prose-invert max-w-none focus:outline-none min-h-[150px] p-4',
            },
            handlePaste(view, event, slice) {
                if (onPaste) {
                    const text = event.clipboardData?.getData('text/plain') || '';
                    if (text) {
                        return onPaste(text, event) === true;
                    }
                }
                return false;
            }
        },
    });

    // Update content if changed externally (e.g. loading saved data)
    // Usa ref para rastrear o último conteúdo setado, evitando JSON.stringify O(n) a cada render
    const lastExternalContent = useRef<JSONContent | string | null>(null);

    useEffect(() => {
        if (editor && content && !editor.isFocused && !editor.isDestroyed) {
            // Skip se o conteúdo é o mesmo que já foi setado externamente (por referência)
            if (lastExternalContent.current === content) return;

            lastExternalContent.current = content;
            try {
                editor.commands.setContent(content);
            } catch (e) {
                console.warn('RichTextEditor setContent error:', e);
            }
        }
    }, [content, editor]);

    // Apply Forensic Highlights when claims are detected
    useEffect(() => {
        if (!editor) return;

        // Save current user cursor/selection
        const { from, to } = editor.state.selection;

        // Clear any existing forensic marks before applying new ones
        editor.commands.selectAll();
        editor.commands.unsetMark('forensicHighlight');
        
        if (detectedClaims.length === 0) {
            editor.commands.setTextSelection({ from, to });
            return;
        }
        
        detectedClaims.forEach(claim => {
            const statement = claim.statement;
            if (!statement) return;
            
            // Build flexible regex to handle subtle spacing/case differences
            const escaped = statement.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const flexibleSpace = escaped.replace(/\\s\+/g, '\\s+').replace(/\s+/g, '\\s+');
            const regex = new RegExp(flexibleSpace, 'i');
            
            editor.view.state.doc.descendants((node, pos) => {
                if (node.isText && node.text) {
                    const match = regex.exec(node.text);
                    if (match) {
                        const idx = match.index;
                        editor.commands.setTextSelection({ from: pos + idx, to: pos + idx + match[0].length });
                        editor.commands.setMark('forensicHighlight', { title: 'Salto Inferencial: ' + claim.suggested_correction });
                    }
                }
            });
        });
        
        // Restore user cursor
        editor.commands.setTextSelection({ from, to });
    }, [detectedClaims, editor]);

    return (
        <div className={`border border-border rounded-lg bg-surface focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all ${isAuditing ? 'opacity-70 pointer-events-none' : ''} ${className}`}>
            {editable && <MenuBar editor={editor} />}
            <EditorContent editor={editor} />
        </div>
    );
};
