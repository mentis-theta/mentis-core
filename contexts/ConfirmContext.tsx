import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    requireInput?: boolean;
    inputPlaceholder?: string;
}

interface ConfirmContextType {
    confirm: (options: ConfirmOptions) => Promise<boolean | string>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const useConfirm = () => {
    const context = useContext(ConfirmContext);
    if (!context) throw new Error('useConfirm must be used within a ConfirmProvider');
    return context.confirm;
};

export const ConfirmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<ConfirmOptions | null>(null);
    const [inputValue, setInputValue] = useState('');
    const [resolver, setResolver] = useState<((value: boolean | string) => void) | null>(null);

    const confirm = useCallback((opts: ConfirmOptions) => {
        setOptions(opts);
        setInputValue('');
        setIsOpen(true);
        return new Promise<boolean | string>((resolve) => {
            setResolver(() => resolve);
        });
    }, []);

    const handleConfirm = () => {
        if (resolver) {
            if (options?.requireInput) {
                resolver(inputValue);
            } else {
                resolver(true);
            }
        }
        close();
    };

    const handleCancel = () => {
        if (resolver) resolver(false);
        close();
    };

    const close = () => {
        setIsOpen(false);
        setTimeout(() => {
            setOptions(null);
            setResolver(null);
            setInputValue(''); // Reset input value on close
        }, 200); // Timeout for out transition
    };

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}
            {isOpen && options && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className=" bg-surface rounded-[28px] p-8 shadow-xl max-w-sm w-full animate-slideUp">
                        <h3 className="text-xl font-semibold text-on-surface mb-3 tracking-tight">
                            {options.title}
                        </h3>
                        {options.message && (
                            <p className={`text-sm  text-foreground-muted    ${options.requireInput ? 'mb-4' : 'mb-8'} leading-relaxed`}>
                                {options.message}
                            </p>
                        )}
                        {options.requireInput && (
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={options.inputPlaceholder || "Digite aqui..."}
                                className="w-full mb-8 rounded-xl border border-border bg-surface dark:bg-slate-700 text-on-surface px-4 py-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                                autoFocus
                            />
                        )}
                        <div className="flex justify-end gap-2 font-medium">
                            <button
                                onClick={handleCancel}
                                className="px-5 py-2.5 text-sm text-foreground-muted hover:bg-slate-50 dark:hover:bg-slate-700 rounded-full transition-colors"
                            >
                                {options.cancelText || 'Cancelar'}
                            </button>
                            <button
                                onClick={handleConfirm}
                                className="px-5 py-2.5 text-sm bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 rounded-full transition-colors font-semibold"
                            >
                                {options.confirmText || 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </ConfirmContext.Provider>
    );
};
