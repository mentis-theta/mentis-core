import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useModals } from '@/contexts/ModalContext';
import { useModalScheduling } from '@/contexts/ModalSchedulingContext';
import { usePatientContext } from '@/contexts/PatientContext';
import { useNavigate } from 'react-router-dom';
import { SchedulingRequest } from '@/types';
import { useSchedulingRequests } from '@/hooks/useSchedulingRequests';
import Button from '../Button';
import { differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getWhatsAppLink } from '@/utils/whatsapp';
import { WhatsappIcon } from '../Icons';
import DeleteConfirmationModal from '../DeleteConfirmationModal';
import { Calendar, Phone, Mail, IdCard } from 'lucide-react';

interface SchedulingRequestDetailProps {
    requestId: string;
}

export const SchedulingRequestDetail: React.FC<SchedulingRequestDetailProps> = ({ requestId }) => {
    const { currentUser } = useAuth();
    const { patients } = usePatientContext();
    const navigate = useNavigate();
    const { openModal } = useModals();
    const {
        setSelectedDateForAppointment,
        setSelectedPatientIdForAppointment,
        setAppointmentRequestId,
        setSchedulingRequestContext
    } = useModalScheduling();

    const { pendingRequests, isLoading: loading, updateStatus } = useSchedulingRequests();

    // Derived state do React Query (Reatividade Automática)
    const request = pendingRequests.find(r => r.id === requestId) || null;

    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);

    const getWhatsAppMessage = (req: SchedulingRequest) => {
        const dateStr = format(new Date(req.requestedTime), "dd/MM/yyyy", { locale: ptBR });
        const timeStr = format(new Date(req.requestedTime), "HH:mm", { locale: ptBR });
        return `Olá, ${req.patientName}! Aqui é do consultório de psicologia. Recebi sua solicitação de agendamento para o dia ${dateStr} às ${timeStr}.`;
    };

    const waLink = request ? getWhatsAppLink(request.patientPhone, getWhatsAppMessage(request)) : null;

    const handleApprove = (req: SchedulingRequest) => {
        setSchedulingRequestContext(req);
        openModal('appointment');
    };

    const handleReject = async (req: SchedulingRequest) => {
        setIsRejectModalOpen(true);
    };

    const confirmReject = async () => {
        if (!request) return;
        setIsRejecting(true);
        try {
            updateStatus({ id: request.id, status: 'rejected' });
            navigate('/patients/requests');
        } catch (error) {
            console.error("Failed to reject request:", error);
        } finally {
            setIsRejecting(false);
            setIsRejectModalOpen(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!request) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center h-full">
                <p className="text-sm text-foreground-muted ">Solicitação não encontrada ou não está mais pendente.</p>
            </div>
        );
    }

    const isExistingPatient = patients.some(p => p.email === request.patientEmail);

    return (
        <div className="flex flex-col h-full bg-surface p-6 md:p-8 overflow-y-auto">
            <div className=" bg-surface rounded-2xl p-8 border border-border/60 shadow-sm max-w-3xl mx-auto w-full">

                <div className="flex items-start justify-between mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-2xl font-bold text-on-surface capitalize">{request.patientName}</h2>
                            {!isExistingPatient && (
                                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 font-medium tracking-wide border border-indigo-100 dark:border-indigo-800">
                                    Novo Paciente
                                </span>
                            )}
                        </div>
                        <p className=" text-foreground-muted ">Solicitante de Agendamento</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div className="space-y-4">
                        <div>
                            <h4 className="text-xs font-bold tracking-wider text-foreground-muted uppercase mb-1">Data Solicitada</h4>
                            <p className="font-medium text-on-surface flex items-center">
                                <Calendar className="w-4 h-4 mr-2" />
                                {format(new Date(request.requestedTime), "dd 'de' MMMM 'de' yyyy, 'às' HH:mm", { locale: ptBR })}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4 bg-surface p-4 rounded-xl border border-border ">
                        <div>
                            <h4 className="text-xs font-bold tracking-wider text-foreground-muted uppercase mb-1">Contato Telefônico</h4>
                            <p className="font-medium text-on-surface flex items-baseline">
                                <Phone className="w-4 h-4 mr-2 relative top-0.5" /> {request.patientPhone}
                            </p>
                        </div>
                        {request.patientEmail && (
                            <div>
                                <h4 className="text-xs font-bold tracking-wider text-foreground-muted uppercase mb-1">Email</h4>
                                <p className="font-medium text-on-surface flex items-baseline truncate">
                                    <Mail className="w-4 h-4 mr-2 relative top-0.5" /> {request.patientEmail}
                                </p>
                            </div>
                        )}
                        {request.patientCpf && (
                            <div>
                                <h4 className="text-xs font-bold tracking-wider text-foreground-muted uppercase mb-1">CPF Informado</h4>
                                <p className="font-medium text-on-surface flex items-baseline truncate">
                                    <IdCard className="w-4 h-4 mr-2 relative top-0.5" /> {request.patientCpf}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {request.notes && (
                    <div className="mb-8">
                        <h4 className="text-xs font-bold tracking-wider text-foreground-muted uppercase mb-2">Mensagem do Paciente</h4>
                        <div className="p-5 bg-yellow-50/50 dark:bg-yellow-900/10 rounded-xl border border-yellow-100 dark:border-yellow-900/50 text-foreground-muted italic whitespace-pre-wrap leading-relaxed shadow-inner">
                            "{request.notes}"
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-6 border-t border-border ">
                    <div className="flex-1">
                        {waLink && (
                            <a
                                href={waLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-xl border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 dark:border-emerald-800/50 dark:text-emerald-400 dark:hover:bg-emerald-900/20 transition-all duration-300 group"
                            >
                                <WhatsappIcon className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                                Contatar
                            </a>
                        )}
                    </div>
                    <Button onClick={() => handleReject(request)} variant="ghost" className="text-red-500 hover:bg-red-50 hover:text-red-600 font-medium px-6 border border-border/70 hover:border-red-200 bg-surface dark:hover:bg-red-900/20">
                        Recusar
                    </Button>
                    <Button onClick={() => handleApprove(request)} variant="primary" className="bg-slate-900 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all px-8">
                        Aprovar Agendamento
                    </Button>
                </div>
            </div>

            {/* Custom Reject Modal */}
            {isRejectModalOpen && request && (
                <DeleteConfirmationModal
                    isOpen={isRejectModalOpen}
                    onClose={() => setIsRejectModalOpen(false)}
                    onConfirm={confirmReject}
                    title="Recusar Solicitação?"
                    message={`Tem certeza que deseja recusar o agendamento de ${request.patientName}? Esta ação não pode ser desfeita.`}
                    confirmLabel={isRejecting ? "Recusando..." : "Sim, Recusar"}
                    cancelLabel="Cancelar"
                    variant="danger"
                />
            )}
        </div>
    );
};
