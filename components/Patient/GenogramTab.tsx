import React, { useState, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  MarkerType,
  Handle,
  Position,
  NodeProps,
  ReactFlowProvider,
  Panel,
  BaseEdge,
  getSmoothStepPath,
  EdgeProps
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Button from '../Button';
import type { Patient, GenogramData } from '@/types';
import { generateUUID } from '@/utils/uuid';
import { useDecoupledData } from '@/hooks/useDecoupledData';
import { Loader2, Trash2, Wand2 } from 'lucide-react';
import { generateGenogramFromSessions } from '@/services/geminiService';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import ToolGuideButton from '../Tools/ToolGuideButton';

// --- Custom Nodes (Alta Fidelidade Clínica) ---

const MaleNode = ({ data, selected }: NodeProps) => {
  return (
    <div className={`w-12 h-12  bg-surface    border-2 rounded-none ${selected ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'border-foreground/70'} flex items-center justify-center relative transition-all`}>
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-slate-400" />
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-slate-400" />
      <Handle type="source" position={Position.Right} id="right" className="w-2 h-2 !bg-slate-400" />
      <Handle type="target" position={Position.Right} id="right" className="w-2 h-2 !bg-slate-400" />
      <Handle type="source" position={Position.Left} id="left" className="w-2 h-2 !bg-slate-400" />
      <Handle type="target" position={Position.Left} id="left" className="w-2 h-2 !bg-slate-400" />

      {Boolean(data.deceased) && (
        <svg className="absolute inset-0 w-full h-full text-on-surface opacity-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="0" y1="0" x2="24" y2="24" />
          <line x1="24" y1="0" x2="0" y2="24" />
        </svg>
      )}

      <div className="absolute -bottom-10 w-32 text-center pointer-events-none">
        <p className="text-xs font-bold text-on-surface truncate drop-shadow-sm">{String(data.label || '')}</p>
        {Boolean(data.age) && <p className="text-[10px] text-foreground-muted font-medium bg-surface/50 rounded-full px-1 inline-block mt-0.5">{String(data.age)} anos</p>}
      </div>
    </div>
  );
};

const FemaleNode = ({ data, selected }: NodeProps) => {
  return (
    <div className={`w-12 h-12 rounded-full  bg-surface    border-2 ${selected ? 'border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.5)]' : 'border-foreground/70'} flex items-center justify-center relative transition-all`}>
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-slate-400" />
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-slate-400" />
      <Handle type="source" position={Position.Right} id="right" className="w-2 h-2 !bg-slate-400" />
      <Handle type="target" position={Position.Right} id="right" className="w-2 h-2 !bg-slate-400" />
      <Handle type="source" position={Position.Left} id="left" className="w-2 h-2 !bg-slate-400" />
      <Handle type="target" position={Position.Left} id="left" className="w-2 h-2 !bg-slate-400" />

      {Boolean(data.deceased) && (
        <svg className="absolute inset-0 w-full h-full text-on-surface opacity-90 p-[2px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="4" y1="4" x2="20" y2="20" />
          <line x1="20" y1="4" x2="4" y2="20" />
        </svg>
      )}

      <div className="absolute -bottom-10 w-32 text-center pointer-events-none">
        <p className="text-xs font-bold text-on-surface truncate drop-shadow-sm">{String(data.label || '')}</p>
        {Boolean(data.age) && <p className="text-[10px] text-foreground-muted font-medium bg-surface/50 rounded-full px-1 inline-block mt-0.5">{String(data.age)} anos</p>}
      </div>
    </div>
  );
};

// --- Custom Edge (Marriage / Union) ---
const MarriageEdge = ({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd }: EdgeProps) => {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 8,
  });

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={{ ...style, strokeWidth: 2, strokeDasharray: '4 4' }} />
    </>
  );
};


const nodeTypes = { male: MaleNode, female: FemaleNode };
const edgeTypes = { marriage: MarriageEdge };

// --- Genogram Component ---

interface GenogramTabProps {
  patient: Patient;
  onSave: (data: GenogramData) => void;
  canEdit: boolean;
}

const GenogramTabContent: React.FC<GenogramTabProps> = ({ patient, onSave, canEdit }) => {
 const { addToast } = useToast();
  const confirm = useConfirm();

  const initialNodes: Node[] = (patient.genogramData?.nodes as unknown as Node[]) || [
    { id: '1', type: 'male', position: { x: 200, y: 100 }, data: { label: 'Pai', age: '' } },
    { id: '2', type: 'female', position: { x: 400, y: 100 }, data: { label: 'Mãe', age: '' } },
    {
      id: 'central',
      type: patient.name.endsWith('a') ? 'female' : 'male',
      position: { x: 300, y: 250 },
      data: { label: patient.name.split(' ')[0], age: '' }
    },
  ];

  const initialEdges: Edge[] = (patient.genogramData?.edges as unknown as Edge[]) || [
    { id: 'e1-2', source: '1', target: '2', sourceHandle: 'right', targetHandle: 'left', type: 'marriage', style: { stroke: 'hsl(var(--border))' } },
    { id: 'e1-central', source: '1', target: 'central', type: 'smoothstep', style: { stroke: 'hsl(var(--foreground-muted))' } },
    { id: 'e2-central', source: '2', target: 'central', type: 'smoothstep', style: { stroke: 'hsl(var(--foreground-muted))' } }
  ];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // States
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodeName, setNodeName] = useState('');
  const [nodeAge, setNodeAge] = useState('');
  const [isDeceased, setIsDeceased] = useState(false);

  const [isSaved, setIsSaved] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: decoupledData, isLoading: isLoadingDecoupled } = useDecoupledData(patient.id, 'summary');

  // Mark as unsaved on changes
  const markUnsaved = useCallback(() => {setIsSaved(false);}, []);

  const onConnect = useCallback((params: Connection) => {
    // Default to a smooth orthogonal step
    const isHorizontal = params.sourceHandle === 'right' || params.sourceHandle === 'left';

    const edgeType = isHorizontal ? 'marriage' : 'smoothstep';
    const strokeColor = isHorizontal ? 'hsl(var(--border))' : 'hsl(var(--foreground-muted))';

    setEdges((eds) => addEdge({
      ...params,
      type: edgeType,
      style: { stroke: strokeColor, strokeWidth: isHorizontal ? 2 : 1.5, strokeDasharray: isHorizontal ? '4 4' : 'none' }
    }, eds));
    markUnsaved();
  }, [setEdges]);

  // Handle Node Selection
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
    setNodeName(node.data.label as string);
    setNodeAge(node.data.age as string || '');
    setIsDeceased(node.data.deceased as boolean || false);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // Update Node Data
  const handleUpdateNode = () => {
    if (!selectedNodeId) return;
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNodeId) {
          return {
            ...node,
            data: { ...node.data, label: nodeName, age: nodeAge, deceased: isDeceased },
          };
        }
        return node;
      })
    );
    markUnsaved();
  };

  const handleAddNode = (type: 'male' | 'female') => {
    const id = generateUUID();
    const newNode: Node = {
      id,
      type,
      // Snap to nearby grid area
      position: { x: Math.floor((Math.random() * 400 + 100) / 20) * 20, y: Math.floor((Math.random() * 300 + 100) / 20) * 20 },
      data: { label: type === 'male' ? 'Homem' : 'Mulher', age: '' },
    };
    setNodes((nds) => [...nds, newNode]);
    markUnsaved();
  };

  const handleDeleteSelected = () => {
    if (selectedNodeId) {
      setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
      setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
      setSelectedNodeId(null);
      markUnsaved();
    }
  };

  // Change Edge Type (Relationship Styles)
  const handleEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setEdges((eds) => eds.map((e) => {
      if (e.id === edge.id) {
        let newStyle: React.CSSProperties = {};
        let newLabel = '';
        const currentStroke = e.style?.stroke as string;

        if (currentStroke !== 'red' && e.style?.strokeDasharray !== '5,5' && e.style?.strokeWidth !== 4) {
          // Normal -> Conflict
          newStyle = { stroke: 'red', strokeWidth: 2.5 };
          newLabel = 'Conflito';
        } else if (currentStroke === 'red') {
          // Conflict -> Distant
          newStyle = { stroke: 'hsl(var(--border))', strokeDasharray: '5,5', strokeWidth: 2 };
          newLabel = 'Distante';
        } else if (e.style?.strokeDasharray === '5,5') {
          // Distant -> Close (Thick)
          newStyle = { stroke: 'hsl(var(--foreground))', strokeWidth: 4 };
          newLabel = 'Próximo';
        } else {
          // Close -> Reset
          newStyle = { stroke: 'hsl(var(--foreground-muted))', strokeWidth: 1.5 };
          newLabel = '';
        }

        return { ...e, style: { ...e.style, ...newStyle }, label: newLabel, labelBgStyle: { fill: 'hsl(var(--surface))', fillOpacity: 0.9 } };
      }
      return e;
    }));
    markUnsaved();
  }, [setEdges]);

  const handleSave = () => {
    // Cast appropriately since we are sure about our data shape
    const data: GenogramData = {
      nodes: nodes as any,
      edges: edges as any,
    };
    onSave(data);
    setIsSaved(true);
  };

  const handleGenerateAI = async () => {
    if (isLoadingDecoupled) {
      addToast("Aguarde o carregamento do prontuário...", "warning");
      return;
    }
    const sessions = decoupledData?.sessions || [];
    if (sessions.length === 0) {
 addToast("O paciente não possui sessões registradas para analisar.", "warning");
      return;
    }

    const isConfirmed = await confirm({
      title: "Gerar Genograma Inteiro?",
      message: "A IA lerá o prontuário para redesenhar a árvore familiar. Isso substituirá as conexões atuais. Confirma?",
      confirmText: "Sim, Gerar Magicamente",
      cancelText: "Cancelar"
    });

    if (!isConfirmed) return;

    setIsGenerating(true);
    try {
      const result = await generateGenogramFromSessions(sessions);

      if (result && result.nodes && result.nodes.length > 0) {
        // Map the payload directly to the standard node/edge types
        const aiNodes: Node[] = result.nodes.map((n: any) => ({
          ...n,
          position: {
            x: n.position?.x || Math.random() * 500,
            y: n.position?.y || Math.random() * 500,
          }
        }));

        const aiEdges: Edge[] = result.edges.map((e: any) => ({
          ...e,
          type: e.type || 'smoothstep',
          style: { stroke: 'hsl(var(--foreground-muted))', strokeWidth: 1.5 }
        }));

        setNodes(aiNodes);
        setEdges(aiEdges);
 addToast("Estrutura familiar importada pelo Prontuário!", "success");
        markUnsaved();
      } else {
 addToast("A IA não conseguiu identificar parentes suficientes nas sessões recentes.", "info");
      }
    } catch (e) {
 addToast("Falha ao gerar genograma pela IA.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-[500px] md:h-[650px] w-full border border-border rounded-2xl bg-surface overflow-hidden flex flex-col shadow-sm relative">
      {/* Header Premium M3 */}
      <div className="p-4 border-b border-border/60 flex flex-col md:flex-row justify-between items-start md:items-center bg-surface/80 backdrop-blur-md z-20">
        <div>
          <h3 className="font-bold text-lg text-on-surface flex items-center gap-2">
            Genealogia e Genograma
            <ToolGuideButton toolId="genogram" />
          </h3>
          <p className="text-sm text-foreground-muted ">Desenhe mapas de relacionamento ou permita que a IA construa.</p>
        </div>
        <div className="flex flex-wrap gap-2 mt-3 md:mt-0 w-full md:w-auto">
          {canEdit && (
            <>
              {/* Premium AI Button */}
              <button
                onClick={handleGenerateAI}
                disabled={isGenerating}
                className="flex flex-1 md:flex-none justify-center items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-300 shadow-sm border
 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 
 dark:bg-indigo-900/40 dark:hover:bg-indigo-800/60 dark:text-indigo-200 dark:border-indigo-700/50"
              >
                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                <span className="md:inline">{isGenerating ? 'Analisando Histórico...' : 'Gerar com IA'}</span>
              </button>

              <div className="hidden md:block w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1 self-center" />

              <Button variant="secondary" size="sm" onClick={() => handleAddNode('male')} className="flex-1 md:flex-none !rounded-xl">
                <span className="hidden sm:inline">+ Homem</span><span className="sm:hidden">+H</span>
              </Button>
              <Button variant="secondary" size="sm" onClick={() => handleAddNode('female')} className="flex-1 md:flex-none !rounded-xl">
                <span className="hidden sm:inline">+ Mulher</span><span className="sm:hidden">+M</span>
              </Button>

              <Button onClick={handleSave} disabled={isSaved} size="sm" className="flex-1 md:flex-none !rounded-xl ml-2">
                {isSaved ? "Salvo" : "Salvar Mapa"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Editor XYFlow */}
      <div className="flex-1 relative flex">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeClick={handleEdgeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          snapToGrid={true}
          snapGrid={[20, 20]} // Ortotanal magnetic layout
          minZoom={0.3}
          maxZoom={1.5}
          className=" bg-surface "
        >
          <Background color="hsl(var(--foreground-muted) / 0.25)" gap={20} size={1.5} />
          <Controls className=" bg-surface/90 border-border shadow-md rounded-xl p-1" />

          {canEdit && (
            <Panel position="bottom-left" className=" bg-surface/90 p-3 rounded-xl shadow-lg backdrop-blur-md border border-border/60 pointer-events-none sm:pointer-events-auto">
              <p className="text-[11px] font-bold uppercase tracking-wider mb-2 text-foreground-muted ">Guia Rápido</p>
              <div className="text-[11px] space-y-2 text-foreground-muted font-medium">
                <div className="flex items-center"><div className="w-5 h-px bg-slate-500 mr-2"></div> Relação Normal</div>
                <div className="flex items-center"><div className="w-5 h-[2px] bg-red-500 mr-2"></div> Conflito</div>
                <div className="flex items-center"><div className="w-5 h-[2px] border-t-2 border-slate-400 border-dashed mr-2"></div> Distanciamento</div>
                <div className="flex items-center"><div className="w-5 h-[3px] bg-slate-800 dark:bg-slate-400 mr-2"></div> Fusionada / Próxima</div>
                <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
                <p className="text-[10px] text-foreground-muted font-normal italic leading-tight">
                  • Clique na linha para ciclar os estilos.<br />
                  • Conector lateral (handle) cria tracejado de União.
                </p>
              </div>
            </Panel>
          )}
        </ReactFlow>

        {/* Floating Node Properties Panel (Neuro-Minimalist) */}
        {selectedNodeId && canEdit && (
          <div className="absolute right-4 top-4 w-60 bg-surface/95 backdrop-blur-xl border border-border/60 p-5 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-right z-30">
            <h4 className="font-bold text-sm text-on-surface mb-4 border-b border-border pb-2">Detalhes do Parente</h4>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-foreground-muted mb-1">Nome e Grau</label>
                <input
                  type="text"
                  value={nodeName}
                  onChange={(e) => setNodeName(e.target.value)}
                  className="w-full text-sm rounded-xl border-border dark:bg-slate-700/50 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-foreground-muted mb-1">Idade</label>
                <input
                  type="number"
                  value={nodeAge}
                  onChange={(e) => setNodeAge(e.target.value)}
                  className="w-full text-sm rounded-xl border-border dark:bg-slate-700/50 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                />
              </div>
              <label className="flex items-center p-2 rounded-xl border border-border bg-surface cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors">
                <input
                  type="checkbox"
                  checked={isDeceased}
                  onChange={(e) => setIsDeceased(e.target.checked)}
                  className="rounded border-border text-indigo-600 focus:ring-indigo-500 w-4 h-4 ml-1"
                />
                <span className="ml-3 text-sm font-semibold text-foreground-muted border-l border-border pl-3">Marcar como Falecido</span>
              </label>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={handleUpdateNode}
                  className="w-full py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-bold text-sm hover:scale-[1.02] transition-transform"
                >
                  Concluir Edição
                </button>
                <button
                  onClick={handleDeleteSelected}
                  className="w-full py-2 flex items-center justify-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl font-semibold text-sm hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={14} /> Excluir Parente
                </button>
              </div>
            </div>

            <button
              onClick={() => setSelectedNodeId(null)}
              className="absolute -top-3 -right-3 bg-surface dark:bg-slate-700 border border-border p-1.5 rounded-full text-foreground-muted hover:text-slate-700 dark:hover:text-slate-200 shadow-sm"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Provider Wrapper
const GenogramTab = (props: GenogramTabProps) => (
  <ReactFlowProvider>
    <GenogramTabContent {...props} />
  </ReactFlowProvider>
);

export default GenogramTab;
