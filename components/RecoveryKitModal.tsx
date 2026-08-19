import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import Button from './Button';
import { NeuronIcon } from './Icons';
import { AlertTriangle, Download, CheckCircle2 } from 'lucide-react';
import * as cryptoService from '../services/cryptoService';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

interface RecoveryKitModalProps {
    isOpen: boolean;
    onClose: () => void;
    masterKey: string;
    userEmail: string;
}

const RecoveryKitModal: React.FC<RecoveryKitModalProps> = ({ isOpen, onClose, masterKey, userEmail }) => {
    const { currentUser } = useAuth();
    const { addToast } = useToast();
    const [recoveryCode, setRecoveryCode] = useState('');
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        if (isOpen && !recoveryCode) {
            setRecoveryCode(cryptoService.generateRecoveryCode());
        }
    }, [isOpen, recoveryCode]);

    if (!isOpen) return null;

    const downloadKit = async () => {
        if (!currentUser?.key_salt) {
            addToast('Perfil incompleto, tente novamente.', 'error');
            return;
        }

        try {
            // Save envelope to database before giving the user the code
            const envelope = cryptoService.createRecoveryEnvelope(masterKey, recoveryCode, currentUser.key_salt);
            const { error } = await supabase.rpc('set_recovery_envelope', {
                p_recovery_envelope: envelope
            });

            if (error) throw error;
            setIsSaved(true);

            // Generate PDF
            const doc = new jsPDF();
            doc.setFontSize(22);
            doc.setTextColor(40, 40, 40);
            doc.text("Mentis - Kit de Recuperação", 20, 20);

            doc.setFontSize(12);
            doc.setTextColor(60, 60, 60);
            doc.text("Este documento contém o seu Código de Recuperação Único.", 20, 40);
            doc.text("Se você esquecer sua senha, este é o ÚNICO meio de recuperar seus dados.", 20, 50);

            doc.setDrawColor(200, 200, 200);
            doc.line(20, 60, 190, 60);

            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.text("Seu Código de Recuperação:", 20, 80);

            doc.setFont("monospace");
            doc.setFontSize(16);
            doc.text(recoveryCode, 20, 95);

            doc.setFont("helvetica");
            doc.setFontSize(12);
            doc.text(`Usuário: ${userEmail}`, 20, 120);
            doc.text(`Gerado em: ${new Date().toLocaleString()}`, 20, 130);

            doc.setTextColor(255, 0, 0);
            doc.text("ATENÇÃO: GUARDE ESTE ARQUIVO EM LOCAL SEGURO.", 20, 150);
            doc.text("NÃO COMPARTILHE COM NINGUÉM.", 20, 160);

            doc.save("mentis-recovery-kit.pdf");

            addToast('Kit baixado e cofre blindado com sucesso!', 'success');
            setTimeout(onClose, 2000);

        } catch (err) {
            console.error('Erro ao gerar kit:', err);
            addToast('Ocorreu um erro ao blindar o cofre.', 'error');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-[28px] bg-surface p-8 shadow-2xl border border-red-200 dark:border-red-900">
                <div className="text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                        <NeuronIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-on-surface ">Kit de Recuperação</h2>
                    <p className="mt-2 text-foreground-muted ">
                        A segurança dos seus dados é nossa prioridade. Como usamos criptografia de ponta a ponta,
                        <strong> nós não temos acesso aos seus dados</strong>.
                    </p>
                </div>

                <div className="mt-6 bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100/60 dark:border-red-800">
                    <h3 className="font-semibold text-red-800 dark:text-red-300 flex items-center">
                        <AlertTriangle className="w-5 h-5 mr-2" /> Importante
                    </h3>
                    <ul className="mt-2 text-sm text-red-700 dark:text-red-200 list-disc list-inside space-y-1">
                        <li>Se você perder sua senha, seus dados estarão inacessíveis.</li>
                        <li>Este Kit de Recuperação é a única forma de restaurar o acesso.</li>
                        <li>Salve este PDF em um local seguro (ex: Google Drive, Cofre Digital).</li>
                    </ul>
                </div>

                <div className="mt-8 flex flex-col gap-3">
                    <Button onClick={downloadKit} className="w-full bg-red-600 hover:bg-red-700 text-white flex justify-center items-center gap-2" disabled={isSaved}>
                        {isSaved ? <CheckCircle2 className="w-5 h-5" /> : <Download className="w-5 h-5" />}
                        {isSaved ? 'Kit Salvo' : 'Baixar Kit de Recuperação'}
                    </Button>
                    <button onClick={onClose} className="text-sm text-foreground-muted hover:text-slate-700 dark:hover:text-slate-200 underline">
                        Fazer isso depois (Não recomendado)
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RecoveryKitModal;
