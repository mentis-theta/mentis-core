import React from 'react';
import { useTheme } from '@/hooks/useTheme';
import { Check, Sparkles, Layout } from 'lucide-react';
import { BRAND_COLORS } from '@/utils/colorTokens';

export const ThemeSelector: React.FC = () => {
    const { themeMode, setThemeMode } = useTheme();

    const themes = [
        {
            id: 'theta',
            name: 'Theta',
            description: 'Roxo Clínico (Novo Padrão)',
            previewColor: BRAND_COLORS.primary,
            icon: <Sparkles className="w-5 h-5" />
        },
        {
            id: 'classic',
            name: 'Classic',
            description: 'Verde Mentis (Original)',
            previewColor: '#2D6A4F',
            icon: <Layout className="w-5 h-5" />
        }
    ] as const;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {themes.map((theme) => {
                    const isSelected = themeMode === theme.id;
                    return (
                        <button
                            key={theme.id}
                            onClick={() => setThemeMode(theme.id)}
                            className={`
                                relative flex items-start p-4 rounded-2xl border-2 transition-all text-left
                                ${isSelected
                                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                                    : 'border-border/40 hover:border-border hover:bg-surface-dim'
                                }
                            `}
                        >
                            <div className={`
                                p-3 rounded-xl mr-4
                                ${isSelected ? 'bg-primary text-white' : 'bg-surface-container text-foreground-muted'}
                            `}>
                                {theme.icon}
                            </div>
                            <div className="flex-1">
                                <h5 className={`font-bold text-sm ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                                    {theme.name}
                                </h5>
                                <p className="text-xs text-foreground-muted mt-1 leading-relaxed">
                                    {theme.description}
                                </p>
                            </div>
                            {isSelected && (
                                <div className="absolute top-3 right-3 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                    <Check className="w-3 h-3 text-white" />
                                </div>
                            )}
                            <div
                                className="absolute bottom-3 right-3 w-12 h-1.5 rounded-full"
                                style={{ backgroundColor: theme.previewColor }}
                            />
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
