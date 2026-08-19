import React from 'react';
import type { Session } from '@/types';
import { getPlainTextFromSession } from '@/components/Session/RichTextRenderer';
import { Calendar, CheckSquare, Square } from 'lucide-react';

interface Station1ScopeProps {
    sessions: Session[];
    selectedSessionIds: string[];
    onToggleSession: (id: string) => void;
}

const Station1Scope: React.FC<Station1ScopeProps> = ({ sessions, selectedSessionIds, onToggleSession }) => {
    return (
        <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-blue-900 mb-1">Régua de Escopo</h3>
                <p className="text-xs text-blue-700">
                    Selecione apenas as sessões relevantes para este documento. Sessões desmarcadas serão ignoradas pela IA, garantindo o Princípio da Exiguidade e o sigilo profissional.
                </p>
            </div>
            
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
                {sessions.map(session => {
                    const isSelected = selectedSessionIds.includes(session.id);
                    const plainNotes = typeof session.notes === 'string' ? session.notes : getPlainTextFromSession(session.notes);
                    // Resumo visual rápido (1-2 frases)
                    const preview = plainNotes.slice(0, 150) + (plainNotes.length > 150 ? '...' : '');

                    return (
                        <div 
                            key={session.id}
                            onClick={() => onToggleSession(session.id)}
                            className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer
                                ${isSelected 
                                    ? 'bg-white border-indigo-200 ring-1 ring-indigo-500 shadow-sm' 
                                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 opacity-70'
                                }
                            `}
                        >
                            <div className="mt-0.5 text-indigo-600">
                                {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-slate-400" />}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <Calendar className="w-4 h-4 text-slate-500" />
                                    <span className="text-sm font-semibold text-slate-800">
                                        {new Date(session.date).toLocaleDateString('pt-BR')} - {session.sessionType}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed italic">
                                    "{preview}"
                                </p>
                            </div>
                        </div>
                    );
                })}
                
                {sessions.length === 0 && (
                    <div className="text-center text-slate-500 py-8 text-sm">
                        Nenhuma sessão encontrada para este paciente.
                    </div>
                )}
            </div>
        </div>
    );
};

export default Station1Scope;
