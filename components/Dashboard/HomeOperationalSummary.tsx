import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface HomeOperationalSummaryProps {
    activePatients?: number;
    todaysSessions?: number;
    activeReminders?: number;
    scheduledIssues?: number;
    draftSessionsCount?: number;
}

export const HomeOperationalSummary: React.FC<HomeOperationalSummaryProps> = ({
    activePatients = 0,
    todaysSessions = 0,
    activeReminders = 4,
    scheduledIssues = 0,
    draftSessionsCount = 0
}) => {
    const { currentUser } = useAuth();
    const [messageIndex, setMessageIndex] = useState(0);
    const [fade, setFade] = useState(true);

    // Lógica inteligente de saudação baseada no horário e dia da semana
    const getGreeting = () => {
        const hour = new Date().getHours();
        const day = new Date().getDay();

        if (day === 0 || day === 6) return "Bom fim de semana";
        if (hour < 12) return "Bom dia";
        if (hour < 18) return "Boa tarde";
        return "Boa noite";
    };

    const greeting = getGreeting();

    // Pega o primeiro nome do usuário logado (ou usa Capitão como fallback)
    const firstName = currentUser?.name?.split(' ')[0] || 'Capitão';

    // A mensagem operacional padrão com foco na variável clínica correta (Sessões)
    const defaultMessage = (
        <span>
            Você possui <strong className="font-semibold text-on-surface">{activeReminders} lembrete(s) ativo(s)</strong> e <strong className="font-semibold text-on-surface">{todaysSessions} sessão(ões)</strong> agendadas para hoje.
        </span>
    );

    // Array de mensagens que vão rotacionar
    const motivationalMessages = [
        defaultMessage,
        ...(draftSessionsCount > 0 ? [
            <span>Atenção: Você tem <strong className="font-semibold text-amber-600 dark:text-amber-400">{draftSessionsCount} sessão(ões) pendente(s)</strong> (em rascunho) precisando de finalização.</span>
        ] : []),
        <span>Lembre-se: o <strong>autocuidado</strong> é a base fundamental para poder <strong>cuidar bem</strong> dos outros.</span>,
        <span><strong>Pequenos progressos</strong> diários constroem <strong>resultados terapêuticos</strong> gigantescos.</span>,
        <span>A sua <strong>escuta ativa</strong> faz uma diferença <strong>imensurável</strong> na vida dos seus pacientes.</span>,
        <span>Um <strong>ambiente digital organizado</strong> reflete em uma mente clínica mais <strong>clara e focada</strong>.</span>,
        <span>A <strong>empatia</strong> é a ponte mais segura e <strong>forte</strong> entre você e <strong>seus pacientes</strong>.</span>,
        <span><strong>Aproveite</strong> o dia de hoje para transformar <strong>desafios</strong> em <strong>novas oportunidades de crescimento</strong>.</span>
    ];

    useEffect(() => {
        // Intervalo de 35 segundos para trocar a frase
        const interval = setInterval(() => {
            setFade(false);

            setTimeout(() => {
                setMessageIndex((prev) => (prev + 1) % motivationalMessages.length);
                setFade(true);
            }, 500);

        }, 35000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full bg-surface-container-lowest/90 backdrop-blur-md rounded-3xl shadow-sm border border-border/40 p-6 md:p-8 mb-6 flex flex-col gap-1.5">
            {/* Saudação Monocromática e Elegante */}
            <h2 className="text-2xl font-semibold text-on-surface font-sans tracking-tight m-0">
                {greeting}, {firstName}.
            </h2>

            {/* Wrapper com altura mínima para a animação não dar "pulos" no layout do Dashboard */}
            <div className="min-h-[28px] flex items-center">
                <p
                    className={`text-base text-foreground-muted font-sans m-0 transition-opacity duration-500 ease-in-out ${fade ? 'opacity-100' : 'opacity-0'
                        }`}
                >
                    {motivationalMessages[messageIndex]}
                </p>
            </div>
        </div>
    );
};
