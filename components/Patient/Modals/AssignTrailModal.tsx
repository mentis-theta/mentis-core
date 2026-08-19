import React, { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import { useTrails } from '@/hooks/useTrails';
import Button from '@/components/Button';
import { BookOpenIcon, CheckCircleIcon, XMarkIcon, TrashIcon, UserCircleIcon, RefreshIcon } from '@/components/Icons';
import { Trail } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/ConfirmContext';

// Extend Trail type locally if needed or just cast
interface TrailWithStatus extends Trail {
    assignment_status?: string;
}

interface AssignTrailModalProps {
    patientId: string;
    patientName: string;
    onClose: () => void;
}

export const AssignTrailModal: React.FC<AssignTrailModalProps> = ({ patientId, patientName, onClose }) => {
    // 1. Patient Trails (Managed)
    const {
        trails: assignedTrailsRaw,
        loading: loadingAssigned,
        unassignFromPatient,
        refresh: refreshAssigned
    } = useTrails(patientId);

    const assignedTrails = assignedTrailsRaw as TrailWithStatus[];

    // 2. Library Trails (Available to Assign)
    const {
        trails: libraryTrails,
        loading: loadingLibrary
    } = useTrails(); // No ID = fetch all templates/my trails

    const { assignToPatient, duplicateTrail } = useTrails(); // Actions
    const { addToast } = useToast();
    const confirm = useConfirm();

    const [activeTab, setActiveTab] = useState<'assigned' | 'library'>('assigned');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    // Initial Refresh
    useEffect(() => {
        setMounted(true);
        refreshAssigned();
    }, []);

    const handleUnassign = async (trailId: string) => {
        const isConfirmed = await confirm({
            title: "Remover Trilha",
            message: "Tem certeza que deseja remover esta trilha do paciente?",
            confirmText: "Remover"
        });
        if (!isConfirmed) return;
        setProcessingId(trailId);
        await unassignFromPatient(patientId, trailId);
        await refreshAssigned();
        setProcessingId(null);
    };

    const handleAssign = async (trail: Trail) => {
        setProcessingId(trail.id);
        const success = await assignToPatient(patientId, trail.id);
        if (success) {
            await refreshAssigned();
            setActiveTab('assigned');
        }
        setProcessingId(null);
    };

    const handlePersonalizeAndAssign = async (trail: Trail) => {
        const newTitle = `${trail.title} - ${patientName}`;
        const isConfirmed = await confirm({
            title: "Personalizar Trilha",
            message: `Isso criará uma cópia personalizada chamada "${newTitle}" e a atribuirá ao paciente. Continuar?`,
            confirmText: "Continuar"
        });
        if (!isConfirmed) return;

        setProcessingId(trail.id);

        // 1. Duplicate
        const newTrail = await duplicateTrail(trail.id, newTitle);

        if (newTrail) {
            // 2. Assign
            const success = await assignToPatient(patientId, newTrail.id);
            if (success) {
                await refreshAssigned();
                addToast(`A nova trilha "${newTitle}" está disponível na sua biblioteca e foi vinculada ao paciente "${patientName}". Para continuar a personalização da trilha, acesse a biblioteca.`, 'success');
                setActiveTab('assigned');
            }
        }
        setProcessingId(null);
    };

    const isAssigned = (trailId: string) => {
        return assignedTrails.some(t => t.id === trailId);
    };

    if (!mounted) return null;

    return (
        <Modal isOpen={true} onClose={onClose} title="Gerenciar Jornadas" size="xl">
            <div className="flex flex-col h-[70vh]">

                {/* Tabs */}
                <div className="flex border-b border-border ">
                    <button
                        onClick={() => setActiveTab('assigned')}
                        className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'assigned'
                            ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20'
                            : 'border-transparent  text-foreground-muted  hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                    >
                        Atribuídas ({assignedTrails.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('library')}
                        className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'library'
                            ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20'
                            : 'border-transparent  text-foreground-muted  hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                    >
                        Biblioteca de Trilhas
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-surface ">

                    {/* Tab: Assigned */}
                    {activeTab === 'assigned' && (
                        <div className="space-y-3">
                            {loadingAssigned ? (
                                <div className="text-center py-8 text-foreground-muted ">Carregando...</div>
                            ) : assignedTrails.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
                                    <BookOpenIcon className="mx-auto h-12 w-12 text-slate-300" />
                                    <p className="mt-2 text-foreground-muted ">Nenhuma trilha atribuída a este paciente.</p>
                                    <Button variant="ghost" onClick={() => setActiveTab('library')} className="mt-2 text-indigo-600">
                                        Ir para Biblioteca
                                    </Button>
                                </div>
                            ) : (
                                assignedTrails.map(trail => (
                                    <div key={trail.id} className=" bg-surface border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-4 shadow-sm flex justify-between items-center group">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-xl">
                                                {trail.icon_url || <BookOpenIcon className="w-5 h-5 text-indigo-500" />}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-on-surface ">{trail.title}</h4>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-xs text-foreground-muted bg-background px-2 py-0.5 rounded-full">
                                                        {(trail.modules || []).length} Módulos
                                                    </span>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${trail.assignment_status === 'completed'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-blue-100 text-blue-700'
                                                        }`}>
                                                        {trail.assignment_status === 'completed' ? 'Concluída' : 'Em andamento'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                            onClick={() => handleUnassign(trail.id)}
                                            disabled={processingId === trail.id}
                                            title="Remover acesso"
                                        >
                                            {processingId === trail.id ? (
                                                <RefreshIcon className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <TrashIcon className="w-5 h-5" />
                                            )}
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* Tab: Library */}
                    {activeTab === 'library' && (
                        <div className="space-y-3">
                            {loadingLibrary ? (
                                <div className="text-center py-8 text-foreground-muted ">Carregando...</div>
                            ) : (
                                libraryTrails.map(trail => {
                                    const assigned = isAssigned(trail.id);
                                    return (
                                        <div key={trail.id} className={` bg-surface    border rounded-xl p-4 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center transition-all ${assigned ? 'border-indigo-200 bg-indigo-50/30' : ' border-border   '
                                            }`}>
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-xl bg-background dark:bg-slate-700 flex items-center justify-center text-xl grayscale opacity-70">
                                                    {trail.icon_url || <BookOpenIcon className="w-5 h-5 text-slate-500" />}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-on-surface flex items-center gap-2">
                                                        {trail.title}
                                                        {assigned && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Atribuída</span>}
                                                    </h4>
                                                    <p className="text-xs text-foreground-muted line-clamp-1 max-w-xs">{trail.description}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                                {assigned ? (
                                                    <Button
                                                        variant="ghost"
                                                        disabled
                                                        className="text-green-600 w-full sm:w-auto opacity-50 cursor-not-allowed"
                                                    >
                                                        <CheckCircleIcon className="w-4 h-4 mr-2" /> Já Atribuída
                                                    </Button>
                                                ) : (
                                                    <>
                                                        <Button
                                                            onClick={() => handlePersonalizeAndAssign(trail)}
                                                            disabled={!!processingId}
                                                            variant="secondary"
                                                            size="sm"
                                                            className="flex-1 sm:flex-none text-xs"
                                                            title="Cria uma cópia editável para este paciente"
                                                        >
                                                            <UserCircleIcon className="w-3 h-3 mr-1" />
                                                            Personalizar
                                                        </Button>
                                                        <Button
                                                            onClick={() => handleAssign(trail)}
                                                            disabled={!!processingId}
                                                            size="sm"
                                                            variant="primary"
                                                            className="flex-1 sm:flex-none"
                                                        >
                                                            {processingId === trail.id ? '...' : 'Atribuir'}
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border bg-surface flex justify-end mt-4">
                    <Button variant="secondary" onClick={onClose}>
                        Fechar
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
