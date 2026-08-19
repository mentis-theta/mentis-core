import React from 'react';
import { GranularErrorBoundary } from '../../../components/GranularErrorBoundary';
import { MentisDashboard } from '../../Clinical/Mentis/MentisDashboard';

export default function MentisCopilotTab() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-r-lg mb-6 shadow-sm">
        <h3 className="font-bold text-indigo-900 flex items-center gap-2">
          <span className="bg-indigo-200 text-indigo-800 text-xs px-2 py-0.5 rounded uppercase font-black tracking-wider">Beta Lab</span>
          Mentis Copilot Clínico
        </h3>
        <p className="text-sm text-indigo-800 mt-2">
          Esta é uma área experimental focada em Raciocínio Clínico Assistido (RAG). As inferências não substituem seu julgamento profissional e não farão parte do prontuário oficial sem sua aprovação explícita.
        </p>
      </div>

      <GranularErrorBoundary fallbackMessage="Erro ao processar as evidências no Copiloto.">
        <MentisDashboard />
      </GranularErrorBoundary>
    </div>
  );
}
