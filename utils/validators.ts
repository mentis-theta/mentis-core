
import type { Patient } from '../types.ts';

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const ALLOWED_MIME_TYPES: Record<string, string> = {
    'image/png': 'PNG',
    'image/jpeg': 'JPEG',
    'image/webp': 'WebP',
    'application/pdf': 'PDF',
    'application/msword': 'Word (.doc)',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word (.docx)',
};

export const ALLOWED_EXTENSIONS = Object.keys(ALLOWED_MIME_TYPES).join(',');

export interface ValidationResult {
    isValid: boolean;
    error?: string;
}

export const getDocumentTypeFromMime = (mimeType: string): 'pdf' | 'image' | 'report' => {
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.startsWith('image/')) return 'image';
    return 'report';
};

export const validateDocumentFile = (file: File | null): ValidationResult => {
    if (!file) {
        return { isValid: false, error: "Nenhum arquivo selecionado." };
    }
    if (!ALLOWED_MIME_TYPES[file.type]) {
        const allowed = Object.values(ALLOWED_MIME_TYPES).join(', ');
        return { isValid: false, error: `Tipo de arquivo não permitido. Aceitos: ${allowed}.` };
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
        return { isValid: false, error: `O arquivo excede o limite de ${MAX_FILE_SIZE_MB}MB.` };
    }
    return { isValid: true };
};

export const validateGoalForm = (title: string): ValidationResult => {
    if (!title.trim()) return { isValid: false, error: "O título da meta é obrigatório." };
    return { isValid: true };
};
