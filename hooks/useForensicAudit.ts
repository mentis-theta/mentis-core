import { useState } from 'react';
import { supabase } from '@/services/supabaseClient';
import { useToast } from '@/contexts/ToastContext';

export interface ForensicClaim {
    statement: string;
    suggested_correction: string;
    evidence_level_found?: number;
    minimum_required_level?: number;
    inferential_leap_detected?: boolean;
}

export function useForensicAudit() {
    const [isAuditing, setIsAuditing] = useState(false);
    const [detectedClaims, setDetectedClaims] = useState<ForensicClaim[]>([]);
    const { addToast } = useToast();

    const auditText = async (patientId: string | undefined, plainText: string) => {
        if (!patientId || !plainText.trim()) return;
        
        setIsAuditing(true);
        setDetectedClaims([]);
        
        try {
            // 1. Fetch patient facts (ClinicalObservations)
            const { data: records, error: dbError } = await supabase
                .from('clinical_observations')
                .select('id, conceptId, value, valueType, evidence_level, date, evidence')
                .eq('patient_id', patientId)
                .order('date', { ascending: false })
                .limit(200);

            if (dbError) throw dbError;

            // 2. Invoke the autonomous Edge Function Validator
            const { data, error: fnError } = await supabase.functions.invoke('clinical-claim-validator', {
                body: { draftText: plainText, patientFacts: records || [] }
            });

            if (fnError) throw fnError;
            
            // 3. Process the findings
            if (data?.claims && data.claims.length > 0) {
                addToast(`${data.claims.length} saltos inferenciais detectados! Verifique a linha laranja.`, 'warning');
                setDetectedClaims(data.claims);
            } else {
                addToast('Auditoria concluída. Nenhum salto inferencial detectado.', 'success');
            }
            
            return data?.claims || [];

        } catch (e) {
            console.error("Forensic Audit Error:", e);
            addToast('Erro ao realizar a auditoria forense.', 'error');
            return [];
        } finally {
            setIsAuditing(false);
        }
    };

    return {
        isAuditing,
        detectedClaims,
        auditText
    };
}
