
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile } from '@/services/authService';
import { Input } from '../Form';
import Button from '../Button';
import { User, ServiceHours, DaySchedule } from '@/types';
import { useToast } from '@/contexts/ToastContext';

const WEEKDAYS = [
    { id: 1, label: 'Segunda-feira' },
    { id: 2, label: 'Terça-feira' },
    { id: 3, label: 'Quarta-feira' },
    { id: 4, label: 'Quinta-feira' },
    { id: 5, label: 'Sexta-feira' },
    { id: 6, label: 'Sábado' },
    { id: 0, label: 'Domingo' },
];

const DEFAULT_SCHEDULE: DaySchedule = {
    enabled: false,
    start: '08:00',
    end: '18:00',
    breaks: []
};

export const ServiceHoursSettings: React.FC = () => {
    const { currentUser, refreshUsers } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [hours, setHours] = useState<ServiceHours>({} as ServiceHours);
 const { addToast } = useToast();

    useEffect(() => {
        // Initialize with default structure first
        const initial: any = {};
        WEEKDAYS.forEach(d => initial[d.id] = { ...DEFAULT_SCHEDULE });

        if (currentUser && currentUser.serviceHours) {
            // Merge saved hours into default structure
            // This handles partial updates or missing keys securely
            const saved = currentUser.serviceHours;
            Object.keys(saved).forEach((key: string) => {
                const dayId = parseInt(key);
                if (!isNaN(dayId)) {
                    initial[dayId] = { ...initial[dayId], ...(saved as any)[key] };
                }
            });
            setHours(initial);
        } else {
            // No service hours found in current user, using defaults
            setHours(initial);
        }
    }, [currentUser]);

    const handleDayToggle = (dayId: number) => {
        setHours(prev => {
            const current = prev[dayId as keyof ServiceHours] || { ...DEFAULT_SCHEDULE };
            return {
                ...prev,
                [dayId]: { ...current, enabled: !current.enabled }
            };
        });
    };

    const handleTimeChange = (dayId: number, field: 'start' | 'end', value: string) => {
        setHours(prev => ({
            ...prev,
            [dayId]: { ...prev[dayId as keyof ServiceHours], [field]: value }
        }));
    };

    const handleCopyTime = (fromDayId: number) => {
        const source = hours[fromDayId as keyof ServiceHours];
        if (!source) return;

        const newHours = { ...hours };
        WEEKDAYS.forEach(day => {
            if (day.id !== fromDayId) {
                newHours[day.id as keyof ServiceHours] = {
                    ...newHours[day.id as keyof ServiceHours],
                    start: source.start,
                    end: source.end,
                    enabled: source.enabled // Copy enabled state too? Maybe.
                };
            }
        });
        setHours(newHours);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;
        setIsLoading(true);
        try {
            const { success, error } = await updateProfile(currentUser.id, { serviceHours: hours });
            if (success) {
                await refreshUsers();
 addToast('Horários atualizados com sucesso!', 'success');
            } else {
 addToast('Erro: ' + error, 'error');
            }
        } catch (err) {
 console.error(err);
 addToast('Erro ao salvar.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-surface-container-lowest p-6 rounded-[32px] border border-border/40 dark:border-white/10 shadow-sm space-y-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-[13px] font-black text-foreground uppercase tracking-tight">Horários de Atendimento</h3>
                    <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mt-1 opacity-70">
                        Defina seus horários disponíveis para agendamento online.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-3">
                    {WEEKDAYS.map(day => {
                        const schedule = hours[day.id as keyof ServiceHours] || DEFAULT_SCHEDULE;
                        return (
                            <div key={day.id} className="flex items-center space-x-4 p-4 rounded-3xl bg-surface/50 dark:bg-slate-700/20 border border-border/40">
                                <div className="flex items-center h-5 w-32">
                                    <input
                                        id={`day-${day.id}`}
                                        type="checkbox"
                                        checked={schedule.enabled}
                                        onChange={() => handleDayToggle(day.id)}
                                        className="focus:ring-primary h-4 w-4 text-primary border-border/60 rounded"
                                    />
                                    <label htmlFor={`day-${day.id}`} className="ml-3 text-[11px] font-black text-foreground uppercase tracking-wider">
                                        {day.label}
                                    </label>
                                </div>

                                <div className={`flex-1 flex items-center space-x-4 transition-opacity ${schedule.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                                    <div className="flex items-center space-x-2">
                                        <Input
                                            type="time"
                                            value={schedule.start}
                                            onChange={(e) => handleTimeChange(day.id, 'start', e.target.value)}
                                            className="w-32"
                                        />
                                        <span className=" text-foreground-muted ">até</span>
                                        <Input
                                            type="time"
                                            value={schedule.end}
                                            onChange={(e) => handleTimeChange(day.id, 'end', e.target.value)}
                                            className="w-32"
                                        />
                                    </div>

                                    {/* Optional: Add Breaks */}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex justify-end pt-4 border-t border-border ">
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? 'Salvando...' : 'Salvar Horários'}
                    </Button>
                </div>
            </form>
        </div>
    );
};
