/**
 * WhatsApp Utility Helper
 */

/**
 * Generates a WhatsApp deep link URL.
 * 
 * @param phone The raw phone number (e.g., "(11) 99999-9999" or "5511999999999")
 * @param message The message to pre-fill
 * @returns The deep link URL or null if phone is invalid
 */
export const getWhatsAppLink = (phone: string, message?: string): string | null => {
    if (!phone) return null;

    // 1. Remove non-numeric characters
    let cleanPhone = phone.replace(/\D/g, '');

    // 2. Validate length (Brazil standard: 10 or 11 digits, or 12/13 if including country code)
    if (cleanPhone.length < 10) return null;

    // 3. Ensure country code (55 for Brazil)
    // If it starts with 55 and has 12 or 13 digits, assume it has country code.
    // If it has 10 or 11 digits, prepend 55.
    if (cleanPhone.length <= 11) {
        cleanPhone = `55${cleanPhone}`;
    }

    // 4. Encode message
    const encodedMessage = message ? encodeURIComponent(message) : '';

    // 5. Build URL
    return `https://wa.me/${cleanPhone}${encodedMessage ? `?text=${encodedMessage}` : ''}`;
};

/**
 * Interpolates a message template with variables.
 * @param template The template string (e.g., "Hello {name}")
 * @param variables A key-value map of variables (e.g., { NAME: "John" })
 */
export const formatMessage = (template: string, variables: Record<string, string>): string => {
    return template.replace(/{(\w+)}/g, (_, key) => {
        const upperKey = key.toUpperCase();
        return variables[upperKey] || `{${key}}`; // Return original if not found
    });
};
