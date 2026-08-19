import React, { useState } from 'react';
import Modal from '../Modal';
import Button from '../Button';
import { Textarea } from '../Form';
import { Brain, FileText, Shield, ClipboardList, CheckCircle } from 'lucide-react';
import type { AudioAnalysisResult } from '@/services/audioService';
import { sanitizeHtml } from '@/utils/richText';

interface TranscriptReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    analysisResult: AudioAnalysisResult;
    // Updated: Pass separate fields for Summary and Coping
    onSave: (evolution: string, resumo: string, coping: string) => void;
}

const TranscriptReviewModal: React.FC<TranscriptReviewModalProps> = ({
    isOpen,
    onClose,
    analysisResult,
    onSave
}) => {
    // Editable state for new fields
    const [resumoSessao, setResumoSessao] = useState(
        analysisResult.resumo_sessao || "Resumo não disponível."
    );
    const [evolucaoClinica, setEvolucaoClinica] = useState(
        analysisResult.evolucao_clinica || "Evolução não disponível."
    );
    const [mecanismosEnfrentamento, setMecanismosEnfrentamento] = useState(
        analysisResult.mecanismos_enfrentamento || "Nenhum mecanismo identificado."
    );

    const handleSave = () => {
        // Body: Clinical Evolution Only - sanitized to prevent XSS and ensure data integrity
        const finalBodyText = sanitizeHtml(evolucaoClinica);

        // Pass Summary and Coping as separate arguments
        // onSave(evolution, summary, coping)
        onSave(finalBodyText, resumoSessao, mecanismosEnfrentamento);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Inteligência Clínica - Revisão" size="xl">
            <div className="flex flex-col h-[70vh] space-y-6">

                {/* Header Info */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200/60 dark:border-blue-800 flex items-start space-x-3">
                    <Brain className="w-8 h-8 text-blue-500 flex-shrink-0" />
                    <div>
                        <h4 className="font-semibold text-blue-900 dark:text-blue-100">Análise Completa</h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                            A IA analisou o áudio e gerou a documentação abaixo. Revise e edite conforme necessário antes de salvar.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 overflow-hidden">
                    {/* Column 1: Session Summary */}
                    <div className="flex flex-col h-full bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
                        <div className=" bg-surface px-4 py-3 border-b border-border flex items-center">
                            <FileText className="w-5 h-5 mr-2 text-indigo-500" />
                            <h3 className="font-semibold text-on-surface ">Resumo da Sessão</h3>
                        </div>
                        <div className="flex-1 p-4 overflow-y-auto">
                            <Textarea
                                value={resumoSessao}
                                onChange={(e) => setResumoSessao(e.target.value)}
                                rows={12}
                                className="w-full h-full min-h-[300px] border-0 focus:ring-0 p-0 text-foreground-muted text-base leading-relaxed resize-none"
                                placeholder="Editando resumo..."
                            />
                        </div>
                    </div>

                    {/* Column 2: Coping Mechanisms */}
                    <div className="flex flex-col h-full bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
                        <div className=" bg-surface px-4 py-3 border-b border-border flex items-center">
                            <Shield className="w-5 h-5 mr-2 text-teal-500" />
                            <h3 className="font-semibold text-on-surface ">Mecanismos de Enfrentamento</h3>
                        </div>
                        <div className="flex-1 p-4 overflow-y-auto">
                            <Textarea
                                value={mecanismosEnfrentamento}
                                onChange={(e) => setMecanismosEnfrentamento(e.target.value)}
                                rows={12}
                                className="w-full h-full min-h-[300px] border-0 focus:ring-0 p-0 text-foreground-muted text-base leading-relaxed resize-none"
                                placeholder="Editando mecanismos..."
                            />
                        </div>
                    </div>

                    {/* Column 3: Clinical Evolution */}
                    <div className="flex flex-col h-full bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
                        <div className=" bg-surface px-4 py-3 border-b border-border flex items-center">
                            <ClipboardList className="w-5 h-5 mr-2 text-purple-500" />
                            <h3 className="font-semibold text-on-surface ">Evolução Clínica</h3>
                        </div>
                        <div className="flex-1 p-4 overflow-y-auto">
                            <Textarea
                                value={evolucaoClinica}
                                onChange={(e) => setEvolucaoClinica(e.target.value)}
                                rows={12}
                                className="w-full h-full min-h-[300px] border-0 focus:ring-0 p-0 text-foreground-muted text-base leading-relaxed resize-none"
                                placeholder="Editando evolução..."
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-border ">
                <Button onClick={onClose} variant="secondary">
                    Descartar
                </Button>
                <Button onClick={handleSave} variant="primary" className="bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Confirmar e Salvar no Prontuário
                </Button>
            </div>
        </Modal>
    );
};

export default TranscriptReviewModal;
