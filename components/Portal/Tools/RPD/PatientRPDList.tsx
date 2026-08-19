
import React from 'react';
import { RPDRecord } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Frown, AlertCircle, Angry, SmilePlus, Meh, Smile, FileText, Sparkles, MessageSquare, Eye, Lock, Brain } from 'lucide-react';

interface PatientRPDListProps {
    date: string; // Not used yet, maybe for filtering
    rpds: RPDRecord[];
    loading: boolean;
}

const EMOTION_ICONS: Record<string, React.ReactNode> = {
    sadness: <Frown className="w-6 h-6" />,
    anxiety: <AlertCircle className="w-6 h-6" />,
    anger: <Angry className="w-6 h-6" />,
    joy: <SmilePlus className="w-6 h-6" />,
    neutral: <Meh className="w-6 h-6" />,
    // New Daylio Moods
    Radical: <SmilePlus className="w-6 h-6" />,
    Bem: <Smile className="w-6 h-6" />,
    'Mais ou menos': <Meh className="w-6 h-6" />,
    Mal: <Frown className="w-6 h-6" />,
    'Horrível': <Frown className="w-6 h-6 opacity-80" />
};

const EMOTION_LABELS: Record<string, string> = {
    sadness: 'Tristeza',
    anxiety: 'Ansiedade',
    anger: 'Raiva',
    joy: 'Alegria',
    neutral: 'Neutro',
    // New Daylio Moods
    Radical: 'Radical',
    Bem: 'Bem',
    'Mais ou menos': 'Mais ou menos',
    Mal: 'Mal',
    'Horrível': 'Horrível'
};

const PatientRPDList: React.FC<PatientRPDListProps> = ({ rpds, loading }) => {
    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-background rounded-xl animate-pulse"></div>
                ))}
            </div>
        );
    }

    if (rpds.length === 0) {
        return (
            <div className="flex-1 flex flex-col justify-center items-center py-16 px-4 text-foreground-muted">
                <div className="w-20 h-20 border-2 border-dashed border-border rounded-[2rem] flex items-center justify-center mb-6 -rotate-6 bg-surface shadow-sm relative text-slate-400">
                    <FileText className="w-10 h-10" />
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center border border-border text-primary">
                        <Sparkles className="w-4 h-4" />
                    </div>
                </div>
                <h3 className="text-lg font-bold text-on-surface mb-2">Seu Diário está Vazio</h3>
                <p className="text-center text-sm opacity-80 max-w-sm">
                    Registrar suas emoções ajuda a entender padrões e facilita o acompanhamento na terapia. Que tal registrar como se sente hoje?
                </p>
                {/* Button is already on the parent layout Header, we just show instruction */}
                <p className="text-xs font-semibold text-primary/70 mt-6 tracking-widest uppercase">
                    ↑ Clique em "Novo Registro" para começar
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {rpds.map((rpd) => {
                const emotion = rpd.metadata.emotion || 'neutral';
                const isShared = rpd.metadata.is_shared !== false; // Default to true if undefined

                return (
                    <div key={rpd.id} className=" bg-surface rounded-xl p-5 border border-border shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                <div className="bg-background dark:bg-slate-700 w-10 h-10 rounded-full flex items-center justify-center text-slate-500">
                                    {EMOTION_ICONS[emotion] || <Meh className="w-6 h-6" />}
                                </div>
                                <div>
                                    <h4 className="font-bold text-on-surface capitalize">
                                        {EMOTION_LABELS[emotion] || emotion}
                                    </h4>
                                    <span className="text-xs text-foreground-muted ">
                                        {format(new Date(rpd.date), "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                {rpd.therapist_feedback && (
                                    <div className="px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 bg-tertiary/10 text-tertiary dark:bg-tertiary/20">
                                        <MessageSquare className="w-3.5 h-3.5" /> Respondido
                                    </div>
                                )}
                                <div className={`px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${isShared ? 'bg-primary/10 text-primary dark:bg-primary/20' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30'}`}>
                                    {isShared ? (
                                        <><Eye className="w-3.5 h-3.5" /> Compartilhado</>
                                    ) : (
                                        <><Lock className="w-3.5 h-3.5" /> Privado</>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="text-sm text-foreground-muted space-y-2">
                            {rpd.content.situation && (
                                <p><strong className=" text-foreground ">Situação:</strong> {rpd.content.situation}</p>
                            )}
                            {rpd.content.thought && (
                                <p><strong className=" text-foreground ">Pensamento:</strong> {rpd.content.thought}</p>
                            )}

                            {/* Therapist Feedback Section */}
                            {rpd.therapist_feedback && (
                                <div className="mt-4 pt-3 border-t border-border ">
                                    <div className="bg-tertiary/5 dark:bg-tertiary/10 rounded-lg p-3 border border-tertiary/20">
                                        <div className="flex items-center gap-2 mb-1.5 text-tertiary">
                                            <Brain className="w-5 h-5" />
                                            <h5 className="text-xs font-bold uppercase">
                                                Insight do Psicólogo
                                            </h5>
                                        </div>
                                        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                                            {rpd.therapist_feedback}
                                        </p>
                                        {rpd.feedback_at && (
                                            <p className="text-[10px] text-tertiary mt-2 text-right opacity-70">
                                                Recebido em {format(new Date(rpd.feedback_at), "d 'de' MMM", { locale: ptBR })}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default PatientRPDList;
