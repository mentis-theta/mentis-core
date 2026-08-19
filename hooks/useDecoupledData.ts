import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCrypto } from '../contexts/CryptoContext';
import { hydratePatientData, HydrationDepth, HYDRATION_LIMITS, HydratedData } from '../services/patientHydrationService';

export const useDecoupledData = (patientId: string | undefined, depth: HydrationDepth = 'summary') => {
    const { masterKey } = useCrypto();
    const queryClient = useQueryClient();

    const fetchDecoupledData = async (): Promise<HydratedData> => {
        if (!patientId || !masterKey) return { sessions: [], goals: [], documents: [] };
        const hydrated = await hydratePatientData(patientId, masterKey, depth);

        // --- Backwards Compatibility: Merge legacy data from Patient object ---
        const patientsCache = queryClient.getQueryData<any[]>(['patients']);
        const patient = patientsCache?.find((p: any) => p.id === patientId);

        if (patient) {
            // Merge sessions
            if (patient.sessions && patient.sessions.length > 0) {
                const newSessionIds = new Set(hydrated.sessions.map(s => s.id));
                const legacySessions = patient.sessions.filter((s: any) => !newSessionIds.has(s.id));
                hydrated.sessions = [...hydrated.sessions, ...legacySessions].sort((a, b) => 
                    new Date(a.date).getTime() - new Date(b.date).getTime()
                );
            }

            // Merge documents
            if (patient.documents && patient.documents.length > 0) {
                const newDocIds = new Set(hydrated.documents.map(d => d.id));
                const legacyDocs = patient.documents.filter((d: any) => !newDocIds.has(d.id));
                hydrated.documents = [...hydrated.documents, ...legacyDocs].sort((a, b) => 
                    new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
                );
            }

            // Merge goals
            if (patient.goals && patient.goals.length > 0) {
                const newGoalIds = new Set(hydrated.goals.map(g => g.id));
                const legacyGoals = patient.goals.filter((g: any) => !newGoalIds.has(g.id));
                hydrated.goals = [...hydrated.goals, ...legacyGoals].sort((a, b) => 
                    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                );
            }
        }

        return hydrated;
    };

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['decoupled_data', patientId, depth],
        queryFn: fetchDecoupledData,
        enabled: !!patientId && !!masterKey,
        staleTime: 1000 * 60 * 5, // 5 minutes cache
        gcTime: 1000 * 60 * 10, // 10 minutes garbage collection
        placeholderData: (previousData) => {
            if (previousData) return previousData;
            if (!patientId) return undefined;
            
            if (depth === 'full_audit') {
                 const clinicalCache = queryClient.getQueryData<HydratedData>(['decoupled_data', patientId, 'clinical_evolution']);
                 if (clinicalCache) return clinicalCache;
                 
                 const summaryCache = queryClient.getQueryData<HydratedData>(['decoupled_data', patientId, 'summary']);
                 if (summaryCache) return summaryCache;
            } else {
                const fullCache = queryClient.getQueryData<HydratedData>(['decoupled_data', patientId, 'full_audit']);
                if (fullCache) {
                    const limit = HYDRATION_LIMITS[depth];
                    return {
                        sessions: fullCache.sessions.slice(-limit),
                        goals: fullCache.goals.slice(-limit),
                        documents: fullCache.documents.slice(-limit)
                    };
                }
                
                if (depth === 'summary') {
                    const clinicalCache = queryClient.getQueryData<HydratedData>(['decoupled_data', patientId, 'clinical_evolution']);
                    if (clinicalCache) {
                        const limit = HYDRATION_LIMITS[depth];
                        return {
                            sessions: clinicalCache.sessions.slice(-limit),
                            goals: clinicalCache.goals.slice(-limit),
                            documents: clinicalCache.documents.slice(-limit)
                        };
                    }
                }
            }
            return undefined;
        }
    });

    return {
        data: data || { sessions: [], goals: [], documents: [] },
        isLoading,
        error,
        refetch
    };
};
