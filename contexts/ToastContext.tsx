
import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircleIcon, ExclamationIcon, PlusIcon } from '../components/Icons'; // Reusing icons
import { generateUUID } from '../utils/uuid.ts';



export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: any, type?: ToastType, contextCode?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Componente Visual do Toast (Balão VIP)
const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);

  // Configuração Premium M3 (Neuro-Minimalismo)
  const config = {
    success: {
      bg: 'bg-emerald-50/80 dark:bg-emerald-900/20',
      iconBg: 'bg-emerald-100 dark:bg-emerald-800/40',
      text: 'text-emerald-800 dark:text-emerald-200',
      icon: <CheckCircleIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
    },
    warning: {
      bg: 'bg-amber-50/80 dark:bg-amber-900/20',
      iconBg: 'bg-amber-100 dark:bg-amber-800/40',
      text: 'text-amber-800 dark:text-amber-200',
      icon: <ExclamationIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
    },
    error: {
      bg: 'bg-rose-50/80 dark:bg-rose-900/20',
      iconBg: 'bg-rose-100 dark:bg-rose-800/40',
      text: 'text-rose-800 dark:text-rose-200',
      icon: <ExclamationIcon className="h-5 w-5 text-rose-600 dark:text-rose-400" />
    },
    info: {
      bg: 'bg-slate-50/80 dark:bg-slate-900/20',
      iconBg: 'bg-slate-100 dark:bg-slate-800/40',
      text: 'text-slate-800 dark:text-slate-200',
      icon: <div className="h-5 w-5 flex items-center justify-center font-serif italic text-slate-600 dark:text-slate-400">i</div>
    },
  };

  const current = config[toast.type];

  // Entrada em mola e Auto-dismiss
  React.useEffect(() => {
    // Pequeno delay para garantir a montagem antes da animação
    const animTimer = setTimeout(() => setIsVisible(true), 10);

    const dismissTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onRemove(toast.id), 300); // Espera o fade out
    }, 5000); // 5 segundos para leitura confortável

    return () => {
      clearTimeout(animTimer);
      clearTimeout(dismissTimer);
    };
  }, [toast.id, onRemove]);

  return (
    <div
      className={`
        flex items-center gap-4 p-2 pr-6 mb-3 
        min-w-[280px] max-w-md rounded-full
        backdrop-blur-md border border-white/20 dark:border-white/5
        shadow-[0_8px_32px_rgba(0,0,0,0.08)]
        transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)
        ${current.bg}
        ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95'}
      `}
      role="alert"
    >
      {/* O Avatar (Ícone VIP) */}
      <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center shadow-inner ${current.iconBg}`}>
        {current.icon}
      </div>

      {/* A Mensagem (Conversational UI) */}
      <div className={`flex-grow text-sm font-medium leading-tight py-1 ${current.text}`}>
        {toast.message}
      </div>

      {/* Close discreto */}
      <button
        type="button"
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => onRemove(toast.id), 300);
        }}
        className="flex-shrink-0 opacity-40 hover:opacity-100 transition-opacity"
      >
        <PlusIcon className="w-5 h-5 rotate-45" />
      </button>
    </div>
  );
};

export const showGlobalToast = (message: string, type: ToastType = 'info') => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('SHOW_GLOBAL_TOAST', {
      detail: { message, type }
    }));
  }
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: any, type: ToastType = 'info', contextCode?: string) => {
    const id = generateUUID();
    // Guarda defensiva: se recebermos um objeto {type, title, message}, extraímos os campos corretos
    let finalMessage: string;
    let finalType: ToastType = type;
    if (typeof message === 'object' && message !== null && 'message' in message) {
      finalMessage = String(message.message);
      if (message.type && ['success', 'warning', 'error', 'info'].includes(message.type)) {
        finalType = message.type as ToastType;
      }
    } else {
      finalMessage = String(message);
    }
    setToasts((prev) => [...prev, { id, message: finalMessage, type: finalType }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  React.useEffect(() => {
    const handleGlobalToast = (event: Event) => {
      const customEvent = event as CustomEvent<{ message: string, type: ToastType }>;
      if (customEvent.detail) {
        addToast(customEvent.detail.message, customEvent.detail.type);
      }
    };
    window.addEventListener('SHOW_GLOBAL_TOAST', handleGlobalToast);
    return () => window.removeEventListener('SHOW_GLOBAL_TOAST', handleGlobalToast);
  }, [addToast]);

  return (
 <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

