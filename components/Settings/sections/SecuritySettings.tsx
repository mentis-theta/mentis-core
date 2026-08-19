import React, { useState, useEffect } from 'react';
import { getErrorMessage } from '../../../utils/errorHandler';
import { useAuth } from '../../../contexts/AuthContext';
import { useCrypto } from '../../../contexts/CryptoContext';

import { Input } from '../../Form';
import Button from '../../Button';
import { User, Activity, AlertTriangle, Fingerprint, MapPin, Monitor, Smartphone, Globe, ShieldCheck, Mail, Save, Clock, ChevronRight, X, Shield, Lock, ExternalLink, QrCode, Key, CheckCircle2 } from 'lucide-react';
import DOMPurify from 'dompurify';
import { UAParser } from 'ua-parser-js';
import {
    changePassword,
    changeEmail,
    enrollMFA,
    challengeMFA,
    verifyMFA,
    unenrollMFA,
    listMFAFactors,
    listSessions,
    revokeOtherSessions,
    getCurrentSession
} from '../../../services/authService';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import SecurityOnboardingModal from '../../Onboarding/SecurityOnboardingModal';

export const SecuritySettings: React.FC = () => {
    const { currentUser, refreshUsers } = useAuth();
    const { masterKey } = useCrypto();
    const [isLoading, setIsLoading] = useState(false);
    const { addToast } = useToast();
    const confirm = useConfirm();
    const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);

    // Email & Password State
    const [securityData, setSecurityData] = useState({
        newEmail: '',
        oldPassword: '',
        newPassword: '',
        confirmNewPassword: ''
    });

    // MFA State
    const [mfaFactors, setMfaFactors] = useState<any[]>([]);
    const [mfaEnrollmentStep, setMfaEnrollmentStep] = useState<'idle' | 'showing-qr' | 'verifying'>('idle');
    const [mfaData, setMfaData] = useState<{
        factorId: string;
        qrCode: string;
        secret: string;
        challengeId: string;
    } | null>(null);
    const [verificationCode, setVerificationCode] = useState('');
    const [mfaError, setMfaError] = useState('');

    // Session State
    const [sessions, setSessions] = useState<any[]>([]);

    // Load MFA factors and Sessions on mount
    useEffect(() => {
        loadMFAFactors();
        loadSessions();
    }, []);

    const loadSessions = async () => {
        if (!currentUser) return;
        const history = await listSessions(currentUser.id);
        setSessions(history);
    };

    const handleRevokeOtherSessions = async () => {
        const isConfirmed = await confirm({
            title: "Desconectar Outras Sessões",
            message: "Deseja sair de todos os outros dispositivos? Você precisará fazer login novamente em outros locais.",
            confirmText: "Sair de Todos"
        });
        if (!isConfirmed) {
            return;
        }
        setIsLoading(true);
        try {
            const { error } = await revokeOtherSessions();
            if (error) {
                addToast('Erro ao desconectar sessões: ' + error.message, 'error');
            } else {
                addToast('Todas as outras sessões foram encerradas com sucesso.', 'success');
            }
        } catch (error: unknown) {
            addToast('Erro: ' + (error instanceof Error ? error.message : String(error)), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const loadMFAFactors = async () => {
        const { success, factors } = await listMFAFactors();
        if (success) {
            setMfaFactors(factors || []);

            // If there's an unverified factor, show it in the enrollment flow
            const unverifiedFactor = factors?.find((f: any) => f.status === 'unverified');
            if (unverifiedFactor) {
                // User has started enrollment but not completed it
                // We'll show them the option to remove it or continue
                // Found unverified factor
            }
        }
    };

    const handleEmailChange = async () => {
        if (!currentUser) return;
        if (!securityData.newEmail.includes('@')) {
            addToast('Email inválido', 'warning');
            return;
        }

        setIsLoading(true);
        try {
            const { success, error } = await changeEmail(currentUser.id, securityData.newEmail);
            if (success) {
                addToast('Email atualizado! Verifique sua caixa de entrada para confirmar a alteração.', 'success');
                setSecurityData(prev => ({ ...prev, newEmail: '' }));
                await refreshUsers();
            } else {
                addToast('Erro ao atualizar email: ' + error, 'error');
            }
        } catch (error: unknown) {
            addToast('Erro: ' + (error instanceof Error ? error.message : String(error)), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordChange = async () => {
        if (!currentUser || !masterKey) {
            addToast('Erro de segurança: Chave Mestra não disponível.', 'error');
            return;
        }
        if (securityData.newPassword !== securityData.confirmNewPassword) {
            addToast('As senhas não coincidem.', 'warning');
            return;
        }
        if (securityData.newPassword.length < 6) {
            addToast('A senha deve ter pelo menos 6 caracteres.', 'warning');
            return;
        }

        setIsLoading(true);
        try {
            const { success, error } = await changePassword(
                currentUser.email,
                securityData.oldPassword,
                securityData.newPassword,
                masterKey,
                currentUser.id
            );

            if (success) {
                addToast('Senha atualizada com sucesso!', 'success');
                setSecurityData(prev => ({
                    ...prev,
                    oldPassword: '',
                    newPassword: '',
                    confirmNewPassword: ''
                }));
            } else {
                addToast('Erro ao atualizar senha: ' + error, 'error');
            }
        } catch (error: unknown) {
            addToast('Erro: ' + (error instanceof Error ? error.message : String(error)), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // MFA Enrollment Flow
    const startMFAEnrollment = async () => {
        setIsLoading(true);
        setMfaError('');
        try {
            // Check if there's an existing unverified factor and remove it first
            const existingFactors = await listMFAFactors();
            if (existingFactors.success && existingFactors.factors) {
                const unverifiedFactor = existingFactors.factors.find((f: any) => f.status === 'unverified');
                if (unverifiedFactor) {
                    await unenrollMFA(unverifiedFactor.id);
                }
            }

            const result = await enrollMFA();
            if (result.success && result.factorId && result.qrCode && result.secret) {
                setMfaData({
                    factorId: result.factorId,
                    qrCode: result.qrCode,
                    secret: result.secret,
                    challengeId: ''
                });
                setMfaEnrollmentStep('showing-qr');
            } else {
                setMfaError(result.error || 'Falha ao iniciar 2FA');
            }
        } catch (error: unknown) {
            setMfaError(error instanceof Error ? error.message : String(error));
        } finally {
            setIsLoading(false);
        }
    };

    const verifyMFAEnrollment = async () => {
        if (!mfaData || !verificationCode) return;

        setIsLoading(true);
        setMfaError('');
        try {
            // Create challenge
            const challengeResult = await challengeMFA(mfaData.factorId);
            if (!challengeResult.success || !challengeResult.challengeId) {
                setMfaError(challengeResult.error || 'Falha ao criar desafio');
                setIsLoading(false);
                return;
            }

            // Verify code
            const verifyResult = await verifyMFA(
                mfaData.factorId,
                challengeResult.challengeId,
                verificationCode
            );

            if (verifyResult.success) {
                addToast('2FA ativado com sucesso! Sua conta agora está mais segura.', 'success');
                setMfaEnrollmentStep('idle');
                setMfaData(null);
                setVerificationCode('');
                await loadMFAFactors();
            } else {
                setMfaError(verifyResult.error || 'Código inválido');
            }
        } catch (error: unknown) {
            setMfaError(error instanceof Error ? error.message : String(error));
        } finally {
            setIsLoading(false);
        }
    };

    const handleUnenrollMFA = async (factorId: string) => {
        const isConfirmed = await confirm({
            title: "Desativar 2FA",
            message: "Tem certeza que deseja desativar 2FA? Sua conta ficará menos segura.",
            confirmText: "Desativar"
        });
        if (!isConfirmed) {
            return;
        }

        setIsLoading(true);
        try {
            const result = await unenrollMFA(factorId);
            if (result.success) {
                addToast('2FA desativado.', 'success');
                await loadMFAFactors();
            } else {
                addToast('Erro ao desativar 2FA: ' + result.error, 'error');
            }
        } catch (error: unknown) {
            addToast('Erro: ' + (error instanceof Error ? error.message : String(error)), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const cancelEnrollment = () => {
        setMfaEnrollmentStep('idle');
        setMfaData(null);
        setVerificationCode('');
        setMfaError('');
    };

    const hasMFA = mfaFactors.filter((f: any) => f.status === 'verified').length > 0;
    const hasUnverifiedFactors = mfaFactors.filter((f: any) => f.status === 'unverified').length > 0;

    return (
        <div className="space-y-6">
            {/* Email & Password Section */}
            <div className="bg-surface-container-lowest p-6 rounded-[32px] border border-border/40 dark:border-white/10 shadow-sm space-y-8">
                <h3 className="text-[13px] font-black text-foreground uppercase tracking-tight mb-2 flex items-center gap-2">
                    <Key className="w-4 h-4 text-primary/60" />
                    Credenciais de Login
                </h3>
                <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mb-6 opacity-70">Gerencie seu endereço de email e senha de acesso.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {/* Alterar Email */}
                    <div className="space-y-4">
                        <h4 className="text-[11px] font-black text-foreground uppercase tracking-wider mb-4 border-b border-border/40 pb-2">Alterar Email</h4>
                        <Input
                            id="newEmail"
                            label="Novo Email"
                            type="email"
                            value={securityData.newEmail}
                            onChange={(e) => setSecurityData(prev => ({ ...prev, newEmail: e.target.value }))}
                            placeholder="exemplo@email.com"
                        />
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleEmailChange}
                            disabled={isLoading || !securityData.newEmail}
                            className="w-full"
                        >
                            Atualizar Email
                        </Button>
                    </div>

                    {/* Alterar Senha */}
                    <div className="space-y-4">
                        <h4 className="text-[11px] font-black text-foreground uppercase tracking-wider mb-4 border-b border-border/40 pb-2">Alterar Senha</h4>
                        <Input
                            id="oldPassword"
                            label="Senha Atual"
                            type="password"
                            value={securityData.oldPassword}
                            onChange={(e) => setSecurityData(prev => ({ ...prev, oldPassword: e.target.value }))}
                        />
                        <Input
                            id="newPassword"
                            label="Nova Senha"
                            type="password"
                            value={securityData.newPassword}
                            onChange={(e) => setSecurityData(prev => ({ ...prev, newPassword: e.target.value }))}
                        />
                        <Input
                            id="confirmNewPassword"
                            label="Confirmar Nova Senha"
                            type="password"
                            value={securityData.confirmNewPassword}
                            onChange={(e) => setSecurityData(prev => ({ ...prev, confirmNewPassword: e.target.value }))}
                        />
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handlePasswordChange}
                            disabled={isLoading || !securityData.oldPassword || !securityData.newPassword}
                            className="w-full"
                        >
                            Atualizar Senha
                        </Button>
                    </div>
                </div>
            </div>

            {/* Cofre E2EE Section */}
            <div className="bg-surface-container-lowest p-6 rounded-[32px] border border-border/40 dark:border-white/10 shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-[13px] font-black text-foreground uppercase tracking-tight mb-2 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            Cofre de Dados (E2EE)
                        </h3>
                        <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest opacity-70">
                            Gerencie sua chave de criptografia de ponta-a-ponta
                        </p>
                    </div>
                    <Button
                        variant="secondary"
                        onClick={() => setIsRecoveryModalOpen(true)}
                        className="shrink-0"
                    >
                        Atualizar Código de Recuperação
                    </Button>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100/60 dark:border-emerald-800">
                    <p className="text-sm text-emerald-800 dark:text-emerald-200">
                        Seu cofre está ativado e blindado. Mantenha seu Código de Recuperação em local seguro. Se você perder a senha e o código, seus dados serão perdidos.
                    </p>
                </div>
            </div>

            {/* MFA Section */}
            <div className="bg-surface-container-lowest p-6 rounded-[32px] border border-border/40 dark:border-white/10 shadow-sm space-y-6">
                <h3 className="text-[13px] font-black text-foreground uppercase tracking-tight mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary/60" />
                    Autenticação de Dois Fatores (2FA)
                </h3>
                <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mb-6 opacity-70">Adicione uma camada extra de proteção à sua conta.</p>

                {/* MFA Status */}
                {hasMFA ? (
                    <div className="mb-6 p-5 bg-green-500/5 dark:bg-green-500/10 border border-green-500/20 rounded-[28px]">
                        <div className="flex items-start gap-4">
                            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm font-black text-green-800 dark:text-green-200 uppercase tracking-tight">
                                    2FA Ativado
                                </p>
                                <p className="text-[11px] text-green-700/80 dark:text-green-300/80 mt-1">
                                    Sua conta está protegida com autenticação de dois fatores.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="mb-6 p-5 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-[28px]">
                        <div className="flex items-start gap-4">
                            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm font-black text-amber-800 dark:text-amber-200 uppercase tracking-tight">
                                    2FA Desativado
                                </p>
                                <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80 mt-1">
                                    Recomendamos ativar 2FA para maior segurança.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Enrollment Flow */}
                {mfaEnrollmentStep === 'idle' && !hasMFA && (
                    <div className="space-y-4">
                        {/* Show unverified factors that need to be removed */}
                        {hasUnverifiedFactors && (
                            <div className="mb-4 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                                            Enrollment Incompleto Detectado
                                        </p>
                                        <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                                            Você tem um enrollment 2FA não finalizado. Remova-o abaixo antes de criar um novo.
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-3 space-y-2">
                                    {mfaFactors.filter((f: any) => f.status === 'unverified').map((factor: any) => (
                                        <div
                                            key={factor.id}
                                            className="flex items-center justify-between p-3 bg-surface rounded border border-orange-200 dark:border-orange-700"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Smartphone className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                                <div>
                                                    <p className="text-sm font-medium text-on-surface ">
                                                        {factor.friendly_name || 'Autenticador'}
                                                    </p>
                                                    <p className="text-xs text-orange-600 dark:text-orange-400">
                                                        Status: Não verificado
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="danger"
                                                onClick={() => handleUnenrollMFA(factor.id)}
                                                disabled={isLoading}
                                                className="text-xs"
                                            >
                                                Remover
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <p className="text-sm text-foreground-muted ">
                            A autenticação de dois fatores adiciona uma camada extra de segurança à sua conta.
                            Você precisará de um aplicativo autenticador como Google Authenticator ou Authy.
                        </p>
                        <Button
                            type="button"
                            variant="primary"
                            onClick={startMFAEnrollment}
                            disabled={isLoading || hasUnverifiedFactors}
                            className="flex items-center gap-2"
                        >
                            <Smartphone className="w-4 h-4" />
                            Ativar 2FA
                        </Button>
                        {hasUnverifiedFactors && (
                            <p className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5" /> Remova o enrollment incompleto acima antes de ativar 2FA
                            </p>
                        )}
                    </div>
                )}

                {/* QR Code Display */}
                {mfaEnrollmentStep === 'showing-qr' && mfaData && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="text-sm font-semibold text-on-surface ">
                                Escaneie o QR Code
                            </h4>
                            <button
                                onClick={cancelEnrollment}
                                className=" text-foreground-muted hover:text-slate-600 dark:hover:text-slate-300"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className=" bg-surface p-4 rounded-lg border border-border ">
                            <div className="flex justify-center">
                                <div className="bg-white p-4 rounded-xl border border-border inline-block shadow-sm"
                                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(mfaData.qrCode) }}
                                />
                            </div>
                        </div>

                        <div className=" bg-surface p-3 rounded border border-border ">
                            <p className="text-xs text-foreground-muted mb-1">
                                Não consegue escanear? Digite manualmente:
                            </p>
                            <code className="text-xs font-mono text-on-surface dark:text-slate-100 break-all">
                                {mfaData.secret}
                            </code>
                        </div>

                        <div className="space-y-3">
                            <Input
                                id="verificationCode"
                                label="Código de Verificação (6 dígitos)"
                                type="text"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="000000"
                                maxLength={6}
                            />
                            {mfaError && (
                                <div className="flex items-center gap-2 px-1 py-1 animate-[fadeIn_200ms_ease-out]">
                                    <div className="h-1.5 w-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
                                    <p className="text-sm font-medium text-rose-600/90 dark:text-rose-400/90 leading-tight">
                                        {getErrorMessage(mfaError, 'SEC-MFA')}
                                    </p>
                                </div>
                            )}
                            <Button
                                type="button"
                                variant="primary"
                                onClick={verifyMFAEnrollment}
                                disabled={isLoading || verificationCode.length !== 6}
                                className="w-full"
                            >
                                Verificar e Ativar 2FA
                            </Button>
                        </div>
                    </div>
                )}

                {/* Active Factors List */}
                {hasMFA && (
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-on-surface ">
                            Dispositivos Autenticadores
                        </h4>
                        {mfaFactors.map((factor) => (
                            <div
                                key={factor.id}
                                className="flex items-center justify-between p-4 bg-surface rounded-lg border border-border "
                            >
                                <div className="flex items-center gap-3">
                                    <Smartphone className="w-5 h-5 text-foreground-muted " />
                                    <div>
                                        <p className="text-sm font-medium text-on-surface ">
                                            {factor.friendly_name || 'Autenticador'}
                                        </p>
                                        <p className="text-xs text-foreground-muted ">
                                            Status: {factor.status === 'verified' ? 'Ativo' : factor.status}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="danger"
                                    onClick={() => handleUnenrollMFA(factor.id)}
                                    disabled={isLoading}
                                    className="text-sm"
                                >
                                    Remover
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Session Management Section (Banking Level Security) */}
            <div className="bg-surface-container-lowest p-6 rounded-[32px] border border-border/40 dark:border-white/10 shadow-sm space-y-6">
                <h3 className="text-[13px] font-black text-foreground uppercase tracking-tight mb-2 flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-primary/60" />
                    Sessões Ativas
                </h3>
                <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mb-6 opacity-70">Gerencie os dispositivos onde sua conta está conectada.</p>

                <div className="space-y-6">
                    <div className="p-5 bg-primary/5 border border-primary/10 rounded-[28px] flex items-center justify-between gap-6">
                        <div>
                            <h4 className="text-sm font-black text-primary uppercase tracking-tight leading-tight">
                                Dispositivos Conectados
                            </h4>
                            <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mt-1 opacity-70">
                                Se notar algo suspeito, desconecte tudo imediatamente.
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="danger"
                            onClick={handleRevokeOtherSessions}
                            disabled={isLoading}
                            className="text-xs whitespace-nowrap"
                        >
                            Encerrar Outras Sessões
                        </Button>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-sm font-medium text-on-surface ">
                            Histórico de Login Recente
                        </h4>
                        {sessions.length === 0 ? (
                            <p className="text-sm text-foreground-muted ">Nenhum histórico recente.</p>
                        ) : (
                            <div className="space-y-3">
                                {sessions.map((session, index) => {
                                    const parser = new UAParser(session.details?.userAgent || '');
                                    const browser = parser.getBrowser();
                                    const os = parser.getOS();
                                    const device = parser.getDevice();
                                    const isCurrent = session.details?.userAgent === navigator.userAgent;

                                    return (
                                        <div key={index} className="flex items-center justify-between p-4 bg-surface/50 dark:bg-slate-700/20 rounded-3xl border border-border/40">
                                            <div className="flex items-center gap-4">
                                                {device.type === 'mobile' ? (
                                                    <Smartphone className="w-5 h-5 text-primary/60" />
                                                ) : (
                                                    <Monitor className="w-5 h-5 text-primary/60" />
                                                )}
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-black text-foreground uppercase tracking-tight">
                                                            {browser.name} no {os.name}
                                                        </p>
                                                        {isCurrent && (
                                                            <span className="text-[10px] bg-green-500/10 text-green-700 px-2.5 py-0.5 rounded-full font-black uppercase tracking-widest">
                                                                Atual
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mt-0.5 opacity-60">
                                                        {session.ip_address} • {new Date(session.created_at).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {isRecoveryModalOpen && (
                <SecurityOnboardingModal
                    isOpen={true}
                    skipCount={0}
                    onComplete={() => {
                        setIsRecoveryModalOpen(false);
                        refreshUsers();
                    }}
                    onSkip={() => {
                        setIsRecoveryModalOpen(false);
                    }}
                />
            )}
        </div>
    );
};
