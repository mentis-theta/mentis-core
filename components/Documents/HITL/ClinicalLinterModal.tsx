import React from 'react';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import { AlertTriangle, Check, Loader2 } from 'lucide-react';
import type { useHITLPipeline } from '@/hooks/useHITLPipeline';

interface ClinicalLinterModalProps {
    pipeline: ReturnType<typeof useHITLPipeline>;
}

const ClinicalLinterModal: React.FC<ClinicalLinterModalProps> = ({ pipeline }) => {
    const { currentStation, linterResult, closePipeline, isProcessing } = pipeline;

    // Se estiver processando, exibe o modal como overlay de loading
    if (currentStation !== 'LINTER') return null;

    if (isProcessing) {
        return (
            <Modal isOpen={true} onClose={() => {}} title="Auditoria em andamento..." size="xl">
                <div className="p-12 flex flex-col items-center justify-center">
                    <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                    <h3 className="text-xl font-bold text-slate-800">A IA está revisando o seu documento</h3>
                    <p className="text-slate-500 mt-2">Cruzando os Fatos Clínicos em busca de contradições lógicas...</p>
                </div>
            </Modal>
        );
    }

    if (!linterResult) return null;

    return (
        <Modal
            isOpen={true}
            onClose={closePipeline}
            title="Auditoria de Coerência (Linter Clínico)"
            size="2xl"
        >
            <div className="p-6 bg-slate-50 max-h-[80vh] overflow-y-auto">
                {!linterResult.hasIssues || linterResult.issues.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                            <Check className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Documento Coeso</h3>
                        <p className="text-sm text-slate-600 text-center max-w-md">
                            Nenhuma discrepância lógica ou estrutural foi encontrada pela IA. O documento está consistente.
                        </p>
                        <Button onClick={closePipeline} className="mt-8 bg-slate-900 text-white hover:bg-slate-800">
                            Voltar ao Editor
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-4">
                            <AlertTriangle className="w-6 h-6 text-amber-500 mt-1" />
                            <div>
                                <h3 className="text-sm font-bold text-amber-900">Atenção Necessária</h3>
                                <p className="text-sm text-amber-800 mt-1">
                                    O Linter identificou potenciais contradições no seu texto. Revise os apontamentos abaixo e decida se quer fazer os ajustes manualmente no editor.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {linterResult.issues.map((issue, idx) => (
                                <div key={idx} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                                    <div className="inline-block px-2 py-1 bg-slate-100 rounded text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                                        Bloco: {issue.block}
                                    </div>
                                    <p className="text-sm text-slate-800 font-semibold mb-2">
                                        {issue.description}
                                    </p>
                                    <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mt-3">
                                        <p className="text-xs text-blue-800 font-semibold mb-1">Sugestão de Correção (Mini-Diff):</p>
                                        <p className="text-sm text-blue-900 italic">"{issue.suggestion}"</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="pt-4 border-t border-slate-200 flex justify-end">
                            <Button onClick={closePipeline} className="bg-slate-900 text-white hover:bg-slate-800">
                                Entendido, irei corrigir
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ClinicalLinterModal;
