
import React from 'react';
import Modal from './Modal.tsx';
import Button from './Button.tsx';
import { DownloadIcon } from './Icons';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InstallModal: React.FC<InstallModalProps> = ({ isOpen, onClose }) => {
  // Detectar se é iOS (iPhone/iPad)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Instalar Aplicativo">
      <div className="space-y-6">
        <div className="flex justify-center">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full">
            <DownloadIcon className="h-10 w-10 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        <p className="text-center text-foreground-muted ">
          Instale o <strong>Mentis</strong> na sua tela inicial para uma experiência de aplicativo nativo, com mais espaço de tela e acesso rápido.
        </p>

        <div className=" bg-surface dark:bg-slate-700/50 p-4 rounded-xl border border-border/60 text-sm">
          <h4 className="font-bold text-on-surface mb-2">Como instalar:</h4>

          {isIOS ? (
            <ol className="list-decimal list-inside space-y-2 text-foreground-muted ">
              <li>Toque no botão <strong>Compartilhar</strong> <span className="inline-block px-1.5 py-0.5 bg-slate-200 dark:bg-slate-600 rounded text-xs">⎋</span> do navegador.</li>
              <li>Role para baixo e selecione <strong>Adicionar à Tela de Início</strong>.</li>
              <li>Confirme clicando em <strong>Adicionar</strong>.</li>
            </ol>
          ) : (
            <ol className="list-decimal list-inside space-y-2 text-foreground-muted ">
              <li>Procure o ícone de instalação na barra de endereço ou no menu do navegador (três pontos).</li>
              <li>Selecione <strong>"Instalar Mentis"</strong> ou <strong>"Adicionar à Tela Inicial"</strong>.</li>
            </ol>
          )}
        </div>

        <div className="flex justify-center pt-2">
          <Button onClick={onClose}>Entendi</Button>
        </div>
      </div>
    </Modal>
  );
};

export default InstallModal;
