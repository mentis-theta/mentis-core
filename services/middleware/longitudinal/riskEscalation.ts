import { MiddlewareResult, ValidationIssue } from '../../../types';

/**
 * Risk Escalation (Camada 2 - Longitudinal Validator)
 * Inspeciona os eventos disparados (ex: pelo Trend Analyzer) e o estado das observações 
 * para gerar alertas críticos (Issues) se o quadro do paciente estiver escalando em gravidade.
 */
export function evaluateRisk(input: MiddlewareResult): MiddlewareResult {
    const { result, issues, events } = input;
    const newIssues: ValidationIssue[] = [];

    // Busca eventos de piora de sintomas emitidos nesta corrida
    const worseningEvents = events.filter(e => 
        e.type === 'TrendDetected' && 
        e.payload?.trend === 'worsening' &&
        e.payload?.to === 'severe'
    );

    // Se houver mais de um sintoma severo com piora repentina, acionamos a trava de risco
    if (worseningEvents.length >= 2) {
        newIssues.push({
            code: 'RISK_ESCALATION_DETECTED',
            message: `Detectada piora severa em múltiplos quadros simultâneos (${worseningEvents.length} conceitos escalaram para 'severe'). Revisão clínica prioritária recomendada.`,
            severity: 'high'
        });
    }

    return {
        result,
        issues: [...issues, ...newIssues],
        events
    };
}
