import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/services/supabaseClient';
import Button from '../Button';
import { useToast } from '@/contexts/ToastContext';
import { Fingerprint, KeyRound, X, ChevronRight } from 'lucide-react';

interface PortalSetupAuthProps {
    patientId: string;
    onComplete: () => void;
    onSkip: () => void;
}

// Helper: SHA-256 hash de um PIN string
async function hashPin(pin: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const PortalSetupAuth: React.FC<PortalSetupAuthProps> = ({ patientId, onComplete, onSkip }) => {
    const [mode, setMode] = useState<'choose' | 'pin' | 'biometric'>('choose');
    const [pin, setPin] = useState(['', '', '', '']);
    const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
    const [step, setStep] = useState<'enter' | 'confirm'>('enter');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [biometricSupported, setBiometricSupported] = useState(false);
    const { addToast } = useToast();
    const pinRefs = useRef<(HTMLInputElement | null)[]>([]);
    const confirmPinRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Verificar suporte a WebAuthn
    useEffect(() => {
        if (window.PublicKeyCredential) {
            PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
                .then(available => setBiometricSupported(available))
                .catch(() => setBiometricSupported(false));
        }
    }, []);

    // Handler para os inputs do PIN (4 caixas OTP)
    const handlePinChange = (
        value: string,
        index: number,
        currentPin: string[],
        setter: React.Dispatch<React.SetStateAction<string[]>>,
        refs: React.MutableRefObject<(HTMLInputElement | null)[]>
    ) => {
        if (!/^\d*$/.test(value)) return; // Apenas números
        const newPin = [...currentPin];
        newPin[index] = value.slice(-1); // Apenas 1 dígito
        setter(newPin);

        // Auto-focus no próximo campo
        if (value && index < 3) {
            refs.current[index + 1]?.focus();
        }
    };

    const handlePinKeyDown = (
        e: React.KeyboardEvent<HTMLInputElement>,
        index: number,
        currentPin: string[],
        setter: React.Dispatch<React.SetStateAction<string[]>>,
        refs: React.MutableRefObject<(HTMLInputElement | null)[]>
    ) => {
        if (e.key === 'Backspace' && !currentPin[index] && index > 0) {
            refs.current[index - 1]?.focus();
            const newPin = [...currentPin];
            newPin[index - 1] = '';
            setter(newPin);
        }
    };

    const handlePinSubmit = async () => {
        const enteredPin = pin.join('');
        
        if (step === 'enter') {
            if (enteredPin.length !== 4) {
                setError('Preencha todos os 4 dígitos.');
                return;
            }
            setStep('confirm');
            setError(null);
            setTimeout(() => confirmPinRefs.current[0]?.focus(), 100);
            return;
        }

        // Step: confirm
        const confirmedPin = confirmPin.join('');
        if (enteredPin !== confirmedPin) {
            setError('Os PINs não coincidem. Tente novamente.');
            setConfirmPin(['', '', '', '']);
            setTimeout(() => confirmPinRefs.current[0]?.focus(), 100);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const pinHash = await hashPin(enteredPin);
            const { error: rpcError } = await supabase.rpc('save_portal_pin', {
                p_patient_id: patientId,
                p_pin_hash: pinHash
            });

            if (rpcError) throw rpcError;

            // Salvar flag local para saber que PIN foi configurado
            localStorage.setItem('mentis_portal_has_pin', 'true');
            localStorage.setItem('mentis_portal_patient_id', patientId);
            addToast('PIN configurado com sucesso!', 'success');
            onComplete();
        } catch (err: any) {
            console.error('Error saving PIN:', err);
            setError('Erro ao salvar o PIN. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleBiometricSetup = async () => {
        setLoading(true);
        setError(null);

        try {
            // Gerar challenge aleatório
            const challenge = new Uint8Array(32);
            crypto.getRandomValues(challenge);

            const credential = await navigator.credentials.create({
                publicKey: {
                    challenge,
                    rp: { name: 'Mentis Portal', id: window.location.hostname },
                    user: {
                        id: new TextEncoder().encode(patientId),
                        name: `paciente-${patientId.slice(0, 8)}`,
                        displayName: 'Paciente Mentis'
                    },
                    pubKeyCredParams: [
                        { type: 'public-key', alg: -7 },   // ES256
                        { type: 'public-key', alg: -257 }  // RS256
                    ],
                    authenticatorSelection: {
                        authenticatorAttachment: 'platform',
                        userVerification: 'required',
                        residentKey: 'preferred'
                    },
                    timeout: 60000
                }
            }) as PublicKeyCredential;

            if (credential) {
                // Salvar credencial localmente (a validação WebAuthn é client-side)
                const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
                localStorage.setItem('mentis_portal_credential_id', credentialId);
                localStorage.setItem('mentis_portal_has_biometric', 'true');
                localStorage.setItem('mentis_portal_patient_id', patientId);
                addToast('Biometria configurada com sucesso!', 'success');
                onComplete();
            }
        } catch (err: any) {
            console.error('WebAuthn error:', err);
            if (err.name === 'NotAllowedError') {
                setError('Autenticação cancelada. Tente novamente ou escolha PIN.');
            } else {
                setError('Seu dispositivo não suporta biometria. Tente usar o PIN.');
            }
        } finally {
            setLoading(false);
        }
    };

    // Tela de escolha
    if (mode === 'choose') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="w-full max-w-md bg-surface rounded-[28px] shadow-sm border border-border/60 p-8 animate-[fadeIn_300ms_ease-out]">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                            <KeyRound className="w-8 h-8" />
                        </div>
                        <h1 className="text-2xl font-bold text-on-surface mb-2">Proteja seu acesso</h1>
                        <p className="text-foreground-muted text-sm">
                            Configure uma forma rápida de entrar no seu portal sem precisar de um novo link.
                        </p>
                    </div>

                    <div className="space-y-3">
                        {/* Biometria */}
                        {biometricSupported && (
                            <button
                                onClick={() => {
                                    setMode('biometric');
                                    handleBiometricSetup();
                                }}
                                className="w-full flex items-center justify-between p-4 rounded-2xl border border-border/60 bg-surface hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-200 transition-all duration-200 group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform duration-200">
                                        <Fingerprint className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-semibold text-on-surface">Digital / Face ID</p>
                                        <p className="text-xs text-foreground-muted">Mais rápido e seguro</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-foreground-muted group-hover:text-indigo-500 transition-colors" />
                            </button>
                        )}

                        {/* PIN */}
                        <button
                            onClick={() => {
                                setMode('pin');
                                setTimeout(() => pinRefs.current[0]?.focus(), 100);
                            }}
                            className="w-full flex items-center justify-between p-4 rounded-2xl border border-border/60 bg-surface hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:border-violet-200 transition-all duration-200 group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center text-violet-500 group-hover:scale-110 transition-transform duration-200">
                                    <KeyRound className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-semibold text-on-surface">PIN de 4 dígitos</p>
                                    <p className="text-xs text-foreground-muted">Crie uma senha numérica rápida</p>
                                </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-foreground-muted group-hover:text-violet-500 transition-colors" />
                        </button>
                    </div>

                    <button
                        onClick={onSkip}
                        className="w-full mt-6 text-sm text-foreground-muted hover:text-on-surface transition-colors text-center py-2"
                    >
                        Pular por enquanto
                    </button>
                </div>
            </div>
        );
    }

    // Tela de configuração de PIN
    if (mode === 'pin') {
        const activePin = step === 'enter' ? pin : confirmPin;
        const activeRefs = step === 'enter' ? pinRefs : confirmPinRefs;
        const activeSetter = step === 'enter' ? setPin : setConfirmPin;

        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="w-full max-w-md bg-surface rounded-[28px] shadow-sm border border-border/60 p-8 animate-[fadeIn_300ms_ease-out]">
                    <button
                        onClick={() => {
                            setMode('choose');
                            setStep('enter');
                            setPin(['', '', '', '']);
                            setConfirmPin(['', '', '', '']);
                            setError(null);
                        }}
                        className="mb-4 text-foreground-muted hover:text-on-surface transition-colors"
                    >
                        ← Voltar
                    </button>

                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-full flex items-center justify-center mx-auto mb-4">
                            <KeyRound className="w-8 h-8" />
                        </div>
                        <h1 className="text-2xl font-bold text-on-surface mb-2">
                            {step === 'enter' ? 'Crie seu PIN' : 'Confirme seu PIN'}
                        </h1>
                        <p className="text-foreground-muted text-sm">
                            {step === 'enter'
                                ? 'Digite 4 números que você irá lembrar.'
                                : 'Repita o PIN para confirmar.'}
                        </p>
                    </div>

                    {/* PIN Inputs (OTP style) */}
                    <div className="flex justify-center gap-4 mb-6">
                        {activePin.map((digit, index) => (
                            <input
                                key={`${step}-${index}`}
                                ref={el => { activeRefs.current[index] = el; }}
                                type="password"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handlePinChange(e.target.value, index, activePin, activeSetter, activeRefs)}
                                onKeyDown={(e) => handlePinKeyDown(e, index, activePin, activeSetter, activeRefs)}
                                className="w-14 h-16 text-center text-2xl font-bold rounded-2xl border-2 border-border dark:border-slate-500 bg-surface dark:bg-slate-700 text-on-surface focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:focus:ring-violet-800 outline-none transition-all duration-200"
                            />
                        ))}
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 px-1 py-2 mb-4 justify-center animate-[fadeIn_200ms_ease-out]">
                            <div className="h-1.5 w-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
                            <p className="text-sm font-medium text-rose-600/90 dark:text-rose-400/90">{error}</p>
                        </div>
                    )}

                    <Button
                        onClick={handlePinSubmit}
                        disabled={loading || activePin.some(d => !d)}
                        className="w-full justify-center !rounded-full !py-3.5 !text-base !font-medium"
                    >
                        {loading ? 'Salvando...' : step === 'enter' ? 'Continuar' : 'Confirmar PIN'}
                    </Button>
                </div>
            </div>
        );
    }

    // Tela de biometria (loading/error state)
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="w-full max-w-md bg-surface rounded-[28px] shadow-sm border border-border/60 p-8 text-center animate-[fadeIn_300ms_ease-out]">
                {loading ? (
                    <>
                        <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                            <Fingerprint className="w-8 h-8" />
                        </div>
                        <h1 className="text-xl font-bold text-on-surface mb-2">Aguardando autenticação...</h1>
                        <p className="text-sm text-foreground-muted">Use sua biometria para confirmar.</p>
                    </>
                ) : error ? (
                    <>
                        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4">
                            <X className="w-8 h-8" />
                        </div>
                        <h1 className="text-xl font-bold text-on-surface mb-2">Algo deu errado</h1>
                        <p className="text-sm text-foreground-muted mb-6">{error}</p>
                        <div className="flex flex-col gap-3">
                            <Button onClick={handleBiometricSetup} className="w-full justify-center !rounded-full">
                                Tentar novamente
                            </Button>
                            <button
                                onClick={() => { setMode('choose'); setError(null); }}
                                className="text-sm text-foreground-muted hover:text-on-surface transition-colors"
                            >
                                Escolher outro método
                            </button>
                        </div>
                    </>
                ) : null}
            </div>
        </div>
    );
};

export default PortalSetupAuth;
