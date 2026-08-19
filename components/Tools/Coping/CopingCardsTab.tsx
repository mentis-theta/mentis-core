import React, { useState } from 'react';
import { useCopingCards } from '@/hooks/usePortalTools';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Plus, X, Heart, Wind } from 'lucide-react';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import ToolGuideButton from '../ToolGuideButton';

interface CopingCardsTabProps {
    patientId: string;
}

const CopingCardsTab: React.FC<CopingCardsTabProps> = ({ patientId }) => {
    const { currentUser } = useAuth();
    const { records, createCopingCard, deleteCopingCard, loading } = useCopingCards(patientId);
    
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newCardText, setNewCardText] = useState('');
    const [category, setCategory] = useState<'defusion' | 'values' | 'grounding' | 'general'>('general');
    const [isSaving, setIsSaving] = useState(false);

    const handleSaveCard = async () => {
        if (!currentUser || !newCardText.trim() || isSaving) return;
        setIsSaving(true);
        try {
            const success = await createCopingCard(patientId, currentUser.id, {
                text: newCardText.trim(),
                category,
                authorType: 'psychologist'
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
            default: return 'bg-surface border-border text-on-surface';
        }
    };

    const getCategoryIcon = (cat: string) => {
        switch (cat) {
            case 'defusion': return <Wind className="w-4 h-4 opacity-70" />;
            case 'values': return <Heart className="w-4 h-4 opacity-70" />;
            case 'grounding': return <Shield className="w-4 h-4 opacity-70" />;
            default: return null;
        }
    };

    return (
        <div className="space-y-6 pb-10 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-border pb-4">
                <div>
                    <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
                        <Shield className="w-6 h-6 text-orange-500" />
                        Cartões de Enfrentamento
                        <ToolGuideButton toolId="coping" />
                    </h2>
                    <p className="text-sm text-foreground-muted">
                        Lembretes curtos e diretos que ajudam o paciente em momentos de crise.
                    </p>
                </div>
                <Button onClick={() => setIsAddModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Novo Cartão
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                </div>
            ) : records.length === 0 ? (
                <div className="text-center py-12 rounded-xl bg-surface border-2 border-dashed border-border">
                    <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-foreground-muted">Nenhum cartão encontrado</h3>
                    <p className="text-foreground-muted mb-4">Crie o primeiro cartão para ajudar o paciente.</p>
                    <Button variant="secondary" onClick={() => setIsAddModalOpen(true)}>Criar Primeiro Cartão</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {records.map(record => {
                        const isPatientRecord = record.metadata.authorType === 'patient';
                        return (
                            <div key={record.id} className={`rounded-xl shadow-sm border p-5 flex flex-col relative ${getCategoryStyles(record.content.category || 'general')}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2">
                                        {getCategoryIcon(record.content.category || 'general')}
                                        <span className="text-xs font-bold uppercase tracking-wider opacity-70">
                                            {record.content.category || 'Geral'}
                                        </span>
                                    </div>
                                    <button onClick={() => deleteCopingCard(record.id)} className="opacity-40 hover:opacity-100 hover:text-red-500 transition-opacity">
                                        <X size={16} />
                                    </button>
                                </div>
                                
                                <p className="text-lg font-medium leading-snug flex-1 mb-4">
                                    "{record.content.text}"
                                </p>
                                
                                <div className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                                    {isPatientRecord ? 'Criado pelo Paciente' : 'Criado por você'}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Novo Cartão de Enfrentamento">
                <div className="pt-2 flex flex-col gap-4">
                    <textarea
                        value={newCardText}
                        onChange={(e) => setNewCardText(e.target.value)}
                        placeholder="Escreva a frase de enfrentamento..."
                        className="w-full text-sm p-4 bg-surface border border-border rounded-xl min-h-[120px] resize-none focus:ring-2 focus:ring-orange-500"
                        autoFocus
                    />
                    <div>
                        <label className="text-xs uppercase tracking-widest font-bold text-foreground-muted mb-2 block">Categoria</label>
                        <div className="flex gap-2">
                            <button onClick={() => setCategory('general')} className={`px-3 py-1.5 rounded-full text-xs font-medium ${category === 'general' ? 'bg-slate-800 text-white' : 'bg-surface border text-foreground-muted'}`}>Geral</button>
                            <button onClick={() => setCategory('defusion')} className={`px-3 py-1.5 rounded-full text-xs font-medium ${category === 'defusion' ? 'bg-indigo-500 text-white' : 'bg-indigo-50 text-indigo-700'}`}>Defusão</button>
                            <button onClick={() => setCategory('values')} className={`px-3 py-1.5 rounded-full text-xs font-medium ${category === 'values' ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-700'}`}>Valores</button>
                            <button onClick={() => setCategory('grounding')} className={`px-3 py-1.5 rounded-full text-xs font-medium ${category === 'grounding' ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-700'}`}>Aterramento</button>
                        </div>
                    </div>
                    <div className="flex justify-end mt-4">
                        <Button variant="primary" onClick={handleSaveCard} disabled={!newCardText.trim() || isSaving}>
                            {isSaving ? 'Salvando...' : 'Salvar Cartão'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default CopingCardsTab;
