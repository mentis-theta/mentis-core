import React, { useState } from 'react';
import { Trail, TrailModule } from '@/types';
import {
    CheckCircleIcon,
    LockClosedIcon,
    StarIcon,
    MoonIcon,
    SunIcon,
    NeuronIcon,
    UserGroupIcon,
    ChatBubbleLeftEllipsisIcon,
    SparklesIcon
} from '@/components/Icons';
import { LessonPlayer } from './LessonPlayer';
import { useToast } from '@/contexts/ToastContext';

interface TrailMapProps {
    trail: Trail;
    progress: Set<string>; // Set de step_ids completados
    onModuleComplete: () => void;
    isSimulation?: boolean;
}

export const TrailMap: React.FC<TrailMapProps> = ({ trail, progress, onModuleComplete, isSimulation = false }) => {
    const modules = trail.modules || [];
    const [playingModule, setPlayingModule] = useState<TrailModule | null>(null);
 const { addToast } = useToast();

    // Determinar status do módulo baseado nos steps completados
    const getModuleStatus = (index: number): 'active' | 'locked' | 'completed' => {
        const module = modules[index];
        const steps = module?.steps || [];

        // Se não tem steps, considerar como ativo (módulo vazio)
        if (steps.length === 0) return index === 0 ? 'active' : 'locked';

        // Verificar se TODOS os steps deste módulo estão no Set de completados
        const allStepsCompleted = steps.every(step => progress.has(step.id));

        if (allStepsCompleted) return 'completed';

        // Se o módulo anterior está completo (ou é o primeiro), este está ativo
        if (index === 0) return 'active';

        const prevModule = modules[index - 1];
        const prevSteps = prevModule?.steps || [];
        const prevAllDone = prevSteps.length > 0 && prevSteps.every(step => progress.has(step.id));

        return prevAllDone ? 'active' : 'locked';
    };

    // Helper to get Icon based on title/keywords
    const getModuleIcon = (title: string, status: string) => {
        if (status === 'completed') return <CheckCircleIcon className="h-10 w-10" />;
        if (status === 'locked') return <LockClosedIcon className="h-8 w-8" />;

        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('sono') || lowerTitle.includes('dormir')) return <MoonIcon className="h-10 w-10" />;
        if (lowerTitle.includes('ansiedade') || lowerTitle.includes('pânico')) return <NeuronIcon className="h-10 w-10" />;
        if (lowerTitle.includes('rotina') || lowerTitle.includes('manhã')) return <SunIcon className="h-10 w-10" />;
        if (lowerTitle.includes('social') || lowerTitle.includes('relação')) return <UserGroupIcon className="h-10 w-10" />;
        if (lowerTitle.includes('pensamento') || lowerTitle.includes('crença')) return <ChatBubbleLeftEllipsisIcon className="h-10 w-10" />;
        if (lowerTitle.includes('autoestima') || lowerTitle.includes('valor')) return <SparklesIcon className="h-10 w-10" />;

        return <StarIcon className="h-10 w-10" />;
    };

    return (
        <div className="relative py-12 px-4 max-w-md mx-auto">
            {/* The Path Line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-2 bg-slate-200 dark:bg-slate-700 -ml-1 z-0 rounded-full" />

            <div className="space-y-16 relative z-10">
                {modules.map((module, index) => {
                    const status = getModuleStatus(index);
                    const isLeft = index % 2 === 0;

                    return (
                        <div
                            key={module.id}
                            className={`flex items-center ${isLeft ? 'justify-start md:justify-end md:pr-12' : 'justify-end md:justify-start md:pl-12'} relative`}
                        >
                            {/* The Node */}
                            <button
                                onClick={() => {
                                    if (status === 'locked') {
 addToast('Complete o módulo anterior para desbloquear este conteúdo.', 'warning');
                                    } else {
                                        setPlayingModule(module);
                                    }
                                }}
                                className={`
                                    w-20 h-20 rounded-full flex items-center justify-center shadow-lg border-4 transition-all transform hover:scale-110 active:scale-95
                                    ${status === 'completed'
                                        ? 'bg-green-500 border-green-600 text-white'
                                        : status === 'active'
                                            ? 'bg-primary border-primary text-white animate-pulse-slow ring-4 ring-primary/20'
                                            : 'bg-slate-200 dark:bg-slate-700 border-border text-foreground-muted  cursor-not-allowed grayscale'}
                                `}
                            >
                                {getModuleIcon(module.title, status)}
                            </button>

                            {/* Label */}
                            <div className={`
                                absolute top-2 w-32 text-center pointer-events-none
                                ${isLeft ? 'left-24 md:left-auto md:right-24' : 'right-24 md:right-auto md:left-24'}
                            `}>
                                <div className=" bg-surface px-3 py-1 rounded shadow-sm border border-border text-xs font-bold text-foreground-muted ">
                                    {module.title}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Celebration Finish Line */}
                <div className="flex justify-center pt-8">
                    <div className="bg-yellow-400 text-yellow-900 px-6 py-2 rounded-full font-bold shadow-lg transform -rotate-2 border-2 border-yellow-500">
                        🏆 Final da Trilha
                    </div>
                </div>
            </div>

            {/* Modal Player */}
            {playingModule && (
                <LessonPlayer
                    module={playingModule}
                    onClose={() => setPlayingModule(null)}
                    onComplete={() => {
                        setPlayingModule(null);
                        onModuleComplete();
                    }}
                    isSimulation={isSimulation}
                />
            )}
        </div>
    );
};
