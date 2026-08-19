/**
 * Normaliza URLs de redes sociais.
 * Transforma "@usuario" em URL completa do Instagram.
 * Garante que URLs sempre começam com https://.
 */
export function normalizeInstagramUrl(value: string | undefined): string | undefined {
    if (!value) return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;

    // Se começa com @, transforma em URL do Instagram
    if (trimmed.startsWith('@')) {
        return `https://instagram.com/${trimmed.slice(1)}`;
    }

    // Se é só o username sem @ e sem http
    if (!trimmed.includes('/') && !trimmed.includes('.') && !trimmed.startsWith('http')) {
        return `https://instagram.com/${trimmed}`;
    }

    // Se começa com http mas sem https
    if (trimmed.startsWith('http://')) {
        return trimmed.replace('http://', 'https://');
    }

    // Se não tem protocolo mas parece URL
    if (!trimmed.startsWith('http')) {
        return `https://${trimmed}`;
    }

    return trimmed;
}

/**
 * Normaliza qualquer URL de rede social para garantir https://
 */
export function normalizeSocialUrl(value: string | undefined): string | undefined {
    if (!value) return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;

    if (!trimmed.startsWith('http')) {
        return `https://${trimmed}`;
    }
    if (trimmed.startsWith('http://')) {
        return trimmed.replace('http://', 'https://');
    }
    return trimmed;
}
