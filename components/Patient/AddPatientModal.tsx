import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../Modal.tsx';
import Button from '../Button.tsx';
import { Input, Textarea, Checkbox } from '../Form.tsx';
import { PATIENT_STATUSES, type Patient, SESSION_TYPES } from '@/types.ts';
import { useToast } from '@/contexts/ToastContext.tsx';
import { useAuth } from '@/contexts/AuthContext.tsx';
import DeleteConfirmationModal from '../DeleteConfirmationModal.tsx';
import { LABELS } from '@/utils/mappers.ts';

// Hook Form e Zod
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { patientSchema, type PatientFormData } from '@/schemas/patientSchema.ts';
import { handleError } from '@/utils/errorHandler.ts';

interface AddPatientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (patient: Omit<Patient, 'id' | 'createdAt' | 'sessions' | 'documents' | 'goals' | 'insights'>) => Promise<void>;
    patientToEdit?: Patient | null;
    initialData?: Partial<PatientFormData>;
}

const INITIAL_STATE: PatientFormData = {
    name: '',
    displayName: '',
    cpf: '',
    email: '',
    phone: '',
    birthDate: '',
    medicalHistory: '',
    consent: false,
    paymentType: 'particular',
    healthPlan: '',
    agreedPrice: 150,
    photoUrl: undefined,
    status: 'active',
    address: '',
    defaultLocation: '',
    defaultModality: 'individual'
};

const AddPatientModal: React.FC<AddPatientModalProps> = ({ isOpen, onClose, onSave, patientToEdit, initialData }) => {
    const { addToast } = useToast();
    const { currentUser } = useAuth();
    const [showExitConfirmation, setShowExitConfirmation] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors, isSubmitting, isDirty }
    } = useForm<PatientFormData>({
        resolver: zodResolver(patientSchema) as any,
        mode: 'onBlur',
        defaultValues: INITIAL_STATE
    });

    const paymentType = watch('paymentType');
    const photoUrl = watch('photoUrl');

    useEffect(() => {
        if (isOpen) {
            if (patientToEdit) {
                reset({
                    name: patientToEdit.name || '',
                    displayName: (patientToEdit as any).displayName || '',
                    cpf: patientToEdit.cpf || '',
                    email: patientToEdit.email || '',
                    phone: patientToEdit.phone || '',
                    birthDate: patientToEdit.birthDate || '',
                    medicalHistory: patientToEdit.medicalHistory || '',
                    consent: patientToEdit.consent || false,
                    paymentType: patientToEdit.healthPlan ? 'plano' : 'particular',
                    healthPlan: patientToEdit.healthPlan || '',
                    agreedPrice: patientToEdit.agreedPrice || 150,
                    photoUrl: patientToEdit.photoUrl,
                    status: patientToEdit.status || 'active',
                    address: patientToEdit.address || '',
                    defaultLocation: patientToEdit.defaultLocation || '',
                    defaultModality: patientToEdit.defaultModality || 'individual'
                });
            } else if (initialData) {
                reset({ ...INITIAL_STATE, ...initialData });
            } else {
                reset(INITIAL_STATE);
            }
        } else {
            const timer = setTimeout(() => {
                reset(INITIAL_STATE);
                setShowExitConfirmation(false);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen, patientToEdit, initialData, reset]);

    const handleCloseAttempt = useCallback((e?: React.SyntheticEvent) => {
        if (e && e.stopPropagation) e.stopPropagation();

        if (isDirty) {
            setShowExitConfirmation(true);
        } else {
            onClose();
        }
    }, [isDirty, onClose]);

    const handleConfirmClose = () => {
        setShowExitConfirmation(false);
        onClose();
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setValue('photoUrl', reader.result as string, { shouldDirty: true });
            reader.readAsDataURL(file);
        }
    };

    const onSubmit = async (data: PatientFormData) => {
        try {
            await onSave({
                ...data,
                phone: data.phone || '',
                consent: data.consent || false,
                medicalHistory: data.medicalHistory || '',
                agreedPrice: Number(data.agreedPrice),
                healthPlan: data.paymentType === 'plano' ? data.healthPlan : undefined,
            });
            addToast(patientToEdit ? "Paciente atualizado com sucesso!" : "Paciente cadastrado com sucesso!", "success");
            onClose();
        } catch (error) {
            handleError(error, addToast, 'PAT-SAVE');
        }
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={handleCloseAttempt} title={patientToEdit ? "Editar Paciente" : "Adicionar Novo Paciente"}>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Photo Upload */}
                    <div>
                        <label className="block text-sm font-medium text-foreground-muted mb-2">Foto do Paciente</label>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                            <span className="inline-block h-12 w-12 flex-shrink-0 rounded-full overflow-hidden bg-background dark:bg-slate-700">
                                {photoUrl ? (
                                    <img src={photoUrl} alt="Preview" className="h-full w-full object-cover" />
                                ) : (
                                    <svg className="h-full w-full text-slate-300" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M24 20.993V24H0v-2.997A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                )}
                            </span>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoChange}
                                className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold bg-surface dark:file:bg-slate-700 text-foreground-muted dark:file:text-slate-300 hover:file:bg-slate-100 dark:hover:file:bg-slate-600"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Input 
                            label="Nome Completo *" 
                            {...register('name')} 
                            error={errors.name?.message} 
                        />
                        <Input 
                            label="Nome de Exibição (Portal)" 
                            {...register('displayName')} 
                            placeholder="Como o paciente quer ser chamado" 
                            error={errors.displayName?.message} 
                        />
                        <Input 
                            label="CPF *" 
                            {...register('cpf')} 
                            error={errors.cpf?.message} 
                        />
                        <div className="sm:col-span-2">
                            <Input 
                                label="Endereço Completo" 
                                {...register('address')} 
                                placeholder="Rua, Número, Bairro, CEP" 
                                error={errors.address?.message} 
                            />
                        </div>
                        <Input 
                            type="email" 
                            label="Email" 
                            {...register('email')} 
                            error={errors.email?.message} 
                        />
                        <Input 
                            type="tel" 
                            label="Telefone" 
                            {...register('phone')} 
                            error={errors.phone?.message} 
                        />
                        <Input 
                            type="date" 
                            label="Data de Nascimento *" 
                            {...register('birthDate')} 
                            error={errors.birthDate?.message} 
                        />
                        <div className="sm:col-span-1">
                            <Input 
                                type="number" 
                                label="Valor da Sessão (R$)" 
                                {...register('agreedPrice')} 
                                error={errors.agreedPrice?.message} 
                            />
                        </div>

                        <div className="sm:col-span-1">
                            <label htmlFor="defaultLocation" className="block text-xs font-medium text-on-surface-variant mb-1.5">Local Preferencial</label>
                            <select
                                id="defaultLocation"
                                {...register('defaultLocation')}
                                className="block w-full rounded-xl px-4 bg-surface-container-lowest text-on-surface outline-none focus:bg-surface focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed h-12 border border-border"
                            >
                                <option value="">Selecione...</option>
                                <option value="Consultório">Consultório</option>
                                <option value="Online">Online</option>
                                <option value="Domiciliar">Domiciliar</option>
                                {currentUser?.serviceLocations?.filter(l => l.active).map(l => (
                                    <option key={l.id} value={l.name}>{l.name}</option>
                                ))}
                            </select>
                            {errors.defaultLocation && <p className="mt-1 text-xs text-red-500">{errors.defaultLocation.message}</p>}
                        </div>

                        <div className="sm:col-span-1">
                            <label htmlFor="defaultModality" className="block text-xs font-medium text-on-surface-variant mb-1.5">Modalidade Padrão</label>
                            <select
                                id="defaultModality"
                                {...register('defaultModality')}
                                className="block w-full rounded-xl px-4 bg-surface-container-lowest text-on-surface outline-none focus:bg-surface focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed h-12 border border-border"
                            >
                                {SESSION_TYPES.map(t => (
                                    <option key={t} value={t}>{LABELS.SESSION_TYPE[t]}</option>
                                ))}
                            </select>
                            {errors.defaultModality && <p className="mt-1 text-xs text-red-500">{errors.defaultModality.message}</p>}
                        </div>

                        <div>
                            <label htmlFor="status" className="block text-xs font-medium text-on-surface-variant mb-1.5">Status</label>
                            <select
                                id="status"
                                {...register('status')}
                                className="block w-full rounded-xl px-4 bg-surface-container-lowest text-on-surface outline-none focus:bg-surface focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed h-12 border border-border"
                            >
                                <option value="active">Ativo</option>
                                <option value="inactive">Inativo</option>
                                <option value="archived">Arquivado</option>
                            </select>
                            {errors.status && <p className="mt-1 text-xs text-red-500">{errors.status.message}</p>}
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-foreground-muted mb-1">Tipo de Pagamento *</label>
                            <div className="flex items-center space-x-6 rounded-xl border border-border/60 p-2.5 bg-surface dark:bg-slate-700">
                                <div className="flex items-center">
                                    <input 
                                        id="particular" 
                                        type="radio" 
                                        value="particular" 
                                        {...register('paymentType')} 
                                        className="h-4 w-4 text-foreground-muted focus:ring-slate-500 border-border" 
                                    />
                                    <label htmlFor="particular" className="ml-2 block text-sm text-foreground-muted">Particular</label>
                                </div>
                                <div className="flex items-center">
                                    <input 
                                        id="plano" 
                                        type="radio" 
                                        value="plano" 
                                        {...register('paymentType')} 
                                        className="h-4 w-4 text-foreground-muted focus:ring-slate-500 border-border" 
                                    />
                                    <label htmlFor="plano" className="ml-2 block text-sm text-foreground-muted">Plano de Saúde</label>
                                </div>
                            </div>
                        </div>

                        {paymentType === 'plano' && (
                            <div className="sm:col-span-2">
                                <Input 
                                    label="Nome do Plano de Saúde *" 
                                    {...register('healthPlan')} 
                                    error={errors.healthPlan?.message} 
                                />
                            </div>
                        )}
                    </div>

                    <Textarea
                        label="Histórico Médico"
                        rows={3}
                        {...register('medicalHistory')}
                        placeholder="Alergias, medicamentos em uso, histórico familiar..."
                        error={errors.medicalHistory?.message}
                    />

                    <Checkbox
                        label="Consentimento Digital"
                        description="O paciente forneceu consentimento digital para o tratamento."
                        {...register('consent')}
                    />

                    <div className="flex justify-end space-x-3 pt-4">
                        <Button type="button" variant="secondary" onClick={handleCloseAttempt}>Cancelar</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Salvando..." : (patientToEdit ? "Salvar Alterações" : "Salvar Paciente")}
                        </Button>
                    </div>
                </form>
            </Modal>

            {showExitConfirmation && (
                <DeleteConfirmationModal
                    isOpen={showExitConfirmation}
                    onClose={() => setShowExitConfirmation(false)}
                    onConfirm={handleConfirmClose}
                    title="Descartar Alterações?"
                    message="Você tem dados preenchidos que não foram salvos. Se fechar agora, todas as informações serão perdidas."
                    confirmLabel="Sim, descartar"
                    cancelLabel="Continuar Editando"
                    variant="danger"
                />
            )}
        </>
    );
};

export default AddPatientModal;
