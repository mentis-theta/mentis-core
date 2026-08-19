import React, { useState, useEffect } from 'react';
import Modal from '../Modal';
import Button from '../Button';
import { ShieldAlert, AlertTriangle, KeyRound, Copy, CheckCircle2, ChevronRight, X } from 'lucide-react';
import * as cryptoService from '../../services/cryptoService';
import { useCrypto } from '../../contexts/CryptoContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../services/supabaseClient';

interface SecurityOnboardingModalProps {
    isOpen: boolean;
    skipCount: number;
    onComplete: () => void;
    onSkip: () => void;
}

type Step = 'intro' | 'phrase' | 'verify' | 'success';

const SecurityOnboardingModal: React.FC<SecurityOnboardingModalProps> = ({ isOpen, skipCount, onComplete, onSkip }) => {
    const { masterKey } = useCrypto();
    const { currentUser } = useAuth();
    const { addToast } = useToast();
    
    const [step, setStep] = useState<Step>('intro');
    const [recoveryCode, setRecoveryCode] = useState<string>('');
    const [verificationInput, setVerificationInput] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const maxSkips = 3;
    const canSkip = skipCount < maxSkips;

    // Generate code when entering phrase step
    useEffect(() => {
        if (step === 'phrase' && !recoveryCode) {
            setRecoveryCode(cryptoService.generateRecoveryCode());
        }
    }, [step, recoveryCode]);

    const handleCopy = () => {
        navigator.clipboard.writeText(recoveryCode);
        addToast('Código copiado para a área de transferência', 'success');
    };

    const handleVerify = async () => {
        // Validate input
        const expected = recoveryCode.replace(/[^A-Z0-9]/g, '');
        const input = verificationInput.toUpperCase().replace(/[^A-Z0-9]/g, '');
        
        if (input !== expected) {
            addToast('O código digitado está incorreto. Verifique e tente novamente.', 'error');
            return;
        }

        // Success! Wrap the key and save to Supabase
        if (!masterKey) {
            addToast('Chave mestre não encontrada na sessão.', 'error');
            return;
        }
        
        if (!currentUser?.key_salt) {
            addToast('Perfil do usuário incompleto. Tente relogar.', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const envelope = cryptoService.createRecoveryEnvelope(masterKey, recoveryCode, currentUser.key_salt);

            const { error } = await supabase.rpc('set_recovery_envelope', {
                p_recovery_envelope: envelope
            });

            if (error) throw error;
            
            setStep('success');
        } catch (error) {
            console.error('Erro ao salvar frase:', error);
            addToast('Ocorreu um erro ao salvar a frase de recuperação.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSkip = async () => {
        setIsSubmitting(true);
        try {
            const { error } = await supabase.rpc('increment_recovery_skip');
            if (error) throw error;
            onSkip();
        } catch (error) {
            console.error('Erro ao pular:', error);
            onSkip(); // Skip even on error so they aren't blocked by a network glitch
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={() => {}} // Disabled close via outside click
            title="" 
            size="2xl"
        >
            <div className="p-2 sm:p-4 text-center">
                
                {/* --- STEP 1: INTRO --- */}
                {step === 'intro' && (
                    <div className="animate-fade-in flex flex-col items-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
                            <ShieldAlert className="w-8 h-8 text-red-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-4">
                            Atualização de Segurança Obrigatória
                        </h2>
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6 text-left w-full">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-semibold text-amber-800 mb-1">O Paradoxo da Chave Perdida</h4>
                                    <p className="text-sm text-amber-700 leading-relaxed">
                                        Como o Mentis usa <strong>Criptografia de Conhecimento Zero</strong> (E2EE), nós do servidor não guardamos a sua senha e não conseguimos ler os dados dos seus pacientes. 
                                        Se você esquecer a sua senha, <strong className="text-red-600">todos os prontuários serão perdidos para sempre.</strong> Não temos como recuperar.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <p className="text-slate-600 mb-8 leading-relaxed">
                            Para evitar essa tragédia, vamos gerar agora um <strong>Código de Recuperação Único</strong>. Ele será a sua única chave reserva caso esqueça sua senha.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                            {canSkip && (
                                <Button variant="secondary" onClick={handleSkip} disabled={isSubmitting}>
                                    Fazer isso depois (Restam {maxSkips - skipCount} pulos)
                                </Button>
                            )}
                            <Button 
                                variant="primary" 
                                className="flex items-center gap-2"
                                onClick={() => setStep('phrase')}
                            >
                                Gerar Meu Código de Recuperação <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* --- STEP 2: PHRASE --- */}
                {step === 'phrase' && (
                    <div className="animate-fade-in flex flex-col items-center">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                            <KeyRound className="w-8 h-8 text-blue-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">
                            Guarde Seu Código
                        </h2>
                        <p className="text-slate-600 mb-6 text-sm max-w-lg text-center">
                            Copie ou anote o código abaixo em um local seguro (como um gerenciador de senhas). Nunca tire fotos ou envie por aplicativos de mensagens.
                        </p>

                        <div className="w-full mb-6">
                            <div className="bg-slate-50 border-2 border-dashed border-indigo-200 rounded-xl py-4 px-6 flex items-center justify-center shadow-inner">
                                <span className="text-2xl md:text-3xl text-indigo-700 font-mono font-bold tracking-widest text-center select-all">
                                    {recoveryCode}
                                </span>
                            </div>
                        </div>

                        <div className="flex justify-between items-center w-full mt-2">
                            <button 
                                onClick={handleCopy}
                                className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 transition-colors"
                            >
                                <Copy className="w-4 h-4" /> Copiar Código
                            </button>
                            <Button 
                                variant="primary"
                                onClick={() => setStep('verify')}
                            >
                                Já Anotei! Próximo Passo
                            </Button>
                        </div>
                    </div>
                )}

                {/* --- STEP 3: VERIFY --- */}
                {step === 'verify' && (
                    <div className="animate-fade-in flex flex-col items-center">
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">
                            Confirme que Anotou
                        </h2>
                        <p className="text-slate-600 mb-8 text-sm text-center">
                            Para garantir que você guardou o código corretamente, cole ou digite-o no campo abaixo.
                        </p>

                        <div className="w-full max-w-sm mb-8">
                            <input 
                                type="text" 
                                className="w-full rounded-xl border-slate-300 border-2 px-4 py-3 text-center text-lg font-mono font-bold tracking-widest text-slate-800 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all uppercase"
                                placeholder="XXXX-XXXX-XXXX-XXXX"
                                value={verificationInput}
                                onChange={(e) => {
                                    // Auto-format as they type (optional UX improvement)
                                    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                                    const formatted = val.match(/.{1,4}/g)?.join('-') || val;
                                    setVerificationInput(formatted);
                                }}
                            />
                        </div>

                        <div className="flex justify-between w-full">
                            <Button variant="secondary" onClick={() => setStep('phrase')} disabled={isSubmitting}>
                                Voltar
                            </Button>
                            <Button variant="primary" onClick={handleVerify} disabled={isSubmitting}>
                                {isSubmitting ? 'Salvando...' : 'Confirmar e Proteger Cofre'}
                            </Button>
                        </div>
                    </div>
                )}

                {/* --- STEP 4: SUCCESS --- */}
                {step === 'success' && (
                    <div className="animate-fade-in flex flex-col items-center py-6">
                        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-3">
                            Cofre Blindado com Sucesso!
                        </h2>
                        <p className="text-slate-600 mb-8 max-w-md text-center">
                            O seu código de recuperação foi registrado. Se um dia você esquecer a sua senha, esse código será a única forma de recuperar o acesso aos seus prontuários.
                        </p>
                        <Button variant="primary" onClick={onComplete} className="w-full sm:w-auto px-8">
                            Ir para o Dashboard
                        </Button>
                    </div>
                )}

            </div>
        </Modal>
    );
};

export default SecurityOnboardingModal;
