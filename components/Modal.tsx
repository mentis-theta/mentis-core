
import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  footer?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title, size = 'lg', footer }) => {
  const [isRendered, setIsRendered] = useState(false);
  const modalPanelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const sizeClasses = {
    sm: 'md:max-w-sm',
    md: 'md:max-w-md',
    lg: 'md:max-w-lg',
    xl: 'md:max-w-5xl',
    '2xl': 'md:max-w-6xl',
    full: 'md:max-w-full md:mx-4'
  };

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
    } else {
      const timer = setTimeout(() => setIsRendered(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
      }
    };

    if (isRendered && isOpen) {
      const focusTimer = setTimeout(() => {
        modalPanelRef.current?.focus();
      }, 50);

      window.addEventListener('keydown', handleEsc);

      return () => {
        clearTimeout(focusTimer);
        window.removeEventListener('keydown', handleEsc);
      };
    }
  }, [isRendered, isOpen]);

  if (!isRendered) {
    return null;
  }

  return ReactDOM.createPortal(
    <div
      className={`fixed inset-0 z-[999] flex items-end md:items-center justify-center md:p-4 transition-all duration-200 ease-out ${isOpen ? 'bg-slate-900/40 backdrop-blur-sm' : 'bg-slate-900/0'}`}
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        ref={modalPanelRef}
        tabIndex={-1}
        className={`
          flex flex-col
          relative w-full ${sizeClasses[size] || sizeClasses.lg} transform
          bg-surface border border-border/60 shadow-2xl
          transition-all duration-200 ease-out focus:outline-none
          rounded-t-[28px] rounded-b-none pb-safe max-h-[92dvh]
          md:rounded-[28px] md:pb-0 md:max-h-[85vh]
          ${isOpen
            ? 'opacity-100 translate-y-0 md:scale-100'
            : 'opacity-0 translate-y-8 md:translate-y-0 md:scale-95'
          }
        `}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 pb-2 md:pb-4 flex items-start justify-between flex-shrink-0">
          <h2 id="modal-title" className="text-xl font-semibold text-foreground">{title}</h2>
          <button
            type="button"
            className="min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 md:h-9 md:w-9 flex items-center justify-center rounded-full bg-background/60 dark:bg-slate-700/60 text-foreground-muted hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-600 transition-all duration-200"
            onClick={onClose}
            aria-label="Fechar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 pb-6 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 text-foreground-muted">{children}</div>
        {footer && (
          <div className="p-4 px-6 border-t border-border/60 bg-surface rounded-b-none md:rounded-b-[28px] flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
