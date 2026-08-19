import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import Button from '../../Button'; // Adjusted import path assuming Tools/RPD structure
import { XIcon, ChevronRightIcon, ChevronLeftIcon, CheckCircleIcon } from '../../Icons'; // Adjusted import path
import { CognitiveDistortion } from '@/types';
import { Frown, Angry, CloudRain, Flame, CloudLightning, Meh, Frown as FrownIcon, AlertCircle } from 'lucide-react';

interface RPDModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { situation: string; emotion: string; intensity: number; thought: string; distortions: CognitiveDistortion[]; rationalResponse: string; date: string; }) => Promise<void>;
}

const DISTORTIONS: { id: CognitiveDistortion; label: string; description: string }[] = [
    { id: 'catastrophizing', label: 'Catastrofização', description: 'Imaginar o pior cenário possível.' },
    { id: 'all_or_nothing', label: 'Tudo ou Nada', description: 'Ver a situação em categorias extremas (preto ou branco).' },
    { id: 'mental_filter', label: 'Filtro Negativo', description: 'Focar apenas nos detalhes negativos.' },
    { id: 'emotional_reasoning', label: 'Raciocínio Emocional', description: 'Achar que o que sente é a realidade.' },
    { id: 'mind_reading', label: 'Leitura Mental', description: 'Achar que sabe o que os outros estão pensando.' },
    { id: 'overgeneralization', label: 'Generalização', description: 'Ver um padrão negativo global com base em um evento.' },
    { id: 'labeling', label: 'Rotulação', description: 'Atribuir rótulos negativos a si mesmo ou aos outros.' },
    { id: 'personalization', label: 'Personalização', description: 'Assumir culpa por eventos fora do seu controle.' },
    { id: 'should_statements', label: 'Ditadura do Deveria', description: 'Usar "deveria" ou "tenho que" de forma rígida.' },
    { id: 'disqualifying_positive', label: 'Desqualificar o Positivo', description: 'Ignorar experiências positivas.' },
];

const EMOTION_ICONS = [
    { label: 'Tristeza', icon: Frown, color: 'text-blue-500' },
    { label: 'Raiva', icon: Angry, color: 'text-red-500' },
    { label: 'Ansiedade', icon: CloudLightning, color: 'text-orange-500' },
    { label: 'Medo', icon: AlertCircle, color: 'text-purple-500' },
    { label: 'Culpa', icon: CloudRain, color: 'text-indigo-500' },
    { label: 'Vergonha', icon: FrownIcon, color: 'text-rose-500' },
    { label: 'Frustração', icon: Flame, color: 'text-amber-500' },
    { label: 'Indiferença', icon: Meh, color: 'text-slate-500' },
];

const RPDModal: React.FC<RPDModalProps> = ({ isOpen, onClose, onSave }) => {
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [situation, setSituation] = useState('');
    const [emotion, setEmotion] = useState('');
    const [intensity, setIntensity] = useState(50);
    const [thought, setThought] = useState('');
    const [distortions, setDistortions] = useState<CognitiveDistortion[]>([]);
    const [rationalResponse, setRationalResponse] = useState('');

    const handleNext = () => setStep(prev => Math.min(prev + 1, 4));
    const handleBack = () => setStep(prev => Math.max(prev - 1, 1));

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await onSave({
                situation,
                emotion,
                intensity,
                thought,
                distortions,
                rationalResponse,
                date: new Date().toISOString()
            });
            onClose();
            // Reset form
            setStep(1);
            setSituation('');
            setEmotion('');
            setIntensity(50);
            setThought('');
            setDistortions([]);
            setRationalResponse('');
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleDistortion = (id: CognitiveDistortion) => {
        setDistortions(prev =>
            prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
        );
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />

            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="mx-auto max-w-2xl w-full bg-surface rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                    {/* Header */}
                    <div className=" bg-surface px-6 py-4 border-b border-border flex justify-between items-center">
                        <div>
                            <Dialog.Title className="text-lg font-bold text-on-surface ">
                                Novo Registro de Pensamento
                            </Dialog.Title>
                            <p className="text-sm text-foreground-muted ">Passo {step} de 4</p>
                        </div>
                        <button onClick={onClose} className="rounded-full p-1 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                            <XIcon className="w-6 h-6 text-foreground-muted " />
                        </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-background h-1">
                        <div
                            className="bg-blue-600 h-1 transition-all duration-300 ease-out"
                            style={{ width: `${(step / 4) * 100}%` }}
                        />
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto flex-1">

                        {/* Step 1: Situation */}
                        {step === 1 && (
                            <div className="space-y-4 animate-fadeIn">
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100/60 dark:border-blue-800 mb-4">
                                    <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-1">O Fato</h3>
                                    <p className="text-sm text-blue-600 dark:text-blue-400">Descreva a situação que serviu de gatilho. O que aconteceu? Onde você estava? Com quem?</p>
                                </div>
                                <textarea
                                    className="w-full h-40 p-3 rounded-xl border border-border bg-surface focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all"
                                    placeholder="Ex: Estava na reunião de trabalho e meu chefe me fez uma pergunta que eu não soube responder..."
                                    value={situation}
                                    onChange={(e) => setSituation(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        )}

                        {/* Step 2: Emotion */}
                        {step === 2 && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-100/60 dark:border-purple-800">
                                    <h3 className="font-semibold text-purple-800 dark:text-purple-300 mb-1">A Emoção</h3>
                                    <p className="text-sm text-purple-600 dark:text-purple-400">O que você sentiu naquele momento? Qual foi a intensidade?</p>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {EMOTION_ICONS.map((emp) => (
                                        <button
                                            key={emp.label}
                                            onClick={() => setEmotion(emp.label)}
                                            className={`
                                                flex flex-col items-center justify-center p-3 rounded-xl border transition-all
                                                ${emotion === emp.label
                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500 ring-opacity-50'
                                                    : ' border-border    hover:border-blue-300 hover:bg-slate-50 dark:hover:bg-slate-800'}
                                            `}
                                        >
                                            <emp.icon className={`w-8 h-8 mb-2 ${emp.color}`} />
                                            <span className="text-sm font-medium text-foreground-muted ">{emp.label}</span>
                                        </button>
                                    ))}
                                </div>

                                <div className="pt-4 border-t border-border ">
                                    <div className="flex justify-between mb-2">
                                        <label className="text-sm font-medium text-foreground-muted ">Intensidade</label>
                                        <span className={`text-sm font-bold ${intensity > 70 ? 'text-red-500' : 'text-blue-500'}`}>{intensity}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={intensity}
                                        onChange={(e) => setIntensity(Number(e.target.value))}
                                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                    <div className="flex justify-between text-xs text-foreground-muted mt-1">
                                        <span>Leve</span>
                                        <span>Moderada</span>
                                        <span>Intensa</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Thought */}
                        {step === 3 && (
                            <div className="space-y-4 animate-fadeIn">
                                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100/60 dark:border-amber-800">
                                    <h3 className="font-semibold text-amber-800 dark:text-amber-300 mb-1">O Pensamento Automático</h3>
                                    <p className="text-sm text-amber-600 dark:text-amber-400">O que passou pela sua cabeça? Identifique possíveis distorções.</p>
                                </div>

                                <textarea
                                    className="w-full h-24 p-3 rounded-xl border border-border bg-surface focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                                    placeholder="Ex: Eu sou uma fraude, todos vão perceber que não sei nada..."
                                    value={thought}
                                    onChange={(e) => setThought(e.target.value)}
                                    autoFocus
                                />

                                <div>
                                    <label className="block text-sm font-medium text-foreground-muted mb-2">Distorções Cognitivas Identificadas:</label>
                                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                                        {DISTORTIONS.map(dist => (
                                            <button
                                                key={dist.id}
                                                onClick={() => toggleDistortion(dist.id)}
                                                className={`
                                                    px-3 py-1.5 rounded-full text-xs font-medium border transition-colors text-left
                                                    ${distortions.includes(dist.id)
                                                        ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/50 dark:text-amber-200'
                                                        : ' bg-surface     text-foreground-muted border-border hover:border-amber-300'}
                                                `}
                                                title={dist.description}
                                            >
                                                {dist.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Rational Response */}
                        {step === 4 && (
                            <div className="space-y-4 animate-fadeIn">
                                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100/60 dark:border-green-800 mb-4">
                                    <h3 className="font-semibold text-green-800 dark:text-green-300 mb-1">Resposta Racional</h3>
                                    <p className="text-sm text-green-600 dark:text-green-400">Analisando as evidências, qual seria uma forma mais realista e saudável de interpretar essa situação?</p>
                                </div>
                                <textarea
                                    className="w-full h-40 p-3 rounded-xl border border-border bg-surface focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                                    placeholder="Ex: Não saber uma resposta não me torna uma fraude. Eu tenho muitas outras competências e posso pesquisar o que não sei..."
                                    value={rationalResponse}
                                    onChange={(e) => setRationalResponse(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        )}

                    </div>

                    {/* Footer / Actions */}
                    <div className=" bg-surface px-6 py-4 border-t border-border flex justify-between">
                        <Button
                            variant="secondary"
                            onClick={handleBack}
                            disabled={step === 1 || isSubmitting}
                            className={step === 1 ? 'invisible' : ''}
                        >
                            <ChevronLeftIcon className="w-4 h-4 mr-1" /> Voltar
                        </Button>

                        {step < 4 ? (
                            <Button onClick={handleNext} disabled={!situation && step === 1}>
                                Próximo <ChevronRightIcon className="w-4 h-4 ml-1" />
                            </Button>
                        ) : (
                            <Button onClick={handleSubmit} disabled={isSubmitting} variant="primary" className="bg-green-600 hover:bg-green-700">
                                {isSubmitting ? 'Salvando...' : (
                                    <>
                                        <CheckCircleIcon className="w-4 h-4 mr-2" /> Salvar Registro
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
};

export default RPDModal;
