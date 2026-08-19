import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Patient, Document } from '../types.ts';
import * as auditLogService from '../services/auditLogger';
import { fileToDataURL, getFileType } from '../utils/formatters.ts';
import { generateUUID } from '../utils/uuid.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useFileStorage } from './useFileStorage.ts';
import { supabase } from '../services/supabaseClient.ts';
import * as cryptoService from '../services/cryptoService.ts';
import { useCrypto } from '../contexts/CryptoContext.tsx';

export const usePatientDocumentOps = (
    // kept for signature compatibility
    modifyPatient: (patientId: string, modifier: (p: Patient) => Patient) => Promise<void>
) => {
    const { currentUser } = useAuth();
    const { masterKey } = useCrypto();
    const { uploadFile } = useFileStorage();
    const queryClient = useQueryClient();

    const addDocument = useCallback(async (patientId: string, docData: Omit<Document, 'id' | 'uploadedAt' | 'url'>, file: File) => {
        if (!masterKey || !currentUser) return;
        
        let url = '';
        let storagePath: string | undefined;

        const uploadResult = await uploadFile(patientId, file);

        if (uploadResult) {
            storagePath = uploadResult.path;
            url = 'storage://' + storagePath;
        } else {
            console.warn("Upload failed, falling back to Base64");
            url = await fileToDataURL(file);
        }

        const newDocument: Document = {
            ...docData,
            id: generateUUID(),
            uploadedAt: new Date().toISOString(),
            url,
            storagePath,
            type: getFileType(file.type)
        };

        const { error } = await supabase.from('patient_documents').upsert({
            id: newDocument.id,
            patient_id: patientId,
            user_id: currentUser.id,
            encrypted_data: cryptoService.encryptData(newDocument, masterKey)
        });

        if (error) {
            console.error("Failed to save document to DB:", error);
            return;
        }

        queryClient.invalidateQueries({ queryKey: ['decoupled_data', patientId] });
        auditLogService.logEvent(currentUser, 'create_document', { patientId, documentId: newDocument.id, documentName: newDocument.name, viaStorage: !!storagePath });
    }, [uploadFile, currentUser, masterKey, queryClient]);

    const deleteDocument = useCallback(async (patientId: string, documentId: string) => {
        if (!currentUser) return;

        const { error } = await supabase.from('patient_documents').delete().eq('id', documentId);
        
        if (error) {
            console.error("Failed to delete document from DB:", error);
            return;
        }

        queryClient.invalidateQueries({ queryKey: ['decoupled_data', patientId] });
        auditLogService.logEvent(currentUser, 'delete_document', { patientId, documentId });
    }, [currentUser, queryClient]);

    return useMemo(() => ({ addDocument, deleteDocument }), [addDocument, deleteDocument]);
};
