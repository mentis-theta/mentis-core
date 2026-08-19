import React, { useState } from 'react';
import Modal from '../../Modal.tsx';
import Button from '../../Button.tsx';
import { Patient, Session } from '@/types.ts';
import { formatDate } from '@/utils/formatters.ts';
import { generatePatientPDF } from '@/services/pdfService.ts';
import { getPlainTextFromSession } from '../../Session/RichTextRenderer';
import { generateSessionPrintSummary } from '@/services/geminiService.ts';
import { FileText, Sparkles, Printer, Loader2 } from 'lucide-react';
import { logEvent } from '@/services/auditLogger';
import { usePatientContext } from '@/contexts/PatientContext.tsx';
import { useDecoupledData } from '@/hooks/useDecoupledData';

interface PrintProntuarioModalProps {
    patient: Patient;
    onClose: () => void;
}

// Temporary interface for the session being edited for print
interface SessionPrintData extends Session {
    printSummary: string;
}

export const PrintProntuarioModal: React.FC<PrintProntuarioModalProps> = ({ patient, onClose }) => {
    const { currentUser } = usePatientContext();
    const { data: decoupledData, isLoading: isLoadingDecoupled } = useDecoupledData(patient.id, 'full_audit');

    // Initialize state with sessions mapped to include printSummary
    const [sessionsData, setSessionsData] = useState<SessionPrintData[]>(() => {
        return [];
    });

    // Update state when decoupled data is loaded
    React.useEffect(() => {
        if (!isLoadingDecoupled && decoupledData?.sessions) {
            setSessionsData([...decoupledData.sessions]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map(s => ({
                    ...s,
                    printSummary: getPlainTextFromSession(s.notes)
                })));
        }
    }, [isLoadingDecoupled, decoupledData]);

    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const handleSummaryChange = (sessionId: string, newSummary: string) => {
        setSessionsData(prev => prev.map(s => s.id === sessionId ? { ...s, printSummary: newSummary } : s));
    };

    const handleGenerateAISummary = async (session: SessionPrintData) => {
        setLoadingMap(prev => ({ ...prev, [session.id]: true }));
        try {
            const rawNotes = getPlainTextFromSession(session.notes);
            const aiSummary = await generateSessionPrintSummary(rawNotes);
            if (aiSummary) {
                handleSummaryChange(session.id, aiSummary);
                logEvent(currentUser, 'ai_print_summary_generated', { patientId: patient.id, sessionId: session.id });
            }
        } catch (error) {
            console.error("Failed to generate AI summary", error);
        } finally {
            setLoadingMap(prev => ({ ...prev, [session.id]: false }));
        }
    };

    const handleGenerateAllAI = async () => {
        for (const s of sessionsData) {
            if (!s.printSummary || s.printSummary.length > 0) {
               await handleGenerateAISummary(s);
            }
        }
    }

    const handlePrintConfirm = () => {
        setIsGeneratingPdf(true);
        // We inject the printSummary into the sessions array
        const patientSessions = (decoupledData?.sessions || []).map(origSession => {
            const updatedSession = sessionsData.find(s => s.id === origSession.id);
            return {
                ...origSession,
                // Pass the printSummary as a custom property
                printSummary: updatedSession ? updatedSession.printSummary : getPlainTextFromSession(origSession.notes)
            } as any;
        });

        try {
            generatePatientPDF(patient, patientSessions, decoupledData?.goals || []);
            logEvent(currentUser, 'export_patient_pdf', { patientId: patient.id });
            onClose();
        } catch (error) {
            console.error("Error generating PDF", error);
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Imprimir Prontuário Clínico">
            <div className="flex flex-col h-[70vh] md:h-[600px] bg-canvas">
                
                {isLoadingDecoupled ? (
                    <div className="flex flex-col items-center justify-center flex-1">
                        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
                        <span className="mt-4 text-sm text-foreground-muted">Descriptografando histórico clínico completo...</span>
                    </div>
                ) : (
                    <>
                        <div className="p-4 border-b border-border/40 bg-surface">
                            <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-sm font-bold text-on-surface">Configurar Resumos (Sessões)</h3>
                            <p className="text-xs text-foreground-muted mt-1">
                                Ajuste os resumos das sessões para garantir conformidade com o CFP e a LGPD antes de imprimir o prontuário.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {sessionsData.length === 0 ? (
                        <div className="text-center text-sm text-foreground-muted p-8">
                            Nenhuma sessão registrada para este paciente.
                        </div>
                    ) : (
                        sessionsData.map((session, index) => (
                            <div key={session.id} className="bg-surface border border-border/40 rounded-xl p-4 shadow-sm relative group transition-all">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-bold">
                                            Lançamento #{sessionsData.length - index}
                                        </div>
                                        <span className="text-sm font-semibold text-on-surface">
                                            {formatDate(session.date)}
                                        </span>
                                        <span className="text-xs text-foreground-muted">
                                            • {session.modality === 'online' || session.modality === 'remote' ? 'Online' : 'Presencial'}
                                        </span>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 text-xs bg-slate-100 hover:bg-primary/10 hover:text-primary transition-colors text-slate-700 font-medium"
                                        onClick={() => handleGenerateAISummary(session)}
                                        disabled={loadingMap[session.id]}
                                    >
                                        {loadingMap[session.id] ? (
                                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                        ) : (
                                            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                                        )}
                                        Resumir (CFP/LGPD)
                                    </Button>
                                </div>
                                <div className="relative">
                                    <textarea
                                        value={session.printSummary}
                                        onChange={(e) => handleSummaryChange(session.id, e.target.value)}
                                        placeholder="Digite o resumo adequado para envio ao prontuário oficial..."
                                        className="w-full text-sm bg-surface-container-lowest border border-border/60 rounded-lg p-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y min-h-[90px]"
                                    />
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 border-t border-border/40 bg-surface flex justify-end gap-3 sticky bottom-0">
                    <Button variant="ghost" onClick={onClose} disabled={isGeneratingPdf}>
                        Cancelar
                    </Button>
                    <Button 
                        onClick={handlePrintConfirm} 
                        disabled={isGeneratingPdf || sessionsData.length === 0}
                        className="bg-slate-900 text-white hover:bg-slate-800"
                    >
                        {isGeneratingPdf ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Printer className="w-4 h-4 mr-2" />
                        )}
                        Confirmar e Imprimir
                    </Button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};
