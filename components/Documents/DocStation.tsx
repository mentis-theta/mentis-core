import React, { useState, useEffect } from 'react';
import { usePatientContext } from '@/contexts/PatientContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCrypto } from '@/contexts/CryptoContext';
import { useToast } from '@/contexts/ToastContext';
import type { DocumentTemplate, Patient } from '@/types';
import TemplateSidebar from './TemplateSidebar';
import DocumentEditor from './DocumentEditor';
import Button from '../Button';
import { TEMPLATES, generateVariables, replaceVariables, getTemplateById, replaceStructuredVariables } from './documentTemplates';
import { useHITLPipeline } from '@/hooks/useHITLPipeline';
import HITLOrchestratorModal from './HITL/HITLOrchestratorModal';
import ClinicalLinterModal from './HITL/ClinicalLinterModal';
import { usePdfExporter } from '@/hooks/usePdfExporter';
import { useAutoSave } from '@/hooks/useAutoSave';
import Modal from '../Modal';
import DOMPurify from 'dompurify';
import { CheckCircle2, FileText, Loader2, Printer, Sparkles, User, ShieldAlert, ArrowRight, Activity } from 'lucide-react';
import type { DocumentPurpose } from '@/types';
import { trackEvent } from '@/services/telemetryService';
import { supabase } from '@/services/supabaseClient';
import { getPlainTextFromSession } from '../Session/RichTextRenderer';
import { useForensicAudit } from '@/hooks/useForensicAudit';
import DocStationTour from './DocStationTour';
import { useDecoupledData } from '@/hooks/useDecoupledData';

interface DocStationProps {
    isOpen: boolean;
    onClose: () => void;
    preSelectedPatientId?: string;
}

const DocStation: React.FC<DocStationProps> = ({
    isOpen,
    onClose,
    preSelectedPatientId
}) => {
    const { patients, addDocument, updatePatient } = usePatientContext();
    const { currentUser } = useAuth();
 const { addToast } = useToast();

    // State
    const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
    const initialPatient = preSelectedPatientId ? patients.find(p => p.id === preSelectedPatientId) || null : null;
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(initialPatient);
    const [editorContent, setEditorContent] = useState('');
    const [structuredContent, setStructuredContent] = useState<Record<string, string>>({});
    const [aiInstructions, setAiInstructions] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [consentGiven, setConsentGiven] = useState(false);
    const [documentPurpose, setDocumentPurpose] = useState<DocumentPurpose>('clinical');
    const [diffValidationChecked, setDiffValidationChecked] = useState(false);
    const [hasGeneratedAI, setHasGeneratedAI] = useState(false);

    // Forensic State via Hook
    const { isAuditing, detectedClaims, auditText } = useForensicAudit();

    // Fetch Decoupled Data
    const { data: decoupledData } = useDecoupledData(selectedPatient?.id, 'full_audit');

    // Specialist Hooks (Separation of Concerns)
    const patientContext = {
        patient: selectedPatient as Patient,
        sessions: decoupledData?.sessions || [],
        anamnesis: selectedPatient?.anamnesis,
        diagnosis: selectedPatient?.anamnesis?.diagnosticHypothesis,
        medications: selectedPatient?.anamnesis?.medications,
        currentDraftText: editorContent,
        currentStructuredDraft: structuredContent,
        purpose: documentPurpose
    };

    const hitlPipeline = useHITLPipeline({
        patientContext,
        selectedTemplateId: selectedTemplate,
        documentPurpose,
        onDocumentGenerated: (finalEditor, finalStructured) => {
            setEditorContent(finalEditor);
            setStructuredContent(finalStructured);
            setHasGeneratedAI(true);
        }
    });

    const { isGenerating, handleGeneratePDF } = usePdfExporter({
        selectedTemplate,
        selectedPatient,
        currentUser,
        editorContent,
        structuredContent,
        addDocument,
        startTime,
        endTime,
        consentGiven
    });

    const { saveStatus } = useAutoSave({
        selectedTemplate,
        selectedPatient,
        editorContent,
        structuredContent,
        updatePatient
    });

    const handleAuditClaims = async () => {
        if (!selectedPatient?.id) return;
        
        // Collect text depending on template structure
        let plainText = '';
        if (currentTemplate?.structure === 'structured') {
            plainText = Object.values(structuredContent).map(c => getPlainTextFromSession(c)).join('\n\n');
        } else {
            plainText = getPlainTextFromSession(editorContent);
        }

        await auditText(selectedPatient.id, plainText);
    };

    // Update editor content when template or patient changes
    useEffect(() => {
        if (!selectedTemplate) {
            setEditorContent('');
            setStructuredContent({});
            return;
        }

        const template = getTemplateById(selectedTemplate);
        if (!template) return;

        // Try to recover latest draft for this specific patient and template
        if (selectedPatient && decoupledData?.documents && decoupledData.documents.length > 0) {
            const drafts = decoupledData.documents.filter((doc: any) =>
                doc.contentDraft && doc.contentDraft.documentType === selectedTemplate
            );

            if (drafts.length > 0) {
                // Sort to get the latest draft 
                drafts.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
                const latestDraft = drafts[0].contentDraft!;

                if (template.structure === 'structured') {
                    if (latestDraft.sections && Object.keys(latestDraft.sections).length > 0) {
                        const mappedSections: Record<string, string> = {};
                        Object.entries(latestDraft.sections).forEach(([key, value], index) => {
                            if (key.startsWith('SECTION') && template.sections && template.sections[index]) {
                                const section = template.sections[index];
                                mappedSections[typeof section === 'string' ? section : section.title] = value;
                            } else {
                                mappedSections[key] = value;
                            }
                        });

                        setStructuredContent(mappedSections);
 addToast('Rascunho recuperado com sucesso.', 'info');
                        return;
                    }
                } else {
                    if (latestDraft.description && latestDraft.description.trim() !== '') {
                        setEditorContent(latestDraft.description);
 addToast('Rascunho recuperado com sucesso.', 'info');
                        return;
                    }
                }
            }
        }

        // If no draft is found or valid, fall back to defaults
        const variables = generateVariables(selectedPatient, currentUser);

        if (template.structure === 'structured' && template.structuredTemplate) {
            const content = replaceStructuredVariables(template.structuredTemplate, variables);
            setStructuredContent(content);
        } else if (template.defaultContent) {
            const content = replaceVariables(template.defaultContent, variables);
            setEditorContent(content);
            setStructuredContent({});
        }
 }, [selectedTemplate, selectedPatient, currentUser, addToast]);



    const currentTemplate = selectedTemplate ? getTemplateById(selectedTemplate) : null;

    const handleLinterClick = () => {
        let rawText = '';
        let mockAst: any = { type: 'doc', content: [] };

        if (currentTemplate?.structure === 'structured') {
            rawText = Object.entries(structuredContent).map(([k, v]) => `${k}\n${v}`).join('\n\n');
            mockAst.content = Object.entries(structuredContent).map(([k, v]) => ({
                type: 'paragraph', text: `${k}\n${v}`
            }));
        } else {
            rawText = editorContent.replace(/<[^>]+>/g, '');
            mockAst.content = [{ type: 'paragraph', text: rawText }];
        }

        hitlPipeline.handleRunLinter(rawText, mockAst, currentTemplate?.id);
    };

    const handleEditorChange = (newContent: string) => {
        setEditorContent(newContent);
        if (hasGeneratedAI) {
            trackEvent('document_edited_after_ai', { purpose: documentPurpose });
            setHasGeneratedAI(false); // Trigger only once per generation
        }
    };

    const handleStructuredChange = (sectionTitle: string, newContent: string) => {
        setStructuredContent(prev => ({ ...prev, [sectionTitle]: newContent }));
        if (hasGeneratedAI) {
            trackEvent('document_edited_after_ai', { purpose: documentPurpose });
            setHasGeneratedAI(false); // Trigger only once per generation
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Central de Documentos"
            size="full"
        >
            <DocStationTour />
            
            <div className="h-[82vh] flex overflow-hidden bg-[#F8FAFC] rounded-2xl ring-1 ring-slate-200 shadow-xl">
                {/* Template Sidebar */}
                <TemplateSidebar
                    selectedTemplate={selectedTemplate}
                    onSelectTemplate={setSelectedTemplate}
                />

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col overflow-hidden relative">
                    {/* Top Bar - Premium Minimalist */}
                    <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 p-4 shrink-0 z-10">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                {/* Template Info Pill */}
                                {currentTemplate && (
                                    <div className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-100/80 text-slate-700 rounded-lg border border-slate-200/50">
                                        <span className="text-xl">{currentTemplate.icon}</span>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold leading-none">{currentTemplate.name}</span>
                                            {currentTemplate.sections && (
                                                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mt-1">
                                                    {currentTemplate.sections.length} seções
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="h-6 w-px bg-slate-200"></div>

                                {/* Patient Info Pill */}
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Paciente</span>
                                    {preSelectedPatientId ? (
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm text-slate-700 text-sm font-medium">
                                            <User className="w-4 h-4 text-slate-400" />
                                            {selectedPatient?.name || 'Carregando...'}
                                        </div>
                                    ) : (
                                        <select
                                            value={selectedPatient?.id || ''}
                                            onChange={(e) => {
                                                const patient = patients.find(p => p.id === e.target.value);
                                                setSelectedPatient(patient || null);
                                            }}
                                            className="rounded-full bg-white border border-slate-200 shadow-sm text-slate-700 py-1.5 px-3 pr-8 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-sm font-medium transition-all"
                                            disabled={!selectedTemplate}
                                        >
                                            <option value="">Selecione...</option>
                                            {patients.map(patient => (
                                                <option key={patient.id} value={patient.id}>
                                                    {patient.name}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 items-center">
                                {/* Auto-Save Indicator */}
                                {selectedTemplate && selectedPatient && (
                                    <div className="flex items-center text-xs font-medium mr-1">
                                        {saveStatus === 'saving' && <span className="text-slate-500 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...</span>}
                                        {saveStatus === 'saved' && <span className="text-emerald-600 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Salvo</span>}
                                    </div>
                                )}

                                <Button
                                    onClick={handleLinterClick}
                                    disabled={!selectedTemplate || !selectedPatient || hitlPipeline.isProcessing}
                                    variant="secondary"
                                    className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
                                >
                                    <span className="flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-emerald-500" />
                                        Linter Clínico
                                    </span>
                                </Button>

                                <Button
                                    data-tour="doc-ai-generate"
                                    onClick={hitlPipeline.openPipeline}
                                    disabled={!selectedTemplate || !selectedPatient || hitlPipeline.isProcessing || isGenerating}
                                    variant="secondary"
                                    className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm relative overflow-hidden group"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    {hitlPipeline.isProcessing ? (
                                        <span className="relative z-10 flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                                            Processando...
                                        </span>
                                    ) : (
                                        <span className="relative z-10 flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-indigo-500" />
                                            Gerar Base via IA
                                        </span>
                                    )}
                                </Button>
                                <Button 
                                    data-tour="doc-forensic"
                                    variant="forensic" 
                                    onClick={handleAuditClaims}
                                    isLoading={isAuditing}
                                    disabled={!selectedTemplate || !selectedPatient || isGenerating || hitlPipeline.isProcessing}
                                    className="shadow-sm"
                                >
                                    <ShieldAlert className="w-4 h-4 mr-2" />
                                    Auditar Raciocínio Clínico
                                </Button>
                                <Button
                                    onClick={handleGeneratePDF}
                                    disabled={!selectedTemplate || !selectedPatient || isGenerating}
                                    className="bg-slate-900 text-white hover:bg-slate-800 shadow-sm border-transparent"
                                >
                                    {isGenerating ? (
                                        <span className="flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Gerando...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <Printer className="w-4 h-4" />
                                            Gerar PDF
                                        </span>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Editor Area & Micro-RAG Sidebar */}
                    <div className="flex-1 flex overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-4 md:p-8">
                            <div className="max-w-[800px] mx-auto">
                                {selectedTemplate ? (
                                    <>
                                        {/* AI Context and Profile Selector */}
                                        <div className="mb-6 bg-indigo-50/50 p-5 rounded-xl border border-indigo-100/80 transition-all hover:border-indigo-200">
                                            <div className="flex flex-col md:flex-row gap-6 mb-4">
                                                <div className="flex-1" data-tour="doc-profile">
                                                    <label className="flex items-center gap-2 text-sm font-semibold text-indigo-900 mb-2">
                                                        <ShieldAlert className="w-4 h-4 text-indigo-500" />
                                                        Perfil de Saída (Output Profile)
                                                    </label>
                                                    <div className="flex bg-white rounded-lg p-1 border border-indigo-200/60 shadow-sm">
                                                        <button
                                                            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md transition-colors ${documentPurpose === 'clinical' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
                                                            onClick={() => setDocumentPurpose('clinical')}
                                                        >
                                                            Clínico Interno
                                                        </button>
                                                        <button
                                                            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md transition-colors ${documentPurpose === 'inss_forensic' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
                                                            onClick={() => setDocumentPurpose('inss_forensic')}
                                                        >
                                                            Perícia / INSS
                                                        </button>
                                                    </div>
                                                    <p className="text-[11px] text-indigo-700/70 mt-2">
                                                        {documentPurpose === 'inss_forensic' ? 
                                                            'Modo Forense: Omite anamnese profunda e métricas de humor. Foca em prejuízo funcional (CIF).' : 
                                                            'Modo Clínico: Inclui sintomas gerais, evolução terapêutica e testes psicométricos.'}
                                                    </p>
                                                </div>
                                                <div className="flex-[2]">
                                                    <label className="flex items-center gap-2 text-sm font-semibold text-indigo-900 mb-2">
                                                        <Sparkles className="w-4 h-4 text-indigo-500" />
                                                        Contexto / Propósito do Documento (Opcional)
                                                    </label>
                                                    <textarea 
                                                        value={aiInstructions}
                                                        onChange={(e) => setAiInstructions(e.target.value)}
                                                        placeholder="Ex: Redija com foco no progresso da regulação emocional..."
                                                        className="w-full px-4 py-2 border border-indigo-200/60 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 text-slate-700 placeholder:text-slate-400"
                                                        rows={3}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {currentTemplate?.structure === 'structured' ? (
                                            <div data-tour="doc-micro-rag" className="space-y-8 pb-12">
                                            {Object.entries(structuredContent).map(([sectionTitle, content]) => (
                                                <div key={sectionTitle} id={`section-${sectionTitle.replace(/\s+/g, '-')}`} className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200/50 flex flex-col group transition-all hover:shadow-md">
                                                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
                                                        <h4 className="font-semibold text-slate-800 text-sm uppercase tracking-wider">{sectionTitle}</h4>
                                                    </div>
                                                    <div className="flex-1 relative">
                                                        {hitlPipeline.isProcessing && (
                                                            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex items-center justify-center">
                                                                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                                                            </div>
                                                        )}
                                                        <DocumentEditor
                                                            content={content}
                                                            onChange={(newContent) => handleStructuredChange(sectionTitle, newContent)}
                                                            placeholder={`Escreva em ${sectionTitle}...`}
                                                            minHeightClass="min-h-[120px]"
                                                            isAuditing={isAuditing}
                                                            detectedClaims={detectedClaims}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-white rounded-xl shadow-md ring-1 ring-slate-200/50 min-h-[70vh] mb-12 flex flex-col transition-all">
                                            <DocumentEditor
                                                content={editorContent}
                                                onChange={handleEditorChange}
                                                placeholder={
                                                    selectedPatient
                                                        ? 'Comece a redigir seu documento...'
                                                        : 'Selecione um paciente na barra superior...'
                                                }
                                                isAuditing={isAuditing}
                                                detectedClaims={detectedClaims}
                                            />

                                            {selectedTemplate === 'declaracao' && (
                                                <div className="flex gap-4 p-6 border-t border-slate-100 bg-slate-50/50 rounded-b-xl">
                                                    <div className="flex-1">
                                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Horário de Início</label>
                                                        <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Horário de Término</label>
                                                        <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                                                    </div>
                                                </div>
                                            )}

                                            {selectedTemplate === 'encaminhamento' && (
                                                <div className="flex items-start gap-4 p-6 border-t border-amber-100 bg-amber-50/50 rounded-b-xl">
                                                    <input 
                                                        type="checkbox" 
                                                        id="consent-docstation" 
                                                        checked={consentGiven} 
                                                        onChange={(e) => setConsentGiven(e.target.checked)}
                                                        className="mt-1 w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                                                    />
                                                    <label htmlFor="consent-docstation" className="text-sm text-amber-900 cursor-pointer">
                                                        <span className="font-semibold block mb-1">Consentimento do Paciente (Obrigatório)</span>
                                                        Declaro que o paciente ou seu responsável legal consentiu com o compartilhamento destas informações clínicas com terceiros, protegendo o sigilo profissional conforme normativas do CFP.
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                        )}
                                    </>
                                ) : (
                                <div className="h-[60vh] flex flex-col items-center justify-center">
                                    <div className="text-center max-w-md w-full">
                                        <div className="w-16 h-16 bg-white rounded-full shadow-sm ring-1 ring-slate-200 flex items-center justify-center mx-auto mb-6">
                                            <FileText className="w-8 h-8 text-indigo-500" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-slate-800 mb-2 tracking-tight">
                                            Selecione um Modelo
                                        </h3>
                                        <p className="text-slate-500 mb-8 leading-relaxed">
                                            Escolha um dos templates do menu lateral para iniciar um novo documento profissional.
                                        </p>
                                        <div className="bg-white rounded-2xl p-6 text-left shadow-sm ring-1 ring-slate-200/50 backdrop-blur-sm">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                                                Disponíveis
                                            </p>
                                            <ul className="space-y-3">
                                                {TEMPLATES.map(t => (
                                                    <li key={t.id} className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                                                        <span className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-lg">{t.icon}</span>
                                                        {t.name}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Micro-RAG Sidebar (Estação 3) */}
                    {selectedTemplate && currentTemplate?.structure === 'structured' && currentTemplate.sections && (
                        <div className="w-80 border-l border-slate-200/60 bg-[#F8FAFC] flex flex-col shrink-0">
                            <div className="p-4 border-b border-slate-200/60 bg-white/50 backdrop-blur-sm">
                                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-indigo-500" />
                                    Micro-RAG (Seções)
                                </h3>
                                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                                    Refine blocos isolados sem alterar o resto do documento.
                                </p>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {currentTemplate.sections.map((sec, idx) => {
                                    const title = typeof sec === 'string' ? sec : sec.title;
                                    const isRegenerating = hitlPipeline.isProcessing; 
                                    return (
                                        <div key={idx} className="bg-white rounded-lg p-3 ring-1 ring-slate-200 shadow-sm flex flex-col gap-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{title}</span>
                                            </div>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                disabled={isRegenerating}
                                                onClick={async () => {
                                                    const newContent = await hitlPipeline.handleRegenerateSection(title, aiInstructions);
                                                    if (newContent) {
                                                        handleStructuredChange(title, newContent);
                                                    }
                                                }}
                                                className="w-full text-[11px] h-7 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                                            >
                                                {isRegenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Activity className="w-3 h-3 mr-1" />}
                                                Refinar Seção
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Fechamento da div principal h-[82vh] */}
            </div>

            {/* HITL Pipeline Modals */}
            <HITLOrchestratorModal 
                pipeline={hitlPipeline} 
                patientContext={patientContext} 
                additionalInstructions={aiInstructions}
            />
            
            <ClinicalLinterModal pipeline={hitlPipeline} />
        </Modal>
    );
};

export default DocStation;
