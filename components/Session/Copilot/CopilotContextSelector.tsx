import React from 'react';

interface CopilotContextSelectorProps {
  config: {
    useCurrentParagraph: boolean;
    useSelection: boolean;
    useLastNTokens: boolean;
    useFullSession: boolean;
    useMoodMetrics: boolean;
    useTags: boolean;
    useGoals: boolean;
  };
  setConfig: (config: any) => void;
  disabled?: boolean;
}

export const CopilotContextSelector: React.FC<CopilotContextSelectorProps> = ({ config, setConfig, disabled }) => {
  const toggle = (key: keyof typeof config) => {
    setConfig({ ...config, [key]: !config[key] });
  };

  const checkboxClass = "w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed";
  const labelClass = "text-sm text-gray-700 ml-2 select-none flex-1 font-medium";

  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-4 animate-fadeIn">
      <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wider text-xs">
        Contexto Clínico a Enviar
      </h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="flex items-center cursor-pointer group">
          <input 
            type="checkbox" 
            checked={config.useCurrentParagraph} 
            onChange={() => toggle('useCurrentParagraph')} 
            className={checkboxClass}
            disabled={disabled}
          />
          <span className={labelClass}>Parágrafo Atual</span>
        </label>

        <label className="flex items-center cursor-pointer group">
          <input 
            type="checkbox" 
            checked={config.useSelection} 
            onChange={() => toggle('useSelection')} 
            className={checkboxClass}
            disabled={disabled}
          />
          <span className={labelClass}>Trecho Selecionado</span>
        </label>

        <label className="flex items-center cursor-pointer group">
          <input 
            type="checkbox" 
            checked={config.useLastNTokens} 
            onChange={() => toggle('useLastNTokens')} 
            className={checkboxClass}
            disabled={disabled}
          />
          <span className={labelClass}>Últimos ~500 tokens</span>
        </label>

        <label className="flex items-center cursor-pointer group">
          <input 
            type="checkbox" 
            checked={config.useFullSession} 
            onChange={() => toggle('useFullSession')} 
            className={checkboxClass}
            disabled={disabled}
          />
          <span className={labelClass}>Sessão Completa</span>
          <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded ml-2 font-bold uppercase tracking-wider">Atenção</span>
        </label>
      </div>

      <div className="h-px bg-slate-200 dark:bg-slate-700 my-3"></div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="flex items-center cursor-pointer group">
          <input 
            type="checkbox" 
            checked={config.useMoodMetrics} 
            onChange={() => toggle('useMoodMetrics')} 
            className={checkboxClass}
            disabled={disabled}
          />
          <span className={labelClass}>Métricas de Humor</span>
        </label>
        
        <label className="flex items-center cursor-pointer group">
          <input 
            type="checkbox" 
            checked={config.useTags} 
            onChange={() => toggle('useTags')} 
            className={checkboxClass}
            disabled={disabled}
          />
          <span className={labelClass}>Tags da Sessão</span>
        </label>

        <label className="flex items-center cursor-pointer group">
          <input 
            type="checkbox" 
            checked={config.useGoals} 
            onChange={() => toggle('useGoals')} 
            className={checkboxClass}
            disabled={disabled}
          />
          <span className={labelClass}>Metas Ativas</span>
        </label>
      </div>
    </div>
  );
};
