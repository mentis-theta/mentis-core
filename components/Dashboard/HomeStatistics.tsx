import React from 'react';
import { useNavigate } from 'react-router-dom';

interface HomeStatisticsProps {
    activePatients: number;
    completedSessions: number;
    monthlyRevenue: number;
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface StatItem {
    id: string;
    icon: React.ReactNode;
    label: string;
    before: string;
    highlight: string;
    after: string;
    tooltip?: string;
    containerClass?: string;
    highlightClass?: string;
    onClick?: () => void;
}

// ── Icon components ────────────────────────────────────────────────────────────
const IconPeople = ({ className }: { className?: string }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M16 11C17.66 11 18.99 9.66 18.99 8C18.99 6.34 17.66 5 16 5C14.34 5 13 6.34 13 8C13 9.66 14.34 11 16 11ZM8 11C9.66 11 10.99 9.66 10.99 8C10.99 6.34 9.66 5 8 5C6.34 5 5 6.34 5 8C5 9.66 6.34 11 8 11ZM8 13C5.67 13 1 14.17 1 16.5V19H15V16.5C15 14.17 10.33 13 8 13ZM16 13C15.71 13 15.38 13.02 15.03 13.05C16.19 13.89 17 15.02 17 16.5V19H23V16.5C23 14.17 18.33 13 16 13Z" fill="currentColor" />
    </svg>
);

const IconCheck = ({ className }: { className?: string }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor" />
    </svg>
);

const IconMoney = ({ className }: { className?: string }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" fill="currentColor" />
    </svg>
);

// ── StatRow ────────────────────────────────────────────────────────────────────
function StatRow({ item }: { item: StatItem }) {
    return (
        <div
            onClick={item.onClick}
            className={`flex items-center gap-4 py-3.5 px-4 rounded-2xl bg-transparent transition-colors relative overflow-hidden group ${item.onClick ? 'cursor-pointer hover:bg-surface-container-low' : 'cursor-default'
                }`}
        >
            {/* M3 tonal icon container — 40dp */}
            <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${item.containerClass || 'bg-surface-dim'}`}
            >
                {item.icon}
            </div>

            {/* Text */}
            <p className="text-on-surface font-sans m-0 leading-6 text-base" title={item.tooltip}>
                {item.before && <span>{item.before} </span>}
                <span className={`text-base font-medium ${item.highlightClass || 'text-foreground'}`}>
                    {item.highlight}
                </span>
                {item.after && <span> {item.after}</span>}
            </p>
        </div>
    );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export const HomeStatistics: React.FC<HomeStatisticsProps> = ({
    activePatients,
    completedSessions,
    monthlyRevenue
}) => {
    const navigate = useNavigate();

    const stats: StatItem[] = [
        {
            id: "patients",
            icon: <IconPeople className="text-primary" />,
            label: "Pacientes ativos",
            before: "Você possui",
            highlight: activePatients.toString(),
            after: "paciente(s) ativo(s).",
            containerClass: "bg-primary/10",
            highlightClass: "text-primary",
            onClick: () => navigate('/patients'),
        },
        {
            id: "sessions",
            icon: <IconCheck className="text-primary" />,
            label: "Atendimentos realizados",
            before: "Você já realizou",
            highlight: completedSessions.toString(),
            after: "atendimento(s).",
            containerClass: "bg-primary/10",
            highlightClass: "text-primary",
        },
        {
            id: "revenue",
            icon: <IconMoney className="text-emerald-600 dark:text-emerald-400" />,
            label: "Receita do mês",
            before: "Você já recebeu",
            highlight: "R$ " + monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
            after: "este mês.",
            tooltip: "Baseado em faturas pagas e lançamentos manuais.",
            containerClass: "bg-emerald-500/10",
            highlightClass: "text-primary",
            onClick: () => navigate('/financial'),
        },
    ];

    return (
        <div className="w-full bg-surface-container-lowest/90 backdrop-blur-md rounded-pill-card shadow-airy overflow-hidden pt-7 px-4 pb-6">
            {/* M3 Card Header */}
            <div className="px-4 pb-2">
                <h2 className="text-xl font-semibold text-on-surface font-sans m-0">
                    Estatísticas
                </h2>
            </div>

            {/* Divider */}
            <div className="h-px bg-border mx-4 mt-1 mb-2" />

            {/* Stat rows */}
            <div className="flex flex-col gap-0.5 px-2">
                {stats.map((item) => (
                    <StatRow key={item.id} item={item} />
                ))}
            </div>
        </div>
    );
};
