import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile } from '@/services/authService';
import Button from '../../Button';
import { Input } from '../../Form';
import { useToast } from '@/contexts/ToastContext';
import { Check, Layout, Palette, Sparkles } from 'lucide-react';
import { ThemeSelector } from './ThemeSelector';
import Logo from '../../ui/Logo';

import { Building2, FileText, Zap, Smile, BookOpen, Leaf, Sofa, Upload, Trash2 } from 'lucide-react';
import { BRAND_COLORS as SSOT_BRAND_COLORS } from '@/utils/colorTokens';

// ─── Cores da Marca ────────────────────────────────────────────────
const BRAND_COLORS = [
    { name: 'cinematic', label: 'Cinematic Purple (Oficial)', hex: SSOT_BRAND_COLORS.primary },
    { name: 'blue', label: 'Azul Clássico', hex: '#3b82f6' },
    { name: 'indigo', label: 'Indigo', hex: '#6366f1' },
    { name: 'violet', label: 'Violeta Soft', hex: '#8b5cf6' },
    { name: 'purple', label: 'Roxo Vibrante', hex: '#a855f7' },
    { name: 'emerald', label: 'Esmeralda', hex: '#10b981' },
    { name: 'rose', label: 'Rose', hex: '#f43f5e' },
    { name: 'sky', label: 'Céu', hex: '#0ea5e9' },
    { name: 'amber', label: 'Dourado', hex: '#f59e0b' },
    { name: 'slate', label: 'Grafite', hex: '#64748b' },
];

export const BrandingSettings: React.FC = () => {
    const { currentUser, refreshUsers } = useAuth();
    const { addToast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const [clinicName, setClinicName] = useState(currentUser?.clinicName || '');
    const [selectedColor, setSelectedColor] = useState<string>(currentUser?.colorScheme || 'blue');
    const [previewLogo, setPreviewLogo] = useState<string | null>(currentUser?.logoUrl || null);

    useEffect(() => {
        if (currentUser) {
            setClinicName(currentUser.clinicName || '');
            setSelectedColor(currentUser.colorScheme || 'blue');
            setPreviewLogo(currentUser.logoUrl || null);
        }
    }, [currentUser]);

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewLogo(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        if (!currentUser) return;
        setIsSaving(true);
        try {
            const { success, error } = await updateProfile(currentUser.id, {
                clinicName,
                logoUrl: previewLogo,
                colorScheme: selectedColor as any,
            });
            if (success) {
                await refreshUsers();
                addToast('Identidade visual salva!', 'success');
            } else {
                addToast(error || 'Erro ao salvar.', 'error');
            }
        } catch {
            addToast('Erro ao salvar a identidade visual.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8">

            {/* ── Marca e Logotipo ─────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-surface-container-lowest p-6 rounded-[32px] border border-border/40 dark:border-white/10 shadow-sm space-y-6">
                    <h4 className="text-[13px] font-black text-foreground uppercase tracking-tight flex items-center">
                        Marca e Logotipo
                    </h4>

                    {/* Logo upload */}
                    <div className="flex flex-col items-center p-6 bg-surface/50 dark:bg-slate-700/20 rounded-3xl border-2 border-dashed border-border/40">
                        <div className="w-48 h-24 mb-4 flex items-center justify-center bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden border border-border/10">
                            {previewLogo ? (
                                <img src={previewLogo} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                            ) : (
                                <div className="flex flex-col items-center justify-center text-foreground-muted opacity-70">
                                    <Logo className="h-8 w-auto mb-1" />
                                    <span className="text-[10px] uppercase font-bold tracking-widest">Padrão do Sistema</span>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3 mt-1">
                            <label className="cursor-pointer">
                                <span className=" bg-surface border border-border rounded-md py-2 px-4 inline-flex items-center justify-center gap-2 text-sm font-medium text-foreground-muted shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700">
                                    <Upload className="w-4 h-4" /> Carregar Logotipo
                                </span>
                                <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                            </label>
                            {previewLogo && (
                                <button
                                    onClick={() => setPreviewLogo(null)}
                                    className="bg-surface border border-border rounded-md py-2 px-4 inline-flex items-center justify-center gap-2 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                    <Trash2 className="w-4 h-4" /> Remover
                                </button>
                            )}
                        </div>
                        <p className="text-xs text-foreground-muted mt-2">Recomendado: PNG Transparente (200×100px)</p>
                    </div>

                    <Input
                        id="clinicName"
                        label="Nome da Clínica / Consultório"
                        value={clinicName}
                        onChange={(e) => setClinicName(e.target.value)}
                        placeholder={currentUser?.name || 'Ex: Clínica Mentis'}
                    />
                    <p className="text-xs text-foreground-muted ">Este nome aparecerá no cabeçalho dos documentos e do Portal.</p>
                </div>

                {/* ── Cor Principal ──────────────────────────────── */}
                <div className="bg-surface-container-lowest p-6 rounded-[32px] border border-border/40 dark:border-white/10 shadow-sm space-y-6">
                    <h4 className="text-[13px] font-black text-foreground uppercase tracking-tight flex items-center gap-2">
                        <Palette className="w-4 h-4 text-primary/60" />
                        Cor Principal do Portal
                    </h4>

                    <div className="grid grid-cols-3 gap-3">
                        {BRAND_COLORS.map(color => (
                            <button
                                key={color.name}
                                onClick={() => setSelectedColor(color.name)}
                                className={`
                                    relative flex flex-col items-center p-3 rounded-2xl border transition-all
                                    ${selectedColor === color.name
                                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                                        : 'border-border/40 hover:border-border'
                                    }
                                `}
                            >
                                <div
                                    className="w-8 h-8 rounded-full mb-2 shadow-sm"
                                    style={{ backgroundColor: color.hex }}
                                />
                                <span className="text-xs font-medium text-foreground-muted text-center leading-tight">
                                    {color.label}
                                </span>
                                {selectedColor === color.name && (
                                    <Check className="absolute top-1.5 right-1.5 w-3 h-3 text-blue-600" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Preview */}
                    <div className="p-4 rounded-lg bg-surface border border-border ">
                        <p className="text-sm text-foreground-muted mb-2">Pré-visualização do Portal:</p>
                        <div
                            className="h-16 rounded-lg shadow-md flex items-center justify-center text-white font-bold text-sm"
                            style={{
                                background: `linear-gradient(135deg, ${BRAND_COLORS.find(c => c.name === selectedColor)?.hex || '#3b82f6'}, #1e293b)`
                            }}
                        >
                            Portal do Paciente
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Tema do Sistema (M3) ────────────────────────── */}
            <div className="bg-surface-container-lowest p-6 rounded-[32px] border border-border/40 dark:border-white/10 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                    <h4 className="text-[13px] font-black text-foreground uppercase tracking-tight flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary/60" />
                        Aparência do Mentis
                    </h4>
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full uppercase tracking-wider">
                        Novo
                    </span>
                </div>
                <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest opacity-70">
                    Escolha o tema visual para sua experiência de trabalho.
                </p>
                <ThemeSelector />
            </div>

            {/* Card-level save button (M3) */}
            <div className="flex justify-end pt-2 border-t border-border ">
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Salvando...' : 'Salvar Identidade Visual'}
                </Button>
            </div>
        </div>
    );
};
