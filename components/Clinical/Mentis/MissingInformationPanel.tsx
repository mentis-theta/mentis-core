import React from 'react';
import { AlertCircle, Square, CheckSquare } from 'lucide-react';

interface MissingInformationPanelProps {
  missingItems: string[];
}

export const MissingInformationPanel: React.FC<MissingInformationPanelProps> = ({ missingItems }) => {
  if (!missingItems || missingItems.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
          <AlertCircle size={20} />
        </div>
        <div>
          <h3 className="font-semibold text-amber-900 text-sm">Informações Ausentes</h3>
          <p className="text-amber-700 text-xs">Dimensões não encontradas no relato atual</p>
        </div>
      </div>
      
      <div className="space-y-3">
        {missingItems.map((item, index) => (
          <label 
            key={index} 
            className="flex items-start gap-3 cursor-pointer group"
          >
            <div className="mt-0.5 text-amber-400 group-hover:text-amber-600 transition-colors">
              <Square size={16} />
            </div>
            <span className="text-amber-800 text-sm font-medium leading-tight">
              {item}
            </span>
          </label>
        ))}
      </div>
      
      <div className="mt-5 pt-4 border-t border-amber-200/60">
        <p className="text-amber-600 text-xs italic">
          Use esta lista como um roteiro investigativo para a sua próxima sessão com o paciente.
        </p>
      </div>
    </div>
  );
};
