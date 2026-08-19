import { ClinicalObservation } from '../../types';
import { ClassifiedEvidence } from './evidenceClassifier';

/**
 * Módulo Construtor de Observações (Observation Builder)
 * 
 * Função estritamente determinística. Pega as evidências classificadas
 * e as resolve no formato ClinicalObservation.
 */
export function buildObservations(patientId: string, classified: ClassifiedEvidence[]): ClinicalObservation[] {
    return classified.map(cls => {
        let finalValue: string | number = cls.value;
        if (typeof cls.value === 'boolean') {
            finalValue = cls.candidate.rawText; // Fallback se vazou um boolean
        }
        
        return {
            id: crypto.randomUUID(),
            patient_id: patientId,
            conceptId: cls.conceptId,
            value: finalValue,
            valueType: typeof finalValue === 'number' ? 'numeric' : 'text',
            date: new Date().toISOString(), // Idealmente, pegaria a data da sessão original
            isCurrent: true,
            evidence: cls.evidence,
            evidence_level: cls.evidence_level || 1,
            status: 'PendingExtraction' // Estado inicial da máquina de estados do Mentis 2.0
        };
    });
}
