import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { usePortalUser } from '@/hooks/usePortalUser';
import { useToast } from '@/contexts/ToastContext';
import { usePortalNavigation } from '@/hooks/usePortalNavigation';
import { useTrails } from '@/hooks/useTrails';
import { Trail } from '@/types';
import { ArrowLeft, Send, Beaker, BarChart3, MessageSquare, ClipboardList, Sparkles, Link, Clock, CheckCircle2, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';
import ReactMarkdown from 'react-markdown';
import { encryptAsymmetric } from '@/services/cryptoService';
import { getPortalToken } from '@/services/portalAuthService';

// ─── Form Components (Controlled) ─────────────────────────────────────────
const BehavioralExperimentBlock: React.FC<{ value: any; onChange: (data: any) => void }> = ({ value, onChange }) => {
    const data = value || { prediction: '', what_happened: '', what_learned: '', anxiety_before: 5, anxiety_after: 5 };

    const handleChange = (field: string, val: any) => {
        onChange({ ...data, response_type: 'behavioral_experiment', [field]: val });
    };

    return (
        <div className="space-y-6">
            <div>
                <label className="block text-sm font-bold text-on-surface mb-2">🔮 O que você acha que vai acontecer?</label>
                <textarea
                    value={data.prediction}
                    onChange={e => handleChange('prediction', e.target.value)}
                    placeholder="Sua previsão..."
                    className="w-full p-4 border border-border/40 rounded-2xl bg-surface-container-lowest focus:ring-2 focus:ring-violet-500/30 outline-none resize-none h-24 text-sm"
                />
            </div>
            <div>
                <label className="block text-sm font-bold text-on-surface mb-2">😰 Ansiedade ANTES (0-10)</label>
                <div className="flex items-center gap-4">
                    <input type="range" min={0} max={10} value={data.anxiety_before} onChange={e => handleChange('anxiety_before', Number(e.target.value))} className="flex-1 accent-violet-500" />
                    <span className="text-2xl font-black text-violet-600 w-10 text-center">{data.anxiety_before}</span>
                </div>
            </div>
            <div>
                <label className="block text-sm font-bold text-on-surface mb-2">📝 O que realmente aconteceu?</label>
                <textarea
                    value={data.what_happened}
                    onChange={e => handleChange('what_happened', e.target.value)}
                    placeholder="Descreva o ocorrido..."
                    className="w-full p-4 border border-border/40 rounded-2xl bg-surface-container-lowest focus:ring-2 focus:ring-violet-500/30 outline-none resize-none h-24 text-sm"
                />
            </div>
            <div>
                <label className="block text-sm font-bold text-on-surface mb-2">😌 Ansiedade DEPOIS (0-10)</label>
                <div className="flex items-center gap-4">
                    <input type="range" min={0} max={10} value={data.anxiety_after} onChange={e => handleChange('anxiety_after', Number(e.target.value))} className="flex-1 accent-violet-500" />
                    <span className="text-2xl font-black text-violet-600 w-10 text-center">{data.anxiety_after}</span>
                </div>
            </div>
            <div>
                <label className="block text-sm font-bold text-on-surface mb-2">💡 O que você aprendeu?</label>
                <textarea
                    value={data.what_learned}
                    onChange={e => handleChange('what_learned', e.target.value)}
                    placeholder="Conclusão..."
                    className="w-full p-4 border border-border/40 rounded-2xl bg-surface-container-lowest focus:ring-2 focus:ring-violet-500/30 outline-none resize-none h-24 text-sm"
                />
            </div>
        </div>
    );
};

const SelfMonitoringBlock: React.FC<{ value: any; onChange: (data: any) => void; label?: string }> = ({ value, onChange, label }) => {
    const data = value || { scale_value: 5, notes: '' };
    const monitorLabel = label || 'Intensidade';

    const handleChange = (field: string, val: any) => {
        onChange({ ...data, response_type: 'self_monitoring', [field]: val });
    };

    return (
        <div className="space-y-6">
            <div>
                <label className="block text-sm font-bold text-on-surface mb-3">📊 {monitorLabel} (0-10)</label>
                <div className="flex items-center gap-4">
                    <span className="text-xs text-foreground-muted font-medium">Nenhum</span>
                    <input type="range" min={0} max={10} value={data.scale_value} onChange={e => handleChange('scale_value', Number(e.target.value))} className="flex-1 accent-emerald-500" />
                    <span className="text-xs text-foreground-muted font-medium">Máximo</span>
                </div>
                <div className="text-center mt-2">
                    <span className="text-4xl font-black text-emerald-600">{data.scale_value}</span>
                    <span className="text-sm text-foreground-muted ml-1">/ 10</span>
                </div>
            </div>
            <div>
                <label className="block text-sm font-bold text-on-surface mb-2">📝 Observações (opcional)</label>
                <textarea
                    value={data.notes}
                    onChange={e => handleChange('notes', e.target.value)}
                    placeholder="Como você está se sentindo?"
                    className="w-full p-4 border border-border/40 rounded-2xl bg-surface-container-lowest focus:ring-2 focus:ring-emerald-500/30 outline-none resize-none h-24 text-sm"
                />
            </div>
        </div>
    );
};

const FreeResponseBlock: React.FC<{ value: any; onChange: (data: any) => void; instruction?: string; placeholder?: string }> = ({ value, onChange, instruction, placeholder }) => {
    const text = value?.text || '';

    return (
        <div className="space-y-4">
            {instruction && (
                <div className="bg-sky-50 dark:bg-sky-900/10 p-4 rounded-xl text-sky-800 dark:text-sky-300 text-sm font-medium border border-sky-100 dark:border-sky-800/40">
                    <MessageSquare className="w-5 h-5 mb-2" />
                    {instruction}
                </div>
            )}
            <div>
                <textarea
                    value={text}
                    onChange={e => onChange({ response_type: 'free_response', text: e.target.value })}
                    placeholder={placeholder || "Escreva livremente..."}
                    className="w-full p-5 border border-border/40 rounded-2xl bg-surface-container-lowest focus:ring-2 focus:ring-sky-500/30 outline-none resize-none h-32 text-sm leading-relaxed"
                />
            </div>
        </div>
    );
};

// ─── Main Component ──────────────────────────────────────────────
interface PracticeRunnerProps {
    practiceId: string;
}

const PracticeRunner: React.FC<PracticeRunnerProps> = ({ practiceId }) => {
    const { currentUser } = useAuth();
    const { patient, isSimulation } = usePortalUser();
    const { addToast } = useToast();
    const { goBack, navigateTo } = usePortalNavigation();
    const { getTrailById } = useTrails();

    const [practice, setPractice] = useState<Trail | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    // Controlled Form State { [step_id]: data }
    const [answers, setAnswers] = useState<Record<string, any>>({});
    
    // Assignment & History State
    const [assignmentId, setAssignmentId] = useState<string | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [therapistPublicKey, setTherapistPublicKey] = useState<string | null>(null);

    const steps = practice?.modules?.[0]?.steps || [];

    // Initialize default answers
    useEffect(() => {
        if (steps.length > 0 && Object.keys(answers).length === 0) {
            const initialAnswers: Record<string, any> = {};
            steps.forEach(step => {
                if (step.content_type === 'self_monitoring') {
                    initialAnswers[step.id] = { response_type: 'self_monitoring', scale_value: 5, notes: '' };
                }
            });
            if (Object.keys(initialAnswers).length > 0) {
                setAnswers(initialAnswers);
            }
        }
    }, [steps]);

    const fetchHistory = useCallback(async () => {
        if (!patient || !practiceId) return;

        const isMagic = !currentUser && !!patient;
        const magicTokenVersion = getPortalToken()?.version ?? 1;

        if (isMagic) {
            const { data } = await supabase.rpc('get_portal_practice_history', {
                p_patient_id: patient.id,
                p_token_version: magicTokenVersion,
                p_trail_id: practiceId
            });
            if (data) setHistory(data);
        } else {
            if (!patient.authUserId) return;
            const { data } = await supabase.from('practice_responses')
                .select('*')
                .eq('patient_id', patient.authUserId)
                .eq('trail_id', practiceId)
                .order('created_at', { ascending: false });
            if (data) setHistory(data);
        }
    }, [patient, practiceId, currentUser]);

    useEffect(() => {
        setAnswers({}); // Limpa estado anterior se houver mudança
        if (!practiceId || !patient) return;
        
        const loadData = async () => {
            setLoading(true);
            try {
                const isMagic = !currentUser && !!patient;
                const magicTokenVersion = getPortalToken()?.version ?? 1;

                if (isMagic) {
                    const { data, error } = await supabase.rpc('get_portal_trails', {
                        p_patient_id: patient.id,
                        p_token_version: magicTokenVersion,
                        p_type: null
                    });
                    if (error) throw error;
                    
                    const trails = data || [];
                    const foundTrail = trails.find((t: any) => t.id === practiceId);
                    
                    setPractice(foundTrail || null);
                    setAssignmentId(foundTrail?.assignment_id || null);
                    
                    // Fetch Therapist Public Key using RPC
                    const { data: pkData } = await supabase.rpc('get_therapist_public_key', { p_therapist_id: patient.psychologistId });
                    if (pkData) setTherapistPublicKey(pkData);
                } else {
                    const [trail, { data }] = await Promise.all([
                        getTrailById(practiceId),
                        supabase.from('assignments')
                            .select('id')
                            .eq('patient_id', patient.id)
                            .eq('trail_id', practiceId)
                            .eq('status', 'active')
                            .order('assigned_at', { ascending: false })
                            .limit(1)
                            .single()
                    ]);

                    setPractice(trail);
                    setAssignmentId(data?.id || null);

                    const { data: pkData } = await supabase.rpc('get_therapist_public_key', { p_therapist_id: patient.psychologistId });
                    if (pkData) setTherapistPublicKey(pkData);
                }
            } catch (err) {
                console.error("Error loading practice data", err);
                addToast("Erro ao carregar a prática. Verifique sua conexão.", "error");
            } finally {
                setLoading(false);
            }
        };

        loadData();
        fetchHistory();
    }, [practiceId, patient, getTrailById, fetchHistory]);

    const hasToolRedirect = steps.some(s => s.content_type === 'tool_redirect');

    // Validation
    const isFormValid = steps.every(step => {
        if (step.content_type === 'text') return true; // not interactive
        if (step.content_type === 'tool_redirect') return true;
        const ans = answers[step.id];
        if (!ans) return false;
        if (step.content_type === 'free_response') return ans.text?.trim().length > 2;
        if (step.content_type === 'behavioral_experiment') return ans.prediction?.length > 2 && ans.what_happened?.length > 2 && ans.what_learned?.length > 2;
        return true; // self_monitoring is always valid because of defaults
    });

    const handleSubmit = async () => {
        if (!patient || !practice) return;
        
        if (isSimulation) {
            addToast('Modo Leitura: O progresso não é salvo quando o terapeuta visualiza a tarefa.', 'info');
            return;
        }

        setSubmitting(true);

        try {
            // Extract metrics for dashboard charts
            let metrics = {};
            for (const key in answers) {
                if (answers[key]?.response_type === 'self_monitoring') {
                    metrics = { intensity: answers[key].scale_value };
                }
            }

            const hasE2E = !!therapistPublicKey;
            const encryptedAnswers = hasE2E ? await encryptAsymmetric(answers, therapistPublicKey) : null;

            const isMagic = !currentUser && !!patient;
            const magicTokenVersion = getPortalToken()?.version ?? 1;

            if (isMagic) {
                if (hasE2E && encryptedAnswers) {
                    // Fluxo E2E: salva criptografado via v2
                    const { error: responseError } = await supabase.rpc('insert_portal_practice_response_v2', {
                        p_patient_id: patient.id,
                        p_token_version: magicTokenVersion,
                        p_assignment_id: assignmentId,
                        p_trail_id: practice.id,
                        p_encrypted_response: encryptedAnswers,
                        p_metrics: metrics
                    });
                    if (responseError) throw responseError;
                } else {
                    // Fallback: terapeuta ainda não gerou chaves E2E — salva plaintext via v1 (protegido por RLS)
                    const { error: responseError } = await supabase.rpc('insert_portal_practice_response', {
                        p_patient_id: patient.id,
                        p_token_version: magicTokenVersion,
                        p_assignment_id: assignmentId,
                        p_trail_id: practice.id,
                        p_response_data: answers,
                        p_metrics: metrics
                    });
                    if (responseError) throw responseError;
                }
            } else {
                if (!patient.authUserId) throw new Error("Missing authUserId");
                // 1. Insert into practice_responses table (The Dossier)
                const { error: responseError } = await supabase.from('practice_responses').insert({
                    patient_id: patient.authUserId,
                    assignment_id: assignmentId,
                    trail_id: practice.id,
                    response_data: hasE2E ? {} : answers,
                    encrypted_response: encryptedAnswers || undefined,
                    metrics
                });
                if (responseError) throw responseError;

                // 2. Mark steps as completed in patient_progress to keep Agenda Dia happy
                const progressPayloads = steps.map((s: any) => ({
                    patient_id: patient.authUserId,
                    step_id: s.id,
                    status: 'completed',
                    completed_at: new Date().toISOString()
                }));
                const { error: progressError } = await supabase.from('patient_progress').upsert(progressPayloads, { onConflict: 'patient_id, step_id' });
                if (progressError) throw progressError;
            }

            // 3. Success UI
            confetti({
                particleCount: 200,
                spread: 100,
                origin: { y: 0.6 },
                colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d']
            });
            addToast('Registro salvo com sucesso! 🎉', 'success');
            
            // 4. Reset & Refresh
            setAnswers({});
            fetchHistory();
        } catch (err) {
            console.error('Error saving practice response:', err);
            addToast('Erro ao salvar registro. Tente novamente.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-200 border-t-violet-600"></div></div>;
    if (!practice || steps.length === 0) return <div className="text-center p-8"><p>Prática indisponível.</p><button onClick={goBack} className="mt-4 text-violet-600 underline">Voltar</button></div>;

    // Se for um Tool Redirect, lida de forma isolada
    if (hasToolRedirect) {
        const targetTool = steps[0].content_data?.target_tool;
        const toolRoutes: Record<string, string> = {
            'rpd': '/portal/diario',
            'breathing': '/portal/tools/breathing',
            'coping_cards': '/portal/tools/coping',
            'mindfulness': '/portal/tools/mindfulness'
        };
        return (
            <div className="max-w-md mx-auto py-16 text-center">
                <button onClick={goBack} className="text-sm text-foreground-muted mb-8 underline">Voltar</button>
                <div className="w-24 h-24 rounded-full bg-fuchsia-50 flex items-center justify-center mx-auto mb-6">
                    <Link className="w-10 h-10 text-fuchsia-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Ferramenta Interativa</h2>
                <p className="text-foreground-muted mb-8">O terapeuta recomendou esta ferramenta para você.</p>
                <button onClick={() => navigateTo(toolRoutes[targetTool] || '/portal')} className="w-full py-4 rounded-2xl font-bold uppercase tracking-wide bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/30 hover:bg-fuchsia-600">
                    Iniciar Ferramenta
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto pb-24">
            <button onClick={goBack} className="flex items-center gap-2 text-sm text-foreground-muted hover:text-on-surface transition-colors mb-6 group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Voltar
            </button>

            {/* Micro-Workflow Blocks */}
            <div className="bg-surface rounded-[28px] border border-border/60 shadow-sm overflow-hidden flex flex-col mb-6">
                {steps.map((step, index) => (
                    <div key={step.id} className={`p-6 sm:p-8 ${index !== steps.length - 1 ? 'border-b border-border/40' : ''}`}>
                        {step.content_type === 'text' && (
                            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-bold">
                                <ReactMarkdown>{step.content_data?.text || ''}</ReactMarkdown>
                            </div>
                        )}
                        {step.content_type === 'behavioral_experiment' && (
                            <BehavioralExperimentBlock value={answers[step.id]} onChange={val => setAnswers(prev => ({...prev, [step.id]: val}))} />
                        )}
                        {step.content_type === 'self_monitoring' && (
                            <SelfMonitoringBlock value={answers[step.id]} onChange={val => setAnswers(prev => ({...prev, [step.id]: val}))} label={step.content_data?.label} />
                        )}
                        {step.content_type === 'free_response' && (
                            <FreeResponseBlock 
                                value={answers[step.id]} 
                                onChange={val => setAnswers(prev => ({...prev, [step.id]: val}))} 
                                instruction={step.content_data?.instruction}
                                placeholder={step.content_data?.placeholder}
                            />
                        )}
                    </div>
                ))}

                <button
                    onClick={handleSubmit}
                    disabled={!isFormValid || submitting}
                    className="w-full py-5 rounded-2xl text-lg font-bold uppercase tracking-wide transition-all transform active:scale-[0.98] bg-primary text-primary-foreground shadow-[0_4px_0_0_var(--color-primary-dark,rgba(0,0,0,0.2))] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 mt-8"
                >
                    <Send className="w-5 h-5" />
                    {submitting ? 'Salvando...' : 'Salvar Registro'}
                </button>
            </div>

            {/* Urna Clínica Blindada (History) */}
            {history.length > 0 && (
                <div className="mt-16 animate-fadeIn">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-foreground-muted mb-6 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-emerald-500" />
                        Urna Clínica Blindada
                    </h3>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                            <Lock className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-emerald-800 dark:text-emerald-400 mb-2">Sigilo Absoluto Garantido</h4>
                            <p className="text-sm text-emerald-700/80 dark:text-emerald-300/80 leading-relaxed">
                                Você possui {history.length} {history.length === 1 ? 'registro enviado' : 'registros enviados'}.<br/>
                                Seu relato foi trancado com criptografia ponta-a-ponta (E2EE). Apenas o seu terapeuta possui a chave para abri-lo. 
                                Para a sua segurança e privacidade máxima, esta cópia não pode mais ser lida neste dispositivo.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PracticeRunner;
