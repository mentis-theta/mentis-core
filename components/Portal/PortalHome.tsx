import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabaseClient';
import { usePortalUser } from '@/hooks/usePortalUser';
import { useGamification } from '@/hooks/useGamification';
import { useTrails } from '@/hooks/useTrails';
import { usePortalNavigation } from '@/hooks/usePortalNavigation';
import { useTrailProgress } from '@/hooks/useTrailProgress';
import { Trail } from '@/types';
import { clearPortalToken, hasPortalToken } from '@/services/portalAuthService';
import { IslandCard } from './UI/IslandCard';
import { CheckCircleIcon, PencilIcon, BookOpenIcon, SparklesIcon, MapIcon, FireIcon, HeartIcon } from '../Icons';
import { MoodWidget } from './MoodWidget';
import { PracticeWeekSection } from './PracticeWeekSection';
import { PortalMaterialsSection } from './PortalMaterialsSection';
import { TrailMap } from '../Psychoeducation/TrailMap';
import { AlertTriangle } from 'lucide-react';

const PortalHome: React.FC = () => {
    const { logout, currentUser } = useAuth();
    const { patient, loading: patientLoading, error, isSimulation, deviceLimitError } = usePortalUser();
    const { gamification } = useGamification();
    const { trails: assignedTrails } = useTrails(patient?.id, 'psychoeducation');
    const { trails: practices } = useTrails(patient?.id, 'practice');
    const { navigateTo } = usePortalNavigation();
    const { completedStepIds, refreshProgress } = useTrailProgress(patient?.id);
    const [activeTrailId, setActiveTrailId] = useState<string | null>(null);

    // Set default active trail when trails are loaded
    React.useEffect(() => {
        if (assignedTrails.length > 0 && !activeTrailId) {
            setActiveTrailId(assignedTrails[0].id);
        }
    }, [assignedTrails, activeTrailId]);

    const [feedbackCount, setFeedbackCount] = React.useState(0);
    React.useEffect(() => {
        if (!patient) return;

        const fetchFeedbackCount = async () => {
            const { count } = await supabase
                .from('clinical_records')
                .select('*', { count: 'exact', head: true })
                .eq('patient_id', patient.id)
                .not('therapist_feedback', 'is', null);

            if (count) setFeedbackCount(count);
        };
        fetchFeedbackCount();
    }, [patient]);



    if (patientLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-foreground-muted ">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-200 border-t-indigo-600 mb-4"></div>
                <p className="text-sm font-medium">Carregando seu espaço...</p>
            </div>
        );
    }

    if (deviceLimitError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-md mx-auto">
                <div className="bg-surface rounded-[28px] shadow-sm border border-border/60 p-8">
                    <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-5">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <h1 className="text-xl font-bold text-on-surface mb-3">Limite de dispositivos atingido</h1>
                    <p className="text-sm text-foreground-muted mb-6">
                        Seu acesso já está registrado em <strong>3 dispositivos</strong>. Para acessar de um novo dispositivo, solicite ao seu terapeuta que revogue um dos acessos anteriores.
                    </p>
                    <button
                        onClick={() => {
                            clearPortalToken();
                            window.location.reload();
                        }}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-700 underline transition-colors"
                    >
                        Voltar para o início
                    </button>
                </div>
            </div>
        );
    }

    if (error || !patient) {
        const isMagicAccess = !currentUser && hasPortalToken();
        return (
            <div className="text-center p-8 bg-red-50 dark:bg-red-900/20 rounded-[28px] border border-red-200/60 dark:border-red-800 text-red-600 dark:text-red-400">
                <h2 className="text-lg font-semibold mb-2">Acesso não encontrado</h2>
                <p className="mb-4 text-sm text-red-500">
                    {isMagicAccess
                        ? 'Não foi possível carregar seu perfil. Solicite um novo link de acesso ao seu terapeuta.'
                        : 'Não encontramos um perfil de paciente vinculado ao seu email.'}
                </p>
                {isMagicAccess ? (
                    <button
                        onClick={() => {
                            clearPortalToken();
                            window.location.reload();
                        }}
                        className="underline text-sm font-medium"
                    >
                        Voltar para o início
                    </button>
                ) : (
                    <button onClick={logout} className="underline text-sm font-medium">Sair e tentar outro email</button>
                )}
            </div>
        );
    }

    // Dynamic First Name
    const firstName = patient ? patient.name.split(' ')[0] : 'Visitante';

    // Brand Color Logic
    const brandColorName = patient?.psychologist?.colorScheme || 'blue';
    const brandColors: Record<string, string> = {
        blue: '#3b82f6',
        indigo: '#6366f1',
        violet: '#8b5cf6',
        purple: '#a855f7',
        emerald: '#10b981',
        rose: '#f43f5e',
        sky: '#0ea5e9',
        amber: '#f59e0b',
        slate: '#64748b'
    };
    const primaryHex = brandColors[brandColorName] || '#3b82f6';



    return (
        <div className="space-y-10 pb-12">
            {/* Simulation Banner */}
            {isSimulation && (
                <div className="bg-amber-100 border border-amber-300 text-amber-900 p-5 rounded-2xl shadow-sm">
                    <p className="font-semibold text-sm flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Modo Simulação Ativo</p>
                    <p className="text-xs text-amber-800 mt-1 font-medium">Você está visualizando este portal como terapeuta. As ações realizadas aqui <strong>não serão salvas</strong>.</p>
                </div>
            )}

            {/* Welcome Section & Gamification */}
            <div
                className="rounded-[28px] p-7 sm:p-8 text-white shadow-lg relative overflow-hidden transition-all duration-500 hover:shadow-xl"
                style={{ background: `linear-gradient(135deg, ${primaryHex}, #1e293b)` }}
            >
                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold mb-2 tracking-tight">Olá, {firstName}!</h1>
                            <p className="text-white/70 text-base max-w-xl">
                                Bem-vindo ao seu arquipélago pessoal.
                            </p>
                        </div>
                    </div>

                    {/* Level Bar */}
                    {(gamification.currentXP > 0 || assignedTrails.length > 0 || practices.length > 0) && (
                        <div className=" bg-surface/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 max-w-3xl">
                            <div className="flex justify-between items-end mb-2.5">
                                <span className="text-white font-semibold text-base">Nível {gamification.level}</span>
                                <span className="text-white/50 text-xs font-medium uppercase tracking-wider">
                                    {gamification.currentXP} / {gamification.nextLevelXP} XP
                                </span>
                            </div>

                            <div className="w-full h-3 bg-slate-900/30 rounded-full overflow-hidden relative">
                                {/* Progress Fill */}
                                <div
                                    className="h-full bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 relative transition-all duration-1000 ease-out rounded-full"
                                    style={{ width: `${Math.min(100, Math.max(0, gamification.progressPercent))}%` }}
                                >
                                    {/* Shine effect */}
                                    <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent rounded-full"></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Decorative circles — mais suave */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full blur-[120px] opacity-10 bg-surface "></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-60 h-60 rounded-full blur-[120px] opacity-10 bg-surface "></div>
            </div>

            {/* Mood Widget */}
            <div className="animate-[fadeIn_600ms_ease-out_200ms_both]">
                <MoodWidget />
            </div>

            {/* Practices of the Week (Phase 21) */}
            {practices.length > 0 && (
                <PracticeWeekSection
                    practices={practices}
                    completedStepIds={completedStepIds}
                />
            )}

            {/* Library Materials Handshake */}
            <PortalMaterialsSection patientId={patient?.id || ''} />

            {/* MY TRAILS SECTION (TABS) */}
            <section className="animate-[fadeIn_600ms_ease-out_300ms_both]">
                {assignedTrails.length > 0 ? (
                    <>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-semibold text-on-surface flex items-center">
                                <MapIcon className="h-5 w-5 mr-2 text-indigo-500" />
                                Minha Jornada
                            </h2>
                            <span className="text-xs text-foreground-muted font-medium">{assignedTrails.length} trilha(s)</span>
                        </div>

                        {/* Trail Tabs / Cards */}
                        <div className="flex space-x-3 overflow-x-auto pb-3 scrollbar-hide mb-5">
                            {assignedTrails.map(trail => (
                                <button
                                    key={trail.id}
                                    onClick={() => setActiveTrailId(trail.id)}
                                    className={`
                                    flex-shrink-0 w-60 p-4 rounded-2xl border transition-all duration-300 ease-in-out text-left relative overflow-hidden group
                                    ${activeTrailId === trail.id
                                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20 scale-[1.02]'
                                            : ' bg-surface     border-border/60     text-foreground-muted    hover:border-indigo-200 hover:shadow-md'}
                                `}
                                >
                                    <div className="relative z-10">
                                        <h3 className={`font-semibold text-base mb-1 truncate ${activeTrailId === trail.id ? 'text-white' : ' text-on-surface   '}`}>
                                            {trail.title}
                                        </h3>
                                        <p className={`text-xs line-clamp-2 ${activeTrailId === trail.id ? 'text-indigo-100' : ' text-foreground-muted   '}`}>
                                            {trail.description || 'Sem descrição'}
                                        </p>
                                    </div>
                                    {/* Decorative circle for active state */}
                                    {activeTrailId === trail.id && (
                                        <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-surface/10 rounded-full blur-xl"></div>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Active Trail Map */}
                        {activeTrailId && (
                            <div className=" bg-surface rounded-[28px] shadow-sm border border-border/60 overflow-hidden min-h-[400px]">
                                <div className="p-5 border-b border-border/60 flex justify-between items-center">
                                    <span className="font-semibold text-sm text-foreground-muted ">
                                        Mapa da Trilha
                                    </span>
                                </div>
                                <div className=" bg-surface/30 ">
                                    {assignedTrails.map(trail => {
                                        if (trail.id !== activeTrailId) return null;
                                        return (
                                            <TrailMap
                                                key={trail.id}
                                                trail={trail}
                                                progress={completedStepIds}
                                                onModuleComplete={() => refreshProgress()}
                                                isSimulation={!!isSimulation}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-16 bg-surface rounded-[28px] border border-dashed border-border ">
                        <div className="h-14 w-14 rounded-2xl bg-background flex items-center justify-center mx-auto mb-4">
                            <MapIcon className="h-7 w-7 text-slate-300" />
                        </div>
                        <h3 className="text-base font-semibold text-foreground-muted ">Nenhuma trilha atribuída ainda.</h3>
                        <p className="text-sm text-foreground-muted mt-1">Suas atividades aparecerão aqui.</p>
                    </div>
                )}
            </section>

            {/* Quick Actions Grid */}
            <section className="animate-[fadeIn_600ms_ease-out_400ms_both]">
                <h2 className="text-lg font-semibold text-on-surface mb-5 flex items-center">
                    <CheckCircleIcon className="h-5 w-5 mr-2 text-indigo-500" />
                    Minhas Ferramentas Clínicas
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* RPD Card */}
                    <button
                        onClick={() => navigateTo('/portal/diario')}
                        className="flex items-center p-5 bg-surface rounded-[28px] border border-border/60 hover:shadow-md hover:border-indigo-200 transition-all duration-300 group text-left"
                    >
                        <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500 dark:text-indigo-400 mr-4 group-hover:scale-110 transition-transform duration-300">
                            <PencilIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-base text-on-surface group-hover:text-indigo-600 transition-colors duration-300">Diário de Emoções</h3>
                            <p className="text-sm text-foreground-muted mt-0.5">Registre seus pensamentos e sentimentos.</p>
                        </div>
                    </button>

                    {/* Tools Card */}
                    <button
                        onClick={() => navigateTo('/portal/biblioteca')}
                        className="flex items-center p-5 bg-surface rounded-[28px] border border-border/60 hover:shadow-md hover:border-teal-200 transition-all duration-300 group text-left"
                    >
                        <div className="h-12 w-12 rounded-2xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center text-teal-500 dark:text-teal-400 mr-4 group-hover:scale-110 transition-transform duration-300">
                            <BookOpenIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-base text-on-surface group-hover:text-teal-600 transition-colors duration-300">Minhas Ferramentas</h3>
                            <p className="text-sm text-foreground-muted mt-0.5">Acesse materiais e exercícios extras.</p>
                        </div>
                    </button>

                    {/* Breathing Tool Card */}
                    <button
                        onClick={() => navigateTo('/portal/tools/breathing')}
                        className="flex items-center p-5 bg-surface rounded-[28px] border border-border/60 hover:shadow-md hover:border-sky-200 transition-all duration-300 group text-left md:col-span-2"
                    >
                        <div className="h-12 w-12 rounded-2xl bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center text-sky-500 dark:text-sky-400 mr-4 group-hover:scale-110 transition-transform duration-300">
                            <SparklesIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-base text-on-surface group-hover:text-sky-600 transition-colors duration-300">Respirar & Relaxar</h3>
                            <p className="text-sm text-foreground-muted mt-0.5">Exercícios guiados para acalmar a mente.</p>
                        </div>
                    </button>
                    {/* Coping Cards */}
                    <button
                        onClick={() => navigateTo('/portal/tools/coping')}
                        className="flex items-center p-5 bg-surface rounded-[28px] border border-border/60 hover:shadow-md hover:border-orange-200 transition-all duration-300 group text-left"
                    >
                        <div className="h-12 w-12 rounded-2xl bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center text-orange-500 dark:text-orange-400 mr-4 group-hover:scale-110 transition-transform duration-300">
                            <FireIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-base text-on-surface group-hover:text-orange-600 transition-colors duration-300">Cartões de Enfrentamento</h3>
                            <p className="text-sm text-foreground-muted mt-0.5">Mensagens rápidas para crises.</p>
                        </div>
                    </button>

                    {/* Mindfulness Diary */}
                    <button
                        onClick={() => navigateTo('/portal/tools/mindfulness')}
                        className="flex items-center p-5 bg-surface rounded-[28px] border border-border/60 hover:shadow-md hover:border-amber-200 transition-all duration-300 group text-left"
                    >
                        <div className="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-500 dark:text-amber-400 mr-4 group-hover:scale-110 transition-transform duration-300">
                            <HeartIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-base text-on-surface group-hover:text-amber-600 transition-colors duration-300">Mindfulness & Valores</h3>
                            <p className="text-sm text-foreground-muted mt-0.5">Como está o momento presente?</p>
                        </div>
                    </button>

                    {/* Safe Space */}
                    <button
                        onClick={() => navigateTo('/portal/tools/safespace')}
                        className="flex items-center p-5 bg-surface rounded-[28px] border border-border/60 hover:shadow-md hover:border-violet-200 transition-all duration-300 group text-left md:col-span-2"
                    >
                        <div className="h-12 w-12 rounded-2xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center text-violet-500 dark:text-violet-400 mr-4 group-hover:scale-110 transition-transform duration-300">
                            <CheckCircleIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-base text-on-surface group-hover:text-violet-600 transition-colors duration-300">Lugar Seguro (Áudios)</h3>
                            <p className="text-sm text-foreground-muted mt-0.5">Ambiente protegido para descompressão guiada.</p>
                        </div>
                    </button>
                </div>
            </section>
        </div>
    );
};

export default PortalHome;
