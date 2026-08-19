import React, { useState } from 'react';
import { Database, X, Terminal } from 'lucide-react';
import { MentisResponse } from '../../../hooks/useMentisReasoning';

interface AuditViewerProps {
  data: MentisResponse;
}

export const AuditViewer: React.FC<AuditViewerProps> = ({ data }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <div className="mt-8 flex justify-center">
        <button 
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
        >
          <Database size={16} />
          Mostrar cadeia completa (Auditoria)
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm p-6">
      <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col border border-gray-700 overflow-hidden">
        
        <div className="flex items-center justify-between p-4 bg-gray-950 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <Terminal size={18} className="text-emerald-400" />
            <h2 className="text-sm font-mono text-gray-300">pipeline_audit_log.json</h2>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 p-6 overflow-auto bg-[#0d1117]">
          <pre className="text-xs font-mono text-emerald-400/90 whitespace-pre-wrap">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
        
      </div>
    </div>
  );
};
