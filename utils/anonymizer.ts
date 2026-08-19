import { Patient } from '../types.ts';

export const anonymizeClinicalText = (text: string, patient: Patient): string => {
    if (!text) return text;

    let sanitizedText = text;

    // Remove CPF
    const cpfRegex = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\b\d{11}\b/g;
    sanitizedText = sanitizedText.replace(cpfRegex, '[CPF_CENSURADO]');

    // Remove Phone Numbers (Brazilian format)
    const phoneRegex = /\b(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?9\d{4}[-\s]?\d{4}\b/g;
    sanitizedText = sanitizedText.replace(phoneRegex, '[TELEFONE_CENSURADO]');

    // Remove Emails
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    sanitizedText = sanitizedText.replace(emailRegex, '[EMAIL_CENSURADO]');

    // Remove Patient Names
    if (patient && patient.name) {
        // Split name into parts to catch first name, last name, etc.
        const nameParts = patient.name.split(' ').filter(p => p.length > 2);
        
        // Replace full name first
        const fullNameRegex = new RegExp(`\\b${patient.name}\\b`, 'gi');
        sanitizedText = sanitizedText.replace(fullNameRegex, '[PACIENTE]');

        // Replace parts of the name
        nameParts.forEach(part => {
            const partRegex = new RegExp(`\\b${part}\\b`, 'gi');
            sanitizedText = sanitizedText.replace(partRegex, '[PACIENTE]');
        });
    }

    return sanitizedText;
};
