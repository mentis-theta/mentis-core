import { useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { LibraryItem, LibraryCategory } from '../types';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCrypto } from '@/contexts/CryptoContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { encryptData, decryptData } from '../services/cryptoService';
import * as Sentry from '@sentry/react';

export const useLibrary = () => {
 const { addToast } = useToast();
    const { currentUser } = useAuth();
    const { masterKey } = useCrypto();
    const queryClient = useQueryClient();

    const fetchLibraryFn = async (): Promise<LibraryItem[]> => {
        if (!currentUser || !masterKey) return [];
        try {
            let allItems: any[] = [];
            let hasMore = true;
            let start = 0;
            const limit = 1000;

            // 1. Paginação Assíncrona para contornar o limite de 1000 da API do Supabase
            while (hasMore) {
                const { data, error } = await supabase
                    .from('library_items')
                    .select('*')
                    .eq('user_id', currentUser.id)
                    .order('created_at', { ascending: false })
                    .range(start, start + limit - 1);

                if (error) throw error;

                if (data && data.length > 0) {
                    allItems = [...allItems, ...data];
                    start += limit;
                }
                
                if (!data || data.length < limit) {
                    hasMore = false;
                }
            }

            // 2. Descriptografia em Memória (E2EE Shield)
            const decryptedItems: LibraryItem[] = [];
            for (const item of allItems) {
                try {
                    let parsedData: any = {};
                    if (item.encrypted_data && masterKey) {
                        parsedData = decryptData<any>(item.encrypted_data, masterKey);
                    } else {
                        // Fallback para dados legados não criptografados
                        parsedData = {
                            title: item.title,
                            description: item.description,
                            category: item.category,
                            url: item.url,
                            coverUrl: item.cover_url
                        };
                    }

                    decryptedItems.push({
                        id: item.id,
                        userId: item.user_id,
                        title: parsedData.title || 'Material sem Título',
                        description: parsedData.description || '',
                        category: parsedData.category || 'other',
                        url: parsedData.url || '',
                        coverUrl: parsedData.coverUrl || item.cover_url || '',
                        isPublic: item.is_public,
                        createdAt: item.created_at,
                        updatedAt: item.updated_at
                    });
                } catch (decryptionError) {
                    console.error('Falha ao descriptografar item da biblioteca:', item.id, decryptionError);
                    Sentry.captureException(decryptionError, {
                        extra: { libraryItemId: item.id }
                    });
                    
                    // Tratamento de falha individual sem derrubar o array todo
                    decryptedItems.push({
                        id: item.id,
                        userId: item.user_id,
                        title: '⚠️ Erro de Descriptografia',
                        description: 'A chave atual não conseguiu abrir este material.',
                        category: 'other',
                        url: '',
                        coverUrl: '',
                        isPublic: item.is_public,
                        createdAt: item.created_at,
                        updatedAt: item.updated_at
                    });
                }
            }

            return decryptedItems;

        } catch (error) {
            console.error('Error fetching library:', error);
            Sentry.captureException(error);
            throw error;
        }
    };

    const { data: libraryItems = [], isLoading: loading } = useQuery({
        queryKey: ['library_items', currentUser?.id],
        queryFn: fetchLibraryFn,
        enabled: !!currentUser?.id,
        staleTime: 1000 * 60 * 60, // 1 hour
    });

    const createItemMutation = useMutation({
        mutationKey: ['create_library_item', currentUser?.id],
        mutationFn: async (item: {
            title: string;
            description: string;
            category: LibraryCategory;
            url?: string;
            coverUrl?: string;
        }) => {
            if (!currentUser || !masterKey) throw new Error("No user or vault locked");
            
            // Criptografar os metadados antes de inserir no banco
            const payloadToEncrypt = {
                title: item.title,
                description: item.description,
                category: item.category,
                url: item.url,
                coverUrl: item.coverUrl
            };
            const encryptedDataPayload = encryptData(payloadToEncrypt, masterKey);

            const { data, error } = await supabase
                .from('library_items')
                .insert({
                    user_id: currentUser.id,
                    encrypted_data: encryptedDataPayload,
                    cover_url: item.coverUrl, // Mantemos em plain text opcionalmente para thumbs mais rápidos, ou removemos depois. Para V1 é útil para UI rápida.
                    is_public: false
                }).select().single();

            if (error) {
                Sentry.captureException(error);
                throw error;
            }
            return {
                id: data.id,
                userId: data.user_id,
                title: item.title,
                description: item.description,
                category: item.category,
                url: item.url,
                coverUrl: item.coverUrl,
                isPublic: data.is_public,
                createdAt: data.created_at,
                updatedAt: data.updated_at
            } as LibraryItem;
        },
        onMutate: async (newItem) => {
            await queryClient.cancelQueries({ queryKey: ['library_items', currentUser?.id] });
            const previousItems = queryClient.getQueryData<LibraryItem[]>(['library_items', currentUser?.id]);

            // Optimistic Item
            const optimisticItem: LibraryItem = {
                id: `temp-${Date.now()}`,
                userId: currentUser?.id || '',
                title: newItem.title,
                description: newItem.description,
                category: newItem.category,
                url: newItem.url || '',
                coverUrl: newItem.coverUrl || '',
                isPublic: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            queryClient.setQueryData<LibraryItem[]>(['library_items', currentUser?.id], (old) => {
                return old ? [optimisticItem, ...old] : [optimisticItem];
            });

            return { previousItems };
        },
        onError: (err, newItem, context) => {
            if (context?.previousItems) {
                queryClient.setQueryData(['library_items', currentUser?.id], context.previousItems);
            }
 console.error('Error creating library item:', err);
 addToast('Erro ao enviar arquivo. Verifique sua conexão e tente novamente.', 'error');
        },
        onSuccess: () => {
 addToast('Item adicionado à biblioteca!', 'success');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['library_items', currentUser?.id] });
        }
    });

    const deleteItemMutation = useMutation({
        mutationKey: ['delete_library_item', currentUser?.id],
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('library_items')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return id;
        },
        onMutate: async (deletedId) => {
            await queryClient.cancelQueries({ queryKey: ['library_items', currentUser?.id] });
            const previousItems = queryClient.getQueryData<LibraryItem[]>(['library_items', currentUser?.id]);

            queryClient.setQueryData<LibraryItem[]>(['library_items', currentUser?.id], (old) => {
                return old ? old.filter(item => item.id !== deletedId) : [];
            });

            return { previousItems };
        },
        onError: (err, deletedId, context) => {
            if (context?.previousItems) {
                queryClient.setQueryData(['library_items', currentUser?.id], context.previousItems);
            }
 console.error('Error deleting library item:', err);
 addToast('Erro ao remover item.', 'error');
        },
        onSuccess: () => {
 addToast('Item removido.', 'success');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['library_items', currentUser?.id] });
        }
    });

    const updateItemMutation = useMutation({
        mutationKey: ['update_library_item', currentUser?.id],
        mutationFn: async ({ id, updates }: { id: string, updates: Partial<Omit<LibraryItem, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'isPublic'>> }) => {
            if (!currentUser) throw new Error("User not authenticated");
            if (!masterKey) throw new Error("E2E Master Key missing");

            // Fetch the existing item first to merge updates correctly before encrypting
            const { data: existingData, error: fetchError } = await supabase
                .from('library_items')
                .select('encrypted_data')
                .eq('id', id)
                .single();

            if (fetchError) throw fetchError;

            // Decrypt existing
            const existingDecrypted = decryptData<any>(existingData.encrypted_data, masterKey);
            if (!existingDecrypted) throw new Error("Failed to decrypt existing data for update");

            // Merge updates
            const mergedPayload = {
                ...existingDecrypted,
                ...updates
            };

            // Encrypt merged payload
            const newEncryptedData = encryptData(mergedPayload, masterKey);

            // Update in DB
            const { data, error } = await supabase
                .from('library_items')
                .update({ encrypted_data: newEncryptedData, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            
            return {
                id: data.id,
                userId: data.user_id,
                title: mergedPayload.title,
                description: mergedPayload.description,
                category: mergedPayload.category,
                url: mergedPayload.url,
                coverUrl: mergedPayload.coverUrl,
                isPublic: data.is_public,
                createdAt: data.created_at,
                updatedAt: data.updated_at
            } as LibraryItem;
        },
        onSuccess: () => {
            addToast('Item atualizado com sucesso!', 'success');
            queryClient.invalidateQueries({ queryKey: ['library_items', currentUser?.id] });
        },
        onError: (err) => {
            console.error('Error updating library item:', err);
            addToast('Erro ao atualizar item.', 'error');
        }
    });

    return {
        libraryItems,
        createLibraryItem: async (item: any) => await createItemMutation.mutateAsync(item).then(() => true).catch((err) => { throw err; }),
        updateLibraryItem: async (id: string, updates: any) => await updateItemMutation.mutateAsync({ id, updates }).then(() => true).catch((err) => { throw err; }),
        deleteLibraryItem: async (id: string) => await deleteItemMutation.mutateAsync(id).then(() => true).catch((err) => { throw err; }),
        loading
    };
};
