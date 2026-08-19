import React, { useState, useEffect } from 'react';
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';

const AppTour: React.FC = () => {
  const { currentUser } = useAuth();
  const { theme } = useTheme();
  const [run, setRun] = useState(false);

  useEffect(() => {
    if (currentUser?.id) {
      const tourKey = `mentis_tour_completed_${currentUser.id}`;
      const hasCompletedTour = localStorage.getItem(tourKey);
      
      if (!hasCompletedTour) {
        // Small delay to ensure DOM is fully rendered before tour starts
        setTimeout(() => setRun(true), 1000);
      }
    }
  }, [currentUser]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      if (currentUser?.id) {
        localStorage.setItem(`mentis_tour_completed_${currentUser.id}`, 'true');
      }
    }
  };

  const steps: Step[] = [
    {
      target: 'body',
      placement: 'center',
      title: 'Bem-vindo ao Mentis',
      content: 'O seu novo Sistema Operacional Clínico. A partir de agora, a burocracia fica nos bastidores para que você possa focar no que realmente importa: a prática clínica e o paciente. Vamos fazer um tour rápido de 1 minuto?',
      disableBeacon: true,
    },
    {
      target: '#tour-agenda',
      title: 'Controle de Sessões',
      content: 'Aqui você gerencia seus horários e acessa rapidamente os prontuários do dia. O sistema salva tudo automaticamente para você não perder o ritmo.',
    },
    {
      target: '#tour-pacientes',
      title: 'Prontuários e Ferramentas',
      content: 'O coração da sua clínica. Acesse a evolução dos pacientes, gere documentos com IA e utilize nossas ferramentas clínicas integradas (Matriz ACT, RPD, Genogramas e protocolos EMDR).',
    },
    {
      target: '#tour-meu-link',
      title: 'Sua Vitrine Digital',
      content: 'Configure a sua página pública de agendamento. É aqui que os pacientes preenchem a anamnese prévia e o termo de consentimento de forma 100% segura.',
    },
    {
      target: 'body', // Centralizado (sem target específico)
      placement: 'center',
      title: 'Tudo pronto!',
      content: 'O Mentis já está configurado. Explore os recursos e eleve o padrão dos seus atendimentos. Qualquer dúvida, acesse os guias em cada ferramenta.',
    },
  ];

  if (!currentUser) return null;

  const isDark = theme === 'dark';

  return (
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
          primaryColor: isDark ? '#38bdf8' : '#0f172a', // Tailwind light: slate-900, dark: sky-400
          textColor: isDark ? '#e2e8f0' : '#334155',    // slate-200 / slate-700
          backgroundColor: isDark ? '#1e293b' : '#ffffff', // slate-800 / white
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        tooltip: {
          borderRadius: '1.5rem', // rounded-3xl approx
          boxShadow: isDark 
            ? '0 25px 50px -12px rgb(0 0 0 / 0.5)' 
            : '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', // shadow-xl
          padding: '24px',
        },
        buttonNext: {
          backgroundColor: isDark ? '#38bdf8' : '#0f172a', 
          color: isDark ? '#0f172a' : '#ffffff',
          borderRadius: '0.75rem', // rounded-xl
          padding: '10px 20px',
          fontWeight: 500,
          fontSize: '0.875rem',
        },
        buttonBack: {
          color: isDark ? '#94a3b8' : '#64748b', // slate-400 / slate-500
          marginRight: '12px',
          fontSize: '0.875rem',
        },
        buttonSkip: {
          color: isDark ? '#64748b' : '#94a3b8', // slate-500 / slate-400
          fontSize: '0.875rem',
        },
      }}
      locale={{
        back: 'Voltar',
        close: 'Fechar',
        last: 'Finalizar',
        next: 'Próximo',
        skip: 'Pular Tour',
      }}
    />
  );
};

export default AppTour;
