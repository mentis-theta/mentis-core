import React, { useState } from 'react';
import Button from '../Button';
import { ArrowLeft, Shield, SpellCheck, ClipboardList, Loader2 } from 'lucide-react';
import { correctSpellingAndPunctuation, formatToCFPModel } from '@/services/geminiService';
import { useToast } from '@/contexts/ToastContext';

interface DraftReviewViewProps {
    reviewText: string;
    onReviewTextChange: (text: string) => void;
    onBack: () => void;
    onFinalize: () => void;
    isSaving: boolean;
    patientName?: string;
    transcript?: string;
}

const DraftReviewView: React.FC<DraftReviewViewProps> = ({
    reviewText, onReviewTextChange, onBack, onFinalize, isSaving, patientName, transcript
}) => {
    const { addToast } = useToast();
    const [isProcessingAI, setIsProcessingAI] = useState<'spelling' | 'cfp' | null>(null);

    const handleCorrectSpelling = async () => {
        if (!reviewText.trim()) return;
        setIsProcessingAI('spelling');
        try {
            const corrected = await correctSpellingAndPunctuation(reviewText);
            onReviewTextChange(corrected);
            addToast('Ortografia e pontuação corrigidas!', 'success');
        } catch (error: any) {
            addToast(error.message || 'Erro ao corrigir texto.', 'error');
        } finally {
            setIsProcessingAI(null);
        }
    };

    const handleFormatCFP = async () => {
        if (!reviewText.trim() && !transcript?.trim()) {
            addToast('É necessário ter anotações ou transcrição para usar esta função.', 'warning');
            return;
        }
        setIsProcessingAI('cfp');
        try {
            const formatted = await formatToCFPModel(reviewText, patientName, transcript);
            onReviewTextChange(formatted);
            addToast('Texto formatado no modelo CFP!', 'success');
        } catch (error: any) {
            addToast(error.message || 'Erro ao formatar texto.', 'error');
        } finally {
            setIsProcessingAI(null);
        }
    };

    return (
        <div className="flex flex-col h-full space-y-4 animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={onBack}
                    className="flex items-center text-sm font-medium text-foreground-muted hover:text-on-surface transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-1.5" />
                    Voltar ao Rascunho
                </button>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-full">
                    Revisão Obrigatória
                </span>
            </div>

            {/* AI Toolbar */}
            <div className="flex items-center gap-2 p-3 bg-surface-container-low rounded-2xl border border-border/40">
                <span className="text-xs font-semibold text-foreground-muted mr-2">Assistente IA:</span>
                <button
                    onClick={handleCorrectSpelling}
                    disabled={!!isProcessingAI || !reviewText.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-blue-200 dark:border-blue-800"
                >
                    {isProcessingAI === 'spelling' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <SpellCheck className="w-3.5 h-3.5" />
                    )}
                    Corrigir Ortografia
                </button>
                <button
                    onClick={handleFormatCFP}
                    disabled={!!isProcessingAI || (!reviewText.trim() && !transcript?.trim())}
                    title="Organiza o texto conforme orientações da Resolução CFP nº 001/2009. O resultado é uma sugestão — revise antes de confirmar."
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-purple-200 dark:border-purple-800"
                >
                    {isProcessingAI === 'cfp' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <ClipboardList className="w-3.5 h-3.5" />
                    )}
                    Organizar (CFP)
                </button>
            </div>

            {/* Review Editor */}
            <div className="flex-1 flex flex-col rounded-2xl border border-border/60 bg-surface shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border/40 bg-surface-container-low/50">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground-muted">
                        Evolução Clínica Final
                    </h4>
                </div>
                <textarea
                    value={reviewText}
                    onChange={(e) => onReviewTextChange(e.target.value)}
                    placeholder="Revise e ajuste o texto da evolução clínica antes de finalizar..."
                    className="flex-1 w-full p-4 bg-transparent text-on-surface text-sm leading-relaxed resize-none outline-none placeholder:text-foreground-muted/50 min-h-[250px]"
                />
            </div>

            {/* Finalize Button */}
            <div className="flex justify-end pt-2">
                <Button
                    onClick={onFinalize}
                    disabled={isSaving || !reviewText.trim()}
                    className="!bg-emerald-600 hover:!bg-emerald-700 !text-white px-6"
                >
                    {isSaving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Shield className="w-4 h-4 mr-2" />
                    )}
                    Confirmar Evolução
                </Button>
            </div>
        </div>
    );
};

export default DraftReviewView;
