import React from 'react';
import type { Patient } from '@/types.ts';
import { ChartBarIcon, TagIcon, ThumbUpIcon } from '../Icons';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { usePatientAnalytics } from '@/hooks/usePatientAnalytics.ts';
import { supabase } from '@/services/supabaseClient';
import { format } from 'date-fns';
import { AreaChart, Area } from 'recharts';
import { SparklesIcon } from '../Icons';
import { SmilePlus, Smile, Meh, Frown, Angry, AlertCircle, Activity, Info, Calendar } from 'lucide-react';

interface ReportsDashboardProps {
  patient: Patient;
}

const CustomTooltip = React.memo(({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-surface p-2 shadow-sm">
        <p className="font-bold text-on-surface ">{label}</p>
        {payload.map((pld: any, index: number) => (
          <p key={index} style={{ color: pld.color }}>{`${pld.name}: ${pld.value}`}</p>
        ))}
      </div>
    );
  }
  return null;
});

const MoodTooltip = React.memo(({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className=" bg-surface p-3 border border-border rounded-xl shadow-lg">
        <p className="text-xs text-foreground-muted mb-1">{label}</p>
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center text-slate-600 dark:text-slate-300">{data.icon}</span>
          <div>
            <p className="font-bold text-on-surface capitalize">{data.emotion}</p>
            <p className="text-xs text-foreground-muted ">Intensidade: {data.intensity}/10</p>
          </div>
        </div>
      </div>
    );
  }
  return null;
});

const getIconForEmotion = (emotion: string) => {
  const map: Record<string, React.ReactNode> = {
    'Radical': <SmilePlus className="w-8 h-8" />,
    'Bem': <Smile className="w-8 h-8" />,
    'Mais ou menos': <Meh className="w-8 h-8" />,
    'Mal': <Frown className="w-8 h-8" />,
    'Horrível': <Frown className="w-8 h-8 opacity-80" />,
    'joy': <SmilePlus className="w-8 h-8" />,
    'sadness': <Frown className="w-8 h-8" />,
    'anxiety': <AlertCircle className="w-8 h-8" />,
    'anger': <Angry className="w-8 h-8" />,
    'neutral': <Meh className="w-8 h-8" />
  };
  return map[emotion] || <Meh className="w-8 h-8" />;
};

const ReportsDashboard: React.FC<ReportsDashboardProps> = ({ patient }) => {
  const { filters, setFilters, loading, data, status } = usePatientAnalytics(patient);
  const [moodData, setMoodData] = React.useState<any[]>([]);

  React.useEffect(() => {
    const fetchMoods = async () => {
      if (!patient) return;

      let query = supabase
        .from('thought_records')
        .select('created_at, intensity, emotion')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: true })
        .limit(30);

      if (filters.startDate) {
          query = query.gte('created_at', new Date(filters.startDate).toISOString());
      }
      if (filters.endDate) {
          const endDate = new Date(filters.endDate);
          endDate.setHours(23, 59, 59, 999);
          query = query.lte('created_at', endDate.toISOString());
      }

      const { data: records } = await query;

      if (records) {
        const formatted = records.map(r => ({
          date: format(new Date(r.created_at), 'dd/MM'),
          originalDate: r.created_at,
          intensity: r.intensity || 5, // Fallback
          emotion: r.emotion,
          icon: getIconForEmotion(r.emotion)
        }));
        setMoodData(formatted);
      }
    };
    fetchMoods();
  }, [patient, filters.startDate, filters.endDate]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const applyPreset = (days: number | null) => {
    if (days === null) {
        setFilters({ startDate: '', endDate: '' });
        return;
    }
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    
    setFilters({
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0]
    });
  };

  const presets = [
      { label: 'Tudo', days: null },
      { label: '30 Dias', days: 30 },
      { label: '3 Meses', days: 90 },
      { label: '6 Meses', days: 180 },
  ];

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center bg-surface rounded-xl border border-border">
          <svg className="animate-spin h-10 w-10 text-primary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm font-semibold text-foreground-muted animate-pulse">Compilando telemetria clínica...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Filtros Globais Modernizados */}
      <div className="bg-surface-container-lowest border border-border/40 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Presets (Quick Filters) */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2 md:pb-0">
            <span className="text-sm font-semibold text-foreground-muted mr-2 flex items-center gap-1.5"><Calendar className="w-4 h-4"/> Período:</span>
            {presets.map(preset => {
                // Simplistic active check (if dates match exactly or if both are empty for 'Tudo')
                const isActive = preset.days === null 
                    ? (!filters.startDate && !filters.endDate)
                    : false; // For exact match we'd need more complex logic, let's keep it simple or just use hover states

                return (
                    <button
                        key={preset.label}
                        onClick={() => applyPreset(preset.days)}
                        className={`
                            px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200
                            ${(!filters.startDate && !filters.endDate && preset.days === null)
                                ? 'bg-primary text-white shadow-md'
                                : 'bg-surface-container hover:bg-surface-container-highest text-foreground-muted hover:text-on-surface'
                            }
                        `}
                    >
                        {preset.label}
                    </button>
                )
            })}
        </div>

        {/* Custom Date Inputs */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <input 
                type="date" 
                name="startDate" 
                value={filters.startDate} 
                onChange={handleFilterChange} 
                className="block w-full pl-3 pr-2 py-1.5 rounded-xl border border-border bg-surface text-on-surface text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors cursor-pointer" 
                title="Data Inicial"
            />
          </div>
          <span className="text-foreground-muted text-sm font-medium">até</span>
          <div className="relative">
            <input 
                type="date" 
                name="endDate" 
                value={filters.endDate} 
                onChange={handleFilterChange} 
                className="block w-full pl-3 pr-2 py-1.5 rounded-xl border border-border bg-surface text-on-surface text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors cursor-pointer" 
                title="Data Final"
            />
          </div>
        </div>
      </div>

      {/* 2. Cinturão de Engajamento (Novidade) */}
      <div className="rounded-xl border border-border bg-surface p-4 sm:p-6 shadow-sm relative overflow-hidden group">
        <div className="flex items-center justify-between mb-6 relative z-10">
          <h3 className="text-xl font-bold text-on-surface flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            Engajamento com Ferramentas do Portal
          </h3>
          <span className="text-xs text-foreground-muted bg-background dark:bg-slate-700 px-3 py-1.5 rounded-full font-medium shadow-inner">Uso Ativo do Paciente</span>
        </div>

        {status.hasEngagement ? (
          <div style={{ width: '100%', height: 300 }} className="relative z-10">
            <ResponsiveContainer>
              <BarChart data={data.engagement} margin={{ top: 20, right: 20, left: -20, bottom: 5 }} barSize={50}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={CustomTooltip} cursor={{ fill: 'rgba(241, 245, 249, 0.4)' }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} name="Acessos/Registros">
                  {data.engagement.map((entry, index) => (
                    <div key={`cell-${index}`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-border p-12 text-center bg-surface flex flex-col items-center transition-colors">
            <Activity className="w-10 h-10 mb-4 text-slate-300 opacity-50" />
            <h4 className="mt-2 text-lg font-bold text-slate-500 ">Nenhum engajamento registrado</h4>
            <p className=" mt-1 text-sm text-foreground-muted max-w-sm">O paciente não utilizou as ferramentas de contenção ou registro do portal no período selecionado.</p>
          </div>
        )}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-500"></div>
      </div>

      {/* 3. Cinturão Sintomatológico: Variação de Humor */}
      <div className="rounded-xl border border-border bg-surface p-4 sm:p-6 shadow-sm relative overflow-hidden group">
        <div className="flex items-center justify-between mb-6 relative z-10">
          <h3 className="text-xl font-bold text-on-surface flex items-center gap-2">
            <SparklesIcon className="w-6 h-6 text-yellow-500" />
            Variação de Humor
          </h3>
          <span className="text-xs text-foreground-muted bg-background dark:bg-slate-700 px-3 py-1.5 rounded-full font-medium shadow-inner">Timeline Emocional</span>
        </div>

        {moodData.length > 0 ? (
          <div style={{ width: '100%', height: 300 }} className="relative z-10">
            <ResponsiveContainer>
              <AreaChart data={moodData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 10]} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<MoodTooltip />} cursor={{ stroke: '#f59e0b', strokeWidth: 2 }} />
                <Area
                  type="monotone"
                  dataKey="intensity"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorMood)"
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#f59e0b', stroke: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-border p-12 text-center bg-surface flex flex-col items-center">
            <Meh className="w-10 h-10 mb-4 text-slate-300 opacity-50" />
            <h4 className="mt-2 text-lg font-bold text-slate-500 ">Sem histórico</h4>
            <p className=" text-sm text-foreground-muted ">Nenhum registro de humor neste período.</p>
          </div>
        )}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-32 h-32 bg-yellow-400/5 rounded-full blur-3xl group-hover:bg-yellow-400/10 transition-all duration-500"></div>
      </div>

      {/* 4. Cinturão Clínico/Legado (Grid Inferior) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* Intervention Effectiveness Chart */}
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-6 shadow-sm flex flex-col">
          <div className="flex items-start justify-between mb-6">
             <h3 className="text-lg font-bold text-on-surface">Efetividade das Intervenções</h3>
             <div className="group relative">
                <Info className="w-4 h-4 text-slate-400 hover:text-primary transition-colors cursor-help" />
                <div className="absolute right-0 top-6 w-48 p-2 bg-slate-800 text-xs text-white rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                    Alimentado automaticamente via feedbacks lançados na aba de Plano Terapêutico.
                </div>
             </div>
          </div>
          
          {status.hasFeedback ? (
            <div style={{ width: '100%', height: 250 }} className="flex-1">
              <ResponsiveContainer>
                <BarChart data={data.interventionEffectiveness} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#94a3b8" />
                  <XAxis type="number" allowDecimals={false} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} width={80} />
                  <Tooltip content={CustomTooltip} cursor={{ fill: 'rgba(241, 245, 249, 0.2)' }} />
                  <Bar dataKey="Contagem" radius={[0, 4, 4, 0]}>
                    {data.interventionEffectiveness.map((entry, index) => (
                      <div key={`cell-${index}`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 text-center">
              <ThumbUpIcon className="h-8 w-8 text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-500">Sem feedbacks</p>
              <p className="text-xs text-foreground-muted mt-1 max-w-[200px]">Classifique o sucesso de intervenções no Plano Terapêutico.</p>
            </div>
          )}
        </div>

        {/* Session Frequency Chart */}
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-6 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-on-surface mb-6">Frequência de Sessões</h3>
          {status.hasEnoughSessions ? (
            <div style={{ width: '100%', height: 250 }} className="flex-1">
              <ResponsiveContainer>
                <LineChart data={data.sessionFrequency} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip content={CustomTooltip} />
                  <Line type="monotone" dataKey="Sessões" stroke="#64748b" strokeWidth={2.5} activeDot={{ r: 6, strokeWidth: 0, fill: '#64748b' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 text-center">
              <ChartBarIcon className="h-8 w-8 text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-500">Dados insuficientes</p>
              <p className="text-xs text-foreground-muted mt-1 max-w-[200px]">Necessário sessões em 2 meses distintos.</p>
            </div>
          )}
        </div>

        {/* Tag Frequency Chart (Span full width if odd number of charts, but we have 3 legacy charts. Let's make this span 2 cols on very large screens) */}
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-6 shadow-sm xl:col-span-2">
          <h3 className="text-lg font-bold text-on-surface mb-6">Frequência de Tags Clínicas</h3>
          {status.hasTags ? (
            <div style={{ width: '100%', height: 250 }}>
              <ResponsiveContainer>
                <BarChart data={data.tagFrequency} margin={{ top: 5, right: 20, left: -10, bottom: 20 }} barSize={30}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip content={CustomTooltip} cursor={{ fill: 'rgba(241, 245, 249, 0.2)' }} />
                  <Bar dataKey="Frequência" fill="#64748b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="rounded-lg border-2 border-dashed border-border p-8 text-center flex flex-col items-center">
              <TagIcon className="h-8 w-8 text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-500">Nenhuma tag clínica</p>
              <p className="text-xs text-foreground-muted mt-1">A IA gerará tags a partir dos resumos de suas sessões.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ReportsDashboard;
