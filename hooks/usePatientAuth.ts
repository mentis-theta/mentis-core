import { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../contexts/ToastContext';

export const usePatientAuth = () => {
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);

    const activateMagicLink = async (patientId: string) => {
        setLoading(true);
        try {
            // Update Patient Record to enable portal
            // No email is required anymore, it's magic link based.
            const { error: dbError } = await supabase
                .from('patients')
                .update({
                    portal_enabled: true
                })
                .eq('id', patientId);

            if (dbError) throw new Error(`Erro ao ativar portal: ${dbError.message}`);

            addToast('Acesso gerado com sucesso! Copie o link e envie para o paciente.', 'success');
            return true;
        } catch (error: unknown) {
            console.error('Error activating portal:', error);
            const message = error instanceof Error ? error.message : 'Erro ao ativar o portal.';
            addToast(message, 'error');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const revokeAccess = async (patientId: string) => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('patients')
                .update({ portal_enabled: false })
                .eq('id', patientId);

            if (error) throw error;
            addToast('Acesso revogado.', 'success');
            return true;
        } catch (error: unknown) {
            console.error('Error revoking access:', error);
            addToast('Erro ao revogar acesso.', 'error');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const regenerateMagicLink = async (patientId: string, currentVersion: number = 1) => {
        setLoading(true);
        try {
            const newVersion = currentVersion + 1;
            const { error } = await supabase
                .from('patients')
                .update({ portal_token_version: newVersion })
                .eq('id', patientId);

            if (error) throw error;
            addToast('Link regenerado! O link anterior foi invalidado.', 'success');
            return newVersion;
        } catch (error: unknown) {
            console.error('Error regenerating link:', error);
            addToast('Erro ao regenerar link.', 'error');
            return null;
        } finally {
            setLoading(false);
        }
    };

    return {
        activateMagicLink,
        revokeAccess,
        regenerateMagicLink,
        loading
    };
};
