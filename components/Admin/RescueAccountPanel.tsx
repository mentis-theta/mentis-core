import React, { useState } from 'react';
import { ShieldAlert, Key, Unlock, Lock, Save } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import Button from '../Button';
import { useToast } from '../../contexts/ToastContext';
import * as cryptoService from '../../services/cryptoService';

export const RescueAccountPanel: React.FC = () => {
    const { addToast } = useToast();
    const [userId, setUserId] = useState('');
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleRescue = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!userId || !oldPassword || !newPassword) {
            addToast('Preencha todos os campos.', 'error');
            return;
        }

        setIsLoading(true);
        try {
            // 1. Fetch user profile data
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('encrypted_master_key, key_salt')
                .eq('id', userId)
                .single();

            if (profileError || !profile) {
                throw new Error('Usuário não encontrado ou sem dados de segurança.');
            }

            if (!profile.encrypted_master_key || !profile.key_salt) {
                throw new Error('Usuário não possui Cofre E2EE configurado.');
            }

            const { encrypted_master_key, key_salt } = profile;

            // 2. Derive Old KEK
            const oldKek = cryptoService.deriveKeyFromPassword(oldPassword, key_salt);

            // 3. Decrypt Master Key
            let masterKey = '';
            try {
                masterKey = cryptoService.unwrapKey(encrypted_master_key, oldKek);
            } catch (err) {
                throw new Error('Senha antiga incorreta. Não foi possível abrir o cofre.');
            }

            if (!masterKey) {
                throw new Error('Falha na descriptografia da chave mestre.');
            }

            // 4. Derive New KEK
            const newKek = cryptoService.deriveKeyFromPassword(newPassword, key_salt);

            // 5. Re-encrypt Master Key
            const newEncryptedMasterKey = cryptoService.wrapKey(masterKey, newKek);

            // 6. Save to Supabase
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ encrypted_master_key: newEncryptedMasterKey })
                .eq('id', userId);

            if (updateError) {
                throw updateError;
            }

            addToast('Cofre resgatado e trancado com a nova senha com sucesso!', 'success');
            setUserId('');
            setOldPassword('');
            setNewPassword('');

        } catch (error: any) {
            console.error('Erro no resgate:', error);
            addToast(error.message || 'Ocorreu um erro no resgate.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 md:p-8">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                    <ShieldAlert className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Resgate E2EE de Emergência</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Recuperação de Cofre de Dados de Último Recurso</p>
                </div>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-8">
                <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2">Aviso Crítico</h4>
                <p className="text-sm text-red-700 dark:text-red-400 leading-relaxed">
                    Esta ferramenta só funciona se o usuário <strong>LEMBRAR DA SENHA ANTIGA EXATA</strong>. 
                    Ela abre o cofre E2EE antigo no seu navegador e retranca com a Nova Senha para que o usuário possa voltar a acessar os prontuários. Nenhuma senha ou chave é salva no servidor durante esse processo.
                </p>
            </div>

            <form onSubmit={handleRescue} className="space-y-5 max-w-lg">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ID do Usuário (UUID)</label>
                    <input
                        type="text"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        placeholder="Ex: 550e8400-e29b-41d4-a716-446655440000"
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                        required
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Senha Antiga (Exata)</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                                required
                            />
                            <Unlock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nova Senha</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                                required
                            />
                            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        </div>
                    </div>
                </div>

                <div className="pt-4">
                    <Button 
                        type="submit" 
                        variant="danger" 
                        isLoading={isLoading}
                        className="w-full flex items-center justify-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        {isLoading ? 'Resgatando...' : 'Executar Resgate do Cofre'}
                    </Button>
                </div>
            </form>
        </div>
    );
};
