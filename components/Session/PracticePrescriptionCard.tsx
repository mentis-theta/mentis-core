import React, { useState } from 'react';
import { useTrails } from '@/hooks/useTrails';
import { StepContentType } from '@/types';
import { ClipboardList, Beaker, BarChart3, MessageSquare, ChevronDown, Send, Calendar, Link as LinkIcon } from 'lucide-react';
import Button from '@/components/Button';

interface PracticePrescriptionCardProps {
    patientId: string;
    patientName?: string;
    sessionId?: string;
    selectedGoalIds?: string[];
}

interface PracticeTypeDefinition {
    type: StepContentType;
    targetTool?: string;
    label: string;
    description: string;
    icon: React.ReactNode;
    color: string;
}

const PRACTICE_TYPES: PracticeTypeDefinition[] = [
    {
        type: 'behavioral_experiment',
        label: 'Experimento Comportamental',
        description: 'Predição → Ação → Aprendizado',
        icon: <Beaker className="w-4 h-4" />,
        color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800'
    },
    {
        type: 'self_monitoring',
        label: 'Auto-Monitoramento',
        description: 'Escala + anotação diária',
        icon: <BarChart3 className="w-4 h-4" />,
        color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
    },
    {
        type: 'free_response',
        label: 'Resposta Livre',
        description: 'Reflexão aberta em texto',
        icon: <MessageSquare className="w-4 h-4" />,
        color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800'
    },
    {
        type: 'tool_redirect',
        targetTool: 'rpd',
        label: 'Registro de Pensamentos',
        description: 'Formulário interativo de RPD',
        icon: <LinkIcon className="w-4 h-4" />,
        color: 'text-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-900/20 border-fuchsia-200 dark:border-fuchsia-800'
    },
    {
        type: 'tool_redirect',
        targetTool: 'breathing',
        label: 'Respiração Guiada',
        description: 'Exercício para regulação parassimpática',
        icon: <span className="text-sm leading-none flex items-center justify-center">💨</span>,
        color: 'text-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-900/20 border-fuchsia-200 dark:border-fuchsia-800'
    },
    {
        type: 'tool_redirect',
        targetTool: 'coping_cards',
        label: 'Cartões de Enfrentamento',
        description: 'Lembretes para momentos de crise',
        icon: <span className="text-sm leading-none flex items-center justify-center">🛡️</span>,
        color: 'text-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-900/20 border-fuchsia-200 dark:border-fuchsia-800'
    },
    {
        type: 'tool_redirect',
        targetTool: 'mindfulness',
        label: 'Diário de Mindfulness',
        description: 'Registro focado no momento presente',
        icon: <span className="text-sm leading-none flex items-center justify-center">✨</span>,
        color: 'text-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-900/20 border-fuchsia-200 dark:border-fuchsia-800'
    }
];

export const PracticePrescriptionCard: React.FC<PracticePrescriptionCardProps> = ({
    patientId,
    patientName,
    sessionId,
    selectedGoalIds
}) => {
    const { prescribePractice } = useTrails();

    const [isOpen, setIsOpen] = useState(false);
    const [selectedTypeIndex, setSelectedTypeIndex] = useState<number>(0);
    const [title, setTitle] = useState('');
    const [instructions, setInstructions] = useState('');
    const [dueDate, setDueDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d.toISOString().split('T')[0];
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [prescribed, setPrescribed] = useState<string[]>([]);

    const selectedConfig = PRACTICE_TYPES[selectedTypeIndex];

    const handlePrescribe = async () => {
        if (!title.trim() || !instructions.trim()) return;
        setIsSubmitting(true);

        const result = await prescribePractice({
            patientId,
            title: title.trim(),
            stepType: selectedConfig.type,
            instructions: instructions.trim(),
            dueDate: new Date(dueDate).toISOString(),
            sourceSessionId: sessionId,
            sourceGoalId: selectedGoalIds?.[0],
            contentData: selectedConfig.targetTool ? { target_tool: selectedConfig.targetTool } : undefined
        });

        if (result) {
            setPrescribed(prev => [...prev, title.trim()]);
            setTitle('');
            setInstructions('');
        }
        setIsSubmitting(false);
    };

    return (
        <div className="bg-surface rounded-2xl border border-border/60 overflow-hidden transition-all duration-300">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors focus:outline-none"
            >
                <div className="flex items-center">
                    <ClipboardList className="w-4 h-4 mr-2 text-violet-500" />
                    <h4 className="text-sm font-semibold text-foreground-muted">Prescrever Prática</h4>
                    {prescribed.length > 0 && (
                        <span className="ml-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {prescribed.length} prescrita{prescribed.length > 1 ? 's' : ''}
                        </span>
                    )}
                </div>
                <ChevronDown className={`w-4 h-4 text-foreground-muted transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="p-4 pt-0 space-y-4 animate-fadeIn">
                    {/* Prescribed items feedback */}
                    {prescribed.length > 0 && (
                        <div className="space-y-1.5">
                            {prescribed.map((name, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg border border-green-200 dark:border-green-800">
                                    <span className="text-green-500">✓</span>
                                    <span className="font-medium">{name}</span>
                                    <span className="text-green-500/60 ml-auto">Enviada ao portal</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Type Selector */}
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-foreground-muted mb-2">Tipo de Prática</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                            {PRACTICE_TYPES.map((pt, idx) => (
                                <button
                                    key={`${pt.type}-${pt.targetTool || 'default'}`}
                                    type="button"
                                    onClick={() => {
                                        setSelectedTypeIndex(idx);
                                        setTitle(pt.label); // Auto-preenche o título para facilitar
                                    }}
                                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer outline-none ${
                                        selectedTypeIndex === idx
                                            ? `${pt.color} ring-1 ring-current/20 shadow-sm`
                                            : 'bg-surface-container-lowest border-border/40 text-foreground-muted hover:border-border'
                                    }`}
                                >
                                    <div className={`p-1.5 rounded-lg flex-shrink-0 w-8 h-8 flex items-center justify-center ${selectedTypeIndex === idx ? 'bg-white/60 dark:bg-black/20' : 'bg-background'}`}>
                                        {pt.icon}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-xs font-bold truncate">{pt.label}</div>
                                        <div className="text-[10px] opacity-60 truncate">{pt.description}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-foreground-muted mb-1.5">Título da Prática</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Ex: Título da atividade..."
                            className="w-full p-3 text-sm border border-border/40 rounded-xl bg-surface-container-lowest focus:ring-2 focus:ring-violet-500/30 outline-none"
                        />
                    </div>

                    {/* Instructions */}
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-foreground-muted mb-1.5">
                            Instruções para {patientName || 'o paciente'}
                        </label>
                        <textarea
                            value={instructions}
                            onChange={e => setInstructions(e.target.value)}
                            placeholder="Escreva instruções personalizadas..."
                            className="w-full p-3 text-sm border border-border/40 rounded-xl bg-surface-container-lowest focus:ring-2 focus:ring-violet-500/30 outline-none h-20 resize-none"
                        />
                    </div>

                    {/* Due Date */}
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-foreground-muted mb-1.5">Prazo</label>
                        <div className="relative">
                            <input
                                type="date"
                                value={dueDate}
                                onChange={e => setDueDate(e.target.value)}
                                className="w-full p-3 text-sm border border-border/40 rounded-xl bg-surface-container-lowest focus:ring-2 focus:ring-violet-500/30 outline-none"
                            />
                            <Calendar className="absolute right-3 top-3 w-4 h-4 text-foreground-muted pointer-events-none" />
                        </div>
                    </div>

                    {/* Submit */}
                    <Button
                        onClick={handlePrescribe}
                        disabled={!title.trim() || !instructions.trim() || isSubmitting}
                        className="w-full !bg-violet-600 hover:!bg-violet-700 !text-white !rounded-xl gap-2 shadow-sm"
                    >
                        <Send className="w-4 h-4" />
                        <span className="font-bold text-xs uppercase tracking-wider">
                            {isSubmitting ? 'Prescrevendo...' : 'Prescrever Prática'}
                        </span>
                    </Button>
                </div>
            )}
        </div>
    );
};
