import React, { useState, useEffect } from 'react';
import Button from '@/components/Button';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile } from '@/services/authService';
import { MessageTemplates } from '@/types';
import { useToast } from '@/contexts/ToastContext';

interface TemplateInputProps {
    label: string;
    value: string;
    onChange: (val: string) => void;
    variables?: string[];
    placeholder?: string;
}

const TemplateInput: React.FC<TemplateInputProps> = ({ label, value, onChange, variables, placeholder }) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    const insertVariable = (variable: string) => {
        if (!textareaRef.current) return;

        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const text = value;
        const before = text.substring(0, start);
        const after = text.substring(end, text.length);

        const newText = before + variable + after;
        onChange(newText);

        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + variable.length;
            }
        }, 0);
    };

    return (
        <div>
            <label className="block text-sm font-medium text-foreground-muted mb-1">
                {label}
            </label>
            <textarea
                ref={textareaRef}
                rows={2}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="block w-full rounded-md border-border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-surface dark:bg-slate-700 mb-2"
            />
            {variables && variables.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {variables.map((v) => (
                        <button
                            key={v}
                            type="button"
                            onClick={() => insertVariable(v)}
                            className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 transition-colors border border-blue-200 dark:border-blue-800"
                            title={`Inserir ${v}`}
                        >
                            + {v}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export const CommunicationSettings: React.FC = () => {
    const { currentUser, refreshUsers } = useAuth();
    const [templates, setTemplates] = useState<MessageTemplates>({});
    const [isSavingTemplates, setIsSavingTemplates] = useState(false);
 const { addToast } = useToast();

    useEffect(() => {
        if (currentUser?.messageTemplates) {
            setTemplates(currentUser.messageTemplates);
        }
    }, [currentUser]);

    const handleSaveTemplates = async () => {
        if (!currentUser) return;
        setIsSavingTemplates(true);
        try {
            await updateProfile(currentUser.id, { messageTemplates: templates });
            await refreshUsers();
 addToast('Modelos de mensagem salvos com sucesso!', 'success');
        } catch (error) {
 console.error(error);
 addToast('Erro ao salvar modelos.', 'error');
        } finally {
            setIsSavingTemplates(false);
        }
    };

    return (
        <div className="mt-8 pt-6 border-t border-border ">
            <div className="mb-6">
                <h3 className="text-lg leading-6 font-medium text-on-surface ">
                    Comunicação e Mensagens (WhatsApp)
                </h3>
                <p className="mt-1 text-sm text-foreground-muted ">
                    Personalize os textos automáticos. Use as variáveis para preenchimento dinâmico.
                </p>
            </div>

            <div className="space-y-6">
                <TemplateInput
                    label="Confirmação de Sessão"
                    value={templates.bookingConfirmation || ''}
                    onChange={(val: string) => setTemplates({ ...templates, bookingConfirmation: val })}
                    variables={['{NOME}', '{DATA}', '{HORA}']}
                    placeholder="Olá {NOME}, confirmando nossa sessão..."
                />
                <TemplateInput
                    label="Cobrança/Pagamento"
                    value={templates.paymentRequest || ''}
                    onChange={(val: string) => setTemplates({ ...templates, paymentRequest: val })}
                    variables={['{NOME}', '{VALOR}', '{PIX}']}
                    placeholder="Olá {NOME}, o total pendente é R$ {VALOR}..."
                />
                <TemplateInput
                    label="Lembrete de Tarefa"
                    value={templates.taskReminder || ''}
                    onChange={(val: string) => setTemplates({ ...templates, taskReminder: val })}
                    variables={['{NOME}']}
                    placeholder="Passando para lembrar da tarefa de casa..."
                />
                <TemplateInput
                    label="Saudação Inicial"
                    value={templates.patientGreeting || ''}
                    onChange={(val: string) => setTemplates({ ...templates, patientGreeting: val })}
                    variables={['{NOME}']}
                    placeholder="Olá {NOME}, aqui é Psi. Fulano..."
                />

                <div className="flex justify-end">
                    <Button onClick={handleSaveTemplates} disabled={isSavingTemplates}>
                        {isSavingTemplates ? 'Salvando...' : 'Salvar Textos'}
                    </Button>
                </div>
            </div>
        </div>
    );
};
