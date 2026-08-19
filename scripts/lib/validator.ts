export interface ValidationResult {
  valid: boolean;
  relations: any[];
  rejectedCount: number;
  errors: string[];
}

export function validateClinicalFactSafety(kg: any): ValidationResult {
  if (!kg || !kg.relations || !Array.isArray(kg.relations)) {
    return { valid: false, relations: [], rejectedCount: 0, errors: ["Missing or invalid 'relations' array"] };
  }

  const validRelations: any[] = [];
  const errors: string[] = [];
  let rejectedCount = 0;

  for (const relation of kg.relations) {
    let isValid = true;
    
    // Regra 1: Estrutural (Obrigatório ter evidence)
    if (!relation.evidence || typeof relation.evidence !== 'object' || !relation.evidence.quote) {
      isValid = false;
      errors.push("relation missing evidence.quote");
    }
    
    const s = (relation.source_entity || '').toLowerCase();
    const t = (relation.target_entity || '').toLowerCase();
    const rel = (relation.relation_type || '').toLowerCase();

    // Bloquear inferências sobre "o paciente" ter diagnóstico
    if (s.includes('paciente tem') || t.includes('paciente tem') || rel.includes('patient_has') || rel.includes('diagnosed_with')) {
      isValid = false;
      errors.push("absolute patient diagnosis detected");
    }

    if (isValid) {
      validRelations.push(relation);
    } else {
      rejectedCount++;
    }
  }

  return { 
    valid: validRelations.length > 0, 
    relations: validRelations, 
    rejectedCount,
    errors
  };
}
