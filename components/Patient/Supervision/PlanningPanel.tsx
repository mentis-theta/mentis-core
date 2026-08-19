import React, { useState, useEffect, useCallback } from 'react';
import type { Patient, User, CaseFormulation, InterventionRoadmapPhase } from '@/types.ts';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/services/supabaseClient.ts';
import { useToast } from '@/contexts/ToastContext';
import { generateUUID } from '@/utils/uuid.ts';

interface PlanningPanelProps {
    patient: Patient;
    currentUser: User | null;
}

const PlanningPanel: React.FC<PlanningPanelProps> = ({ patient, currentUser }) => {
    const { addToast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    
    // Formulational State
    const [formulation, setFormulation] = useState<CaseFormulation | null>(null);
    const [beliefs, setBeliefs] = useState('');
    const [triggers, setTriggers] = useState('');
    const [schemas, setSchemas] = useState('');

    // Roadmap State
    const [phases, setPhases] = useState<InterventionRoadmapPhase[]>([]);
    // Busca inicial
    const fetchData = useCallback(async () => {
        if (!currentUser?.id || !patient.id) return;
        setIsLoading(true);
        try {
            // Case Formulation
            const { data: formData, error: formError } = await supabase
                .from('case_formulation')
                .select('*')
                .eq('patient_id', patient.id)
                .maybeSingle();

            if (formError && formError.code !== 'PGRST116') throw formError;
            
            if (formData) {
                setFormulation(formData);
                setBeliefs(formData.core_beliefs || '');
                setTriggers(formData.triggers || '');
                setSchemas(formData.schemas || '');
            } else {
                // Se não existir, cria a primeira linha.
                const newForm: CaseFormulation = {
                    id: generateUUID(),
                    patient_id: patient.id,
                    therapist_id: currentUser.id,
                    core_beliefs: '',
                    schemas: '',
                    triggers: ''
                };
                const { error: insertFormError } = await supabase.from('case_formulation').insert(newForm);
                if (insertFormError) throw insertFormError;
                setFormulation(newForm);
            }

            // Intervention Roadmap
            const { data: roadmapData, error: roadError } = await supabase
                .from('intervention_roadmap')
                .select('*')
                .eq('patient_id', patient.id)
                .order('order_index', { ascending: true });

            if (roadError) throw roadError;
            
            setPhases(roadmapData || []);
        } catch (error) {
            console.error("Erro ao carregar planejamento:", error);
            addToast("Erro ao carregar dados do planejamento.", "error");
        } finally {
            setIsLoading(false);
        }
    }, [currentUser?.id, patient.id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Save Formulation (Debounce simples no onBlur para o MVP)
    const saveFormulation = async (field: 'core_beliefs' | 'triggers' | 'schemas', value: string) => {
        if (!formulation) return;
        try {
            const { error } = await supabase
                .from('case_formulation')
                .update({ [field]: value, updated_at: new Date().toISOString() })
                .eq('id', formulation.id);
            if (error) throw error;
        } catch (error) {
            console.error(`Erro ao salvar ${field}:`, error);
        }
    };

    // Roadmap Actions
    const handleAddPhase = async () => {
        if (!currentUser) return;
        const newPhase: InterventionRoadmapPhase = {
            id: generateUUID(),
            patient_id: patient.id,
            therapist_id: currentUser.id,
            phase_name: 'Nova Fase',
            status: 'pending',
            order_index: phases.length
        };

        setPhases([...phases, newPhase]); // Optimistic

        const { error } = await supabase.from('intervention_roadmap').insert(newPhase);
        if (error) {
            console.error("Erro ao adicionar fase:", error);
            addToast("Erro ao adicionar fase.", "error");
            fetchData(); // Revert
        }
    };

    const handleDeletePhase = async (phaseId: string) => {
        setPhases(phases.filter(p => p.id !== phaseId)); // Optimistic
        const { error } = await supabase.from('intervention_roadmap').delete().eq('id', phaseId);
        if (error) {
            console.error("Erro ao deletar fase:", error);
            addToast("Erro ao excluir fase.", "error");
            fetchData();
        }
    };

    const updatePhase = async (phaseId: string, updates: Partial<InterventionRoadmapPhase>) => {
        setPhases(phases.map(p => p.id === phaseId ? { ...p, ...updates } : p)); // Optimistic
        const { error } = await supabase.from('intervention_roadmap').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', phaseId);
        if (error) {
            console.error("Erro ao atualizar fase:", error);
            fetchData();
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
            
            {/* Coluna Esquerda: Formulação e Notas (col-span-5) */}
            <div className="lg:col-span-5 space-y-6">
                
                {/* Formulação (Expandido para preencher o espaço) */}
                <div className="bg-surface-container-lowest border border-border/40 rounded-3xl p-6 shadow-sm flex flex-col h-full">
                    <h3 className="text-lg font-black text-foreground uppercase tracking-tight mb-4">Fundações Clínicas</h3>
                    
                    {isLoading ? (
                        <div className="flex-1 flex justify-center items-center">
                            <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </div>
                    ) : (
                        <div className="space-y-4 flex-1 flex flex-col">
                            <div className="flex-1 flex flex-col">
                                <label className="block text-xs font-bold text-foreground-muted uppercase mb-1">Crenças Centrais</label>
                                <textarea 
                                    value={beliefs}
                                    onChange={(e) => setBeliefs(e.target.value)}
                                    onBlur={(e) => saveFormulation('core_beliefs', e.target.value)}
                                    className="w-full flex-1 min-h-[100px] bg-surface-container-low border border-border/60 rounded-xl p-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                                    placeholder="Descreva as crenças nucleares do paciente..."
                                />
                            </div>
                            <div className="flex-1 flex flex-col">
                                <label className="block text-xs font-bold text-foreground-muted uppercase mb-1">Esquemas (Opcional)</label>
                                <textarea 
                                    value={schemas}
                                    onChange={(e) => setSchemas(e.target.value)}
                                    onBlur={(e) => saveFormulation('schemas', e.target.value)}
                                    className="w-full flex-1 min-h-[100px] bg-surface-container-low border border-border/60 rounded-xl p-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                                    placeholder="Esquemas de Young, modos, etc..."
                                />
                            </div>
                            <div className="flex-1 flex flex-col">
                                <label className="block text-xs font-bold text-foreground-muted uppercase mb-1">Gatilhos Recorrentes</label>
                                <textarea 
                                    value={triggers}
                                    onChange={(e) => setTriggers(e.target.value)}
                                    onBlur={(e) => saveFormulation('triggers', e.target.value)}
                                    className="w-full flex-1 min-h-[100px] bg-surface-container-low border border-border/60 rounded-xl p-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                                    placeholder="Quais situações ativam as crenças?"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Coluna Direita: Roadmap Vertical (col-span-7) */}
            <div className="lg:col-span-7">
                <div className="bg-surface-container-lowest border border-border/40 rounded-3xl p-6 shadow-sm h-full">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-black text-foreground uppercase tracking-tight">Roadmap de Intervenções</h3>
                        <button 
                            onClick={handleAddPhase}
                            className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-3">
                        {phases.map((phase) => (
                            <div 
                                key={phase.id}
                                className={`flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-default hover:shadow-md ${
                                    phase.status === 'completed' 
                                        ? 'bg-surface-container-low border-border/40 opacity-70' 
                                        : phase.status === 'in_progress'
                                            ? 'bg-surface border-primary/30 shadow-sm ring-1 ring-primary/20'
                                            : 'bg-surface border-border/60 hover:border-primary/40'
                                }`}
                            >
                                <GripVertical className="w-5 h-5 text-foreground-muted opacity-50 flex-shrink-0 cursor-grab active:cursor-grabbing" />
                                
                                <div className="flex-1">
                                    <input 
                                        type="text"
                                        value={phase.phase_name}
                                        onChange={(e) => updatePhase(phase.id, { phase_name: e.target.value })}
                                        className={`w-full bg-transparent border-none focus:ring-0 p-0 text-sm font-bold focus:outline-none ${phase.status === 'completed' ? 'line-through text-foreground-muted' : 'text-on-surface'}`}
                                        placeholder="Nome da fase..."
                                    />
                                </div>

                                <div className="flex-shrink-0 flex items-center gap-2">
                                    <select 
                                        value={phase.status}
                                        onChange={(e) => updatePhase(phase.id, { status: e.target.value as any })}
                                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider cursor-pointer border-none focus:ring-0 appearance-none text-center ${
                                            phase.status === 'completed'
                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                : phase.status === 'in_progress'
                                                    ? 'bg-primary/10 text-primary'
                                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                        }`}
                                    >
                                        <option value="pending">A Fazer</option>
                                        <option value="in_progress">Fazendo</option>
                                        <option value="completed">Feito</option>
                                    </select>
                                    <button onClick={() => handleDeletePhase(phase.id)} className="p-1 text-foreground-muted hover:text-red-500 transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 p-4 rounded-xl border border-dashed border-border/60 text-center">
                        <p className="text-sm text-foreground-muted">
                            Arraste os blocos para reorganizar a jornada clínica do paciente.
                        </p>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default PlanningPanel;
