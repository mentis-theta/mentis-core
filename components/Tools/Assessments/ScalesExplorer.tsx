import React, { useState, Suspense } from 'react';
import { Heart, Brain, Moon, Shield, Flame, RefreshCw, ChevronRight, ArrowLeft } from 'lucide-react';

// O InventoriesTab existente permanece 100% intacto — apenas o importamos
const InventoriesTab = React.lazy(() => import('../TCC/InventoriesTab'));

interface ScalesExplorerProps {
  patientId: string;
}

interface ClinicalDomain {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  scales: { id: string; name: string }[];
}

/**
 * Domínios clínicos com as 18 escalas agrupadas.
 * 
 * Cada escala mantém o id exato usado no InventoriesTab (SCALES array)
 * para compatibilidade perfeita com o sistema existente.
 */
const CLINICAL_DOMAINS: ClinicalDomain[] = [
  {
    id: 'humor',
    label: 'Humor',
    icon: <Heart className="w-4 h-4" />,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800',
    scales: [
      { id: 'PHQ-9', name: 'PHQ-9 (Depressão)' },
      { id: 'DASS-21', name: 'DASS-21 (Humor/Ansiedade/Estresse)' },
    ],
  },
  {
    id: 'ansiedade',
    label: 'Ansiedade',
    icon: <Brain className="w-4 h-4" />,
    color: 'text-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    scales: [
      { id: 'GAD-7', name: 'GAD-7 (Ansiedade Generalizada)' },
      { id: 'SPIN', name: 'SPIN (Fobia Social)' },
      { id: 'PSS-10', name: 'PSS-10 (Estresse Percebido)' },
    ],
  },
  {
    id: 'sono',
    label: 'Sono',
    icon: <Moon className="w-4 h-4" />,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
    scales: [
      { id: 'ISI', name: 'ISI (Insônia)' },
    ],
  },
  {
    id: 'neurodesenvolvimento',
    label: 'Neurodesenvolvimento',
    icon: <Brain className="w-4 h-4" />,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800',
    scales: [
      { id: 'ASRS-18', name: 'ASRS-18 (TDAH Adultos)' },
      { id: 'SNAP-IV', name: 'SNAP-IV (TDAH/TOD Infantil)' },
      { id: 'AQ-10', name: 'AQ-10 (Autismo Adulto)' },
      { id: 'MDQ', name: 'MDQ (Bipolaridade)' },
    ],
  },
  {
    id: 'risco',
    label: 'Risco e Segurança',
    icon: <Shield className="w-4 h-4" />,
    color: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    scales: [
      { id: 'C-SSRS', name: 'C-SSRS (Risco Suicida)' },
      { id: 'MSI-BPD', name: 'MSI-BPD (Triagem Borderline)' },
      { id: 'BPQ', name: 'BPQ (Borderline 80 itens)' },
      { id: 'ASSIST', name: 'ASSIST (Triagem Substâncias)' },
    ],
  },
  {
    id: 'burnout',
    label: 'Burnout e Funcionalidade',
    icon: <Flame className="w-4 h-4" />,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
    scales: [
      { id: 'CBI', name: 'CBI (Burnout)' },
      { id: 'Pfeffer', name: 'Pfeffer (Declínio Funcional)' },
    ],
  },
  {
    id: 'toc-trauma',
    label: 'TOC e Trauma',
    icon: <RefreshCw className="w-4 h-4" />,
    color: 'text-teal-500',
    bgColor: 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800',
    scales: [
      { id: 'OCI-R', name: 'OCI-R (TOC)' },
      { id: 'PCL-5', name: 'PCL-5 (TEPT)' },
    ],
  },
];

const ScalesExplorer: React.FC<ScalesExplorerProps> = ({ patientId }) => {
  // null = mostra os domínios; string = mostra a escala selecionada (via InventoriesTab)
  const [selectedScale, setSelectedScale] = useState<string | null>(null);

  // Quando uma escala é selecionada, renderiza o InventoriesTab existente
  // O InventoriesTab internamente gerencia seu próprio estado — nós apenas o montamos
  if (selectedScale !== null) {
    return (
      <div className="animate-fadeIn">
        {/* Header de navegação de volta */}
        <button
          onClick={() => setSelectedScale(null)}
          className="flex items-center gap-2 text-sm font-medium text-foreground-muted hover:text-on-surface mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Domínios
        </button>

        {/* Renderiza o InventoriesTab original — 100% intacto */}
        <Suspense fallback={<div className="p-8 text-center text-foreground-muted">Carregando escala...</div>}>
          <InventoriesTab patientId={patientId} initialScale={selectedScale} />
        </Suspense>
      </div>
    );
  }

  // Vista de domínios clínicos
  return (
    <div className="space-y-4 animate-fadeIn">
      {CLINICAL_DOMAINS.map((domain) => (
        <div
          key={domain.id}
          className={`border rounded-2xl overflow-hidden ${domain.bgColor} transition-all duration-200`}
        >
          {/* Header do domínio */}
          <div className="flex items-center gap-3 px-5 py-3">
            <span className={`${domain.color}`}>{domain.icon}</span>
            <span className="text-sm font-bold text-on-surface">{domain.label}</span>
            <span className="text-[10px] font-bold text-foreground-muted ml-auto">
              {domain.scales.length} {domain.scales.length === 1 ? 'escala' : 'escalas'}
            </span>
          </div>

          {/* Lista de escalas */}
          <div className="px-3 pb-3 space-y-1">
            {domain.scales.map((scale) => (
              <button
                key={scale.id}
                onClick={() => setSelectedScale(scale.id)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-surface/80 backdrop-blur-sm hover:bg-surface-container-high transition-colors text-left group"
              >
                <span className="text-sm font-medium text-on-surface group-hover:text-primary transition-colors">
                  {scale.name}
                </span>
                <ChevronRight className="w-4 h-4 text-foreground-muted opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ScalesExplorer;
