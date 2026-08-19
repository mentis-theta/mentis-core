import React from 'react';
import Modal from '@/components/Modal';

interface PatientModalProps {
  isOpen: boolean;
  onCloseRequest: () => void;
  title: string;
  isDirty?: boolean;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  footer?: React.ReactNode;
}

const PatientModal: React.FC<PatientModalProps> = ({
  isOpen,
  onCloseRequest,
  title,
  isDirty = false,
  children,
  size = 'lg',
  footer
}) => {
  const handleClose = () => {
    if (isDirty) {
      if (window.confirm('Você tem alterações não salvas. Deseja realmente fechar e perder seu progresso?')) {
        onCloseRequest();
      }
    } else {
      onCloseRequest();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size={size}
      footer={footer}
    >
      <div className="animate-[fadeIn_500ms_ease-out]">
        {children}
      </div>
    </Modal>
  );
};

export default PatientModal;
