import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile } from '@/services/authService';
import Button from '@/components/Button';
import { useToast } from '@/contexts/ToastContext';
import { Layout, Palette, Check } from 'lucide-react';
import { User } from '@/types';

import { Building2, FileText, Zap, Smile, BookOpen, Leaf, Sofa } from 'lucide-react';


const AVAILABLE_COLORS = [
    { id: 'lilas', name: 'Lilás / Roxo', bg: 'bg-indigo-500', ring: 'ring-indigo-500' },
    { id: 'azul', name: 'Azul / Sereno', bg: 'bg-blue-500', ring: 'ring-blue-500' },
    { id: 'verde', name: 'Verde / Cura', bg: 'bg-emerald-500', ring: 'ring-emerald-500' },
    { id: 'preto', name: 'Preto / Neutro', bg: 'bg-slate-800', ring: 'ring-slate-800' },
];

export const VisualSection = () => {
    const { currentUser, refreshUsers } = useAuth();
    const { addToast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    // State
    const [colorScheme, setColorScheme] = useState<User['colorScheme']>('lilas');

    useEffect(() => {
        if (currentUser) {
            // Fallback for legacy 'theme' field if colorScheme is missing
            if (currentUser.colorScheme) {
                setColorScheme(currentUser.colorScheme);
            } else if (currentUser.theme) {
                // Simple migration map
                const legacyMap: Record<string, User['colorScheme']> = { 'purple': 'lilas', 'blue': 'azul', 'green': 'verde', 'black': 'preto' };
                setColorScheme((legacyMap[currentUser.theme] || 'lilas') as User['colorScheme']);
            }
        }
    }, [currentUser]);

    const handleSave = async () => {
        if (!currentUser) return;
        setIsLoading(true);
        try {
            const { success, error } = await updateProfile(currentUser.id, {
                colorScheme
            });

            if (success) {
                await refreshUsers();
                addToast("Aparência atualizada!", "success");
            } else {
                addToast(error || "Erro ao atualizar.", "error");
            }
        } catch (error) {
            addToast("Erro ao processar.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-surface-container-lowest p-6 rounded-[32px] border border-border/40 dark:border-white/10 shadow-sm space-y-8">

            {/* LINK PREVIEW HINT */}
            <div className="bg-canvas p-4 rounded-2xl border border-border/40 text-[10px] font-bold uppercase tracking-widest text-foreground-muted flex justify-between items-center">
                <span>Personalize como seu cartão de visitas digital aparece para os pacientes.</span>
                {currentUser?.bioSlug && (
                    <a href={`/psi/${currentUser.bioSlug}`} target="_blank" rel="noreferrer" className="text-primary hover:underline font-black">
                        Ver Página →
                    </a>
                )}
            </div>



            {/* COLOR SCHEME SELECTOR */}
            <div>
                <h3 className="text-[13px] font-black text-foreground uppercase tracking-tight mb-2 flex items-center">
                    <Palette className="w-4 h-4 mr-2 text-primary/60" />
                    Paleta de Cores
                </h3>
                <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mb-6 opacity-70">Defina a cor principal dos botões e destaques.</p>

                <div className="flex flex-wrap gap-4">
                    {AVAILABLE_COLORS.map(color => {
                        const isSelected = colorScheme === color.id;
                        return (
                            <div
                                key={color.id}
                                onClick={() => setColorScheme(color.id as User['colorScheme'])}
                                className={`
                                    cursor-pointer flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all min-w-[160px] hover:bg-surface-container-high
                                    ${isSelected ? `border-primary bg-primary/5` : 'border-border/40'}
                                `}
                            >
                                <div className={`w-8 h-8 rounded-full shadow-sm ${color.bg} border-2 border-white ring-1 ring-slate-200`}></div>
                                <div className="flex flex-col">
                                    <span className={`text-sm font-bold ${isSelected ? ' text-on-surface ' : ' text-foreground-muted '}`}>
                                        {color.name.split(' / ')[0]}
                                    </span>
                                    <span className="text-[10px] text-foreground-muted uppercase tracking-wider">
                                        {color.name.split(' / ')[1]}
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <Button onClick={handleSave} disabled={isLoading} size="lg" className="px-8 bg-slate-900 text-white hover:bg-slate-800">
                    {isLoading ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
            </div>
        </div>
    );
};
