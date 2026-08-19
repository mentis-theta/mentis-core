import { useState, useCallback } from 'react';
import { supabase } from '@/services/supabaseClient';
import { useToast } from '@/contexts/ToastContext';
import { StorageFile } from '@/types';
import { generateUUID } from '@/utils/uuid';

export const useFileStorage = () => {
    const [uploading, setUploading] = useState(false);
 const { addToast } = useToast();

    // Upload a file to the 'patient-files' bucket
    // Path format: {patientId}/{documentId}/{filename} to avoid collisions and keep organized
    const uploadFile = useCallback(async (patientId: string, file: File, onProgress?: (percent: number) => void): Promise<StorageFile | null> => {
        setUploading(true);
        onProgress?.(10);
        try {
            const documentId = generateUUID();
            const fileExt = file.name.split('.').pop();
            const fileName = `${documentId}.${fileExt}`;
            const filePath = `${patientId}/${fileName}`;

            onProgress?.(60);
            const { data, error } = await supabase.storage
                .from('patient-files')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            onProgress?.(100);

            // Return the file metadata to be saved in the database (e.g. inside Patient.documents)
            return {
                id: documentId,
                path: data.path, // Store this to generate signed URLs later
                name: file.name,
                size: file.size,
                type: file.type,
                uploadedAt: new Date().toISOString()
            };


        } catch (error) {
 console.error('Error uploading file:', error);
 addToast('Erro ao fazer upload do arquivo.', 'error');
            return null;
        } finally {
            setUploading(false);
        }
 }, [addToast]);

    // Generate a Signed URL (valid for 1 hour)
    const getFileUrl = useCallback(async (path: string): Promise<string | null> => {
        try {
            const { data, error } = await supabase.storage
                .from('patient-files')
                .createSignedUrl(path, 3600); // 1 hour

            if (error) throw error;
            return data.signedUrl;
        } catch (error) {
 console.error('Error getting file URL:', error);
            return null;
        }
    }, []);

    // Delete a file
    const deleteFile = useCallback(async (path: string) => {
        try {
            const { error } = await supabase.storage
                .from('patient-files')
                .remove([path]);

            if (error) throw error;
            return true;
        } catch (error) {
 console.error('Error deleting file:', error);
 addToast('Erro ao excluir arquivo do armazenamento.', 'error');
            return false;
        }
 }, [addToast]);

    return {
        uploading,
        uploadFile,
        getFileUrl,
        deleteFile
    };
};
