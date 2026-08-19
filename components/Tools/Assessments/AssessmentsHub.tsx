import React, { useState, Suspense } from 'react';
import { Activity, BrainCircuit, Compass, ArrowLeft } from 'lucide-react';
import ToolGuideButton from '../ToolGuideButton';

// Lazy load das 3 categorias
const ScalesExplorer = React.lazy(() => import('./ScalesExplorer'));
const CognitiveTasksPanel = React.lazy(() => import('./CognitiveTasksPanel'));
const VocationalPanel = React.lazy(() => import('./VocationalPanel'));

type ActiveView = 'hub' | 'scales' | 'cognitive' | 'vocational';

interface AssessmentsHubProps {
  patientId: string;
}

interface CategoryCard {
  id: ActiveView;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  gradient: string;
  iconColor: string;
}

const CATEGORIES: CategoryCard[] = [
  {
    id: 'scales',
    icon: <Activity className="w-8 h-8" />,
    title: 'Escalas Clínicas',
    subtitle: 'Acompanhamento quantitativo de sintomas com 18 instrumentos validados',
    badge: '18 escalas',
    badgeColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    gradient: 'from-indigo-500/10 to-violet-500/5',
    iconColor: 'text-indigo-500',
  },
  {
    id: 'cognitive',
    icon: <BrainCircuit className="w-8 h-8" />,
    title: 'Rastreio Cognitivo',
    subtitle: 'Paradigmas de atenção seletiva e memória de trabalho visuoespacial',
    badge: 'NOVO',
    badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    gradient: 'from-emerald-500/10 to-cyan-500/5',
    iconColor: 'text-emerald-500',
  },
  {
    id: 'vocational',
    icon: <Compass className="w-8 h-8" />,
    title: 'Orientação Vocacional',
    subtitle: 'Perfil de interesses profissionais baseado na Tipologia de Holland',
    badge: 'NOVO',
    badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    gradient: 'from-amber-500/10 to-orange-500/5',
    iconColor: 'text-amber-500',
  },
];

const AssessmentsHub: React.FC<AssessmentsHubProps> = ({ patientId }) => {
  const [activeView, setActiveView] = useState<ActiveView>('hub');

  // Header de navegação com botão de voltar
  const BackHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div className="flex items-center gap-4 border-b border-border pb-4 mb-6 animate-fadeIn">
      <button
        onClick={() => setActiveView('hub')}
        className="flex items-center justify-center w-10 h-10 rounded-xl bg-surface-container-high hover:bg-surface-container-highest transition-colors"
        title="Voltar para Avaliações"
      >
        <ArrowLeft className="w-5 h-5 text-foreground-muted" />
      </button>
      <div>
        <h3 className="text-xl font-bold text-on-surface">{title}</h3>
        <p className="text-sm text-foreground-muted mt-0.5">{subtitle}</p>
      </div>
    </div>
  );

  // View: Hub (Landing Page com 3 cards)
  if (activeView === 'hub') {
    return (
      <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-fadeIn">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-border pb-4 mb-2">
          <div>
            <h3 className="text-xl font-bold text-on-surface flex items-center gap-2">
              <Activity className="h-6 w-6 text-indigo-500" />
              Avaliações
              <ToolGuideButton toolId="inventories" />
            </h3>
            <p className="text-sm text-foreground-muted mt-1">
              Escalas clínicas, rastreio cognitivo e orientação vocacional.
            </p>
          </div>
        </div>

        {/* Cards de Categoria */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveView(cat.id)}
              className={`
                group relative overflow-hidden text-left
                bg-surface border border-border/60 rounded-3xl p-6 
                shadow-sm hover:shadow-md hover:border-border
                transition-all duration-300 hover:-translate-y-0.5
              `}
            >
              {/* Gradient background sutil */}
              <div className={`absolute inset-0 bg-gradient-to-br ${cat.gradient} opacity-60 group-hover:opacity-100 transition-opacity duration-300`} />

              <div className="relative z-10">
                {/* Ícone + Badge */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-2xl bg-surface-container-high/80 backdrop-blur-sm ${cat.iconColor} group-hover:scale-110 transition-transform duration-300`}>
                    {cat.icon}
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${cat.badgeColor}`}>
                    {cat.badge}
                  </span>
                </div>

                {/* Texto */}
                <h4 className="text-lg font-bold text-on-surface mb-1.5 group-hover:text-primary transition-colors">
                  {cat.title}
                </h4>
                <p className="text-xs text-foreground-muted leading-relaxed">
                  {cat.subtitle}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // View: Escalas Clínicas
  if (activeView === 'scales') {
    return (
      <div className="max-w-6xl mx-auto pb-12 animate-fadeIn">
        <BackHeader title="Escalas Clínicas" subtitle="18 instrumentos validados organizados por domínio" />
        <Suspense fallback={<div className="p-8 text-center text-foreground-muted">Carregando escalas...</div>}>
          <ScalesExplorer patientId={patientId} />
        </Suspense>
      </div>
    );
  }

  // View: Rastreio Cognitivo
  if (activeView === 'cognitive') {
    return (
      <div className="max-w-6xl mx-auto pb-12 animate-fadeIn">
        <BackHeader title="Rastreio Cognitivo" subtitle="Paradigmas de atenção e memória de trabalho" />
        <Suspense fallback={<div className="p-8 text-center text-foreground-muted">Carregando testes cognitivos...</div>}>
          <CognitiveTasksPanel patientId={patientId} />
        </Suspense>
      </div>
    );
  }

  // View: Orientação Vocacional
  if (activeView === 'vocational') {
    return (
      <div className="max-w-6xl mx-auto pb-12 animate-fadeIn">
        <BackHeader title="Orientação Vocacional" subtitle="Perfil de interesses — Tipologia de Holland" />
        <Suspense fallback={<div className="p-8 text-center text-foreground-muted">Carregando RIASEC...</div>}>
          <VocationalPanel patientId={patientId} />
        </Suspense>
      </div>
    );
  }

  return null;
};

export default AssessmentsHub;
