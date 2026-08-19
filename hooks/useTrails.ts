import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Trail, TrailModule, TrailStep, TrailAssignment, StepContentType } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { getPortalToken } from '@/services/portalAuthService';

// Helper para evitar duplicação e garantir a ordem hierárquica da trilha
const sortTrailHierarchy = (modules: any[]) => {
    return [...(modules || [])]
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((mod: any) => ({
            ...mod,
            steps: [...(mod.steps || [])].sort((a: any, b: any) => a.order_index - b.order_index)
        }));
};

export const useTrails = (patientId?: string, trailType?: 'psychoeducation' | 'practice') => {
    const { currentUser } = useAuth();
 const { addToast } = useToast();

    const [trails, setTrails] = useState<Trail[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTrails = useCallback(async () => {
        if (!currentUser && !patientId) return;
        setLoading(true);
        try {
            // SCENARIO 1: Patient Context (patientId provided)
            // Fetch trails ASSIGNED to this patient
            if (patientId) {
                // Verificação de Magic Link para Bypass de RLS no Portal
                const portalToken = getPortalToken();
                let isMagic = false;
                let magicTokenVersion = 1;
                
                if (portalToken && !currentUser) {
                    if (portalToken.patientId === patientId) isMagic = true;
                    magicTokenVersion = portalToken.version;
                }

                if (isMagic) {
                    const { data, error } = await supabase.rpc('get_portal_trails', {
                        p_patient_id: patientId,
                        p_token_version: magicTokenVersion,
                        p_type: trailType || null
                    });
                    
                    if (error) throw error;
                    setTrails(data || []);
                    return;
                }

                // 1. Get assignments
                const { data: assignments, error: assignError } = await supabase
                    .from('assignments')
                    .select('trail_id, status, current_module_index, due_date, frequency, therapist_instructions')
                    .eq('patient_id', patientId);

                if (assignError) throw assignError;

                if (!assignments || assignments.length === 0) {
                    setTrails([]);
                    return;
                }

                const trailIds = assignments.map(a => a.trail_id);

                // 2. Fetch full trail data for these IDs
                const { data: trailsData, error: trailsError } = await (() => {
                    let query = supabase
                        .from('trails')
                        .select(`
                            *,
                            modules:modules (
                                *,
                                steps:steps (*)
                            )
                        `)
                        .in('id', trailIds);
                    if (trailType) query = query.eq('type', trailType);
                    return query;
                })();

                if (trailsError) throw trailsError;

                // 3. Merge assignment status & Sort
                const merged = (trailsData || []).map((trail: any) => {
                    const assignment = assignments.find(a => a.trail_id === trail.id);
                    return {
                        ...trail,
                        assignment_status: assignment?.status,
                        current_module_index: assignment?.current_module_index,
                        due_date: assignment?.due_date,
                        frequency: assignment?.frequency,
                        therapist_instructions: assignment?.therapist_instructions,
                        modules: sortTrailHierarchy(trail.modules)
                    };
                });

                setTrails(merged);
            }
            // SCENARIO 2: Therapist Context (No patientId)
            // Fetch trails AUTHORED by user OR templates
            else {
                if (!currentUser) return;
                const { data, error } = await (() => {
                    let query = supabase
                        .from('trails')
                        .select(`
                            *,
                            modules:modules (
                                *,
                                steps:steps (*)
                            )
                        `)
                        .or(`author_id.eq.${currentUser.id},is_template.eq.true`)
                        .order('created_at', { ascending: false });
                    if (trailType) query = query.eq('type', trailType);
                    return query;
                })();

                if (error) throw error;

                // Sort
                const sortedTrails = (data || []).map((trail: any) => ({
                    ...trail,
                    modules: sortTrailHierarchy(trail.modules)
                }));

                // Fetch assignment counts for each trail
                const trailIds = sortedTrails.map((t: any) => t.id);
                if (trailIds.length > 0) {
                    const { data: assignmentData } = await supabase
                        .from('assignments')
                        .select('trail_id')
                        .in('trail_id', trailIds);

                    const countMap = new Map<string, number>();
                    (assignmentData || []).forEach((a: any) => {
                        countMap.set(a.trail_id, (countMap.get(a.trail_id) || 0) + 1);
                    });

                    sortedTrails.forEach((trail: any) => {
                        trail.assignment_count = countMap.get(trail.id) || 0;
                    });
                }

                setTrails(sortedTrails);
            }
        } catch (err: unknown) { throw err; } finally { setLoading(false); }
    }, [currentUser, patientId, trailType]);

    useEffect(() => {
        fetchTrails();
    }, [fetchTrails]);

    const createTrail = async (title: string, description: string, type: 'psychoeducation' | 'practice' = 'psychoeducation') => {
        if (!currentUser) return null;
        try {
            const { data, error } = await supabase
                .from('trails')
                .insert([{
                    title,
                    description,
                    author_id: currentUser.id,
                    is_public: false,
                    type
                }])
                .select()
                .single();

            if (error) throw error;
            setTrails(prev => [data, ...prev]);
            addToast(type === 'practice' ? 'Prática criada com sucesso!' : 'Trilha criada com sucesso!', 'success');
            return data;
        } catch (err: unknown) {
            console.error(err);
            addToast('Erro ao criar.', 'error');
            return null;
        }
    };

    const deleteTrail = async (id: string) => {
        try {
            const { error } = await supabase.from('trails').delete().eq('id', id);
            if (error) throw error;
            setTrails(prev => prev.filter(t => t.id !== id));
 addToast('Trilha excluída.', 'success');
            return true;
        } catch (err: unknown) { throw err; }
    };

    const updateTrail = async (id: string, updates: Partial<Trail>) => {
        try {
            const { error } = await supabase.from('trails').update(updates).eq('id', id);
            if (error) throw error;
            setTrails(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
 addToast('Trilha atualizada.', 'success');
            return true;
        } catch (err: unknown) { throw err; }
    };

    const duplicateTrail = async (originalTrailId: string, newTitle?: string) => {
        if (!currentUser) return;
        try {
            // 1. Fetch full original trail data
            const { data: original, error: fetchError } = await supabase
                .from('trails')
                .select(`*, modules:modules(*, steps:steps(*))`)
                .eq('id', originalTrailId)
                .single();

            if (fetchError || !original) throw fetchError || new Error("Trail not found");

            // 2. Create new trail
            const { data: newTrail, error: createError } = await supabase
                .from('trails')
                .insert([{
                    title: newTitle || `${original.title} (Cópia)`,
                    description: original.description,
                    icon_url: original.icon_url,
                    author_id: currentUser.id,
                    is_template: false,
                    is_public: false
                }])
                .select()
                .single();

            if (createError) throw createError;

            // 3. Duplicate Modules & Steps
            const modules = original.modules || [];
            for (const mod of modules) {
                const { data: newModule, error: modError } = await supabase
                    .from('modules')
                    .insert([{
                        trail_id: newTrail.id,
                        title: mod.title,
                        description: mod.description,
                        order_index: mod.order_index
                    }])
                    .select()
                    .single();

                if (modError) throw modError;

                const steps = mod.steps || [];
                const stepsToInsert = steps.map((s: any) => ({
                    module_id: newModule.id,
                    title: s.title,
                    content_type: s.content_type,
                    content_data: s.content_data,
                    order_index: s.order_index
                }));

                if (stepsToInsert.length > 0) {
                    const { error: stepsError } = await supabase.from('steps').insert(stepsToInsert);
                    if (stepsError) throw stepsError;
                }
            }

            fetchTrails();
 addToast('Trilha duplicada com sucesso!', 'success');
            return newTrail;

        } catch (err: unknown) { throw err; }
    };

    // Modules CRUD
    const createModule = async (trailId: string, title: string) => {
        try {
            const { data: existingMods } = await supabase
                .from('modules')
                .select('order_index')
                .eq('trail_id', trailId)
                .order('order_index', { ascending: false })
                .limit(1);
            
            const nextOrder = existingMods && existingMods.length > 0 ? existingMods[0].order_index + 1 : 0;

            const { data, error } = await supabase
                .from('modules')
                .insert([{ trail_id: trailId, title, order_index: nextOrder }])
                .select()
                .single();

            if (error) throw error;
            fetchTrails();
            addToast('Módulo criado com sucesso!', 'success');
            return data;
        } catch (err: unknown) {
            console.error(err);
            addToast('Erro ao criar módulo.', 'error');
            return null;
        }
    };

    const deleteModule = async (moduleId: string) => {
        try {
            const { error } = await supabase.from('modules').delete().eq('id', moduleId);
            if (error) throw error;
            fetchTrails();
            addToast('Módulo excluído.', 'success');
            return true;
        } catch (err: unknown) {
            console.error(err);
            addToast('Erro ao excluir módulo.', 'error');
            return false;
        }
    };

    // Steps CRUD
    const createStep = async (moduleId: string, title: string, type: StepContentType = 'text') => {
        try {
            const { data: existingSteps } = await supabase
                .from('steps')
                .select('order_index')
                .eq('module_id', moduleId)
                .order('order_index', { ascending: false })
                .limit(1);
            
            const nextOrder = existingSteps && existingSteps.length > 0 ? existingSteps[0].order_index + 1 : 0;

            const { data, error } = await supabase
                .from('steps')
                .insert([{
                    module_id: moduleId,
                    title,
                    content_type: type,
                    order_index: nextOrder,
                    content_data: {}
                }])
                .select()
                .single();

            if (error) throw error;
            fetchTrails();
 addToast('Conteúdo adicionado!', 'success');
            return data;
        } catch (err: unknown) {
            console.error(err);
            addToast('Erro ao adicionar conteúdo.', 'error');
            return null;
        }
    };

    const deleteStep = async (stepId: string) => {
        try {
            const { error } = await supabase.from('steps').delete().eq('id', stepId);
            if (error) throw error;
            fetchTrails();
            addToast('Conteúdo excluído.', 'success');
            return true;
        } catch (err: unknown) {
            console.error(err);
            addToast('Erro ao excluir conteúdo.', 'error');
            return false;
        }
    };
    const updateStep = async (stepId: string, updates: any) => {
        try {
            const { error } = await supabase.from('steps').update(updates).eq('id', stepId);
            if (error) throw error;
            fetchTrails();
 addToast('Conteúdo atualizado.', 'success');
            return true;
        } catch (err: unknown) { throw err; }
    };

    // Assign to Patient
    const assignToPatient = async (patientId: string, trailId: string) => {
        try {
            const { error } = await supabase.from('assignments').insert([{
                patient_id: patientId,
                trail_id: trailId,
                status: 'active'
            }]);

            if (error) {
                if (error.code === '23505') { // Unique violation
 addToast('Paciente já possui esta trilha.', 'info');
                    return false;
                }
                throw error;
            }
 addToast('Trilha atribuída com sucesso!', 'success');
            return true;
        } catch (err: unknown) { throw err; }
    };

    const unassignFromPatient = async (patientId: string, trailId: string) => {
        try {
            const { error } = await supabase
                .from('assignments')
                .delete()
                .match({ patient_id: patientId, trail_id: trailId });

            if (error) throw error;

            // Optimistic update if we are in patient context
            if (patientId) {
                setTrails(prev => prev.filter(t => t.id !== trailId));
            }

 addToast('Trilha removida do paciente.', 'success');
            return true;
        } catch (err: unknown) { throw err; }
    };

    // Prescribe Practice — cria trail + module + step + assignment de uma vez
    const prescribePractice = async (options: {
        patientId: string;
        title: string;
        stepType: StepContentType;
        instructions: string;
        dueDate?: string;
        sourceSessionId?: string;
        sourceGoalId?: string;
        contentData?: any;
    }) => {
        if (!currentUser) return null;
        try {
            // 1. Criar trail com type='practice'
            const { data: trail, error: trailError } = await supabase
                .from('trails')
                .insert([{
                    title: options.title,
                    description: options.instructions,
                    author_id: currentUser.id,
                    is_public: false,
                    is_template: false,
                    type: 'practice'
                }])
                .select()
                .single();
            if (trailError) throw trailError;

            // 2. Criar módulo
            const { data: mod, error: modError } = await supabase
                .from('modules')
                .insert([{
                    trail_id: trail.id,
                    title: options.title,
                    order_index: 0
                }])
                .select()
                .single();
            if (modError) throw modError;

            // 3. Criar step com o tipo interativo
            const { error: stepError } = await supabase
                .from('steps')
                .insert([{
                    module_id: mod.id,
                    title: options.title,
                    content_type: options.stepType,
                    content_data: options.contentData || {},
                    order_index: 0
                }]);
            if (stepError) throw stepError;

            // 4. Atribuir ao paciente com metadados de prescrição
            const { error: assignError } = await supabase
                .from('assignments')
                .insert([{
                    patient_id: options.patientId,
                    trail_id: trail.id,
                    status: 'active',
                    frequency: 'weekly',
                    due_date: options.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                    source_session_id: options.sourceSessionId || null,
                    source_goal_id: options.sourceGoalId || null,
                    therapist_instructions: options.instructions
                }]);
            if (assignError) throw assignError;

            addToast('Prática prescrita com sucesso!', 'success');
            return trail;
        } catch (err: unknown) {
            console.error('Error prescribing practice:', err);
            addToast('Erro ao prescrever prática.', 'error');
            return null;
        }
    };

    const getTrailById = useCallback(async (id: string): Promise<Trail | null> => {
        try {
            const { data, error } = await supabase
                .from('trails')
                .select(`
                    *,
                    modules:modules (
                        *,
                        steps:steps (*)
                    )
                `)
                .eq('id', id)
                .single();

            if (error) throw error;

            // Sort modules and steps
            const trail = {
                ...data,
                modules: sortTrailHierarchy(data.modules)
            };

            return trail as Trail;
        } catch (err) {
 console.error('Error fetching trail by ID:', err);
 addToast('Erro ao carregar trilha.', 'error');
            return null;
        }
 }, [addToast]);

    return {
        trails,
        loading,
        createTrail,
        deleteTrail,
        updateTrail,
        createModule,
        deleteModule,
        createStep,
        deleteStep,
        updateStep,
        assignToPatient,
        unassignFromPatient,
        duplicateTrail,
        prescribePractice,
        refresh: fetchTrails,
        getTrailById
    };
};
