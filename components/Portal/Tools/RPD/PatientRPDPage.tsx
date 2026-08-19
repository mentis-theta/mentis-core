
import React, { useState } from 'react';
import { usePatientRPD } from '@/hooks/usePatientRPD';
import PatientRPDList from './PatientRPDList';
import PatientRPDWizard from './PatientRPDWizard';
import Button from '@/components/Button';
import { usePortalNavigation } from '@/hooks/usePortalNavigation';
import { Pencil } from 'lucide-react';

const PatientRPDPage: React.FC = () => {
    const { rpds, loading, refresh } = usePatientRPD();
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const { goBack } = usePortalNavigation();

    return (
        <div className="animate-[fadeIn_500ms_ease-out] max-w-2xl mx-auto pb-20">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => goBack()}
                        className="h-10 w-10 flex items-center justify-center rounded-full bg-background text-foreground-muted hover:text-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-300"
                    >
                        ←
                    </button>
                    <h1 className="text-2xl font-semibold text-on-surface tracking-tight">Diário de Emoções</h1>
                </div>

                <Button onClick={() => setIsWizardOpen(true)} className="!rounded-full shadow-md shadow-indigo-500/15 px-5 flex items-center">
                    <Pencil className="w-4 h-4 mr-2" /> Novo Registro
                </Button>
            </div>

            {/* List */}
            <PatientRPDList rpds={rpds} loading={loading} date={new Date().toISOString()} />

            {/* Wizard Modal */}
            {isWizardOpen && (
                <PatientRPDWizard
                    onClose={() => setIsWizardOpen(false)}
                    onSuccess={() => {
                        setIsWizardOpen(false);
                        refresh();
                    }}
                />
            )}
        </div>
    );
};

export default PatientRPDPage;
