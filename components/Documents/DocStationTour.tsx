import React, { useState, useEffect } from 'react';
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/services/supabaseClient';
import { ShieldAlert, X } from 'lucide-react';

const DocStationTour: React.FC = () => {
    const { currentUser } = useAuth();
    const { theme } = useTheme();
    const [run, setRun] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (currentUser && currentUser.has_seen_docstation_guide === false) {
            setIsVisible(true);
        }
    }, [currentUser]);

    const markAsSeen = async () => {
        setIsVisible(false);
        if (!currentUser?.id) return;
        
        try {
            await supabase
                .from('profiles')
                .update({ has_seen_docstation_guide: true })
                .eq('id', currentUser.id);
            // Optmistic local update not strictly needed as isVisible is false
        } catch (error) {
            console.error("Failed to mark docstation guide as seen", error);
        }
    };

    const handleStartTour = () => {
        setRun(true);
    };

    const handleDismiss = () => {
        markAsSeen();
    };

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status } = data;
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

        if (finishedStatuses.includes(status)) {
            setRun(false);
            markAsSeen();
        }
    };

    const steps: Step[] = [
        {
            target: '[data-tour="doc-sidebar"]',
            title: 'Selecione um Modelo',
            content: 'Escolha um modelo formatado segundo as normas do Conselho. Aqui você encontra de Atestados a Laudos Periciais prontos para preenchimento.',
            disableBeacon: true,
        },
        {
            target: '[data-tour="doc-profile"]',
            title: 'Perfil de Saída',
            content: 'O modo Clínico foca em sintomas e emoções. O modo Perícia/INSS foca em funcionalidade, omite questões sensíveis e usa linguagem forense técnica.',
        },
        {
            target: '[data-tour="doc-ai-generate"]',
            title: 'Gerar Base via IA',
            content: 'Ao clicar aqui, a IA puxará as últimas observações do paciente e rascunhará o documento inteiro automaticamente. Você pode revisar e alterar livremente.',
        },
        {
            target: '[data-tour="doc-micro-rag"]',
            title: 'Refinamento por Seção',
            content: 'Em templates estruturados, cada bloco é isolado. Você pode reescrever apenas uma seção, mantendo o restante intocado.',
        },
        {
            target: '[data-tour="doc-forensic"]',
            title: 'Auditar Raciocínio Clínico',
            content: 'O Motor Forense escaneia seu texto em busca de "Saltos Inferenciais" (afirmações não sustentadas por fatos). Isso blinda você contra processos éticos.',
        }
    ];

    if (!currentUser || !isVisible) return null;

    const isDark = theme === 'dark';

    return (
        <>
            {/* Banner Opt-in */}
            {!run && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="bg-indigo-50 border border-indigo-200 shadow-lg rounded-xl p-4 flex gap-4 items-start relative">
                        <button 
                            onClick={handleDismiss}
                            className="absolute top-3 right-3 text-indigo-400 hover:text-indigo-600 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        
                        <div className="bg-indigo-100 p-2 rounded-lg shrink-0 mt-0.5">
                            <ShieldAlert className="w-5 h-5 text-indigo-600" />
                        </div>
                        
                        <div className="flex-1 pr-4">
                            <h4 className="font-semibold text-indigo-900 text-sm mb-1">Nova Ferramenta: Motor Forense e Geração Assistida</h4>
                            <p className="text-indigo-700/80 text-xs leading-relaxed mb-3">
                                O Mentis agora cruza fatos extraídos para evitar riscos em laudos periciais e gera rascunhos automatizados baseados em templates do CFP.
                            </p>
                            <div className="flex gap-3">
                                <button 
                                    onClick={handleStartTour}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-1.5 rounded-md transition-colors"
                                >
                                    Iniciar Tour (1 min)
                                </button>
                                <button 
                                    onClick={handleDismiss}
                                    className="text-indigo-600 hover:text-indigo-800 text-xs font-medium px-2 py-1.5 transition-colors"
                                >
                                    Dispensar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Joyride Tour */}
            <Joyride
                steps={steps}
                run={run}
                continuous
                scrollToFirstStep
                showProgress
                showSkipButton
                callback={handleJoyrideCallback}
                styles={{
                    options: {
                        zIndex: 10000,
                        primaryColor: isDark ? '#6366f1' : '#4f46e5',
                        textColor: isDark ? '#e2e8f0' : '#334155',
                        backgroundColor: isDark ? '#1e293b' : '#ffffff',
                    },
                    tooltipContainer: {
                        textAlign: 'left',
                    },
                    tooltip: {
                        borderRadius: '1rem',
                        boxShadow: isDark 
                            ? '0 25px 50px -12px rgb(0 0 0 / 0.5)' 
                            : '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                        padding: '24px',
                    },
                    buttonNext: {
                        backgroundColor: isDark ? '#6366f1' : '#4f46e5', 
                        color: '#ffffff',
                        borderRadius: '0.5rem',
                        padding: '8px 16px',
                        fontSize: '14px',
                        fontWeight: '600'
                    },
                    buttonBack: {
                        color: isDark ? '#94a3b8' : '#64748b',
                        marginRight: '12px'
                    },
                    buttonSkip: {
                        color: isDark ? '#94a3b8' : '#64748b'
                    }
                }}
                locale={{
                    back: 'Anterior',
                    close: 'Fechar',
                    last: 'Concluir',
                    next: 'Próximo',
                    skip: 'Pular'
                }}
            />
        </>
    );
};

export default DocStationTour;
