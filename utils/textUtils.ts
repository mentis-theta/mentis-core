import type { JSONContent } from '../types';

/**
 * Extracts plain text for previews.
 * If string -> return it.
 * If JSON -> extract text from Tiptap structure.
 */
export const getPlainTextFromSession = (notes: string | JSONContent): string => {
    if (!notes) return '';
    if (typeof notes === 'string') return notes;

    try {
        // Quick traversal to extract text from Tiptap JSON
        // Tiptap JSON is { type: 'doc', content: [ { type: 'paragraph', content: [ { type: 'text', text: '...' } ] } ] }
        let text = '';

        const traverse = (node: any) => {
            if (node.text) text += node.text;
            if (node.content && Array.isArray(node.content)) {
                node.content.forEach((child: any) => traverse(child));
                // Add space or newline between blocks if needed
                if (node.type === 'paragraph') text += '\n';
            }
        };

        traverse(notes);
        return text.trim();
    } catch (e) {
        return 'Error extracting text';
    }
};
