export function hasMeaningfulContent(html?: string | null | Record<string, any>): boolean {
    if (!html) return false;
    
    if (typeof html === 'object') {
        // TipTap JSONContent check
        if (Object.keys(html).length === 0) return false;
        
        // Naive check for TipTap: if it's just a paragraph with no text
        if (html.type === 'doc' && Array.isArray(html.content)) {
            if (html.content.length === 0) return false;
            if (html.content.length === 1 && html.content[0].type === 'paragraph' && !html.content[0].content) {
                return false;
            }
        }
        return true;
    }

    const text = html
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/gi, " ")
        .trim();

    return text.length > 0;
}

export function stripHtml(html: string): string {
    if (!html) return "";
    return html.replace(/<[^>]*>/g, "");
}

/**
 * Sanitizes HTML by stripping all attributes and only keeping an allowlist of tags.
 * This prevents XSS and ensures the HTML is safe to persist and render.
 */
export function sanitizeHtml(html: string): string {
    if (!html) return "";
    
    const allowedTags = ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote', 'b', 'i', 'u'];
    
    let sanitized = html.replace(/<\/?([a-z0-9]+)[^>]*>/gi, (match, tag) => {
        const lowerTag = tag.toLowerCase();
        
        if (allowedTags.includes(lowerTag)) {
            if (lowerTag === 'br') return '<br/>';
            const isClosing = match.startsWith('</');
            return isClosing ? `</${lowerTag}>` : `<${lowerTag}>`;
        }
        return ''; // Strip the tag entirely if not in allowlist
    });
    
    return sanitized;
}

export function normalizeHtml(html: string): string {
    // For now, normalization is just sanitization.
    // In the future, this could fix unclosed tags or standardize block structures.
    return sanitizeHtml(html);
}

export function appendSemantic(oldHtml: string, newHtml: string): string {
    const safeOld = typeof oldHtml === 'string' ? sanitizeHtml(oldHtml) : oldHtml;
    const safeNew = typeof newHtml === 'string' ? sanitizeHtml(newHtml) : newHtml;
    
    if (!hasMeaningfulContent(safeOld)) return safeNew as string;
    if (!hasMeaningfulContent(safeNew)) return safeOld as string;
    
    return `${safeOld}<br/><br/><blockquote><strong>Adicionado pela Inteligência de Áudio:</strong><br/>${safeNew}</blockquote>`;
}
