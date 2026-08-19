
import { useMemo } from 'react';
import type { Session } from '../types.ts';

export const useFinancialMetrics = (sessions: Session[]) => {
  const financialSummary = useMemo(() => {
    const totalBilled = sessions.reduce((acc, session) => acc + session.price, 0);
    const totalPaid = sessions
      .filter(s => s.paymentStatus === 'paid')
      .reduce((acc, session) => acc + session.price, 0);
    const outstandingBalance = totalBilled - totalPaid;
    
    return { totalBilled, totalPaid, outstandingBalance };
  }, [sessions]);
  
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sessions]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return {
    summary: financialSummary,
    sortedSessions,
    formatCurrency
  };
};
