import { useQuery } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { supabase } from '@/services/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

export interface AssessmentNotification {
  id: string;
  patient_id: string;
  patient_name: string;
  scale_name: string;
  score: number;
  severity: string;
  date: string;
  is_critical: boolean;
  critical_value?: number;
}

const STORAGE_KEY_PREFIX = 'mentis_notif_seen_';

export const useNotifications = () => {
  const { currentUser } = useAuth();
  const storageKey = `${STORAGE_KEY_PREFIX}${currentUser?.id || ''}`;

  // Inicializa com timestamp salvo ou 30 dias atrás como fallback
  const [lastSeenAt] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) return saved;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    return thirtyDaysAgo;
  });

  const fetchNotifications = async (): Promise<AssessmentNotification[]> => {
    if (!currentUser) return [];

    // Buscar clinical_records recentes de self-report com JOIN em patients
    const { data, error } = await supabase
      .from('clinical_records')
      .select(`
        id,
        patient_id,
        date,
        metadata,
        patients!patient_id ( name )
      `)
      .eq('author_id', currentUser.id)
      .eq('type', 'clinical_tool')
      .eq('metadata->>toolType', 'inventory')
      .eq('metadata->>source', 'patient_self_report')
      .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('date', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }

    return (data || []).map((r: any) => ({
      id: r.id,
      patient_id: r.patient_id,
      patient_name: r.patients?.name || 'Paciente',
      scale_name: r.metadata?.scaleName || '',
      score: r.metadata?.score ?? 0,
      severity: r.metadata?.severity || '',
      date: r.date,
      is_critical: r.metadata?.critical_item_flagged === true,
      critical_value: r.metadata?.critical_item_value,
    }));
  };

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['assessmentNotifications', currentUser?.id],
    queryFn: fetchNotifications,
    enabled: !!currentUser,
    refetchInterval: 60000, // Polling a cada 60s
  });

  const unreadNotifications = notifications.filter(n => n.date > lastSeenAt);
  const unreadCount = unreadNotifications.length;

  const markAllAsRead = useCallback(() => {
    localStorage.setItem(storageKey, new Date().toISOString());
    // Force re-render by invalidating the query won't help here since lastSeenAt
    // is initialized once. We reload from storage on next mount.
    window.dispatchEvent(new Event('storage'));
  }, [storageKey]);

  return {
    notifications,
    unreadCount,
    markAllAsRead,
    loading: isLoading,
  };
};
