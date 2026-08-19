import { Patient, Session } from '../types';

export const getNextSession = (sessions: Session[]): Session | undefined => {
    return sessions
        ?.filter(s => new Date(s.date) > new Date() && s.status === 'scheduled')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
};

export const calculatePendingPayments = (sessions: Session[]): number => {
    return sessions
        ?.filter(s => s.paymentStatus === 'pending')
        .reduce((acc, s) => acc + (s.price || 0), 0) || 0;
};
