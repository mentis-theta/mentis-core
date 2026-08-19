import React, { useState } from 'react';
import { BreathingPattern } from './BreathingTool';
import { SparklesIcon, MoonIcon, ScaleIcon, AdjustmentsIcon, ArrowLeftIcon, XMarkIcon, PlayIcon, PauseIcon } from '@/components/Icons';
import { usePortalNavigation } from '@/hooks/usePortalNavigation';
import { AlertTriangle } from 'lucide-react';

interface BreathingMenuProps {
    onSelect: (pattern: BreathingPattern) => void;
}

export const BreathingMenu: React.FC<BreathingMenuProps> = ({ onSelect }) => {
    const defaultPatterns: BreathingPattern[] = [
        {
            id: 'box',
            label: 'Respiração em Caixa',
            description: 'Foco e Relaxamento. 4-4-4-4',
            inhale: 4, hold: 4, exhale: 4, holdEmpty: 4,
            icon: <SparklesIcon className="w-7 h-7 text-emerald-500" />
        },
        {
            id: 'relax',
            label: 'Expiração Longa',
            description: 'Sono e Calma. 4-7-8',
            inhale: 4, hold: 7, exhale: 8, holdEmpty: 0,
            icon: <MoonIcon className="w-7 h-7 text-indigo-500" />
        },
        {
            id: 'coherence',
            label: 'Coerência Cardíaca',
            description: 'Equilíbrio. 5-0-5',
            inhale: 5, hold: 0, exhale: 5, holdEmpty: 0,
            icon: <ScaleIcon className="w-7 h-7 text-sky-500" />
        }
    ];

    const [customInputs, setCustomInputs] = useState({ inhale: 4, hold: 0, exhale: 4, holdEmpty: 0 });
    const [showCustom, setShowCustom] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const { goBack } = usePortalNavigation();

    const handleCustomSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSelect({
            id: 'custom',
            label: 'Personalizado',
            description: `Seu ritmo: ${customInputs.inhale}-${customInputs.hold}-${customInputs.exhale}-${customInputs.holdEmpty}`,
            ...customInputs,
            icon: <AdjustmentsIcon className="w-7 h-7 text-foreground-muted " />
        });
    };

    return (
        <div className="p-5 sm:p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8 flex items-center gap-3">
                <button
                    onClick={() => goBack()}
                    className="h-10 w-10 flex items-center justify-center rounded-full bg-background text-foreground-muted hover:text-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-300"
                >
                    <ArrowLeftIcon className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-semibold text-on-surface flex items-center gap-2 tracking-tight">
                        Mentis Zen
                    </h1>
                    <p className="text-sm text-foreground-muted ">Escolha um padrão de respiração para iniciar.</p>
                </div>
            </div>

            {/* Pattern Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {defaultPatterns.map((pattern, i) => (
                    <button
                        key={pattern.id}
                        onClick={() => onSelect(pattern)}
                        className=" bg-surface p-5 rounded-[28px] border border-border/60 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-300 text-left flex items-start gap-4 group"
                        style={{ animationDelay: `${i * 100}ms` }}
                    >
                        <div className="h-12 w-12 rounded-2xl bg-surface flex items-center justify-center group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                            {pattern.icon}
                        </div>
                        <div>
                            <h3 className="font-semibold text-base text-on-surface group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300">
                                {pattern.label}
                            </h3>
                            <p className="text-sm text-foreground-muted mt-0.5">
                                {pattern.description}
                            </p>
                        </div>
                    </button>
                ))}

                {/* Custom Card */}
                <button
                    onClick={() => setShowCustom(true)}
                    className=" bg-surface p-5 rounded-[28px] border border-dashed border-border hover:border-indigo-400 hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-all duration-300 text-left flex items-center justify-center gap-2.5 group h-full min-h-[140px]"
                >
                    <AdjustmentsIcon className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors duration-300" />
                    <span className="font-medium text-sm text-foreground-muted group-hover:text-indigo-600 transition-colors duration-300">Criar Personalizado</span>
                </button>
            </div>

            {/* Bottom Banner Card (Educational) */}
            <div className="mt-6">
                <button
                    onClick={() => setShowInfo(true)}
                    className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 rounded-[28px] p-6 md:p-8 text-white shadow-md hover:shadow-lg hover:scale-[1.005] transition-all duration-500 relative overflow-hidden text-left group"
                >
                    <div className="relative z-10 max-w-lg">
                        <div className="flex items-center gap-2 mb-2 opacity-80">
                            <SparklesIcon className="w-4 h-4" />
                            <span className="text-xs font-semibold uppercase tracking-wider">Dicas de Bem-estar</span>
                        </div>
                        <h2 className="text-xl md:text-2xl font-semibold mb-1.5">Antes de começar</h2>
                        <p className="text-teal-50/80 text-sm sm:text-base">
                            Saiba como funciona cada exercício de respiração e encontre dicas para ajudar você a praticar.
                        </p>
                    </div>

                    {/* Decorative */}
                    <div className="absolute right-0 bottom-0 opacity-10 group-hover:opacity-15 transition-opacity duration-500">
                        <svg width="200" height="200" viewBox="0 0 200 200" fill="currentColor">
                            <path d="M100 0C155.228 0 200 44.7715 200 100C200 155.228 155.228 200 100 200C44.7715 200 0 155.228 0 100C0 44.7715 44.7715 0 100 0ZM100 180C144.183 180 180 144.183 180 100C180 55.8172 144.183 20 100 20C55.8172 20 20 55.8172 20 100C20 144.183 55.8172 180 100 180Z" />
                        </svg>
                    </div>
                </button>
            </div>

            {/* Custom Modal/Form */}
            {showCustom && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-md animate-[fadeIn_300ms_ease-out]">
                    <div className=" bg-surface rounded-[28px] p-6 w-full max-w-md shadow-2xl animate-[fadeIn_300ms_ease-out]">
                        <h3 className="text-lg font-semibold mb-4 text-on-surface ">Ritmo Personalizado (segundos)</h3>
                        <form onSubmit={handleCustomSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-foreground-muted mb-1.5">Inspirar</label>
                                    <input
                                        type="number" min="1" max="60"
                                        value={customInputs.inhale}
                                        onChange={e => setCustomInputs(p => ({ ...p, inhale: Number(e.target.value) }))}
                                        className="w-full p-2.5 rounded-xl border border-border dark:bg-slate-700 text-center text-lg font-semibold text-on-surface focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all duration-200"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-foreground-muted mb-1.5">Segurar (Cheio)</label>
                                    <input
                                        type="number" min="0" max="60"
                                        value={customInputs.hold}
                                        onChange={e => setCustomInputs(p => ({ ...p, hold: Number(e.target.value) }))}
                                        className="w-full p-2.5 rounded-xl border border-border dark:bg-slate-700 text-center text-lg font-semibold text-on-surface focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all duration-200"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-foreground-muted mb-1.5">Expirar</label>
                                    <input
                                        type="number" min="1" max="60"
                                        value={customInputs.exhale}
                                        onChange={e => setCustomInputs(p => ({ ...p, exhale: Number(e.target.value) }))}
                                        className="w-full p-2.5 rounded-xl border border-border dark:bg-slate-700 text-center text-lg font-semibold text-on-surface focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all duration-200"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-foreground-muted mb-1.5">Segurar (Vazio)</label>
                                    <input
                                        type="number" min="0" max="60"
                                        value={customInputs.holdEmpty}
                                        onChange={e => setCustomInputs(p => ({ ...p, holdEmpty: Number(e.target.value) }))}
                                        className="w-full p-2.5 rounded-xl border border-border dark:bg-slate-700 text-center text-lg font-semibold text-on-surface focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all duration-200"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setShowCustom(false)} className="px-5 py-2.5 rounded-full text-sm font-medium text-foreground-muted hover:text-slate-700 hover:bg-slate-100 transition-all duration-200">Cancelar</button>
                                <button type="submit" className="px-5 py-2.5 rounded-full text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-all duration-200">Iniciar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Info Modal (Slide-over) */}
            {showInfo && (
                <div className="fixed inset-0 bg-black/40 z-50 flex justify-end backdrop-blur-sm animate-[fadeIn_300ms_ease-out]">
                    <div
                        className="fixed inset-0"
                        onClick={() => setShowInfo(false)}
                    ></div>
                    <div className="relative w-full max-w-md bg-surface h-full shadow-2xl overflow-y-auto animate-slideLeft p-6 md:p-8">
                        <button
                            onClick={() => setShowInfo(false)}
                            className="absolute top-6 right-6 h-10 w-10 flex items-center justify-center rounded-full bg-background hover:bg-slate-200 transition-all duration-200"
                        >
                            <XMarkIcon className="w-5 h-5 text-foreground-muted " />
                        </button>

                        <div className="mt-10 space-y-8">
                            {/* Section 1: Intro */}
                            <section>
                                <h2 className="text-xl font-semibold text-on-surface mb-3">Como a respiração ajuda?</h2>
                                <p className=" text-foreground-muted leading-relaxed text-sm">
                                    Exercícios de respiração controlada enviam sinais ao seu cérebro para ativar o sistema nervoso parassimpático.
                                    Isso reduz a frequência cardíaca, baixa o cortisol (hormônio do estresse) e promove um estado imediato de calma e relaxamento.
                                </p>
                            </section>

                            <hr className=" border-border " />

                            {/* Section 2: Dicas */}
                            <section>
                                <h3 className="text-lg font-semibold text-teal-600 dark:text-teal-400 mb-4 flex items-center gap-2">
                                    <SparklesIcon className="w-5 h-5" />
                                    Dicas para praticar
                                </h3>
                                <ul className="space-y-3 text-foreground-muted text-sm">
                                    <li className="flex items-start gap-3">
                                        <div className="w-2 h-2 mt-1.5 rounded-full bg-teal-400 shrink-0"></div>
                                        <p><strong className=" text-foreground-muted ">Encontre uma posição confortável:</strong> Sentado com as costas retas ou deitado.</p>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <div className="w-2 h-2 mt-1.5 rounded-full bg-teal-400 shrink-0"></div>
                                        <p><strong className=" text-foreground-muted ">Inspire pelo nariz:</strong> Sinta sua barriga encher como um balão (respiração diafragmática).</p>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <div className="w-2 h-2 mt-1.5 rounded-full bg-teal-400 shrink-0"></div>
                                        <p><strong className=" text-foreground-muted ">Expire lentamente:</strong> Solte o ar pela boca ou nariz, relaxando os ombros.</p>
                                    </li>
                                </ul>
                            </section>

                            <hr className=" border-border " />

                            {/* Section 3: Techniques */}
                            <section>
                                <h3 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-5">Entenda as Técnicas</h3>

                                <div className="space-y-3">
                                    <div className=" bg-surface p-4 rounded-2xl">
                                        <h4 className="font-semibold text-sm text-on-surface mb-1">Respiração em Caixa (4-4-4-4)</h4>
                                        <p className="text-xs text-foreground-muted leading-relaxed">
                                            Equilíbrio e harmonia. Imagine percorrendo os lados de uma caixa: inspirar, segurar, expirar, segurar. Ótimo para foco intenso e ansiedade.
                                        </p>
                                    </div>

                                    <div className=" bg-surface p-4 rounded-2xl">
                                        <h4 className="font-semibold text-sm text-on-surface mb-1">Expiração Longa (4-7-8)</h4>
                                        <p className="text-xs text-foreground-muted leading-relaxed">
                                            Dorme mais rápido. A expiração prolongada ajuda a expulsar todo o CO2 e "desligar" o estado de alerta.
                                            <span className="flex items-center gap-1 mt-1 text-amber-500 italic">
                                                <AlertTriangle className="w-3.5 h-3.5" />
                                                Cuidado com tontura leve no início.
                                            </span>
                                        </p>
                                    </div>

                                    <div className=" bg-surface p-4 rounded-2xl">
                                        <h4 className="font-semibold text-sm text-on-surface mb-1">Coerência Cardíaca (5-0-5)</h4>
                                        <p className="text-xs text-foreground-muted leading-relaxed">
                                            Clareza mental e foco. Um ritmo contínuo que iguala a entrada e saída de O2, sincronizando coração e cérebro.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            <button
                                onClick={() => setShowInfo(false)}
                                className="w-full py-3.5 bg-indigo-950 text-white rounded-full font-semibold text-sm hover:bg-indigo-900 transition-colors duration-300 mt-4"
                            >
                                Entendi, vamos começar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
