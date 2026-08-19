import React, { useState } from 'react';
import { EvidenceNode } from '../../../hooks/useMentisReasoning';
import { Brain, FileText, AlertTriangle, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown } from 'lucide-react';
import { ProvenanceModal } from './ProvenanceModal.tsx';

interface EvidenceNodeCardProps {
  node: EvidenceNode;
  onFeedback?: (avaliacao: 'concordo' | 'discordo' | 'insuficiente' | 'nao_aplicavel', motivo?: string) => void;
}

export const EvidenceNodeCard: React.FC<EvidenceNodeCardProps> = ({ node, onFeedback }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showProvenance, setShowProvenance] = useState(false);
  const [showDiscordoOptions, setShowDiscordoOptions] = useState(false);

  const handleFeedback = (avaliacao: 'concordo' | 'discordo' | 'insuficiente' | 'nao_aplicavel', motivo?: string) => {
    if (avaliacao === 'discordo' && !motivo) {
      setShowDiscordoOptions(true);
      return;
    }
    setShowDiscordoOptions(false);
    onFeedback?.(avaliacao, motivo);
  };

  // Score format
  const scorePercent = Math.round(node.confidence_score * 100);
  const isHighConfidence = scorePercent >= 70;
  const isMediumConfidence = scorePercent >= 40 && scorePercent < 70;
  
  const scoreColor = isHighConfidence ? 'text-green-600 bg-green-50' : isMediumConfidence ? 'text-yellow-600 bg-yellow-50' : 'text-gray-600 bg-gray-50';

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4 transition-all hover:shadow-md">
      {/* Header */}
      <div 
        className="p-4 flex items-center justify-between cursor-pointer bg-gray-50/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
            <Brain size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-base">{node.sintoma_ou_fator}</h3>
            <p className="text-gray-500 text-xs">Hipótese Clínica Investigada</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5 ${scoreColor}`}>
            <span>{scorePercent}%</span>
            <span className="text-xs opacity-75 hidden sm:inline">Confiança</span>
          </div>
          <button className="text-gray-400 hover:text-gray-600">
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>
      </div>

      {/* Body */}
      {isExpanded && (
        <div className="p-5 border-t border-gray-100 space-y-6">
          
          {/* Aba de Inferência */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <Brain size={16} className="text-blue-500" />
              Inferência (Hipótese)
            </h4>
            <p className="text-gray-800 text-sm leading-relaxed bg-blue-50/50 p-4 rounded-lg border border-blue-100">
              {node.hipotese_clinica}
            </p>
          </div>

          {/* Aba de Observação */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <FileText size={16} className="text-indigo-500" />
              Observação (Evidência Base)
            </h4>
            <p className="text-gray-800 text-sm leading-relaxed bg-indigo-50/50 p-4 rounded-lg border border-indigo-100">
              {node.explicacao_baseada_nas_evidencias}
            </p>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowProvenance(true); }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium mt-1 flex items-center gap-1"
            >
              Ver Rastreabilidade (Fontes)
            </button>
          </div>

          {/* Contradições Críticas (ALERTA VISUAL MÁXIMO) */}
          {node.contradições_criticas && node.contradições_criticas.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-black text-red-800 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle size={16} />
                Contradições (Critérios de Exclusão Encontrados)
              </h4>
              <div className="bg-red-100 p-4 rounded-lg border-2 border-red-500 shadow-sm">
                <ul className="list-disc pl-5 space-y-1.5">
                  {node.contradições_criticas.map((contra, idx) => (
                    <li key={idx} className="text-red-900 text-sm font-bold">
                      {contra}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Contraevidências (Faltantes) */}
          {node.contraevidencias && node.contraevidencias.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-orange-700 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle size={16} />
                Contraevidências (Foco Diagnóstico Diferencial)
              </h4>
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <ul className="list-disc pl-5 space-y-1.5">
                  {node.contraevidencias.map((contra, idx) => (
                    <li key={idx} className="text-orange-900 text-sm font-medium">
                      {contra}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Necessidade de Avaliação */}
          {node.necessidade_avaliacao && (
            <div className="pt-4 border-t border-gray-100">
              <h4 className="text-xs font-semibold text-gray-500 mb-2">PRÓXIMO PASSO SUGERIDO</h4>
              <p className="text-gray-700 text-sm">{node.necessidade_avaliacao}</p>
            </div>
          )}

          {/* Feedback Loop Científico */}
          <div className="pt-4 flex flex-col gap-2 border-t border-gray-100">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500 mr-2 font-medium">Avaliação (Pesquisa):</span>
              
              <button 
                onClick={() => handleFeedback('concordo')}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 rounded border border-gray-200 transition-colors"
              >
                Concordo
              </button>
              <button 
                onClick={() => handleFeedback('discordo')}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 rounded border border-gray-200 transition-colors"
              >
                Discordo
              </button>
              <button 
                onClick={() => handleFeedback('insuficiente')}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 rounded border border-gray-200 transition-colors"
              >
                Insuficiente
              </button>
              <button 
                onClick={() => handleFeedback('nao_aplicavel')}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 rounded border border-gray-200 transition-colors"
              >
                Não aplicável
              </button>
            </div>

            {showDiscordoOptions && (
              <div className="flex flex-wrap gap-2 mt-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                <span className="text-xs text-gray-600 font-medium w-full mb-1">Motivo da Discordância:</span>
                <button onClick={() => handleFeedback('discordo', 'ALUCINACAO')} className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200">Alucinação</button>
                <button onClick={() => handleFeedback('discordo', 'CRITERIO_ERRADO')} className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200">Critério Errado</button>
                <button onClick={() => handleFeedback('discordo', 'IRRELEVANTE')} className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300">Irrelevante (Sinal Ruído)</button>
                <button onClick={() => handleFeedback('discordo', 'VIAS_DE_CONFIRMACAO')} className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200">Viés de Confirmação</button>
                <button onClick={() => handleFeedback('discordo', 'OUTRO')} className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300">Outro</button>
              </div>
            )}
          </div>

        </div>
      )}

      {showProvenance && (
        <ProvenanceModal 
          provenanceData={node.provenance} 
          onClose={() => setShowProvenance(false)} 
        />
      )}
    </div>
  );
};
