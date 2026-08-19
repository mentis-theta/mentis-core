import React, { useState } from 'react';
import { Reminder, Patient } from '@/types';
import { TrashIcon, RefreshIcon } from '../Icons'; // Assuming we need them for History

// ── Note color palette (Tailwind Classes) ───────────────────────────────────
function getNoteColorClasses(id: string) {
    const map: Record<string, { bg: string; border: string; text: string; dotBg: string }> = {
        blue: { bg: "bg-blue-100/70 dark:bg-blue-900/40", border: "border-blue-300 dark:border-blue-700/60", text: "text-blue-700 dark:text-blue-300", dotBg: "bg-blue-600" },
        purple: { bg: "bg-purple-100/70 dark:bg-purple-900/40", border: "border-purple-300 dark:border-purple-700/60", text: "text-purple-700 dark:text-purple-300", dotBg: "bg-purple-600" },
        teal: { bg: "bg-teal-100/70 dark:bg-teal-900/40", border: "border-teal-300 dark:border-teal-700/60", text: "text-teal-800 dark:text-teal-300", dotBg: "bg-teal-700 dark:bg-teal-500" },
        green: { bg: "bg-green-100/70 dark:bg-green-900/40", border: "border-green-300 dark:border-green-700/60", text: "text-green-800 dark:text-green-300", dotBg: "bg-green-700 dark:bg-green-500" },
        yellow: { bg: "bg-yellow-100/80 dark:bg-yellow-900/40", border: "border-yellow-400 dark:border-yellow-700/60", text: "text-yellow-800 dark:text-yellow-300", dotBg: "bg-yellow-600" },
        red: { bg: "bg-red-100/70 dark:bg-red-900/40", border: "border-red-300 dark:border-red-700/60", text: "text-red-700 dark:text-red-300", dotBg: "bg-red-600" },
    };
    return map[id] ?? map.blue;
}

// Mapping original colors to the new palettes
const mapColor = (c: string) => {
    if (c === 'pink') return 'red';
    if (c === 'teal') return 'green'; // Just alias
    return c;
}

interface ReminderBoardWidgetProps {
    reminders: Reminder[];
    patients?: Patient[];
    onComplete: (id: string) => void;
    onRestore: (id: string) => void;
    onDelete: (id: string) => void;
    onAdd: () => void;
}

// ── NoteCard ───────────────────────────────────────────────────────────────────
function NoteCard({
    reminder,
    patient,
    onToggleDone,
}: {
    reminder: Reminder;
    patient?: Patient | null;
    onToggleDone: (id: string) => void;
}) {
    const colorId = mapColor(reminder.color) || "blue";
    const colors = getNoteColorClasses(colorId);

    const date = new Date(reminder.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });

    return (
        <div
            className={`${colors.bg} border ${colors.border} rounded-2xl py-3.5 px-4 relative transition-shadow ${reminder.is_completed ? 'opacity-60' : 'opacity-100'}`}
        >
            {/* Top row: date + check */}
            <div className="flex justify-between items-center mb-2.5">
                <span className="text-sm font-medium text-on-surface-variant font-sans">
                    {date}
                </span>

                {/* M3 Icon Button (check) */}
                {!reminder.is_completed && (
                    <button
                        onClick={() => onToggleDone(reminder.id)}
                        className={`w-10 h-10 rounded-full border-none flex items-center justify-center shrink-0 transition-colors cursor-pointer group hover:bg-black/5 dark:hover:bg-white/10`}
                        title="Marcar como feito"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path
                                d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                                className={`transition-colors ${reminder.is_completed ? colors.text : 'fill-border group-hover:fill-on-surface-variant'}`}
                                fill="currentColor"
                            />
                        </svg>
                    </button>
                )}
            </div>

            {/* Content */}
            <p className={`text-base text-on-surface font-sans whitespace-pre-wrap m-0 ${reminder.is_completed ? 'line-through' : 'none'} ${patient ? 'mb-3' : 'mb-0'}`}>
                {reminder.description}
            </p>

            {/* Author/Patient chip */}
            {patient && (
                <div className={`inline-flex items-center gap-1.5 py-1 pr-2.5 pl-1.5 rounded-full border ${colors.border} bg-white/40 dark:bg-black/20`}>
                    {/* Avatar placeholder */}
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${colors.dotBg}`}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" fill="white" />
                        </svg>
                    </div>
                    <span className="text-sm font-medium text-on-surface font-sans">
                        {patient.name}
                    </span>
                </div>
            )}
        </div>
    );
}

// ── Main Widget ───────────────────────────────────────────────────────────────────────
export const ReminderBoardWidget: React.FC<ReminderBoardWidgetProps> = ({ reminders, patients = [], onComplete, onRestore, onDelete, onAdd }) => {
    const [showHistory, setShowHistory] = useState(false);
    const [filterColor, setFilterColor] = useState<string | null>(null);

    const filteredReminders = filterColor
        ? reminders.filter(r => mapColor(r.color) === mapColor(filterColor))
        : reminders;

    const activeReminders = filteredReminders.filter(r => !r.is_completed);
    const completedReminders = filteredReminders.filter(r => r.is_completed);

    const toggleFilter = (colorId: string) => {
        setFilterColor(prev => prev === colorId ? null : colorId);
    };

    const filterDots = [
        { id: "blue", colorClass: "bg-blue-500" },
        { id: "purple", colorClass: "bg-purple-500" },
        { id: "teal", colorClass: "bg-teal-600 dark:bg-teal-500" },
        { id: "green", colorClass: "bg-green-600 dark:bg-green-500" },
        { id: "yellow", colorClass: "bg-yellow-500" },
        { id: "red", colorClass: "bg-red-500" },
    ];

    return (
        <div className="w-full bg-surface-container-lowest/90 backdrop-blur-md rounded-3xl shadow-sm pt-6 px-5 pb-5 flex flex-col gap-0">
            {/* ── Header row ── */}
            <div className="flex justify-between items-center mb-4 px-1">
                <h2 className="text-xl font-semibold text-on-surface font-sans m-0">
                    Lembretes
                </h2>

                {/* Color dots (Filter) */}
                <div className="flex gap-1.5 items-center">
                    {filterColor && (
                        <button
                            onClick={() => setFilterColor(null)}
                            className="border-none bg-transparent cursor-pointer font-sans text-xs font-medium text-on-surface-variant hover:text-on-surface transition-colors"
                        >
                            Limpar
                        </button>
                    )}
                    {filterDots.map((c) => (
                        <div
                            key={c.id}
                            onClick={() => toggleFilter(c.id)}
                            className={`${filterColor === c.id ? 'w-4.5 h-4.5 border-2 border-on-surface' : 'w-3.5 h-3.5 border-none'} rounded-full cursor-pointer transition-all ${c.colorClass}`}
                        />
                    ))}
                </div>
            </div>

            {/* + LEMBRETE Button */}
            <button
                onClick={onAdd}
                className="flex items-center justify-center w-full p-3 bg-surface-container-low text-primary border-2 border-dashed border-border rounded-2xl cursor-pointer font-sans text-sm font-bold mb-4 transition-all hover:border-primary/30 hover:bg-surface-container group"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mr-2 text-primary">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor" />
                </svg>
                NOVO LEMBRETE
            </button>

            {/* ── Notes list ── */}
            <div className="flex flex-col gap-2">
                {activeReminders.length === 0 && (
                    <p className="text-center font-sans text-base text-foreground-muted py-4 m-0">
                        {filterColor ? 'Nenhum lembrete nesta cor.' : 'Tudo feito! Você não tem lembretes ativos.'}
                    </p>
                )}

                {activeReminders.map((reminder) => {
                    const linkedPatient = reminder.patient_id ? patients.find(p => p.id === reminder.patient_id) : null;
                    return (
                        <NoteCard
                            key={reminder.id}
                            reminder={reminder}
                            patient={linkedPatient}
                            onToggleDone={onComplete}
                        />
                    )
                })}
            </div>

            {/* ── Footer: Ver histórico ── */}
            <div className="mt-4 px-1">
                <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="inline-flex items-center gap-1.5 bg-transparent border-none cursor-pointer py-1 group"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className={`w-4 h-4 transition-transform text-foreground-muted group-hover:text-primary ${showHistory ? 'rotate-180' : ''}`}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    <span className="text-sm font-medium text-foreground-muted group-hover:text-primary group-hover:underline font-sans transition-colors">
                        {showHistory ? 'Ocultar histórico' : 'Ver histórico'}
                    </span>
                </button>
            </div>

            {/* ── History Section ── */}
            {showHistory && (
                <div className="flex flex-col gap-2 mt-3">
                    {completedReminders.length === 0 && (
                        <p className="font-sans text-sm text-foreground-muted m-0">Nenhum histórico disponível.</p>
                    )}
                    {completedReminders.map(reminder => (
                        <div key={reminder.id} className="p-3 bg-surface-container-low rounded-xl flex justify-between items-center">
                            <div className="flex-1 pr-4">
                                <p className="font-sans text-sm line-through text-foreground-muted m-0">
                                    {reminder.description}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => onRestore(reminder.id)} className="bg-transparent border-none cursor-pointer text-primary hover:opacity-80 p-1">
                                    <RefreshIcon className="w-5 h-5" />
                                </button>
                                <button onClick={() => onDelete(reminder.id)} className="bg-transparent border-none cursor-pointer text-red-500 hover:opacity-80 p-1">
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
