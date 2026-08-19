import React, { useState } from 'react';
import { AlertTriangle, Download } from 'lucide-react';
import Modal from '../../Modal';
import Button from '../../Button';

interface ExportWarningModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isExporting: boolean;
}

export const ExportWarningModal: React.FC<ExportWarningModalProps> = ({ isOpen, onClose, onConfirm, isExporting }) => {
    const [confirmText, setConfirmText] = useState('');

    const handleConfirm = () => {
        if (confirmText.trim().toUpperCase() === 'RESPONSABILIDADE LEGAL') {
            onConfirm();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="" size="lg">
            <div className="flex flex-col items-center text-center px-4 py-2">
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
                    <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-500" />
                </div>
                
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                    ATENÇÃO: Extração Descriptografada
                </h2>
                
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                    Você está prestes a extrair todos os dados clínicos dos seus pacientes do cofre E2EE (End-to-End Encrypted) para um arquivo de texto limpo no seu dispositivo.
                </p>

                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl p-5 mb-6 text-left w-full">
                    <h3 className="font-semibold text-red-800 dark:text-red-400 mb-2">Termos de Responsabilidade LGPD:</h3>
                    <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300 space-y-2">
                        <li>A segurança deste arquivo passa a ser sua inteira responsabilidade legal.</li>
                        <li>Caso seu computador seja compartilhado, outras pessoas poderão ler os prontuários.</li>
                        <li>O sistema Mentis não poderá proteger arquivos que saem da plataforma.</li>
                    </ul>
                </div>

                <div className="w-full space-y-3 mb-6">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 text-left">
                        Para prosseguir, digite <span className="font-mono bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded text-red-600 dark:text-red-400 select-none">RESPONSABILIDADE LEGAL</span>:
                    </label>
                    <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        className="block w-full appearance-none h-14 rounded-2xl border border-red-200 dark:border-red-900/50 px-4 text-center font-mono text-red-600 dark:text-red-400 font-bold tracking-wider bg-white dark:bg-slate-900 focus:border-red-500 focus:ring-4 focus:ring-red-500/20 focus:outline-none transition-all uppercase"
                        placeholder=""
                    />
                </div>

                <div className="flex gap-4 w-full">
                    <Button
                        onClick={onClose}
                        variant="ghost"
                        className="flex-1 !h-14 !rounded-xl"
                        disabled={isExporting}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={confirmText.trim().toUpperCase() !== 'RESPONSABILIDADE LEGAL' || isExporting}
                        isLoading={isExporting}
                        className="flex-1 !h-14 !rounded-xl !bg-red-600 hover:!bg-red-700 !text-white border-none"
                    >
                        <Download className="w-5 h-5 mr-2" /> Extrair Dados
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
