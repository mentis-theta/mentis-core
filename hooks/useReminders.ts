import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Reminder } from '../types';
import { useToast } from '../contexts/ToastContext';

export const useReminders = () => {
    const { currentUser } = useAuth();
 const { addToast } = useToast();
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchReminders = useCallback(async () => {
        if (!currentUser) return;
        setIsLoading(true);
        const { data, error } = await supabase
            .from('reminders')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) {
 console.error('Error fetching reminders:', error);
 addToast('Erro ao carregar lembretes', 'error');
        } else {
            setReminders(data || []);
        }
        setIsLoading(false);
 }, [currentUser, addToast]);

    useEffect(() => {
        fetchReminders();
    }, [fetchReminders]);

    const addReminder = async (reminder: Omit<Reminder, 'id' | 'user_id' | 'created_at' | 'is_completed'>) => {
        if (!currentUser) return;
        const newReminder = {
            ...reminder,
            user_id: currentUser.id,
            is_completed: false
        };

        const { data, error } = await supabase
            .from('reminders')
            .insert(newReminder)
            .select()
            .single();

        if (error) {
 console.error('Error adding reminder:', error);
 addToast('Erro ao criar lembrete', 'error');
            return null;
        }

        setReminders(prev => [data, ...prev]);
 addToast('Lembrete salvo em meu espaço "Lembretes".', 'success');
        return data;
    };

    const toggleComplete = async (id: string, isCompleted: boolean) => {
        // Optimistic UI: Toggle the status instead of removing
        setReminders(prev => prev.map(r =>
            r.id === id ? { ...r, is_completed: !isCompleted } : r
        ));

        const { error } = await supabase
            .from('reminders')
            .update({ is_completed: !isCompleted })
            .eq('id', id);

        if (error) {
 console.error('Error updating reminder:', error);
 addToast('Erro ao atualizar lembrete', 'error');
            fetchReminders(); // Revert
        } else {
            // Success Message
            if (!isCompleted) {
 addToast('Lembrete concluído!', 'success');
            } else {
 addToast('Lembrete restaurado!', 'success');
            }
        }
    };

    const deleteReminder = async (id: string) => {
        setReminders(prev => prev.filter(r => r.id !== id));
        const { error } = await supabase.from('reminders').delete().eq('id', id);

        if (error) {
 addToast('Erro ao excluir', 'error');
            fetchReminders();
        } else {
 addToast('Lembrete excluído.', 'success');
        }
    };

    return {
        reminders,
        isLoading,
        fetchReminders,
        addReminder,
        toggleComplete,
        deleteReminder
    };
};
