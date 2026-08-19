import React, { useState } from 'react';
import ToolGuideButton from '../ToolGuideButton';
import { useACTMatrix } from '@/hooks/useACTMatrix';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import { Target, AlertTriangle, EyeOff, CheckCircle2, Plus, X } from 'lucide-react';

interface ACTMatrixTabProps {
    patientId: string;
}

type QuadrantType = 'avoidance' | 'committedAction' | 'hooks' | 'values';

const ACTMatrixTab: React.FC<ACTMatrixTabProps> = ({ patientId }) => {
    const { currentUser } = useAuth();
    const { activeMatrix, saveACTMatrix, loading } = useACTMatrix(patientId);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeQuadrant, setActiveQuadrant] = useState<QuadrantType | null>(null);
    const [newItemText, setNewItemText] = useState('');

    const currentMatrix = activeMatrix?.content || {
        avoidance: [],
        committedAction: [],
        hooks: [],
        values: []
    };

    const handleOpenAdd = (quadrant: QuadrantType) => {
        setActiveQuadrant(quadrant);
        setNewItemText('');
        setIsModalOpen(true);
    };

    const handleSaveItem = async () => {
        if (!currentUser || !activeQuadrant || !newItemText.trim()) return;

        const newContent = {
            ...currentMatrix,
            [activeQuadrant]: [...currentMatrix[activeQuadrant], newItemText.trim()]
        };

        const success = await saveACTMatrix(patientId, currentUser.id, newContent, activeMatrix?.id);

        if (success) {
            setIsModalOpen(false);
        }
    };

    const handleDeleteItem = async (quadrant: QuadrantType, index: number) => {
        if (!currentUser) return;

        const newArray = [...currentMatrix[quadrant]];
        newArray.splice(index, 1);

        const newContent = {
            ...currentMatrix,
            [quadrant]: newArray
        };

        await saveACTMatrix(patientId, currentUser.id, newContent, activeMatrix?.id);
    };

    // Helper para extrair informações do quadrante atual para o Modal
    const getModalInfo = () => {
        switch (activeQuadrant) {
            case 'avoidance': return { title: 'Comportamento de Esquiva', placeholder: 'O que você faz para não sentir a dor?' };
            case 'committedAction': return { title: 'Ação Comprometida', placeholder: 'Ação prática alinhada aos seus valores...' };
            case 'hooks': return { title: 'Gancho (Experiência Interna)', placeholder: 'Pensamento ou emoção que te fisga...' };
            case 'values': return { title: 'Valor Importante', placeholder: 'O que realmente importa para você?' };
            default: return { title: '', placeholder: '' };
        }
    };

    const modalInfo = getModalInfo();

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-fadeIn">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-border pb-4 mb-6 gap-4">
                <div>
                    <h3 className="text-xl font-bold text-on-surface flex items-center gap-2">
                        <Target className="h-6 w-6 text-emerald-500" />
                        Matriz ACT
                        <ToolGuideButton toolId="act_matrix" />
                    </h3>
                    <p className="text-sm text-foreground-muted mt-1">
                        Mapeamento de flexibilidade psicológica (Terapia de Aceitação e Compromisso).
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="h-64 flex justify-center items-center text-foreground-muted ">Carregando Matriz...</div>
            ) : (
                <div className="relative">
                    {/* Linhas Cênicas da Matriz */}
                    <div className="absolute inset-0 pointer-events-none flex flex-col justify-center items-center z-0 opacity-20 dark:opacity-30">
                        <div className="w-full h-1 bg-slate-900 absolute top-1/2 transform -translate-y-1/2 rounded-full" />
                        <div className="h-full w-1 bg-slate-900 absolute left-1/2 transform -translate-x-1/2 rounded-full" />
                        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 -rotate-90 text-[10px] font-bold tracking-widest text-on-surface uppercase">Experiência Interna</div>
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 -rotate-90 text-[10px] font-bold tracking-widest text-on-surface uppercase">Comportamento Externo</div>
                        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-[10px] font-bold tracking-widest text-on-surface uppercase">Afastamento</div>
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-[10px] font-bold tracking-widest text-on-surface uppercase">Aproximação</div>
                    </div>

                    {/* Grid Reativo 2x2 M3 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 relative z-10">

                        {/* Upper Left: Avoidance (Esquiva) */}
                        <div className="bg-red-50 border-2 border-red-100 dark:border-red-900/30 rounded-[28px] p-6 min-h-[250px] shadow-sm flex flex-col transition-all hover:shadow-md">
                            <h4 className="font-bold text-red-700 dark:text-red-400 flex items-center gap-2 mb-4">
                                <EyeOff size={18} /> Esquiva
                            </h4>
                            <div className="flex-1 flex flex-col gap-2">
                                {currentMatrix.avoidance.map((item, idx) => (
                                    <div key={idx} className=" bg-surface/70 backdrop-blur-md px-4 py-3 rounded-xl shadow-sm text-sm text-foreground-muted flex justify-between items-start group border border-white ">
                                        <span>{item}</span>
                                        <button onClick={() => handleDeleteItem('avoidance', idx)} className="text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <Button variant="ghost" className="mt-4 w-full bg-surface/50 border-dashed border-red-200 hover:bg-red-100 dark:hover:bg-slate-800 text-red-600 dark:text-red-400 !rounded-xl" onClick={() => handleOpenAdd('avoidance')}>
                                <Plus size={16} /> Adicionar
                            </Button>
                        </div>

                        {/* Upper Right: Committed Action */}
                        <div className="bg-emerald-50 border-2 border-emerald-100 dark:border-emerald-900/30 rounded-[28px] p-6 min-h-[250px] shadow-sm flex flex-col transition-all hover:shadow-md">
                            <h4 className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2 mb-4">
                                <CheckCircle2 size={18} /> Ações Comprometidas
                            </h4>
                            <div className="flex-1 flex flex-col gap-2">
                                {currentMatrix.committedAction.map((item, idx) => (
                                    <div key={idx} className=" bg-surface/70 backdrop-blur-md px-4 py-3 rounded-xl shadow-sm text-sm text-foreground-muted flex justify-between items-start group border border-white ">
                                        <span>{item}</span>
                                        <button onClick={() => handleDeleteItem('committedAction', idx)} className="text-emerald-300 hover:text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <Button variant="ghost" className="mt-4 w-full bg-surface/50 border-dashed border-emerald-200 hover:bg-emerald-100 dark:hover:bg-slate-800 text-emerald-600 dark:text-emerald-400 !rounded-xl" onClick={() => handleOpenAdd('committedAction')}>
                                <Plus size={16} /> Adicionar
                            </Button>
                        </div>

                        {/* Lower Left: Hooks (Ganchos) */}
                        <div className="bg-orange-50 border-2 border-orange-100 dark:border-orange-900/30 rounded-[28px] p-6 min-h-[250px] shadow-sm flex flex-col transition-all hover:shadow-md">
                            <h4 className="font-bold text-orange-700 dark:text-orange-400 flex items-center gap-2 mb-4">
                                <AlertTriangle size={18} /> Ganchos
                            </h4>
                            <div className="flex-1 flex flex-col gap-2">
                                {currentMatrix.hooks.map((item, idx) => (
                                    <div key={idx} className=" bg-surface/70 backdrop-blur-md px-4 py-3 rounded-xl shadow-sm text-sm text-foreground-muted flex justify-between items-start group border border-white ">
                                        <span>{item}</span>
                                        <button onClick={() => handleDeleteItem('hooks', idx)} className="text-orange-300 hover:text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <Button variant="ghost" className="mt-4 w-full bg-surface/50 border-dashed border-orange-200 hover:bg-orange-100 dark:hover:bg-slate-800 text-orange-600 dark:text-orange-400 !rounded-xl" onClick={() => handleOpenAdd('hooks')}>
                                <Plus size={16} /> Adicionar
                            </Button>
                        </div>

                        {/* Lower Right: Values (Valores) */}
                        <div className="bg-indigo-50 border-2 border-indigo-100 dark:border-indigo-900/30 rounded-[28px] p-6 min-h-[250px] shadow-sm flex flex-col transition-all hover:shadow-md">
                            <h4 className="font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-2 mb-4">
                                <Target size={18} /> Valores
                            </h4>
                            <div className="flex-1 flex flex-col gap-2">
                                {currentMatrix.values.map((item, idx) => (
                                    <div key={idx} className=" bg-surface/70 backdrop-blur-md px-4 py-3 rounded-xl shadow-sm text-sm text-foreground-muted flex justify-between items-start group border border-white ">
                                        <span>{item}</span>
                                        <button onClick={() => handleDeleteItem('values', idx)} className="text-indigo-300 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <Button variant="ghost" className="mt-4 w-full bg-surface/50 border-dashed border-indigo-200 hover:bg-indigo-100 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 !rounded-xl" onClick={() => handleOpenAdd('values')}>
                                <Plus size={16} /> Adicionar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Customizado M3 Acrílico */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Adicionar: ${modalInfo.title}`}>
                <div className="space-y-4 pt-4">
                    <textarea
                        value={newItemText}
                        onChange={(e) => setNewItemText(e.target.value)}
                        placeholder={modalInfo.placeholder}
                        className="w-full px-4 py-3 bg-surface border border-border rounded-2xl focus:ring-2 focus:ring-emerald-500 h-24 resize-none text-on-surface "
                        autoFocus
                    />

                    <div className="pt-2 flex justify-end gap-3">
                        <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button variant="primary" onClick={handleSaveItem} disabled={!newItemText.trim()}>Salvar Item</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ACTMatrixTab;
