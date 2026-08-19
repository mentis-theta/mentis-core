import React, { useState, Suspense } from 'react';
import ToolGuideButton from '../ToolGuideButton';
import { useInventories } from '@/hooks/useInventories';
import { useAssessmentStatus } from '@/hooks/useAssessmentStatus';
import { useAuth } from '@/contexts/AuthContext';
import { usePatientContext } from '@/contexts/PatientContext';
import { formatDate } from '@/utils/formatters';
import { getSeverity, getSeverityInterpretation, SCALES_MAP, type ScaleName } from '@/utils/assessmentScales';
import { exportToCSV } from '@/utils/exportPsychometrics';
import { generatePsychometricPDF } from '@/services/pdfService';
import { isClinicallyNotable } from '@/utils/domainScoring';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Plus, Send, AlertTriangle, ChevronDown, Download, TrendingDown, TrendingUp, Minus, Clock, CheckCircle2, XCircle, FileText } from 'lucide-react';

const SendAssessmentModal = React.lazy(() => import('@/components/Patient/Modals/SendAssessmentModal'));

interface InventoriesTabProps {
    patientId: string;
    initialScale?: string;
}

const SCALES = [
    { id: 'BDI', name: 'BDI (Depressão de Beck)' },
    { id: 'BAI', name: 'BAI (Ansiedade de Beck)' },
    { id: 'GAD-7', name: 'GAD-7 (Ansiedade Generalizada)' },
    { id: 'PHQ-9', name: 'PHQ-9 (Depressão)' },
    { id: 'DASS-21', name: 'DASS-21 (Humor/Ansiedade/Estresse)' },
    { id: 'PSS-10', name: 'PSS-10 (Estresse Percebido)' },
    { id: 'SPIN', name: 'SPIN (Fobia Social)' },
    { id: 'ISI', name: 'ISI (Insônia)' },
    { id: 'MSI-BPD', name: 'MSI-BPD (Triagem Borderline)' },
    { id: 'BPQ', name: 'BPQ (Borderline 80 itens)' },
    { id: 'ASSIST', name: 'ASSIST (Triagem Substâncias)' },
    { id: 'ASRS-18', name: 'ASRS-18 (TDAH Adultos)' },
    { id: 'MDQ', name: 'MDQ (Bipolaridade)' },
    { id: 'C-SSRS', name: 'C-SSRS (Risco Suicida)' },
    { id: 'CBI', name: 'CBI (Burnout)' },
    { id: 'AQ-10', name: 'AQ-10 (Autismo Adulto)' },
    { id: 'SNAP-IV', name: 'SNAP-IV (TDAH/TOD)' },
    { id: 'OCI-R', name: 'OCI-R (TOC)' },
    { id: 'PCL-5', name: 'PCL-5 (TEPT)' },
    { id: 'Pfeffer', name: 'Pfeffer (Declínio Funcional)' }
];

const SUPPORTED_ARRAY = ['GAD-7', 'PHQ-9', 'DASS-21', 'PSS-10', 'SPIN', 'ISI', 'MSI-BPD', 'BPQ', 'ASSIST', 'ASRS-18', 'MDQ', 'C-SSRS', 'CBI', 'AQ-10', 'SNAP-IV', 'OCI-R', 'PCL-5', 'Pfeffer'];

// Escalas categóricas: delta numérico não faz sentido clínico, mostrar só mudança de label
const CATEGORICAL_SCALES = ['C-SSRS', 'MDQ', 'ASRS-18', 'SNAP-IV', 'MSI-BPD'];
import { useDecoupledData } from '../../../hooks/useDecoupledData';

const InventoriesTab: React.FC<InventoriesTabProps> = ({ patientId, initialScale }) => {
    const { currentUser } = useAuth();
    const { patient } = usePatientContext();
    const { records, createInventoryLog, loading } = useInventories(patientId);
    const { links: assessmentLinks } = useAssessmentStatus(patientId);

    const [selectedScale, setSelectedScale] = useState(initialScale || SCALES[0].id);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
    const [newScore, setNewScore] = useState<number | ''>('');
    const [newNotes, setNewNotes] = useState('');
    const [newSessionId, setNewSessionId] = useState('');
    const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
    const [isLinksExpanded, setIsLinksExpanded] = useState(false);

    // Filtrar records pela escala selecionada
    const filteredRecords = records.filter(r => r.metadata.scaleName === selectedScale);

    const { data: decoupledData } = useDecoupledData(patientId, 'full_audit');

    // Sessões completadas para vincular
    const completedSessions = (decoupledData?.sessions || [])
        .filter((s: any) => s.status === 'completed')
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 20);

    // Preparar dados para o Recharts
    const chartData = filteredRecords.map(r => {
        const isSupportedScale = SUPPORTED_ARRAY.includes(selectedScale);
        const sev = isSupportedScale
            ? getSeverity(selectedScale as ScaleName, r.metadata.score, r.content.responses)
            : null;
        return {
            date: formatDate(r.date).substring(0, 5), // 'DD/MM'
            score: r.metadata.score,
            fullDate: formatDate(r.date),
            notes: r.content.notes,
            severity: r.metadata.severity || sev?.label || '',
            severityColor: sev?.color || '#6366f1',
            sessionId: r.metadata.session_id || null,
            source: r.metadata.source || 'manual',
        };
    });

    // Detectar alerta clínico: PHQ-9 com Pergunta 9 > 0 (ideação suicida)
    const criticalRecords = filteredRecords.filter(r =>
        r.metadata.scaleName === 'PHQ-9' && r.metadata.critical_item_flagged
    );
    const hasCriticalAlert = criticalRecords.length > 0;
    const latestCritical = hasCriticalAlert ? criticalRecords[0] : null;

    const handleSaveLog = async () => {
        if (!currentUser || newScore === '') return;

        const isSupportedScale = SUPPORTED_ARRAY.includes(selectedScale);
        const severity = isSupportedScale
            ? getSeverity(selectedScale as ScaleName, Number(newScore)).label
            : undefined;

        const success = await createInventoryLog(patientId, currentUser.id, {
            scaleName: selectedScale,
            score: Number(newScore),
            notes: newNotes,
            severity,
            session_id: newSessionId || undefined,
        });

        if (success) {
            setIsAddModalOpen(false);
            setNewScore('');
            setNewNotes('');
            setNewSessionId('');
        }
    };

    // Custom Tooltip
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-slate-900 rounded-xl border border-slate-700 p-3 shadow-xl text-sm">
                    <p className="text-slate-400 text-xs mb-1">{data.fullDate}</p>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-bold text-lg">{data.score}</span>
                        {data.severity && (
                            <span
                                className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                                style={{ backgroundColor: data.severityColor }}
                            >
                                {data.severity}
                            </span>
                        )}
                    </div>
                    {data.source === 'patient_self_report' && (
                        <p className="text-indigo-300 text-[10px] font-bold">📋 Preenchido pelo paciente</p>
                    )}
                    {data.sessionId && (
                        <p className="text-blue-300 text-[10px] font-bold mt-0.5">📎 Vinculado a sessão</p>
                    )}
                    {data.notes && <p className="text-slate-400 text-xs mt-1 italic">{data.notes}</p>}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-fadeIn">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-border pb-4 mb-6 gap-4">
                <div>
                    <h3 className="text-xl font-bold text-on-surface flex items-center gap-2">
                        <Activity className="h-6 w-6 text-indigo-500" />
                        Psicometria
                        <ToolGuideButton toolId="inventories" />
                    </h3>
                    <p className="text-sm text-foreground-muted mt-1">
                        Acompanhamento quantitativo de sintomas.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <select
                        value={selectedScale}
                        onChange={(e) => setSelectedScale(e.target.value)}
                        className=" bg-surface border border-border text-on-surface rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500 shadow-sm"
                    >
                        {SCALES.map(scale => (
                            <option key={scale.id} value={scale.id}>{scale.name}</option>
                        ))}
                    </select>

                    <Button onClick={() => setIsAddModalOpen(true)} className="!rounded-xl shadow-sm" variant="primary">
                        <Plus size={16} className="mr-2" /> Nova Aferição
                    </Button>

                    {SUPPORTED_ARRAY.includes(selectedScale) && (
                        <Button
                            onClick={() => setIsAssessmentModalOpen(true)}
                            className="!rounded-xl shadow-sm !bg-indigo-600 hover:!bg-indigo-700 !text-white"
                            variant="primary"
                        >
                            <Send size={16} className="mr-2" /> Enviar Avaliação
                        </Button>
                    )}

                    {filteredRecords.length > 0 && (
                        <Button
                            onClick={() => exportToCSV(filteredRecords, selectedScale, patient?.name || 'Paciente')}
                            variant="ghost"
                            className="hidden sm:flex !rounded-xl shadow-sm"
                            title="Exportar histórico como CSV"
                        >
                            <Download size={16} className="mr-2" /> Exportar
                        </Button>
                    )}
                </div>
            </div>

            {/* Painel de Avaliações Enviadas */}
            {assessmentLinks.length > 0 && (
                <div className="bg-surface border border-border/60 rounded-2xl shadow-sm overflow-hidden">
                    <button
                        type="button"
                        onClick={() => setIsLinksExpanded(!isLinksExpanded)}
                        className="w-full flex items-center justify-between px-5 py-3 hover:bg-surface-container-high transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <Send size={14} className="text-indigo-500" />
                            <span className="text-xs font-bold text-on-surface">Avaliações Enviadas</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300">
                                {assessmentLinks.length}
                            </span>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-foreground-muted transition-transform duration-200 ${isLinksExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    {isLinksExpanded && (
                        <div className="px-4 pb-4 space-y-2 animate-fadeIn">
                            {assessmentLinks.map(link => {
                                const timeAgo = (() => {
                                    const diff = Date.now() - new Date(link.created_at).getTime();
                                    const mins = Math.floor(diff / 60000);
                                    if (mins < 60) return `há ${mins}min`;
                                    const hours = Math.floor(mins / 60);
                                    if (hours < 24) return `há ${hours}h`;
                                    const days = Math.floor(hours / 24);
                                    return `há ${days}d`;
                                })();

                                return (
                                    <div key={link.id} className="flex items-center gap-3 p-3 rounded-xl bg-background">
                                        <span className="text-xs font-bold text-on-surface w-20 shrink-0">{link.scale_name}</span>
                                        <span className="text-[10px] text-foreground-muted">{timeAgo}</span>
                                        <div className="flex-1" />
                                        {link.status === 'pending' && (
                                            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                                                <Clock size={10} /> Pendente
                                            </span>
                                        )}
                                        {link.status === 'completed' && (
                                            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                                                <CheckCircle2 size={10} /> Score: {link.score} — {link.severity}
                                            </span>
                                        )}
                                        {link.status === 'expired' && (
                                            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                                <XCircle size={10} /> Expirado
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Card de Comparação / Delta */}
            {filteredRecords.length > 0 && (() => {
                const lastRecord = filteredRecords[filteredRecords.length - 1];
                const prevRecord = filteredRecords.length > 1 ? filteredRecords[filteredRecords.length - 2] : null;
                const lastScore = lastRecord.metadata.score;
                const prevScore = prevRecord?.metadata.score;
                const delta = prevScore !== undefined ? lastScore - prevScore : null;
                const isCategorical = CATEGORICAL_SCALES.includes(selectedScale);
                const isSupportedScale = SUPPORTED_ARRAY.includes(selectedScale);
                const lastSev = isSupportedScale
                    ? getSeverity(selectedScale as ScaleName, lastScore, lastRecord.content?.responses)
                    : null;
                const prevSev = prevRecord && isSupportedScale
                    ? getSeverity(selectedScale as ScaleName, prevScore!, prevRecord.content?.responses)
                    : null;

                return (
                    <div className="bg-surface border border-border/60 rounded-3xl p-5 shadow-sm">
                        <div className="grid grid-cols-3 gap-4">
                            {/* Último Score */}
                            <div className="text-center">
                                <p className="text-[10px] uppercase tracking-wider font-bold text-foreground-muted mb-1">Último</p>
                                <p className="text-3xl font-black text-on-surface">{lastScore}</p>
                                {lastSev && (
                                    <span
                                        className="inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                                        style={{ backgroundColor: lastSev.color }}
                                    >
                                        {lastRecord.metadata.severity || lastSev.label}
                                    </span>
                                )}
                            </div>

                            {/* Variação */}
                            <div className="text-center">
                                <p className="text-[10px] uppercase tracking-wider font-bold text-foreground-muted mb-1">Variação</p>
                                {delta !== null ? (
                                    isCategorical ? (
                                        <div className="flex flex-col items-center gap-1">
                                            {prevSev && lastSev && prevSev.label !== lastSev.label ? (
                                                <>
                                                    <span className="text-xs text-foreground-muted line-through">{prevSev.label}</span>
                                                    <span className="text-sm font-bold" style={{ color: lastSev.color }}>
                                                        → {lastSev.label}
                                                    </span>
                                                </>
                                            ) : (
                                                <div className="flex items-center gap-1 text-slate-400">
                                                    <Minus size={16} />
                                                    <span className="text-sm font-bold">Estável</span>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <div className={`flex items-center gap-1 ${
                                                delta < 0 ? 'text-emerald-600' : delta > 0 ? 'text-red-500' : 'text-slate-400'
                                            }`}>
                                                {delta < 0 ? <TrendingDown size={18} /> : delta > 0 ? <TrendingUp size={18} /> : <Minus size={18} />}
                                                <span className="text-xl font-black">
                                                    {delta > 0 ? '+' : ''}{delta}
                                                </span>
                                            </div>
                                            <p className={`text-[10px] font-bold mt-0.5 ${
                                                delta < 0 ? 'text-emerald-600' : delta > 0 ? 'text-red-500' : 'text-slate-400'
                                            }`}>
                                                {delta < 0 ? 'Melhora' : delta > 0 ? 'Piora' : 'Estável'}
                                            </p>
                                        </div>
                                    )
                                ) : (
                                    <div className="flex flex-col items-center text-slate-400">
                                        <Minus size={18} />
                                        <p className="text-[10px] font-medium mt-0.5">Primeira aferição</p>
                                    </div>
                                )}
                            </div>

                            {/* Total de Aferições */}
                            <div className="text-center">
                                <p className="text-[10px] uppercase tracking-wider font-bold text-foreground-muted mb-1">Aferições</p>
                                <p className="text-3xl font-black text-on-surface">{filteredRecords.length}</p>
                                <p className="text-[10px] text-foreground-muted mt-1">registros</p>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Banner de Alerta Clínico: PHQ-9 Q9 */}
            {hasCriticalAlert && selectedScale === 'PHQ-9' && (
                <div className="bg-red-50 dark:bg-red-950/30 border-2 border-red-300 dark:border-red-800 rounded-2xl p-4 flex items-start gap-4 animate-fadeIn">
                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900/50 rounded-xl flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-red-800 dark:text-red-300">Atenção Clínica — Ideação Suicida</p>
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1 leading-relaxed">
                            Paciente pontuou <strong>{latestCritical?.metadata.critical_item_value}</strong> na Pergunta 9
                            {' '}(<em>"Pensar em se machucar ou que seria melhor estar morto(a)"</em>)
                            {' '}em {formatDate(latestCritical?.date || '')}.
                            Score total pode estar leve/moderado, mas este item exige atenção prioritária.
                        </p>
                    </div>
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-red-600 text-white shrink-0 animate-pulse">
                        RISCO
                    </span>
                </div>
            )}

            {/* Gráfico Evolutivo (A Killer View) */}
            <div className=" bg-surface border border-border/60 rounded-3xl p-6 md:p-8 shadow-sm overflow-hidden relative">
                <h4 className="font-bold text-foreground-muted mb-6 flex items-center justify-between">
                    <span>Evolução: {selectedScale}</span>
                    <span className="text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full">{filteredRecords.length} Registros</span>
                </h4>

                <div className="h-[300px] w-full">
                    {loading ? (
                        <div className="w-full h-full flex justify-center items-center text-foreground-muted ">Carregando métricas...</div>
                    ) : chartData.length === 0 ? (
                        <div className="w-full h-full flex flex-col justify-center items-center text-foreground-muted border-2 border-dashed border-border rounded-2xl">
                            <Activity size={32} className="mb-2 opacity-30" />
                            <p>Nenhuma pontuação registrada para {selectedScale}.</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Line
                                    type="monotone"
                                    dataKey="score"
                                    name="Score"
                                    stroke="#6366f1"
                                    strokeWidth={4}
                                    dot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                                    activeDot={{ r: 8, strokeWidth: 0, fill: '#818cf8' }}
                                    animationDuration={1500}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Registros List (com badges e expansão) */}
            {filteredRecords.length > 0 && (
                <div className="bg-surface border border-border/60 rounded-3xl p-6 shadow-sm">
                    <h4 className="font-bold text-foreground-muted mb-4">Histórico</h4>
                    <div className="space-y-2">
                        {[...filteredRecords].reverse().map(record => {
                            const isSupportedScale = SUPPORTED_ARRAY.includes(selectedScale);
                            const responses: number[] | undefined = record.content.responses;
                            const sev = isSupportedScale
                                ? getSeverity(selectedScale as ScaleName, record.metadata.score, responses)
                                : null;
                            const scaleData = SCALES_MAP[selectedScale as ScaleName];
                            
                            const isExpanded = expandedRecordId === record.id;
                            
                            const interp = isSupportedScale
                                ? getSeverityInterpretation(selectedScale as ScaleName, record.metadata.score, responses)
                                : null;

                            return (
                                <div key={record.id} className="rounded-xl overflow-hidden transition-all duration-300">
                                    {/* Row principal — clicável */}
                                    <button
                                        type="button"
                                        onClick={() => setExpandedRecordId(isExpanded ? null : record.id)}
                                        className={`w-full flex items-center gap-4 p-3 rounded-xl transition-colors text-left ${isExpanded ? 'bg-surface-container-high' : 'hover:bg-surface-container-high'}`}
                                    >
                                        <span className="text-sm text-foreground-muted font-medium w-20 shrink-0">{formatDate(record.date).substring(0, 5)}</span>
                                        <span className="text-lg font-black text-on-surface w-10">{record.metadata.score}</span>
                                        {sev && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white shrink-0" style={{ backgroundColor: sev.color }}>
                                                {record.metadata.severity || sev.label}
                                            </span>
                                        )}
                                        {record.metadata.source === 'patient_self_report' && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300 shrink-0">
                                                📋 Paciente
                                            </span>
                                        )}
                                        {record.metadata.session_id && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 shrink-0">
                                                📎 Sessão
                                            </span>
                                        )}
                                        {record.metadata.critical_item_flagged && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 shrink-0 flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" /> Risco Q9
                                            </span>
                                        )}

                                        {/* Mini dots de domínio (preview) */}
                                        {responses && scaleData && !isExpanded && (
                                            <div className="flex items-center gap-1 ml-auto shrink-0">
                                                {responses.map((val, idx) => {
                                                    const isMDQ = selectedScale === 'MDQ';
                                                    const isColumbia = selectedScale === 'C-SSRS';
                                                    
                                                    let dotColor = '#e2e8f0';
                                                    if (val === null || val === undefined) {
                                                        dotColor = 'transparent';
                                                    } else if (isColumbia || isMDQ) {
                                                        // 0 = Não (Verde), 1 = Sim (Vermelho) ... Mas MDQ a Q15 tem 0,1,2,3
                                                        if (val === 0) dotColor = '#22c55e';
                                                        else if (val === 1) dotColor = '#ef4444';
                                                        else dotColor = '#f97316'; // MDQ Q15
                                                    } else {
                                                        const colors = ['#22c55e', '#eab308', '#f97316', '#ef4444', '#b91c1c'];
                                                        dotColor = colors[val] || colors[colors.length-1];
                                                    }
                                                    
                                                    if (val === null) return null; // Não mostra dot para perguntas puladas

                                                    return (
                                                        <div
                                                            key={idx}
                                                            className="w-2.5 h-2.5 rounded-full transition-all"
                                                            style={{ backgroundColor: dotColor }}
                                                            title={`${scaleData.questions[idx]?.domain}: ${val}`}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Chevron */}
                                        <ChevronDown className={`w-4 h-4 text-foreground-muted shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                    </button>

                                    {/* Painel expandido */}
                                    {isExpanded && (
                                        <div className="px-4 pb-4 pt-2 space-y-4 animate-fadeIn">

                                            {/* Header do Expandido: Interpretação & Ações */}
                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                                {interp && (
                                                    <div className="flex-1 rounded-xl p-4 border-l-4" style={{ borderColor: interp.color, backgroundColor: `${interp.color}08` }}>
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: interp.color }}>
                                                                {interp.label}
                                                            </span>
                                                            <span className="text-xs font-bold text-foreground-muted">— Interpretação Clínica</span>
                                                        </div>
                                                        <p className="text-sm text-on-surface leading-relaxed">{interp.interpretation}</p>
                                                        <div className="mt-3 pt-3 border-t border-border/40">
                                                            <p className="text-xs font-bold text-foreground-muted mb-1">💡 Recomendação</p>
                                                            <p className="text-xs text-foreground-muted leading-relaxed">{interp.recommendation}</p>
                                                        </div>
                                                    </div>
                                                )}

                                                <Button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        generatePsychometricPDF(record, patient?.name || 'Paciente', scaleData!);
                                                    }}
                                                    variant="secondary"
                                                    size="sm"
                                                    className="shrink-0 flex items-center gap-2 !rounded-xl !bg-surface text-indigo-600 border-indigo-200 hover:border-indigo-400 dark:border-indigo-800 dark:text-indigo-400"
                                                >
                                                    <FileText size={16} /> Folha de Respostas
                                                </Button>
                                            </div>

                                            {/* Análise de Respostas (Item a Item com Highlight Ético) */}
                                            {responses && scaleData && (
                                                <div className="mt-6">
                                                    <p className="text-xs font-bold text-foreground-muted mb-3">Análise de Respostas (Matriz Completa)</p>
                                                    <div className="space-y-2">
                                                        {scaleData.questions.map((q, idx) => {
                                                            const val = responses[idx];
                                                            
                                                            if (val === null || val === undefined) {
                                                                // Pergunta não respondida / Pulada
                                                                return (
                                                                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl p-3 bg-slate-50 border border-slate-100 dark:bg-slate-900/50 dark:border-slate-800/50 opacity-60">
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{q.domain}</span>
                                                                            <span className="text-xs font-medium text-slate-500">{q.index + 1}. {q.text}</span>
                                                                        </div>
                                                                        <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-200 text-slate-500 shrink-0 text-center">Não Aplicável / N/A</span>
                                                                    </div>
                                                                );
                                                            }
                                                            
                                                            const isMDQ = selectedScale === 'MDQ';
                                                            const isColumbia = selectedScale === 'C-SSRS';
                                                            const isCBI = selectedScale === 'CBI';
                                                            const isNotable = isClinicallyNotable(selectedScale as ScaleName, idx, val);
                                                            const isCritical = selectedScale === 'PHQ-9' && idx === 8 && val > 0;
                                                            
                                                            let pillColor = '#e2e8f0'; // Default gray/slate
                                                            let textColor = '#64748b';
                                                            let labelText = '';
                                                            
                                                            // Calcular cor apenas se for notável (Highlight ético)
                                                            if (isNotable) {
                                                                if (isCBI) {
                                                                    const colors = ['#22c55e', '#eab308', '#f97316', '#ef4444', '#b91c1c'];
                                                                    const colorIdx = Math.floor(val / 25);
                                                                    pillColor = colors[colorIdx] || '#ef4444';
                                                                } else if (isColumbia || isMDQ) {
                                                                    const options = q.answerOptions || scaleData.answerOptions;
                                                                    if (options.length === 2) {
                                                                        pillColor = val === 1 ? '#ef4444' : '#22c55e';
                                                                    } else {
                                                                        const colors = ['#22c55e', '#eab308', '#f97316', '#ef4444'];
                                                                        pillColor = colors[val] || '#f97316';
                                                                    }
                                                                } else {
                                                                    const colors = ['#22c55e', '#eab308', '#f97316', '#ef4444', '#b91c1c'];
                                                                    pillColor = colors[val] || colors[colors.length-1];
                                                                }
                                                                textColor = '#ffffff'; // Texto branco em fundo colorido
                                                            } else {
                                                                // Não notável: esmaecido
                                                                pillColor = 'var(--surface-container-high)'; // Usa variável CSS padrão
                                                                textColor = 'var(--foreground-muted)';
                                                            }
                                                            
                                                            // Determinar Label Text
                                                            if (isCBI) {
                                                                const options = q.answerOptions || scaleData.answerOptions;
                                                                labelText = options.find((o: any) => o.value === val)?.label || `${val}%`;
                                                            } else {
                                                                const options = q.answerOptions || scaleData.answerOptions;
                                                                labelText = options.find((o: any) => o.value === val)?.label || String(val);
                                                            }

                                                            // Container Styling
                                                            const containerClass = isCritical 
                                                                ? "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800"
                                                                : isNotable
                                                                    ? "bg-surface border border-border"
                                                                    : "bg-surface border border-border/40 opacity-70";

                                                            return (
                                                                <div
                                                                    key={idx}
                                                                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl p-3 transition-colors ${containerClass}`}
                                                                >
                                                                    <div className="flex flex-col flex-1 pr-4">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isNotable ? 'text-indigo-500' : 'text-slate-400'}`}>
                                                                                {q.domain}
                                                                            </span>
                                                                            {isCritical && (
                                                                                <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full dark:bg-red-900/30 dark:text-red-400">
                                                                                    <AlertTriangle className="w-3 h-3" /> Atenção
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <span className={`text-sm ${isNotable ? 'font-medium text-on-surface' : 'text-foreground-muted'}`}>
                                                                            {q.index + 1}. {q.text}
                                                                        </span>
                                                                    </div>
                                                                    
                                                                    <div className="shrink-0 flex sm:justify-end">
                                                                        <span 
                                                                            className={`text-[11px] font-bold px-3 py-1.5 rounded-lg text-center min-w-[120px] shadow-sm ${!isNotable ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700" : ""}`}
                                                                            style={{ 
                                                                                backgroundColor: isNotable ? pillColor : undefined,
                                                                                color: isNotable ? textColor : undefined 
                                                                            }}
                                                                        >
                                                                            {labelText}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Notas */}
                                            {record.content.notes && (
                                                <div className="text-xs text-foreground-muted italic bg-background rounded-lg p-3">
                                                    📝 {record.content.notes}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Modal de Inserção */}
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={`Registrar Inventário: ${selectedScale}`}>
                <div className="space-y-4 pt-2">
                    <div>
                        <label className="block text-sm font-semibold text-foreground-muted mb-1">Pontuação Final (Score)</label>
                        <input
                            type="number"
                            min="0"
                            value={newScore}
                            onChange={(e) => setNewScore(e.target.value ? Number(e.target.value) : '')}
                            placeholder="Ex: 14"
                            className="w-full text-lg px-4 py-3 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-indigo-500"
                        />
                        {/* Preview de severidade */}
                        {newScore !== '' && SUPPORTED_ARRAY.includes(selectedScale) && (
                            <div className="mt-2 flex items-center gap-2">
                                <span className="text-xs text-foreground-muted">Classificação:</span>
                                {(() => {
                                    const sev = getSeverity(selectedScale as ScaleName, Number(newScore));
                                    return (
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: sev.color }}>
                                            {sev.label}
                                        </span>
                                    );
                                })()}
                            </div>
                        )}
                    </div>

                    {/* Vincular a sessão */}
                    <div>
                        <label className="block text-sm font-semibold text-foreground-muted mb-1">
                            Vincular a sessão <span className="font-normal text-xs">(opcional)</span>
                        </label>
                        <select
                            value={newSessionId}
                            onChange={(e) => setNewSessionId(e.target.value)}
                            className="w-full bg-surface border border-border text-on-surface rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">Nenhuma</option>
                            {completedSessions.map(s => (
                                <option key={s.id} value={s.id}>
                                    Sessão {new Date(s.date).toLocaleDateString('pt-BR')} — {new Date(s.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-foreground-muted mb-1">Notas Clínicas (Opcional)</label>
                        <textarea
                            value={newNotes}
                            onChange={(e) => setNewNotes(e.target.value)}
                            placeholder="Sintoma predominante ou queixa..."
                            className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-indigo-500 h-24 resize-none"
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>Cancelar</Button>
                        <Button variant="primary" onClick={handleSaveLog} disabled={newScore === ''}>Salvar Registro</Button>
                    </div>
                </div>
            </Modal>

            {/* Assessment Link Modal */}
            {isAssessmentModalOpen && (
                <Suspense fallback={null}>
                    <SendAssessmentModal
                        isOpen={isAssessmentModalOpen}
                        onClose={() => setIsAssessmentModalOpen(false)}
                    />
                </Suspense>
            )}
        </div>
    );
};

export default InventoriesTab;
