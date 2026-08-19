import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { usePatientEngagement } from '@/hooks/usePatientEngagement';
import { useDecoupledData } from '@/hooks/useDecoupledData';
import { Patient } from '@/types';

interface PredictiveAlertsProps {
    patient: Patient;
}

const PredictiveAlerts: React.FC<PredictiveAlertsProps> = ({ patient }) => {
    const { metrics, loading } = usePatientEngagement(patient.id);
    const { data: decoupledData, isLoading: decoupledLoading } = useDecoupledData(patient.id, 'summary');

    if (loading || decoupledLoading || !metrics || !patient.portalEnabled) return null;

    // Lógica para verificar a última sessão
    const sessions = decoupledData?.sessions || [];
    const pastSessions = [...sessions]
        .filter(s => new Date(s.date) < new Date())
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const lastSession = pastSessions[0];
    const lastSessionMissed = lastSession && (lastSession.status === 'missed' || lastSession.status === 'canceled');
    const hasAttendedLastSession = lastSession && !lastSessionMissed;

    // Regra de Negócio: Evasão iminente
    // Se não acessa há mais de 14 dias (baixo/inativo) E faltou/cancelou a última sessão
    const isHighRisk = (metrics.status === 'baixo' || metrics.status === 'inativo') && lastSessionMissed;

    // Regra de Negócio: Evasão silenciosa
    // Se não acessa há mais de 21 dias (mesmo comparecendo nas sessões, não engaja no tratamento)
    const isSilentRisk = metrics.status === 'inativo' && hasAttendedLastSession && metrics.hasPortalAccess === true;

    if (!isHighRisk && !isSilentRisk) return null; // Não mostra nada se estiver tudo bem

    return (
        <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 dark:bg-red-900/10 dark:border-red-900/50 p-4 animate-fadeIn flex items-start sm:items-center gap-4">
            <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-xl shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            
            <div className="flex-1">
                <h4 className="text-sm font-bold text-red-900 dark:text-red-300">
                    Alerta Preditivo: Risco de Evasão
                </h4>
                <p className="text-sm text-red-700/80 dark:text-red-400/80 mt-0.5">
                    {isHighRisk 
                        ? `O paciente faltou/cancelou a última sessão e não interage com o portal há mais de 14 dias.`
                        : `Apesar de comparecer às sessões, o paciente não conclui tarefas, preenche RPDs ou utiliza ferramentas clínicas no portal há mais de 21 dias.`}
                </p>
            </div>
            
            <div className="shrink-0 hidden sm:block">
                <span className="text-xs font-semibold px-2.5 py-1 bg-red-200 text-red-800 dark:bg-red-900/40 dark:text-red-300 rounded-lg">
                    Revisar Objetivos
                </span>
            </div>
        </div>
    );
};

export default PredictiveAlerts;
