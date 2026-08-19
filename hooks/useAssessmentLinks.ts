import { useState } from 'react';
import { createAssessmentLink } from '@/services/assessmentService';
import type { ScaleName } from '@/utils/assessmentScales';
import { useToast } from '@/contexts/ToastContext';

export const useAssessmentLinks = (patientId: string, psychologistId: string) => {
  const { addToast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  const createLink = async (
    scaleName: ScaleName,
    sessionId?: string
  ): Promise<string | null> => {
    setIsCreating(true);
    setGeneratedUrl(null);

    const result = await createAssessmentLink(patientId, psychologistId, scaleName, sessionId);

    setIsCreating(false);

    if (result.success && result.token) {
      // Prioriza a URL configurada no Vercel (Production/Preview) ou usa a do navegador
      const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      // Garante que não termine com barra /
      const cleanBaseUrl = baseUrl.replace(/\/$/, '');
      const url = `${cleanBaseUrl}/avaliacao/${result.token}`;
      setGeneratedUrl(url);
      addToast('Link de avaliação gerado!', 'success');
      return url;
    } else {
      addToast(result.error || 'Erro ao gerar link.', 'error');
      return null;
    }
  };

  const copyToClipboard = async () => {
    if (!generatedUrl) return;
    try {
      await navigator.clipboard.writeText(generatedUrl);
      addToast('Link copiado!', 'success');
    } catch {
      addToast('Erro ao copiar link.', 'error');
    }
  };

  const getWhatsAppShareUrl = (patientPhone: string, patientName: string) => {
    if (!generatedUrl) return '#';
    const cleanPhone = patientPhone.replace(/\D/g, '');
    const phone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const text = encodeURIComponent(
      `Olá ${patientName}, preparei uma avaliação rápida para você. São poucas perguntas e leva menos de 2 minutos:\n\n${generatedUrl}\n\nResponda quando puder. 😊`
    );
    return `https://wa.me/${phone}?text=${text}`;
  };

  return {
    createLink,
    copyToClipboard,
    getWhatsAppShareUrl,
    generatedUrl,
    isCreating,
  };
};
