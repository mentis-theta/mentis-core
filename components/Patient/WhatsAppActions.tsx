import React, { useState, useRef, useEffect } from 'react';
import { WhatsappIcon, CalendarIcon, CurrencyDollarIcon, LightBulbIcon, CheckCircleIcon } from '../Icons';
import { getWhatsAppLink, formatMessage } from '@/utils/whatsapp';
import { getNextSession, calculatePendingPayments } from '@/utils/patientLogic';
import { Patient, User, Session } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useDecoupledData } from '@/hooks/useDecoupledData';
import { Loader2 } from 'lucide-react';
import Button from '../Button';

interface WhatsAppActionsProps {
    patient: Patient;
    currentUser: User | null;
    sessionTarget?: Session | null; // New optional prop
}

const WhatsAppActions: React.FC<WhatsAppActionsProps> = ({ patient, currentUser, sessionTarget }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const { addToast } = useToast();

    const { data: decoupledData, isLoading: decoupledLoading } = useDecoupledData(patient.id, 'summary');

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!patient.phone) return null;

    if (decoupledLoading) {
        return (
            <Button variant="secondary" className="px-3" disabled>
                <Loader2 className="h-5 w-5 animate-spin" />
            </Button>
        );
    }

    const sessions = decoupledData?.sessions || [];

    // 1. Logic: Target Session (Prioritize prop, then calc next)
    const targetSession = sessionTarget || getNextSession(sessions);

    // 2. Logic: Pending Debt
    const pendingAmount = calculatePendingPayments(sessions);

    const getLink = (type: 'confirm' | 'payment' | 'reminder' | 'blank' | 'portal') => {
        const templates = currentUser?.messageTemplates || {};
        let text = '';

        switch (type) {
            case 'confirm':
                if (targetSession) {
                    const date = new Date(targetSession.date);
                    text = formatMessage(
                        templates.bookingConfirmation || "Olá {NOME}, confirmando nossa sessão de {DATA} às {HORA}.",
                        {
                            NOME: patient.name,
                            DATA: date.toLocaleDateString('pt-BR'),
                            HORA: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                        }
                    );
                } else {
                    text = `Olá ${patient.name}, gostaria de agendar nossa próxima sessão?`;
                }
                break;

            case 'payment':
                text = formatMessage(
                    templates.paymentRequest || "Olá {NOME}, identificamos um total pendente de R$ {VALOR}. Segue Pix: {PIX}",
                    {
                        NOME: patient.name,
                        VALOR: pendingAmount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00',
                        PIX: currentUser?.cpf || currentUser?.email || 'Chave Pix não cadastrada'
                    }
                );
                break;

            case 'reminder':
                text = formatMessage(
                    templates.taskReminder || "Olá {NOME}, passando para lembrar da tarefa de casa combinada.",
                    { NOME: patient.name }
                );
                break;

            case 'blank':
            default:
                text = formatMessage(
                    templates.patientGreeting || "Olá {NOME}, aqui é Psi. {PSI}.",
                    { NOME: patient.name, PSI: currentUser?.name || '' }
                );
                break;
        }
        
        if (type === 'portal') {
            if (!patient.birthDate) {
                addToast('Data de Nascimento obrigatória para gerar o link do Portal.', 'warning');
                return '#';
            }
            const version = patient.portalTokenVersion || 1;
            const tokenRaw = `${patient.id}:${patient.birthDate}:${version}`;
            const token = btoa(tokenRaw);
            const magicLink = `${window.location.origin}/portal/login?token=${token}`;
            text = `Olá, ${patient.name}. O link para acessar o seu ambiente seguro no Portal do Paciente Mentis é: ${magicLink} \n\nAo entrar, confirme sua Data de Nascimento.`;
        }

        return getWhatsAppLink(patient.phone, text) || '#';
    };

    return (
        <div className="relative inline-block text-left flex-1 md:flex-none" ref={menuRef}>
            <Button
                type="button" // Fix: Prevent form submission inside Modal
                variant="secondary"
                size="sm"
                className="w-full justify-center text-green-700 bg-green-50 hover:bg-green-100 border-green-200"
                onClick={() => setIsOpen(!isOpen)}
            >
                <WhatsappIcon className="h-4 w-4" /> <span className="ml-2">Contato</span>
                {/* Chevron */}
                <svg className={`ml-2 h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </Button>

            {isOpen && (
                <div className="absolute left-0 mt-2 w-72 bg-surface rounded-xl shadow-xl ring-1 ring-black/5 z-[60] focus:outline-none origin-top-left">
                    <div className="py-1">
                        {/* Option 1: Confirm Session */}
                        <a
                            href={getLink('confirm')}
                            target="_blank"
                            rel="noreferrer"
                            className="group flex items-center px-4 py-3 text-sm text-foreground-muted hover:bg-green-50 dark:hover:bg-green-900/20"
                            onClick={() => setIsOpen(false)}
                        >
                            <CalendarIcon className="mr-3 h-5 w-5 text-foreground-muted group-hover:text-green-600" />
                            <div className="flex flex-col">
                                <span className="font-medium">Confirmar Sessão</span>
                                <span className="text-xs text-foreground-muted ">
                                    {targetSession
                                        ? `${new Date(targetSession.date).toLocaleDateString()} às ${new Date(targetSession.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                        : 'Nenhuma sessão agendada'}
                                </span>
                            </div>
                        </a>

                        {/* Option 2: Payment */}
                        <a
                            href={getLink('payment')}
                            target="_blank"
                            rel="noreferrer"
                            className="group flex items-center px-4 py-3 text-sm text-foreground-muted hover:bg-green-50 dark:hover:bg-green-900/20 border-t border-border "
                            onClick={() => setIsOpen(false)}
                        >
                            <CurrencyDollarIcon className="mr-3 h-5 w-5 text-foreground-muted group-hover:text-green-600" />
                            <div className="flex flex-col">
                                <span className="font-medium">Enviar Cobrança</span>
                                <span className="text-xs text-foreground-muted ">
                                    {pendingAmount > 0
                                        ? `Pendente: R$ ${pendingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                        : 'Tudo em dia!'}
                                </span>
                            </div>
                        </a>

                        {/* Option 3: Reminder */}
                        <a
                            href={getLink('reminder')}
                            target="_blank"
                            rel="noreferrer"
                            className="group flex items-center px-4 py-3 text-sm text-foreground-muted hover:bg-green-50 dark:hover:bg-green-900/20 border-t border-border "
                            onClick={() => setIsOpen(false)}
                        >
                            <LightBulbIcon className="mr-3 h-5 w-5 text-foreground-muted group-hover:text-green-600" />
                            <span className="font-medium">Lembrete de Tarefa</span>
                        </a>

                        {/* Option 4: Portal */}
                        {patient.portalEnabled && (
                            <a
                                href={getLink('portal')}
                                target="_blank"
                                rel="noreferrer"
                                className="group flex items-center px-4 py-3 text-sm text-foreground-muted hover:bg-green-50 dark:hover:bg-green-900/20 border-t border-border "
                                onClick={() => setIsOpen(false)}
                            >
                                <svg className="mr-3 h-5 w-5 text-foreground-muted group-hover:text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                <div className="flex flex-col">
                                    <span className="font-medium">Acesso ao Portal</span>
                                    <span className="text-xs text-foreground-muted">Enviar link mágico</span>
                                </div>
                            </a>
                        )}

                        {/* Option 5: Blank */}
                        <a
                            href={getLink('blank')}
                            target="_blank"
                            rel="noreferrer"
                            className="group flex items-center px-4 py-3 text-sm text-foreground-muted hover:bg-green-50 dark:hover:bg-green-900/20 border-t border-border "
                            onClick={() => setIsOpen(false)}
                        >
                            <WhatsappIcon className="mr-3 h-5 w-5 text-foreground-muted group-hover:text-green-600" />
                            <span className="font-medium">Abrir Chat</span>
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WhatsAppActions;
