import React, { useState } from 'react';
import { supabase } from '@/services/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { usePortalUser } from '@/hooks/usePortalUser';
import {
    UserGroupIcon,
    MoonIcon,
    SunIcon,
    BookOpenIcon,
    BriefcaseIcon,
    FilmIcon,
    CheckCircleIcon,
    ChatBubbleLeftRightIcon,
    ClipboardListIcon,
    SparklesIcon
} from '../Icons';
import confetti from 'canvas-confetti';
import { SmilePlus, Smile, Meh, Frown } from 'lucide-react';

// Tag Categories Data
const ACTIVITY_CATEGORIES = [
    {
        name: 'Social',
        color: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
        tags: [
            { id: 'familia', label: 'Família', icon: UserGroupIcon },
            { id: 'amigos', label: 'Amigos', icon: ChatBubbleLeftRightIcon },
            { id: 'namoro', label: 'Namoro', icon: SparklesIcon },
        ]
    },
    {
        name: 'Saúde',
        color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
        tags: [
            { id: 'exercicio', label: 'Exercício', icon: SunIcon },
            { id: 'sono', label: 'Sono', icon: MoonIcon },
            { id: 'alimentacao', label: 'Comer', icon: ClipboardListIcon }, // Generic
        ]
    },
    {
        name: 'Lazer',
        color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
        tags: [
            { id: 'filmes', label: 'Filmes/TV', icon: FilmIcon },
            { id: 'leitura', label: 'Leitura', icon: BookOpenIcon },
            { id: 'jogos', label: 'Jogos', icon: BookOpenIcon }, // Generic
        ]
    },
    {
        name: 'Produtivo',
        color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
        tags: [
            { id: 'trabalho', label: 'Trabalho', icon: BriefcaseIcon },
            { id: 'estudos', label: 'Estudos', icon: BookOpenIcon },
            { id: 'limpeza', label: 'Limpeza', icon: ClipboardListIcon },
        ]
    }
];

// Mood Data
const MOODS = [
    { value: 5, label: 'Radical', icon: <SmilePlus className="w-1/2 h-1/2" />, color: 'bg-orange-400 hover:bg-orange-500', intensity: 10 },
    { value: 4, label: 'Bem', icon: <Smile className="w-1/2 h-1/2" />, color: 'bg-green-400 hover:bg-green-500', intensity: 8 },
    { value: 3, label: 'Mais ou menos', icon: <Meh className="w-1/2 h-1/2" />, color: 'bg-purple-400 hover:bg-purple-500', intensity: 5 },
    { value: 2, label: 'Mal', icon: <Frown className="w-1/2 h-1/2" />, color: 'bg-blue-400 hover:bg-blue-500', intensity: 3 },
    { value: 1, label: 'Horrível', icon: <Frown className="w-1/2 h-1/2 opacity-80" />, color: 'bg-slate-400 hover:bg-slate-500', intensity: 1 },
];

export const MoodWidget: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
    const { addToast } = useToast();
    const { patient, isSimulation, isMagic, magicTokenVersion } = usePortalUser();
    const [step, setStep] = useState<'mood' | 'details'>('mood');
    const [selectedMood, setSelectedMood] = useState<number | null>(null);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [customTagsList, setCustomTagsList] = useState<{id: string, label: string}[]>([]);
    const [newCustomTag, setNewCustomTag] = useState('');
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);

    const handleMoodSelect = (moodValue: number) => {
        setSelectedMood(moodValue);
        // If compact active, maybe skip details or keep it simple?
        // Let's allow details even in compact, but maybe styled smaller?
        // For now, keeping logic same.
        setStep('details');
    };

    const toggleTag = (tagId: string) => {
        setSelectedTags(prev =>
            prev.includes(tagId)
                ? prev.filter(t => t !== tagId)
                : [...prev, tagId]
        );
    };

    const handleAddCustomTag = () => {
        if (!newCustomTag.trim()) return;
        const tagId = `custom_${Date.now()}`;
        setCustomTagsList(prev => [...prev, { id: tagId, label: newCustomTag.trim() }]);
        setSelectedTags(prev => [...prev, tagId]);
        setNewCustomTag('');
    };

    const handleSave = async () => {
        if (!patient || selectedMood === null) return;
        setLoading(true);

        const moodObj = MOODS.find(m => m.value === selectedMood);

        // Blindagem: modo simulação exibe efeito visual sem persistir
        if (isSimulation) {
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            addToast('Modo Simulação: O registro de humor não será salvo.', 'info');
            setStep('mood');
            setSelectedMood(null);
            setSelectedTags([]);
            setNote('');
            setLoading(false);
            return;
        }

        try {
            const emotion = moodObj?.label || 'Unknown';
            const intensity = moodObj?.intensity || 5;
            const situation = `Mood Tracker: ${moodObj?.label}. Atividades: ${selectedTags.map(id => {
                let foundInCat;
                for (const cat of ACTIVITY_CATEGORIES) {
                    const tag = cat.tags.find(t => t.id === id);
                    if (tag) {
                        foundInCat = tag;
                        break;
                    }
                }
                const foundInCustom = customTagsList.find(t => t.id === id);
                return foundInCat?.label || foundInCustom?.label || id;
            }).join(', ')}`;
            const automatic_thoughts = note || 'Registro rápido via Widget';

            let requestError;

            if (isMagic) {
                // Paciente via Magic Link -> Usa RPC para bypass da RLS
                const { error } = await supabase.rpc('insert_portal_thought_record', {
                    p_patient_id: patient.id,
                    p_token_version: magicTokenVersion || 1,
                    p_emotion: emotion,
                    p_intensity: intensity,
                    p_situation: situation,
                    p_thoughts: automatic_thoughts
                });
                requestError = error;
            } else {
                // Paciente Autenticado via Auth -> Usa o insert normal (agora funciona porque corrigimos a RLS)
                const { error } = await supabase.from('thought_records').insert({
                    patient_id: patient.id,
                    emotion,
                    intensity,
                    situation,
                    automatic_thoughts
                });
                requestError = error;
            }

            if (requestError) throw requestError;

            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            addToast('Humor registrado com sucesso!', 'success');

            setStep('mood');
            setSelectedMood(null);
            setSelectedTags([]);
            setNote('');

        } catch (err) {
            console.error('Error saving mood:', err);
            addToast('Erro ao salvar humor.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const currentMoodObj = MOODS.find(m => m.value === selectedMood);

    // Compact Mode Styles adjustments
    const containerClasses = compact
        ? "bg-transparent"
        : " bg-surface    rounded-3xl shadow-sm border border-border p-6 md:p-8 animate-fadeIn mb-8 relative overflow-hidden transition-all duration-500";

    const titleClasses = compact
        ? "hidden"
        : "text-xl md:text-2xl font-bold  text-on-surface    mb-6";

    const emojiSizeClasses = compact
        ? "w-10 h-10 text-xl"
        : "w-12 h-12 md:w-16 md:h-16 text-2xl md:text-4xl";

    return (
        <div className={containerClasses}>
            {/* Background Decoration - Hide in compact */}
            {!compact && <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-blue-50 dark:bg-blue-900/10 rounded-full blur-3xl opacity-50 pointer-events-none"></div>}

            {step === 'mood' ? (
                <div className="text-center">
                    <h2 className={titleClasses}>
                        Como você está se sentindo agora?
                    </h2>
                    <div className="flex justify-center gap-2 md:gap-6">
                        {MOODS.map((mood) => (
                            <button
                                key={mood.value}
                                onClick={() => handleMoodSelect(mood.value)}
                                className="group flex flex-col items-center transition-transform hover:scale-110 active:scale-95 focus:outline-none"
                            >
                                <div className={`
                                    ${emojiSizeClasses} rounded-full flex items-center justify-center shadow-md transition-all duration-300
                                    ${mood.color} text-white group-hover:shadow-lg ring-4 ring-transparent group-hover:ring-white/20
                                `}>
                                    {mood.icon}
                                </div>
                                {!compact && (
                                    <span className="mt-2 text-xs md:text-sm font-medium text-foreground-muted opacity-0 group-hover:opacity-100 transition-opacity">
                                        {mood.label}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="animate-slideUp text-left">
                    {/* Simplified Steps for Compact Mode if needed, but keeping full for functionality */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setStep('mood')}
                                className=" text-foreground-muted hover:text-slate-600 transition-colors text-sm"
                            >
                                ← Voltar
                            </button>
                            <span className="flex items-center justify-center w-12 h-12 text-slate-600 dark:text-slate-300 -ml-2 -mr-2">
                                {currentMoodObj?.icon}
                            </span>
                            <span className="font-bold text-lg text-on-surface ">
                                Estou {currentMoodObj?.label.toLowerCase()}
                            </span>
                        </div>
                    </div>

                    {/* Activity Tags Grid */}
                    <div className="space-y-4 mb-4">
                        {ACTIVITY_CATEGORIES.map(cat => (
                            <div key={cat.name}>
                                <h3 className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-2">{cat.name}</h3>
                                <div className="flex flex-wrap gap-2">
                                    {cat.tags.map(tag => {
                                        const isSelected = selectedTags.includes(tag.id);
                                        const Icon = tag.icon;
                                        return (
                                            <button
                                                key={tag.id}
                                                onClick={() => toggleTag(tag.id)}
                                                className={`
                                                    flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border
                                                    ${isSelected
                                                        ? 'bg-slate-800 text-white border-slate-800 shadow-md transform scale-105'
                                                        : ' bg-surface     text-foreground-muted border-border hover:border-slate-300'}
                                                `}
                                            >
                                                <Icon className={`w-3 h-3 ${isSelected ? 'text-white' : ' text-foreground-muted '}`} />
                                                {tag.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {/* Custom Tags Section */}
                        <div>
                            <h3 className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-2">Personalizado</h3>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {customTagsList.map(tag => {
                                    const isSelected = selectedTags.includes(tag.id);
                                    return (
                                        <button
                                            key={tag.id}
                                            onClick={() => toggleTag(tag.id)}
                                            className={`
                                                flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border
                                                ${isSelected
                                                    ? 'bg-slate-800 text-white border-slate-800 shadow-md transform scale-105'
                                                    : ' bg-surface text-foreground-muted border-border hover:border-slate-300'}
                                            `}
                                        >
                                            <SparklesIcon className={`w-3 h-3 ${isSelected ? 'text-white' : ' text-foreground-muted '}`} />
                                            {tag.label}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="text" 
                                    value={newCustomTag}
                                    onChange={e => setNewCustomTag(e.target.value)}
                                    placeholder="Adicionar nova atividade..."
                                    className="flex-1 p-2 rounded-xl bg-surface border border-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    onKeyDown={e => { if (e.key === 'Enter') handleAddCustomTag(); }}
                                />
                                <button onClick={handleAddCustomTag} className="px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
                                    +
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Optional Note */}
                    <textarea
                        placeholder="Adicionar nota rápida..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="w-full p-3 rounded-xl bg-surface border border-border focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none text-foreground-muted text-sm mb-4"
                        rows={2}
                    />

                    {/* Save Button */}
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-base shadow-lg shadow-green-500/30 transition-all transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? 'Salvando...' : (
                            <>
                                <CheckCircleIcon className="w-5 h-5" />
                                Salvar Registro
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};
