import React from 'react';
import { Provenance } from '../../../hooks/useMentisReasoning';
import { X, ExternalLink, BookOpen } from 'lucide-react';

interface ProvenanceModalProps {
  provenanceData: Provenance[];
  onClose: () => void;
}

export const ProvenanceModal: React.FC<ProvenanceModalProps> = ({ provenanceData, onClose }) => {
  if (!provenanceData || provenanceData.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
              <BookOpen size={20} />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Rastreabilidade Científica</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-5 overflow-y-auto space-y-4">
          <p className="text-sm text-gray-500 mb-4">
            Abaixo estão as fontes literais extraídas dos Manuais Diagnósticos e Diretrizes que basearam esta evidência.
          </p>

          {provenanceData.map((prov, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  ID: {prov.chunk_id.substring(0, 8)}...
                </span>
                <span className="text-xs text-gray-500 font-medium">
                  {prov.documento_origem}
                </span>
              </div>
              
              <div className="mt-3 pl-3 border-l-2 border-indigo-300">
                <p className="text-sm text-gray-800 italic">
                  "{prov.sentenca_exata}"
                </p>
              </div>
              
              {prov.pagina_ou_secao && (
                <div className="mt-3 text-xs text-gray-500 flex items-center gap-1">
                  <ExternalLink size={12} />
                  Seção/Página: {prov.pagina_ou_secao}
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
