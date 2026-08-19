/**
 * Fonte Única de Verdade (SSOT) para tokens de cor em formato Hexadecimal Puro.
 * 
 * NOTA DE SINCRONIA: Este arquivo espelha as declarações RGB visuais do `index.css`.
 * É consumido principalmente por bibliotecas de gráficos (Recharts, Chart.js), SVGs dinâmicos
 * e escalas psicométricas em `assessmentScales.ts` que necessitam de valores HEX raw.
 * Qualquer alteração na identidade visual deve ser atualizada aqui E no `index.css`.
 */

export const BRAND_COLORS = {
  primary: '#7c3aed',       // violet-600 (Mentis Purple oficial)
  primaryGlow: '#a78bfa',   // violet-400 (Glow state / Dark mode)
  primaryLight: '#ede9fe',  // violet-100 (Soft background)
  primaryDark: '#2e1065',   // violet-950 (Deep surface)
  therapeutic: '#14b8a6',   // teal-500 (Alta terapêutica / saúde)
} as const;

export const SEMANTIC_COLORS = {
  success: '#22c55e',       // green-500
  warning: '#eab308',       // yellow-500
  error: '#ef4444',         // red-500
  info: '#3b82f6',          // blue-500
  neutral: '#64748b',       // slate-500
} as const;

/**
 * Paleta clínica padronizada para relatórios psicométricos e de severidade.
 * Substitui strings hexadecimais dispersas nas escalas de avaliação.
 */
export const CLINICAL_SEVERITY_COLORS = {
  minimal: '#22c55e',       // green-500 (Sintomas mínimos / Rastreio Negativo / Sem Risco)
  mild: '#eab308',          // yellow-500 (Sintomas leves / Alerta Leve / Risco Baixo)
  moderate: '#f97316',      // orange-500 (Sintomas moderados / Risco Moderado)
  severe: '#ef4444',        // red-500 (Sintomas graves / Altamente Sugestivo / Alto Risco)
  critical: '#dc2626',      // red-600 (Sintomas extremamente graves / Urgência clínica)
} as const;

export type ClinicalSeverityLevel = keyof typeof CLINICAL_SEVERITY_COLORS;

/**
 * Paleta vocacional padronizada (Hexágono RIASEC).
 */
export const VOCATIONAL_COLORS = {
  realistic: '#10b981',     // emerald-500
  investigative: '#3b82f6', // blue-500
  artistic: '#a855f7',      // purple-500
  social: '#f59e0b',        // amber-500
  enterprising: '#ef4444',  // red-500
  conventional: '#64748b',  // slate-500
} as const;
