import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { Session, Tag, SuggestedTag, Patient, JSONContent, MoodMetrics } from '../types.ts';
import { SESSION_TYPES } from '../types.ts';
import { getLocalDateTimeString } from '../utils/formatters.ts';
import { analyzeSessionNotes } from '../services/geminiService.ts';
import { generateUUID } from '../utils/uuid.ts';
import { getPlainTextFromSession } from '../components/Session/RichTextRenderer.tsx';

export type EditorMode = 'draft' | 'review';
export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';
export type SessionOperation = 'idle' | 'saving_draft' | 'saving_goal' | 'finalizing' | 'generating_ai' | 'conflict' | 'save_failed';

export type SaveResult = 
  | { status: 'success'; revision?: number }
  | { status: 'conflict'; serverRevision?: number }
  | { status: 'error'; message?: string };

interface UseSessionEditorProps {
    sessionToEdit?: Session | null;
    patient: Patient | null;
    onSave: (session: Omit<Session, 'id'> | Session, files: File[], expectedRevision?: number, forceOverride?: boolean) => Promise<SaveResult | void>;
    isOpen: boolean;
}

export const useSessionEditor = ({ sessionToEdit, patient, onSave, isOpen }: UseSessionEditorProps) => {
    // Form State
    const [notes, setNotes] = useState('');
    const [duration, setDuration] = useState(50);
    const [price, setPrice] = useState(150);
    const [sessionDate, setSessionDate] = useState(getLocalDateTimeString());
    const [sessionType, setSessionType] = useState<typeof SESSION_TYPES[number]>('individual');
    const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending'>('pending');

    // Attachments
    const [attachments, setAttachments] = useState<File[]>([]);
    const [existingAttachments, setExistingAttachments] = useState<{ name: string, url: string }[]>([]);

    // Tags & Goals
    const [currentTags, setCurrentTags] = useState<Tag[]>([]);
    const [newTagInput, setNewTagInput] = useState('');
    const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);

    // AI & Views
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<{ notes?: string, duration?: string, price?: string }>({});
    const [suggestedTags, setSuggestedTags] = useState<SuggestedTag[]>([]);
    const [approvedTags, setApprovedTags] = useState<Tag[]>([]);

    // Draft Mode State
    const [editorMode, setEditorMode] = useState<EditorMode>('draft');
    const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle');
    const [reviewText, setReviewText] = useState('');
    const [view, setView] = useState<'editor' | 'review'>('editor');

    // OCC State
    const [sessionOperation, setSessionOperation] = useState<SessionOperation>('idle');
    const [baseRevision, setBaseRevision] = useState<number>(1);
    const [localRevision, setLocalRevision] = useState<number>(1);
    const [serverRevision, setServerRevision] = useState<number | null>(null);

    const isEditing = !!sessionToEdit;
    const isDraft = sessionToEdit?.status === 'draft';
    const isFinalized = sessionToEdit?.status === 'completed' && !!sessionToEdit?.finalized_at;
    const isMounted = useRef(true);
    const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSavedContentRef = useRef<string>('');
    const draftIdRef = useRef<string>('');
    const hasInitializedRef = useRef(false);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    // Reset or Initialize
    useEffect(() => {
        if (!isOpen) {
            const t = setTimeout(() => {
                setNotes('');
                setDuration(50);
                setPrice(150);
                setSessionType('individual');
                setSessionDate(getLocalDateTimeString());
                setPaymentStatus('pending');
                setAttachments([]);
                setExistingAttachments([]);
                setIsAnalyzing(false);
                setSuggestedTags([]);
                setApprovedTags([]);
                setCurrentTags([]);
                setNewTagInput('');
                setSelectedGoalIds([]);
                setView('editor');
                setEditorMode('draft');
                setAutoSaveStatus('idle');
                setSessionOperation('idle');
                setReviewText('');
                setErrors({});
                setIsSaving(false);
                setBaseRevision(1);
                setLocalRevision(1);
                setServerRevision(null);
                lastSavedContentRef.current = '';
                draftIdRef.current = '';
                hasInitializedRef.current = false;
            }, 300);
            return () => clearTimeout(t);
        }

        if (hasInitializedRef.current) return;
        hasInitializedRef.current = true;

        if (isEditing && sessionToEdit) {
            setNotes(getPlainTextFromSession(sessionToEdit.notes));
            setDuration(sessionToEdit.duration);
            setPrice(sessionToEdit.price);
            setSessionDate(getLocalDateTimeString(new Date(sessionToEdit.date)));
            setSessionType(sessionToEdit.sessionType);
            setPaymentStatus(sessionToEdit.paymentStatus);
            setCurrentTags(sessionToEdit.tags || []);
            setSelectedGoalIds(sessionToEdit.goalIds || []);
            setExistingAttachments(sessionToEdit.attachments || []);
            setView('editor');
            
            // OCC Init
            // Se for sessão legada sem revision, assume 0. Se for nova, assume 0.
            const initialRevision = sessionToEdit.draft_revision || 0;
            setBaseRevision(initialRevision);
            setLocalRevision(initialRevision);

            draftIdRef.current = sessionToEdit.id;

            if (sessionToEdit.status === 'completed' && sessionToEdit.finalized_at) {
                setEditorMode('review');
                setReviewText(getPlainTextFromSession(sessionToEdit.notes));
            } else {
                setEditorMode('draft');
            }
        } else {
            setSessionDate(getLocalDateTimeString());
            setEditorMode('draft');
            if (patient) {
                setPrice(patient.agreedPrice || 150);
            }
            setBaseRevision(0);
            setLocalRevision(0);
        }
    }, [isOpen, sessionToEdit, isEditing, patient]);

    useEffect(() => {
        return () => {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }
        };
    }, []);

    const hasUnsavedChanges = useMemo(() => {
        if (!isOpen) return false;

        if (isEditing && sessionToEdit) {
            const originalNotes = getPlainTextFromSession(sessionToEdit.notes);
            const currentNotes = notes || '';

            if (
                originalNotes !== currentNotes ||
                duration !== sessionToEdit.duration ||
                price !== sessionToEdit.price ||
                sessionType !== sessionToEdit.sessionType ||
                paymentStatus !== sessionToEdit.paymentStatus
            ) return true;

            if (
                attachments.length > 0 ||
                existingAttachments.length !== (sessionToEdit.attachments?.length || 0)
            ) return true;

            if (selectedGoalIds.length !== (sessionToEdit.goalIds?.length || 0)) return true;

            return false;
        } else {
            return (
                notes.trim().length > 0 ||
                attachments.length > 0 ||
                currentTags.length > 0
            );
        }
    }, [isOpen, isEditing, sessionToEdit, notes, duration, price, sessionType, paymentStatus, attachments.length, existingAttachments.length, currentTags.length, selectedGoalIds.length]);

    const validate = () => {
        const newErrors: typeof errors = {};
        if (duration <= 0) newErrors.duration = 'A duração deve ser positiva.';
        if (price < 0) newErrors.price = 'O valor não pode ser negativo.';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateForFinalize = () => {
        const newErrors: typeof errors = {};
        if (!reviewText.trim()) newErrors.notes = 'A evolução clínica não pode estar vazia.';
        if (duration <= 0) newErrors.duration = 'A duração deve ser positiva.';
        if (price < 0) newErrors.price = 'O valor não pode ser negativo.';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleAnalyze = async () => {
        if (!validate()) return;
        setIsAnalyzing(true);
        const tags = await analyzeSessionNotes(notes);
        if (isMounted.current) {
            setSuggestedTags(tags);
            setApprovedTags(tags.filter(t => t.relevance > 0.6));
            setIsAnalyzing(false);
            setView('review');
        }
    };

    /**
     * Save Draft with Strict OCC
     */
    const handleSaveDraft = useCallback(async (draftContent: JSONContent | string, silent: boolean = false, draftMoods?: MoodMetrics, transcriptText?: string, forceOverride: boolean = false) => {
        if (!validate()) return Promise.reject(new Error("Validation failed"));
        
        if (sessionOperation === 'conflict' && !forceOverride) {
            console.warn("Save blocked due to unresolved conflict.");
            return Promise.reject(new Error("Unresolved conflict"));
        }

        if (!silent) setIsSaving(true);
        if (silent) setAutoSaveStatus('saving');
        setSessionOperation('saving_draft');

        try {
            const plainTextSummary = typeof draftContent === 'string' ? draftContent : getPlainTextFromSession(draftContent);

            if (silent && plainTextSummary === lastSavedContentRef.current && !forceOverride) {
                setAutoSaveStatus('saved');
                setSessionOperation('idle');
                return Promise.resolve();
            }

            const { attachments: _oldAttachments, ...baseSession } = sessionToEdit || {};

            if (!draftIdRef.current) {
                draftIdRef.current = sessionToEdit?.id || generateUUID();
            }
            const finalId = draftIdRef.current;

            const sessionPayload: Omit<Session, 'id'> | Session = {
                ...baseSession,
                id: finalId,
                date: new Date(sessionDate).toISOString(),
                duration,
                price,
                paymentStatus,
                sessionType,
                status: 'draft',
                notes: plainTextSummary,
                draft_notes: (typeof draftContent === 'object' ? draftContent : undefined) as JSONContent | undefined,
                draft_moods: draftMoods,
                transcript: transcriptText,
                draft_updated_at: new Date().toISOString(),
                tags: currentTags,
                goalIds: selectedGoalIds,
                attachments: sessionToEdit ? existingAttachments : [],
            };

            const expectedRevision = forceOverride ? (serverRevision || localRevision) : localRevision;

            const result = await onSave(sessionPayload, silent ? [] : attachments, expectedRevision, forceOverride);
            
            if (result) {
                if (result.status === 'success') {
                    const newRev = result.revision || (expectedRevision + 1);
                    // INV-1: Server revision strict monotonicity
                    if (newRev < localRevision) {
                        console.warn(`[TELEMETRIA] stale_response_discarded: Ignored obsolete success response (got rev ${newRev}, local is ${localRevision})`);
                        return Promise.resolve();
                    }
                    setLocalRevision(prev => Math.max(prev, newRev));
                    setBaseRevision(prev => Math.max(prev, newRev));
                    setServerRevision(null);
                    lastSavedContentRef.current = plainTextSummary;
                    if (isMounted.current) {
                        setSessionOperation('idle');
                        if (silent) setAutoSaveStatus('saved');
                    }
                    return Promise.resolve();
                } else if (result.status === 'conflict') {
                    if (isMounted.current) {
                        // INV-1: Ignore obsolete conflict responses
                        if (result.serverRevision && result.serverRevision < localRevision) {
                            console.warn(`[TELEMETRIA] stale_response_discarded: Ignored obsolete conflict response (got rev ${result.serverRevision}, local is ${localRevision})`);
                            return Promise.resolve();
                        }
                        setServerRevision(result.serverRevision || null);
                        setSessionOperation('conflict');
                        if (silent) setAutoSaveStatus('error');
                    }
                    return Promise.reject(new Error("Conflict"));
                } else {
                    if (isMounted.current) {
                        setSessionOperation('save_failed');
                        if (silent) setAutoSaveStatus('error');
                    }
                    return Promise.reject(new Error(result.message || "Save failed"));
                }
            } else {
                // If void (legacy), assume success but log
                setLocalRevision(r => r + 1);
                lastSavedContentRef.current = plainTextSummary;
                if (isMounted.current) {
                    setSessionOperation('idle');
                    if (silent) setAutoSaveStatus('saved');
                }
                return Promise.resolve();
            }
        } catch (error) {
            console.error("Error saving draft:", error);
            if (isMounted.current) {
                setSessionOperation('save_failed');
                if (silent) setAutoSaveStatus('error');
            }
            return Promise.reject(error);
        } finally {
            if (isMounted.current && !silent) setIsSaving(false);
        }
    }, [sessionToEdit, sessionDate, duration, price, paymentStatus, sessionType, currentTags, selectedGoalIds, existingAttachments, attachments, onSave, validate, localRevision, serverRevision, sessionOperation]);

    const handleFinalize = useCallback(async (onFinalizeFn?: (session: Omit<Session, 'id'> | Session, files: File[], expectedRevision: number) => Promise<SaveResult>) => {
        if (!validateForFinalize()) return false;
        
        if (!onFinalizeFn) {
            console.error("onFinalize function not provided");
            return false;
        }

        setSessionOperation('finalizing');
        setIsSaving(true);

        try {
            const { attachments: _oldAttachments, ...baseSession } = sessionToEdit || {};
            const finalId = draftIdRef.current || sessionToEdit?.id || generateUUID();

            const sessionPayload: Omit<Session, 'id'> | Session = {
                ...baseSession,
                id: finalId,
                date: new Date(sessionDate).toISOString(),
                duration,
                price,
                paymentStatus,
                sessionType,
                status: 'completed',
                notes: reviewText,
                finalized_at: new Date().toISOString(),
                tags: currentTags,
                goalIds: selectedGoalIds,
                attachments: sessionToEdit ? existingAttachments : [],
            };

            const result = await onFinalizeFn(sessionPayload, attachments, localRevision);
            
            if (result.status === 'success') {
                setSessionOperation('idle');
                return true;
            } else if (result.status === 'conflict') {
                setServerRevision(result.serverRevision || null);
                setSessionOperation('conflict');
                return false;
            } else {
                setSessionOperation('save_failed');
                return false;
            }
        } catch (e) {
            console.error("Error finalizing:", e);
            setSessionOperation('save_failed');
            return false;
        } finally {
            if (isMounted.current) setIsSaving(false);
        }
    }, [sessionToEdit, sessionDate, duration, price, paymentStatus, sessionType, currentTags, selectedGoalIds, existingAttachments, attachments, validateForFinalize, localRevision, reviewText]);

    const triggerAutoSave = useCallback((content: JSONContent | string) => {
        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
        }
        setAutoSaveStatus('idle');
        autoSaveTimerRef.current = setTimeout(() => {
            // Se estiver em conflito, bloqueia autosave até o usuário resolver
            if (sessionOperation !== 'conflict') {
                handleSaveDraft(content, true).catch(() => {});
            }
        }, 5000);
    }, [handleSaveDraft, sessionOperation]);

    const enterReviewMode = useCallback((currentContent: JSONContent | string) => {
        const plainText = typeof currentContent === 'string' ? currentContent : getPlainTextFromSession(currentContent);
        setReviewText(plainText);
        setEditorMode('review');
    }, []);

    const exitReviewMode = useCallback(() => {
        setEditorMode('draft');
    }, []);

    return {
        formState: { notes, duration, price, sessionDate, sessionType, paymentStatus, newTagInput },
        setters: { setNotes, setDuration, setPrice, setSessionDate, setSessionType, setPaymentStatus, setNewTagInput, setErrors, setView },
        lists: { attachments, existingAttachments, currentTags, selectedGoalIds, suggestedTags, approvedTags },
        status: { isAnalyzing, isSaving, errors, view, isEditing, hasUnsavedChanges, editorMode, autoSaveStatus, isDraft, isFinalized, sessionOperation, serverRevision, localRevision, baseRevision },
        draft: { reviewText, setReviewText, triggerAutoSave, enterReviewMode, exitReviewMode, getDraftId: () => draftIdRef.current || sessionToEdit?.id || '' },
        handlers: {
            handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => e.target.files && setAttachments(p => [...p, ...Array.from(e.target.files!)]),
            removeFile: (f: File) => setAttachments(p => p.filter(x => x !== f)),
            removeExistingAttachment: (i: number) => setExistingAttachments(p => p.filter((_, idx) => idx !== i)),
            handleAddTag: () => {
                const t = newTagInput.trim();
                if (t && !currentTags.some(tag => tag.text.toLowerCase() === t.toLowerCase())) {
                    setCurrentTags(p => [...p, { id: generateUUID(), text: t }]);
                    setNewTagInput('');
                }
            },
            handleRemoveTag: (id: string) => setCurrentTags(p => p.filter(t => t.id !== id)),
            toggleGoalSelection: (id: string) => setSelectedGoalIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]),
            toggleTagApproval: (tag: Tag) => setApprovedTags(p => p.find(t => t.id === tag.id) ? p.filter(t => t.id !== tag.id) : [...p, tag]),
            handleAnalyze,
            handleSaveDraft,
            handleFinalize,
            validate,
            validateForFinalize,
            setSessionOperation
        }
    };
};
