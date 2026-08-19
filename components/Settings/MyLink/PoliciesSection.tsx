import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile } from '@/services/authService';
import Button from '@/components/Button';
import { Input, Select } from '@/components/Form';
import { ShieldCheckIcon, GlobeIcon } from '@/components/Icons';
import { SchedulingSettings } from '@/types';
import { useToast } from '@/contexts/ToastContext';

export const PoliciesSection = () => {
    const { currentUser, refreshUsers } = useAuth();
 const { addToast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    // Default settings
    const defaultSettings: SchedulingSettings = {
        active: false,
        futureDays: 30,
        bufferMinutes: 10,
        minAdvanceHours: 24,
        confirmationDays: 1,
        allowCancellation: true,
        cancellationHours: 24,
        sessionDuration: 60
    };

    const [settings, setSettings] = useState<SchedulingSettings>({
        ...defaultSettings,
        ...(currentUser?.schedulingSettings || {})
    });

    const handleSave = async () => {
        if (!currentUser) return;
        setIsLoading(true);
        try {
            const { success, error } = await updateProfile(currentUser.id, { schedulingSettings: settings });
            if (success) {
                await refreshUsers();
 addToast("Políticas de agendamento salvas!", "success");
            } else {
 addToast(error || "Erro ao salvar.", "error");
            }
        } catch (error) {
 addToast("Erro ao processar.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const updateSetting = (field: keyof SchedulingSettings, value: any) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="bg-surface-container-lowest p-6 rounded-[32px] border border-border/40 dark:border-white/10 shadow-sm space-y-6">
            <h3 className="text-[13px] font-black text-foreground uppercase tracking-tight mb-4 flex items-center">
                <ShieldCheckIcon className="w-4 h-4 mr-2 text-primary/60" />
                Controles e Políticas
            </h3>

            {/* Global Switch */}
            <div className="flex items-center justify-between bg-primary/5 p-5 rounded-[24px] border border-primary/10">
                <div className="flex items-center gap-4">
                    <GlobeIcon className="w-6 h-6 text-primary" />
                    <div>
                        <h4 className="text-sm font-black text-foreground uppercase tracking-tight">Liberar Site de Agendamento</h4>
                        <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mt-1 opacity-70">Se desativado, seu link público mostrará uma mensagem de "Agenda Fechada".</p>
                    </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={settings.active}
                        onChange={e => updateSetting('active', e.target.checked)}
                        className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h4 className="text-[11px] font-black text-foreground uppercase tracking-wider mb-4 border-b border-border/40 pb-2">Janelas de Tempo</h4>
                    <div className="space-y-4">
                        <Input
                            label="Abrir agenda para (dias futuros)"
                            type="number"
                            value={settings.futureDays?.toString() || ''}
                            onChange={e => updateSetting('futureDays', parseInt(e.target.value) || 0)}
                            min="1"
                        />
                        <Input
                            label="Intervalo entre atendimentos (min)"
                            type="number"
                            value={settings.bufferMinutes?.toString() || '0'}
                            onChange={e => updateSetting('bufferMinutes', parseInt(e.target.value) || 0)}
                            min="0"
                        />
                        <div>
                            <Input
                                label="Tempo de sessão padrão (min)"
                                type="number"
                                value={settings.sessionDuration?.toString() || '60'}
                                onChange={e => updateSetting('sessionDuration', parseInt(e.target.value) || 60)}
                                min="15"
                            />
                            <p className="text-[10px] text-foreground-muted mt-1 italic">
                                Define o tamanho exato dos blocos de horário na sua agenda pública (Motor do Calendário). A duração individual cadastrada em cada "Serviço" serve apenas como vitrine para o paciente.
                            </p>
                        </div>
                        <Input
                            label="Antecedência mínima (horas)"
                            type="number"
                            value={settings.minAdvanceHours?.toString() || '24'}
                            onChange={e => updateSetting('minAdvanceHours', parseInt(e.target.value) || 0)}
                            min="0"
                        />
                    </div>
                </div>

                <div>
                    <h4 className="text-[11px] font-black text-foreground uppercase tracking-wider mb-4 border-b border-border/40 pb-2">Confirmação e Cancelamento</h4>
                    <div className="space-y-4">
                        <Input
                            label="Enviar lembrete (dias antes)"
                            type="number"
                            value={settings.confirmationDays?.toString() || ''}
                            onChange={e => updateSetting('confirmationDays', parseInt(e.target.value) || 0)}
                            min="0"
                        />

                        <div className="pt-2">
                            <label className="flex items-center mb-2 text-sm font-medium text-foreground-muted ">
                                <input
                                    type="checkbox"
                                    checked={settings.allowCancellation}
                                    onChange={e => updateSetting('allowCancellation', e.target.checked)}
                                    className="rounded border-border text-blue-600 shadow-sm mr-2"
                                />
                                Permitir cancelamento pelo paciente
                            </label>

                            {settings.allowCancellation && (
                                <Input
                                    label="Limite p/ cancelamento sem multa (horas antes)"
                                    type="number"
                                    value={settings.cancellationHours?.toString() || ''}
                                    onChange={e => updateSetting('cancellationHours', parseInt(e.target.value) || 0)}
                                    min="1"
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border ">
                <Button onClick={handleSave} disabled={isLoading}>
                    {isLoading ? 'Salvando...' : 'Salvar Políticas'}
                </Button>
            </div>
        </div>
    );
};
