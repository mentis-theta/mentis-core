import { useState, useEffect, useRef } from 'react';
import type { Patient, DocumentTemplate, Document } from '@/types';
import { generateUUID } from '@/utils/uuid';
import { supabase } from '@/services/supabaseClient';
import * as cryptoService from '@/services/cryptoService';
import { useCrypto } from '@/contexts/CryptoContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

interface UseAutoSaveProps {
    selectedTemplate: DocumentTemplate | null;
    selectedPatient: Patient | null;
    editorContent: string;
    structuredContent: Record<string, string>;
    updatePatient: (id: string, updates: Partial<Patient>) => void; // Keep for interface compatibility if needed
}

export function useAutoSave({
    selectedTemplate,
    selectedPatient,
    editorContent,
    structuredContent
}: UseAutoSaveProps) {
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const isFirstRender = useRef(true);
    const { masterKey } = useCrypto();
    const { currentUser } = useAuth();
    const queryClient = useQueryClient();

    useEffect(() => {
        // Ignora a primeira renderização para não salvar o carregamento inicial
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        if (!selectedTemplate || !selectedPatient) {
            setSaveStatus('idle');
            return;
        }

        // Verifica se há algo real para salvar (evita mock vazio)
        const isStructured = Object.keys(structuredContent).length > 0;
        const hasTextContent = editorContent.trim() !== '' && editorContent.trim() !== '<p></p>';
        const hasStructuredContent = Object.values(structuredContent).some(v => v && v.trim() !== '' && v.trim() !== '<p></p>');

        if (!hasTextContent && !isStructured) return;
        if (isStructured && !hasStructuredContent) return;

        setSaveStatus('saving');

        const timeoutId = setTimeout(async () => {
            const decoupledCache = queryClient.getQueryData<any>(['decoupled_data', selectedPatient.id, 'full_audit']);
            const existingDocuments = decoupledCache?.documents || [];

            const newContentDraft = {
                documentType: selectedTemplate,
                description: editorContent,
                sections: structuredContent
            };

            // Procura um draft "puro" já existente (sem URL final, apenas estado temporário)
            const draftIndex = existingDocuments.findIndex((d: Document) =>
                d.contentDraft?.documentType === selectedTemplate && d.url === ''
            );

            let draftDoc: Document;

            if (draftIndex >= 0) {
                // Atualiza o rascunho puro existente
                draftDoc = {
                    ...existingDocuments[draftIndex],
                    contentDraft: newContentDraft,
                    uploadedAt: new Date().toISOString() // refresh da timestamp para subir no order
                };
            } else {
                // Cria um slot de rascunho apenas para manter este progresso na nuvem
                draftDoc = {
                    id: generateUUID(),
                    name: `Rascunho de ${selectedTemplate}`,
                    type: 'report',
                    url: '',
                    uploadedAt: new Date().toISOString(),
                    category: 'generated',
                    contentDraft: newContentDraft
                };
            }

            try {
                // V1.1 E2EE: Persist the draft document locally instead of DB (Phase 3 Requirement)
                const localDraftsKey = `mentis_doc_drafts_${selectedPatient.id}`;
                const existingDraftsJson = localStorage.getItem(localDraftsKey);
                let localDrafts = existingDraftsJson ? JSON.parse(existingDraftsJson) : [];
                
                // Remove old draft of same template if exists
                localDrafts = localDrafts.filter((d: any) => d.contentDraft?.documentType !== selectedTemplate);
                
                // Add new draft
                localDrafts.push(draftDoc);
                localStorage.setItem(localDraftsKey, JSON.stringify(localDrafts));

                setSaveStatus('saved');
            } catch (err) {
                console.error("Erro no Auto-save contínuo:", err);
                setSaveStatus('idle');
            }

        }, 2000); // 2 segundos de debounce

        return () => clearTimeout(timeoutId);

    }, [editorContent, structuredContent, selectedTemplate, selectedPatient?.id, currentUser, masterKey, queryClient]);

    // Limpa a mensagem de "Salvo" após 3 segundos
    useEffect(() => {
        if (saveStatus === 'saved') {
            const timer = setTimeout(() => setSaveStatus('idle'), 3000);
            return () => clearTimeout(timer);
        }
    }, [saveStatus]);

    return { saveStatus };
}
