import { ZodError } from 'zod';
import { 
  AppError, 
  ValidationError, 
  DatabaseError, 
  AuthError, 
  AIServiceError, 
  StorageError 
} from './errors';

type ToastFunction = (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;

/**
 * Retorna a mensagem amigável a partir de um erro.
 */
export const getErrorMessage = (error: unknown, contextCode: string = 'SYS'): string => {
  if (!error) return '';

  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];
    return firstIssue ? firstIssue.message : 'Verifique os dados preenchidos.';
  }

  if (error instanceof AppError) {
    return error.message;
  }

  const rawMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : String(error);
  const code = (error as any).code || (error as any).status || '000';

  const translations: Record<string, string> = {
    'Invalid login credentials': 'Ops, parece que a senha ou e-mail não bateram. Vamos tentar de novo?',
    'Invalid TOTP code': 'Esse código de segurança expirou ou está incorreto.',
    'Token expired': 'Sua sessão expirou. Por segurança, faça login novamente.',
    'Email not confirmed': 'Por favor, confirme seu e-mail para acessar sua conta.',
    'User not found': 'Não encontramos cadastro com esses dados.',
    'Network error': 'Sua conexão oscilou. Verifique sua internet.',
    'Failed to fetch': 'O sinal sumiu por um instante. Tentando reconectar...',
    'Muitas tentativas falhas': 'Sua conexão oscilou um pouco ou tivemos muitas tentativas. Aguarde um segundo que já vamos reconectar.',
    '429': 'Estamos indo um pouco rápido demais. Vamos respirar fundo e tentar em um minuto?'
  };

  if (translations[rawMessage]) return translations[rawMessage];
  if (translations[code]) return translations[code];
  if (rawMessage.includes('credentials')) return translations['Invalid login credentials'];
  if (rawMessage.includes('TOTP') || rawMessage.includes('verification_code')) return translations['Invalid TOTP code'];
  if (rawMessage.includes('rate limit')) return translations['429'];
  if (rawMessage.toLowerCase().includes('network') || rawMessage.toLowerCase().includes('fetch')) return translations['Network error'];
  if (rawMessage.includes('duplicate key value violates unique constraint')) return 'Esse registro já existe ou o horário já está ocupado.';

  const isTechnical = /\b(failed|invalid|null|undefined|is not a function|cannot read properties|fetch|network|token|unauthorized|sql|relation)\b/i.test(rawMessage);
  
  if (typeof error === 'string' && !isTechnical) {
    return error;
  }
  
  return `Algo deu errado. Tente novamente em instantes. [ERR-${contextCode}-${code}]`;
};

/**
 * Lida de forma centralizada com as exceções da aplicação, 
 * traduzindo erros técnicos em feedbacks empáticos e claros.
 */
export const handleError = (error: unknown, addToast?: ToastFunction, contextCode: string = 'SYS'): void => {
  let type: 'error' | 'warning' | 'info' = 'error';

  if (error instanceof ZodError) {
    type = 'warning';
  } else if (error instanceof AppError) {
    if (error instanceof ValidationError) type = 'warning';
    else if (error instanceof AuthError) type = 'warning';
  } else {
    const rawMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : String(error);
    if (rawMessage.includes('duplicate key value violates unique constraint')) {
      type = 'warning';
    }
  }

  const message = getErrorMessage(error, contextCode);
  if (addToast) addToast(message, type);
  
  if (!import.meta.env.PROD) {
    console.error(`[Unhandled Error - ${contextCode}]`, error);
  }
};
