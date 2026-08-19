import React, { useCallback, useMemo, useState } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    MarkerType,
    ReactFlowProvider,
    Node,
    Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useProfileOps } from '@/hooks/useProfileOps';
import { Patient } from '@/types';
import SphereNode from './SphereNode';
import BackgroundRingsNode from './BackgroundRingsNode';
import StressEdge from './StressEdge';
import { toPng } from 'html-to-image';
import { Save, Loader2, Zap, Heart, Users, Building, Wand2, Download, Trash2, Info, HelpCircle, X } from 'lucide-react';
import { generateBioecologicalMap } from '@/services/geminiService';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import Modal from '../../../Modal';
import ToolGuideButton from '../../../Tools/ToolGuideButton';
import { useDecoupledData } from '@/hooks/useDecoupledData';

interface SystemicMapTabProps {
    patient: Patient;
    onSave?: (data: { nodes: any[]; edges: any[]; viewport: { x: number; y: number; zoom: number } }) => Promise<void>;
    canEdit?: boolean;
}

const SystemicMapTabContent: React.FC<SystemicMapTabProps> = ({ patient, onSave, canEdit = true }) => {
    const { updatePatient } = useProfileOps();
    const saveSystemicMapOperation = async (id: string, map: any) => updatePatient(id, { systemicMap: map });
    const { addToast } = useToast();
    const confirm = useConfirm();
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
    const [isEdgeMenuOpen, setIsEdgeMenuOpen] = useState(false);
    const [edgeLabel, setEdgeLabel] = useState('');
    const [showLegend, setShowLegend] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);

    const { data: decoupledData } = useDecoupledData(patient.id, 'clinical_evolution');

    // Update local label state when selected edge changes
    React.useEffect(() => {
        if (selectedEdge) {
            setEdgeLabel((selectedEdge.label as string) || '');
        }
    }, [selectedEdge]);

    const handleDownloadMap = useCallback(() => {
        const viewport = document.querySelector('.react-flow__viewport') as HTMLElement;
        if (viewport) {
            toPng(viewport, { backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--surface') ? `hsl(${getComputedStyle(document.documentElement).getPropertyValue('--surface').trim()})` : '#f8fafc' })
                .then((dataUrl) => {
                    const link = document.createElement('a');
                    link.download = `ecomapa-${patient.name.replace(/\s+/g, '-').toLowerCase()}.png`;
                    link.href = dataUrl;
                    link.click();
                })
                .catch((err) => {
                    console.error('Failed to download map', err);
                });
        }
    }, [patient.name]);

    const handleClearMap = async () => {
        const isConfirmed = await confirm({
            title: "Limpar Mapa?",
            message: "Tem certeza que deseja limpar todo o mapa? Isso removerá todos os nós e conexões, mantendo apenas o paciente.",
            confirmText: "Sim, limpar"
        });
        if (isConfirmed) {
            setNodes((nds) => nds.filter(n => n.id === 'central' || n.id === 'bg-rings'));
            setEdges([]);
        }
    };

    // ... (after hooks)

    const handleEdgeUpdate = (action: 'conflict' | 'support' | 'neutral' | 'delete' | 'label') => {
        if (!selectedEdge) return;

        if (action === 'delete') {
            setEdges((eds) => eds.filter((e) => e.id !== selectedEdge.id));
            setIsEdgeMenuOpen(false);
            return;
        }

        if (action === 'label') {
            setEdges((eds) =>
                eds.map((e) => {
                    if (e.id !== selectedEdge.id) return e;
                    return {
                        ...e,
                        label: edgeLabel,
                        labelStyle: { fill: 'hsl(var(--foreground))', fontWeight: 700 },
                        labelBgStyle: { fill: 'hsl(var(--surface))', fillOpacity: 0.8 },
                    };
                })
            );
            setIsEdgeMenuOpen(false);
            return;
        }

        setEdges((eds) =>
            eds.map((e) => {
                if (e.id !== selectedEdge.id) return e;

                let type = 'default';
                let style = { stroke: 'hsl(var(--foreground-muted))', strokeWidth: 1 };
                let markerEnd = { type: MarkerType.ArrowClosed, color: 'hsl(var(--foreground-muted))' };
                let data = { ...e.data, type: action };

                if (action === 'conflict') {
                    type = 'stress';
                    style = { stroke: '#ef4444', strokeWidth: 2 };
                    markerEnd = { type: MarkerType.ArrowClosed, color: '#ef4444' };
                } else if (action === 'support') {
                    style = { stroke: '#22c55e', strokeWidth: 3 };
                    markerEnd = { type: MarkerType.ArrowClosed, color: '#22c55e' };
                }

                return { ...e, type, style, markerEnd, data };
            })
        );
        setIsEdgeMenuOpen(false);
    };

    // Initial State Setup
    const initialNodes: Node[] = patient.systemicMap?.nodes || [
        {
            id: 'bg-rings',
            type: 'background',
            position: { x: -750, y: -750 },
            data: { label: '' },
            draggable: false,
            selectable: false,
            zIndex: -10,
        },
        {
            id: 'central',
            type: 'sphere',
            position: { x: 0, y: 0 },
            data: { label: patient.name.split(' ')[0], type: 'patient' },
        },
    ];

    const initialEdges = (patient.systemicMap?.edges || []) as unknown as Edge[];

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // Register Custom Types
    const nodeTypes = useMemo(() => ({
        sphere: SphereNode,
        background: BackgroundRingsNode,
    }), []);

    const edgeTypes = useMemo(() => ({
        stress: StressEdge,
    }), []);

    const onConnect = useCallback(
        (params: Connection) => {
            // Default new manual connections to Neutral (Gray)
            const newEdge: Edge = {
                ...params,
                id: `e-${params.source}-${params.target}-${Date.now()}`,
                type: 'default',
                style: { stroke: 'hsl(var(--foreground-muted))', strokeWidth: 1 },
                markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--foreground-muted))' },
                data: { type: 'neutral' },
            };
            setEdges((eds) => addEdge(newEdge, eds));
        },
        [setEdges],
    );

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Find the current viewport if possible, or just save nodes/edges
            // Accessing viewport requires useReactFlow() hook or instance
            // For now, we save nodes and edges.
            const mapData = { nodes: nodes as any, edges: edges as any, viewport: { x: 0, y: 0, zoom: 1 } };

            if (onSave) {
                await onSave(mapData);
            } else {
                await saveSystemicMapOperation(patient.id, mapData);
            }
            // Toast is handled by hook (if using saveSystemicMapOperation) or parent
        } catch (error) {
            console.error('Failed to save map', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddSphere = (type: 'stressor' | 'resource' | 'family' | 'institution') => {
        const id = `node-${Date.now()}`;
        // Place randomly in Micro/Exo rings for manual add
        const angle = Math.random() * Math.PI * 2;
        const radius = 200 + Math.random() * 100; // Default to Micro/Exo boundary
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        const labels = {
            stressor: 'Estressor',
            resource: 'Recurso',
            family: 'Família',
            institution: 'Instituição',
        };

        const newNode: Node = {
            id,
            type: 'sphere',
            position: { x, y },
            data: { label: labels[type], type },
        };

        setNodes((nds) => [...nds, newNode]);
    };

    const handleAiGenerate = async () => {
        setIsGenerating(true);
        try {
            const sessions: any[] = decoupledData?.sessions || [];
            if (sessions.length === 0) {
                addToast("Não há sessões suficientes para gerar o mapa.", "warning");
                setIsGenerating(false);
                return;
            }

            const mapData = await generateBioecologicalMap(sessions);

            if (mapData && mapData.nodes) {
                const newNodes = mapData.nodes.map((n: any) => ({
                    ...n,
                    type: 'sphere',
                    data: { ...n.data, label: n.label }
                }));

                const newEdges = mapData.edges.map((e: any) => {
                    let type = 'default';
                    let style = { stroke: 'hsl(var(--foreground-muted))', strokeWidth: 1 };
                    let color = 'hsl(var(--foreground-muted))';
                    let markerStart: any = undefined;
                    let markerEnd: any = { type: MarkerType.ArrowClosed, color: 'hsl(var(--foreground-muted))' };

                    const reciprocity = e.data?.reciprocity || 'input';

                    if (e.data?.type === 'conflict') {
                        type = 'stress';
                        style = { stroke: '#ef4444', strokeWidth: 2 };
                        color = '#ef4444';
                    } else if (e.data?.type === 'support') {
                        style = { stroke: '#22c55e', strokeWidth: 3 };
                        color = '#22c55e';
                    }

                    if (reciprocity === 'mutual') {
                        markerStart = { type: MarkerType.ArrowClosed, color };
                        markerEnd = { type: MarkerType.ArrowClosed, color };
                    } else if (reciprocity === 'output') {
                        markerStart = undefined;
                        markerEnd = { type: MarkerType.ArrowClosed, color };
                    } else if (reciprocity === 'input') {
                        markerStart = { type: MarkerType.ArrowClosed, color };
                        markerEnd = undefined;
                    }

                    return {
                        ...e,
                        type,
                        style,
                        markerStart,
                        markerEnd,
                        data: e.data
                    };
                });

                setNodes([
                    {
                        id: 'bg-rings',
                        type: 'background',
                        position: { x: -750, y: -750 },
                        data: { label: '' },
                        draggable: false,
                        selectable: false,
                        zIndex: -10,
                    },
                    {
                        id: 'central',
                        type: 'sphere',
                        position: { x: 0, y: 0 },
                        data: { label: patient.name.split(' ')[0], type: 'patient' },
                    },
                    ...newNodes.filter((n: any) => n.id !== 'central')
                ]);
                setEdges(newEdges);
                addToast("Ecomapa importado a partir do histórico!", "success");
            } else {
                addToast("A IA não conseguiu identificar parentes suficientes nas sessões recentes.", "info");
            }
        } catch (e) {
            console.error("AI Gen Failed", e);
            addToast("Erro ao gerar mapa via IA. Verifique sua conexão ou a chave API.", "error");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="w-full h-[600px] md:h-[650px] min-h-[500px] relative bg-surface overflow-hidden rounded-xl border border-border flex flex-col shadow-sm">
            {/* Header Premium M3 */}
            <div className="p-4 border-b border-border/60 flex flex-col md:flex-row justify-between items-start md:items-center bg-surface/80 backdrop-blur-md z-20">
                <div>
                    <h3 className="font-bold text-lg text-on-surface flex items-center gap-2">
                        Ecomapa Bioecológico
                        <ToolGuideButton toolId="ecomap" />
                    </h3>
                    <p className="text-sm text-foreground-muted ">Mapeie as influências sistêmicas e ambientais do paciente.</p>
                </div>
            </div>

            <div className="flex-1 relative flex">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    fitView
                    minZoom={0.2}
                    maxZoom={1.5}
                    defaultViewport={{ x: 0, y: 0, zoom: 0.6 }}
                    attributionPosition="bottom-left"
                    onEdgeClick={(e, edge) => {
                        e.stopPropagation();
                        setSelectedEdge(edge);
                        setIsEdgeMenuOpen(true);
                    }}
                    onPaneClick={() => setIsEdgeMenuOpen(false)}
                >
                    <Background color="hsl(var(--foreground-muted) / 0.25)" gap={20} size={1.5} />
                    <Controls />
                </ReactFlow>

                {/* Toolbar */}
            {/* Toolbar - Only show if canEdit or at least hide edit actions */}
            {/* For now, we'll keep download/legend/help always visible, but hide edit actions if !canEdit */}
            <div className="absolute top-4 left-4 bg-surface/90 backdrop-blur p-2 rounded-lg shadow-lg border border-border flex flex-col gap-2">
                {canEdit && (
                    <>
                        <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-1 px-1">Adicionar</p>
                        <button onClick={() => handleAddSphere('stressor')} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl transition-colors">
                            <Zap size={14} /> Estressor
                        </button>
                        <button onClick={() => handleAddSphere('resource')} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-xl transition-colors">
                            <Heart size={14} /> Recurso
                        </button>
                        <button onClick={() => handleAddSphere('family')} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-xl transition-colors">
                            <Users size={14} /> Família
                        </button>
                        <button onClick={() => handleAddSphere('institution')} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20 hover:bg-sky-100 dark:hover:bg-sky-900/40 rounded-xl transition-colors">
                            <Building size={14} /> Instituição
                        </button>

                        <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />

                        <button
                            onClick={handleAiGenerate}
                            disabled={isGenerating}
                            className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-xl transition-colors border border-indigo-200 dark:border-indigo-700"
                        >
                            {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                            Gerar com IA
                        </button>

                        <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
                    </>
                )}

                <div className="flex gap-1">
                    <button onClick={handleDownloadMap} title="Baixar Imagem" className="flex items-center justify-center p-2 text-foreground-muted hover:text-foreground bg-surface hover:bg-background border border-border rounded-xl transition-colors shadow-sm">
                        <Download size={14} />
                    </button>
                    {canEdit && (
                        <button onClick={handleClearMap} title="Limpar Mapa" className="flex items-center justify-center p-2 text-red-600 hover:text-red-900 bg-surface hover:bg-red-50 border border-border rounded-xl transition-colors shadow-sm">
                            <Trash2 size={14} />
                        </button>
                    )}
                    <button onClick={() => setShowLegend(!showLegend)} title="Legenda" className={`flex items-center justify-center p-2 border border-border rounded-xl transition-colors shadow-sm ${showLegend ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-700' : ' bg-surface   text-foreground-muted  hover:bg-background'}`}>
                        <Info size={14} />
                    </button>
                    <button onClick={() => setIsHelpOpen(true)} title="Ajuda / Guia" className="flex items-center justify-center p-2 text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 bg-surface hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-border rounded-xl transition-colors shadow-sm">
                        <HelpCircle size={14} />
                    </button>
                </div>
            </div>

            {/* Educational Help Modal */}
            <Modal
                isOpen={isHelpOpen}
                onClose={() => setIsHelpOpen(false)}
                title="" // Silenciar título padrão para usar o cabeçalho customizado (estilo Nova Sessão)
                size="xl"
            >
                <div className="space-y-8 pb-4">
                    {/* Header Estilo "Nova Sessão" */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-blue-500/10 rounded-2xl">
                            <HelpCircle className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-foreground uppercase tracking-tight leading-tight">
                                Guia do Ecomapa Bioecológico
                            </h2>
                            <p className="text-[11px] font-bold text-foreground-muted uppercase tracking-widest opacity-60">
                                Teoria dos Sistemas de Bronfenbrenner
                            </p>
                        </div>
                    </div>

                    {/* Section A: Theory */}
                    <section>
                        <h3 className="text-base font-black text-foreground mb-4 border-l-4 border-indigo-500 pl-3 uppercase tracking-tight">
                            A. Entendendo a Teoria
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-surface p-5 rounded-3xl border border-border/40 shadow-sm transition-all hover:border-indigo-200">
                                <h4 className="font-bold text-[15px] text-foreground mb-2 flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-purple-500" /> O Paciente (Bio)
                                </h4>
                                <p className="text-sm text-foreground-muted leading-relaxed">
                                    No centro está o indivíduo com suas características biológicas, temperamento e história pessoal.
                                </p>
                            </div>
                            <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-5 rounded-3xl border border-indigo-100 dark:border-indigo-800 shadow-sm transition-all hover:border-indigo-300">
                                <h4 className="font-bold text-[15px] text-indigo-800 dark:text-indigo-300 mb-2 flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-blue-600" /> Microssistema
                                </h4>
                                <p className="text-sm text-indigo-700/80 dark:text-indigo-200/60 leading-relaxed">
                                    <strong className="text-indigo-900 dark:text-indigo-100">Relações Diretas:</strong> Ambientes onde o paciente participa ativamente (ex: Casa, Escola, Trabalho).
                                </p>
                            </div>
                            <div className="bg-sky-50/50 dark:bg-sky-900/10 p-5 rounded-3xl border border-sky-100 dark:border-sky-800 shadow-sm transition-all hover:border-sky-300">
                                <h4 className="font-bold text-[15px] text-sky-800 dark:text-sky-300 mb-2 flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-white border border-sky-300" /> Exossistema
                                </h4>
                                <p className="text-sm text-sky-700/80 dark:text-sky-200/60 leading-relaxed">
                                    <strong className="text-sky-900 dark:text-sky-100">Influência Indireta:</strong> Ambientes onde o paciente não está presente, mas que o afetam.
                                </p>
                            </div>
                            <div className="bg-surface p-5 rounded-3xl border border-border/40 shadow-sm transition-all hover:border-slate-300">
                                <h4 className="font-bold text-[15px] text-foreground mb-2 flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-slate-200 border border-border" /> Macrossistema
                                </h4>
                                <p className="text-sm text-foreground-muted leading-relaxed">
                                    O contexto maior: Cultura, Leis, Crises Econômicas e Valores da sociedade.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Section B: Controls & Usability */}
                    <section>
                        <h3 className="text-base font-black text-foreground mb-4 border-l-4 border-emerald-500 pl-3 uppercase tracking-tight">
                            B. Legenda e Comandos
                        </h3>

                        <div className="space-y-4">
                            <div className="flex flex-col gap-2">
                                <h4 className="font-bold text-[11px] uppercase tracking-widest text-foreground-muted mb-2">Tipos de Vínculo (Linhas)</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20">
                                        <div className="w-10 border-b-2 border-dashed border-red-500 flex justify-center"><Zap size={12} className="text-red-500 -mt-2" /></div>
                                        <div className="text-sm"><span className="font-bold text-red-700 dark:text-red-400">Conflito</span><br /><span className="text-xs opacity-70">Estresse, Tensão</span></div>
                                    </div>
                                    <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/20">
                                        <div className="w-10 h-1 bg-emerald-500 rounded-full"></div>
                                        <div className="text-sm"><span className="font-bold text-emerald-700 dark:text-emerald-400">Apoio</span><br /><span className="text-xs opacity-70">Recurso, Afeto</span></div>
                                    </div>
                                    <div className="flex items-center gap-3 p-4 bg-surface rounded-2xl border border-border/40">
                                        <div className="w-10 h-px bg-slate-400"></div>
                                        <div className="text-sm"><span className="font-bold text-foreground">Neutro</span><br /><span className="text-xs opacity-70">Informação apenas</span></div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-surface-container-low/50 p-6 rounded-[32px] border border-border/20">
                                <h4 className="font-bold text-[11px] uppercase tracking-widest text-foreground-muted mb-4">Como Usar</h4>
                                <ul className="text-sm text-foreground-muted space-y-3">
                                    <li className="flex items-start gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                        <span><strong className="text-foreground">Adicionar:</strong> Use os botões flutuantes no canto esquerdo.</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                        <span><strong className="text-foreground">Conectar:</strong> Arraste das bordas de um círculo até outro.</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                        <span><strong className="text-foreground">Editar:</strong> Clique em qualquer linha para abrir o menu rápido.</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                        <span><strong className="text-foreground">IA Mágica:</strong> O botão "Gerar com IA" analisa as sessões para você.</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <div className="pt-6 flex justify-center">
                        <button
                            onClick={() => setIsHelpOpen(false)}
                            className="w-full sm:w-auto px-12 py-4 bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-black text-sm uppercase tracking-widest rounded-3xl hover:opacity-90 transition-all shadow-xl hover:shadow-2xl active:scale-95"
                        >
                            ENTENDI, VAMOS COMEÇAR!
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Legend Panel */}
            {showLegend && (
                <div className="absolute top-4 right-4 bg-surface/95 backdrop-blur p-3 rounded-lg shadow-lg border border-border w-48 text-xs z-10 animate-in fade-in slide-in-from-top-2">
                    <h4 className="font-bold text-foreground-muted mb-2 border-b border-border pb-1">Legenda</h4>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-0.5 bg-emerald-500 rounded-full" style={{ height: 3 }} />
                        <span className=" text-foreground-muted ">Apoio / Recurso</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 border-b-2 border-dashed border-red-500 relative flex justify-center">
                            <Zap size={8} className="absolute -top-2 text-red-500 fill-red-500" />
                        </div>
                        <span className=" text-foreground-muted ">Conflito / Estresse</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-px bg-slate-400" />
                        <span className=" text-foreground-muted ">Neutro / Informação</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-4 h-px bg-slate-400 relative">
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 -mt-[3px] border-l-[4px] border-l-slate-400 border-y-[3px] border-y-transparent" />
                        </div>
                        <span className=" text-foreground-muted ">Influência (Input)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-px bg-slate-400 relative">
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 -mt-[3px] border-r-[4px] border-r-slate-400 border-y-[3px] border-y-transparent" />
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 -mt-[3px] border-l-[4px] border-l-slate-400 border-y-[3px] border-y-transparent" />
                        </div>
                        <span className=" text-foreground-muted ">Mútuo</span>
                    </div>
                </div>
            )}

            {/* Edge Editor Modal */}
            {isEdgeMenuOpen && selectedEdge && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface/95 backdrop-blur shadow-2xl rounded-xl border border-border p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <h3 className="text-sm font-semibold text-on-surface mb-3 border-b border-border pb-2">Editar Conexão</h3>

                    {/* Label Input */}
                    <div className="mb-3">
                        <label className="text-[10px] uppercase font-bold text-foreground-muted mb-1 block">Rótulo / Descrição</label>
                        <div className="flex gap-1">
                            <input
                                type="text"
                                value={edgeLabel}
                                onChange={(e) => setEdgeLabel(e.target.value)}
                                placeholder="Ex: Dependência, Distância..."
                                className="w-full text-xs px-2 py-1 border border-border rounded focus:border-indigo-500 focus:outline-none"
                            />
                            <button onClick={() => handleEdgeUpdate('label')} className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-xs font-bold">OK</button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 min-w-[180px]">
                        <button
                            onClick={() => handleEdgeUpdate('conflict')}
                            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl transition-colors"
                        >
                            <Zap size={14} /> Conflict / Stress
                        </button>
                        <button
                            onClick={() => handleEdgeUpdate('support')}
                            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-xl transition-colors"
                        >
                            <Heart size={14} /> Support / Resource
                        </button>
                        <button
                            onClick={() => handleEdgeUpdate('neutral')}
                            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-foreground-muted bg-surface hover:bg-background rounded-xl transition-colors"
                        >
                            <div className="w-3.5 h-3.5 rounded-full border border-border bg-background" /> Neutral
                        </button>
                        <div className="h-px bg-background my-1" />
                        <button
                            onClick={() => handleEdgeUpdate('delete')}
                            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-red-700 dark:hover:text-red-300 rounded-xl transition-colors"
                        >
                            Delete Edge
                        </button>
                    </div>
                    <button
                        onClick={() => setIsEdgeMenuOpen(false)}
                        className="absolute -top-2 -right-2 bg-background p-1 rounded-full text-foreground-muted hover:text-foreground hover:bg-background flex items-center justify-center w-6 h-6"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Save Button */}
            {canEdit && (
                <div className="absolute bottom-6 right-6">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-full shadow-xl hover:bg-slate-800 dark:hover:bg-slate-200 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        <span className="font-semibold text-sm">Salvar Mapa</span>
                    </button>
                </div>
            )}
            </div>
        </div>
    );
};

// Wrapper for Provider
const SystemicMapTab = (props: SystemicMapTabProps) => (
    <ReactFlowProvider>
        <SystemicMapTabContent {...props} />
    </ReactFlowProvider>
);

export default SystemicMapTab;
