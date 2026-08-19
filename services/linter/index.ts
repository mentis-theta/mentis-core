import { policyEngine } from './policyEngine';
import { MandatorySectionsRule } from './rules/structural/MandatorySectionsRule';
import { ValidityDeclarationRule } from './rules/structural/ValidityDeclarationRule';
import { CausalityFilterRule } from './rules/clinical/CausalityFilterRule';
import { SpeculationFilterRule } from './rules/clinical/SpeculationFilterRule';

// Registrar todas as regras na Policy Engine Singleton
policyEngine.registerRules([
    new MandatorySectionsRule(),
    new ValidityDeclarationRule(),
    new CausalityFilterRule(),
    new SpeculationFilterRule()
]);

export { policyEngine };
export * from './types';
