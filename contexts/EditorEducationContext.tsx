import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

export const CURRENT_EDITOR_VERSION = 2; // Incrementar ao lançar grandes mudanças

export type ChecklistProgress = {
    viewedTranscript: boolean;
    createdDraft: boolean;
    publishedEvolution: boolean;
    finalizedSession: boolean;
};

export type AnalyticsEvent = 
    | 'onboarding_started'
    | 'onboarding_completed'
    | 'tour_started'
    | 'tour_skipped'
    | 'smart_paste_triggered'
    | 'smart_paste_moved_to_transcript'
    | 'smart_paste_kept_in_draft'
    | 'smart_paste_cancelled'
    | 'evolution_published'
    | 'session_finalized'
    | 'friction_generated_then_wiped'
    | 'friction_published_then_edited'
    | 'friction_published_never_finalized';

interface EditorEducationState {
    showOnboarding: boolean;
    setShowOnboarding: (show: boolean) => void;
    showTour: boolean;
    setShowTour: (show: boolean) => void;
    isLearnerMode: boolean;
    setLearnerMode: (mode: boolean) => void;
    checklistProgress: ChecklistProgress;
    updateChecklist: (key: keyof ChecklistProgress) => void;
    isChecklistComplete: boolean;
    hasDismissedChecklist: boolean;
    completeOnboarding: (learnerMode: boolean) => void;
    trackEvent: (event: AnalyticsEvent, metadata?: any) => void;
    requestHelp: () => void;
}

const EditorEducationContext = createContext<EditorEducationState | undefined>(undefined);

export const EditorEducationProvider = ({ children }: { children: ReactNode }) => {
    const [isInitialized, setIsInitialized] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showTour, setShowTour] = useState(false);
    const [isLearnerMode, setLearnerMode] = useState(true);
    const [hasDismissedChecklist, setHasDismissedChecklist] = useState(false);
    const [checklistProgress, setChecklistProgress] = useState<ChecklistProgress>({
        viewedTranscript: false,
        createdDraft: false,
        publishedEvolution: false,
        finalizedSession: false,
    });

    useEffect(() => {
        // Inicialização via localStorage
        try {
            const versionSeen = parseInt(localStorage.getItem('mentis_editor_version_seen') || '0', 10);
            const savedLearnerMode = localStorage.getItem('mentis_learner_mode');
            const savedChecklist = localStorage.getItem('mentis_checklist_progress');
            
            if (versionSeen < CURRENT_EDITOR_VERSION) {
                setShowOnboarding(true);
                trackEvent('onboarding_started');
            }

            if (savedLearnerMode !== null) {
                setLearnerMode(savedLearnerMode === 'true');
            }

            if (savedChecklist) {
                setChecklistProgress(JSON.parse(savedChecklist));
            }
        } catch (e) {
            console.error('Failed to parse education state', e);
        }
        setIsInitialized(true);
    }, []);

    const trackEvent = useCallback((event: AnalyticsEvent, metadata?: any) => {
        // Simulação de envio para backend de analytics (ex: PostHog, Mixpanel, Segment)
        console.log(`[Analytics] ${event}`, metadata || '');
    }, []);

    const completeOnboarding = (optInLearnerMode: boolean) => {
        setLearnerMode(optInLearnerMode);
        localStorage.setItem('mentis_learner_mode', String(optInLearnerMode));
        localStorage.setItem('mentis_editor_version_seen', String(CURRENT_EDITOR_VERSION));
        
        setShowOnboarding(false);
        trackEvent('onboarding_completed', { learnerMode: optInLearnerMode });
    };

    const updateChecklist = useCallback((key: keyof ChecklistProgress) => {
        setChecklistProgress(prev => {
            if (prev[key]) return prev; // já marcado
            const next = { ...prev, [key]: true };
            localStorage.setItem('mentis_checklist_progress', JSON.stringify(next));
            return next;
        });
    }, []);

    const isChecklistComplete = Object.values(checklistProgress).every(Boolean);

    useEffect(() => {
        if (isChecklistComplete && !hasDismissedChecklist) {
            // Auto-hide após completar
            const timer = setTimeout(() => {
                setHasDismissedChecklist(true);
            }, 3000); // 3 segundos de celebração antes do fade-out
            return () => clearTimeout(timer);
        }
    }, [isChecklistComplete, hasDismissedChecklist]);

    const requestHelp = () => {
        setShowOnboarding(true);
    };

    if (!isInitialized) return null;

    return (
        <EditorEducationContext.Provider
            value={{
                showOnboarding,
                setShowOnboarding,
                showTour,
                setShowTour,
                isLearnerMode,
                setLearnerMode,
                checklistProgress,
                updateChecklist,
                isChecklistComplete,
                hasDismissedChecklist,
                completeOnboarding,
                trackEvent,
                requestHelp
            }}
        >
            {children}
        </EditorEducationContext.Provider>
    );
};

export const useEditorEducation = () => {
    const context = useContext(EditorEducationContext);
    if (!context) {
        throw new Error('useEditorEducation must be used within an EditorEducationProvider');
    }
    return context;
};
