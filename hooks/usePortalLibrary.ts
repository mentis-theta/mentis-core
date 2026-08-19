
import { useCallback } from 'react';
import { supabase } from '@/services/supabaseClient';
import { LibraryItem, LibraryCategory } from '@/types';
import { usePortalUser } from './usePortalUser';
import { useQuery } from '@tanstack/react-query';

export const usePortalLibrary = () => {
    const { patient } = usePortalUser();
    const psychologistId = patient?.psychologistId;

    const fetchItems = useCallback(async (): Promise<LibraryItem[]> => {
        if (!psychologistId) return [];

        const { data, error } = await supabase
            .from('library_items')
            .select('*')
            .eq('is_public', true)
            .eq('user_id', psychologistId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map(item => ({
            id: item.id,
            userId: item.user_id,
            title: item.title,
            description: item.description,
            category: item.category,
            url: item.url,
            coverUrl: item.cover_url,
            isPublic: item.is_public,
            createdAt: item.created_at,
            updatedAt: item.updated_at
        }));
    }, [psychologistId]);

    const { data: items = [], isLoading: loading, error, refetch } = useQuery({
        queryKey: ['portal_library', psychologistId],
        queryFn: fetchItems,
        enabled: !!psychologistId,
        staleTime: 1000 * 60 * 5, // 5 minutos
    });

    return { items, loading, error: error ? (error as Error).message : null, refresh: refetch };
};

