import { useState, useCallback, useEffect } from 'react';
import type { Folder } from '../types.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import { supabase } from '../services/supabaseClient.ts';
import { generateUUID } from '../utils/uuid.ts';

export const useFolderOperations = () => {
    const { currentUser } = useAuth();
    const [folders, setFolders] = useState<Folder[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch folders from Supabase user_metadata
    const fetchFolders = useCallback(async () => {
        if (!currentUser) {
            setFolders([]);
            setLoading(false);
            return;
        }

        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error) throw error;

            const metadata = user?.user_metadata || {};
            const savedFolders = metadata.folders || [];

            // Validate structure
            if (Array.isArray(savedFolders)) {
                setFolders(savedFolders as Folder[]);
            }
        } catch (err) {
 console.error("Error fetching folders:", err);
        } finally {
            setLoading(false);
        }
    }, [currentUser]);

    useEffect(() => {
        fetchFolders();
    }, [fetchFolders]);

    const saveFoldersToMetadata = async (newFolders: Folder[]) => {
        // Optimistic update
        setFolders(newFolders);

        try {
            const { data, error } = await supabase.auth.updateUser({
                data: { folders: newFolders }
            });
            if (error) throw error;

            // Confirm update with server response
            if (data?.user?.user_metadata?.folders) {
                setFolders(data.user.user_metadata.folders as Folder[]);
            }
        } catch (err) {
 console.error("Error saving folders:", err);
            // In a real app, handle revert here
        }
    };

    const addFolder = async (name: string, color: string) => {
        const newFolder: Folder = {
            id: generateUUID(),
            name,
            color
        };
        const updatedList = [...folders, newFolder];
        await saveFoldersToMetadata(updatedList);
        return newFolder;
    };

    const updateFolder = async (id: string, updates: Partial<Folder>) => {
        const updatedList = folders.map(f => f.id === id ? { ...f, ...updates } : f);
        await saveFoldersToMetadata(updatedList);
    };

    const deleteFolder = async (id: string) => {
        const updatedList = folders.filter(f => f.id !== id);
        await saveFoldersToMetadata(updatedList);
    };

    return {
        folders,
        loading,
        addFolder,
        updateFolder,
        deleteFolder,
        refreshFolders: fetchFolders
    };
};
