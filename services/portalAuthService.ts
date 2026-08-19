import * as Sentry from '@sentry/react';

// ─── Constants ─────────────────────────────────────────────────────────
const PORTAL_TOKEN_KEY = 'mentis_portal_token';
const PORTAL_TOKEN_VERSION_KEY = 'mentis_portal_token_version';

// ─── Types ─────────────────────────────────────────────────────────────

/** Payload estruturado extraído do magic token base64 do portal. */
export interface PortalTokenPayload {
  patientId: string;
  secret: string;
  version: number;
}

// ─── Type Guards ───────────────────────────────────────────────────────

/**
 * Valida que o array de partes decodificadas tem formato válido.
 * O formato esperado é: "patientId:secret" ou "patientId:secret:version"
 */
function isValidDecodedParts(parts: string[]): boolean {
  return (
    parts.length >= 2 &&
    typeof parts[0] === 'string' &&
    parts[0].length > 0 &&
    typeof parts[1] === 'string' &&
    parts[1].length > 0
  );
}

// ─── Core Functions ────────────────────────────────────────────────────

/**
 * Lê e decodifica o magic token do localStorage.
 * Retorna null se não existir, estiver corrompido ou com formato inválido.
 * Em caso de corrupção, limpa o token e notifica o Sentry.
 */
export function getPortalToken(): PortalTokenPayload | null {
  const raw = localStorage.getItem(PORTAL_TOKEN_KEY);

  if (typeof raw !== 'string' || raw.length === 0) {
    return null;
  }

  try {
    const decoded = atob(raw);
    const parts = decoded.split(':');

    if (!isValidDecodedParts(parts)) {
      Sentry.captureMessage('Portal token inválido: formato inesperado após decode', {
        level: 'warning',
        extra: { partsLength: parts.length, hasPatientId: parts[0]?.length > 0 },
      });
      clearPortalToken();
      return null;
    }

    // Versão pode vir do token OU do localStorage separado (fallback para tokens antigos)
    let version = 1;
    if (parts.length >= 3) {
      const parsedVersion = parseInt(parts[2], 10);
      version = Number.isFinite(parsedVersion) && parsedVersion > 0 ? parsedVersion : 1;
    } else {
      version = getStoredVersion();
    }

    return {
      patientId: parts[0],
      secret: parts[1],
      version,
    };
  } catch (e) {
    Sentry.captureException(e, {
      extra: { phase: 'portal_token_decode', rawLength: raw.length },
    });
    clearPortalToken();
    return null;
  }
}

/**
 * Persiste o magic token e sua versão no localStorage.
 */
export function setPortalToken(token: string, version: number): void {
  localStorage.setItem(PORTAL_TOKEN_KEY, token);
  localStorage.setItem(PORTAL_TOKEN_VERSION_KEY, String(version));
}

/**
 * Remove completamente o magic token e dados auxiliares do localStorage.
 */
export function clearPortalToken(): void {
  localStorage.removeItem(PORTAL_TOKEN_KEY);
  localStorage.removeItem(PORTAL_TOKEN_VERSION_KEY);
}

/**
 * Verifica se existe um magic token válido no localStorage.
 * NÃO faz parsing completo — apenas checa existência.
 */
export function hasPortalToken(): boolean {
  const raw = localStorage.getItem(PORTAL_TOKEN_KEY);
  return typeof raw === 'string' && raw.length > 0;
}

/**
 * Cria um token sintético a partir de dados do paciente.
 * Usado após login via PIN ou biometria.
 */
export function createSyntheticToken(patientId: string, birthDate: string, version: number): string {
  return btoa(`${patientId}:${birthDate}:${version}`);
}

// ─── Internal Helpers ──────────────────────────────────────────────────

/**
 * Lê a versão do token armazenada separadamente (fallback para tokens antigos
 * que não incluíam a versão no payload base64).
 */
function getStoredVersion(): number {
  const stored = localStorage.getItem(PORTAL_TOKEN_VERSION_KEY);
  if (typeof stored !== 'string' || stored.length === 0) return 1;
  const parsed = parseInt(stored, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}
