import React from 'react';
import { useEditorEducation } from '@/contexts/EditorEducationContext';
import { CheckCircle, Circle, X } from 'lucide-react';

export const SessionEditorChecklist = () => {
    const { 
        isLearnerMode, 
        checklistProgress, 
        isChecklistComplete, 
        hasDismissedChecklist,
        trackEvent 
    } = useEditorEducation();

    if (!isLearnerMode || hasDismissedChecklist) return null;

    return (
        <div className={`fixed bottom-6 right-6 w-80 bg-surface border border-border/60 rounded-xl shadow-xl z-40 transition-all duration-700 ${isChecklistComplete ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
            <div className="p-4 border-b border-border/60 flex items-center justify-between">
                <h4 className="font-semibold text-sm">Conhecendo o Novo Editor</h4>
            </div>
            
            {isChecklistComplete ? (
                <div className="p-6 text-center animate-fadeIn">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <h5 className="font-semibold text-green-700 dark:text-green-400">Parabéns!</h5>
                    <p className="text-xs text-foreground-muted mt-2">Você dominou o novo fluxo do Mentis.</p>
                </div>
            ) : (
                <div className="p-4 space-y-3">
                    <ChecklistItem 
                        label="Visualizar a Transcrição" 
                        done={checklistProgress.viewedTranscript} 
                    />
                    <ChecklistItem 
                        label="Criar ou editar um Rascunho" 
                        done={checklistProgress.createdDraft} 
                    />
                    <ChecklistItem 
                        label="Publicar no Prontuário" 
                        done={checklistProgress.publishedEvolution} 
                    />
                    <ChecklistItem 
                        label="Finalizar a Sessão" 
                        done={checklistProgress.finalizedSession} 
                    />
                </div>
            )}
        </div>
    );
};

const ChecklistItem = ({ label, done }: { label: string; done: boolean }) => (
    <div className={`flex items-center text-sm transition-colors duration-300 ${done ? 'text-foreground-muted line-through' : 'text-slate-700 dark:text-slate-200'}`}>
        {done ? (
            <CheckCircle className="w-4 h-4 mr-3 text-green-500" />
        ) : (
            <Circle className="w-4 h-4 mr-3 text-slate-300 dark:text-slate-600" />
        )}
        {label}
    </div>
);
