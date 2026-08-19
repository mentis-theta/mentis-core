import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { Patient, Session } from '@/types.ts';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, GoogleCalendarIcon, BellIcon } from './Icons';
import { useColors } from './Settings/ColorContext';
import Button from './Button.tsx';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addDays, subDays, startOfMonth, endOfMonth, addWeeks, subWeeks, addMonths, subMonths, isSameDay, isSameMonth, isToday, isWithinInterval, getHours, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useGlobalSessions } from '@/hooks/useGlobalSessions';
import { Coffee } from 'lucide-react';
import { getWhatsAppLink, formatMessage } from '@/utils/whatsapp';

interface CalendarViewProps {
    patients: Patient[];
    onAddSession: (date?: Date) => void;
    onEditSession: (session: Session) => void;
}

// --- Configuração da Grade ---
const START_HOUR = 7;
const END_HOUR = 22;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR);
const GRID_ROW_HEIGHT = 56;

// --- Componentes da Sidebar ---
const SchedulingReminderWidget = ({ sessions, now }: { sessions: any[], now: Date }) => {
    const nextSession = useMemo(() => {
        return sessions
            .filter(s => isToday(s.parsedDate) && s.parsedDate > now)
            .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime())[0];
    }, [sessions, now]);

    if (!nextSession) return (
        <div className="bg-surface-container-lowest rounded-3xl shadow-sm border border-border/40 p-4 md:p-5 flex flex-col gap-3">
            <h3 className="text-base font-bold text-on-surface font-sans tracking-tight m-0">Lembrete de Zap</h3>
            <p className="text-[13px] text-foreground-muted font-sans font-medium m-0">Nenhuma sessão pendente hoje.</p>
        </div>
    );

    const whatsappLink = getWhatsAppLink(nextSession.patientPhone || '', formatMessage(
        "Olá {NOME}, confirmando nossa sessão de hoje às {HORA}.",
        { NOME: nextSession.patientName, HORA: format(nextSession.parsedDate, 'HH:mm') }
    ));

    return (
        <div className="bg-surface-container-lowest rounded-3xl shadow-sm border border-border/40 p-4 md:p-5 flex flex-col gap-4 md:gap-5">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-base font-bold text-on-surface font-sans tracking-tight m-0">Lembrete de Sessão</h3>
                    <p className="text-[13px] text-primary font-sans font-bold m-0 mt-0.5">Pendentes de confirmação</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                </div>
            </div>
            <div className="flex items-center gap-3 md:gap-4 p-3 bg-surface-container-low rounded-2xl border border-border/40">
                <div className="w-10 h-10 rounded-full bg-surface-dim text-on-surface flex items-center justify-center font-sans text-base font-bold shrink-0 shadow-sm">
                    {nextSession.patientName.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                    <h4 className="font-bold text-sm text-on-surface font-sans truncate m-0">{nextSession.patientName}</h4>
                    <p className="text-[11px] text-foreground-muted font-sans font-medium m-0 truncate">
                        Sessão às {format(nextSession.parsedDate, 'HH:mm')}
                    </p>
                </div>
            </div>
            <a href={whatsappLink || '#'} target="_blank" rel="noreferrer" className="w-full">
                <Button className="w-full !rounded-xl py-2.5 min-h-[44px] !bg-emerald-600 hover:!bg-emerald-700 !text-white flex items-center justify-center gap-2 font-bold text-sm shadow-sm transition-all">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-14.7 8.38 8.38 0 0 1 3.8.9L21 3.5Z"></path></svg>
                    Enviar Lembrete Zap
                </Button>
            </a>
        </div>
    );
};

const NextSessionWidget = React.memo(({ sessions, now, onEditSession }: { sessions: any[], now: Date, onEditSession: (s: any) => void }) => {
    const nextSession = useMemo(() => {
        return sessions
            .filter(s => isToday(s.parsedDate) && s.parsedDate > now)
            .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime())[0];
    }, [sessions, now]);

    if (!nextSession) return null;

    return (
        <div className="bg-primary/5 dark:bg-primary/10 rounded-3xl shadow-sm border border-primary/20 p-4 md:p-5 flex flex-col gap-3 md:gap-4 cursor-pointer hover:bg-primary/10 transition-colors active:bg-primary/15" onClick={() => onEditSession(nextSession)}>
            <div className="flex justify-between items-center mb-1">
                <h3 className="text-[11px] font-bold text-primary font-sans uppercase tracking-wider m-0">Sua Próxima Sessão</h3>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                    {format(nextSession.parsedDate, 'HH:mm')}
                </span>
            </div>
            <div className="flex items-center gap-3 w-full">
                <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-sans text-base font-bold shrink-0 shadow-sm border border-primary/20">
                    {nextSession.patientName.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex justify-between items-start gap-2 w-full">
                        <h4 className="font-bold text-sm text-on-surface font-sans truncate m-0">{nextSession.patientName}</h4>
                        {nextSession.paymentStatus === 'paid' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shrink-0 mt-1" title="Sessão Paga"></div>}
                        {nextSession.paymentStatus === 'pending' && <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shrink-0 mt-1" title="Pagamento Pendente"></div>}
                    </div>
                    <p className="text-xs text-foreground-muted font-sans font-medium m-0 truncate mt-0.5">
                        {nextSession.sessionType} ({nextSession.duration} min)
                    </p>
                </div>
            </div>
        </div>
    );
});

const TodayAgendaList = React.memo(({ sessions, currentDate, now, onEditSession }: { sessions: any[], currentDate: Date, now: Date, onEditSession: (s: any) => void }) => {
    const daysSessions = useMemo(() => {
        return sessions
            .filter(s => isSameDay(s.parsedDate, currentDate))
            .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());
    }, [sessions, currentDate]);

    return (
        <div className="bg-surface-container-lowest rounded-3xl shadow-sm border border-border/40 p-4 md:p-5 flex flex-col flex-1 min-h-[200px] md:min-h-[300px]">
            <div className="flex justify-between items-center mb-4 md:mb-5">
                <h3 className="text-base font-bold text-on-surface font-sans tracking-tight m-0">
                    {isToday(currentDate) ? 'Atendimentos de Hoje' : `Sessões dia ${format(currentDate, 'dd/MM')}`}
                </h3>
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                </div>
            </div>
            {daysSessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-foreground-muted">
                    <Coffee className="w-10 h-10 mb-3 opacity-50" strokeWidth={1.5} />
                    <p className="font-sans text-sm font-medium m-0">Agenda livre neste dia.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-0 relative pb-2">
                    <div className="absolute left-[19px] top-4 bottom-4 w-px bg-border/40 z-0"></div>
                    {daysSessions.map(session => {
                        const isPast = session.parsedDate < now;
                        const isNext = isToday(currentDate) && session.parsedDate > now && session === daysSessions.filter(s => s.parsedDate > now)[0];
                        return (
                            <div key={session.id} className="flex items-start gap-3 md:gap-4 p-2.5 rounded-2xl hover:bg-surface-container-low active:bg-surface-container-low transition-all cursor-pointer group outline-none z-10 relative" onClick={() => onEditSession(session)}>
                                <div className="flex flex-col items-center shrink-0 pt-1 w-10">
                                    <div className={`w-3 h-3 rounded-full border-2 bg-surface-container-lowest z-10 mb-1 ${isPast ? 'border-border/60' : isNext ? 'border-primary bg-primary' : 'border-primary'}`}></div>
                                    <span className={`text-[10px] font-bold font-sans ${isPast ? 'text-foreground-muted' : 'text-on-surface'}`}>{format(session.parsedDate, 'HH:mm')}</span>
                                </div>
                                <div className={`flex flex-col min-w-0 flex-1 p-3 rounded-xl border ${isPast ? 'bg-surface-container-lowest border-border/40 opacity-70' : isNext ? 'bg-primary/5 border-primary/20 shadow-sm' : 'bg-surface-container-lowest border-border/40 hover:border-primary/30'}`}>
                                    <div className="flex justify-between items-start gap-2">
                                        <h4 className={`font-bold text-[13px] font-sans truncate m-0 ${isPast ? 'text-foreground-muted' : 'text-on-surface'}`}>{session.patientName}</h4>
                                        {session.paymentStatus === 'paid' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shrink-0 mt-1" title="Sessão Paga"></div>}
                                        {session.paymentStatus === 'pending' && <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shrink-0 mt-1" title="Pagamento Pendente"></div>}
                                    </div>
                                    <p className="text-[11px] text-foreground-muted font-sans font-medium m-0 truncate mt-0.5">{session.sessionType} • {session.duration} min</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
});

const CalendarDayColumn = React.memo(({
    day,
    isTodayDate,
    currentTimeTop,
    daySessions,
    onAddSession,
    onEditSession,
    getSessionStyle,
    START_HOUR,
    END_HOUR,
    GRID_ROW_HEIGHT,
    HOURS
}: {
    day: Date;
    isTodayDate: boolean;
    currentTimeTop: number | null;
    daySessions: any[];
    onAddSession: (d: Date) => void;
    onEditSession: (s: any) => void;
    getSessionStyle: (s: any) => any;
    START_HOUR: number;
    END_HOUR: number;
    GRID_ROW_HEIGHT: number;
    HOURS: number[];
}) => {
    return (
        <div className="flex flex-col relative">
            <div className={`h-[72px] flex flex-col items-center justify-center border-b border-border/60 sticky top-0 z-20 bg-surface-container-lowest/95 backdrop-blur-sm ${isTodayDate ? 'border-b-2 border-b-primary' : ''}`}>
                <p className={`text-[10px] font-bold mb-0.5 font-sans uppercase tracking-wider ${isTodayDate ? 'text-primary' : 'text-foreground-muted'}`}>{format(day, 'EEE')}</p>
                <div className={`mx-auto w-8 h-8 flex items-center justify-center rounded-xl text-lg font-bold font-sans transition-colors ${isTodayDate ? 'bg-primary text-primary-foreground shadow-sm' : 'text-on-surface'}`}>{format(day, 'd')}</div>
            </div>

            {/* Grade Absoluta do Dia */}
            <div className="relative w-full" style={{ height: `${(END_HOUR - START_HOUR + 1) * GRID_ROW_HEIGHT}px` }}>
                {HOURS.map(hour => (
                    <div key={hour} className="border-t border-border/60 w-full absolute group hover:bg-primary/5 cursor-pointer transition-colors flex justify-center" style={{ top: `${(hour - START_HOUR) * GRID_ROW_HEIGHT}px`, height: `${GRID_ROW_HEIGHT}px` }} onClick={() => onAddSession(setHours(setMinutes(day, 0), hour))} title={`Agendar às ${hour}:00`}>
                        <PlusIcon className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity mt-2" />
                    </div>
                ))}

                {/* Linha do Tempo Atual */}
                {isTodayDate && currentTimeTop !== null && (
                    <div className="absolute w-full border-t-[2px] border-primary z-20 pointer-events-none" style={{ top: `${currentTimeTop}px` }}>
                        <div className="absolute w-2.5 h-2.5 bg-primary rounded-full -left-1.5 -top-[5px] shadow-sm"></div>
                    </div>
                )}

                {/* Eventos */}
                {daySessions.map(session => {
                    const style = getSessionStyle(session);
                    return (
                        <div key={session.id} style={{ top: style.top, height: style.height }} className={style.className} onClick={(e) => { e.stopPropagation(); onEditSession(session); }} title={`${session.patientName} - ${session.sessionType} (${format(session.parsedDate, 'HH:mm')})`}>
                            <div className="flex justify-between items-start w-full">
                                <span className="text-[9px] font-bold opacity-70 mb-0.5 tracking-wide font-sans leading-none">{format(session.parsedDate, 'HH:mm')}</span>
                                {session.paymentStatus === 'paid' && <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shrink-0 mt-0.5" title="Sessão Paga"></div>}
                                {session.paymentStatus === 'pending' && <div className="w-2 h-2 rounded-full bg-red-500 shadow-sm shrink-0 mt-0.5" title="Pagamento Pendente"></div>}
                            </div>
                            <p className="font-bold text-[11px] leading-tight font-sans truncate">{session.patientName}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

const MonthDayCell = React.memo(({
    day,
    isCurrentMonth,
    isTodayDate,
    daySessions,
    onAddSession,
    onEditSession,
    getEventColor
}: {
    day: Date;
    isCurrentMonth: boolean;
    isTodayDate: boolean;
    daySessions: any[];
    onAddSession: (d: Date) => void;
    onEditSession: (s: any) => void;
    getEventColor: (name: string) => string;
}) => {
    return (
        <div className={`bg-surface-container-lowest p-1.5 md:p-2 min-h-[60px] md:min-h-[100px] flex flex-col hover:bg-surface-container/50 cursor-pointer transition-colors ${!isCurrentMonth ? 'opacity-40 bg-surface-container-low' : ''}`} onClick={() => onAddSession(setHours(day, 9))}>
            <div className="flex justify-end mb-0.5 md:mb-1">
                <span className={`text-xs md:text-sm font-bold h-6 w-6 md:h-7 md:w-7 flex items-center justify-center rounded-full font-sans transition-colors ${isTodayDate ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground-muted'}`}>{format(day, 'd')}</span>
            </div>
            <div className="flex-1 space-y-1 md:space-y-1.5 overflow-hidden">
                {/* Mobile: apenas dots de indicação / Desktop: texto completo */}
                <div className="hidden md:block space-y-1.5">
                    {daySessions.slice(0, 3).map(session => {
                        const solidColorClass = getEventColor(session.patientName);
                        return (
                            <div key={session.id} onClick={(e) => { e.stopPropagation(); onEditSession(session); }} className={`text-[10px] font-semibold px-2 py-1 rounded-md truncate font-sans hover:shadow-sm transition-all ${solidColorClass}`} title={`${format(session.parsedDate, 'HH:mm')} - ${session.patientName} (${session.sessionType})`}>
                                {format(session.parsedDate, 'HH:mm')} {session.patientName}
                            </div>
                        );
                    })}
                    {daySessions.length > 3 && (
                        <div className="text-[10px] font-bold text-foreground-muted text-center pt-1 font-sans">+ {daySessions.length - 3} mais</div>
                    )}
                </div>
                {/* Mobile: indicadores compactos de sessões */}
                <div className="flex flex-wrap gap-1 md:hidden justify-center pt-0.5">
                    {daySessions.slice(0, 4).map(session => {
                        const solidColorClass = getEventColor(session.patientName);
                        return (
                            <div key={session.id} className={`w-2 h-2 rounded-full ${solidColorClass.split(' ')[0]}`} title={session.patientName} />
                        );
                    })}
                    {daySessions.length > 4 && (
                        <span className="text-[9px] font-bold text-foreground-muted">+{daySessions.length - 4}</span>
                    )}
                </div>
            </div>
        </div>
    );
});

// --- Componente Principal ---
const CalendarView: React.FC<CalendarViewProps> = ({ patients, onAddSession, onEditSession }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<'week' | 'month'>('week');
    const [now, setNow] = useState(new Date());
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const hasInitialScrolled = useRef(false);

    // Estado para dia selecionado no mobile (vista de dia único)
    const [mobileSelectedDay, setMobileSelectedDay] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    const { globalSessions } = useGlobalSessions();

    const allSessions = useMemo(() => {
        if (!globalSessions) return [];
        return globalSessions.map(s => {
            const patient = patients.find(p => p.id === s.patientId);
            return {
                ...s,
                patientName: patient?.name || 'Paciente Removido',
                patientPhone: patient?.phone || '',
                parsedDate: new Date(s.date)
            };
        });
    }, [globalSessions, patients]);

    const sessionsByDate = useMemo(() => {
        const map = new Map<string, typeof allSessions>();
        allSessions.forEach(session => {
            const dateKey = format(session.parsedDate, 'yyyy-MM-dd');
            if (!map.has(dateKey)) map.set(dateKey, []);
            map.get(dateKey)!.push(session);
        });
        return map;
    }, [allSessions]);

    const navigate = (direction: 'prev' | 'next') => {
        if (view === 'week') setCurrentDate(prev => direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1));
        else setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
    };

    const navigateMobileDay = (direction: 'prev' | 'next') => {
        setMobileSelectedDay(prev => direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1));
    };

    const days = useMemo(() => {
        const start = view === 'week' ? startOfWeek(currentDate, { weekStartsOn: 0 }) : startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
        const end = view === 'week' ? endOfWeek(currentDate, { weekStartsOn: 0 }) : endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
        return eachDayOfInterval({ start, end });
    }, [currentDate, view]);

    // Dias da semana atual para o seletor horizontal do mobile
    const weekDays = useMemo(() => {
        const start = startOfWeek(mobileSelectedDay, { weekStartsOn: 0 });
        const end = endOfWeek(mobileSelectedDay, { weekStartsOn: 0 });
        return eachDayOfInterval({ start, end });
    }, [mobileSelectedDay]);

    const getSessionsForDay = (date: Date) => sessionsByDate.get(format(date, 'yyyy-MM-dd')) || [];

    const colorCache = useRef<Record<string, string>>({});

    const getEventColor = useCallback((name: string) => {
        if (colorCache.current[name]) return colorCache.current[name];

        const palettes = [
            'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300',
            'bg-purple-100 text-purple-900 dark:bg-purple-500/20 dark:text-purple-300',
            'bg-blue-100 text-blue-900 dark:bg-blue-500/20 dark:text-blue-300',
            'bg-pink-100 text-pink-900 dark:bg-pink-500/20 dark:text-pink-300',
            'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300',
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        const color = palettes[Math.abs(hash) % palettes.length];
        colorCache.current[name] = color;
        return color;
    }, []);

    const getSessionStyle = useCallback((session: typeof allSessions[0]) => {
        const startHour = getHours(session.parsedDate);
        const startMin = session.parsedDate.getMinutes();
        const minutesFromStart = ((startHour - START_HOUR) * 60) + startMin;
        const top = Math.max(0, minutesFromStart * (GRID_ROW_HEIGHT / 60));
        const height = session.duration * (GRID_ROW_HEIGHT / 60);
        const solidColorClass = getEventColor(session.patientName);

        return {
            top: `${top}px`,
            height: `${height}px`,
            className: `absolute left-1 right-1 rounded-lg p-1.5 text-xs overflow-hidden cursor-pointer hover:brightness-95 transition-all z-10 shadow-sm flex flex-col border border-white/20 dark:border-black/10 ${solidColorClass}`
        };
    }, [getEventColor]);

    const currentTimeTop = useMemo(() => {
        const currentHour = getHours(now);
        const currentMin = now.getMinutes();
        if (currentHour < START_HOUR || currentHour > END_HOUR) return null;
        return (((currentHour - START_HOUR) * 60) + currentMin) * (GRID_ROW_HEIGHT / 60);
    }, [now]);

    useEffect(() => {
        if (view === 'week' && isToday(currentDate) && currentTimeTop !== null && scrollContainerRef.current) {
            const behavior = hasInitialScrolled.current ? 'smooth' : 'auto';

            scrollContainerRef.current.scrollTo({
                top: Math.max(0, currentTimeTop - 150),
                behavior: behavior as ScrollBehavior
            });

            hasInitialScrolled.current = true;
        }
    }, [view, currentDate]);

    // Sessões do dia selecionado no mobile
    const mobileSelectedDaySessions = useMemo(() => {
        return getSessionsForDay(mobileSelectedDay).sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());
    }, [mobileSelectedDay, sessionsByDate]);

    return (
        <div className="flex flex-col gap-4 md:gap-8 min-h-full relative px-4 md:px-8 pb-safe md:pb-12 bg-canvas animate-fadeIn">
            {/* Header: Título + Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4 px-1 shrink-0">
                <h1 className="text-2xl md:text-[28px] font-bold text-on-surface font-sans m-0 tracking-tight">Agenda</h1>
                <div className="bg-surface-container-low rounded-full p-1 flex border border-border/20 shadow-sm">
                    <button onClick={() => setView('week')} className={`px-4 md:px-5 py-1.5 text-sm font-bold rounded-full transition-colors cursor-pointer outline-none min-h-[44px] md:min-h-0 ${view === 'week' ? 'bg-surface-container-lowest shadow-sm text-primary' : 'text-foreground-muted hover:text-on-surface'}`}>Semana</button>
                    <button onClick={() => setView('month')} className={`px-4 md:px-5 py-1.5 text-sm font-bold rounded-full transition-colors cursor-pointer outline-none min-h-[44px] md:min-h-0 ${view === 'month' ? 'bg-surface-container-lowest shadow-sm text-primary' : 'text-foreground-muted hover:text-on-surface'}`}>Mês</button>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-4 md:gap-6 flex-1 min-h-0">
                {/* ═══ SIDEBAR WIDGETS — mobile: primeiro / desktop: último ═══ */}
                <div className="w-full xl:w-[320px] flex flex-col gap-4 md:gap-6 shrink-0 xl:order-2 xl:overflow-y-auto no-scrollbar pb-4 md:pb-6 relative">
                    <SchedulingReminderWidget sessions={allSessions} now={now} />
                    <NextSessionWidget sessions={allSessions} now={now} onEditSession={onEditSession} />
                    <TodayAgendaList sessions={allSessions} currentDate={currentDate} now={now} onEditSession={onEditSession} />
                </div>

                {/* ═══ GRID DA AGENDA ═══ */}
                <div className="flex-1 flex flex-col bg-surface-container-lowest rounded-3xl shadow-sm border border-border/40 md:overflow-hidden min-w-0 xl:order-1">
                    {/* Nav Bar do calendário */}
                    <div className="p-3 md:p-4 lg:px-6 lg:py-4 border-b border-border/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4 flex-shrink-0 bg-surface-container-lowest">
                        <div className="flex items-center gap-3 md:gap-4">
                            <div className="flex items-center bg-surface-container-low rounded-full p-1 border border-border/20 shadow-sm">
                                <button onClick={() => navigate('prev')} aria-label="Anterior" className="min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 p-2 md:p-1.5 rounded-full hover:bg-surface-container-lowest text-foreground-muted hover:text-on-surface transition-colors cursor-pointer outline-none flex items-center justify-center"><ChevronLeftIcon className="w-5 h-5" /></button>
                                <h2 className="text-sm font-bold text-on-surface font-sans capitalize m-0 tracking-tight min-w-[120px] md:min-w-[140px] text-center">{format(currentDate, 'MMMM yyyy')}</h2>
                                <button onClick={() => navigate('next')} aria-label="Próximo" className="min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 p-2 md:p-1.5 rounded-full hover:bg-surface-container-lowest text-foreground-muted hover:text-on-surface transition-colors cursor-pointer outline-none flex items-center justify-center"><ChevronRightIcon className="w-5 h-5" /></button>
                            </div>
                            <button onClick={() => setCurrentDate(new Date())} className="px-4 md:px-5 py-2 text-sm font-bold rounded-xl border border-border/60 bg-surface-container-lowest hover:bg-surface-container-low text-on-surface transition-colors cursor-pointer outline-none shadow-sm min-h-[44px] md:min-h-0">Hoje</button>
                        </div>
                        <Button onClick={() => onAddSession(currentDate)} className="w-full md:w-auto !rounded-xl px-5 md:px-6 py-2.5 min-h-[44px] !bg-slate-900 dark:!bg-white !text-white dark:!text-slate-900 shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                            <PlusIcon className="w-5 h-5" /> <span className="font-bold text-sm tracking-tight">Novo Agendamento</span>
                        </Button>
                    </div>

                    {/* ─── MOBILE: Vista de Dia Único (< md) ─── */}
                    {view === 'week' && (
                        <div className="flex flex-col md:hidden pb-6">
                            {/* Seletor horizontal de dias da semana */}
                            <div className="flex items-center border-b border-border/40 bg-surface-container-lowest">
                                <button onClick={() => navigateMobileDay('prev')} className="min-h-[44px] min-w-[44px] p-2 text-foreground-muted hover:text-on-surface transition-colors cursor-pointer outline-none flex items-center justify-center" aria-label="Dia anterior">
                                    <ChevronLeftIcon className="w-4 h-4" />
                                </button>
                                <div className="flex-1 flex overflow-x-auto no-scrollbar">
                                    {weekDays.map(day => (
                                        <button
                                            key={day.toString()}
                                            onClick={() => setMobileSelectedDay(day)}
                                            className={`flex-1 min-w-[48px] flex flex-col items-center py-2.5 gap-0.5 cursor-pointer transition-all outline-none ${isSameDay(day, mobileSelectedDay)
                                                ? 'border-b-2 border-primary'
                                                : ''
                                                }`}
                                        >
                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isSameDay(day, mobileSelectedDay) ? 'text-primary' : isToday(day) ? 'text-primary' : 'text-foreground-muted'}`}>{format(day, 'EEE')}</span>
                                            <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition-colors ${isSameDay(day, mobileSelectedDay)
                                                ? 'bg-primary text-primary-foreground shadow-sm'
                                                : isToday(day)
                                                    ? 'bg-primary/10 text-primary'
                                                    : 'text-on-surface'
                                                }`}>{format(day, 'd')}</span>
                                            {/* Indicador de sessões */}
                                            {getSessionsForDay(day).length > 0 && !isSameDay(day, mobileSelectedDay) && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                                <button onClick={() => navigateMobileDay('next')} className="min-h-[44px] min-w-[44px] p-2 text-foreground-muted hover:text-on-surface transition-colors cursor-pointer outline-none flex items-center justify-center" aria-label="Próximo dia">
                                    <ChevronRightIcon className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Lista de sessões do dia selecionado — CARDS */}
                            <div className="p-4">
                                <h3 className="text-sm font-bold text-on-surface font-sans mb-3">
                                    {format(mobileSelectedDay, 'EEEE')}, {format(mobileSelectedDay, 'dd')} de {format(mobileSelectedDay, 'MMMM')}
                                </h3>
                                {mobileSelectedDaySessions.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-foreground-muted">
                                        <Coffee className="w-10 h-10 mb-3 opacity-50" strokeWidth={1.5} />
                                        <p className="font-sans text-sm font-medium m-0">Agenda livre.</p>
                                        <button onClick={() => onAddSession(setHours(mobileSelectedDay, 9))} className="mt-4 px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-bold cursor-pointer outline-none transition-colors hover:bg-primary/20 min-h-[44px]">
                                            + Agendar sessão
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        {mobileSelectedDaySessions.map(session => {
                                            const solidColorClass = getEventColor(session.patientName);
                                            const isPast = session.parsedDate < now;
                                            return (
                                                <div
                                                    key={session.id}
                                                    onClick={() => onEditSession(session as any)}
                                                    className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all active:scale-[0.98] min-h-[56px] ${isPast
                                                        ? 'bg-surface-container-lowest border-border/40 opacity-60'
                                                        : `${solidColorClass} border-white/20 dark:border-black/10 shadow-sm`
                                                        }`}
                                                >
                                                    <div className="flex flex-col items-center shrink-0 min-w-[44px]">
                                                        <span className="text-sm font-bold font-sans">{format(session.parsedDate, 'HH:mm')}</span>
                                                        <span className="text-[10px] text-current opacity-60">{session.duration}m</span>
                                                    </div>
                                                    <div className="flex flex-col min-w-0 flex-1">
                                                        <div className="flex justify-between items-start gap-2 w-full">
                                                            <h4 className="font-bold text-sm font-sans truncate m-0">{session.patientName}</h4>
                                                            {session.paymentStatus === 'paid' && <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shrink-0 mt-1.5" title="Sessão Paga"></div>}
                                                            {session.paymentStatus === 'pending' && <div className="w-2 h-2 rounded-full bg-red-500 shadow-sm shrink-0 mt-1.5" title="Pagamento Pendente"></div>}
                                                        </div>
                                                        <p className="text-[11px] opacity-70 font-sans font-medium m-0 truncate">{session.sessionType}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ─── DESKTOP: Grade Semanal Completa (md+) ─── */}
                    {view === 'week' && (
                        <div ref={scrollContainerRef} className="hidden md:block flex-1 overflow-auto force-scroll-x relative bg-surface-container-lowest">
                            <div className="flex min-w-[800px]">
                                {/* COLUNA DE HORAS */}
                                <div className="w-16 flex-shrink-0 border-r border-border/60 bg-surface-container-lowest sticky left-0 z-30">
                                    <div className="h-[72px] border-b border-border/60 bg-surface-container-lowest/95 backdrop-blur-sm sticky top-0 z-40"></div>
                                    <div className="relative w-full">
                                        {HOURS.map(hour => (
                                            <div key={hour} className="absolute w-full text-right pr-2 text-[10px] font-semibold text-foreground-muted/60 font-sans" style={{ top: `${(hour - START_HOUR) * GRID_ROW_HEIGHT}px`, transform: 'translateY(-50%)' }}>
                                                {hour}:00
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* COLUNAS DOS DIAS */}
                                <div className="flex-1 grid grid-cols-7 divide-x divide-border/60">
                                    {days.map(day => (
                                        <CalendarDayColumn
                                            key={day.toString()}
                                            day={day}
                                            isTodayDate={isToday(day)}
                                            currentTimeTop={currentTimeTop}
                                            daySessions={getSessionsForDay(day)}
                                            onAddSession={onAddSession}
                                            onEditSession={onEditSession}
                                            getSessionStyle={getSessionStyle}
                                            START_HOUR={START_HOUR}
                                            END_HOUR={END_HOUR}
                                            GRID_ROW_HEIGHT={GRID_ROW_HEIGHT}
                                            HOURS={HOURS}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ─── VISÃO MENSAL (ambos mobile e desktop) ─── */}
                    {view === 'month' && (
                        <div className="flex-1 overflow-auto relative bg-surface-container-lowest">
                            <div className="grid grid-cols-7 h-full auto-rows-fr bg-border/40 gap-px border-l border-t border-border/40">
                                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                                    <div key={d} className="bg-surface-container-low p-1.5 md:p-2 text-center text-[10px] md:text-xs font-bold text-foreground-muted uppercase tracking-wider font-sans">{d}</div>
                                ))}
                                {days.map(day => (
                                    <MonthDayCell
                                        key={day.toString()}
                                        day={day}
                                        isCurrentMonth={isSameMonth(day, currentDate)}
                                        isTodayDate={isToday(day)}
                                        daySessions={getSessionsForDay(day)}
                                        onAddSession={onAddSession}
                                        onEditSession={onEditSession}
                                        getEventColor={getEventColor}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CalendarView;
