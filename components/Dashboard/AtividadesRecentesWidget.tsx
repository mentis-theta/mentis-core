import React, { useState, useMemo, memo, useCallback } from "react";
import { isToday, isYesterday, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Smile, Frown, Meh, SmilePlus, ClipboardList, AlertTriangle } from 'lucide-react';

// ── Activity types ─────────────────────────────────────────────────────────────
type ActivityType = "trilha" | "atividade" | "humor" | "rpd" | "avaliacao";

const ACTIVITY_CONFIG: Record<ActivityType, {
    label: string;
    bgClass: string;
    textClass: string;
    dotClass: string;
    icon: React.ReactNode;
}> = {
    trilha: {
        label: "Trilha concluída",
        bgClass: "bg-primary/10",
        textClass: "text-primary",
        dotClass: "bg-primary",
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 21.1 4.9 22 6 22H18C19.1 22 21 21.1 21 19V5C21 3.9 20.1 3 19 3ZM10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z" fill="currentColor" />
            </svg>
        ),
    },
    atividade: {
        label: "Atividade acessada",
        bgClass: "bg-emerald-500/10 dark:bg-emerald-500/20",
        textClass: "text-emerald-600 dark:text-emerald-400",
        dotClass: "bg-emerald-500",
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10 16.5V7.5L16 12L10 16.5Z" fill="currentColor" />
            </svg>
        ),
    },
    humor: {
        label: "Humor registrado",
        bgClass: "bg-pink-100 dark:bg-pink-900/30",
        textClass: "text-pink-600 dark:text-pink-400",
        dotClass: "bg-pink-500",
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M11.99 2C6.47 2 2 6.48 2 12C2 17.52 6.47 22 11.99 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 11.99 2ZM12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20ZM15.5 11C16.33 11 17 10.33 17 9.5C17 8.67 16.33 8 15.5 8C14.67 8 14 8.67 14 9.5C14 10.33 14.67 11 15.5 11ZM8.5 11C9.33 11 10 10.33 10 9.5C10 8.67 9.33 8 8.5 8C7.67 8 7 8.67 7 9.5C7 10.33 7.67 11 8.5 11ZM12 17.5C14.33 17.5 16.31 16.04 17.11 14H6.89C7.69 16.04 9.67 17.5 12 17.5Z" fill="currentColor" />
            </svg>
        ),
    },
    rpd: {
        label: "RPD preenchido",
        bgClass: "bg-amber-100 dark:bg-amber-900/30",
        textClass: "text-amber-600 dark:text-amber-400",
        dotClass: "bg-amber-500",
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20ZM9 13H15V15H9V13ZM9 9H12V11H9V9ZM9 17H13V19H9V17Z" fill="currentColor" />
            </svg>
        ),
    },
    avaliacao: {
        label: "Avaliação preenchida",
        bgClass: "bg-indigo-100 dark:bg-indigo-900/30",
        textClass: "text-indigo-600 dark:text-indigo-400",
        dotClass: "bg-indigo-500",
        icon: <ClipboardList className="w-5 h-5" />,
    },
};

const MOOD_LABELS: Record<string, { icon: React.ReactNode; label: string; colorClass: string }> = {
    otimo: { icon: <SmilePlus className="w-3.5 h-3.5" strokeWidth={2.5} />, label: "Ótimo", colorClass: "text-primary" },
    bom: { icon: <Smile className="w-3.5 h-3.5" strokeWidth={2.5} />, label: "Bom", colorClass: "text-blue-600 dark:text-blue-400" },
    neutro: { icon: <Meh className="w-3.5 h-3.5" strokeWidth={2.5} />, label: "Neutro", colorClass: "text-foreground-muted" },
    ruim: { icon: <Frown className="w-3.5 h-3.5" strokeWidth={2.5} />, label: "Ruim", colorClass: "text-pink-600 dark:text-pink-400" },
    pessimo: { icon: <Frown className="w-3.5 h-3.5" strokeWidth={3} />, label: "Péssimo", colorClass: "text-pink-600 dark:text-pink-400" },
};

// ── Types ──────────────────────────────────────────────────────────────────────
export interface Activity {
    id: string;
    type: ActivityType;
    patientId?: string;
    patientName: string;
    patientInitials: string;
    timestamp?: string;
    rawDate?: string;
    detail: string;
    isNew: boolean;
    isCritical?: boolean;
}

// ── ActivityRow (Memoized) ────────────────────────────────────────────────────
const ActivityRow = memo(({ activity, onClick }: { activity: Activity; onClick?: (patientId: string) => void }) => {
    const cfg = ACTIVITY_CONFIG[activity.type];
    const mood = activity.type === "humor" ? MOOD_LABELS[activity.detail] : null;

    return (
        <div 
            onClick={() => {
                if (activity.patientId && onClick) {
                    onClick(activity.patientId);
                }
            }}
            role={activity.patientId && onClick ? "button" : undefined}
            tabIndex={activity.patientId && onClick ? 0 : undefined}
            className={`flex items-center gap-3.5 py-2.5 px-3.5 rounded-2xl bg-transparent hover:bg-surface-container-low transition-colors relative group ${activity.patientId && onClick ? 'cursor-pointer' : ''}`}
        >
            {activity.isNew && (
                <div className={`absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
            )}

            {/* Tonal icon — 40dp */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${cfg.bgClass} ${cfg.textClass}`}>
                {cfg.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-px rounded-full font-sans text-[11px] whitespace-nowrap font-medium ${cfg.bgClass} ${cfg.textClass}`}>
                        {cfg.label}
                    </span>
                    <span className="text-xs text-foreground-muted font-sans">·</span>
                    <div className="w-4.5 h-4.5 rounded-full bg-surface-dim text-foreground flex items-center justify-center text-[9px] font-bold shrink-0">
                        {activity.patientInitials}
                    </div>
                    <span className="text-sm text-on-surface font-sans font-medium">
                        {activity.patientName}
                    </span>
                </div>

                <div className="mt-1 flex items-center gap-1.5">
                    {mood ? (
                        <span className={`text-xs font-sans flex items-center gap-1 ${mood.colorClass}`}>
                            {mood.icon}
                            <span>{mood.label}</span>
                        </span>
                    ) : (
                        <span className="text-xs text-foreground-muted font-sans overflow-hidden text-ellipsis whitespace-nowrap">
                            {activity.detail}
                        </span>
                    )}
                    {activity.isCritical && (
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" strokeWidth={3} />
                    )}
                </div>
            </div>

            <span className="text-[11px] text-foreground-muted font-sans shrink-0 text-right">
                {activity.timestamp}
            </span>
        </div>
    );
});

// ── Filter Chip (Memoized) ────────────────────────────────────────────────────────────────
const FilterChip = memo(({ type, active, onToggle }: {
    type: ActivityType; active: boolean; onToggle: (type: ActivityType) => void;
}) => {
    const cfg = ACTIVITY_CONFIG[type];

    return (
        <button
            type="button"
            onClick={() => onToggle(type)}
            className={`inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full font-sans text-sm font-medium transition-all cursor-pointer outline-none shrink-0 border ${active
                ? `${cfg.bgClass} ${cfg.textClass} border-transparent`
                : 'bg-transparent border-border dark:border-white/10 text-foreground-muted hover:bg-surface-container-low hover:text-on-surface'
                }`}
        >
            {active && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor" />
                </svg>
            )}
            <span className={active ? '' : 'text-foreground-muted'}>
                {cfg.icon}
            </span>
            {cfg.label}
        </button>
    );
});

// ── Main ───────────────────────────────────────────────────────────────────────
export const AtividadesRecentesWidget: React.FC<{ activities?: Activity[], isLoading?: boolean, onActivityClick?: (patientId: string) => void }> = ({ activities = [], isLoading = false, onActivityClick }) => {
    const [activeFilter, setActiveFilter] = useState<ActivityType | null>(null);

    const parsedActivities = useMemo(() => {
        return activities.map(a => {
            const item = { ...a };
            if (item.rawDate && !item.timestamp) {
                try {
                    const d = parseISO(item.rawDate);
                    if (isToday(d)) {
                        item.timestamp = `Hoje, ${format(d, 'HH:mm')}`;
                    } else if (isYesterday(d)) {
                        item.timestamp = `Ontem, ${format(d, 'HH:mm')}`;
                    } else {
                        item.timestamp = format(d, 'dd MMM, HH:mm', { locale: ptBR });
                    }
                } catch {
                    item.timestamp = item.rawDate;
                }
            }
            return item;
        });
    }, [activities]);

    const handleToggleFilter = useCallback((type: ActivityType) => {
        setActiveFilter(prev => prev === type ? null : type);
    }, []);

    const filteredActivities = useMemo(() => {
        return activeFilter
            ? parsedActivities.filter((a) => a.type === activeFilter)
            : parsedActivities;
    }, [parsedActivities, activeFilter]);

    const newCount = useMemo(() => {
        return filteredActivities.filter(a => a.isNew).length;
    }, [filteredActivities]);

    const grouped = useMemo(() => {
        const result: { label: string; items: Activity[] }[] = [];
        filteredActivities.forEach((a) => {
            const ts = a.timestamp || '';
            const day = ts.startsWith("Hoje")
                ? "Hoje"
                : ts.startsWith("Ontem")
                    ? "Ontem"
                    : ts.split(",")[0];
            const last = result[result.length - 1];
            if (last && last.label === day) {
                last.items.push(a);
            } else {
                result.push({ label: day, items: [a] });
            }
        });
        return result;
    }, [filteredActivities]);

    return (
        <div className="w-full max-w-full bg-surface-container-lowest rounded-3xl shadow-md pt-5 px-3 pb-4 border border-border/40">
            {/* ── Header ── */}
            <div className="flex items-center gap-2.5 px-2 pb-3.5">
                <h2 className="text-xl font-semibold text-on-surface font-sans m-0">
                    Atividades Recentes
                </h2>
                {newCount > 0 && (
                    <span className="min-w-[22px] h-[22px] rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center font-sans text-[11px] font-medium px-1.5">
                        {newCount} novo{newCount > 1 ? "s" : ""}
                    </span>
                )}
            </div>

            {/* ── Filter chips ── */}
            <div className="flex gap-2 overflow-x-auto px-2 pb-3 no-scrollbar">
                {(["trilha", "atividade", "humor", "rpd", "avaliacao"] as ActivityType[]).map((type) => (
                    <FilterChip
                        key={type}
                        type={type}
                        active={activeFilter === type}
                        onToggle={handleToggleFilter}
                    />
                ))}
            </div>

            <div className="h-px bg-border dark:bg-white/10 mx-2 mb-1" />

            {/* ── Grouped list ── */}
            <div className="flex flex-col">
                {isLoading ? (
                    <div className="py-8 flex flex-col gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex gap-3.5 px-3.5 animate-pulse">
                                <div className="w-10 h-10 rounded-full bg-surface-dim shrink-0" />
                                <div className="flex-1 flex flex-col gap-2 justify-center">
                                    <div className="w-[60%] h-3.5 rounded bg-surface-dim" />
                                    <div className="w-[40%] h-3 rounded bg-surface-dim" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : grouped.length === 0 ? (
                    <div className="py-8 flex flex-col items-center gap-2">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="text-foreground-muted/50 dark:text-white/20">
                            <path d="M11 15H13V17H11V15ZM11 7H13V13H11V7ZM12 2C6.47 2 2 6.5 2 12C2 17.52 6.47 22 12 22C17.52 22 22 17.52 22 12C22 6.5 17.5 2 12 2ZM12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20Z" fill="currentColor" />
                        </svg>
                        <span className="text-sm text-foreground-muted font-sans font-medium">
                            Nenhuma atividade encontrada
                        </span>
                    </div>
                ) : (
                    grouped.map((group) => (
                        <div key={group.label}>
                            <div className="pt-2.5 px-3.5 pb-1 flex items-center gap-2.5">
                                <span className="text-xs font-medium text-foreground-muted font-sans tracking-wide uppercase">
                                    {group.label}
                                </span>
                                <div className="flex-1 h-px bg-border dark:bg-white/10" />
                            </div>

                            {group.items.map((a) => (
                                <ActivityRow key={a.id} activity={a} onClick={onActivityClick} />
                            ))}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
