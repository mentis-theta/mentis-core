
import React, { useState, useEffect } from 'react';
import type { Goal, Intervention, PatientTask, Patient, InterventionSuggestion, User } from '../types.ts';
import { validateGoalForm } from '../utils/validators.ts';
import * as geminiService from '../services/geminiService.ts';
import * as auditLogService from '../services/auditLogger';
import { useCrypto } from '../contexts/CryptoContext.tsx';

interface UseGoalEditorProps {
    goalToEdit?: Goal | null;
    patient: Patient | null;
    currentUser: User | null;
    onSave: (goal: Goal) => void;
    isOpen: boolean;
}

const emptyGoal: Omit<Goal, 'id' | 'createdAt'> = {
    title: '',
    description: '',
    status: 'in_progress',
    interventions: [],
    patientTasks: [],
};

export const useGoalEditor = ({ goalToEdit, patient, currentUser, onSave, isOpen }: UseGoalEditorProps) => {
    const { masterKey } = useCrypto();
    const [goalData, setGoalData] = useState<Omit<Goal, 'id' | 'createdAt'> | Goal>(emptyGoal);
    const [newInterventionText, setNewInterventionText] = useState('');
    const [newPatientTaskText, setNewPatientTaskText] = useState('');
    const [error, setError] = useState<string | null>(null);

    // AI Suggestion State
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [view, setView] = useState<'editor' | 'suggestions'>('editor');
    const [suggestedInterventions, setSuggestedInterventions] = useState<InterventionSuggestion | null>(null);
    const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);

    const isEditing = !!goalToEdit;

    // Reset Form when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setGoalData(isEditing && goalToEdit ? goalToEdit : emptyGoal);
        } else {
            // Delay cleanup for animation
            const timer = setTimeout(() => {
                setGoalData(emptyGoal);
                setError(null);
                setView('editor');
                setSuggestedInterventions(null);
                setSelectedSuggestions([]);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen, goalToEdit, isEditing]);

    const updateField = <K extends keyof Goal>(field: K, value: Goal[K]) => {
        setGoalData(prev => ({ ...prev, [field]: value }));
    };

    // --- Actions ---

    const addIntervention = () => {
        if (!newInterventionText.trim()) return;
        const newIntervention: Intervention = {
            id: crypto.randomUUID(),
            text: newInterventionText.trim(),
            status: 'planned',
            feedback: null,
        };
        updateField('interventions', [...goalData.interventions, newIntervention]);
        setNewInterventionText('');
    };

    const addPatientTask = () => {
        if (!newPatientTaskText.trim()) return;
        const newTask: PatientTask = {
            id: crypto.randomUUID(),
            text: newPatientTaskText.trim(),
            status: 'pending',
        };
        updateField('patientTasks', [...goalData.patientTasks, newTask]);
        setNewPatientTaskText('');
    };

    const removeIntervention = (id: string) => updateField('interventions', goalData.interventions.filter(i => i.id !== id));
    const removePatientTask = (id: string) => updateField('patientTasks', goalData.patientTasks.filter(t => t.id !== id));

    const updateInterventionStatus = (id: string, status: Intervention['status']) => {
        updateField('interventions', goalData.interventions.map(i => i.id === id ? { ...i, status } : i));
    };

    const updatePatientTaskStatus = (id: string, status: PatientTask['status']) => {
        updateField('patientTasks', goalData.patientTasks.map(t => t.id === id ? { ...t, status } : t));
    };

    const handleSuggestInterventions = async () => {
        if (!patient || !goalData.title.trim()) {
            setError("O título da meta é necessário para gerar sugestões.");
            return;
        }
        setIsSuggesting(true);
        setError(null);
        auditLogService.logEvent(currentUser, 'suggest_interventions', { patientId: patient.id, goalTitle: goalData.title });

        const result = await geminiService.suggestInterventions(patient, { title: goalData.title, description: goalData.description }, masterKey || '');

        if (result) {
            setSuggestedInterventions(result);
            setSelectedSuggestions(result.suggestions);
            setView('suggestions');
        }
        setIsSuggesting(false);
    };

    const handleAddSelectedSuggestions = () => {
        const newInterventions: Intervention[] = selectedSuggestions.map(text => ({
            id: crypto.randomUUID(),
            text,
            status: 'planned',
            feedback: null,
        }));
        updateField('interventions', [...goalData.interventions, ...newInterventions]);
        setView('editor');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const validation = validateGoalForm(goalData.title);
        if (!validation.isValid) {
            setError(validation.error || 'Erro desconhecido');
            return;
        }

        const goalToSave: Goal = {
            ...goalData,
            id: isEditing && 'id' in goalData ? goalData.id : crypto.randomUUID(),
            createdAt: isEditing && 'createdAt' in goalData ? goalData.createdAt : new Date().toISOString(),
        };

        onSave(goalToSave);
    };

    return {
        form: { goalData, newInterventionText, newPatientTaskText, error },
        ai: { isSuggesting, view, suggestedInterventions, selectedSuggestions },
        setters: {
            setNewInterventionText, setNewPatientTaskText, setView,
            toggleSuggestionSelection: (s: string) => setSelectedSuggestions(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])
        },
        actions: {
            updateField,
            addIntervention, addPatientTask,
            removeIntervention, removePatientTask,
            updateInterventionStatus, updatePatientTaskStatus,
            handleSuggestInterventions, handleAddSelectedSuggestions,
            handleSubmit
        },
        isEditing
    };
};
