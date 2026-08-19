import React, { useState } from 'react';
import { BreathingMenu } from './BreathingMenu';
import { BreathingPlayer } from './BreathingPlayer';
import { SummaryScreen } from './SummaryScreen';
import { useCrisisRegulation } from '@/hooks/usePortalTools';
import { usePortalUser } from '@/hooks/usePortalUser';
import { useAuth } from '@/contexts/AuthContext';

export type BreathingPattern = {
    id: string;
    label: string;
    inhale: number;
    hold: number;
    exhale: number;
    holdEmpty: number;
    icon?: React.ReactNode;
    description: string;
};

export const BreathingTool: React.FC = () => {
    const [mode, setMode] = useState<'menu' | 'playing' | 'summary'>('menu');
    const [selectedPattern, setSelectedPattern] = useState<BreathingPattern | null>(null);
    
    const { logCrisisRegulation } = useCrisisRegulation();
    const { patient } = usePortalUser();
    const { currentUser } = useAuth();

    const handleSelectPattern = (pattern: BreathingPattern) => {
        setSelectedPattern(pattern);
        setMode('playing');
    };

    const handleFinishSession = () => {
        setMode('summary');
        
        // Log telemetry
        if (patient) {
            const authorId = currentUser?.id || patient.id;
            logCrisisRegulation(
                patient.id,
                authorId,
                'breathing',
                `Padrão: ${selectedPattern?.label || 'Personalizado'}`
            );
        }
    };

    const handleReturnToMenu = () => {
        setMode('menu');
        setSelectedPattern(null);
    };

    return (
        <div className="min-h-screen bg-surface animate-[fadeIn_500ms_ease-out]">
            {mode === 'menu' && (
                <div className="animate-[fadeIn_400ms_ease-out]">
                    <BreathingMenu onSelect={handleSelectPattern} />
                </div>
            )}

            {mode === 'playing' && selectedPattern && (
                <BreathingPlayer
                    pattern={selectedPattern}
                    onFinish={handleFinishSession}
                />
            )}

            {mode === 'summary' && (
                <div className="animate-[fadeIn_500ms_ease-out]">
                    <SummaryScreen onClose={handleReturnToMenu} />
                </div>
            )}
        </div>
    );
};
