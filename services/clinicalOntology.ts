export type FactDomain = string;

export interface OntologyConcept {
    id: string; // e.g., 'SYM-0001'
    name: string; // e.g., 'mood.anxiety'
    domain: FactDomain;
    aliases: string[];
    description?: string;
}

export class ClinicalOntology {
    private concepts: Map<string, OntologyConcept> = new Map();
    private aliasesMap: Map<string, string> = new Map();

    register(concept: OntologyConcept) {
        this.concepts.set(concept.id, concept);
        this.aliasesMap.set(concept.name.toLowerCase(), concept.id);
        concept.aliases.forEach(alias => {
            this.aliasesMap.set(alias.toLowerCase(), concept.id);
        });
    }

    lookup(term: string): OntologyConcept | null {
        const id = this.aliasesMap.get(term.toLowerCase());
        if (!id) return null;
        return this.concepts.get(id) || null;
    }

    getById(id: string): OntologyConcept | null {
        return this.concepts.get(id) || null;
    }
    
    getAllConcepts(): OntologyConcept[] {
        return Array.from(this.concepts.values());
    }
}

// Instância global da ontologia
export const ontology = new ClinicalOntology();

// --- BUNDLE DE REGISTRO INICIAL ---

// DOMÍNIO: SINTOMAS (SYM)
ontology.register({ id: 'SYM-0001', name: 'sleep.insomnia', domain: 'symptom', aliases: ['insônia', 'dificuldade para dormir', 'falta de sono'] });
ontology.register({ id: 'SYM-0002', name: 'sleep.hypersomnia', domain: 'symptom', aliases: ['hipersonia', 'sono excessivo', 'excesso de sono'] });
ontology.register({ id: 'SYM-0003', name: 'mood.anxiety', domain: 'symptom', aliases: ['ansiedade', 'angústia', 'nervosismo', 'crise de ansiedade'] });
ontology.register({ id: 'SYM-0004', name: 'mood.depressed', domain: 'symptom', aliases: ['humor deprimido', 'depressão', 'tristeza', 'apatia', 'melancolia'] });
ontology.register({ id: 'SYM-0005', name: 'cognition.attention_deficit', domain: 'symptom', aliases: ['desatenção', 'déficit de atenção', 'dificuldade de concentração'] });

// DOMÍNIO: RISCO (RSK)
ontology.register({ id: 'RSK-0001', name: 'risk.suicidal_ideation', domain: 'risk', aliases: ['ideação suicida', 'pensamentos de morte', 'vontade de morrer'] });
ontology.register({ id: 'RSK-0002', name: 'risk.self_harm', domain: 'risk', aliases: ['autolesão', 'automutilação', 'cutting'] });

// DOMÍNIO: COMPORTAMENTO (BEH)
ontology.register({ id: 'BEH-0001', name: 'behavior.avoidance', domain: 'behavior', aliases: ['esquiva', 'evitação', 'comportamento evitativo'] });
ontology.register({ id: 'BEH-0002', name: 'behavior.compulsion', domain: 'behavior', aliases: ['compulsão', 'comportamento compulsivo'] });

// DOMÍNIO: OCUPAÇÃO (OCC)
ontology.register({ id: 'OCC-0001', name: 'occupation.absenteeism', domain: 'occupation', aliases: ['absenteísmo', 'faltas no trabalho'] });
ontology.register({ id: 'OCC-0002', name: 'occupation.burnout', domain: 'occupation', aliases: ['burnout', 'esgotamento profissional', 'estresse ocupacional'] });

// DOMÍNIO: DIAGNÓSTICO (DX)
ontology.register({ id: 'DX-0001', name: 'diagnosis.tag', domain: 'diagnosis', aliases: ['transtorno de ansiedade generalizada', 'tag', 'f41.1'] });
ontology.register({ id: 'DX-0002', name: 'diagnosis.mdd', domain: 'diagnosis', aliases: ['transtorno depressivo maior', 'depressão maior', 'f32'] });
