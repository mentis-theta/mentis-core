import React, { useState, useEffect } from 'react';
import {
    XMarkIcon,
    CheckCircleIcon
} from '@/components/Icons'; // Using local icons
import { TrailModule } from '@/types';
import { supabase } from '@/services/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import ReactMarkdown from 'react-markdown';
import confetti from 'canvas-confetti';

interface LessonPlayerProps {
    module: TrailModule; // Keeping original prop signature
    onClose: () => void;
    onComplete: () => void;
    isSimulation?: boolean;
}

// Helper to convert YT links to Embed
const getEmbedUrl = (url: string) => {
    if (!url) return '';
    // If already embed, return
    if (url.includes('youtube.com/embed/')) return url;

    // Extract ID from common links(youtube.com/watch?v=XYZ or youtu.be/XYZ)
    const videoIdMatch = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([^&]+)/);
    if (videoIdMatch && videoIdMatch[1]) {
        return `https://www.youtube.com/embed/${videoIdMatch[1]}`;
    }
    return url; // Fallback
};

export const LessonPlayer: React.FC<LessonPlayerProps> = ({ module, onClose, onComplete, isSimulation = false }) => {
    const { currentUser } = useAuth();
 const { addToast } = useToast();
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [reflectionAnswer, setReflectionAnswer] = useState('');
    const [checklistState, setChecklistState] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(false);

    const steps = module.steps || [];
    const currentStep = steps[currentStepIndex];
    const progress = ((currentStepIndex + 1) / steps.length) * 100;
    const isLastStep = currentStepIndex === steps.length - 1;

    // Reset states on step change
    useEffect(() => {
        setReflectionAnswer('');
    }, [currentStepIndex]);

    const handleNext = async () => {
        if (!currentUser) return;
        setLoading(true);

        try {
            // 1. Save Progress (IF NOT SIMULATION)
            if (isSimulation) {
 if (isLastStep) addToast('Modo Simulação: Módulo concluído visualmente.', 'info');
            } else {
                // Real Save Logic
                const { error } = await supabase.from('patient_progress').upsert({
                    patient_id: currentUser.id,
                    step_id: currentStep.id,
                    status: 'completed',
                    response_data: currentStep.content_type === 'reflection' ? { answer: reflectionAnswer } :
                        currentStep.content_type === 'checklist' ? { checked: checklistState } : null,
                    completed_at: new Date().toISOString()
                }, { onConflict: 'patient_id, step_id' });

                if (error) throw error;
            }

            // 2. Advance or Finish
            if (isLastStep) {
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff']
                });
 addToast('Módulo concluído! ', 'success');
                onComplete();
            } else {
                setCurrentStepIndex(prev => prev + 1);
            }

        } catch (error) {
 console.error('Erro ao salvar progresso:', error);
 addToast('Erro ao salvar progresso. Tente novamente.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Content Renderers
    const renderContent = () => {
        const data = currentStep.content_data || {};

        switch (currentStep.content_type) {
            case 'text':
                return (
                    <div className="prose prose-lg max-w-none text-gray-700 dark:text-gray-300 leading-relaxed dark:prose-invert">
                        <ReactMarkdown>{data.text || ''}</ReactMarkdown>
                    </div>
                );

            case 'video':
                return (
                    <div className="flex flex-col items-center">
                        <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-lg mb-4">
                            <iframe
                                width="100%"
                                height="100%"
                                src={getEmbedUrl(data.url)}
                                title="Video player"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                        </div>
                        <p className=" text-foreground-muted text-center italic">{data.description}</p>
                    </div>
                );

            case 'reflection':
                // Ensure question is a string
                const questionText = typeof data.question === 'string' ? data.question : JSON.stringify(data.question || '');
                return (
                    <div className="flex flex-col gap-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border border-blue-100 dark:border-blue-800">
                            <h3 className="text-xl font-medium text-blue-900 dark:text-blue-100 mb-2">Reflexão Guiada</h3>
                            <p className="text-blue-800 dark:text-blue-200 text-lg">{questionText}</p>
                        </div>
                        <textarea
                            className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[150px] text-lg bg-surface "
                            placeholder={data.placeholder || "Escreva sua reflexão aqui..."}
                            value={reflectionAnswer}
                            onChange={(e) => setReflectionAnswer(e.target.value)}
                        />
                    </div>
                );

            case 'checklist':
                const items = data.items || [];
                return (
                    <div className="flex flex-col gap-3">
                        <h3 className="text-lg font-medium text-on-surface dark:text-gray-200 mb-2">Marque o que você já fez:</h3>
                        {items.map((item: any, idx: number) => {
                            // Handle both object format {id, text} and string format
                            const itemText = typeof item === 'string' ? item : (item.text || item.label || '');
                            return (
                                <label key={idx} className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        className="w-6 h-6 text-blue-600 rounded focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                                        checked={!!checklistState[idx]}
                                        onChange={(e) => setChecklistState(prev => ({ ...prev, [idx]: e.target.checked }))}
                                    />
                                    <span className={`text-lg ${checklistState[idx] ? ' text-foreground-muted  line-through' : 'text-gray-700 dark:text-gray-300'}`}>
                                        {itemText}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                );

            default:
                return <p className="text-red-500">Tipo de conteúdo desconhecido: {currentStep.content_type}</p>;
        }
    };

    const isNextDisabled = () => {
        if (currentStep.content_type === 'reflection' && reflectionAnswer.trim().length < 3) return true;
        return false;
    };

    if (!currentStep) return null;

    return (
        // FIX: fixed inset-0 guarantees full screen. z-50 puts it on top.  bg-surface  guarantees full opacity.
        <div className="fixed inset-0 z-50 bg-surface flex flex-col animate-fadeIn">

            {/* 1. Header (Fixed at top) */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-surface shadow-sm">
                <button
                    onClick={onClose}
                    className="p-2 -ml-2 text-foreground-muted hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                    <XMarkIcon className="w-8 h-8" />
                </button>

                {/* Centered Progress Bar */}
                <div className="flex-1 max-w-md mx-6">
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-green-500 transition-all duration-500 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                <div className="w-8" /> {/* Spacer to center the bar */}
            </div>

            {/* 2. Simulation Banner (If active) */}
            {isSimulation && (
                <div className="bg-amber-100 text-amber-800 text-xs font-bold text-center py-1 uppercase tracking-wider border-b border-amber-200">
                    Modo Simulação: Progresso não será salvo
                </div>
            )}

            {/* 3. Main Content (Scrollable) */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-2xl mx-auto px-6 py-10">
                    {/* Step Title */}
                    <h2 className="text-3xl font-bold text-on-surface text-center mb-8">
                        {currentStep.title}
                    </h2>

                    {/* Content Rendering */}
                    <div className="mb-20"> {/* Bottom margin so button doesn't cover */}
                        {renderContent()}
                    </div>
                </div>
            </div>

            {/* 4. Footer (Fixed at bottom) */}
            <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-surface sticky bottom-0">
                <div className="max-w-2xl mx-auto">
                    <button
                        onClick={handleNext}
                        disabled={loading || isNextDisabled()}
                        className={`
              w-full py-4 rounded-2xl text-lg font-bold uppercase tracking-wide transition-all transform active:scale-[0.98]
              ${isNextDisabled()
                                ? 'bg-gray-200 dark:bg-slate-700  text-foreground-muted  cursor-not-allowed'
                                : 'bg-green-500 text-white shadow-[0_4px_0_0_#15803d] hover:bg-green-600 hover:shadow-[0_4px_0_0_#166534]'
                            }
            `}
                    >
                        {loading ? 'Salvando...' : isLastStep ? 'Concluir Módulo' : 'Continuar'}
                    </button>
                </div>
            </div>
        </div>
    );
}
