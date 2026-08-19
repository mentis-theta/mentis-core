
import React, { useState } from 'react';
import Modal from '../Modal.tsx';
import Button from '../Button.tsx';
import type { Session } from '@/types.ts';
import { formatDateTime } from '@/utils/formatters.ts';
import { TagIcon, ClockIcon, CheckCircleIcon, ExclamationIcon, TrashIcon } from '../Icons';
import { LABELS, SESSION_STATUS_ICONS } from '@/utils/mappers.ts';
import StatusBadge from '../StatusBadge.tsx';
import { RichTextRenderer, getPlainTextFromSession } from './RichTextRenderer.tsx';
import { ClipboardList, Brain, FileText, Shield, PenLine, Copy } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

interface ViewSessionNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session | null;
}

const ViewSessionNotesModal: React.FC<ViewSessionNotesModalProps> = ({ isOpen, onClose, session }) => {
  const [activeTab, setActiveTab] = useState<'prontuario' | 'insights' | 'rascunho'>('prontuario');
  const { addToast } = useToast();

  if (!session) return null;

  const hasInsights = !!(session.resumo_sessao || session.mecanismos_enfrentamento);
  const isDraft = session.status === 'draft';
  const hasDraftNotes = !!session.draft_notes;

  const handleCopyText = (content: any) => {
    const text = getPlainTextFromSession(content);
    if (text) {
      navigator.clipboard.writeText(text);
      addToast('Texto copiado com sucesso!', 'success');
    }
  };

  // Helper para renderizar o badge de status da sessão (mesma lógica da lista)
  const renderSessionStatusBadge = (status: Session['status']) => {
    const StatusIcon = SESSION_STATUS_ICONS[status] || ClockIcon;
    const label = LABELS.SESSION_STATUS[status] || 'Desconhecido';

    let colorClass = 'bg-background text-foreground-muted dark:bg-slate-700';
    if (status === 'scheduled') colorClass = 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
    if (status === 'draft') colorClass = 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300';
    if (status === 'completed') colorClass = 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
    if (status === 'canceled') colorClass = 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
    if (status === 'missed') colorClass = 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300';

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${colorClass}`}>
        <StatusIcon className="w-3 h-3 mr-1.5" /> {label}
      </span>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Detalhes da Sessão"
      footer={
        <div className="flex justify-end">
          <Button type="button" onClick={onClose} variant="secondary">
            Fechar
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-surface dark:bg-slate-700/50 border border-border/60 space-y-1">
            <p className="text-xs text-gray-500 uppercase font-semibold">Data e Hora</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100 text-lg">{formatDateTime(session.date)}</p>
            <p className="text-sm text-gray-500">{session.duration} min &bull; {LABELS.SESSION_TYPE[session.sessionType]}</p>
          </div>

          <div className="p-4 rounded-xl bg-surface dark:bg-slate-700/50 border border-border/60 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Status Sessão:</span>
              {renderSessionStatusBadge(session.status || 'completed')}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Pagamento:</span>
              <StatusBadge type="payment" value={session.paymentStatus} />
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-border ">
              <span className="text-sm text-gray-500">Valor:</span>
              <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {session.price?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00'}
              </span>
            </div>
          </div>
        </div>

        {/* Tags */}
        {session.tags && session.tags.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-foreground-muted uppercase mb-2">Tags Clínicas</label>
            <div className="flex flex-wrap gap-2">
              {session.tags.map(tag => (
                <span key={tag.id} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
                  <TagIcon className="w-3 h-3 mr-1.5 opacity-70" />
                  {tag.text}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        {(hasInsights || hasDraftNotes) ? (
          <div className="border-b border-border flex space-x-4 mb-4">
            <button
              onClick={() => setActiveTab('prontuario')}
              className={`py-2 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'prontuario'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-foreground-muted hover:text-slate-700 dark:hover:text-slate-300'
                }`}
            >
              <ClipboardList className="w-4 h-4" /> {isDraft ? 'Rascunho Atual' : 'Prontuário Oficial'}
            </button>
            {hasDraftNotes && !isDraft && (
              <button
                onClick={() => setActiveTab('rascunho')}
                className={`py-2 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'rascunho'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-foreground-muted hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
              >
                <PenLine className="w-4 h-4" /> Rascunho Original
              </button>
            )}
            {hasInsights && (
              <button
                onClick={() => setActiveTab('insights')}
                className={`py-2 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'insights'
                  ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-foreground-muted hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
              >
                <Brain className="w-4 h-4" /> Insights da IA
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center mb-4">
            <span className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <ClipboardList className="w-4 h-4" /> Prontuário Oficial
            </span>
          </div>
        )}

        {/* Content Area */}
        <div className="pb-2">
          {/* Prontuário Tab */}
          {activeTab === 'prontuario' && (
            <div className="flex-1 min-h-0 flex flex-col pt-1">
              {isDraft && (
                <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl">
                  <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                    ⚠️ Este é um rascunho que ainda não foi finalizado como evolução clínica oficial.
                  </p>
                </div>
              )}
              {session.notes && (
                <div className="flex justify-end mb-1">
                  <button
                    onClick={() => handleCopyText(session.notes)}
                    className="p-1.5 text-foreground-muted hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors rounded-md"
                    title="Copiar texto"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="py-2">
                {session.notes ? (
                  <RichTextRenderer content={session.notes} className="text-base leading-relaxed text-gray-800 dark:text-gray-200" />
                ) : (
                  <span className="italic text-gray-500 dark:text-gray-400">Nenhuma anotação registrada para esta sessão.</span>
                )}
              </div>
            </div>
          )}

          {/* Rascunho Original Tab */}
          {activeTab === 'rascunho' && hasDraftNotes && (
            <div className="flex-1 min-h-0 flex flex-col pt-1">
              <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl">
                <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                  📝 Este é o rascunho original escrito durante a sessão, antes de qualquer formatação ou organização por IA.
                </p>
              </div>
              <div className="flex justify-end mb-1">
                <button
                  onClick={() => handleCopyText(session.draft_notes)}
                  className="p-1.5 text-foreground-muted hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors rounded-md"
                  title="Copiar texto"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <div className="py-2">
                <RichTextRenderer content={session.draft_notes!} className="text-base leading-relaxed text-gray-800 dark:text-gray-200" />
              </div>
            </div>
          )}

          {/* Insights Tab */}
          {activeTab === 'insights' && (
            <div className="space-y-4 pt-1">
              {session.resumo_sessao && (
                <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100/60 dark:border-indigo-800/30">
                  <h4 className="font-semibold text-indigo-900 dark:text-indigo-200 flex items-center text-sm mb-2">
                    <FileText className="w-4 h-4 mr-2" />
                    Resumo da Sessão (IA)
                  </h4>
                  <p className="text-sm text-indigo-800 dark:text-indigo-300 whitespace-pre-wrap leading-relaxed">
                    {session.resumo_sessao}
                  </p>
                </div>
              )}

              {session.mecanismos_enfrentamento && (
                <div className="bg-teal-50 dark:bg-teal-900/10 p-4 rounded-xl border border-teal-100/60 dark:border-teal-800/30">
                  <h4 className="font-semibold text-teal-900 dark:text-teal-200 flex items-center text-sm mb-2">
                    <Shield className="w-4 h-4 mr-2" />
                    Mecanismos de Enfrentamento
                  </h4>
                  <p className="text-sm text-teal-800 dark:text-teal-300 whitespace-pre-wrap leading-relaxed">
                    {session.mecanismos_enfrentamento}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ViewSessionNotesModal;
