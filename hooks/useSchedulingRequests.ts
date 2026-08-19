import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSchedulingRequests, updateSchedulingRequestStatus } from '@/services/bookingService';
import { SchedulingRequest } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export const REQUESTS_QUERY_KEY = 'schedulingRequests';

export const useSchedulingRequests = () => {
    const { currentUser } = useAuth();
    const queryClient = useQueryClient();

    // Query para buscar todas as solicitações do usuário
    const {
        data: requests = [],
        isLoading,
        isError,
        refetch
    } = useQuery({
        queryKey: [REQUESTS_QUERY_KEY, currentUser?.id],
        queryFn: () => getSchedulingRequests(currentUser!.id),
        enabled: !!currentUser?.id,
        refetchInterval: 60000,
    });

    const { pendingRequests, pendingCount } = useMemo(() => {
        const pending = requests.filter(r => r.status === 'pending');
        return {
            pendingRequests: pending,
            pendingCount: pending.length
        };
    }, [requests]);

    // Mutation Otimista para Aprovar/Recusar Solicitações
    const mutation = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: 'approved' | 'rejected' }) => {
            return await updateSchedulingRequestStatus(id, status);
        },
        onMutate: async ({ id, status }) => {
            // Cancela os refetches da query enquanto rodamos a mutação (Impede state tearing)
            await queryClient.cancelQueries({ queryKey: [REQUESTS_QUERY_KEY, currentUser?.id] });

            // Guarda o estado atual limpo como backup
            const previousRequests = queryClient.getQueryData<SchedulingRequest[]>([REQUESTS_QUERY_KEY, currentUser?.id]);

            // Atualiza de forma "Otimista" a UI sumindo com o item ou trocando o status
            if (previousRequests) {
                queryClient.setQueryData<SchedulingRequest[]>(
                    [REQUESTS_QUERY_KEY, currentUser?.id],
                    old => old?.map(req => req.id === id ? { ...req, status } : req)
                );
            }

            // Retorna o contexto em caso de falha (Rollback)
            return { previousRequests };
        },
        // Se a request falhar, desfaz a alteração Otimista
        onError: (err, newTodo, context) => {
            if (context?.previousRequests) {
                queryClient.setQueryData([REQUESTS_QUERY_KEY, currentUser?.id], context.previousRequests);
            }
        },
        // Em caso de sucesso ou erro (Settle), refaz a fetch real p/ garantir sink do backend
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: [REQUESTS_QUERY_KEY, currentUser?.id] });
        },
    });

    return useMemo(() => ({
        requests,
        pendingRequests,
        pendingCount,
        isLoading,
        isError,
        refetch,
        updateStatus: mutation.mutate,
        rejectRequest: (id: string) => mutation.mutateAsync({ id, status: 'rejected' }),
        isUpdating: mutation.isPending
    }), [requests, pendingRequests, pendingCount, isLoading, isError, refetch, mutation.mutate, mutation.isPending]);
};
