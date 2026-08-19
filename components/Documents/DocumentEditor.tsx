import React, { useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { ForensicHighlight } from '../Clinical/RichTextEditor';

interface DocumentEditorProps {
    content: string;
    onChange: (content: string) => void;
    placeholder?: string;
    minHeightClass?: string;
    isAuditing?: boolean;
    detectedClaims?: Array<{ statement: string, suggested_correction: string }>;
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({ content, onChange, placeholder, minHeightClass = 'min-h-[500px]', isAuditing = false, detectedClaims = [] }) => {
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const prevContentProp = useRef(content);

    const handleUpdate = useCallback((newHTML: string) => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
            onChange(newHTML);
        }, 500);
    }, [onChange]);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3]
                }
            }),
            Placeholder.configure({
                placeholder: placeholder || 'Selecione um modelo e um paciente para começar...'
            }),
            ForensicHighlight
        ],
        editable: !isAuditing,
        content: content,
        editorProps: {
            attributes: {
                class: `prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none max-w-none ${minHeightClass} p-6`
            }
        },
        onUpdate: ({ editor }) => {
            handleUpdate(editor.getHTML());
        }
    });

    // Update editor content ONLY when parent explicitly passes a NEW string that differs from our last know prop
    useEffect(() => {
        if (editor && content !== prevContentProp.current && !editor.isFocused) {
            prevContentProp.current = content;
            if (content !== editor.getHTML()) {
                editor.commands.setContent(content);
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

    if (!editor) {
        return null;
    }

    return (
        <div className="flex flex-col h-full bg-slate-50/50 rounded-2xl border border-transparent shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-1.5 p-2 bg-slate-50 flex-wrap border-b border-slate-100/60">
                <button
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${editor.isActive('bold')
                        ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-900'
                        : 'hover:bg-slate-100 text-slate-600 border-transparent'
                        }`}
                    title="Negrito"
                >
                    <strong>B</strong>
                </button>

                <button
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${editor.isActive('italic')
                        ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-900'
                        : 'hover:bg-slate-100 text-slate-600 border-transparent'
                        }`}
                    title="Itálico"
                >
                    <em>I</em>
                </button>

                <div className="w-px h-6 bg-surface-container-highest mx-1"></div>

                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${editor.isActive('heading', { level: 1 })
                        ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-900'
                        : 'hover:bg-slate-100 text-slate-600 border-transparent'
                        }`}
                    title="Título 1"
                >
                    H1
                </button>

                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${editor.isActive('heading', { level: 2 })
                        ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-900'
                        : 'hover:bg-slate-100 text-slate-600 border-transparent'
                        }`}
                    title="Título 2"
                >
                    H2
                </button>

                <div className="w-px h-6 bg-surface-container-highest mx-1"></div>

                <button
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${editor.isActive('bulletList')
                        ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-900'
                        : 'hover:bg-slate-100 text-slate-600 border-transparent'
                        }`}
                    title="Lista com marcadores"
                >
                    • Lista
                </button>

                <button
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${editor.isActive('orderedList')
                        ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-900'
                        : 'hover:bg-slate-100 text-slate-600 border-transparent'
                        }`}
                    title="Lista numerada"
                >
                    1. Lista
                </button>

                <div className="w-px h-6 bg-surface-container-highest mx-1"></div>

                <button
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                    className="px-3 py-1.5 rounded-xl text-sm font-medium bg-surface-container hover:bg-surface-container-highest text-on-surface border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Desfazer"
                >
                    ↶
                </button>

                <button
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                    className="px-3 py-1.5 rounded-xl text-sm font-medium bg-surface-container hover:bg-surface-container-highest text-on-surface border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Refazer"
                >
                    ↷
                </button>
            </div>

            {/* Editor Content */}
            <div className={`flex-1 overflow-y-auto transition-all ${isAuditing ? 'opacity-70 pointer-events-none' : ''}`}>
                <EditorContent
                    editor={editor}
                    className="h-full text-on-surface dark:text-slate-100"
                />
            </div>
        </div>
    );
};

export default DocumentEditor;
