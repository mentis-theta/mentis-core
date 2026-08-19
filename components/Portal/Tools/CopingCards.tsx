import React, { useState } from 'react';
import { useCopingCards } from '@/hooks/usePortalTools';
import { usePortalUser } from '@/hooks/usePortalUser';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import { Plus, X, Heart, Wind, Shield } from 'lucide-react';

const CopingCards: React.FC = () => {
    const { patient } = usePortalUser();
    // Using the patient ID from usePortalUser works for both authenticated and magic link access
    const patientId = patient?.id;

    const { records, createCopingCard, deleteCopingCard, loading } = useCopingCards(patientId);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newCardText, setNewCardText] = useState('');
    const [category, setCategory] = useState<'defusion' | 'values' | 'grounding' | 'general'>('general');
    const [isSaving, setIsSaving] = useState(false);

    const handleSaveCard = async () => {
        if (!patientId || !newCardText.trim() || isSaving) return;

        setIsSaving(true);
        try {
            const success = await createCopingCard(patientId, patientId, { // Patient is author
                text: newCardText.trim(),
                category,
                authorType: 'patient'
            });

            if (success) {
                setIsAddModalOpen(false);
                setNewCardText('');
            }
        } finally {
            setIsSaving(false);
        }
    };

    const getCategoryStyles = (cat: string) => {
        switch (cat) {
            case 'defusion': return 'bg-indigo-50 border-indigo-200 text-indigo-800 dark:bg-indigo-900/30 dark:border-indigo-700/50 dark:text-indigo-200';
            case 'values': return 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-700/50 dark:text-emerald-200';
            case 'grounding': return 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/30 dark:border-orange-700/50 dark:text-orange-200';
            default: return 'bg-slate-100 border-slate-200 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200';
        }
    };

    const getCategoryIcon = (cat: string) => {
        switch (cat) {
            case 'defusion': return <Wind className="w-5 h-5 opacity-70 mb-2" />;
            case 'values': return <Heart className="w-5 h-5 opacity-70 mb-2" />;
            case 'grounding': return <Shield className="w-5 h-5 opacity-70 mb-2" />;
            default: return null;
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] md:h-full animate-fadeIn pb-24 md:pb-8">
            <div className="mb-6 px-4 md:px-0 flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-on-surface ">Cartões de Enfrentamento</h2>
                    <p className="text-sm text-foreground-muted mt-1">Lembretes para momentos difíceis.</p>
                </div>
                {(!loading && records.length > 0) && (
                    <Button onClick={() => setIsAddModalOpen(true)} className="!rounded-full w-12 h-12 flex items-center justify-center p-0 shadow-lg" variant="primary">
                        <Plus size={24} />
                    </Button>
                )}
            </div>

            {loading && <div className="p-8 text-center text-foreground-muted ">Buscando cartões...</div>}

            {!loading && records.length === 0 ? (
                <div className="flex-1 flex flex-col justify-center items-center p-8 text-foreground-muted ">
                    <div className="w-24 h-32 border-2 border-dashed border-border rounded-2xl flex items-center justify-center mb-4 rotate-6 bg-surface dark:bg-slate-800/50 shadow-sm">
                        <Plus className="opacity-20 w-8 h-8" />
                    </div>
                    <p className="text-center font-medium">O seu primeiro passo para a resiliência começa aqui.</p>
                    <p className="text-center text-sm opacity-70 mt-1">Lembretes curtos podem fazer toda a diferença em momentos difíceis.</p>
                    <Button onClick={() => setIsAddModalOpen(true)} className="mt-6" variant="ghost">Criar meu primeiro cartão</Button>
                </div>
            ) : (
                <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-8 pt-4 px-4 md:px-2 flex-1 scrollbar-hide items-center">
                    {records.map((card) => (
                        <div
                            key={card.id}
                            className={`min-w-[85vw] md:min-w-[320px] max-w-sm shrink-0 snap-center rounded-[2rem] p-8 min-h-[50vh] md:min-h-[400px] flex flex-col justify-center relative shadow-xl border-2 transition-transform hover:scale-[1.02] ${getCategoryStyles(card.content.category || 'general')}`}
                        >
                            <button
                                onClick={() => deleteCopingCard(card.id)}
                                className="absolute top-6 right-6 p-2 rounded-full bg-black/5 hover:bg-red-100 hover:text-red-500 transition-colors text-inherit opacity-40 hover:opacity-100"
                            >
                                <X size={20} />
                            </button>

                            <div className="absolute top-8 left-8">
                                {getCategoryIcon(card.content.category || 'general')}
                            </div>

                            <p className="text-2xl md:text-3xl font-medium leading-relaxed tracking-tight text-center mt-4">
                                "{card.content.text}"
                            </p>

                            {card.metadata.authorType === 'psychologist' && (
                                <div className="absolute bottom-6 left-0 w-full text-center">
                                    <span className="text-[10px] uppercase tracking-widest font-bold opacity-50 bg-black/5 px-3 py-1 rounded-full">Enviado pelo seu Psicólogo</span>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Ghost Card to allow overscroll padding */}
                    <div className="min-w-[10vw] shrink-0 snap-center h-full"></div>
                </div>
            )}

            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Novo Cartão">
                <div className="pt-2 flex flex-col gap-4">
                    <textarea
                        value={newCardText}
                        onChange={(e) => setNewCardText(e.target.value)}
                        placeholder="Escreva uma frase que te ajuda a se sentir melhor ou a voltar para o foco..."
                        className="w-full text-lg px-5 py-4 bg-surface dark:bg-slate-950/50 border border-border rounded-3xl min-h-[150px] resize-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
                        autoFocus
                    />

                    <div>
                        <label className="text-xs uppercase tracking-widest font-bold text-foreground-muted mb-2 block">Categoria</label>
                        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                            <button onClick={() => setCategory('general')} className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${category === 'general' ? 'bg-slate-800 text-white shadow-md' : ' bg-background   text-foreground-muted  hover:bg-slate-200    '}`}>Geral</button>
                            <button onClick={() => setCategory('defusion')} className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${category === 'defusion' ? 'bg-indigo-500 text-white shadow-md' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300'}`}>Defusão</button>
                            <button onClick={() => setCategory('values')} className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${category === 'values' ? 'bg-emerald-500 text-white shadow-md' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300'}`}>Valores</button>
                            <button onClick={() => setCategory('grounding')} className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${category === 'grounding' ? 'bg-orange-500 text-white shadow-md' : 'bg-orange-50 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300'}`}>Aterramento</button>
                        </div>
                    </div>

                    <div className="flex justify-end mt-4">
                        <Button variant="primary" onClick={handleSaveCard} disabled={!newCardText.trim() || isSaving} className="w-full !rounded-2xl py-3 shadow-md">
                            {isSaving ? 'Criando...' : 'Criar Cartão'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default CopingCards;
