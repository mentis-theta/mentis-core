import React from 'react';
import type { ClinicalFact } from '@/services/aiDocumentService';
import { Activity, MessageSquare, ShieldAlert, CheckCircle2, Circle } from 'lucide-react';

import type { Session } from '@/types';
import { SourceTracePopover } from './SourceTracePopover';

interface Station2TriageProps {
    facts: ClinicalFact[];
    approvedFactIds: string[];
    sessions: Session[];
    onToggleFact: (id: string) => void;
    onNavigateToSession?: (sessionId: string) => void;
}

const typeConfig = {
    Symptom: { icon: Activity, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', label: 'Sintoma' },
    Intervention: { icon: ShieldAlert, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Intervenção' },
    Report: { icon: MessageSquare, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Relato' },
    Observation: { icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Observação' }
};

const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) return { label: 'Alta Confiabilidade', style: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    if (confidence >= 0.5) return { label: 'Confiabilidade Média', style: 'bg-amber-100 text-amber-700 border-amber-200' };
    return { label: 'Inferência / Baixa', style: 'bg-rose-100 text-rose-700 border-rose-200' };
};

const Station2Triage: React.FC<Station2TriageProps> = ({ facts, approvedFactIds, sessions, onToggleFact, onNavigateToSession }) => {
    return (
        <div className="space-y-4">
            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-indigo-900 mb-1">Mesa de Triagem (Curadoria)</h3>
                <p className="text-xs text-indigo-700">
                    A IA extraiu os seguintes Fatos Clínicos brutos das sessões escolhidas. Analise e desmarque os que não devem compor o laudo final. A IA redigirá o texto <strong>apenas</strong> baseado nos fatos aprovados.
                </p>
            </div>

            <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-2">
                {facts.map(fact => {
                    const isApproved = approvedFactIds.includes(fact.id);
                    const config = typeConfig[fact.type] || typeConfig.Observation;
                    const Icon = config.icon;

                    return (
                        <div 
                            key={fact.id}
                            onClick={() => onToggleFact(fact.id)}
                            className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer
                                ${isApproved 
                                    ? 'bg-white border-slate-200 shadow-sm' 
                                    : 'bg-slate-50 border-slate-200 opacity-50'
                                }
                            `}
                        >
                            <div className={`mt-0.5 ${isApproved ? 'text-indigo-600' : 'text-slate-400'}`}>
                                {isApproved ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${config.bg} ${config.color} ${config.border} border`}>
                                        <Icon className="w-3 h-3" />
                                        {config.label}
                                    </span>
                                    
                                    {fact.confidence && (
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${getConfidenceBadge(fact.confidence).style}`}>
                                            {getConfidenceBadge(fact.confidence).label}
                                        </span>
                                    )}

                                    {/* Mock PII Check - idealmente o Extrator ou Middleware flagga isso no objeto fato */}
                                    {fact.text.includes('***') && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200" title="Dados sensíveis (PII) foram anonimizados pela IA">
                                            PII Omitido
                                        </span>
                                    )}
                                </div>
                                
                                <p className={`text-sm mb-3 ${isApproved ? 'text-slate-800' : 'text-slate-500 line-through'}`}>
                                    {fact.text}
                                </p>
                                
                                <div className="flex items-center justify-between">
                                    <SourceTracePopover 
                                        factText={fact.text} 
                                        sourceRefs={fact.source_refs || []} 
                                        sessions={sessions}
                                        onOpenSession={(id) => {
                                            onNavigateToSession?.(id);
                                        }}
                                    />
                                    
                                    <span className={`text-[10px] font-medium uppercase tracking-wider ${isApproved ? 'text-indigo-600' : 'text-slate-400'}`}>
                                        {isApproved ? 'Aprovado para Laudo' : 'Descartado'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {facts.length === 0 && (
                    <div className="text-center text-slate-500 py-8 text-sm">
                        Nenhum fato clínico pôde ser extraído. Verifique o conteúdo das sessões.
                    </div>
                )}
            </div>
        </div>
    );
};

export default Station2Triage;
