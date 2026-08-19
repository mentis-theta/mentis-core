import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/services/supabaseClient';
import Button from '../Button';
import { useToast } from '@/contexts/ToastContext';
import { Mail, Calendar, CheckCircle2, Fingerprint, KeyRound } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { setPortalToken, createSyntheticToken } from '@/services/portalAuthService';


// Helper: SHA-256 hash
async function hashPin(pin: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const PortalLogin: React.FC = () => {
    const [birthDate, setBirthDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const token = searchParams.get('token');
    
    // Extracted data from token
    const [patientIdFromToken, setPatientIdFromToken] = useState<string | null>(null);
    const [expectedBirthDate, setExpectedBirthDate] = useState<string | null>(null);
    const [tokenVersion, setTokenVersion] = useState<number>(1);

    // PIN/Biometric login state
    const [loginMode, setLoginMode] = useState<'magic' | 'pin' | 'biometric'>('magic');
    const [pinInput, setPinInput] = useState(['', '', '', '']);
    const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Detectar se paciente tem PIN/biometria configurados
    const [hasPin, setHasPin] = useState(false);
    const [hasBiometric, setHasBiometric] = useState(false);
    const savedPatientId = localStorage.getItem('mentis_portal_patient_id');

    useEffect(() => {
        // Verificar biometria local
        if (localStorage.getItem('mentis_portal_has_biometric') === 'true') {
            setHasBiometric(true);
        }
        // Verificar PIN local
        if (localStorage.getItem('mentis_portal_has_pin') === 'true') {
            setHasPin(true);
        }
        // Verificar no servidor se há métodos de auth
        if (savedPatientId) {
            supabase.rpc('check_portal_auth_methods', { p_patient_id: savedPatientId })
                .then(({ data, error: rpcErr }) => {
                    if (!rpcErr && data && data.length > 0) {
                        setHasPin(data[0].has_pin);
                        setHasBiometric(prev => prev || data[0].has_biometric);
                    }
                });
        }
    }, [savedPatientId]);

    useEffect(() => {
        if (token) {
            try {
                const decoded = atob(token); // Format: id:YYYY-MM-DD:version
                const parts = decoded.split(':');
                if (parts.length >= 2) {
                    setPatientIdFromToken(parts[0]);
                    setExpectedBirthDate(parts[1]);
                    if (parts.length >= 3) {
                        setTokenVersion(parseInt(parts[2], 10) || 1);
                    }
                }
            } catch (e) {
                console.error("Invalid token format");
            }
        }
    }, [token]);

    const handleMagicLinkLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Standardize dates for comparison (just in case)
        if (!birthDate || !expectedBirthDate) {
            setError("Data de nascimento inválida.");
            setLoading(false);
            return;
        }

        // We assume birthDate input is YYYY-MM-DD and expected is also YYYY-MM-DD
        const normalizeDate = (d: string) => d.split('T')[0];

        if (normalizeDate(birthDate) === normalizeDate(expectedBirthDate)) {
            // Validated successfully in the Front-End!
            // Injecting Magic Session
            setPortalToken(token as string, tokenVersion);
            addToast('Bem-vindo de volta!', 'success');
            
            // Redirect to home and reload context
            navigate('/portal');
            window.location.reload(); 
        } else {
            setError("A data de nascimento informada não confere.");
        }
        
        setLoading(false);
    };



    // Handler: login via PIN
    const handlePinLogin = async () => {
        const enteredPin = pinInput.join('');
        if (enteredPin.length !== 4 || !savedPatientId) return;

        setLoading(true);
        setError(null);

        try {
            const pinHash = await hashPin(enteredPin);
            const { data, error: rpcError } = await supabase.rpc('validate_portal_pin', {
                p_patient_id: savedPatientId,
                p_pin_hash: pinHash
            });

            if (rpcError) throw rpcError;

            if (data && data.length > 0) {
                // PIN válido — criar token sintético para manter a sessão
                const patient = data[0];
                const version = patient.portal_token_version || 1;
                const syntheticToken = createSyntheticToken(patient.id, patient.birth_date, version);
                setPortalToken(syntheticToken, version);
                addToast('Bem-vindo de volta!', 'success');
                navigate('/portal');
                window.location.reload();
            } else {
                setError('PIN incorreto. Tente novamente.');
                setPinInput(['', '', '', '']);
                setTimeout(() => pinRefs.current[0]?.focus(), 100);
            }
        } catch (err: any) {
            console.error('PIN login error:', err);
            setError('Erro ao validar PIN.');
        } finally {
            setLoading(false);
        }
    };

    // Handler: login via biometria
    const handleBiometricLogin = async () => {
        if (!savedPatientId) return;
        setLoading(true);
        setError(null);

        try {
            const credentialId = localStorage.getItem('mentis_portal_credential_id');
            if (!credentialId) throw new Error('Credencial não encontrada.');

            const rawId = Uint8Array.from(atob(credentialId), c => c.charCodeAt(0));
            const challenge = new Uint8Array(32);
            crypto.getRandomValues(challenge);

            const assertion = await navigator.credentials.get({
                publicKey: {
                    challenge,
                    rpId: window.location.hostname,
                    allowCredentials: [{
                        type: 'public-key',
                        id: rawId,
                        transports: ['internal']
                    }],
                    userVerification: 'required',
                    timeout: 60000
                }
            });

            if (assertion) {
                // Biometria válida — buscar dados do paciente e criar token
                const { data, error: rpcError } = await supabase.rpc('get_portal_patient', {
                    p_patient_id: savedPatientId,
                    p_token_version: parseInt(localStorage.getItem('mentis_portal_token_version') || '1', 10)
                });

                if (rpcError) throw rpcError;

                if (data && data.length > 0) {
                    const patient = data[0];
                    const version = patient.portal_token_version || 1;
                    const syntheticToken = createSyntheticToken(patient.id, patient.birth_date, version);
                    setPortalToken(syntheticToken, version);
                    addToast('Bem-vindo de volta!', 'success');
                    navigate('/portal');
                    window.location.reload();
                } else {
                    setError('Acesso revogado. Solicite um novo link ao seu terapeuta.');
                }
            }
        } catch (err: any) {
            console.error('Biometric login error:', err);
            if (err.name === 'NotAllowedError') {
                setError('Autenticação cancelada.');
            } else {
                setError('Erro na autenticação biométrica. Use o PIN ou solicite um novo link.');
            }
        } finally {
            setLoading(false);
        }
    };

    // PIN input handler
    const handlePinChange = (value: string, index: number) => {
        if (!/^\d*$/.test(value)) return;
        const newPin = [...pinInput];
        newPin[index] = value.slice(-1);
        setPinInput(newPin);

        if (value && index < 3) {
            pinRefs.current[index + 1]?.focus();
        }

        // Auto-submit quando 4 dígitos forem preenchidos
        const fullPin = [...newPin];
        if (fullPin.every(d => d) && index === 3) {
            setTimeout(() => handlePinLogin(), 150);
        }
    };

    const handlePinKeyDown = (e: React.KeyboardEvent, index: number) => {
        if (e.key === 'Backspace' && !pinInput[index] && index > 0) {
            pinRefs.current[index - 1]?.focus();
            const newPin = [...pinInput];
            newPin[index - 1] = '';
            setPinInput(newPin);
        }
    };



    if (patientIdFromToken) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="w-full max-w-md bg-surface rounded-[28px] shadow-sm border border-border/60 p-8 animate-[fadeIn_300ms_ease-out]">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <h1 className="text-2xl font-bold text-on-surface mb-2">Bem-vindo(a) ao Mentis!</h1>
                        <p className=" text-foreground-muted ">
                            Por motivos de segurança, confirme sua <strong>Data de Nascimento</strong> para acessar seu espaço privado.
                        </p>
                    </div>

                    <form onSubmit={handleMagicLinkLogin} className="space-y-5">
                        <div>
                            <label htmlFor="birthDate" className="text-sm font-medium text-foreground-muted mb-1.5 flex items-center">
                                <Calendar className="w-4 h-4 mr-2" /> Data de Nascimento
                            </label>
                            <input
                                id="birthDate"
                                type="date"
                                required
                                value={birthDate}
                                onChange={(e) => setBirthDate(e.target.value)}
                                className="w-full px-4 py-3.5 rounded-2xl border border-border dark:border-slate-500 bg-surface dark:bg-slate-700 text-on-surface focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all"
                            />
                            {error && (
                                <div className="flex items-center gap-2 px-1 py-2 mt-1 animate-[fadeIn_200ms_ease-out]">
                                    <div className="h-1.5 w-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
                                    <p className="text-sm font-medium text-rose-600/90 dark:text-rose-400/90 leading-tight">
                                        {error}
                                    </p>
                                </div>
                            )}
                        </div>

                        <Button type="submit" disabled={loading} className="w-full justify-center !rounded-full !py-3.5 !text-base !font-medium">
                            {loading ? 'Acessando...' : 'Entrar no Meu Espaço'}
                        </Button>
                    </form>
                </div>
            </div>
        );
    }

    // Tela com PIN/Biometria disponível (paciente já tem método configurado)
    if ((hasPin || hasBiometric) && savedPatientId && !token) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="w-full max-w-md bg-surface rounded-[28px] shadow-sm border border-border/60 p-8 animate-[fadeIn_300ms_ease-out]">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-full flex items-center justify-center mx-auto mb-4">
                            {loginMode === 'biometric' ? <Fingerprint className="w-8 h-8" /> : <KeyRound className="w-8 h-8" />}
                        </div>
                        <h1 className="text-2xl font-bold text-on-surface mb-2">Bem-vindo de volta!</h1>
                        <p className="text-foreground-muted text-sm">
                            {loginMode === 'pin' ? 'Digite seu PIN de 4 dígitos.' : 'Use sua biometria para acessar.'}
                        </p>
                    </div>

                    {/* Biometric button */}
                    {loginMode === 'biometric' && hasBiometric && (
                        <div className="space-y-4">
                            <Button
                                onClick={handleBiometricLogin}
                                disabled={loading}
                                className="w-full justify-center !rounded-full !py-3.5 !text-base !font-medium"
                            >
                                <Fingerprint className="w-5 h-5 mr-2" />
                                {loading ? 'Autenticando...' : 'Entrar com Digital / Face ID'}
                            </Button>

                            {error && (
                                <div className="flex items-center gap-2 px-1 py-2 justify-center animate-[fadeIn_200ms_ease-out]">
                                    <div className="h-1.5 w-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
                                    <p className="text-sm font-medium text-rose-600/90 dark:text-rose-400/90">{error}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* PIN input */}
                    {loginMode === 'pin' && hasPin && (
                        <div className="space-y-4">
                            <div className="flex justify-center gap-4">
                                {pinInput.map((digit, index) => (
                                    <input
                                        key={index}
                                        ref={el => { pinRefs.current[index] = el; }}
                                        type="password"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handlePinChange(e.target.value, index)}
                                        onKeyDown={(e) => handlePinKeyDown(e, index)}
                                        className="w-14 h-16 text-center text-2xl font-bold rounded-2xl border-2 border-border dark:border-slate-500 bg-surface dark:bg-slate-700 text-on-surface focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:focus:ring-violet-800 outline-none transition-all duration-200"
                                    />
                                ))}
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 px-1 py-2 justify-center animate-[fadeIn_200ms_ease-out]">
                                    <div className="h-1.5 w-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
                                    <p className="text-sm font-medium text-rose-600/90 dark:text-rose-400/90">{error}</p>
                                </div>
                            )}

                            <Button
                                onClick={handlePinLogin}
                                disabled={loading || pinInput.some(d => !d)}
                                className="w-full justify-center !rounded-full !py-3.5 !text-base !font-medium"
                            >
                                {loading ? 'Verificando...' : 'Entrar'}
                            </Button>
                        </div>
                    )}

                    {/* Alternadores de modo */}
                    <div className="mt-6 pt-4 border-t border-border/40 space-y-2">
                        {hasBiometric && loginMode !== 'biometric' && (
                            <button
                                onClick={() => { setLoginMode('biometric'); setError(null); }}
                                className="w-full text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors py-1.5 flex items-center justify-center gap-2"
                            >
                                <Fingerprint className="w-4 h-4" /> Entrar com Digital / Face ID
                            </button>
                        )}
                        {hasPin && loginMode !== 'pin' && (
                            <button
                                onClick={() => {
                                    setLoginMode('pin');
                                    setError(null);
                                    setPinInput(['', '', '', '']);
                                    setTimeout(() => pinRefs.current[0]?.focus(), 100);
                                }}
                                className="w-full text-sm text-violet-600 hover:text-violet-700 font-medium transition-colors py-1.5 flex items-center justify-center gap-2"
                            >
                                <KeyRound className="w-4 h-4" /> Entrar com PIN
                            </button>
                        )}
                        <p className="text-center text-xs text-foreground-muted pt-2">
                            Ou solicite um novo link mágico ao seu terapeuta.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="w-full max-w-md bg-surface rounded-[28px] shadow-sm border border-border/60 p-8 text-center animate-[fadeIn_300ms_ease-out]">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-5">
                    <KeyRound className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-bold text-on-surface mb-3">Acesso Exclusivo</h1>
                <p className="text-sm text-foreground-muted mb-6 leading-relaxed">
                    Seu acesso ao portal é protegido para garantir total confidencialidade dos seus dados terapêuticos.
                </p>
                
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl mb-6 text-left">
                    <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-400 mb-1.5">Perdeu seu acesso?</h3>
                    <p className="text-xs text-amber-700/80 dark:text-amber-500/80">
                        Se você trocou de aparelho ou limpou os dados do navegador, entre em contato direto com seu terapeuta para receber um novo <strong>Link Mágico</strong> via WhatsApp.
                    </p>
                </div>

                <div className="text-xs text-foreground-muted pt-2 border-t border-border/40">
                    O Mentis não envia e-mails automáticos nem usa senhas tradicionais por segurança.
                </div>
            </div>
        </div>
    );
};

export default PortalLogin;
