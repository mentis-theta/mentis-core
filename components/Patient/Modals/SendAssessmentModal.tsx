import React, { useState } from 'react';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import { useAssessmentLinks } from '@/hooks/useAssessmentLinks';
import type { ScaleName } from '@/utils/assessmentScales';
import { usePatientContext } from '@/contexts/PatientContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCrypto } from '@/contexts/CryptoContext';
import * as cryptoService from '@/services/cryptoService';
import { supabase } from '@/services/supabaseClient';
import { ClipboardCopy, Send, CheckCircle2, Link2, Loader2 } from 'lucide-react';
import { WhatsappIcon } from '@/components/Icons';
import { useDecoupledData } from '@/hooks/useDecoupledData';

interface SendAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SCALE_OPTIONS: { id: ScaleName; name: string; description: string; color: string }[] = [
  { id: 'GAD-7', name: 'GAD-7 (Ansiedade)', description: '7 perguntas • ~2 min', color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300' },
  { id: 'PHQ-9', name: 'PHQ-9 (Depressão)', description: '9 perguntas • ~3 min', color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300' },
  { id: 'DASS-21', name: 'DASS-21 (Humor/Ansiedade/Estresse)', description: '21 perguntas • ~6 min', color: 'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-300' },
  { id: 'PSS-10', name: 'PSS-10 (Estresse Percebido)', description: '10 perguntas • ~3 min', color: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-300' },
  { id: 'SPIN', name: 'SPIN (Fobia Social)', description: '17 perguntas • ~4 min', color: 'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300' },
  { id: 'ISI', name: 'ISI (Insônia)', description: '7 perguntas • ~2 min', color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' },
  { id: 'MSI-BPD', name: 'MSI-BPD (Triagem Borderline)', description: '10 perguntas • ~3 min', color: 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-900/20 dark:text-fuchsia-300' },
  { id: 'BPQ', name: 'BPQ (Avaliação Borderline)', description: '80 perguntas • ~15 min', color: 'bg-pink-50 text-pink-700 dark:bg-pink-900/20 dark:text-pink-300' },
  { id: 'ASRS-18', name: 'ASRS-18 (TDAH)', description: '18 perguntas • ~5 min', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' },
  { id: 'MDQ', name: 'MDQ (Bipolaridade)', description: '15 perguntas • ~4 min', color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300' },
  { id: 'C-SSRS', name: 'C-SSRS (Risco Suicida)', description: 'Triagem Condicional', color: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300' },
  { id: 'CBI', name: 'CBI (Burnout)', description: '19 perguntas • ~5 min', color: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300' },
  { id: 'AQ-10', name: 'AQ-10 (Autismo)', description: '10 perguntas • ~3 min', color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' },
  { id: 'SNAP-IV', name: 'SNAP-IV (TDAH/TOD)', description: '26 perguntas • ~7 min', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' },
  { id: 'OCI-R', name: 'OCI-R (Sintomas de TOC)', description: '18 perguntas • ~5 min', color: 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300' },
  { id: 'PCL-5', name: 'PCL-5 (TEPT)', description: '20 perguntas • ~6 min', color: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300' },
  { id: 'Pfeffer', name: 'Pfeffer (Autonomia/Demência)', description: '10 perguntas • ~3 min', color: 'bg-gray-50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300' },
];

const SendAssessmentModal: React.FC<SendAssessmentModalProps> = ({ isOpen, onClose }) => {
  const { patient } = usePatientContext();
  const { currentUser } = useAuth();
  const { masterKey } = useCrypto();

  const [selectedScale, setSelectedScale] = useState<ScaleName>('GAD-7');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');

  const { createLink, copyToClipboard, getWhatsAppShareUrl, generatedUrl, isCreating } =
    useAssessmentLinks(patient?.id || '', currentUser?.id || '');

  const { data: decoupledData, isLoading: isLoadingDecoupled } = useDecoupledData(patient?.id || '', 'summary');

  if (!patient || !currentUser) return null;

  // Sessões completadas para vincular
  const completedSessions = (decoupledData?.sessions || [])
    .filter(s => s.status === 'completed')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 20);

  const [isEnsuringKeys, setIsEnsuringKeys] = useState(false);

  const handleGenerate = async () => {
    if (!currentUser || !masterKey) return;
    setIsEnsuringKeys(true);
    try {
      // 1. Verificar se o terapeuta já possui a public_key no banco
      const { data: profile } = await supabase
        .from('profiles')
        .select('public_key')
        .eq('id', currentUser.id)
        .single();
        
      if (profile && !profile.public_key) {
        // Gerar on-the-fly para terapeutas "legacy" que pularam o login refresh
        const keyPair = await cryptoService.generateAsymmetricKeyPair();
        const encryptedPrivateKey = cryptoService.encryptData(keyPair.privateKey, masterKey);
        
        await supabase.from('profiles').update({
          public_key: keyPair.publicKey,
          encrypted_private_key: encryptedPrivateKey
        }).eq('id', currentUser.id);
        
        localStorage.setItem('mentis_private_key', encryptedPrivateKey);
      }
      
      createLink(selectedScale, selectedSessionId || undefined);
    } catch (error) {
      console.error('Failed to ensure keys:', error);
    } finally {
      setIsEnsuringKeys(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="📋 Enviar Avaliação">
      <div className="space-y-5 pt-2">

        {/* Step 1: Escolher Escala */}
        {!generatedUrl && (
          <>
            <div>
              <label className="block text-sm font-semibold text-foreground-muted mb-2">Escala</label>
              <div className="grid grid-cols-1 gap-3">
                {SCALE_OPTIONS.map(scale => (
                  <button
                    key={scale.id}
                    type="button"
                    onClick={() => setSelectedScale(scale.id)}
                    className={`
                      text-left p-4 rounded-xl border-2 transition-all duration-200
                      ${selectedScale === scale.id
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border hover:border-primary/30 bg-surface'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-on-surface text-sm">{scale.name}</p>
                        <p className="text-xs text-foreground-muted mt-0.5">{scale.description}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${scale.color}`}>
                        {scale.id}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Vincular a sessão (opcional) */}
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-2 mt-4 font-sans tracking-tight">
                Vincular à Sessão (Opcional)
              </label>
              {isLoadingDecoupled ? (
                <div className="flex items-center text-sm text-foreground-muted mb-4 mt-2">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Carregando sessões...
                </div>
              ) : (
                <select
                  className="w-full bg-surface-container border border-border/40 rounded-xl px-4 py-3 text-sm text-on-surface font-sans appearance-none font-medium focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                >
                  <option value="">Sem vínculo</option>
                  {completedSessions.map(s => (
                    <option key={s.id} value={s.id}>
                      Sessão em {new Date(s.date).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="pt-3 flex justify-end gap-3">
              <Button variant="ghost" onClick={handleClose}>Cancelar</Button>
              <Button variant="primary" onClick={handleGenerate} disabled={isCreating || isEnsuringKeys}>
                <Link2 size={16} className="mr-2" />
                {(isCreating || isEnsuringKeys) ? 'Gerando...' : 'Gerar Link'}
              </Button>
            </div>
          </>
        )}

        {/* Step 2: Link Gerado */}
        {generatedUrl && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center gap-3 text-emerald-600">
              <CheckCircle2 size={24} />
              <p className="font-bold">Link gerado com sucesso!</p>
            </div>

            <div className="bg-background rounded-xl p-3 border border-border flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={generatedUrl}
                className="flex-1 bg-transparent text-sm text-foreground-muted truncate outline-none"
              />
              <button
                onClick={copyToClipboard}
                className="p-2 hover:bg-surface-container-high rounded-lg transition-colors"
                title="Copiar link"
              >
                <ClipboardCopy size={18} className="text-primary" />
              </button>
            </div>

            <p className="text-xs text-foreground-muted">
              ⏳ Este link expira em 7 dias. O paciente não precisa de senha para responder.
            </p>

            <div className="flex flex-col gap-3 pt-2">
              <a
                href={getWhatsAppShareUrl(patient.phone, patient.name)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-colors shadow-sm"
              >
                <WhatsappIcon className="h-5 w-5" />
                Enviar pelo WhatsApp
              </a>

              <Button variant="ghost" onClick={handleClose} className="w-full">
                Fechar
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default SendAssessmentModal;
