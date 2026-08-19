import React, { useState, useEffect } from 'react';
import { getSchedulingRequests, updateSchedulingRequestStatus, deleteSchedulingRequest } from '@/services/bookingService';
import type { SchedulingRequest } from '@/types';
import Button from '../Button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Inbox, CalendarDays, Phone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/ConfirmContext';

// Simple types for props
interface LeadsInboxProps {
    onApprove: (request: SchedulingRequest) => void;
}

const LeadsInbox: React.FC<LeadsInboxProps> = ({ onApprove }) => {
    const { currentUser } = useAuth();
    const { addToast } = useToast();
    const [requests, setRequests] = useState<SchedulingRequest[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Estados de ux
    const [approvingId, setApprovingId] = useState<string | null>(null);
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const confirm = useConfirm();

    const loadRequests = async () => {
        if (!currentUser) return;
        setIsLoading(true);
        const data = await getSchedulingRequests(currentUser.id);
        const pending = data.filter(r => r.status === 'pending');
        setRequests(pending);
        setIsLoading(false);
    };

    useEffect(() => {
        loadRequests();
    }, [currentUser]);

    const handleReject = async (id: string) => {
        const isConfirmed = await confirm({
            title: "Recusar Solicitação?",
            message: "Tem certeza que deseja recusar este agendamento?",
            confirmText: "Sim, recusar"
        });
        if (!isConfirmed) return;

        setRejectingId(id);
        try {
            await updateSchedulingRequestStatus(id, 'rejected');
            setRequests(prev => prev.filter(r => r.id !== id));
            addToast("Solicitação recusada.", "info");
        } catch (e) {
            addToast("Erro ao recusar.", "error");
        } finally {
            setRejectingId(null);
        }
    };

    const handleApproveClick = async (req: SchedulingRequest) => {
        setApprovingId(req.id);
        // Feedback visual de carregamento (pequeno delay)
        await new Promise(resolve => setTimeout(resolve, 600));
        try {
            onApprove(req);
        } finally {
            setApprovingId(null);
        }
    };

    if (isLoading) return <div className="p-4 text-center text-foreground-muted ">Carregando solicitações...</div>;

    if (requests.length === 0) return (
        <div className="p-8 text-center text-foreground-muted bg-surface rounded-2xl border border-border mt-2">
            <h3 className="text-lg font-medium text-on-surface ">Nenhuma solicitação pendente</h3>
            <p className="text-sm mt-1">Os agendamentos feitos pelo seu link aparecerão aqui.</p>
        </div>
    );

    return (
        <div className="space-y-4 pt-2">
            {requests.map(req => {
                const isApproving = approvingId === req.id;
                const isRejecting = rejectingId === req.id;
                const isBusy = isApproving || isRejecting;

                return (
                    <div
                        key={req.id}
                        className={` bg-surface  p-5 rounded-2xl border  border-border/60  flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all duration-300 ${isApproving ? 'opacity-40 scale-95 pointer-events-none blur-[1px]' : 'opacity-100 scale-100'}`}
                    >
                        <div className="flex-1 w-full">
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="font-bold text-lg text-on-surface ">{req.patientName}</span>
                                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold tracking-wider">NOVO</span>
                            </div>

                            <div className="space-y-1">
                                <p className="text-sm text-foreground-muted font-medium flex items-center gap-1.5">
                                    <CalendarDays className="w-4 h-4 opacity-80" />
                                    {format(new Date(req.requestedTime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </p>
                                <p className="text-sm text-foreground-muted font-medium truncate flex items-center gap-1.5">
                                    <Phone className="w-4 h-4 opacity-80" />
                                    {req.patientPhone}
                                    {req.patientEmail && <span className="ml-2 font-normal text-foreground-muted ">| {req.patientEmail}</span>}
                                </p>
                            </div>

                            {req.notes && (
                                <div className="mt-3 p-3 bg-surface rounded-xl border border-border text-sm text-foreground-muted italic">
                                    "{req.notes}"
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t border-border/40 sm:border-0 justify-end">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="flex-1 sm:flex-none text-red-600 hover:bg-red-50 hover:text-red-700 font-medium px-4 py-2 border border-border/60 hover:border-red-200 bg-surface "
                                onClick={() => handleReject(req.id)}
                                disabled={isBusy}
                                isLoading={isRejecting}
                            >
                                Recusar
                            </Button>
                            <Button
                                variant="primary"
                                size="sm"
                                className="flex-1 sm:flex-none bg-slate-900 text-white hover:bg-slate-800 shadow-sm font-medium px-5 py-2"
                                onClick={() => handleApproveClick(req)}
                                disabled={isBusy}
                                isLoading={isApproving}
                            >
                                Aprovar
                            </Button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default LeadsInbox;
