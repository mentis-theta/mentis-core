import React, { useState } from 'react';
import { Search, ExternalLink, X, FileText, Calendar } from 'lucide-react';
import type { Session } from '@/types';
import { getPlainTextFromSession } from '@/components/Session/RichTextRenderer';

interface SourceTracePopoverProps {
    factText: string;
    sourceRefs: string[];
    sessions: Session[];
    onOpenSession: (sessionId: string) => void;
}

export const SourceTracePopover: React.FC<SourceTracePopoverProps> = ({ factText, sourceRefs, sessions, onOpenSession }) => {
    const [isOpen, setIsOpen] = useState(false);

    // Encontra as sessões referenciadas
    const referencedSessions = sessions.filter(s => sourceRefs.includes(s.id));

    const togglePopover = (e: React.MouseEvent) => {
        e.stopPropagation(); // Evita marcar o checkbox
        setIsOpen(!isOpen);
    };

    // Função heurística para encontrar um "Snippet" na sessão que se assemelhe ao Fato
    // Como a IA sumariza, buscamos palavras-chave do fato na sessão para extrair 150 caracteres ao redor
    const extractSnippet = (session: Session, factText: string) => {
        const fullText = typeof session.notes === 'string' ? session.notes : getPlainTextFromSession(session.notes);
        if (!fullText) return 'Anotação vazia.';

        // Heurística ultra-simples: pega as 3 palavras mais longas do fato e procura no texto
        const keywords = factText.split(' ')
            .filter(w => w.length > 4)
            .map(w => w.toLowerCase());
            
        let bestIndex = -1;
        for (const kw of keywords) {
            const idx = fullText.toLowerCase().indexOf(kw);
            if (idx !== -1) {
                bestIndex = idx;
                break;
            }
        }

        if (bestIndex === -1) {
            // Fallback: retorna o começo da sessão se não achar correspondência forte
            return fullText.slice(0, 150) + '...';
        }

        // Corta um raio de 80 caracteres para trás e para frente
        const start = Math.max(0, bestIndex - 80);
        const end = Math.min(fullText.length, bestIndex + 150);
        let snippet = fullText.slice(start, end);
        
        if (start > 0) snippet = '...' + snippet;
        if (end < fullText.length) snippet = snippet + '...';

        return snippet;
    };

    if (sourceRefs.length === 0) return null;

    return (
        <div className="relative inline-block">
            <button 
                onClick={togglePopover}
                className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded text-xs font-medium transition-colors border border-slate-200"
                title="Rastreabilidade Forense"
            >
                <Search className="w-3.5 h-3.5" />
                <span>Ver Origem</span>
            </button>

            {isOpen && (
                <>
                    <div 
                        className="fixed inset-0 z-40" 
                        onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} 
                    />
                    <div 
                        className="absolute z-50 mt-2 left-0 w-80 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Origem da Evidência</span>
                            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        
                        <div className="max-h-64 overflow-y-auto">
                            {referencedSessions.length > 0 ? referencedSessions.map(session => (
                                <div key={session.id} className="p-4 border-b border-slate-100 last:border-0">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                                            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(session.date).toLocaleDateString('pt-BR')}</span>
                                            <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> {session.sessionType}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="text-sm text-slate-700 bg-amber-50/50 p-3 rounded border border-amber-100 italic relative">
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-300 rounded-l"></div>
                                        "{extractSnippet(session, factText)}"
                                    </div>

                                    <button 
                                        onClick={() => {
                                            setIsOpen(false);
                                            onOpenSession(session.id);
                                        }}
                                        className="mt-3 flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium w-full justify-end"
                                    >
                                        <span>Abrir Sessão Completa</span>
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )) : (
                                <div className="p-4 text-sm text-slate-500 text-center">
                                    Sessão de origem não encontrada ou removida.
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
