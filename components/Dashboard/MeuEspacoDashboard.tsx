import React, { useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePatientContext } from '@/contexts/PatientContext';
import { useFinancialData } from '@/hooks/useFinancialData';
import { useReminders } from '@/hooks/useReminders';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';

import { CalendarIcon, BellIcon, PlusIcon, EllipsisVerticalIcon, CheckIcon } from '@/components/Icons';
import Button from '@/components/Button';
import { ReminderBoardWidget } from './ReminderBoardWidget';
import { HomeStatistics } from './HomeStatistics';
import { AniversariantesWidget } from './AniversariantesWidget';
import { AtividadesRecentesWidget } from './AtividadesRecentesWidget';
import { HomeOperationalSummary } from './HomeOperationalSummary';
import { AddReminderModal } from '@/components/Modals/AddReminderModal';
import AgendaDoDia from './AgendaDoDia';

// Widgets logic
import CalendarView from '@/components/CalendarView';

import { useNavigate } from 'react-router-dom';
import { getWhatsAppLink } from '@/utils/whatsapp';
import { WhatsappIcon, ClockIcon } from '../Icons';

export const MeuEspacoDashboard: React.FC = () => {
    const { currentUser } = useAuth();
    const { patients } = usePatientContext();
    const { current } = useFinancialData(); // For Revenue
    const { reminders, toggleComplete, fetchReminders, deleteReminder } = useReminders();
    const { metrics, isLoading } = useDashboardMetrics(); // Useful for todaysSessions and birthdays

    const navigate = useNavigate();

    const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);

    // Derived Metrics - Memoized to avoid recalc on every render
    const metricsSummary = useMemo(() => {
        const activeRemindersCount = reminders.filter(r => !r.is_completed).length;
        const todaySessionsCount = metrics.todaysSessions.length;
        const activePatientsCount = patients.filter(p => p.status === 'active').length;
        const monthlyRevenue = current?.revenue || 0;

        return {
            activeRemindersCount,
            todaySessionsCount,
            activePatientsCount,
            monthlyRevenue
        };
    }, [reminders, metrics.todaysSessions, patients, current]);

    // Greeting
    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        return hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
    }, []);

    const firstName = useMemo(() => currentUser?.name.split(' ')[0] || 'Psicólogo', [currentUser?.name]);

    // Callbacks - Specialized to avoid stale closures and unnecessary re-renders
    const handleToggleComplete = useCallback((id: string) => {
        toggleComplete(id, false);
    }, [toggleComplete]);

    const handleRestoreReminder = useCallback((id: string) => {
        toggleComplete(id, true);
    }, [toggleComplete]);

    const handleDeleteReminder = useCallback((id: string) => {
        deleteReminder(id);
    }, [deleteReminder]);

    const handleOpenReminderModal = useCallback(() => {
        setIsReminderModalOpen(true);
    }, []);

    const handleCloseReminderModal = useCallback(() => {
        setIsReminderModalOpen(false);
    }, []);

    return (
        <div className="p-6 md:p-8 space-y-8 bg-transparent min-h-full overflow-y-auto pb-20">
            {/* 1. Sumário Operacional Refatorado (Tailwind + M3) */}
            <HomeOperationalSummary
                activePatients={metricsSummary.activePatientsCount}
                todaysSessions={metricsSummary.todaySessionsCount}
                activeReminders={metricsSummary.activeRemindersCount}
                scheduledIssues={metricsSummary.todaySessionsCount}
                draftSessionsCount={metrics.draftSessionsCount}
            />

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* LEFT COLUMN (60% -> 3/5 cols) */}
                <div className="lg:col-span-3 space-y-6">
                    {/* COMPONENTE AGENDA DO DIA (OFICIAL M3) */}
                    <div className="mb-6 w-full relative min-h-[469px]">
                        <AgendaDoDia todaysSessions={metrics.todaysSessions} />
                    </div>

                    {/* Componente Atividades Recentes M3 Oficial */}
                    <div className="mt-6 flex justify-center">
                        <AtividadesRecentesWidget 
                            activities={metrics.recentActivities} 
                            isLoading={isLoading} 
                            onActivityClick={(id) => navigate('/patients/' + id)} 
                        />
                    </div>
                </div>

                {/* RIGHT COLUMN (40% -> 2/5 cols) */}
                <div className="lg:col-span-2 space-y-6">
                    <HomeStatistics
                        activePatients={metricsSummary.activePatientsCount}
                        completedSessions={metrics.sessionsCountMonth}
                        monthlyRevenue={metricsSummary.monthlyRevenue}
                    />

                    {/* Row 2: Reminder Board */}
                    <ReminderBoardWidget
                        reminders={reminders}
                        patients={patients}
                        onComplete={handleToggleComplete}
                        onRestore={handleRestoreReminder}
                        onDelete={handleDeleteReminder}
                        onAdd={handleOpenReminderModal}
                    />

                    <AniversariantesWidget upcomingBirthdays={metrics.upcomingBirthdays} />
                </div>
            </div>

            <AddReminderModal
                isOpen={isReminderModalOpen}
                onClose={handleCloseReminderModal}
                onSuccess={fetchReminders}
            />
        </div>
    );
};
