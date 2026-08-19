import type { ReactNode } from 'react';

export const SESSION_TYPES = ['individual', 'couple', 'family', 'group'] as const;
export const PATIENT_STATUSES = ['active', 'inactive', 'archived', 'discharged'] as const;
export const GOAL_STATUSES = ['in_progress', 'achieved', 'paused'] as const;
export const INTERVENTION_STATUSES = ['planned', 'in_progress', 'completed'] as const;
export const PATIENT_TASK_STATUSES = ['pending', 'completed'] as const;
export const FEEDBACK_EFFECTIVENESS = ['effective', 'partially_effective', 'ineffective'] as const;
export const SESSION_STATUSES = ['scheduled', 'draft', 'completed', 'canceled', 'missed'] as const;

// OCC RPC Result Types — Domain-level responses (transport errors are in Supabase's `error` field)
export type OccResult = {
  status: 'success' | 'conflict';
  revision?: number;
  serverRevision?: number;
  message?: string;
};

export type BatchOccResult = {
  status: 'success';
  inserted: number;
  revisions: Record<string, number>;
};

export type SphereType = 'stressor' | 'resource' | 'family' | 'institution' | 'patient';

export interface DaySchedule {
  enabled: boolean;
  start: string; // "HH:mm"
  end: string;   // "HH:mm"
  breaks: { start: string; end: string }[];
}

export interface ServiceHours {
  0: DaySchedule; // Sunday
  1: DaySchedule; // Monday
  2: DaySchedule; // Tuesday
  3: DaySchedule; // Wednesday
  4: DaySchedule; // Thursday
  5: DaySchedule; // Friday
  6: DaySchedule; // Saturday
}

export interface Tag {
  id: string;
  text: string;
}

export interface SuggestedTag extends Tag {
  relevance: number; // score from 0 to 1
}

export type DocumentPurpose = 'clinical' | 'inss_forensic';

export interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'report';
  url: string; // a placeholder url
  uploadedAt: string;
  category?: 'generated' | 'upload'; // New field for organization
  verificationCode?: string; // UUID segment for authenticity
  storagePath?: string; // If present, use Supabase Storage. If missing, assume url is Base64.
  contentDraft?: DocumentContentDraft; // Editable content for re-editing
}

export interface DocumentContentDraft {
  documentType: 'atestado' | 'declaracao' | 'encaminhamento' | 'relatorio' | 'laudo';
  // Simple documents (atestado, declaracao, encaminhamento)
  description?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  target?: string; // For encaminhamento
  template?: 'livre' | 'psiquiatria' | 'escolar';
  // Structured documents (relatorio, laudo)
  sections?: Record<string, string>;
}

export type JSONContent = Record<string, any>;

export type EvidenceSourceType = 'notes' | 'summary' | 'draft' | 'transcript';
export type EvidenceQuality = 'HIGH' | 'MEDIUM' | 'LOW';
export type FallbackReason = 'notes_too_large' | 'summary_missing' | 'draft_missing' | 'transcript_only';

export interface SessionEvidence {
    extractionText: string;
    source: EvidenceSourceType;
    quality: EvidenceQuality;
    wasChunked: boolean;
    wasFallback: boolean;
    fallbackReason?: FallbackReason;
    charCount: number;
}

export interface Session {
  id: string;
  date: string; // ISO String
  duration: number; // in minutes
  sessionType: typeof SESSION_TYPES[number];
  status: typeof SESSION_STATUSES[number]; // Novo campo
  notes: string | JSONContent;
  draft_notes?: JSONContent;          // Rascunho informal (TipTap JSON) — persiste com auto-save
  draft_revision?: number;            // OCC revision tracker
  transcript?: string;                // AI-generated transcript of session audio
  draft_moods?: MoodMetrics;          // Monitoramento de humor salvo no rascunho
  draft_updated_at?: string;          // ISO — último auto-save do rascunho
  finalized_at?: string;              // ISO — quando o rascunho virou prontuário oficial
  attachments: { name: string; url: string }[];
  tags: Tag[];
  paymentStatus: 'paid' | 'pending';
  price: number; // in currency units
  goalIds: string[]; // Link to goals in the treatment plan

  // Analytics 2.0
  location?: string; // e.g. 'Online', 'Consultório'
  modality?: string; // e.g. 'presential', 'remote'
  paymentType?: string; // e.g. 'particular', 'plano'

  // Novos campos para integração de calendário e lembretes
  syncedToCalendar?: boolean;
  reminderSentAt?: string; // ISO String da data de envio
  // Recurring sessions share an ID
  recurrenceId?: string;

  // AI-generated Clinical Intelligence
  resumo_sessao?: string;
  mecanismos_enfrentamento?: string;

  // Phase 9: Prontuário Eletrônico do Paciente (PEP)
  extraction_status?: 'pending' | 'processing' | 'completed' | 'failed' | 'failed_size_limit';
  technical_procedures?: string;
}

export type AppointmentSessionData = (Session | Omit<Session, 'id'>) & { patientId: string };

export interface InterventionFeedback {
  effectiveness: typeof FEEDBACK_EFFECTIVENESS[number];
  notes: string;
}

export interface Intervention {
  id: string;
  text: string;
  status: typeof INTERVENTION_STATUSES[number];
  feedback: InterventionFeedback | null;
}

export interface PatientTask {
  id: string;
  text: string;
  status: typeof PATIENT_TASK_STATUSES[number];
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  status: typeof GOAL_STATUSES[number];
  createdAt: string;
  interventions: Intervention[];
  patientTasks: PatientTask[];
}


export interface SocialLinks {
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  linkedin?: string;
  whatsapp?: string;
}

export interface Expense {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  is_paid: boolean;
  type?: 'income' | 'expense'; // Added for Unified Ledger
  session_id?: string; // Link for Automated Billing Idempotency
  payment_method?: string; // Added for Financial Charts
}

export interface Invoice {
  id: string;
  user_id: string;
  patient_id: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue' | 'canceled';
  billing_period: string; // e.g. "2026-03"
  type: 'monthly' | 'session' | 'package';
  metadata: {
    sessionIds?: string[];
    [key: string]: any;
  };
  created_at?: string;
  updated_at?: string;
}

export interface CustomLink {
  id: string;
  title: string;
  url: string;
  active: boolean;
}

export interface ServiceLocation {
  id: string;
  type: 'online' | 'physical';
  name: string;
  address?: string; // If physical
  active: boolean;
}

export interface ServiceType {
  id: string;
  name: string;
  description?: string;
  modality: 'online' | 'presencial' | 'hybrid';
  duration: number; // minutes
  price: number;
  showPrice: boolean;
  requirePrepayment: boolean;
  active: boolean;
}

export interface SchedulingSettings {
  active: boolean; // Master switch
  futureDays: number; // e.g. 30
  bufferMinutes: number; // e.g. 10
  minAdvanceHours: number; // e.g. 24
  confirmationDays: number; // e.g. 1
  sessionDuration?: number; // e.g. 60 or 50
  allowCancellation: boolean;
  cancellationHours: number; // e.g. 24
}

export type AppRole = 'admin' | 'psychologist' | 'staff';

export type AppPermission =
  | 'patient:create'
  | 'patient:view'
  | 'patient:edit'
  | 'patient:delete'
  | 'patient:transfer'
  | 'patient:archive'
  | 'patient:restore'
  | 'financial:view'
  | 'financial:manage'
  | 'clinical_record:view'
  | 'clinical_record:edit'
  | 'session:create'
  | 'session:edit'
  | 'session:delete'
  | 'settings:manage'
  | 'reports:view'
  | 'reports:export'
  | 'system:manage';

export interface User {
  id: string;
  name: string;
  display_name?: string; // Professional/Social Name for Meu Link
  email: string;
  role: AppRole;
  status?: 'active' | 'blocked'; // For Admin Management
  crp?: string; // For psychologists
  cpf?: string; // For staff
  addressFull?: string; // For receipts
  signatureUrl?: string; // For receipts
  linkedUserIds?: string[]; // Psychologist links to staff, staff links to psychologists
  taxRegime?: 'pf' | 'pj'; // Fiscal Regime

  // Security Onboarding
  has_recovery_phrase?: boolean;
  recovery_skip_count?: number;
  key_salt?: string;

  // Profile Fields
  specialty?: string;
  phone?: string;
  birthDate?: string;
  councilName?: string; // e.g., "CRP"
  councilNumber?: string;
  city?: string;
  state?: string;
  timezone?: string;
  photoUrl?: string; // Overrides existing if needed, or we just use this
  logoUrl?: string;
  theme?: string; // e.g. 'purple', 'blue', 'green', 'black'
  clinicName?: string;
  has_seen_docstation_guide?: boolean;
  enable_beta_themes?: boolean;
  message_templates?: Record<string, any>;
  monthly_goal?: number; // Target monthly revenue

  // Service Hours
  serviceHours?: ServiceHours;

  // Meu Link Features
  bioSlug?: string;
  bioDescription?: string;
  socialLinks?: SocialLinks;
  customLinks?: CustomLink[];
  serviceLocations?: ServiceLocation[];
  services?: ServiceType[];
  schedulingSettings?: SchedulingSettings;
  expenseCategories?: string[];
  messageTemplates?: MessageTemplates;

  // Link Marketing & Conversion Fields
  targetAudiences?: string[];
  approachTranslation?: string;
  faq?: { question: string; answer: string }[];
  certifications?: string[];
  graduationYear?: number;

  // Theme & Branding
  themeId?: string; // 'classic', 'journal', 'marketing', 'soft', 'book', 'organic', 'analysis'
  colorScheme?: 'lilas' | 'azul' | 'verde' | 'preto';
}

export interface MessageTemplates {
  bookingConfirmation?: string;
  paymentRequest?: string;
  taskReminder?: string;
  patientGreeting?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  resource?: string; // New: Target resource type e.g. 'patient'
  resourceId?: string; // New: Target ID
  timestamp: string;
  details: Record<string, unknown>;
  ipAddress: string; // Simulated IP
  sessionId?: string;
}

export interface GoalProgressInsight {
  goalTitle: string;
  progressSummary: string;
  linkedSessionsCount: number;
}

export interface ClinicalInsight {
  raciocinio_clinico?: string;
  is_red_flag_alert?: boolean;
  red_flag_reason?: string;
  summary: string;
  goalProgress: GoalProgressInsight[];
  emergingThemes: string[];
  nextStepSuggestions: string[];
  sources: { source: string; content: string }[];
}

export interface StoredClinicalInsight extends ClinicalInsight {
  id: string;
  createdAt: string;
  analyzedSessionIds: string[];
  mode?: 'summary' | 'sabatina';
  // Campos específicos da Sabatina
  blindSpots?: string[];
  technicalCritique?: string[];
  practicalManagement?: string[];
  ethicalAlerts?: string[];
}

export interface InterventionSuggestion {
  suggestions: string[];
  sources: { source: string; content: string }[];
}

export interface Anamnesis {
  mainComplaint: string; // Queixa Principal
  historyOfPresentIllness: string; // História da Moléstia Atual
  personalHistory: string; // Histórico Pessoal/Desenvolvimento
  familyHistory: string; // Histórico Familiar
  medicalPsychiatricHistory: string; // Histórico Médico/Psiquiátrico
  lifestyle: string; // Estilo de Vida e Social
  observation: string; // Observações Gerais
  diagnosticHypothesis?: string; // New field for Context Panel
  medications?: string; // New field for Context Panel
  lastUpdated: string;
}

// Genogram Specific Types
export interface GenogramNodeData {
  label: string;
  age?: string;
  deceased?: boolean;
}

export interface GenogramNode {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: GenogramNodeData;
  style?: React.CSSProperties; // Using React.CSSProperties for strict typing
}

export interface GenogramEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  style?: React.CSSProperties;
  label?: string | null | ReactNode;
  animated?: boolean;
}

export interface GenogramData {
  nodes: GenogramNode[];
  edges: GenogramEdge[];
  viewport?: { x: number; y: number; zoom: number };
}

export interface SystemicMapData {
  nodes: {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: { label: string; type: SphereType };
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
    label?: string;
  }[];
  viewport?: { x: number; y: number; zoom: number };
}

export interface PatientConcept {
  id: string;
  patient_id: string;
  concept: string; // e.g., "SYM-0001"
  domain: string;
  currentStatus: 'active' | 'resolved' | 'managed' | 'inactive';
  firstObservedAt: string;
  lastUpdatedAt: string;
}

export type WorkflowState = 
  | 'PendingExtraction'
  | 'Extracted'
  | 'Validated'
  | 'Approved'
  | 'Rejected'
  | 'Merged'
  | 'Archived';

export interface Evidence {
  origin: 'patient' | 'family' | 'psychologist' | 'psychiatrist' | 'test' | 'medicalRecord';
  strength: 'direct' | 'indirect' | 'standardized' | 'clinicalInference';
  confidence: number;
  certainty: 'high' | 'moderate' | 'low';
  source_refs: string[];
}

export enum EvidenceLevel {
  IMPRESSION = 1,
  HYPOTHESIS = 2,
  REPORT = 3,
  OBSERVATION = 4,
  TEST = 5
}

export interface ClinicalObservation {
  id: string;
  patient_id: string;
  conceptId: string;
  
  value: string | number;
  valueType: 'boolean' | 'numeric' | 'ordinal' | 'text' | 'coded';
  unit?: string;
  qualifier?: string;
  date: string;
  isCurrent: boolean;
  
  evidence: Evidence;
  evidence_level?: EvidenceLevel | null;
  
  status: WorkflowState;
  
  relatedTo?: string[];
  derivedFrom?: string[];
}

export interface PsychometricAssessment {
  id: string;
  patient_id: string;
  instrument: string;
  date: string;
  items?: Record<string, number | string>;
  rawScore: number | string;
  normalizedScore?: number | string;
  severity?: string;
  cutoffVersion?: string;
  interpretation?: string;
  norm?: string;
  source_refs: string[];
}

export interface CallMetadata {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
  latencyMs: number;
  modelVersion: string;
}

export interface ExtractionMetadata {
  extractorVersion: string;
  ontologyVersion: string;
  model: string;
  extractedAt: string;
  durationMs: number;
  telemetry: CallMetadata;
}

export type PatientMemoryFact = Record<string, any>;

export interface CandidateConcept {
  rawText: string;
  suggestedConcept: string;
  confidence: number;
  context?: string;      // A frase completa ou parágrafo onde foi encontrado
  startOffset?: number;  // Marcação para highlight no frontend
  endOffset?: number;
}

export interface ExtractionWarning {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ExtractionResult {
  sessionId: string;
  patientId: string;
  metadata: ExtractionMetadata;
  concepts: PatientConcept[];
  observations: ClinicalObservation[];
  psychometrics: PsychometricAssessment[];
  warnings: ExtractionWarning[];
  unknownConcepts: CandidateConcept[];
}

export interface DomainEvent {
    type: string;
    payload: any;
    timestamp: string;
}

export interface ValidationIssue {
    code: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'fatal';
}

export interface MiddlewareResult {
    result: ExtractionResult;
    events: DomainEvent[];
    issues: ValidationIssue[];
}

export interface ConceptRelationship {
  id: string;
  fromConceptId: string;
  toConceptId: string;
  relationshipType: 'aggravates' | 'mitigates' | 'causes' | 'associated_with';
  confidence: number;
}

export interface Patient {
  id: string;
  name: string;
  liveSummary?: string;
  status: typeof PATIENT_STATUSES[number];
  cpf: string;
  address?: string; // For receipts
  // email: string; // Removed duplicate, defined below as optional
  phone: string;
  birthDate: string;
  photoUrl?: string; // To store base64 image
  consent: boolean; // Digital consent
  medicalHistory: string; // Legacy field, kept for backward compatibility
  anamnesis?: Anamnesis; // New structured anamnesis
  genogramData?: GenogramData; // New Genogram field
  systemicMap?: SystemicMapData; // New Eco-Map field
  documents: Document[];
  sessions: Session[];
  goals: Goal[];
  insights: StoredClinicalInsight[];
  concepts?: PatientConcept[];
  observations?: ClinicalObservation[];
  assessments?: PsychometricAssessment[];
  createdAt: string;
  psychologistId?: string;
  psychologist?: Partial<User>; // For joins
  paymentType: 'particular' | 'plano';
  healthPlan?: string;
  agreedPrice?: number; // Novo campo: Valor combinado da sessão
  defaultLocation?: string; // New: Preferred location for sessions
  defaultModality?: string; // New: Preferred modality (individual, couple, etc)
  folderIds?: string[]; // New: Supports multiple groups
  folderId?: string; // Deprecated: Kept for migration
  order?: number; // New: Custom display order

  // Billing Automation
  billing_settings?: {
    model: 'monthly' | 'per_session' | 'package';
    value?: number;
    due_day?: number;
    charge_missed_sessions?: boolean; // Define cobrança automática para faltas
  };

  // Compliance (Soft Delete)
  archived_at?: string | null; // ISO String for Soft Delete
  is_active?: boolean;
  archive_reason?: string | null;

  // Auth Fields
  email?: string;
  authUserId?: string;
  portalEnabled?: boolean;
  portalTokenVersion?: number;

  // Phase 9: Prontuário Eletrônico do Paciente (PEP)
  clinic_name?: string;
  clinic_cnpj?: string;
  clinic_address?: string;
  clinical_demand_objectives?: JSONContent;
  closure_date?: string; // ISO String
  closure_reason?: string;
  forwarding_notes?: string;
}

export interface Folder {
  id: string;
  name: string;
  color: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: AppRole;
  identifier?: string; // CRP or CPF, optional for admin
}

export type SettingsTab = 'general' | 'patients' | 'organization' | 'profile' | 'link' | 'backup' | 'hours' | 'security';


export interface PublicAvailability {
  id: string;
  psychologistId: string;
  startTime: string; // ISO
  endTime: string; // ISO
  isAvailable: boolean;
}

export interface SchedulingRequest {
  id: string;
  psychologistId: string;
  patientName: string;
  patientPhone: string;
  patientEmail?: string;

  // New Fields
  patientCpf?: string;
  patientBirthDate?: string;
  modality?: 'online' | 'presencial';
  lgpdConsented?: boolean;
  lgpdConsentDate?: string;

  requestedTime: string; // ISO
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface Reminder {
  id: string;
  user_id: string;
  patient_id?: string;
  description: string;
  color: 'yellow' | 'red' | 'blue' | 'green' | 'purple';
  notify_email: boolean;
  notify_push: boolean;
  is_completed: boolean;
  due_date?: string;
  created_at: string;
}

// Clinical OS Types
export interface MoodMetrics {
  sadness?: number; // 0-10
  anxiety?: number;
  anger?: number;
  happiness?: number;
  energy?: number; // 0-10
}

export type ClinicalRecordType = 'session_summary' | 'clinical_tool' | 'private_note' | 'emdr_log';

export interface ClinicalRecord {
  id: string;
  patient_id: string;
  author_id: string;
  session_id?: string; // Logical link to legacy JSON session
  date: string; // ISO
  type: ClinicalRecordType;
  content: JSONContent; // Tiptap JSON
  metadata: {
    moods?: MoodMetrics;
    tags?: string[];
    [key: string]: any;
  };
  updated_at: string;
  therapist_feedback?: string;
  feedback_at?: string;
}

export interface StorageFile {
  id: string; // The full path or a UUID
  path: string; // 'patient-id/filename.ext'
  name: string;
  size: number; // bytes
  type: string; // mime type
  url?: string; // Signed URL for display (transient)
  uploadedAt: string;
}

export type CognitiveDistortion =
  | 'catastrophizing'
  | 'all_or_nothing'
  | 'mental_filter'
  | 'emotional_reasoning'
  | 'mind_reading'
  | 'overgeneralization'
  | 'labeling'
  | 'personalization'
  | 'should_statements'
  | 'disqualifying_positive';

export interface RPDContent extends JSONContent {
  situation: string;
  thought: string; // Automatic Thought
  rationalResponse: string;
}

export interface RPDMetadata {
  emotion: string; // e.g. 'sadness', 'anxiety'
  intensity: number; // 0-100
  distortions: CognitiveDistortion[];
  is_shared?: boolean; // Controls visibility to therapist
}

export interface RPDRecord extends ClinicalRecord {
  type: 'clinical_tool';
  // We specialize the content and metadata for RPD
  content: RPDContent;
  metadata: RPDMetadata;
  toolType: 'rpd'; // Discriminator within 'clinical_tool' type
}

export interface EMDRContent extends JSONContent {
  targetMemory?: string;
  positiveCognition?: string;
  negativeCognition?: string;
}

export interface EMDRMetadata {
  toolType: 'emdr';
  suds: number; // 0-10
  voc: number; // 1-7
  speed?: string;
  color?: string;
}

export interface EMDRRecord extends ClinicalRecord {
  type: 'clinical_tool';
  content: EMDRContent;
  metadata: EMDRMetadata;
  toolType: 'emdr';
}

// ---- Inventory (TCC) ----
export interface InventoryContent extends JSONContent {
  notes?: string;
}

export interface InventoryMetadata {
  toolType: 'inventory';
  scaleName: 'BDI' | 'BAI' | 'GAD-7' | 'PHQ-9' | string;
  score: number;
  severity?: string;
  session_id?: string;
  source?: 'manual' | 'patient_self_report';
  assessment_link_id?: string;
  critical_item_flagged?: boolean;
  critical_item_value?: number;
}

export interface InventoryRecord extends ClinicalRecord {
  type: 'clinical_tool';
  content: InventoryContent;
  metadata: InventoryMetadata;
  toolType: 'inventory';
}

// ---- ACT Matrix ----
export interface ACTMatrixContent extends JSONContent {
  avoidance: string[];
  committedAction: string[];
  hooks: string[];
  values: string[];
}

export interface ACTMatrixMetadata {
  toolType: 'act_matrix';
  theme?: string;
}

export interface ACTMatrixRecord extends ClinicalRecord {
  type: 'clinical_tool';
  content: ACTMatrixContent;
  metadata: ACTMatrixMetadata;
  toolType: 'act_matrix';
}

// ---- Portal Patient Tools ----

// 1. Coping Card
export interface CopingCardContent extends JSONContent {
  text: string;
  image?: string;
  category?: 'defusion' | 'values' | 'grounding' | 'general';
}

export interface CopingCardMetadata {
  toolType: 'coping_card';
  authorType: 'psychologist' | 'patient';
}

export interface CopingCardRecord extends ClinicalRecord {
  type: 'clinical_tool';
  content: CopingCardContent;
  metadata: CopingCardMetadata;
  toolType: 'coping_card';
}

// 2. Mindfulness Diary
export interface MindfulnessDiaryContent extends JSONContent {
  feeling: number; // 1-5
  valuesAlignment: number; // 1-5
  notes?: string;
}

export interface MindfulnessDiaryMetadata {
  toolType: 'mindfulness_diary';
}

export interface MindfulnessDiaryRecord extends ClinicalRecord {
  type: 'clinical_tool';
  content: MindfulnessDiaryContent;
  metadata: MindfulnessDiaryMetadata;
  toolType: 'mindfulness_diary';
}

// 3. Crisis Regulation
export interface CrisisRegulationContent extends JSONContent {
  toolName: string; // 'breathing', 'safe_space_audio', etc
  details?: string;
  durationSeconds?: number;
}

export interface CrisisRegulationMetadata {
  toolType: 'crisis_regulation';
}

export interface CrisisRegulationRecord extends ClinicalRecord {
  type: 'clinical_tool';
  content: CrisisRegulationContent;
  metadata: CrisisRegulationMetadata;
  toolType: 'crisis_regulation';
}

export type LibraryCategory = 'bibliotherapy' | 'cinema' | 'mindfulness' | 'task' | 'psychoeducation' | 'other';

export interface LibraryItem {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: LibraryCategory;
  url?: string;
  coverUrl?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GamificationState {
  level: number;
  currentXP: number;
  nextLevelXP: number;
  progressPercent: number;
  streakDays: number;
}

// ----------------------------------------------------------------------
// THOUGHT RECORDS (MOOD TRACKING)
// ----------------------------------------------------------------------

export interface ThoughtRecord {
  id: string;
  patient_id: string;
  emotion?: string;
  intensity?: number;
  situation?: string;
  automatic_thoughts?: string;
  rational_response?: string;
  created_at: string;
  updated_at: string;
}

// ----------------------------------------------------------------------
// PHASE 19: PSYCHOEDUCATION (GAMIFICATION)
// ----------------------------------------------------------------------

export type StepContentType =
  | 'text' | 'video' | 'reflection' | 'checklist' | 'quiz'
  // Práticas Interativas (TCC) — Phase 21
  | 'thought_record'        // RPD direcionado (Fase 2)
  | 'behavioral_experiment' // Experimento comportamental
  | 'exposure_log'          // Registro de exposição graduada (Fase 2)
  | 'activity_schedule'     // Agenda de atividades prazerosas (Fase 2)
  | 'self_monitoring'       // Auto-monitoramento (escala + nota)
  | 'free_response'         // Resposta livre (texto/áudio)
  | 'tool_redirect';        // Atalho para ferramenta nativa (Fase 22)

export interface TrailStep {
  id: string;
  module_id: string;
  title?: string;
  content_type: StepContentType;
  content_data: any; // JSON Content
  order_index: number;
}

export interface TrailModule {
  id: string;
  trail_id: string;
  title: string;
  description?: string;
  order_index: number;
  steps: TrailStep[];
}

export interface Trail {
  id: string;
  title: string;
  description?: string;
  icon_url?: string;
  author_id?: string;
  is_public: boolean;
  is_template: boolean;
  created_at: string;
  modules: TrailModule[];
  type?: 'psychoeducation' | 'practice';
}

export interface TrailAssignment {
  id: string;
  patient_id: string;
  trail_id: string;
  status: 'active' | 'completed' | 'paused' | 'archived';
  current_module_index: number;
  assigned_at: string;
  due_date?: string;                  // Prazo da semana (práticas)
  frequency?: 'once' | 'daily' | 'weekly' | 'custom';
  source_session_id?: string;         // Sessão que originou a prática
  source_goal_id?: string;            // Meta do plano vinculada
  therapist_instructions?: string;    // Instruções personalizadas do terapeuta
}

// ----------------------------------------------------------------------
// PHASE 21: PRÁTICAS INTERATIVAS (TCC HOMEWORK)
// ----------------------------------------------------------------------

/** Tipo base para respostas de práticas (armazenado em patient_progress.response_data) */
export interface PracticeResponse {
  completed_at: string;
  response_type: StepContentType;
}

// ---- MVP (Fase 1) ----

export interface BehavioralExperimentResponse extends PracticeResponse {
  response_type: 'behavioral_experiment';
  prediction: string;       // "O que você acha que vai acontecer?"
  what_happened: string;    // "O que realmente aconteceu?"
  what_learned: string;     // "O que você aprendeu?"
  anxiety_before: number;   // SUDS 0-10
  anxiety_after: number;    // SUDS 0-10
}

export interface SelfMonitoringResponse extends PracticeResponse {
  response_type: 'self_monitoring';
  scale_value: number;      // 0-10
  label?: string;           // ex: "Ansiedade", "Motivação"
  notes?: string;
}

export interface FreeResponseData extends PracticeResponse {
  response_type: 'free_response';
  text: string;
  audio_url?: string;       // Futuro: resposta por áudio
}

// ---- Fase 2 (pós-MVP) ----

export interface ThoughtRecordResponse extends PracticeResponse {
  response_type: 'thought_record';
  situation: string;
  automatic_thought: string;
  emotion: string;
  intensity: number;        // 0-100
  distortions?: CognitiveDistortion[];
  rational_response: string;
  new_intensity?: number;   // 0-100 pós-reestruturação
}

export interface ExposureLogResponse extends PracticeResponse {
  response_type: 'exposure_log';
  suds_before: number;      // 0-10
  suds_peak: number;        // 0-10
  suds_after: number;       // 0-10
  duration_minutes: number;
  notes?: string;
}

// ----------------------------------------------------------------------
// DOCSTATION: OFFICIAL DOCUMENT GENERATOR
// ----------------------------------------------------------------------

export type DocumentTemplate =
  | 'atestado'
  | 'declaracao'
  | 'laudo'
  | 'relatorio'
  | 'encaminhamento';

export interface TemplateSection {
  id: string;
  title: string;
  // Quais tipos de fatos (Symptom, Behavior) ou origens (Psychometric) alimentam esta seção:
  allowedFacts: { 
    origins?: string[]; 
    types?: string[];
  }; 
  // Instrução específica de escrita para o LLM apenas para este bloco:
  systemPrompt: string; 
}

export interface TemplateDefinition {
  id: DocumentTemplate;
  name: string;
  description: string;
  icon: React.ReactNode | string;
  structure: 'simple' | 'structured';
  sections?: TemplateSection[]; // For structured templates (Section Builder)
  defaultContent?: string;
  structuredTemplate?: Record<string, string>;
  aiPrompt?: string; // System instruction block for AI parsing
}

export interface DocumentVariables {
  PACIENTE_NOME: string;
  PACIENTE_CPF: string;
  PACIENTE_NASCIMENTO: string;
  PACIENTE_IDADE: string;
  DATA_HOJE: string;
  PSI_NOME: string;
  PSI_CRP: string;
  PSI_ESPECIALIDADE: string;
  CLINICA_NOME: string;
}

// ----------------------------------------------------------------------
// SUPERVISION NOTEBOOKS
// ----------------------------------------------------------------------

export interface SupervisionNotebookPage {
  id: string;
  notebook_id: string;
  title: string;
  content: string; // Tiptap HTML or Text
  created_at: string;
  updated_at: string;
}

export interface SupervisionNotebook {
  id: string;
  patient_id: string;
  therapist_id: string;
  title: string;
  pages?: SupervisionNotebookPage[]; // Para aninhamento no frontend
  created_at: string;
  updated_at: string;
}

export interface TherapeuticAllianceLog {
  id: string;
  patient_id: string;
  therapist_id: string;
  type: 'rupture' | 'repair' | 'strong';
  notes?: string;
  created_at: string;
}

export interface CaseFormulation {
  id: string;
  patient_id: string;
  therapist_id: string;
  core_beliefs: string;
  schemas: string;
  triggers: string;
}

export interface InterventionRoadmapPhase {
  id: string;
  patient_id: string;
  therapist_id: string;
  phase_name: string;
  status: 'pending' | 'in_progress' | 'completed';
  order_index: number;
}

// ----------------------------------------------------------------------
// PATIENT MATERIALS (LIBRARY HANDSHAKE)
// ----------------------------------------------------------------------

export interface PatientMaterial {
  id: string;
  patient_id: string;
  therapist_id: string;
  title: string;
  description?: string;
  category: string;
  url?: string;
  cover_url?: string;
  created_at: string;
  read_at?: string;
}

// ----------------------------------------------------------------------
// COGNITIVE TASKS (Stroop, Corsi, RIASEC)
// ----------------------------------------------------------------------

export type CognitiveTaskType = 'stroop' | 'corsi' | 'riasec';

/** Registro bruto de cada trial/item — captura tudo para análise futura */
export interface CognitiveTaskEvent {
  timestamp: number;                  // performance.now() — alta resolução (~0.1ms)
  trialIndex: number;                 // índice do trial/item na sequência
  stimulusOnset: number;              // momento exato de exibição do estímulo
  responseTime: number;               // latência em ms (stimulus → response)
  response: string | number | null;   // resposta dada pelo paciente
  expected: string | number;          // resposta correta esperada
  isCorrect: boolean;
  isOmission: boolean;                // timeout sem resposta
  condition?: string;                 // Stroop: 'congruent' | 'incongruent' | 'neutral'
  level?: number;                     // Corsi: span level atual
  metadata?: Record<string, any>;     // Dados extras customizados por tarefa (ex: latências intra-clique)
}

/** Metadados do hardware capturados no início de cada sessão de teste */
export interface DeviceContext {
  screenWidth: number;
  screenHeight: number;
  devicePixelRatio: number;
  inputMethod: 'keyboard' | 'mouse' | 'touch' | 'mixed';
  browser: string;
  os: string;
  fps: number;                        // FPS médio amostrado no início
}

/** Resultado completo de uma sessão de teste cognitivo */
export interface CognitiveTaskResult {
  taskType: CognitiveTaskType;
  events: CognitiveTaskEvent[];       // dados brutos completos
  deviceContext: DeviceContext;
  startedAt: string;                  // ISO
  completedAt: string;                // ISO
  seed?: number;                      // seed do PRNG para reprodutibilidade
  summary: Record<string, any>;       // métricas calculadas pelo scorer
}

/** Content do ClinicalRecord para tarefas cognitivas */
export interface CognitiveTaskContent extends JSONContent {
  rawEvents: CognitiveTaskEvent[];
  deviceContext: DeviceContext;
  seed?: number;
}

/** Metadata do ClinicalRecord para tarefas cognitivas */
export interface CognitiveTaskMetadata {
  toolType: 'cognitive_task';
  taskType: CognitiveTaskType;
  summary: Record<string, number | string>;
  session_id?: string;
}

/** Record completo para persistência na clinical_records */
export interface CognitiveTaskRecord extends ClinicalRecord {
  type: 'clinical_tool';
  content: CognitiveTaskContent;
  metadata: CognitiveTaskMetadata;
  toolType: 'cognitive_task';
}
