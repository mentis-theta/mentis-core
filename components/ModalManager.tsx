import React, { useMemo } from 'react';
import { useModals } from '@/contexts/ModalContext';
import { useModalData } from '@/contexts/ModalDataContext';
import { useModalScheduling } from '@/contexts/ModalSchedulingContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePatientContext } from '@/contexts/PatientContext';
import { useSelectedPatientId } from '@/hooks/useSelectedPatientId';
import type { Patient, Session, SchedulingRequest, RegisterData, AppointmentSessionData, Goal, InterventionFeedback, Document } from '@/types';
import { useGlobalSessions } from '@/hooks/useGlobalSessions';

// Import Lazy Loader
import { lazyWithRetry } from '@/utils/lazyLoad';
import { Suspense } from 'react';

// Lazy Import Modals
const AddPatientModal = lazyWithRetry(() => import('./Patient/AddPatientModal'));
const SessionEditorModal = lazyWithRetry(() => import('./Session/SessionEditorModal'));
const AddDocumentModal = lazyWithRetry(() => import('./Patient/AddDocumentModal'));
const ViewSessionNotesModal = lazyWithRetry(() => import('./Session/ViewSessionNotesModal'));
const ViewLogDetailsModal = lazyWithRetry(() => import('./Admin/ViewLogDetailsModal'));
const DeleteConfirmationModal = lazyWithRetry(() => import('./DeleteConfirmationModal'));
const GoalEditorModal = lazyWithRetry(() => import('./Session/GoalEditorModal'));
const FeedbackEditorModal = lazyWithRetry(() => import('./Session/FeedbackEditorModal'));
const AppointmentModal = lazyWithRetry(() => import('./Session/AppointmentModal'));
const AddExpenseModal = lazyWithRetry(() => import('./Modals/AddExpenseModal').then(module => ({ default: module.AddExpenseModal })));

import Modal from './Modal';
import { MESSAGES } from '@/utils/messages';
import { useToast } from '@/contexts/ToastContext';
import { updateSchedulingRequestStatus } from '@/services/bookingService';
import { triggerRequestsUpdate } from '@/utils/events';
import { useQueryClient } from '@tanstack/react-query';
import { REQUESTS_QUERY_KEY } from '@/hooks/useSchedulingRequests';

// Elegant Fallback for Modals: Translucent overlay with minimal spinner
const ModalLoadingFallback = () => (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/5 backdrop-blur-[2px] animate-fadeIn">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
    </div>
);

const ModalManager = () => {
    const { modals, closeModal, openModal } = useModals();
    const {
        patientToEdit, setPatientToEdit,
        initialPatientData, setInitialPatientData,
        sessionToEdit, sessionToView, goalToEdit,
        interventionFeedbackContext, sessionLogsToView,
        itemToDelete, setItemToDelete,
        setSessionToEdit
    } = useModalData();
    const {
        selectedDateForAppointment, setSelectedDateForAppointment,
        selectedPatientIdForAppointment, setSelectedPatientIdForAppointment,
        appointmentRequestId, setAppointmentRequestId,
        expenseToEdit, setExpenseToEdit,
        schedulingRequestContext, setSchedulingRequestContext
    } = useModalScheduling();

    const selectedPatientId = useSelectedPatientId();

    const { currentUser, users } = useAuth();
    const { addToast } = useToast();
    const queryClient = useQueryClient();

    const {
        addPatient, updatePatient, deletePatient,
        saveSession, finalizeSessionTransactionally, deleteSession, updateSessionStatus,
        saveManySessions,
        saveGoal, deleteGoal, saveInterventionFeedback, addDocument,
        patients,
        refreshPatients,
        executeDeleteSession, executeDeleteGoal, executeDeletePatient
    } = usePatientContext();
    const { globalSessions } = useGlobalSessions();

    // Derived state: The "Active" patient for context-dependent modals
    const contextPatient = usePatientContext().patient;

    const selectedPatient = useMemo(() => {
        if (selectedPatientId) return patients.find(p => p.id === selectedPatientId) || contextPatient;
        return contextPatient || null;
    }, [selectedPatientId, patients, contextPatient]);

    // --- Handlers ---

    const handleAddPatient = async (d: Omit<Patient, 'id' | 'createdAt' | 'sessions' | 'documents' | 'goals' | 'insights'>) => {
        if (!currentUser) return;

        // This will hold the ID of the patient we just worked on
        let targetPatientId: string | undefined;

        if (patientToEdit) {
            await updatePatient(patientToEdit.id, d);
            targetPatientId = patientToEdit.id;
 addToast("Paciente atualizado com sucesso!", "success");
        } else {
            // New Patient
            const result = await addPatient(d, currentUser.role === 'psychologist' ? currentUser.id : undefined);
            // addPatient returns the ID on success (Promise<string | void>)
            if (typeof result === 'string') {
                targetPatientId = result;
            }
 addToast("Paciente cadastrado com sucesso!", "success");
        }

        // Auto-refresh: Update patient list immediately
        await refreshPatients();

        closeModal('addPatient');
        setPatientToEdit(null);

        // CHAINING LOGIC: If we are in an Appointment Flow (Request Approval), proceed to Appointment
        if (appointmentRequestId && targetPatientId) {
            // Small delay to ensure modal close animation finishes? Or instantaneous?
            // Instantaneous is usually better for UX, but sometimes state updates clash.
            // Let's try direct.
            setSelectedPatientIdForAppointment(targetPatientId);
            // Date is already set in SchedulingRequestsList
            openModal('appointment');
        }
    };

    const handleApproveLead = (req: SchedulingRequest) => {
        setInitialPatientData({
            name: req.patientName,
            phone: req.patientPhone,
            email: req.patientEmail,
            medicalHistory: req.notes,
            cpf: req.patientCpf,
            birthDate: req.patientBirthDate
        });
        openModal('addPatient');
    };

    const handleAppointmentSave = async (sessionData: AppointmentSessionData | AppointmentSessionData[]) => {
        let finalPatientId = '';

        // 1. Transaction: if it belongs to a Lead (new patient), we create them first
        if (schedulingRequestContext && currentUser) {
            const newPatientData = {
                name: schedulingRequestContext.patientName,
                email: schedulingRequestContext.patientEmail,
                phone: schedulingRequestContext.patientPhone,
                cpf: schedulingRequestContext.patientCpf || '',
                birthDate: schedulingRequestContext.patientBirthDate || '',
                medicalHistory: schedulingRequestContext.notes || '',
                status: 'active' as const,
                consent: true,
                paymentType: 'particular' as const
            };
            const result = await addPatient(newPatientData, currentUser.role === 'psychologist' ? currentUser.id : undefined);
            if (typeof result === 'string') {
                finalPatientId = result;
            } else {
 addToast("Erro ao criar paciente durante o agendamento.", "error");
                return;
            }
        } else {
            // Se não for um lead, pega o patientId do próprio array ou objeto que o AppointmentModal nos deu
            finalPatientId = Array.isArray(sessionData) ? sessionData[0].patientId : sessionData.patientId;
        }

        if (Array.isArray(sessionData)) {
            // Bulk Save
            if (sessionData.length === 0) return;
            const cleanSessions = sessionData.map(s => {
                const { patientId: _pid, ...rest } = s;
                return rest;
            });
            await saveManySessions(finalPatientId, cleanSessions, []);
        } else {
            // Single Save
            const { patientId: _pid, ...cleanSession } = sessionData;
            saveSession(finalPatientId, cleanSession, []);
        }

        // Auto-refresh: Update patient list (which includes sessions) immediately
        await refreshPatients();

        // Track conversion source BEFORE clearing context
        const wasLeadConversion = !!schedulingRequestContext;
        const wasRequestApproval = !!appointmentRequestId;

        if (schedulingRequestContext) {
            try {
                await updateSchedulingRequestStatus(schedulingRequestContext.id, 'approved');
                triggerRequestsUpdate();
                queryClient.invalidateQueries({ queryKey: [REQUESTS_QUERY_KEY] });
            } catch (e) {
 console.error("Failed to update request status", e);
 addToast("Agendado, mas erro ao atualizar status da solicitação.", "warning");
            }
            setSchedulingRequestContext(null);
        }

        if (appointmentRequestId) {
            try {
                await updateSchedulingRequestStatus(appointmentRequestId, 'approved');
                triggerRequestsUpdate();
                queryClient.invalidateQueries({ queryKey: [REQUESTS_QUERY_KEY] });
            } catch (e) {
 console.error("Failed to update request status", e);
            }
            setAppointmentRequestId(null);
        }

        // Contextual toast based on conversion source
        if (wasLeadConversion) {
 addToast("Paciente criado e primeira sessão agendada com sucesso! ", "success");
        } else if (wasRequestApproval) {
 addToast("Sessão agendada e solicitação aprovada!", "success");
        } else {
 addToast(MESSAGES.APPOINTMENT_SAVED, "success");
        }
    };

    const handleAppointmentDelete = (sessionId: string) => {
        const session = globalSessions.find(s => s.id === sessionId);
        const p = patients.find(pat => pat.id === session?.patientId);
        if (p) {
            deleteSession(p.id, sessionId);
 addToast(MESSAGES.APPOINTMENT_DELETED, "success");
        }
    };

    const onConfirmDelete = async () => {
        if (!itemToDelete) return;
        const { type, id } = itemToDelete;

        const patient = patients.find(p => {
            if (type === 'patient') return p.id === id;
            if (type === 'session') {
                const session = globalSessions.find(s => s.id === id);
                return p.id === session?.patientId;
            }
            if (type === 'goal' && itemToDelete.patientId) return p.id === itemToDelete.patientId;
            return false;
        });

        if (patient) {
            try {
                if (type === 'patient') {
                    await executeDeletePatient(id);
                } else if (type === 'session') {
                    await executeDeleteSession(patient.id, id);
                } else if (type === 'goal') {
                    await executeDeleteGoal(patient.id, id);
                }
 addToast(MESSAGES.ITEM_DELETED(type === 'patient' ? 'Paciente' : type === 'session' ? 'Sessão' : 'Meta'), "success");
            } catch (error) {
 console.error("Failed to delete item", error);
 addToast("Erro ao excluir item. Tente novamente.", "error");
            }
        }

        setItemToDelete(null);
        closeModal('deleteConfirmation');
    };

    return (
        <Suspense fallback={<ModalLoadingFallback />}>
            <AddPatientModal
                isOpen={modals.addPatient}
                onClose={() => { closeModal('addPatient'); setPatientToEdit(null); setInitialPatientData(undefined); }}
                onSave={handleAddPatient}
                patientToEdit={patientToEdit}
                initialData={initialPatientData}
            />

            <AppointmentModal
                isOpen={modals.appointment}
                onClose={() => { closeModal('appointment'); setSchedulingRequestContext(null); setAppointmentRequestId(null); }}
                onSave={handleAppointmentSave}
                onDelete={handleAppointmentDelete}
                sessionToEdit={sessionToEdit}
                selectedDate={selectedDateForAppointment}
                patients={patients}
                initialPatientId={selectedPatientIdForAppointment || undefined}
                requestContext={schedulingRequestContext}
            />

            {selectedPatient && (
                <>
                    <SessionEditorModal
                        isOpen={modals.sessionEditor}
                        onClose={() => closeModal('sessionEditor')}
                        onSave={async (s: Session | Omit<Session, 'id'>, f: File[], expectedRevision?: number, forceOverride?: boolean) => {
                            return await saveSession(selectedPatient.id, s, f, expectedRevision, forceOverride) as any;
                        }}
                        onFinalize={async (s: Session | Omit<Session, 'id'>, f: File[], expectedRevision: number) => {
                            return await finalizeSessionTransactionally(selectedPatient.id, s, f, expectedRevision);
                        }}
                        sessionToEdit={sessionToEdit}
                        patient={selectedPatient}
                    />
                    <GoalEditorModal
                        isOpen={modals.goalEditor}
                        onClose={() => closeModal('goalEditor')}
                        onSave={async (g: Goal) => {
                            // Context wrapper handles toast and close
                            await saveGoal(selectedPatient.id, g);
                        }}
                        goalToEdit={goalToEdit}
                        patient={selectedPatient}
                        currentUser={currentUser}
                    />
                    <FeedbackEditorModal
                        isOpen={modals.feedbackEditor}
                        onClose={() => closeModal('feedbackEditor')}
                        onSave={async (f: InterventionFeedback) => {
                            if (interventionFeedbackContext) {
                                // Context wrapper handles toast and close
                                await saveInterventionFeedback(selectedPatient.id, interventionFeedbackContext.goalId, interventionFeedbackContext.interventionId, f);
                            }
                        }}
                        initialFeedback={interventionFeedbackContext?.feedback || null}
                    />
                    <AddDocumentModal
                        isOpen={modals.addDocument}
                        onClose={() => closeModal('addDocument')}
                        onSave={async (d: Omit<Document, 'id' | 'url' | 'uploadedAt'>, f: File) => {
                            // Context wrapper handles toast and close
                            await addDocument(selectedPatient.id, d, f);
                        }}
                    />
                </>
            )}

            <AddExpenseModal
                isOpen={modals.addExpense}
                onClose={() => { closeModal('addExpense'); setExpenseToEdit(null); }} // Reset on close
                onSuccess={() => {
                    // Refresh is now automatic via React Query
                }}
                expenseToEdit={expenseToEdit}
            />

            <ViewSessionNotesModal isOpen={modals.viewNotes} onClose={() => closeModal('viewNotes')} session={sessionToView} />
            <ViewLogDetailsModal isOpen={modals.viewLogDetails} onClose={() => closeModal('viewLogDetails')} sessionLogs={sessionLogsToView} />

            <DeleteConfirmationModal
                isOpen={modals.deleteConfirmation}
                onClose={() => closeModal('deleteConfirmation')}
                onConfirm={onConfirmDelete}
                title="Confirmar Exclusão"
                message="Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita."
            />
        </Suspense>
    );
};

export default ModalManager;
