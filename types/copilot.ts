// CORE MÍNIMO V8 - DOMAIN TYPES

// 1. FUNDAÇÕES EPISTÊMICAS (Bottom-Up)

export interface AuthorityProfile {
  type: 'systematic_review' | 'clinical_guideline' | 'diagnostic_manual' | 'primary_study';
  evidenceLevel: string; 
  jurisdiction: string; 
  date: string;
  methodologicalStrength: 'high' | 'medium' | 'low';
}

export interface LiteratureNode {
  id: string;
  title: string;
  snippet: string;
  authority: AuthorityProfile;
  url?: string;
}

export interface ObservationNode {
  id: string;
  rawText: string;
  sourceContext: string; // Ex: "session_notes", "audio_transcript"
}

export interface ExtractedFactNode {
  id: string;
  fact: string;
  observationIds: string[]; // Links para ObservationNodes
}

// 2. ASSERÇÕES CLÍNICAS (A interpretação do fato)

export type AssertionStatus = 'sustained' | 'contested' | 'invalidated';
export type AssertionOrigin = 'engine' | 'therapist';

export interface ClinicalAssertionNode {
  id: string;
  assertion: string;
  type: string; // Ex: "Symptom", "BehavioralPattern", "CognitiveDistortion"
  status: AssertionStatus;
  origin: AssertionOrigin;
  justification: string;
  extractedFactIds: string[]; // Fatos estruturados que baseiam a asserção
  isContested: boolean;
}

// 3. O AGGREGATE ROOT: PROBLEM NODE

export interface StructuredIntervention {
  objective: string;
  technique: string;
  justification: string;
  goal: string;
  indicator: string;
  supportingLiteratureIds: string[];
}

export interface ProblemAssessment {
  intensity: 'mild' | 'moderate' | 'severe';
  course: 'acute' | 'chronic' | 'episodic';
  clinicalPriority: 'low' | 'medium' | 'high';
  assertionIds: string[]; // A rede de asserções que compõem este problema
  hypotheses: string[]; // Diferencial (Categorias nosológicas suspeitas)
}

export interface ProblemIntervention {
  structuredPlan: StructuredIntervention[];
}

export interface ProblemMonitoring {
  outcomes: string[]; // No futuro: Links para OutcomeNodes reais
  lastUpdated: string;
}

export interface ProblemNode {
  id: string;
  title: string;
  description: string;
  assessment: ProblemAssessment;
  intervention: ProblemIntervention;
  monitoring: ProblemMonitoring;
}

// 4. FORMULAÇÃO DE CASO (A Rede)

export interface CaseFormulationNode {
  problems: Record<string, ProblemNode>;
  assertions: Record<string, ClinicalAssertionNode>;
  facts: Record<string, ExtractedFactNode>;
  observations: Record<string, ObservationNode>;
  literature: Record<string, LiteratureNode>;
}

export interface EditorSnapshot {
  version: number;
  hash: string;
  charCount: number;
  timestamp: string;
}

export interface CopilotRequest {
  sessionContext: {
    useCurrentParagraph: boolean;
    useSelection: boolean;
    useLastNTokens: boolean;
    useFullSession: boolean;
  };
  editorSnapshot: EditorSnapshot;
  customQuery?: string;
}

export interface CopilotResult {
  snapshot_id: string;
  formulation: CaseFormulationNode;
}
