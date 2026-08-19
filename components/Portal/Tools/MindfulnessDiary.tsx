import React, { useState } from 'react';
import { useMindfulness } from '@/hooks/usePortalTools';
import { usePortalUser } from '@/hooks/usePortalUser';
import Button from '@/components/Button';
import { Send, Sparkles, Compass, CloudLightning, CloudRain, CloudSun, Sun, Star } from 'lucide-react';

const MindfulnessDiary: React.FC = () => {
    const { patient } = usePortalUser();
    const patientId = patient?.id;

    const { createMindfulnessLog, loading } = useMindfulness(patientId);

    const [feeling, setFeeling] = useState<number>(3); // 1-5
    const [valuesAlignment, setValuesAlignment] = useState<number>(3); // 1-5
    const [notes, setNotes] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSaveDiary = async () => {
        if (!patientId) return;

        const success = await createMindfulnessLog(patientId, patientId, {
            feeling,
            valuesAlignment,
            notes: notes.trim()
        });

        if (success) {
            setIsSubmitted(true);
            setTimeout(() => {
                setIsSubmitted(false);
                setFeeling(3);
                setValuesAlignment(3);
                setNotes('');
            }, 3000); // Mostra state de sucesso por 3s
        }
    };

    const MOOD_ICONS = [
        <CloudLightning className="w-full h-full" />,
        <CloudRain className="w-full h-full" />,
        <CloudSun className="w-full h-full" />,
        <Sun className="w-full h-full" />,
        <Star className="w-full h-full text-yellow-500" />
    ];
    const ALIGN_TEXT = ['Desconectado', 'Distante', 'Neutro', 'Alinhado', 'Muito Conectado'];

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] md:h-full animate-fadeIn pb-24 md:pb-8">
            <div className="mb-6 px-4 md:px-0">
                <h2 className="text-2xl font-bold text-on-surface flex items-center gap-2">
                    <Sparkles className="text-primary" />
                    Mindfulness & Valores
                </h2>
                <p className="text-sm text-foreground-muted mt-1">Check-in do momento presente.</p>
            </div>

            <div className="flex-1 px-4 md:px-0 flex flex-col justify-center max-w-lg mx-auto w-full">
                {isSubmitted ? (
                    <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30 rounded-3xl p-8 flex flex-col items-center justify-center text-center animate-in zoom-in duration-500">
                        <div className="w-16 h-16 bg-primary/20 dark:bg-primary/30 rounded-full flex items-center justify-center mb-4">
                            <Sparkles className="w-8 h-8 text-primary/80 dark:text-primary" />
                        </div>
                        <h3 className="text-xl font-bold text-primary dark:text-primary/90">Registro Salvo</h3>
                        <p className="text-primary/70 dark:text-primary/60 mt-2 text-sm">Seu psicólogo já tem acesso a essa aferição.</p>
                    </div>
                ) : (
                    <div className="bg-surface/80 dark:bg-surface/60 backdrop-blur-xl border border-border/40 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden">

                        {/* Blob Background */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none" />

                        <div className="space-y-8 relative z-10">
                            {/* Mood Slider */}
                            <div>
                                <label className="block text-sm font-bold text-foreground-muted mb-4 text-center">
                                    Como você julga seu humor hoje?
                                </label>
                                <div className="flex justify-between px-2 mb-4">
                                    {MOOD_ICONS.map((icon, idx) => (
                                        <div 
                                            key={idx} 
                                            onClick={() => setFeeling(idx + 1)}
                                            className={`w-8 h-8 transition-all duration-300 cursor-pointer hover:scale-110 ${feeling === idx + 1 ? 'scale-125 drop-shadow-md text-primary' : 'opacity-40 text-foreground-muted grayscale hover:opacity-70'}`}
                                        >
                                            {icon}
                                        </div>
                                    ))}
                                </div>
                                <input
                                    type="range" min="1" max="5"
                                    value={feeling}
                                    onChange={(e) => setFeeling(Number(e.target.value))}
                                    className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none slider-primary cursor-pointer"
                                />
                            </div>

                            <hr className=" border-border " />

                            {/* Values Alignment Slider */}
                            <div>
                                <label className="text-sm font-bold text-foreground-muted mb-4 text-center flex items-center justify-center gap-2">
                                    <Compass size={16} className="text-primary/70" />
                                    Conexão com seus Valores
                                </label>
                                <div className="text-center mb-4">
                                    <span className="text-lg font-bold text-primary dark:text-primary/90 bg-primary/10 dark:bg-primary/20 px-4 py-1.5 rounded-full inline-block">
                                        {ALIGN_TEXT[valuesAlignment - 1]}
                                    </span>
                                </div>
                                <input
                                    type="range" min="1" max="5"
                                    value={valuesAlignment}
                                    onChange={(e) => setValuesAlignment(Number(e.target.value))}
                                    className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none slider-primary cursor-pointer"
                                />
                            </div>

                            {/* Optional Notes */}
                            <div>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Quer registrar algum detalhe curto? (Opcional)"
                                    className="w-full bg-surface dark:bg-slate-950/50 border border-border rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary h-20 resize-none"
                                />
                            </div>

                            <Button
                                onClick={handleSaveDiary}
                                disabled={loading}
                                className="w-full !rounded-2xl py-4 flex justify-center items-center gap-2 shadow-lg hover:shadow-xl transition-all"
                                variant="primary"
                            >
                                <Send size={18} /> Cadastrar Diário
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .slider-primary::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 24px;
                    height: 24px;
                    background: var(--color-primary);
                    border-radius: 50%;
                    cursor: pointer;
                    box-shadow: 0 0 10px var(--color-primary);
                    border: 3px solid white;
                }
            `}</style>
        </div>
    );
};

export default MindfulnessDiary;
