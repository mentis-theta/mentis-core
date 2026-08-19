
import React, { useState, useEffect, useMemo } from 'react';
import type { Session, Patient } from '@/types.ts';
import { formatDateTime } from '@/utils/formatters.ts';
import { TagIcon, EllipsisVerticalIcon, PencilIcon, SwitchHorizontalIcon, TrashIcon, ClockIcon, CheckCircleIcon, ExclamationIcon, DocumentIcon, PlusIcon } from '../Icons';
import StatusBadge from '../StatusBadge.tsx';
import Button from '../Button.tsx';
import { LABELS, SESSION_STATUS_ICONS } from '@/utils/mappers.ts';
import { useAuth } from '@/contexts/AuthContext.tsx';
import { usePatientContext } from '@/contexts/PatientContext.tsx';
import { getPlainTextFromSession } from './RichTextRenderer.tsx';
import { motion } from 'framer-motion';
import { useSessionRealtime } from '@/hooks/useSessionRealtime';

interface SessionListProps {
    sessions: Session[];
    canEdit: boolean;
    onViewSessionNotes: (session: Session) => void;
    onEditSession: (session: Session) => void;
    onUpdateSessionPaymentStatus: (sessionId: string) => void;
    onUpdateSessionStatus: (sessionId: string, status: Session['status']) => void;
    onDeleteSession: (sessionId: string) => void;
    onAddSession: () => void;
}

const SessionList: React.FC<SessionListProps> = ({
    sessions, canEdit, onViewSessionNotes, onEditSession,
    onUpdateSessionPaymentStatus, onUpdateSessionStatus, onDeleteSession, onAddSession
}) => {
    const { currentUser } = useAuth();
    const { patient, updatePatient } = usePatientContext();
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    
    // Subscribe to realtime updates for this patient's sessions (Eixo 3)
    useSessionRealtime(patient?.id);
    
    // Modal de Faltas State
    const [missedSessionId, setMissedSessionId] = useState<string | null>(null);
    const [rememberMissedDecision, setRememberMissedDecision] = useState(true);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (openDropdownId && !(event.target as HTMLElement).closest('.actions-dropdown-container')) {
                setOpenDropdownId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [openDropdownId]);

    const historySessions = useMemo(() => {
        return sessions.filter(s =>
            s.status === 'completed' ||
            s.status === 'draft' ||
            s.status === 'scheduled' ||
            s.status === 'canceled' ||
            s.status === 'missed' ||
            !s.status
        ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [sessions]);

    const renderStatusBadge = (status: Session['status']) => {
        const StatusIcon = SESSION_STATUS_ICONS[status] || ClockIcon;
        const label = LABELS.SESSION_STATUS[status] || 'Desconhecido';

        let colorClass = 'bg-surface-container-low text-foreground-muted';
        if (status === 'scheduled') colorClass = 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300';
        if (status === 'draft') colorClass = 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300';
        if (status === 'completed') colorClass = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300';
        if (status === 'canceled') colorClass = 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300';
        if (status === 'missed') colorClass = 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';

        return (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${colorClass}`}>
                <StatusIcon className="w-3.5 h-3.5 mr-1.5" /> {label}
            </span>
        );
    };

    const handleMissedSessionClick = (sessionId: string) => {
        setOpenDropdownId(null);
        if (patient?.billing_settings?.charge_missed_sessions !== undefined) {
            onUpdateSessionStatus(sessionId, 'missed');
        } else {
            setMissedSessionId(sessionId);
            setRememberMissedDecision(true);
        }
    };

    const handleConfirmMissed = async (charge: boolean) => {
        if (!missedSessionId || !patient) return;
        
        if (rememberMissedDecision && updatePatient) {
            await updatePatient(patient.id, {
                billing_settings: {
                    ...patient.billing_settings,
                    model: patient.billing_settings?.model || 'per_session',
                    charge_missed_sessions: charge
                }
            });
            // Update local state optimistic if needed, but Context usually handles it
        }
        
        onUpdateSessionStatus(missedSessionId, 'missed');
        setMissedSessionId(null);
    };

    if (historySessions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center bg-surface-container-lowest rounded-3xl border border-border/40 animate-fadeIn shadow-sm">
                <div className="bg-surface-container-low p-6 rounded-full mb-4">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary/30">
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <line x1="10" y1="9" x2="8" y2="9" />
                    </svg>
                </div>
                <h3 className="text-base font-bold text-on-surface font-sans mb-1">Nenhum registro clínico ainda.</h3>
                <p className="text-sm text-foreground-muted font-sans max-w-xs mb-6">
                    Que tal prepararmos a primeira sessão de <span className="font-bold text-on-surface">{patient?.name?.split(' ')[0] || 'este paciente'}</span>?
                </p>
                {onAddSession && (
                    <Button onClick={onAddSession} className="!rounded-xl px-6 py-2.5 !bg-slate-900 dark:!bg-white !text-white dark:!text-slate-900 shadow-sm hover:opacity-90 transition-opacity flex items-center gap-2 font-bold text-sm">
                        <PlusIcon className="w-5 h-5" />
                        Nova Evolução
                    </Button>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {historySessions.map((session) => (
                <motion.div 
                    layout 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={session.id} 
                    className={`rounded-[28px] border shadow-sm flex flex-col transition-all duration-300 hover:shadow-md 
                        ${session.status === 'scheduled' ? 'bg-surface-container-lowest border-primary/20 ring-1 ring-primary/5' 
                        : session.extraction_status === 'failed_size_limit' ? 'bg-red-50/10 border-red-200 ring-1 ring-red-100 animate-pulse'
                        : 'bg-surface-container-lowest border-border/40'}`}
                >
                    <div className="rounded-t-[28px] border-b border-border/20 bg-surface-container-low/30 p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                {renderStatusBadge(session.status)}
                                <p className="font-semibold text-foreground-muted truncate">
                                    {formatDateTime(session.date)}
                                </p>
                                {session.extraction_status === 'processing' && (
                                    <span className="flex items-center text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-bold ml-2">
                                        <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Sintetizando inteligência...
                                    </span>
                                )}
                                {session.extraction_status === 'completed' && (
                                    <span className="flex items-center text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold ml-2">
                                        <CheckCircleIcon className="h-3 w-3 mr-1" /> Inteligência Ativa
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-between w-full sm:w-auto gap-4">
                            <div className="flex items-center gap-3">
                                <StatusBadge type="payment" value={session.paymentStatus} />
                                <span className="text-[11px] font-bold text-foreground-muted bg-surface-container-lowest px-3 py-1 rounded-full border border-border/40 shadow-sm">
                                    {session.duration} min • {LABELS.SESSION_TYPE[session.sessionType] || session.sessionType}
                                </span>
                            </div>

                            {canEdit && (
                                <div className="relative actions-dropdown-container ml-auto sm:ml-0">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === session.id ? null : session.id); }}
                                        className="p-2 rounded-full text-foreground-muted hover:bg-surface-container-high hover:text-on-surface transition-all active:scale-90"
                                        title="Opções da sessão"
                                    >
                                        <EllipsisVerticalIcon className="h-5 w-5" />
                                    </button>
                                    {openDropdownId === session.id && (
                                        <div className="absolute right-0 mt-3 w-64 origin-top-right rounded-2xl bg-surface shadow-2xl ring-1 ring-black/5 focus:outline-none z-50 border border-border/40 overflow-hidden animate-scaleIn">
                                            <div className="py-2" role="menu">
                                                <button onClick={(e) => { e.preventDefault(); onEditSession(session); setOpenDropdownId(null); }} className="w-full text-left text-on-surface flex items-center px-4 py-2.5 text-sm hover:bg-surface-container-low transition-colors font-medium">
                                                    <PencilIcon className="mr-3 h-4 w-4 text-primary" />
                                                    {session.status === 'draft' ? 'Continuar Rascunho' : session.status === 'scheduled' ? 'Realizar Evolução' : 'Editar Detalhes'}
                                                </button>

                                                <div className="border-t border-border/20 my-2"></div>
                                                <div className="px-4 py-1.5 text-[10px] font-bold text-foreground-muted uppercase tracking-widest opacity-60">Alterar Status</div>

                                                <button onClick={() => { onUpdateSessionStatus(session.id, 'completed'); setOpenDropdownId(null); }} className="w-full text-left text-emerald-600 flex items-center px-4 py-2.5 text-sm hover:bg-emerald-50/50 transition-colors font-medium">
                                                    <CheckCircleIcon className="mr-3 h-4 w-4" />Confirmar Realizada
                                                </button>
                                                <button onClick={() => handleMissedSessionClick(session.id)} className="w-full text-left text-amber-600 flex items-center px-4 py-2.5 text-sm hover:bg-amber-50/50 transition-colors font-medium">
                                                    <ExclamationIcon className="mr-3 h-4 w-4" />Falta do Paciente
                                                </button>
                                                <button onClick={() => { onUpdateSessionStatus(session.id, 'canceled'); setOpenDropdownId(null); }} className="w-full text-left text-red-600 flex items-center px-4 py-2.5 text-sm hover:bg-red-50/50 transition-colors font-medium">
                                                    <TrashIcon className="mr-3 h-4 w-4" />Cancelada
                                                </button>
                                                <button onClick={() => { onUpdateSessionStatus(session.id, 'scheduled'); setOpenDropdownId(null); }} className="w-full text-left text-blue-600 flex items-center px-4 py-2.5 text-sm hover:bg-blue-50/50 transition-colors font-medium">
                                                    <ClockIcon className="mr-3 h-4 w-4" />Reagendar (Em Aberto)
                                                </button>

                                                <div className="border-t border-border/20 my-2"></div>

                                                <button onClick={(e) => { e.preventDefault(); onUpdateSessionPaymentStatus(session.id); setOpenDropdownId(null); }} className="w-full text-left text-on-surface flex items-center px-4 py-2.5 text-sm hover:bg-surface-container-low transition-colors font-medium">
                                                    <SwitchHorizontalIcon className="mr-3 h-4 w-4 text-primary" />Inverter Pagamento
                                                </button>
                                                <button onClick={(e) => { e.preventDefault(); onDeleteSession(session.id); setOpenDropdownId(null); }} className="w-full text-left text-red-600 flex items-center px-4 py-2.5 text-sm hover:bg-red-50 transition-colors font-bold">
                                                    <TrashIcon className="mr-3 h-4 w-4" />Excluir Registro
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={() => onViewSessionNotes(session)}
                        className="rounded-b-[28px] p-6 sm:p-8 space-y-4 flex-grow text-left hover:bg-surface-container-low/20 transition-all focus:outline-none disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        disabled={!session.notes && session.status !== 'scheduled'}
                    >
                        <div>
                            <h4 className="font-bold text-sm text-on-surface mb-2 uppercase tracking-widest opacity-40">Anotações</h4>
                            {session.status === 'draft' ? (
                                <p className="text-sm text-amber-600 dark:text-amber-400 italic leading-relaxed flex items-center">
                                    <DocumentIcon className="w-4 h-4 mr-1.5 inline" />
                                    Rascunho em andamento. Clique em "Opções" {'>'} "Continuar Rascunho" para finalizar.
                                </p>
                            ) : session.status === 'scheduled' && !session.notes ? (
                                <p className="text-sm text-foreground-muted italic leading-relaxed">
                                    Sessão agendada. Clique em "Opções" {'>'} "Realizar Evolução" para adicionar anotações e confirmar a presença.
                                </p>
                            ) : (
                                <div>
                                    <p className="text-sm font-medium text-on-surface/80 whitespace-pre-wrap line-clamp-3 leading-relaxed">
                                        {getPlainTextFromSession(session.notes) || "Nenhuma anotação registrada."}
                                    </p>
                                    {session.extraction_status === 'failed_size_limit' && (
                                        <div className="mt-3 bg-red-50 text-red-700 p-3 rounded-xl border border-red-100 flex items-start gap-2">
                                            <ExclamationIcon className="w-5 h-5 flex-shrink-0" />
                                            <div>
                                                <strong className="block text-sm">Falha na Síntese Automática</strong>
                                                <span className="text-xs">O texto da sessão excedeu o limite máximo para processamento da Inteligência Artificial. Por favor, edite a anotação para resumi-la.</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        {session.tags && session.tags.length > 0 && (
                            <div className="pt-2">
                                <div className="flex flex-wrap gap-2">
                                    {session.tags.map(tag => (
                                        <span key={tag.id} className="inline-flex items-center px-3 py-1 bg-surface-container-low text-foreground-muted text-[10px] font-bold uppercase tracking-wider rounded-full border border-border/20 shadow-sm">
                                            <TagIcon className="mr-1.5 h-3 w-3 opacity-60" />
                                            {tag.text}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </button>
                </motion.div>
            ))}

            {/* Missed Session Modal */}
            {missedSessionId && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-surface-container-lowest rounded-3xl shadow-2xl border border-border/40 w-full max-w-md overflow-hidden animate-scaleIn">
                        <div className="p-6">
                            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mb-4">
                                <ExclamationIcon className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-on-surface tracking-tight mb-2">
                                O paciente faltou. Deseja cobrar por essa sessão?
                            </h3>
                            <p className="text-sm text-foreground-muted mb-6">
                                Se você optar por cobrar, o sistema gerará a fatura da sessão automaticamente. Você pode alterar essa política depois nas Configurações do Paciente.
                            </p>
                            
                            <label className="flex items-center gap-3 p-3 bg-surface-container-low rounded-xl cursor-pointer hover:bg-surface-container transition-colors border border-border/20 mb-6">
                                <input 
                                    type="checkbox" 
                                    className="w-5 h-5 rounded border-border/50 text-blue-600 focus:ring-blue-500/30"
                                    checked={rememberMissedDecision}
                                    onChange={(e) => setRememberMissedDecision(e.target.checked)}
                                />
                                <span className="text-sm font-medium text-on-surface">Lembrar minha decisão para este paciente</span>
                            </label>

                            <div className="flex gap-3">
                                <Button variant="secondary" className="flex-1 !rounded-xl" onClick={() => handleConfirmMissed(false)}>
                                    Não Cobrar
                                </Button>
                                <Button className="flex-1 !rounded-xl !bg-amber-600 hover:!bg-amber-700 !text-white border-0" onClick={() => handleConfirmMissed(true)}>
                                    Sim, Cobrar
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SessionList;
