import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useModals } from '@/contexts/ModalContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { usePatientContext } from '@/contexts/PatientContext';
import { SchedulingRequest } from '@/types';
import { useSchedulingRequests } from '@/hooks/useSchedulingRequests';
import Button from '../Button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useModalScheduling } from '@/contexts/ModalSchedulingContext';
import { Calendar, Clock, MapPin, Search, Filter, Phone, Mail, CheckCircle, XCircle, Trash2, ArrowRight, Sparkles } from 'lucide-react';

interface SchedulingRequestsListProps {
    isMasterList?: boolean;
    selectedRequestId?: string | null;
    onSelectRequest?: (id: string) => void;
}

export const SchedulingRequestsList: React.FC<SchedulingRequestsListProps> = ({ isMasterList, selectedRequestId, onSelectRequest }) => {
    const { openModal } = useModals();
    const {
        setSelectedDateForAppointment,
        setSelectedPatientIdForAppointment,
        setAppointmentRequestId,
        setSchedulingRequestContext
    } = useModalScheduling();

    const { pendingRequests: requests, isLoading: loading, updateStatus } = useSchedulingRequests();
    const confirm = useConfirm();
    const { patients } = usePatientContext();

    const handleApprove = (req: SchedulingRequest) => {
        setSchedulingRequestContext(req);
        openModal('appointment');
    };

    const handleReject = async (req: SchedulingRequest) => {
        const isConfirmed = await confirm({
            title: "Rejeitar Solicitação?",
            message: "Tem certeza que deseja rejeitar esta solicitação?",
            confirmText: "Sim, rejeitar"
        });
        if (isConfirmed) {
            updateStatus({ id: req.id, status: 'rejected' });
        }
    };

    if (loading && requests.length === 0) return null; // Don't show loading state on initial load to avoid flicker if clean? Or show spinner?
    // Determine visibility based on requests count
    if (!isMasterList && requests.length === 0) return null;

    if (isMasterList && requests.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-12 w-12 rounded-2xl bg-background flex items-center justify-center mb-3 text-slate-400">
                    <Sparkles className="w-6 h-6" />
                </div>
                <p className="text-sm text-foreground-muted ">
                    Nenhuma solicitação pendente no momento.
                </p>
            </div>
        );
    }

    const Container = 'div';
    const containerClasses = isMasterList
        ? "flex flex-col"
        : "bg-surface-container-lowest rounded-3xl shadow-sm mb-8 border border-border/40 overflow-hidden";

    const ListWrapper = isMasterList ? 'div' : 'ul';
    const listClasses = isMasterList ? "space-y-1.5" : "divide-y divide-slate-100 dark:divide-slate-700 max-h-60 overflow-y-auto";

    const ItemWrapper = isMasterList ? 'div' : 'li';

    return (
        <Container className={`${containerClasses} animate-fadeIn`}>
            {!isMasterList && (
                <div className="p-5 border-b border-border/40 bg-surface-container-low flex justify-between items-center px-6">
                    <h3 className="text-sm font-bold text-on-surface flex items-center font-sans uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-primary mr-2 animate-pulse"></span>
                        Solicitações Pendentes ({requests.length})
                    </h3>
                </div>
            )}
            <ListWrapper className={listClasses}>
                {requests.map(req => {
                    const isSelected = isMasterList && selectedRequestId === req.id;
                    const itemClasses = isMasterList
                        ? `mx-2 p-3.5 rounded-xl border flex flex-col cursor-pointer transition-all duration-300 ${isSelected ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 shadow-sm' : ' bg-surface     border-border/60    hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:shadow-sm'}`
                        : "p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors gap-3";

                    return (
                        <ItemWrapper key={req.id} className={itemClasses} onClick={() => isMasterList && onSelectRequest && onSelectRequest(req.id)}>
                            <div className="flex-1 w-full">
                                <div className="flex items-center space-x-2 mb-1.5">
                                    <span className={`font-semibold capitalize ${isMasterList ? 'text-sm' : 'text-base font-bold'} ${isSelected ? 'text-indigo-900 dark:text-indigo-100' : ' text-on-surface   '}`}>{req.patientName}</span>
                                    {!patients.some(p => p.email === req.patientEmail) && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 font-medium tracking-wide">Novo</span>
                                    )}
                                </div>

                                <div className={`flex flex-col gap-1.5 ${isMasterList ? 'mb-2' : 'mb-1 items-start sm:flex-row sm:items-center gap-x-4'}`}>
                                    <p className="text-xs text-foreground-muted font-medium truncate flex items-center">
                                        <Calendar className="w-3.5 h-3.5 mr-1.5" />
                                        {format(new Date(req.requestedTime), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                                    </p>
                                    {!isMasterList && (
                                        <>
                                            <p className="text-sm text-foreground-muted font-medium flex items-center">
                                                <Mail className="w-3.5 h-3.5 mr-1.5" />{req.patientEmail}
                                            </p>
                                            <p className="text-sm text-foreground-muted font-medium flex items-center">
                                                <Phone className="w-3.5 h-3.5 mr-1.5" />{req.patientPhone}
                                            </p>
                                        </>
                                    )}
                                </div>

                                {req.notes && (
                                    <div className={`text-xs  text-foreground-muted    ${isMasterList
                                        ? "line-clamp-2 mt-1 italic"
                                        : "text-sm italic mt-1"
                                        }`}>
                                        "{req.notes}"
                                    </div>
                                )}
                            </div>
                            {!isMasterList && (
                                <div className="flex space-x-2 mt-2 sm:mt-0">
                                    <Button onClick={(e) => { e.stopPropagation(); handleApprove(req); }} size="sm" variant="primary">
                                        Agendar
                                    </Button>
                                    <Button onClick={(e) => { e.stopPropagation(); handleReject(req); }} size="sm" variant="secondary" className="text-red-600 hover:text-red-700">
                                        Recusar
                                    </Button>
                                </div>
                            )}
                        </ItemWrapper>
                    );
                })}
            </ListWrapper>
        </Container>
    );
};
