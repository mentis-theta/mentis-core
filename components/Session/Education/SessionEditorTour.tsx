import React from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { useEditorEducation } from '@/contexts/EditorEducationContext';

export const SessionEditorTour = () => {
    const { showTour, setShowTour, isLearnerMode } = useEditorEducation();

    if (!isLearnerMode) return null;

    const steps: Step[] = [
        {
            target: '.tour-step-transcript',
            content: 'Aqui fica a conversa original da sessão. Use-a como base para gerar fatos e evoluções através do Copilot.',
            placement: 'bottom',
            disableBeacon: true,
        },
        {
            target: '.tour-step-draft',
            content: 'Este é seu espaço de trabalho pessoal. Escreva livremente, a IA também colocará os rascunhos dela aqui.',
            placement: 'bottom',
        },
        {
            target: '.tour-step-evolution',
            content: 'A versão final e imutável que será exibida no Prontuário oficial. Não se preocupe com erros, você dita o momento de publicar.',
            placement: 'bottom',
        },
        {
            target: '.tour-step-publish',
            content: 'Satisfeito com o Rascunho? Clique aqui para atualizar a Evolução Final com uma cópia dele.',
            placement: 'top',
        },
        {
            target: '.tour-step-finalize',
            content: 'Quando terminar todos os ajustes da sessão e não for mais alterar o prontuário, clique em Finalizar para trancar administrativamente o registro.',
            placement: 'top',
        }
    ];

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status } = data;
        if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
            setShowTour(false);
        }
    };

    return (
        <Joyride
            steps={steps}
            run={showTour}
            continuous
            showProgress
            showSkipButton
            callback={handleJoyrideCallback}
            styles={{
                options: {
                    primaryColor: '#2563eb', // blue-600
                    zIndex: 10000,
                },
                tooltip: {
                    borderRadius: '12px',
                },
            }}
            locale={{
                back: 'Voltar',
                close: 'Fechar',
                last: 'Pronto',
                next: 'Avançar',
                skip: 'Pular Tour'
            }}
        />
    );
};
