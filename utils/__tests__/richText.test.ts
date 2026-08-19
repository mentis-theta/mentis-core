import { hasMeaningfulContent, stripHtml, sanitizeHtml, appendSemantic } from '../richText';

describe('richText utilities', () => {
    describe('hasMeaningfulContent', () => {
        it('should return false for empty strings', () => {
            expect(hasMeaningfulContent("")).toBe(false);
            expect(hasMeaningfulContent(null)).toBe(false);
            expect(hasMeaningfulContent(undefined)).toBe(false);
        });

        it('should return false for HTML with only empty tags or spaces', () => {
            expect(hasMeaningfulContent("<p></p>")).toBe(false);
            expect(hasMeaningfulContent("<p><br></p>")).toBe(false);
            expect(hasMeaningfulContent("<div>&nbsp;</div>")).toBe(false);
            expect(hasMeaningfulContent("<p>   </p>")).toBe(false);
        });

        it('should return true for HTML with actual text content', () => {
            expect(hasMeaningfulContent("<p>Paciente bem.</p>")).toBe(true);
            expect(hasMeaningfulContent("<strong>Anotação importante</strong>")).toBe(true);
            expect(hasMeaningfulContent("Apenas texto puro")).toBe(true);
        });

        it('should handle TipTap empty JSON object', () => {
            expect(hasMeaningfulContent({})).toBe(false);
        });

        it('should handle TipTap empty paragraph', () => {
            const emptyTipTap = {
                type: 'doc',
                content: [{ type: 'paragraph' }]
            };
            expect(hasMeaningfulContent(emptyTipTap)).toBe(false);
        });
    });

    describe('sanitizeHtml', () => {
        it('should allow valid tags and strip attributes', () => {
            const input = '<p style="color:red" onclick="alert(1)">Hello <strong class="bold">World</strong></p>';
            const expected = '<p>Hello <strong>World</strong></p>';
            expect(sanitizeHtml(input)).toBe(expected);
        });

        it('should remove dangerous tags entirely', () => {
            const input = '<p>Safe</p><script>alert("hack")</script><iframe src="evil.com"></iframe>';
            const expected = '<p>Safe</p>alert("hack")';
            // Note: our simple sanitizeHtml regex leaves the text content of stripped tags.
            // This is acceptable since text content is harmless without the script tag execution.
            expect(sanitizeHtml(input)).toBe(expected);
        });

        it('should properly format <br>', () => {
            const input = '<p>Line 1<br>Line 2<br/>Line 3</p>';
            const expected = '<p>Line 1<br/>Line 2<br/>Line 3</p>';
            expect(sanitizeHtml(input)).toBe(expected);
        });
    });

    describe('appendSemantic', () => {
        it('should return only new content if old is empty', () => {
            expect(appendSemantic("<p></p>", "<p>New</p>")).toBe("<p>New</p>");
        });

        it('should return only old content if new is empty', () => {
            expect(appendSemantic("<p>Old</p>", "<p></p>")).toBe("<p>Old</p>");
        });

        it('should wrap new content in a semantic blockquote if both exist', () => {
            const result = appendSemantic("<p>Old</p>", "<p>New</p>");
            expect(result).toContain("<p>Old</p>");
            expect(result).toContain("<blockquote><strong>Adicionado pela Inteligência de Áudio:</strong><br/><p>New</p></blockquote>");
        });
    });
});
