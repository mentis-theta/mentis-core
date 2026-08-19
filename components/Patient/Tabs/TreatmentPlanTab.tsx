import React, { useMemo } from 'react';
import { Patient, Goal } from '@/types';
import { PlusIcon, ChartBarIcon, TrashIcon, PencilIcon, CheckCircleIcon } from '@/components/Icons';
import Button from '@/components/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useModals } from '@/contexts/ModalContext';
import { useModalData } from '@/contexts/ModalDataContext';
import { useToast } from '@/contexts/ToastContext';
import { usePatientContext } from '@/contexts/PatientContext';
import { useDecoupledData } from '@/hooks/useDecoupledData';
import { Loader2 } from 'lucide-react';
import ToolGuideButton from '@/components/Tools/ToolGuideButton';

interface TreatmentPlanTabProps {
    patient: Patient;
}

const TreatmentPlanTab: React.FC<TreatmentPlanTabProps> = ({ patient }) => {
    const { currentUser } = useAuth();
    const { openModal } = useModals();
    const { setGoalToEdit, setItemToDelete } = useModalData();
    const { addToast } = useToast();
    const { saveGoal } = usePatientContext();

    const { data: decoupledData, isLoading: isLoadingDecoupled } = useDecoupledData(patient.id, 'full_audit');
    const goals = decoupledData?.goals || [];

    const activeGoals = useMemo(() => goals.filter(g => g.status === 'in_progress'), [goals]);
    const pausedGoals = useMemo(() => goals.filter(g => g.status === 'paused'), [goals]);
    const achievedGoals = useMemo(() => goals.filter(g => g.status === 'achieved'), [goals]);

    if (isLoadingDecoupled) {
        return (
            <div className="flex items-center justify-center p-12 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    const handleEditGoal = (goal: Goal) => {
        setGoalToEdit(goal);
        openModal('goalEditor');
    };

    const handleDeleteGoal = (goal: Goal) => {
        setItemToDelete({ type: 'goal', id: goal.id, patientId: patient.id });
        openModal('deleteConfirmation');
    };

    const handleAddGoal = () => {
        setGoalToEdit(null);
        openModal('goalEditor');
    };

    const handleMarkAchieved = async (goal: Goal) => {
        if (!currentUser) return;
        await saveGoal(patient.id, { ...goal, status: 'achieved' });
    };

    const GoalCard = ({ goal }: { goal: Goal }) => (
        <div className=" bg-surface border border-border rounded-lg p-4 mb-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-on-surface ">{goal.title}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium 
                            ${goal.status === 'in_progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                                goal.status === 'paused' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' :
                                    'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'}`}>
                            {goal.status === 'in_progress' ? 'Em Andamento' : goal.status === 'paused' ? 'Pausada' : 'Alcançada'}
                        </span>
                    </div>
                    <p className="text-sm text-foreground-muted mt-1 line-clamp-2">{goal.description}</p>

                    {/* Interventions Preview */}
                    {goal.interventions.length > 0 && (
                        <div className="mt-3">
                            <p className="text-xs font-semibold text-foreground-muted uppercase mb-1">Intervenções ({goal.interventions.length})</p>
                            <div className="flex flex-wrap gap-1">
                                {goal.interventions.slice(0, 3).map(i => (
                                    <span key={i.id} className="text-xs bg-background dark:bg-slate-700 text-foreground-muted px-2 py-1 rounded">
                                        {i.text}
                                    </span>
                                ))}
                                {goal.interventions.length > 3 && (
                                    <span className="text-xs text-foreground-muted pl-1">+{goal.interventions.length - 3}</span>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1 ml-4">
                    {goal.status !== 'achieved' && (
                        <button
                            onClick={() => handleMarkAchieved(goal)}
                            title="Marcar como Alcançada"
                            className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                        >
                            <CheckCircleIcon className="w-5 h-5" />
                        </button>
                    )}
                    <button
                        onClick={() => handleEditGoal(goal)}
                        title="Editar"
                        className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                    >
                        <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleDeleteGoal(goal)}
                        title="Excluir"
                        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header / Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-blue-100 text-sm font-medium flex items-center gap-1">Total de Metas <ToolGuideButton toolId="treatmentPlan" /></p>
                            <h3 className="text-2xl font-bold mt-1">{goals.length}</h3>
                        </div>
                        <ChartBarIcon className="w-8 h-8 text-blue-200 opacity-80" />
                    </div>
                </div>
                <div className=" bg-surface rounded-lg p-4 border border-border shadow-sm">
                    <p className=" text-foreground-muted text-xs font-medium uppercase">Em Andamento</p>
                    <h3 className="text-xl font-bold text-on-surface mt-1">{activeGoals.length}</h3>
                </div>
                <div className=" bg-surface rounded-lg p-4 border border-border shadow-sm">
                    <p className=" text-foreground-muted text-xs font-medium uppercase">Concluídas</p>
                    <h3 className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">{achievedGoals.length}</h3>
                </div>
                <div className="flex items-center justify-end">
                    <Button onClick={handleAddGoal} className="w-full h-full shadow-md">
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Nova Meta
                    </Button>
                </div>
            </div>

            {/* Content Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Left Col: Active Work */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-on-surface flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        Em Foco
                    </h3>

                    {activeGoals.length === 0 && pausedGoals.length === 0 ? (
                        <div className="text-center py-8 bg-surface rounded-lg border border-dashed border-border ">
                            <p className=" text-foreground-muted text-sm">Nenhuma meta ativa no momento.</p>
                            <button onClick={handleAddGoal} className="text-blue-600 text-sm font-medium mt-2 hover:underline">Criar primeira meta</button>
                        </div>
                    ) : (
                        <div>
                            {activeGoals.map(goal => <GoalCard key={goal.id} goal={goal} />)}

                            {pausedGoals.length > 0 && (
                                <>
                                    <div className="relative py-2">
                                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border "></span></div>
                                        <div className="relative flex justify-center"><span className=" bg-surface px-2 text-xs text-foreground-muted ">Pausadas</span></div>
                                    </div>
                                    {pausedGoals.map(goal => <GoalCard key={goal.id} goal={goal} />)}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Col: History / Achieved */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-on-surface flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        Conquistas
                    </h3>

                    {achievedGoals.length === 0 ? (
                        <div className="text-center py-8">
                            <p className=" text-foreground-muted text-sm italic">As metas alcançadas aparecerão aqui.</p>
                        </div>
                    ) : (
                        <div className="opacity-75 hover:opacity-100 transition-opacity">
                            {achievedGoals.map(goal => <GoalCard key={goal.id} goal={goal} />)}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TreatmentPlanTab;
