import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Bell, AlertTriangle, Trash2 } from 'lucide-react';
import Button from '../Button';
import { useRecentActivities, CompactActivity } from '@/hooks/useRecentActivities';
import { useNavigate } from 'react-router-dom';

// ── Mapeamento de cores por tipo (compacto) ─────────────────────────────────
const TYPE_CONFIG: Record<string, { dot: string; label: string }> = {
    trilha:    { dot: 'bg-primary',       label: 'Trilha' },
    atividade: { dot: 'bg-emerald-500',   label: 'Atividade' },
    humor:     { dot: 'bg-pink-500',      label: 'Humor' },
    rpd:       { dot: 'bg-amber-500',     label: 'RPD' },
    avaliacao: { dot: 'bg-indigo-500',    label: 'Avaliação' },
};

const NotificationBell: React.FC = () => {
    const { activities, unreadCount, markAllAsRead } = useRecentActivities();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);

    // IDs dispensados — localStorage para persistir entre refreshes, só afeta o sino
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
        try {
            const saved = localStorage.getItem('mentis_bell_dismissed');
            return saved ? new Set(JSON.parse(saved)) : new Set();
        } catch { return new Set(); }
    });

    const visibleActivities = useMemo(
        () => activities.filter(a => !dismissedIds.has(a.id)),
        [activities, dismissedIds]
    );

    const handleClearAll = useCallback(() => {
        const allIds = new Set(activities.map(a => a.id));
        setDismissedIds(allIds);
        localStorage.setItem('mentis_bell_dismissed', JSON.stringify([...allIds]));
        markAllAsRead();
        setIsOpen(false);
    }, [activities, markAllAsRead]);
    const menuRef = useRef<HTMLDivElement>(null);

    // Fechar ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Re-render quando localStorage muda (markAllAsRead)
    const [, forceUpdate] = useState(0);
    useEffect(() => {
        const handler = () => forceUpdate(n => n + 1);
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, []);

    const handleClickActivity = useCallback((patientId: string) => {
        setIsOpen(false);
        navigate('/patients/' + patientId);
    }, [navigate]);

    const handleMarkRead = useCallback(() => {
        markAllAsRead();
        setIsOpen(false);
    }, [markAllAsRead]);

    const timeAgo = (dateStr: string): string => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}min`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h`;
        const days = Math.floor(hours / 24);
        return `${days}d`;
    };

    return (
        <div className="relative" ref={menuRef}>
            <Button
                onClick={() => setIsOpen(!isOpen)}
                variant="ghost"
                size="sm"
                className="hidden sm:flex relative items-center text-foreground-muted hover:bg-slate-100 dark:hover:bg-slate-800 !rounded-xl"
                title="Atividades Recentes"
            >
                <Bell className="w-4 h-4" />

                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </Button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface rounded-2xl shadow-xl border border-border z-50 transform origin-top-right transition-all flex flex-col max-h-[85vh]">
                    <div className="px-4 py-3 border-b border-border bg-surface/50 rounded-t-2xl shrink-0 flex items-center justify-between">
                        <h3 className="font-bold text-on-surface">Atividades Recentes</h3>
                        {unreadCount > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                {unreadCount} novo{unreadCount > 1 ? 's' : ''}
                            </span>
                        )}
                    </div>

                    <div className="overflow-y-auto py-1">
                        {visibleActivities.length === 0 ? (
                            <div className="p-6 text-center text-foreground-muted bg-surface/50 rounded-xl my-2 mx-2 border border-border/50 flex flex-col items-center">
                                <Bell className="w-8 h-8 mb-2 opacity-50 text-indigo-400" />
                                <p className="text-sm font-medium">Nenhuma atividade recente</p>
                            </div>
                        ) : (
                            visibleActivities.map(activity => (
                                <CompactRow
                                    key={activity.id}
                                    activity={activity}
                                    timeAgo={timeAgo}
                                    onClick={handleClickActivity}
                                />
                            ))
                        )}
                    </div>

                    {visibleActivities.length > 0 && (
                        <div className="p-3 bg-surface rounded-b-2xl shrink-0 mt-auto flex items-center gap-2 pt-3 border-t border-border">
                            <button
                                type="button"
                                onClick={handleClearAll}
                                className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium text-foreground-muted hover:text-red-500 dark:hover:text-red-400 transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Limpar tudo
                            </button>
                            {unreadCount > 0 && (
                                <span className="text-foreground-muted/30">|</span>
                            )}
                            {unreadCount > 0 && (
                                <button
                                    type="button"
                                    onClick={handleMarkRead}
                                    className="flex-1 text-sm font-medium text-foreground-muted hover:text-slate-900 dark:hover:text-slate-200 text-center transition-colors"
                                >
                                    Marcar como lidas
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ── Linha compacta de atividade ─────────────────────────────────────────────
const CompactRow: React.FC<{
    activity: CompactActivity;
    timeAgo: (d: string) => string;
    onClick: (patientId: string) => void;
}> = ({ activity, timeAgo, onClick }) => {
    const cfg = TYPE_CONFIG[activity.type] || TYPE_CONFIG.atividade;

    return (
        <button
            type="button"
            onClick={() => onClick(activity.patientId)}
            className={`
                w-full text-left flex items-center gap-2.5 px-4 py-2.5
                transition-colors hover:bg-surface-container-low cursor-pointer
                ${activity.isCritical ? 'bg-red-50/50 dark:bg-red-950/20' : ''}
            `}
        >
            {/* Dot de tipo */}
            <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />

            {/* Avatar de iniciais */}
            <div className="w-7 h-7 rounded-full bg-surface-dim text-foreground flex items-center justify-center text-[10px] font-bold shrink-0">
                {activity.patientInitials}
            </div>

            {/* Conteúdo */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-on-surface truncate">
                        {activity.patientName}
                    </span>
                    {activity.isCritical && (
                        <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" strokeWidth={3} />
                    )}
                </div>
                <p className="text-xs text-foreground-muted truncate">
                    <span className="font-medium">{cfg.label}</span>
                    <span className="mx-1">·</span>
                    {activity.detail}
                </p>
            </div>

            {/* Tempo */}
            <span className="text-[10px] text-foreground-muted shrink-0">
                {timeAgo(activity.rawDate)}
            </span>
        </button>
    );
};

export default NotificationBell;
