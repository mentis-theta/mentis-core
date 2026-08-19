import React, { useState, useEffect } from 'react';
import Button from '@/components/Button';
import { usePatientRPD } from '@/hooks/usePatientRPD';
import { CognitiveDistortion } from '@/types';
import { useQueryClient } from '@tanstack/react-query';
import { Frown, AlertCircle, Angry, SmilePlus, Meh, Lock } from 'lucide-react';
import PatientModal from '@/components/Portal/PatientModal';

interface PatientRPDWizardProps {
    onClose: () => void;
    onSuccess: () => void;
}

const EMOTIONS = [
    { label: 'Tristeza', icon: <Frown className="w-8 h-8 mb-2" />, value: 'sadness', color: 'bg-indigo-100 text-indigo-600' },
    { label: 'Ansiedade', icon: <AlertCircle className="w-8 h-8 mb-2" />, value: 'anxiety', color: 'bg-purple-100 text-purple-600' },
    { label: 'Raiva', icon: <Angry className="w-8 h-8 mb-2" />, value: 'anger', color: 'bg-red-100 text-red-600' },
    { label: 'Alegria', icon: <SmilePlus className="w-8 h-8 mb-2" />, value: 'joy', color: 'bg-yellow-100 text-yellow-600' },
    { label: 'Neutro', icon: <Meh className="w-8 h-8 mb-2" />, value: 'neutral', color: 'bg-background text-foreground-muted' },
];

const PatientRPDWizard: React.FC<PatientRPDWizardProps> = ({ onClose, onSuccess }) => {
    const { createRPD } = usePatientRPD();
    const queryClient = useQueryClient();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Form Data
    const [emotion, setEmotion] = useState('');
    const [intensity, setIntensity] = useState(50);
    const [situation, setSituation] = useState('');
    const [thought, setThought] = useState('');
    const [isShared, setIsShared] = useState(true);

    const isDirty = emotion !== '' || situation !== '' || thought !== '';

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const success = await createRPD(
                {
                    situation,
                    thought,
                    rationalResponse: '', // Optional for "Express" mode
                },
                {
                    emotion,
                    intensity,
                    distortions: [], // Optional for "Express" mode
                    is_shared: isShared
                }
            );
            if (success) {
                // Recalcular XP imediatamente após novo registro
                await queryClient.invalidateQueries({ queryKey: ['gamification'] });
                await queryClient.invalidateQueries({ queryKey: ['rpds'] });
                onSuccess();
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!mounted) return null;

    let modalTitle = "";
    if (step === 1) modalTitle = "Como você está se sentindo?";
    if (step === 2) modalTitle = "O que aconteceu?";
    if (step === 3) modalTitle = "Privacidade";

    const footer = (
        <div className="flex justify-between w-full">
            {step > 1 ? (
                <Button variant="ghost" onClick={() => setStep(step - 1)}>Voltar</Button>
            ) : (
                <div></div>
            )}

            {step < 3 ? (
                <Button
                    onClick={() => setStep(step + 1)}
                    disabled={step === 1 && !emotion}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-500 dark:hover:bg-indigo-600"
                >
                    Próximo
                </Button>
            ) : (
                <Button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting} 
                    className="px-8 bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-500 dark:hover:bg-indigo-600"
                >
                    {isSubmitting ? 'Salvando...' : 'Concluir Registro'}
                </Button>
            )}
        </div>
    );

    return (
        <PatientModal
            isOpen={true}
            onCloseRequest={onClose}
            title={modalTitle}
            isDirty={isDirty}
            footer={footer}
        >
            <div className="flex-1 pb-4">
                {/* Step 1: Emotion & Intensity */}
                {step === 1 && (
                    <div className="space-y-8 animate-fadeIn">
                        <div className="grid grid-cols-3 gap-4">
                            {EMOTIONS.map((em) => (
                                <button
                                    key={em.value}
                                    onClick={() => setEmotion(em.value)}
                                    className={`flex flex-col items-center justify-center p-4 rounded-xl transition-all border-2 ${emotion === em.value ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 scale-105 shadow-md text-indigo-600 dark:text-indigo-400' : 'border-transparent bg-surface dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-500'}`}
                                >
                                    <span className="flex items-center justify-center">{em.icon}</span>
                                    <span className="text-sm font-medium text-foreground-muted ">{em.label}</span>
                                </button>
                            ))}
                        </div>

                        {emotion && (
                            <div className="space-y-2">
                                <label className="flex justify-between text-sm font-medium text-foreground-muted ">
                                    <span>Intensidade</span>
                                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">{intensity}%</span>
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={intensity}
                                    onChange={(e) => setIntensity(Number(e.target.value))}
                                    className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-indigo-400"
                                />
                                <div className="flex justify-between text-xs text-foreground-muted ">
                                    <span>Leve</span>
                                    <span>Moderado</span>
                                    <span>Intenso</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 2: Situation & Thought */}
                {step === 2 && (
                    <div className="space-y-6 animate-fadeIn">
                        <div>
                            <label className="block text-sm font-medium text-foreground-muted mb-2">
                                O que aconteceu? (Situação)
                            </label>
                            <textarea
                                value={situation}
                                onChange={(e) => setSituation(e.target.value)}
                                placeholder="Ex: Tive uma discussão no trabalho..."
                                className="w-full p-4 rounded-xl border border-border bg-surface focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-24"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground-muted mb-2">
                                O que passou pela sua cabeça? (Pensamento)
                            </label>
                            <textarea
                                value={thought}
                                onChange={(e) => setThought(e.target.value)}
                                placeholder="Ex: Eles acham que eu não sou competente..."
                                className="w-full p-4 rounded-xl border border-border bg-surface focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-24"
                            />
                        </div>
                    </div>
                )}

                {/* Step 3: Privacy */}
                {step === 3 && (
                    <div className="space-y-6 animate-fadeIn text-center py-4">
                        <div className="mb-6 flex justify-center">
                            <Lock className="w-16 h-16 text-slate-400" />
                        </div>
                        <h3 className="text-xl font-bold text-on-surface mb-2">Privacidade do Registro</h3>
                        <p className=" text-foreground-muted mb-8">
                            Você decide quem pode ver este registro.
                        </p>

                        <div
                            onClick={() => setIsShared(!isShared)}
                            className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${isShared ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : ' border-border '}`}
                        >
                            <div className="text-left">
                                <div className="font-bold text-on-surface ">Compartilhar com Terapeuta</div>
                                <div className="text-sm text-foreground-muted ">
                                    {isShared ? 'Seu terapeuta poderá ler este registro.' : 'Este registro será visível apenas para você.'}
                                </div>
                            </div>
                            <div className={`w-12 h-6 rounded-full p-1 transition-colors ${isShared ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                <div className={` bg-surface w-4 h-4 rounded-full shadow-sm transition-transform ${isShared ? 'translate-x-6' : 'translate-x-0'}`}></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </PatientModal>
    );
};

export default PatientRPDWizard;
