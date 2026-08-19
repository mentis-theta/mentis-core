import React from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import { Loader2, ArrowRight, ShieldCheck } from 'lucide-react';
import type { useHITLPipeline } from '@/hooks/useHITLPipeline';
import Station1Scope from './Station1Scope';
import Station2Triage from './Station2Triage';
import type { PatientDataContext } from '@/services/aiDocumentService';
import { RiskEscalationBanner } from '../../Patient/RiskEscalationBanner';
import { useDecoupledData } from '@/hooks/useDecoupledData';

interface HITLOrchestratorModalProps {
    pipeline: ReturnType<typeof useHITLPipeline>;
    patientContext: PatientDataContext;
    additionalInstructions: string;
}

const HITLOrchestratorModal: React.FC<HITLOrchestratorModalProps> = ({ 
    pipeline, 
    patientContext,
    additionalInstructions 
}) => {
    const navigate = useNavigate();
    const { 
        currentStation, 
        closePipeline, 
        isProcessing,
        selectedSessionIds,
        setSelectedSessionIds,
        extractedFacts,
        approvedFactIds,
        setApprovedFactIds,
        clinicalIssues,
        handleExtractFacts,
        handleGenerateDocument
    } = pipeline;

    const { data: decoupledData, isLoading: isLoadingDecoupled } = useDecoupledData(patientContext.patient?.id, 'full_audit');
    const sessions = decoupledData?.sessions || [];

    // Pre-select all sessions when they load
    React.useEffect(() => {
        if (sessions.length > 0 && selectedSessionIds.length === 0 && currentStation === 'SCOPE') {
            setSelectedSessionIds(sessions.map((s: any) => s.id));
        }
    }, [sessions, currentStation]);

    if (currentStation === 'CLOSED' || currentStation === 'LINTER') return null;

    const handleNavigateToSession = (sessionId: string) => {
        const patientId = patientContext.patient?.id;
        closePipeline();
        if (patientId) {
            navigate(`/patients`, { state: { selectedPatientId: patientId, selectedSessionId: sessionId } });
        }
    };

    const toggleSession = (id: string) => {
        setSelectedSessionIds(prev => 
            prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
        );
    };

    const toggleFact = (id: string) => {
        setApprovedFactIds(prev => 
            prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]
        );
    };

    return (
        <Modal
            isOpen={true}
            onClose={closePipeline}
            title={currentStation === 'SCOPE' ? 'Passo 1: Seleção de Escopo' : 'Passo 2: Mesa de Triagem'}
            size="2xl"
        >
            <div className="p-6 h-[75vh] flex flex-col bg-slate-50/50 relative">
                
                {/* Loader Overlay */}
                {isProcessing && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-lg">
                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
                        <h3 className="text-lg font-semibold text-slate-800">
                            {currentStation === 'SCOPE' ? 'Extraindo Fatos Clínicos...' : 'Redigindo Documento Modular...'}
                        </h3>
                        <p className="text-sm text-slate-500 mt-2 max-w-md text-center">
                            A IA está lendo o contexto protegido e processando os dados clinicamente. Isso pode levar alguns segundos.
                        </p>
                    </div>
                )}

                <div className="flex-1 overflow-hidden">
                    {isLoadingDecoupled ? (
                        <div className="h-full flex flex-col items-center justify-center space-y-4">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                            <p className="text-slate-500 font-medium">Carregando contexto clínico do paciente...</p>
                        </div>
                    ) : (
                        <>
                            {currentStation === 'SCOPE' && (
                                <Station1Scope 
                                    sessions={sessions}
                                    selectedSessionIds={selectedSessionIds}
                                    onToggleSession={toggleSession}
                                />
                            )}

                            {currentStation === 'TRIAGE' && (
                                <div className="h-full flex flex-col">
                                    {clinicalIssues && clinicalIssues.length > 0 && (
                                        <div className="px-4 pt-4 shrink-0">
                                            <RiskEscalationBanner issues={clinicalIssues} />
                                        </div>
                                    )}
                                    <div className="flex-1 overflow-hidden p-6">
                                        <Station2Triage 
                                            facts={extractedFacts}
                                            approvedFactIds={approvedFactIds}
                                            sessions={sessions}
                                            onToggleFact={toggleFact}
                                            onNavigateToSession={handleNavigateToSession}
                                        />
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
                    <div className="text-xs font-medium text-slate-500 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        Fluxo Protegido (Auditoria HITL)
                    </div>
                    
                    <div className="flex gap-3">
                        <Button variant="ghost" onClick={closePipeline}>
                            Cancelar
                        </Button>
                        
                        {currentStation === 'SCOPE' ? (
                            <Button 
                                onClick={() => handleExtractFacts(sessions)}
                                disabled={selectedSessionIds.length === 0 || isLoadingDecoupled}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
                            >
                                <span className="flex items-center gap-2">
                                    Extrair Fatos <ArrowRight className="w-4 h-4" />
                                </span>
                            </Button>
                        ) : (
                            <Button 
                                onClick={() => handleGenerateDocument(additionalInstructions)}
                                disabled={approvedFactIds.length === 0}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                <span className="flex items-center gap-2">
                                    Gerar Documento <ArrowRight className="w-4 h-4" />
                                </span>
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default HITLOrchestratorModal;
