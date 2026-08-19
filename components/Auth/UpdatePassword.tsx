import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { useToast } from '../../contexts/ToastContext';
import Button from '../Button';
import { getErrorMessage } from '../../utils/errorHandler';
import NeuralBackground from '../ui/NeuralBackground';
import { KeyRound, ShieldAlert } from 'lucide-react';
import * as cryptoService from '../../services/cryptoService';

const UpdatePassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryInput, setRecoveryInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (!recoveryInput) {
      setError('O Código de Recuperação é obrigatório para destravar seu cofre.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Get current user session (should exist from password reset link)
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Sessão expirada. Solicite a redefinição de senha novamente.');

      // 2. Fetch profile to get recovery envelope and salt
      const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('recovery_envelope, key_salt')
          .eq('id', user.id)
          .single();

      if (profileError || !profile) throw new Error('Perfil não encontrado.');
      if (!profile.recovery_envelope) throw new Error('Cofre não configurado. Contate o suporte.');

      // 3. Unwrap Master Key using the Recovery Code (or legacy 12-word phrase)
      let masterKey: string;
      try {
          masterKey = cryptoService.recoverMasterKey(recoveryInput, profile.recovery_envelope, profile.key_salt);
      } catch (decErr) {
          throw new Error('Código de Recuperação incorreto.');
      }

      // 4. Derive new Key Encryption Key (KEK) using the NEW password and the same salt
      const newKek = cryptoService.deriveKeyFromPassword(password, profile.key_salt);
      
      // 5. Wrap the Master Key with the new KEK
      const newEncryptedMasterKey = cryptoService.wrapKey(masterKey, newKek);

      // 6. Update Auth Password
      const { error: updateAuthError } = await supabase.auth.updateUser({ password });
      if (updateAuthError) throw updateAuthError;

      // 7. Save the new encrypted master key to the database
      const { error: updateProfileError } = await supabase
          .from('profiles')
          .update({ encrypted_master_key: newEncryptedMasterKey })
          .eq('id', user.id);

      if (updateProfileError) {
          console.error("Erro crítico ao salvar nova chave mestra:", updateProfileError);
          // If this fails, the user can still recover next time using the Recovery Code.
      }

      addToast('Senha atualizada e cofre restaurado com sucesso!', 'success');
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao atualizar a senha.');
    } finally {
      setIsLoading(false);
    }
  };

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

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 transition-colors duration-300 py-10">
      <NeuralBackground />
      <div className="relative z-10 w-full max-w-md bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.08)] px-6 py-8 md:p-10 lg:p-12 animate-fadeIn my-10 max-h-[90vh] overflow-y-auto">
        <div className="text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
             <KeyRound className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">
            Nova Senha
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Digite seu Código de Recuperação e a nova senha para restaurar o cofre.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                  <h4 className="font-semibold text-amber-800 text-sm mb-1">Destrancar Cofre</h4>
                  <p className="text-xs text-amber-700">Para manter o E2EE ativo, insira o Código Único (XXXX-XXXX...) ou a Frase de 12 Palavras que você salvou no cadastro.</p>
              </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Código ou Frase de Recuperação
            </label>
            <input
              type="text"
              required
              value={recoveryInput}
              onChange={(e) => setRecoveryInput(e.target.value)}
              className={inputClass}
              placeholder="Ex: ABCD-1234-EFGH-5678"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Nova Senha
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Confirmar Senha
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 px-1 py-1 animate-[fadeIn_200ms_ease-out]">
              <div className="h-1.5 w-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
              <p className="text-sm font-medium text-rose-600/90 dark:text-rose-400/90">
                {getErrorMessage(error, 'PWD-UPD')}
              </p>
            </div>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              className={primaryButtonClass}
              isLoading={isLoading}
            >
              {isLoading ? 'Restaurando...' : 'Atualizar e Destrancar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdatePassword;
