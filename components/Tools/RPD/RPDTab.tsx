import React, { useState, useEffect } from 'react';
import ToolGuideButton from '../ToolGuideButton';
import { RPDRecord } from '@/types';
import { useRPD } from '@/hooks/useRPD';
import RPDModal from './RPDModal';
import Button from '../../Button'; // Check relative path
import { PlusIcon, TrashIcon, SparklesIcon } from '../../Icons'; // Check relative path
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { MessageCircle, MessageSquare, UserCheck } from 'lucide-react';

interface RPDTabProps {
    patientId: string;
}

const RPDFeedbackInput = ({ recordId, onSave }: { recordId: string, onSave: (text: string) => Promise<void> }) => {
    const [text, setText] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    if (!isExpanded) {
        return (
            <button
                onClick={() => setIsExpanded(true)}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5 font-medium"
            >
                <MessageCircle className="w-4 h-4" /> Adicionar Orientação
            </button>
        );
    }

    return (
        <div className=" bg-surface rounded-lg p-3 border border-indigo-100 dark:border-indigo-900/50 animate-fadeIn">
            <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Escreva sua orientação para o paciente..."
                className="w-full text-sm p-2 rounded border border-border bg-surface focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                autoFocus
            />
            <div className="flex justify-end gap-2 mt-2">
                <button
                    onClick={() => setIsExpanded(false)}
                    className="text-xs text-foreground-muted hover:text-slate-700 px-3 py-1.5"
                >
                    Cancelar
                </button>
                <button
                    onClick={async () => {
                        if (!text.trim()) return;
                        setIsSaving(true);
                        await onSave(text);
                        setIsSaving(false);
                        setIsExpanded(false);
                    }}
                    disabled={isSaving || !text.trim()}
                    className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-1"
                >
                    {isSaving ? 'Enviando...' : 'Enviar Orientação'}
                </button>
            </div>
        </div>
    );
};

const RPDTab: React.FC<RPDTabProps> = ({ patientId }) => {
    const { records, createRPD, deleteRPD, saveFeedback, loading: isLoading } = useRPD(patientId);
    const { currentUser } = useAuth();
    const { addToast } = useToast();
    const confirm = useConfirm();

    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleSave = async (data: any) => {
        if (!currentUser) return;
        await createRPD(patientId, currentUser.id, data);
    };

    const handleDelete = async (id: string) => {
        const isConfirmed = await confirm({
            title: "Excluir Registro?",
            message: "Tem certeza que deseja excluir este registro?",
            confirmText: "Sim, excluir"
        });
        if (isConfirmed) {
            await deleteRPD(id);
        }
    };

    const formatDate = (dateString: string) => {
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(dateString));
    };

    const getIntensityColor = (intensity: number) => {
        if (intensity < 40) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
        if (intensity < 70) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    };

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-border pb-4">
                <div>
                    <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
                        <SparklesIcon className="w-6 h-6 text-indigo-500" />
                        Registro de Pensamentos
                        <ToolGuideButton toolId="rpd" />
                    </h2>
                    <p className="text-sm text-foreground-muted ">
                        Monitore e reestruture pensamentos disfuncionais.
                    </p>
                </div>
                <Button onClick={() => setIsModalOpen(true)}>
                    <PlusIcon className="w-4 h-4 mr-2" /> Novo Registro
                </Button>
            </div>

            {/* List */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                </div>
            ) : records.length === 0 ? (
                <div className="text-center py-12 rounded-xl bg-surface border-2 border-dashed border-border ">
                    <SparklesIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-foreground-muted ">Nenhum registro encontrado</h3>
                    <p className=" text-foreground-muted mb-4">Comece adicionando um novo registro de pensamento.</p>
                    <Button variant="secondary" onClick={() => setIsModalOpen(true)}>Criar Primeiro RPD</Button>
                </div>
            ) : (
                <div className="grid gap-6">
                    {records.map(record => {
                        const isPatientRecord = record.author_id !== currentUser?.id;
                        return (
                            <div
                                key={record.id}
                                className={`rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow ${isPatientRecord
                                    ? 'bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800'
                                    : ' bg-surface border-border '
                                    }`}
                            >

                                {/* Card Header */}
                                <div className={`px-4 py-3 border-b flex justify-between items-center ${isPatientRecord
                                    ? 'bg-purple-100/50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800'
                                    : ' bg-surface border-border '
                                    }`}>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-semibold text-foreground-muted ">
                                            {formatDate(record.date)}
                                        </span>
                                        {isPatientRecord && (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 text-xs font-bold">
                                                <MessageSquare className="w-3.5 h-3.5" /> Relato do Paciente
                                            </span>
                                        )}
                                        {record.metadata.emotion && (
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-xs font-bold text-foreground-muted uppercase">
                                                    {record.metadata.emotion}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getIntensityColor(record.metadata.intensity)}`}>
                                                    {record.metadata.intensity}%
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    {!isPatientRecord && (
                                        <button
                                            onClick={() => handleDelete(record.id)}
                                            className=" text-foreground-muted hover:text-red-500 transition-colors p-1"
                                            title="Excluir"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                {/* Card Body */}
                                <div className="p-4 grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <div>
                                            <h4 className="text-xs uppercase font-bold text-foreground-muted ">Situação</h4>
                                            <p className="text-sm text-on-surface ">{record.content.situation}</p>
                                        </div>
                                        <div>
                                            <h4 className="text-xs uppercase font-bold text-foreground-muted mt-2">Pensamento Automático</h4>
                                            <p className="text-sm text-on-surface italic">"{record.content.thought}"</p>
                                        </div>
                                        {record.metadata.distortions?.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {record.metadata.distortions.map(d => (
                                                    <span key={d} className="px-1.5 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-700 text-[10px] font-medium">
                                                        {d.replace('_', ' ')}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className={`rounded-lg p-3 border ${isPatientRecord
                                        ? ' bg-surface/50  dark:bg-purple-900/20 border-purple-100 dark:border-purple-800/50'
                                        : 'bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30'
                                        }`}>
                                        <h4 className={`text-xs uppercase font-bold mb-1 ${isPatientRecord ? 'text-purple-700 dark:text-purple-400' : 'text-green-700 dark:text-green-400'
                                            }`}>Resposta Racional</h4>
                                        <p className={`text-sm leading-relaxed ${isPatientRecord ? 'text-purple-900 dark:text-purple-100' : 'text-green-900 dark:text-green-100'
                                            }`}>
                                            {record.content.rationalResponse}
                                        </p>
                                    </div>
                                </div>

                                {/* Feedback Section */}
                                {isPatientRecord && (
                                    <div className="px-4 pb-4 pt-2 border-t border-purple-100 dark:border-purple-800/50 mx-4 mt-2">
                                        {record.therapist_feedback ? (
                                            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 rounded-lg p-3 relative animate-fadeIn">
                                                <div className="flex items-start gap-3">
                                                    <div className="bg-emerald-200 dark:bg-emerald-800 p-1.5 rounded-full text-emerald-700 dark:text-emerald-300">
                                                        <UserCheck className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="text-xs uppercase font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                                                            Sua Orientação
                                                        </h4>
                                                        <p className="text-sm text-emerald-900 dark:text-emerald-100 whitespace-pre-wrap">
                                                            {record.therapist_feedback}
                                                        </p>
                                                        {record.feedback_at && (
                                                            <p className="text-[10px] text-emerald-600 dark:text-emerald-500 mt-2 text-right">
                                                                Enviado em {formatDate(record.feedback_at)}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mt-2">
                                                <RPDFeedbackInput
                                                    recordId={record.id}
                                                    onSave={async (text) => {
                                                        await saveFeedback(record.id, text);
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div >
            )}

            <RPDModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
            />
        </div >
    );
};

export default RPDTab;
