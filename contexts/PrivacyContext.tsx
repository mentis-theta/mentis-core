'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

// --- Masking Utilities ---
export function maskCPF(cpf: string): string {
    if (!cpf || cpf.length < 3) return cpf || '';
    // Show only last 2 digits: ***.***.***-21
    const clean = cpf.replace(/\D/g, '');
    if (clean.length >= 2) {
        return `***.***.***-${clean.slice(-2)}`;
    }
    return '***.***.***-**';
}

export function maskPhone(phone: string): string {
    if (!phone || phone.length < 4) return phone || '';
    // Show only last 4 digits: (XX) *****-4321
    const clean = phone.replace(/\D/g, '');
    if (clean.length >= 4) {
        return `(**) *****-${clean.slice(-4)}`;
    }
    return '(**) *****-****';
}

export function maskEmail(email: string): string {
    if (!email || !email.includes('@')) return email || '';
    const [local, domain] = email.split('@');
    if (local.length <= 2) return `**@${domain}`;
    return `${local.charAt(0)}${'*'.repeat(Math.min(local.length - 2, 6))}${local.charAt(local.length - 1)}@${domain}`;
}

export function maskBirthDate(date: string): string {
    if (!date) return '';
    return '**/**/****';
}

// --- Context ---
interface PrivacyContextType {
    isPrivacyMode: boolean;
    togglePrivacyMode: () => void;
    revealedFields: Set<string>;
    revealField: (fieldKey: string) => void;
    hideField: (fieldKey: string) => void;
    isFieldRevealed: (fieldKey: string) => boolean;
    getMaskedValue: (value: string | undefined, type: 'cpf' | 'phone' | 'email' | 'birthDate', fieldKey: string) => string;
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

const STORAGE_KEY = 'mentis:privacy-mode';

export function PrivacyProvider({ children }: { children: ReactNode }) {
    const [isPrivacyMode, setIsPrivacyMode] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored !== null ? stored === 'true' : true; // Default: privacy ON
        }
        return true;
    });

    const [revealedFields, setRevealedFields] = useState<Set<string>>(new Set());

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, String(isPrivacyMode));
        // Reset revealed fields when toggling privacy mode
        if (isPrivacyMode) {
            setRevealedFields(new Set());
        }
    }, [isPrivacyMode]);

    const togglePrivacyMode = useCallback(() => {
        setIsPrivacyMode(prev => !prev);
    }, []);

    const revealField = useCallback((fieldKey: string) => {
        setRevealedFields(prev => {
            const next = new Set(prev);
            next.add(fieldKey);
            return next;
        });
    }, []);

    const hideField = useCallback((fieldKey: string) => {
        setRevealedFields(prev => {
            const next = new Set(prev);
            next.delete(fieldKey);
            return next;
        });
    }, []);

    const isFieldRevealed = useCallback((fieldKey: string) => {
        return revealedFields.has(fieldKey);
    }, [revealedFields]);

    const getMaskedValue = useCallback((
        value: string | undefined,
        type: 'cpf' | 'phone' | 'email' | 'birthDate',
        fieldKey: string
    ): string => {
        if (!value) return '';
        if (!isPrivacyMode || isFieldRevealed(fieldKey)) return value;

        switch (type) {
            case 'cpf': return maskCPF(value);
            case 'phone': return maskPhone(value);
            case 'email': return maskEmail(value);
            case 'birthDate': return maskBirthDate(value);
            default: return value;
        }
    }, [isPrivacyMode, isFieldRevealed]);

    return (
        <PrivacyContext.Provider value={{
            isPrivacyMode,
            togglePrivacyMode,
            revealedFields,
            revealField,
            hideField,
            isFieldRevealed,
            getMaskedValue,
        }}>
            {children}
        </PrivacyContext.Provider>
    );
}

export function usePrivacyMode() {
    const context = useContext(PrivacyContext);
    if (!context) {
        throw new Error('usePrivacyMode must be used within a PrivacyProvider');
    }
    return context;
}
