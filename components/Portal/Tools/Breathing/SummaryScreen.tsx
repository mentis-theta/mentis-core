import React, { useEffect } from 'react';
import { useGamification } from '@/hooks/useGamification';
import Button from '@/components/Button'; // Fixed import
import { MoodWidget } from '@/components/Portal/MoodWidget';
import { CheckCircleIcon, ArrowLeftIcon } from '@/components/Icons';

interface SummaryScreenProps {
    onClose: () => void;
}

export const SummaryScreen: React.FC<SummaryScreenProps> = ({ onClose }) => {
    const { addXP } = useGamification();

    useEffect(() => {
        // Award XP on mount (once per session finish)
        addXP(15);
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-surface animate-fadeIn p-4 overflow-y-auto">
            <div className="max-w-md w-full text-center space-y-8">

                {/* Success Icon */}
                <div className="mx-auto w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center animate-bounceIn">
                    <CheckCircleIcon className="w-12 h-12 text-green-600 dark:text-green-400" />
                </div>

                <div>
                    <h2 className="text-3xl font-bold text-on-surface mb-2">Sessão Concluída!</h2>
                    <p className=" text-foreground-muted ">Você dedicou um tempo para si mesmo.</p>
                    <div className="inline-block mt-4 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full font-bold text-sm">
                        +15 XP Conquistados
                    </div>
                </div>

                {/* Mood Check-in */}
                <div className=" bg-surface p-6 rounded-2xl shadow-lg border border-border ">
                    <h3 className="text-lg font-semibold mb-4 text-foreground-muted ">Como você se sente agora?</h3>
                    {/* Reuse existing MoodWidget logic/UI but stripped down if possible, or just render it */}
                    <div className="pointer-events-auto">
                        <MoodWidget compact={true} />
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors w-full"
                >
                    Voltar ao Menu
                </button>
            </div>
        </div>
    );
};
