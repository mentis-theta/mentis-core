import React, { useMemo } from 'react';
import { usePatientContext } from '@/contexts/PatientContext';
import { useDecoupledData } from '@/hooks/useDecoupledData';
import { Loader2 } from 'lucide-react';
import SessionList from '@/components/Session/SessionList';

interface SessionTabProps {
    canEdit: boolean;
}

const SessionTab: React.FC<SessionTabProps> = ({ canEdit }) => {
    const {
        patient,
        openViewSessionNotes,
        openSessionEditor,
        updateSessionPaymentStatus,
        updateSessionStatus,
        deleteSession
    } = usePatientContext();

    const { data: decoupledData, isLoading: decoupledLoading } = useDecoupledData(patient?.id || '', 'full_audit');

    const sortedSessions = useMemo(() => {
        if (!decoupledData) return [];
        return [...(decoupledData.sessions || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [decoupledData]);

    if (!patient) return null;

    if (decoupledLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fadeIn">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold text-on-surface tracking-tight">Histórico de Sessões</h3>
                    <p className="mt-1 text-sm font-medium text-foreground-muted">
                        Linha do tempo completa dos atendimentos realizados.
                    </p>
                </div>
            </div>

            <SessionList
                sessions={sortedSessions}
                canEdit={canEdit}
                onViewSessionNotes={openViewSessionNotes}
                onEditSession={openSessionEditor}
                onUpdateSessionPaymentStatus={(sid) => updateSessionPaymentStatus(patient.id, sid)}
                onUpdateSessionStatus={(sid, status) => updateSessionStatus(patient.id, sid, status)}
                onDeleteSession={(sid) => deleteSession(patient.id, sid)}
                onAddSession={() => openSessionEditor()}
            />
        </div>
    );
};

export default SessionTab;
