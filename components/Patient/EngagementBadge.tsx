import React from 'react';
import { usePatientEngagement } from '@/hooks/usePatientEngagement';
import { Flame, Activity, TrendingDown, Moon } from 'lucide-react';

interface EngagementBadgeProps {
    patientId: string;
    className?: string;
}

const EngagementBadge: React.FC<EngagementBadgeProps> = ({ patientId, className = '' }) => {
    const { metrics, loading } = usePatientEngagement(patientId);

    if (loading || !metrics) return null;

    const getStatusConfig = () => {
        switch (metrics.status) {
            case 'alto':
                return {
                    icon: <Flame className="w-3.5 h-3.5 opacity-80" />,
                    text: 'Alto Engajamento',
                    styles: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                };
            case 'medio':
                return {
                    icon: <Activity className="w-3.5 h-3.5 opacity-80" />,
                    text: 'Engajamento Médio',
                    styles: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                };
            case 'baixo':
                return {
                    icon: <TrendingDown className="w-3.5 h-3.5 opacity-80" />,
                    text: 'Baixo Engajamento',
                    styles: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
                };
            case 'inativo':
                return {
                    icon: <Moon className="w-3.5 h-3.5 opacity-80" />,
                    text: 'Inativo no Portal',
                    styles: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                };
        }
    };

    const config = getStatusConfig();

    return (
        <span className={`${className} ${config.styles}`} title={`Última atividade: ${metrics.daysSinceLastActivity !== null ? `${metrics.daysSinceLastActivity} dias atrás` : 'Nenhuma'}`}>
            {config.icon} {config.text}
        </span>
    );
};

export default EngagementBadge;
