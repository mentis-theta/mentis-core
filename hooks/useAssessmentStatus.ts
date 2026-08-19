import { supabase } from '@/services/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useCrypto } from '@/contexts/CryptoContext';
import * as cryptoService from '@/services/cryptoService';
import { useQuery } from '@tanstack/react-query';

export interface AssessmentLinkStatus {
  id: string;
  scale_name: string;
  status: 'pending' | 'completed' | 'expired';
  score: number | null;
  severity: string | null;
  created_at: string;
  completed_at: string | null;
  expires_at: string;
}

export const useAssessmentStatus = (patientId?: string) => {
  const { currentUser } = useAuth();
  const { masterKey } = useCrypto();

  const fetchLinks = async (): Promise<AssessmentLinkStatus[]> => {
    if (!patientId || !currentUser || !masterKey) return [];

    const { data, error } = await supabase
      .from('assessment_links')
      .select('id, scale_name, status, score, severity, encrypted_payload, created_at, completed_at, expires_at')
      .eq('patient_id', patientId)
      .eq('psychologist_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching assessment links:', error);
      return [];
    }

    // Unpack private key
    const encryptedPrivateKey = localStorage.getItem('mentis_private_key');
    let privateKeyStr: string | null = null;
    
    if (encryptedPrivateKey) {
      try {
        privateKeyStr = cryptoService.decryptData(encryptedPrivateKey, masterKey);
      } catch (e) {
        console.error('Failed to unwrap private key', e);
      }
    }

    // Decrypt payloads and check expiration
    const results = await Promise.all((data || []).map(async (link: any) => {
      let decodedScore = link.score;
      let decodedSeverity = link.severity;

      if (link.encrypted_payload && privateKeyStr) {
        try {
          const decryptedPayload = await cryptoService.decryptAsymmetric<any>(link.encrypted_payload, privateKeyStr);
          decodedScore = decryptedPayload.score;
          decodedSeverity = decryptedPayload.severity;
        } catch (e) {
          console.error('Failed to decrypt assessment payload', e);
        }
      }

      return {
        ...link,
        score: decodedScore,
        severity: decodedSeverity,
        status: link.status === 'pending' && new Date(link.expires_at) < new Date()
          ? 'expired' as const
          : link.status,
      };
    }));

    return results;
  };

  const { data: links = [], isLoading } = useQuery({
    queryKey: ['assessmentLinks', patientId, masterKey],
    queryFn: fetchLinks,
    enabled: !!patientId && !!currentUser && !!masterKey,
    refetchInterval: 30000, // Polling a cada 30s para detectar respostas novas
  });

  const pendingCount = links.filter(l => l.status === 'pending').length;
  const completedCount = links.filter(l => l.status === 'completed').length;

  return {
    links,
    loading: isLoading,
    pendingCount,
    completedCount,
  };
};
