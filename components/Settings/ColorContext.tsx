import React, { createContext, useContext, useState, useEffect } from 'react';

export type ColorName = 'slate' | 'gray' | 'red' | 'orange' | 'amber' | 'yellow' | 'lime' | 'green' | 'emerald' | 'teal' | 'cyan' | 'sky' | 'blue' | 'indigo' | 'violet' | 'purple' | 'fuchsia' | 'pink' | 'rose';

export interface StatusColorSettings {
    scheduled: ColorName;
    completed: ColorName;
    canceled: ColorName;
    missed: ColorName;
    active: ColorName;
    inactive: ColorName;
    archived: ColorName;
    discharged: ColorName;
}

export const AVAILABLE_COLORS: { name: ColorName; label: string; hex: string }[] = [
    { name: 'slate', label: 'Cinza', hex: '#64748b' },
    { name: 'gray', label: 'Cinza Escuro', hex: '#4b5563' },
    { name: 'red', label: 'Vermelho', hex: '#ef4444' },
    { name: 'orange', label: 'Laranja', hex: '#f97316' },
    { name: 'amber', label: 'Âmbar', hex: '#f59e0b' },
    { name: 'yellow', label: 'Amarelo', hex: '#eab308' },
    { name: 'lime', label: 'Lima', hex: '#84cc16' },
    { name: 'green', label: 'Verde', hex: '#22c55e' },
    { name: 'emerald', label: 'Esmeralda', hex: '#10b981' },
    { name: 'teal', label: 'Verde Água', hex: '#14b8a6' },
    { name: 'cyan', label: 'Ciano', hex: '#06b6d4' },
    { name: 'sky', label: 'Azul Céu', hex: '#0ea5e9' },
    { name: 'blue', label: 'Azul', hex: '#3b82f6' },
    { name: 'indigo', label: 'Índigo', hex: '#6366f1' },
    { name: 'violet', label: 'Violeta', hex: '#8b5cf6' },
    { name: 'purple', label: 'Roxo', hex: '#a855f7' },
    { name: 'fuchsia', label: 'Fúcsia', hex: '#d946ef' },
    { name: 'pink', label: 'Rosa', hex: '#ec4899' },
    { name: 'rose', label: 'Rosa Escuro', hex: '#f43f5e' },
];

const DEFAULT_COLORS: StatusColorSettings = {
    scheduled: 'blue',
    completed: 'green',
    canceled: 'red',
    missed: 'orange',
    active: 'green',
    inactive: 'slate',
    archived: 'gray',
    discharged: 'teal'
};

interface ColorContextType {
    colors: StatusColorSettings;
    updateColor: (status: keyof StatusColorSettings, color: ColorName) => void;
    resetDefaults: () => void;
    getColorClasses: (color: ColorName, variant?: 'solid' | 'soft' | 'outline') => string;
}

const ColorContext = createContext<ColorContextType | undefined>(undefined);

export const ColorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [colors, setColors] = useState<StatusColorSettings>(DEFAULT_COLORS);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('mentis_v1_colors');
        if (saved) {
            try {
                setColors({ ...DEFAULT_COLORS, ...JSON.parse(saved) });
            } catch (e) {
 console.error("Failed to parse saved colors", e);
            }
        }
        setIsLoaded(true);
    }, []);

    const updateColor = (status: keyof StatusColorSettings, color: ColorName) => {
        const newColors = { ...colors, [status]: color };
        setColors(newColors);
        localStorage.setItem('mentis_v1_colors', JSON.stringify(newColors));
    };

    const resetDefaults = () => {
        setColors(DEFAULT_COLORS);
        localStorage.setItem('mentis_v1_colors', JSON.stringify(DEFAULT_COLORS));
    };

    // Dicionário estático para evitar interpolação dinâmica de strings no Tailwind JIT (Rule 3)
    const COLOR_CLASS_MAP: Record<ColorName, { solid: string; soft: string; outline: string }> = {
        slate: {
            solid: 'bg-slate-600 text-white',
            soft: 'bg-slate-100 text-slate-800 dark:bg-slate-900/50 dark:text-slate-200 border-slate-200 dark:border-slate-700',
            outline: 'border border-slate-500 text-slate-600 dark:text-slate-400',
        },
        gray: {
            solid: 'bg-gray-600 text-white',
            soft: 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200 border-gray-200 dark:border-gray-700',
            outline: 'border border-gray-500 text-gray-600 dark:text-gray-400',
        },
        red: {
            solid: 'bg-red-600 text-white',
            soft: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 border-red-200 dark:border-red-700',
            outline: 'border border-red-500 text-red-600 dark:text-red-400',
        },
        orange: {
            solid: 'bg-orange-600 text-white',
            soft: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200 border-orange-200 dark:border-orange-700',
            outline: 'border border-orange-500 text-orange-600 dark:text-orange-400',
        },
        amber: {
            solid: 'bg-amber-600 text-white',
            soft: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 border-amber-200 dark:border-amber-700',
            outline: 'border border-amber-500 text-amber-600 dark:text-amber-400',
        },
        yellow: {
            solid: 'bg-yellow-600 text-white',
            soft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700',
            outline: 'border border-yellow-500 text-yellow-600 dark:text-yellow-400',
        },
        lime: {
            solid: 'bg-lime-600 text-white',
            soft: 'bg-lime-100 text-lime-800 dark:bg-lime-900/50 dark:text-lime-200 border-lime-200 dark:border-lime-700',
            outline: 'border border-lime-500 text-lime-600 dark:text-lime-400',
        },
        green: {
            solid: 'bg-green-600 text-white',
            soft: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 border-green-200 dark:border-green-700',
            outline: 'border border-green-500 text-green-600 dark:text-green-400',
        },
        emerald: {
            solid: 'bg-emerald-600 text-white',
            soft: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 border-emerald-200 dark:border-emerald-700',
            outline: 'border border-emerald-500 text-emerald-600 dark:text-emerald-400',
        },
        teal: {
            solid: 'bg-teal-600 text-white',
            soft: 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200 border-teal-200 dark:border-teal-700',
            outline: 'border border-teal-500 text-teal-600 dark:text-teal-400',
        },
        cyan: {
            solid: 'bg-cyan-600 text-white',
            soft: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200 border-cyan-200 dark:border-cyan-700',
            outline: 'border border-cyan-500 text-cyan-600 dark:text-cyan-400',
        },
        sky: {
            solid: 'bg-sky-600 text-white',
            soft: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200 border-sky-200 dark:border-sky-700',
            outline: 'border border-sky-500 text-sky-600 dark:text-sky-400',
        },
        blue: {
            solid: 'bg-blue-600 text-white',
            soft: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 border-blue-200 dark:border-blue-700',
            outline: 'border border-blue-500 text-blue-600 dark:text-blue-400',
        },
        indigo: {
            solid: 'bg-indigo-600 text-white',
            soft: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200 border-indigo-200 dark:border-indigo-700',
            outline: 'border border-indigo-500 text-indigo-600 dark:text-indigo-400',
        },
        violet: {
            solid: 'bg-violet-600 text-white',
            soft: 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200 border-violet-200 dark:border-violet-700',
            outline: 'border border-violet-500 text-violet-600 dark:text-violet-400',
        },
        purple: {
            solid: 'bg-purple-600 text-white',
            soft: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200 border-purple-200 dark:border-purple-700',
            outline: 'border border-purple-500 text-purple-600 dark:text-purple-400',
        },
        fuchsia: {
            solid: 'bg-fuchsia-600 text-white',
            soft: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/50 dark:text-fuchsia-200 border-fuchsia-200 dark:border-fuchsia-700',
            outline: 'border border-fuchsia-500 text-fuchsia-600 dark:text-fuchsia-400',
        },
        pink: {
            solid: 'bg-pink-600 text-white',
            soft: 'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-200 border-pink-200 dark:border-pink-700',
            outline: 'border border-pink-500 text-pink-600 dark:text-pink-400',
        },
        rose: {
            solid: 'bg-rose-600 text-white',
            soft: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200 border-rose-200 dark:border-rose-700',
            outline: 'border border-rose-500 text-rose-600 dark:text-rose-400',
        },
    };

    const getColorClasses = (color: ColorName, variant: 'solid' | 'soft' | 'outline' = 'soft') => {
        return COLOR_CLASS_MAP[color]?.[variant] || COLOR_CLASS_MAP.slate[variant];
    };

    if (!isLoaded) return null; // Prevent flash of default colors

    return (
        <ColorContext.Provider value={{ colors, updateColor, resetDefaults, getColorClasses }}>
            {children}
        </ColorContext.Provider>
    );
};

export const useColors = () => {
    const context = useContext(ColorContext);
    if (!context) {
        throw new Error('useColors must be used within a ColorProvider');
    }
    return context;
};
