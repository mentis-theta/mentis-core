
import React from 'react';
import { LABELS, STATUS_COLORS } from '@/utils/mappers.ts';

type BadgeType = 'payment' | 'goal';

interface StatusBadgeProps {
    type: BadgeType;
    value: string;
    className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ type, value, className = '' }) => {
    let label = value;
    let colorClass = 'bg-background text-on-surface';

    if (type === 'payment') {
        label = LABELS.PAYMENT_STATUS[value as keyof typeof LABELS.PAYMENT_STATUS] || value;
        colorClass = STATUS_COLORS.PAYMENT[value as keyof typeof STATUS_COLORS.PAYMENT] || colorClass;
    } else if (type === 'goal') {
        label = LABELS.GOAL_STATUS[value as keyof typeof LABELS.GOAL_STATUS] || value;
        colorClass = STATUS_COLORS.GOAL[value as keyof typeof STATUS_COLORS.GOAL] || colorClass;
    }

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass} ${className}`}>
            {label}
        </span>
    );
};

export default StatusBadge;
