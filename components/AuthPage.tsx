
import React, { useState, useEffect, useRef } from 'react';
import { getErrorMessage } from '@/utils/errorHandler';
import Button from './Button.tsx';
import type { RegisterData } from '@/types.ts';
import Logo from './ui/Logo';
import { challengeMFA, verifyMFA, getAuthenticatorAssuranceLevel } from '@/services/authService';
import { Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.tsx';
import NeuralBackground from './ui/NeuralBackground';

interface AuthPageProps {
  onLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onRegister: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
}

// ─── View transition type ────────────────────────────────────────────
type AuthView = 'login' | 'register' | 'mfa';

const AuthPage: React.FC<AuthPageProps> = ({ onLogin, onRegister }) => {
  const { completeMFALogin } = useAuth();
  const [isLoginView, setIsLoginView] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'psychologist' | 'staff'>('psychologist');
  const [identifier, setIdentifier] = useState(''); // Holds CRP or CPF
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // MFA Challenge State
  const [showMFAChallenge, setShowMFAChallenge] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaFactorId, setMfaFactorId] = useState('');
  const [pendingUser, setPendingUser] = useState<any>(null);
  const [pendingMasterKey, setPendingMasterKey] = useState<string>('');

  // ─── Fade + Slide Animation State ──────────────────────────────────
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Derive current view
  const currentView: AuthView = showMFAChallenge ? 'mfa' : (isLoginView ? 'login' : 'register');

  // Animate view transitions
  const animateTransition = (callback: () => void) => {
    // Phase 1: Fade out + slide down
    setIsTransitioning(true);
    setIsVisible(false);

    transitionTimeoutRef.current = setTimeout(() => {
      callback(); // Apply the state change
      // Phase 2: Fade in + slide up (after state change renders)
      requestAnimationFrame(() => {
        setIsVisible(true);
        setIsTransitioning(false);
      });
    }, 200); // 200ms exit animation
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    let result;
    if (isLoginView) {
      result = await onLogin(email, password);

      // Check if MFA is required
      if (result && result.success && (result as any).mfaRequired) {
        // Store user and masterKey for later completion
        setPendingUser((result as any).user);
        setPendingMasterKey((result as any).masterKey);

        // Get the user's MFA factor ID
        const { supabase } = await import('@/services/supabaseClient.ts');
        const { data } = await supabase.auth.mfa.listFactors();
        const totpFactor = data?.totp?.[0];

        if (totpFactor) {
          setMfaFactorId(totpFactor.id);
          animateTransition(() => setShowMFAChallenge(true));
          setIsLoading(false);
          return;
        }
      }
    } else {
      if (!name || !identifier) {
        setError(`Nome e ${role === 'psychologist' ? 'CRP' : 'CPF'} são obrigatórios.`);
        setIsLoading(false);
        return;
      }
      result = await onRegister({ name, email, password, role, identifier });
    }

    if (result && !result.success) {
      setError(result.error || 'Ocorreu um erro.');
    }
    setIsLoading(false);
  };

  const handleMFAVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Create challenge
      const challengeResult = await challengeMFA(mfaFactorId);
      if (!challengeResult.success || !challengeResult.challengeId) {
        setError(challengeResult.error || 'Falha ao criar desafio 2FA');
        setIsLoading(false);
        return;
      }

      // Verify code
      const verifyResult = await verifyMFA(mfaFactorId, challengeResult.challengeId, mfaCode);
      if (verifyResult.success) {
        // MFA verified - complete the login
        await completeMFALogin(pendingUser, pendingMasterKey);

        // Clear pending data
        setPendingUser(null);
        setPendingMasterKey('');
        setShowMFAChallenge(false);
      } else {
        setError(verifyResult.error || 'Código 2FA inválido');
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Erro ao verificar código 2FA');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleView = () => {
    animateTransition(() => {
      setIsLoginView(!isLoginView);
      setError(null);
      setEmail('');
      setPassword('');
      setName('');
      setIdentifier('');
      setShowMFAChallenge(false);
      setMfaCode('');
    });
  }

  // ─── Design Tokens (Neural Swarm + Clean Friendly) ───────────────────────
  const inputClass = [
    'block w-full appearance-none',
    'h-14 rounded-2xl border border-transparent',
    'px-4 text-base font-medium',
    'text-slate-900 placeholder-slate-400',
    'bg-slate-50',
    'transition-all duration-200 ease-in-out',
    'focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none',
    'dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500',
    'dark:focus:bg-slate-900',
  ].join(' ');

  const primaryButtonClass = "w-full !rounded-full !h-14 !text-base !font-semibold !bg-primary hover:!bg-primary/90 !text-primary-foreground shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 border-none flex items-center justify-center";

  // Transition classes for fade + slide
  const formTransitionClass = `
    transition-all duration-200 ease-out
    ${isVisible
      ? 'opacity-100 translate-y-0'
      : 'opacity-0 translate-y-3'
    }
  `;

  // ─── MFA Challenge Screen ─────────────────────────────────────────
  if (showMFAChallenge) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 transition-colors duration-300">
        <NeuralBackground />
        <div className={`relative z-10 w-full max-w-md bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.08)] px-6 py-8 md:p-10 lg:p-12 ${formTransitionClass}`}>
          {/* Icon */}
          <div className="text-center">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Shield className="h-7 w-7 text-primary" />
            </div>
            <h1 className="mt-5 text-2xl font-bold tracking-tight text-on-surface">
              Verificação 2FA
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Digite o código de 6 dígitos do seu aplicativo autenticador
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleMFAVerification} className="mt-8 space-y-5">
            <div>
              <label htmlFor="mfa-code" className="sr-only">Código 2FA</label>
              <input
                id="mfa-code"
                name="mfa-code"
                type="text"
                required
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className={`${inputClass} text-center text-3xl tracking-[0.5em] font-mono`}
                placeholder="000000"
                maxLength={6}
                autoComplete="off"
                autoFocus
              />
            </div>

            {error && (
              <div className="flex items-center justify-center gap-2 px-1 py-1 animate-[fadeIn_200ms_ease-out]">
                <div className="h-1.5 w-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
                <p className="text-sm font-medium text-rose-600/90 dark:text-rose-400/90">
                  {getErrorMessage(error, 'AUTH')}
                </p>
              </div>
            )}

            <Button
              type="submit"
              className={primaryButtonClass}
              isLoading={isLoading}
              disabled={mfaCode.length !== 6}
            >
              {isLoading ? 'Verificando...' : 'Verificar Código'}
            </Button>
          </form>

          {/* Back link */}
          <p className="mt-8 text-center text-sm text-foreground-muted ">
            <button
              onClick={() => {
                animateTransition(() => {
                  setShowMFAChallenge(false);
                  setMfaCode('');
                  setError(null);
                });
              }}
              className="font-semibold text-primary hover:text-primary/80 hover:underline transition-all duration-300"
            >
              ← Voltar ao login
            </button>
          </p>
        </div>
      </div>
    );
  }

  // ─── Standard Login/Register Screen ────────────────────────────────
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 transition-colors duration-300">
      <NeuralBackground />
      <div className={`relative z-10 w-full max-w-md bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.08)] px-6 py-8 md:p-10 lg:p-12 ${formTransitionClass}`}>
        {/* Header / Branding */}
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center transition-transform duration-300 hover:scale-105">
            <img src="/icon-512.svg" alt="Mentis" className="h-16 w-16 drop-shadow-sm animate-cinematic-logo" draggable={false} />
          </div>
          <div>
            <h1 className="mt-6 text-3xl font-bold tracking-tight animate-cinematic-title inline-block typing-cursor">
              Mentis
            </h1>
            <div className="relative mt-2 flex h-6 w-full items-center justify-center">
              <p className="absolute text-base font-medium text-slate-500 dark:text-slate-400 animate-cinematic-sub1">
                Sua Clínica Inteligente
              </p>
              <p className="absolute text-base font-medium text-slate-500 dark:text-slate-400 animate-cinematic-sub2">
                {isLoginView ? 'Bem-vindo(a) de volta' : 'Bem-vindo(a)'}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {/* Registration-only fields */}
          {!isLoginView && (
            <>
              {/* Role Selector */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Tipo de Conta
                </label>
                <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-100 dark:bg-slate-700 p-1.5 h-14">
                  <button
                    type="button"
                    onClick={() => setRole('psychologist')}
                    className={`px-4 text-sm font-semibold rounded-xl transition-all duration-300 ease-in-out h-full ${role === 'psychologist'
                      ? 'bg-white dark:bg-slate-600 shadow-sm text-primary scale-[1.02]'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                  >
                    Psicólogo(a)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('staff')}
                    className={`px-4 text-sm font-semibold rounded-xl transition-all duration-300 ease-in-out h-full ${role === 'staff'
                      ? 'bg-white dark:bg-slate-600 shadow-sm text-primary scale-[1.02]'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                  >
                    Funcionário(a)
                  </button>
                </div>
              </div>

              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nome Completo
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                  placeholder="Seu nome completo"
                />
              </div>
            </>
          )}

          {/* Email */}
          <div>
            <label htmlFor="email-address" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              E-mail
            </label>
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="seu@email.com"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isLoginView ? 'current-password' : 'new-password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="••••••••"
            />
            {isLoginView && (
              <div className="flex justify-end mt-2">
                <a 
                  href="/forgot-password" 
                  className="text-sm font-semibold text-primary hover:text-primary/80 hover:underline transition-all"
                >
                  Esqueci minha senha
                </a>
              </div>
            )}
          </div>

          {/* Identifier (CRP/CPF) — Registration only */}
          {!isLoginView && (
            <div>
              <label htmlFor="identifier" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {role === 'psychologist' ? 'CRP' : 'CPF'}
              </label>
              <input
                id="identifier"
                name="identifier"
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className={inputClass}
                placeholder={role === 'psychologist' ? 'ex: 06/123456' : 'Somente números'}
              />
            </div>
          )}

          {/* Error message (Design Premium Sutil) */}

          {error && (
            <div className="flex items-center gap-2 px-1 py-1 animate-[fadeIn_200ms_ease-out]">
              <div className="h-1.5 w-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
              <p className="text-sm font-medium text-rose-600/90 dark:text-rose-400/90">
                {getErrorMessage(error, 'AUTH')}
              </p>
            </div>
          )}

          {/* Submit button */}

          <div className="pt-2">
            <Button
              type="submit"
              className={primaryButtonClass}
              isLoading={isLoading}
            >
              {isLoading ? 'Processando...' : (isLoginView ? 'Entrar' : 'Criar Conta')}
            </Button>
          </div>
        </form>

        {/* Toggle Login / Register */}
        <p className="mt-8 text-center text-sm font-medium text-slate-500">
          {isLoginView ? 'Ainda não tem uma conta?' : 'Já possui uma conta?'}
          <button
            onClick={toggleView}
            className="ml-1.5 font-semibold text-primary hover:text-primary/80 hover:underline transition-all duration-300"
          >
            {isLoginView ? 'Registre-se' : 'Faça login'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
