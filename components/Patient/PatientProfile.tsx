
import React, { useState, useEffect } from 'react';
import type { Patient } from '@/types.ts';
import Button from '../Button.tsx';
import { formatBirthDate } from '@/utils/formatters.ts';
import { PencilIcon, EyeIcon, EyeOffIcon } from '../Icons';
import { Lock, ChevronDown, ChevronUp, Smartphone, Monitor, X, Trash2 } from 'lucide-react';
import { usePatientAuth } from '@/hooks/usePatientAuth';
import { usePrivacyMode } from '@/contexts/PrivacyContext';
import { useToast } from '@/contexts/ToastContext';
import { usePortalSessions, PortalSession } from '@/hooks/usePortalSessions';
import { usePatientContext } from '@/contexts/PatientContext.tsx';

const PatientLifecycleModal = React.lazy(() => import('./Modals/PatientLifecycleModal.tsx').then(module => ({ default: module.PatientLifecycleModal })));

interface PatientProfileProps {
    patient: Patient;
    canManage: boolean;
    onDeletePatient: () => void;
    onEditPatient?: () => void;
    onPatientUpdate?: (updates: Partial<Patient>) => void;
}

const PatientProfile: React.FC<PatientProfileProps> = ({ patient, canManage, onDeletePatient, onEditPatient, onPatientUpdate }) => {
    const { activateMagicLink, revokeAccess, regenerateMagicLink, loading } = usePatientAuth();
    const { getMaskedValue, isPrivacyMode, isFieldRevealed, revealField, hideField, togglePrivacyMode } = usePrivacyMode();
    const { addToast } = useToast();
    const { sessions, activeSessions, loading: sessionsLoading, fetchSessions, revokeSession, deleteSession } = usePortalSessions();
    const [showDevices, setShowDevices] = useState(false);
    const [showLifecycleModal, setShowLifecycleModal] = useState(false);
    const { updatePatient } = usePatientContext();

    const isDischarged = patient.status === 'discharged' || !!patient.closure_date;

    const handleDischarge = async (data: { closure_date: string; closure_reason: string; forwarding_notes: string }) => {
        if (onPatientUpdate) {
            onPatientUpdate({
                status: 'discharged',
                closure_date: data.closure_date,
                closure_reason: data.closure_reason,
                forwarding_notes: data.forwarding_notes
            });
        } else if (updatePatient) {
            await updatePatient(patient.id, {
                status: 'discharged',
                closure_date: data.closure_date,
                closure_reason: data.closure_reason,
                forwarding_notes: data.forwarding_notes
            });
        }
    };

    // Carregar sessões quando o portal estiver ativo
    useEffect(() => {
        if (patient.portalEnabled) {
            fetchSessions(patient.id);
        }
    }, [patient.portalEnabled, patient.id, fetchSessions]);
    
    // Helper to generate the magic link (versioned)
    const getMagicLink = () => {
        if (!patient || !patient.birthDate) return '';
        const version = patient.portalTokenVersion || 1;
        const tokenRaw = `${patient.id}:${patient.birthDate}:${version}`;
        const token = btoa(tokenRaw);
        return `${window.location.origin}/portal/login?token=${token}`;
    };

    const PrivacyField = ({ value, type, fieldKey, label }: { value: string | undefined, type: 'cpf' | 'phone' | 'email' | 'birthDate', fieldKey: string, label: string }) => {
        const revealed = isFieldRevealed(fieldKey);
        const displayValue = getMaskedValue(value, type, fieldKey);
        const isMasked = isPrivacyMode && !revealed && !!value;

        return (
            <div className=" text-foreground-muted ">
                <strong className=" text-on-surface block">{label}:</strong>
                <span
                    onClick={() => isMasked ? revealField(fieldKey) : isPrivacyMode ? hideField(fieldKey) : null}
                    className={`${isMasked ? 'cursor-pointer hover:text-indigo-500 transition-colors duration-200 font-mono tracking-wider' : ''}`}
                    title={isMasked ? 'Clique para revelar' : ''}
                >
                    {displayValue || 'N/A'}
                    {isMasked && <span className="ml-1.5 inline-flex items-center text-indigo-400"><Lock className="w-3 h-3" /></span>}
                </span>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="rounded-[32px] border border-border/40 bg-surface-container-lowest p-8 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <h3 className="text-xl font-black text-foreground uppercase tracking-tight">Perfil do Paciente</h3>
                        <button
                            onClick={togglePrivacyMode}
                            title={isPrivacyMode ? 'Revelar dados sensíveis' : 'Ocultar dados sensíveis (LGPD)'}
                            className={`p-2 rounded-xl transition-all duration-200 ${isPrivacyMode
                                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-800'
                                : ' text-foreground-muted  hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            {isPrivacyMode ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                        </button>
                    </div>
                    {canManage && onEditPatient && (
                        <Button variant="ghost" size="sm" onClick={onEditPatient} title="Editar">
                            <PencilIcon className="h-5 w-5 text-foreground-muted hover:text-blue-600 transition-colors" />
                        </Button>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                    <div className=" text-foreground-muted "><strong className=" text-on-surface block">Nome:</strong> {patient.name}</div>
                    <PrivacyField value={patient.cpf} type="cpf" fieldKey={`profile-cpf-${patient.id}`} label="CPF" />
                    <PrivacyField value={patient.birthDate ? formatBirthDate(patient.birthDate) : undefined} type="birthDate" fieldKey={`profile-birth-${patient.id}`} label="Nascimento" />
                    <PrivacyField value={patient.email} type="email" fieldKey={`profile-email-${patient.id}`} label="Email" />
                    <PrivacyField value={patient.phone} type="phone" fieldKey={`profile-phone-${patient.id}`} label="Telefone" />
                    <div className=" text-foreground-muted "><strong className=" text-on-surface block">Endereço:</strong> {patient.address || 'N/A'}</div>
                    <div className=" text-foreground-muted "><strong className=" text-on-surface block">Local Preferencial:</strong> {patient.defaultLocation || 'Não definido'}</div>
                    <div className=" text-foreground-muted "><strong className=" text-on-surface block">Consentimento Digital:</strong> {patient.consent ? "Sim" : "Não"}</div>
                    <div className=" text-foreground-muted "><strong className=" text-on-surface block">Tipo de Pagamento:</strong> {patient.paymentType === 'plano' ? 'Plano de Saúde' : 'Particular'}</div>
                    <div className=" text-foreground-muted "><strong className=" text-on-surface block">Valor Acordado:</strong> {patient.agreedPrice ? `R$ ${patient.agreedPrice.toFixed(2)}` : 'R$ 150,00 (Padrão)'}</div>
                    {patient.paymentType === 'plano' && (
                        <div className=" text-foreground-muted "><strong className=" text-on-surface block">Plano de Saúde:</strong> {patient.healthPlan || 'N/A'}</div>
                    )}
                    <div className=" text-foreground-muted col-span-1 md:col-span-2"><strong className=" text-on-surface block">Histórico Médico:</strong> <p className="mt-1 whitespace-pre-wrap break-words">{patient.medicalHistory || 'Nenhum histórico informado.'}</p></div>

                    <div className="col-span-1 md:col-span-2 mt-4 pt-4 border-t border-border/40 flex items-center justify-between">
                        <div>
                            <strong className="text-on-surface block">Cobrar Automático por Faltas</strong>
                            <p className="text-xs text-foreground-muted mt-1">Se ativado, sessões marcadas como "Faltou" gerarão fatura idêntico às sessões concluídas.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={!!patient.billing_settings?.charge_missed_sessions}
                                onChange={(e) => {
                                    if(onPatientUpdate) {
                                        onPatientUpdate({ 
                                            billing_settings: { 
                                                ...patient.billing_settings, 
                                                model: patient.billing_settings?.model || 'per_session',
                                                charge_missed_sessions: e.target.checked 
                                            } 
                                        });
                                        addToast('Política de cobrança atualizada.', 'success');
                                    }
                                }}
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                </div>
            </div>

            {/* Portal Access Section */}
            <div className="rounded-[32px] border border-border/40 bg-surface-container-lowest p-8 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-3">
                        Portal do Paciente
                        {patient.portalEnabled ? (
                            <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Ativo</span>
                        ) : (
                            <span className="inline-flex items-center rounded-full bg-surface px-2 py-1 text-xs font-medium text-foreground-muted ring-1 ring-inset ring-slate-500/10">Inativo</span>
                        )}
                    </h3>
                </div>
                <div className="space-y-4">
                    <p className="text-sm text-foreground-muted ">
                        O Portal do Paciente permite que seu cliente acesse conteúdos da biblioteca, visualize tarefas e acompanhe sua evolução.
                    </p>

                    {!patient.portalEnabled ? (
                        <div className="flex flex-col sm:flex-row gap-3 items-center">
                            <Button
                                onClick={async () => {
                                    if (!patient.birthDate) {
                                        addToast('O paciente precisa ter uma Data de Nascimento cadastrada para usar o Link Mágico.', 'warning');
                                        return;
                                    }
                                    const success = await activateMagicLink(patient.id);
                                    if (success && onPatientUpdate) {
                                        onPatientUpdate({ portalEnabled: true });
                                    }
                                }}
                                disabled={loading}
                                className="w-full sm:w-auto"
                            >
                                {loading ? 'Ativando...' : 'Ativar e Gerar Link Mágico'}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        readOnly
                                        value={getMagicLink()}
                                        className="w-full pl-4 pr-12 py-3 rounded-xl border border-border bg-surface dark:bg-slate-700 text-on-surface focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                                        onClick={(e) => (e.target as HTMLInputElement).select()}
                                    />
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(getMagicLink());
                                            addToast('Link mágico copiado!', 'success');
                                        }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-foreground-muted hover:text-indigo-600 transition-colors bg-surface dark:bg-slate-700 rounded-lg"
                                        title="Copiar Link"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <a
                                    href={`https://wa.me/${patient.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá, ${patient.name}. O link para acessar o seu ambiente seguro no Portal do Paciente Mentis é: ${getMagicLink()} \n\nAo entrar, confirme sua Data de Nascimento.`)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-green-700 bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
                                >
                                    Enviar por WhatsApp
                                </a>
                                <button
                                    onClick={async () => {
                                        const newVersion = await regenerateMagicLink(patient.id, patient.portalTokenVersion || 1);
                                        if (newVersion && onPatientUpdate) {
                                            onPatientUpdate({ portalTokenVersion: newVersion });
                                        }
                                    }}
                                    disabled={loading}
                                    className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50 disabled:opacity-50"
                                    title="Gera um novo link e invalida o anterior"
                                >
                                    <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    {loading ? 'Regenerando...' : 'Regenerar Link'}
                                </button>
                                <Button
                                    variant="danger"
                                    onClick={async () => {
                                        const success = await revokeAccess(patient.id);
                                        if (success && onPatientUpdate) {
                                            onPatientUpdate({ portalEnabled: false });
                                        }
                                    }}
                                    disabled={loading}
                                >
                                    {loading ? 'Revogando...' : 'Revogar Acesso'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                    {/* Dispositivos Registrados — Colapsável */}
                    {patient.portalEnabled && (
                        <div className="mt-6 pt-5 border-t border-border/40">
                            <button
                                onClick={() => setShowDevices(!showDevices)}
                                className="w-full flex items-center justify-between text-left group"
                            >
                                <div className="flex items-center gap-2">
                                    <Smartphone className="w-4 h-4 text-foreground-muted" />
                                    <span className="text-sm font-semibold text-on-surface">Dispositivos Registrados</span>
                                    <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                                        {activeSessions.length}/3 ativos
                                    </span>
                                </div>
                                {showDevices ? <ChevronUp className="w-4 h-4 text-foreground-muted" /> : <ChevronDown className="w-4 h-4 text-foreground-muted" />}
                            </button>

                            {showDevices && (
                                <div className="mt-4 space-y-3 animate-[fadeIn_200ms_ease-out]">
                                    {sessionsLoading ? (
                                        <div className="flex items-center justify-center py-4">
                                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-200 border-t-indigo-600"></div>
                                        </div>
                                    ) : sessions.length === 0 ? (
                                        <p className="text-sm text-foreground-muted text-center py-4">Nenhum dispositivo registrado ainda.</p>
                                    ) : (
                                        sessions.map((session) => (
                                            <div
                                                key={session.id}
                                                className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${
                                                    session.is_active
                                                        ? 'border-border/60 bg-surface hover:shadow-sm'
                                                        : 'border-border/20 bg-surface/50 opacity-60'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                                        session.is_active
                                                            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500'
                                                            : 'bg-slate-100 dark:bg-slate-800 text-foreground-muted'
                                                    }`}>
                                                        {session.device_name?.includes('iPhone') || session.device_name?.includes('Android') || session.device_name?.includes('iPad')
                                                            ? <Smartphone className="w-4 h-4" />
                                                            : <Monitor className="w-4 h-4" />
                                                        }
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-on-surface truncate">{session.device_name || 'Dispositivo'}</p>
                                                        <p className="text-xs text-foreground-muted">
                                                            {session.is_active ? 'Ativo' : 'Revogado'}
                                                            {' · '}
                                                            {new Date(session.last_active_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {session.is_active ? (
                                                        <button
                                                            onClick={async () => {
                                                                const success = await revokeSession(session.id);
                                                                if (success) {
                                                                    addToast('Dispositivo revogado.', 'success');
                                                                }
                                                            }}
                                                            disabled={sessionsLoading}
                                                            className="flex-shrink-0 p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                                                            title="Revogar este dispositivo"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={async () => {
                                                                const success = await deleteSession(session.id);
                                                                if (success) {
                                                                    addToast('Registro do dispositivo excluído.', 'success');
                                                                }
                                                            }}
                                                            disabled={sessionsLoading}
                                                            className="flex-shrink-0 p-1.5 rounded-lg text-foreground-muted hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                                                            title="Excluir permanentemente"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    )}
            </div>
            {canManage && (
                <div className="rounded-[32px] border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-8 shadow-sm">
                    <h3 className="text-xl font-black text-red-800 dark:text-red-400 uppercase tracking-tight">Zona de Perigo</h3>
                    <p className="mt-2 text-sm text-red-700 dark:text-red-300 opacity-80">
                        Ações definitivas para Alta Clínica, Transferência ou Exclusão do prontuário.
                    </p>
                    <div className="mt-5 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                        <Button variant="danger" onClick={() => setShowLifecycleModal(true)} className="w-full sm:w-auto font-bold px-6">
                            Opções de Encerramento
                        </Button>
                    </div>
                </div>
            )}

            {PatientLifecycleModal && (
                <React.Suspense fallback={null}>
                    <PatientLifecycleModal
                        isOpen={showLifecycleModal}
                        onClose={() => setShowLifecycleModal(false)}
                        patientName={patient.name}
                        onDischarge={handleDischarge}
                        onDelete={async (hardDelete) => {
                            // Let the modal handle the UX, we just call the prop action here.
                            if (typeof onDeletePatient === 'function') onDeletePatient();
                        }}
                    />
                </React.Suspense>
            )}
        </div>
    );
};

export default PatientProfile;
