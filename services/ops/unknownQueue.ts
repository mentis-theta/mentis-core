import { CandidateConcept, DomainEvent } from '../../types';
import { eventBus } from './eventBus';

export type UnknownState = 'Captured' | 'UnderReview' | 'MappedToOntology' | 'Rejected';

export interface UnknownConceptRecord {
    id: string;
    patientId: string;
    concept: CandidateConcept;
    state: UnknownState;
    capturedAt: string;
    mappedToId?: string; // If mapped to an existing ontology ID
    reviewerId?: string; // ID of the human curator
}

class UnknownQueue {
    // Banco de dados em memória para o MVP
    private records: Map<string, UnknownConceptRecord> = new Map();

    public capture(patientId: string, concept: CandidateConcept): UnknownConceptRecord {
        const id = crypto.randomUUID();
        const record: UnknownConceptRecord = {
            id,
            patientId,
            concept,
            state: 'Captured',
            capturedAt: new Date().toISOString()
        };
        
        this.records.set(id, record);
        
        eventBus.publish({
            type: 'UnknownConceptCaptured',
            payload: { id, suggestedConcept: concept.suggestedConcept, patientId },
            timestamp: new Date().toISOString()
        });

        return record;
    }

    public getPending(): UnknownConceptRecord[] {
        return Array.from(this.records.values()).filter(r => r.state === 'Captured' || r.state === 'UnderReview');
    }

    public startReview(id: string, reviewerId: string): void {
        const record = this.records.get(id);
        if (record && record.state === 'Captured') {
            record.state = 'UnderReview';
            record.reviewerId = reviewerId;
            this.records.set(id, record);
            
            eventBus.publish({
                type: 'UnknownConceptReviewStarted',
                payload: { id, reviewerId },
                timestamp: new Date().toISOString()
            });
        }
    }

    public approveMapping(id: string, ontologyId: string): void {
        const record = this.records.get(id);
        if (record && record.state === 'UnderReview') {
            record.state = 'MappedToOntology';
            record.mappedToId = ontologyId;
            this.records.set(id, record);

            eventBus.publish({
                type: 'UnknownConceptMapped',
                payload: { id, originalConcept: record.concept.suggestedConcept, ontologyId },
                timestamp: new Date().toISOString()
            });
        }
    }

    public reject(id: string): void {
        const record = this.records.get(id);
        if (record && record.state === 'UnderReview') {
            record.state = 'Rejected';
            this.records.set(id, record);
            
            eventBus.publish({
                type: 'UnknownConceptRejected',
                payload: { id, originalConcept: record.concept.suggestedConcept },
                timestamp: new Date().toISOString()
            });
        }
    }
}

export const unknownQueue = new UnknownQueue();
