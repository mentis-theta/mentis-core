
import { GOAL_STATUSES, SESSION_TYPES, INTERVENTION_STATUSES, FEEDBACK_EFFECTIVENESS, SESSION_STATUSES } from '../types.ts';
import { CheckCircleIcon, ClockIcon, SparklesIcon, ThumbUpIcon, MinusCircleIcon, ThumbDownIcon, ExclamationIcon, TrashIcon, PencilIcon } from '../components/Icons';

// --- Labels (Traduções) ---

export const LABELS = {
    SESSION_TYPE: {
        individual: 'Individual',
        couple: 'Casal',
        family: 'Família',
        group: 'Grupal'
    },
    PAYMENT_STATUS: {
        paid: 'Pago',
        pending: 'Pendente'
    },
    SESSION_STATUS: {
        scheduled: 'Agendada',
        draft: 'Rascunho',
        completed: 'Realizada',
        canceled: 'Cancelada',
        missed: 'Falta do Paciente'
    },
    GOAL_STATUS: {
        in_progress: 'Em Andamento',
        achieved: 'Alcançada',
        paused: 'Em Pausa'
    },
    INTERVENTION_STATUS: {
        planned: 'Planejada',
        in_progress: 'Em Andamento',
        completed: 'Concluída'
    },
    EFFECTIVENESS: {
        effective: 'Efetiva',
        partially_effective: 'Parcial',
        ineffective: 'Inefetiva'
    }
} as const;

// --- Colors (Styles) ---

export const STATUS_COLORS = {
    PAYMENT: {
        paid: 'bg-primary/10 text-primary',
        pending: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    },
    GOAL: {
        in_progress: 'bg-primary/10 text-primary',
        achieved: 'bg-primary/20 text-primary',
        paused: 'bg-surface-container text-on-surface-variant',
    },
    EFFECTIVENESS: {
        effective: 'text-primary',
        partially_effective: 'text-amber-600 dark:text-amber-400',
        ineffective: 'text-red-600 dark:text-red-400',
    }
};

// --- Icons Maps ---

export const INTERVENTION_ICONS = {
    planned: ClockIcon,
    in_progress: SparklesIcon,
    completed: CheckCircleIcon,
};

export const EFFECTIVENESS_ICONS = {
    effective: ThumbUpIcon,
    partially_effective: MinusCircleIcon,
    ineffective: ThumbDownIcon,
};

export const SESSION_STATUS_ICONS = {
    scheduled: ClockIcon,
    draft: PencilIcon,
    completed: CheckCircleIcon,
    canceled: TrashIcon,
    missed: ExclamationIcon
};
