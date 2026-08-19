import { ExtractionResult, MiddlewareResult } from '../../types';
import { validateIntegrity } from './integrityValidator';
import { anonymizePII } from './anonymizer';
import { canonicalizeObservations } from './canonicalizer';
import { deduplicateObservations } from './deduplicator';
import { checkConsistency } from './consistencyChecker';
import { analyzeTrends } from './longitudinal/trendAnalyzer';
import { evaluateRisk } from './longitudinal/riskEscalation';
import { eventBus } from '../ops/eventBus';

/**
 * Pipeline Oficial do Middleware (Motor Determinístico)
 * 
 * Executa as validações e transformações na Camada 2 em ordem estrita.
 */
export function runMiddlewarePipeline(extractionResult: ExtractionResult): MiddlewareResult {
    
    // 1. Integridade (Filtro rígido estrutural)
    let state = validateIntegrity(extractionResult);
    
    // Se ocorreram erros fatais (ex: MISSING_EVIDENCE), paramos a esteira preventivamente
    if (state.issues.some(i => i.severity === 'fatal')) {
        return state;
    }

    // 2. Anonimização de PII (Proteção de privacidade nos dados não estruturados)
    state = anonymizePII(state);

    // 3. Normalização (Booleanos literais para booleanos primitivos, números limpos)
    state = canonicalizeObservations(state);

    // 4. Preservação do Histórico e Deduplicação (Links lógicos derivedFrom/relatedTo)
    state = deduplicateObservations(state);

    // 5. Motor de Regras Clínicas (Consistency Checker)
    state = checkConsistency(state);

    // 6. Longitudinal Validator (Validação Histórica)
    // 6.1 Análise de Tendências (Melhoria/Piora entre sessões)
    state = analyzeTrends(state);
    
    // 6.2 Avaliação de Risco Clínico (Ex: Escala de múltiplos sintomas para 'severe')
    state = evaluateRisk(state);

    // ==========================================
    // FASE 7: Telemetria & Roteamento (EventBus)
    // ==========================================
    // Escoa todos os eventos de domínio (RiskEscalation, PII, etc) para a arquitetura backend
    if (state.events && state.events.length > 0) {
        eventBus.publishBatch(state.events);
    }

    return state;
}
