import React, { useState, useEffect, useRef } from 'react';
import { getSchedulingRequests, updateSchedulingRequestStatus } from '@/services/bookingService';
import type { SchedulingRequest } from '@/types';
import Button from '../Button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { useSchedulingRequests } from '@/hooks/useSchedulingRequests';
import { useConfirm } from '../../contexts/ConfirmContext';
import { Inbox, Sparkles, Calendar, Phone as PhoneIcon, Mail } from 'lucide-react';
interface LeadsInboxPopoverProps {
    onApprove: (request: SchedulingRequest) => void;
}

const LeadsInboxPopover: React.FC<LeadsInboxPopoverProps> = ({ onApprove }) => {
    const { currentUser } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const { pendingRequests: requests, isLoading, updateStatus, rejectRequest, pendingCount } = useSchedulingRequests();
    const confirm = useConfirm();

    // Estados de ux
    const [approvingId, setApprovingId] = useState<string | null>(null);
    const [rejectingId, setRejectingId] = useState<string | null>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);


    const handleReject = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const isConfirmed = await confirm({
            title: "Recusar Solicitação?",
            message: "Tem certeza que deseja recusar este agendamento? Esta ação não pode ser desfeita e o paciente receberá um feedback negativo.",
            confirmText: "Sim, recusar"
        });
        if (!isConfirmed) return;

        setRejectingId(id); // Set loading state for this specific item

        try {
            await rejectRequest(id); // Use the new rejectRequest from hook
            addToast("Solicitação recusada.", "info");
            if (requests.length <= 1) { // If this was the last request, close the popover
                setIsOpen(false);
            }
        } catch (error) {
            addToast("Erro ao recusar.", "error");
        } finally {
            setRejectingId(null);
        }
    };

    const handleApproveClick = async (req: SchedulingRequest, e: React.MouseEvent) => {
        e.stopPropagation(); // Previne fechar
        setApprovingId(req.id);
        // Feedback visual de carregamento (pequeno delay)
        await new Promise(resolve => setTimeout(resolve, 600));
        try {
            setIsOpen(false); // Fecha o menu pois vai abrir o modal
            onApprove(req);
        } finally {
            setApprovingId(null);
        }
    };

    return (
        <div className="relative" ref={menuRef}>
            <Button
                onClick={() => setIsOpen(!isOpen)}
                variant="ghost"
                size="sm"
                className="hidden sm:flex relative items-center text-foreground-muted hover:bg-slate-100 dark:hover:bg-slate-800 !rounded-xl"
                title="Solicitações de Agendamento"
            >
                <Inbox className="w-4 h-4 mr-1.5" />
                <span className="text-sm font-medium">Solicitações</span>

                {pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                        {pendingCount}
                    </span>
                )}
            </Button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface rounded-2xl shadow-xl border border-border z-50 transform origin-top-right transition-all flex flex-col max-h-[85vh]">
                    <div className="px-4 py-3 border-b border-border bg-surface/50 rounded-t-2xl shrink-0">
                        <h3 className="font-bold text-on-surface ">Novos Pacientes</h3>
                    </div>

                    <div className="overflow-y-auto p-2 space-y-2">
                        {isLoading && requests.length === 0 ? (
                            <div className="p-4 text-center text-sm text-foreground-muted ">Carregando...</div>
                        ) : requests.length === 0 ? (
                            <div className="p-6 text-center text-foreground-muted bg-surface/50 rounded-xl my-2 border border-border/50 flex flex-col items-center">
                                <Sparkles className="w-8 h-8 mb-2 opacity-50 text-indigo-400" />
                                <p className="text-sm font-medium">Nenhuma solicitação pendente</p>
                            </div>
                        ) : (
                            requests.map(req => {
                                const isApproving = approvingId === req.id;
                                const isRejecting = rejectingId === req.id;
                                const isBusy = isApproving || isRejecting;

                                return (
                                    <div
                                        key={req.id}
                                        className={` bg-surface    p-3.5 rounded-xl border  border-border/60    flex flex-col gap-3 transition-all duration-300 ${isApproving ? 'opacity-40 scale-[0.98] pointer-events-none blur-[1px]' : 'opacity-100 scale-100'}`}
                                    >
                                        <div className="flex-1 w-full space-y-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-bold text-base text-on-surface line-clamp-1">{req.patientName}</span>
                                            </div>

                                            <p className="flex items-center text-xs text-foreground-muted font-medium">
                                                <Calendar className="w-3.5 h-3.5 mr-1.5 opacity-80" />
                                                {format(new Date(req.requestedTime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                            </p>
                                            <p className="flex items-center text-xs text-foreground-muted font-medium truncate">
                                                <PhoneIcon className="w-3.5 h-3.5 mr-1.5 opacity-80" />
                                                {req.patientPhone}
                                            </p>

                                            {req.patientEmail && (
                                                <p className="flex items-center text-xs text-foreground-muted font-medium truncate">
                                                    <Mail className="w-3.5 h-3.5 mr-1.5 opacity-80" />
                                                    {req.patientEmail}
                                                </p>
                                            )}

                                            {req.notes && (
                                                <div className="line-clamp-3 text-sm text-foreground-muted italic mt-2">
                                                    "{req.notes}"
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-2 w-full pt-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="flex-1 text-red-600 hover:bg-red-50 hover:text-red-700 font-medium px-2 py-1.5 text-xs border border-border/60 hover:border-red-200 bg-surface "
                                                onClick={(e) => handleReject(req.id, e)}
                                                disabled={isBusy}
                                                isLoading={isRejecting}
                                            >
                                                Recusar
                                            </Button>
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                className="flex-1 bg-slate-900 text-white hover:bg-slate-800 shadow-sm font-medium px-2 py-1.5 text-xs"
                                                onClick={(e) => handleApproveClick(req, e)}
                                                disabled={isBusy}
                                                isLoading={isApproving}
                                            >
                                                Aprovar
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                    {/* Ponto de Entrada para o Gerenciador */}
                    {requests.length > 0 && (
                        <div className="p-3 bg-surface rounded-b-2xl shrink-0 mt-auto">
                            <button
                                onClick={() => { setIsOpen(false); navigate('/patients/requests'); }}
                                className="text-sm font-medium text-foreground-muted hover:text-slate-900 dark:hover:text-slate-200 text-center w-full block pt-3 border-t border-border transition-colors"
                            >
                                Ver todas as solicitações
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default LeadsInboxPopover;
