import { GatedClinicalResponse, EvidenceChain, Abstention } from "./evidenceContract.ts";
import { ValidationReport } from "./deterministicValidator.ts";

/**
 * Gate 3D: Enforcement Layer
 * 
 * Filtra puramente um GatedClinicalResponse removendo claims estruturalmente inválidos
 * (conforme o ValidationReport) e os converte em Abstentions (por falha de segurança).
 * Garante as Invariantes de Entrega e Supressão:
 * 
 * 1. Structural Delivery Invariant: 
 *    ∀ claim ∈ DeliveredResponse: claim ∈ ValidatedClaims
 * 2. Suppression Invariant: 
 *    status = INVALID -> action = SUPPRESS -> claim ∉ evidence_chains -> claim ∉ clinical_summary
 */
export function enforceStructuralIntegrity(
  response: GatedClinicalResponse,
  report: ValidationReport
): GatedClinicalResponse {
  const deliveredChains: EvidenceChain[] = [];
  const addedAbstentions: Abstention[] = [...response.abstentions];

  // Mapeamos a validade por claim para pesquisa rápida
  const validationMap = new Map<string, boolean>();
  for (const v of report.claim_validations) {
    // Um claim é válido APENAS se status === 'VALID'
    validationMap.set(v.claim, v.status === 'VALID');
  }

  for (const chain of response.evidence_chains) {
    const isValid = validationMap.get(chain.claim) === true;
    
    if (isValid) {
      deliveredChains.push(chain);
    } else {
      // Falha Estrutural -> Supressão e Conversão em Abstention segura (sem vazar a claim)
      addedAbstentions.push({
        topic: "Supressão de Segurança (Falha de Proveniência)",
        reason: "Uma afirmação clínica foi omitida porque sua evidência não passou na validação estrutural obrigatória."
      });
    }
  }

  return {
    ...response,
    evidence_chains: deliveredChains,
    abstentions: addedAbstentions
  };
}
