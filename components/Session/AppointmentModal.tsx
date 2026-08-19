
import React, { useState, useEffect, useMemo } from 'react';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import type { Patient, Session, AppointmentSessionData, SchedulingRequest } from '@/types';
import { SESSION_TYPES, SESSION_STATUSES } from '@/types';
import { getLocalDateTimeString } from '@/utils/formatters';
import { WhatsappIcon, GoogleCalendarIcon, TrashIcon } from '@/components/Icons';
import { LABELS } from '@/utils/mappers';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import { useAuth } from '@/contexts/AuthContext';
import { LOCATIONS, PAYMENT_TYPES } from '@/utils/constants';
import { getPlainTextFromSession } from '@/components/Session/RichTextRenderer';
import WhatsAppActions from '@/components/Patient/WhatsAppActions';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useGlobalSessions } from '@/hooks/useGlobalSessions';

interface AppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (session: AppointmentSessionData | AppointmentSessionData[]) => void;
    onDelete: (sessionId: string) => void;
    sessionToEdit?: Session | null;
    selectedDate?: Date | null;
    patients: Patient[];
    initialPatientId?: string;
    requestContext?: SchedulingRequest | null;
}

const AppointmentModal: React.FC<AppointmentModalProps> = ({ isOpen, onClose, onSave, onDelete, sessionToEdit, selectedDate, patients, initialPatientId, requestContext }) => {
    const { currentUser } = useAuth();
    const confirm = useConfirm();
    const { globalSessions } = useGlobalSessions();
    const [patientId, setPatientId] = useState('');
    const [date, setDate] = useState('');
    const [duration, setDuration] = useState(50);
    const [price, setPrice] = useState(150);
    const [sessionType, setSessionType] = useState<typeof SESSION_TYPES[number]>('individual');
    const [status, setStatus] = useState<Session['status']>('scheduled');
    const [notes, setNotes] = useState('');
    const [paymentType, setPaymentType] = useState('particular'); // Analytics 2.0
    const [location, setLocation] = useState('Consultório');      // Analytics 2.0
    const [showExitConfirmation, setShowExitConfirmation] = useState(false);

    // Recurrence State
    const [recurrenceType, setRecurrenceType] = useState<'none' | 'weekly' | 'biweekly'>('none');
    const [recurrenceCount, setRecurrenceCount] = useState(4);

    const isEditing = !!sessionToEdit;
    const isLeadContext = !!requestContext && !isEditing;

    // ... (keep usage of memoized patients)
    const sortedPatients = useMemo(() => {
        return [...patients].sort((a, b) => a.name.localeCompare(b.name));
    }, [patients]);


    // Reset fields including recurrence
    useEffect(() => {
        if (isOpen) {
            setRecurrenceType('none');
            setRecurrenceCount(4);
            if (sessionToEdit) {
                // ... (existing edit logic)
                // Fix: Try to get id directly, fallback to search
                const directPid = 'patientId' in sessionToEdit ? (sessionToEdit as Session & { patientId?: string }).patientId : undefined;
                const p = directPid
                    ? patients.find(pat => pat.id === directPid)
                    : patients.find(pat => pat.id === globalSessions.find(gs => gs.id === sessionToEdit.id)?.patientId);

                setPatientId(p?.id || '');
                setDate(sessionToEdit.date.slice(0, 16));
                setDuration(sessionToEdit.duration);
                setPrice(sessionToEdit.price);
                setSessionType(sessionToEdit.sessionType);
                setStatus(sessionToEdit.status || 'scheduled');
                setNotes(getPlainTextFromSession(sessionToEdit.notes));
                // Analytics 2.0
                setPaymentType(sessionToEdit.paymentType || 'particular');
                setLocation(sessionToEdit.location || 'Consultório');
            } else {
                // ... (existing new logic)
                setPatientId(initialPatientId || '');
                const defaultDate = requestContext ? new Date(requestContext.requestedTime) : (selectedDate ? selectedDate : new Date());
                setDate(getLocalDateTimeString(defaultDate));
                setDuration(50);
                setPrice(150);
                setSessionType('individual');
                setStatus('scheduled');
                setNotes(requestContext?.notes || '');
                setPaymentType('particular');
                setLocation('Consultório');
                // Fix: Explicitly reset recurrence state to avoid zombie data
                setRecurrenceType('none');
                setRecurrenceCount(4);
            }
        }
    }, [isOpen, sessionToEdit, selectedDate, patients, initialPatientId, requestContext]);

    // ... (Keep existing price effect and hasUnsavedChanges logic - simplified for brevity or assume kept by diff)
    // ...

    const generateId = () => Math.random().toString(36).substr(2, 9);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Skip patientId check if it's a lead Context
        if (!isLeadContext && !patientId) return;
        if (!date) return;

        // Base Session Data
        const baseSession = {
            ...(sessionToEdit || {}),
            date: new Date(date).toISOString(),
            duration,
            sessionType,
            status,
            notes,
            attachments: sessionToEdit?.attachments || [],
            tags: sessionToEdit?.tags || [],
            paymentStatus: sessionToEdit?.paymentStatus || 'pending',
            price: price,
            goalIds: sessionToEdit?.goalIds || [],
            patientId,
            // Analytics 2.0
            location,
            paymentType,
            modality: sessionType // Map sessionType to modality for now, or let user pick separate? 
            // Plan said: Modality Options: 'Individual', 'Casal', 'Grupo'. This matches sessionType. So we can sync them.
        };

        if (recurrenceType === 'none' || isEditing) {
            // Single Save
            onSave(baseSession as AppointmentSessionData);
        } else {
            // Bulk Save
            const sessionsToCreate = [];
            let currentDateObj = new Date(date);
            const seriesId = generateId();

            for (let i = 0; i < recurrenceCount; i++) {
                sessionsToCreate.push({
                    ...baseSession,
                    date: currentDateObj.toISOString(),
                    recurrenceId: seriesId
                });

                // Increment Date
                if (recurrenceType === 'weekly') {
                    currentDateObj.setDate(currentDateObj.getDate() + 7);
                } else if (recurrenceType === 'biweekly') {
                    currentDateObj.setDate(currentDateObj.getDate() + 14);
                }
            }
            onSave(sessionsToCreate as AppointmentSessionData[]);
        }

        onClose();
    };

    const labelClass = "block text-xs font-medium  text-foreground-muted    mb-1.5";
    const baseInputClass = "block w-full rounded-xl px-4  bg-surface  dark:bg-slate-700  text-on-surface     text-foreground-muted  outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-border ";
    const inputClass = `${baseInputClass} h-12`;
    const textareaClass = `${baseInputClass} min-h-[120px] py-3`;

    const handleCloseAttempt = () => {
        if (notes !== (sessionToEdit?.notes || '') || date !== (sessionToEdit?.date || '')) {
            setShowExitConfirmation(true);
        } else {
            onClose();
        }
    };

    const handleDelete = async () => {
        if (sessionToEdit) {
            const isConfirmed = await confirm({
                title: "Excluir Agendamento?",
                message: "Tem certeza que deseja excluir este agendamento?",
                confirmText: "Sim, excluir"
            });
            if (isConfirmed) {
                onDelete(sessionToEdit.id);
                onClose();
            }
        }
    };

    const handleConfirmClose = () => {
        setShowExitConfirmation(false);
        onClose();
    };

    // Analytics 2.0: Auto-select location based on Patient preference
    useEffect(() => {
        if (patientId && !isEditing) { // Only auto-set for new appointments
            const p = patients.find(pat => pat.id === patientId);
            if (p) {
                if (p.defaultLocation) setLocation(p.defaultLocation);
                if (p.defaultModality) setSessionType(p.defaultModality as typeof SESSION_TYPES[number]);
                if (p.paymentType) setPaymentType(p.paymentType);
                if (p.agreedPrice) setPrice(p.agreedPrice);
            }
        }
    }, [patientId, patients, isEditing]);

    // ... (Keep existing layout until recurrence field)

    return (
        <>
            <Modal isOpen={isOpen} onClose={handleCloseAttempt} title={isEditing ? "Editar Agendamento" : "Novo Agendamento"}>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Section 1: Patient & Actions */}
                    <div className=" bg-surface dark:bg-slate-700/30 p-4 rounded-xl border border-border ">
                        <label htmlFor="patient" className={labelClass}>Paciente</label>
                        <div className="flex gap-3 items-start mt-1">
                            <div className="flex-grow relative">
                                {isLeadContext ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            disabled
                                            value={requestContext.patientName}
                                            className={`${inputClass} !bg-background !text-foreground-muted  font-medium`}
                                        />
                                        <span className="shrink-0 text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-medium tracking-wide border border-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800">
                                            Novo Paciente
                                        </span>
                                    </div>
                                ) : (
                                    <select
                                        id="patient"
                                        value={patientId}
                                        onChange={e => setPatientId(e.target.value)}
                                        className={inputClass}
                                        required={!isLeadContext}
                                        disabled={isEditing && !!patientId}
                                    >
                                        <option value="" disabled>Selecione um paciente...</option>
                                        {sortedPatients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                )}
                            </div>
                            {/* WhatsApp Action Button - Fixed Width */}
                            <div className="flex-none pt-[1px]">
                                {patientId && !isLeadContext ? (
                                    <WhatsAppActions
                                        patient={patients.find(p => p.id === patientId)!}
                                        currentUser={currentUser}
                                        sessionTarget={sessionToEdit || {
                                            id: 'temp',
                                            date: new Date(date).toISOString(),
                                            duration,
                                            sessionType,
                                            status: 'scheduled',
                                            notes: '',
                                            attachments: [],
                                            tags: [],
                                            paymentStatus: 'pending',
                                            price,
                                            goalIds: []
                                        } as Session}
                                    />
                                ) : (
                                    <div className="w-[110px]"></div> // Placeholder spacer
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Session Details Grid */}
                    <div className="grid grid-cols-12 gap-4">
                        {/* Date - Col 6 */}
                        <div className="col-span-12 sm:col-span-6">
                            <label htmlFor="date" className={labelClass}>Data e Hora</label>
                            <input type="datetime-local" id="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} required />
                        </div>

                        {/* Duration - Col 3 */}
                        <div className="col-span-6 sm:col-span-3">
                            <label htmlFor="duration" className={labelClass}>Duração (min)</label>
                            <input type="number" id="duration" value={duration} onChange={e => setDuration(Number(e.target.value))} className={inputClass} required />
                        </div>
                        {/* Status - Col 3 */}
                        <div className="col-span-6 sm:col-span-3">
                            <label htmlFor="status" className={labelClass}>Status</label>
                            <select id="status" value={status} onChange={e => setStatus(e.target.value as Session['status'])} className={inputClass}>
                                {SESSION_STATUSES.map(s => <option key={s} value={s}>{LABELS.SESSION_STATUS[s]}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Section 3: Professional & Financial Details */}
                    <div className="grid grid-cols-12 gap-4">
                        {/* Location - Col 4 */}
                        <div className="col-span-12 sm:col-span-4">
                            <label htmlFor="location" className={labelClass}>Local</label>
                            <select id="location" value={location} onChange={e => setLocation(e.target.value)} className={inputClass}>
                                {Array.from(new Set([
                                    ...LOCATIONS,
                                    ...(currentUser?.serviceLocations?.filter(l => l.active).map(l => l.name) || [])
                                ])).map(loc => (
                                    <option key={loc} value={loc}>{loc}</option>
                                ))}
                                <option value="Outro">Outro</option>
                            </select>
                        </div>

                        {/* Modality - Col 4 */}
                        <div className="col-span-6 sm:col-span-4">
                            <label htmlFor="type" className={labelClass}>Modalidade</label>
                            <select id="type" value={sessionType} onChange={e => setSessionType(e.target.value as typeof SESSION_TYPES[number])} className={inputClass}>
                                {SESSION_TYPES.map(t => <option key={t} value={t}>{LABELS.SESSION_TYPE[t]}</option>)}
                            </select>
                        </div>

                        {/* Price - Col 4 */}
                        <div className="col-span-6 sm:col-span-4">
                            <label htmlFor="price" className={labelClass}>Valor (R$)</label>
                            <input type="number" id="price" step="0.01" value={price} onChange={e => setPrice(Number(e.target.value))} className={inputClass} required />
                        </div>
                    </div>

                    {/* Section 4: Payment Type & Recurrence Row */}
                    <div className="grid grid-cols-12 gap-4 items-end">
                        <div className="col-span-12 sm:col-span-5">
                            <label htmlFor="paymentType" className={labelClass}>Forma de Pagamento</label>
                            <select id="paymentType" value={paymentType} onChange={e => setPaymentType(e.target.value)} className={inputClass}>
                                {PAYMENT_TYPES.map(pt => (
                                    <option key={pt.value} value={pt.value}>{pt.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Recurrence Block - Inline */}
                        <div className="col-span-12 sm:col-span-7 bg-surface p-2 rounded-xl border border-border/60 flex gap-3 items-center">
                            <div className="flex-1">
                                <label className="text-xs font-medium text-foreground-muted uppercase mb-1 block">Repetir</label>
                                <select value={recurrenceType} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRecurrenceType(e.target.value as 'none' | 'weekly' | 'biweekly')} className={`${inputClass} !mt-0 text-sm`}>
                                    <option value="none">Nunca</option>
                                    <option value="weekly">Semanal (7 dias)</option>
                                    <option value="biweekly">Quinzenal (14 dias)</option>
                                </select>
                            </div>
                            {recurrenceType !== 'none' && (
                                <div className="w-20">
                                    <label className="text-xs font-medium text-foreground-muted uppercase mb-1 block">Vezes</label>
                                    <input type="number" min="2" max="52" value={recurrenceCount} onChange={e => setRecurrenceCount(Number(e.target.value))} className={`${inputClass} !mt-0 text-sm`} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Section 5: Notes */}
                    <div>
                        <label htmlFor="notes" className={labelClass}>Observações</label>
                        <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} className={textareaClass} placeholder="Detalhes adicionais sobre o agendamento..." />
                    </div>

                    {/* Standard Footer */}
                    <div className="flex justify-between items-center pt-6 mt-6 border-t border-border ">
                        <div>
                            {isEditing && (
                                <button type="button" onClick={handleDelete} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium flex items-center px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                                    <TrashIcon className="h-4 w-4 mr-1.5" /> Excluir Agendamento
                                </button>
                            )}
                        </div>
                        <div className="flex space-x-3">
                            <Button type="button" variant="secondary" onClick={handleCloseAttempt}>Cancelar</Button>
                            <Button type="submit">Salvar</Button>
                        </div>
                    </div>
                </form>
            </Modal>

            {
                showExitConfirmation && (
                    <DeleteConfirmationModal
                        isOpen={showExitConfirmation}
                        onClose={() => setShowExitConfirmation(false)}
                        onConfirm={handleConfirmClose}
                        title="Descartar Agendamento?"
                        message="Você tem dados não salvos."
                        confirmLabel="Sim, descartar"
                        cancelLabel="Continuar Editando"
                        variant="danger"
                    />
                )
            }
        </>
    );
};

export default AppointmentModal;
