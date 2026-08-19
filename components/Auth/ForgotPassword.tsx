import React, { useState } from 'react';
import { supabase } from '@/services/supabaseClient';
import { Link } from 'react-router-dom';
import NeuralBackground from '../ui/NeuralBackground';
import { ShieldAlert, AlertTriangle, KeyRound } from 'lucide-react';
import Button from '../Button';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'warning' | 'sending' | 'success'>('idle');
    const [destructiveConfirm, setDestructiveConfirm] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleInitialSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        setStatus('warning');
    };

    const handleDestructiveSubmit = async () => {
        if (destructiveConfirm !== 'PERDER MEUS DADOS') {
            setError('Você deve digitar "PERDER MEUS DADOS" exatamente como solicitado.');
            return;
        }

        setError(null);
        setStatus('sending');

        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/update-password`,
        });

        if (resetError) {
            setError(resetError.message);
            setStatus('warning');
        } else {
            setStatus('success');
        }
    };

    const inputClass = "block w-full appearance-none h-14 rounded-2xl border border-transparent px-4 text-base font-medium text-slate-900 placeholder-slate-400 bg-slate-50 transition-all duration-200 ease-in-out focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:bg-slate-900";
    const primaryButtonClass = "w-full !rounded-full !h-14 !text-base !font-semibold !bg-primary hover:!bg-primary/90 !text-primary-foreground shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 border-none flex items-center justify-center";
    const destructiveButtonClass = "w-full !rounded-full !h-14 !text-base !font-semibold !bg-red-600 hover:!bg-red-700 !text-white shadow-lg shadow-red-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 border-none flex items-center justify-center disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed";

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 transition-colors duration-300">
            <NeuralBackground />
            
            <div className={`relative z-10 w-full max-w-md bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-[2.5rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.08)] px-6 py-8 md:p-10 lg:p-12 transition-all duration-500`}>
                
                {status === 'idle' && (
                    <div className="animate-[fadeIn_300ms_ease-out]">
                        <div className="text-center">
                            <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                                <KeyRound className="h-7 w-7 text-primary" />
                            </div>
                            <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                                Recuperar Acesso
                            </h1>
                            <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                                Digite o e-mail associado à sua conta.
                            </p>
                        </div>

                        <form onSubmit={handleInitialSubmit} className="mt-8 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                    E-mail
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={inputClass}
                                    placeholder="seu@email.com"
                                />
                            </div>

                            <div className="pt-4">
                                <Button type="submit" className={primaryButtonClass}>
                                    Continuar
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

                {(status === 'warning' || status === 'sending') && (
                    <div className="animate-[fadeIn_300ms_ease-out] flex flex-col items-center">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mb-6">
                            <ShieldAlert className="w-8 h-8 text-red-600 dark:text-red-500" />
                        </div>
                        
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 text-center">
                            Pacto Zero-Trust (LGPD)
                        </h2>
                        
                        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 mb-6">
                            <p className="text-sm text-amber-800 dark:text-amber-300/90 text-center leading-relaxed font-medium">
                                No Mentis, sua senha é a <span className="font-bold underline underline-offset-2">Chave do Cofre</span>. Nós não temos acesso aos seus dados clínicos.
                            </p>
                        </div>
                        
                        <p className="text-sm text-slate-600 dark:text-slate-400 text-center mb-6 leading-relaxed">
                            Ao redefinir sua senha sem inserir a <strong className="text-slate-900 dark:text-slate-200">Recovery Key</strong> posteriormente, os prontuários anteriores ficarão criptografados para sempre. Esta ação é <strong className="text-red-600 dark:text-red-400">irreversível</strong>.
                        </p>

                        <div className="w-full space-y-3 mb-6">
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 text-center">
                                Digite <span className="font-mono bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded text-red-600 dark:text-red-400 select-none">PERDER MEUS DADOS</span> para confirmar:
                            </label>
                            <input
                                type="text"
                                value={destructiveConfirm}
                                onChange={(e) => setDestructiveConfirm(e.target.value)}
                                className={`${inputClass} text-center font-mono text-red-600 dark:text-red-400 font-bold tracking-wider`}
                                placeholder=""
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 px-3 py-2 mb-4 w-full bg-red-50 dark:bg-red-950/30 rounded-lg">
                                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
                                <p className="text-xs font-medium text-red-600 dark:text-red-400">
                                    {error}
                                </p>
                            </div>
                        )}

                        <Button 
                            onClick={handleDestructiveSubmit} 
                            disabled={destructiveConfirm !== 'PERDER MEUS DADOS'}
                            isLoading={status === 'sending'}
                            className={destructiveButtonClass}
                        >
                            {status === 'sending' ? 'Enviando Link...' : 'Entendi. Enviar Link.'}
                        </Button>
                    </div>
                )}

                {status === 'success' && (
                    <div className="animate-[fadeIn_300ms_ease-out] text-center">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <ShieldAlert className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                            E-mail Enviado
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                            Verifique sua caixa de entrada. Enviamos um link seguro para a redefinição da sua senha.
                        </p>
                        <Link to="/login" className={primaryButtonClass}>
                            Voltar ao Login
                        </Link>
                    </div>
                )}

                {status === 'idle' && (
                    <p className="mt-8 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                        Lembrou a senha?
                        <Link to="/login" className="ml-1.5 font-semibold text-primary hover:text-primary/80 hover:underline transition-all duration-300">
                            Voltar ao Login
                        </Link>
                    </p>
                )}
            </div>
        </div>
    );
}
