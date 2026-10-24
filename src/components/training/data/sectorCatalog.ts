import type { TrainingMethodology } from '../types/methodology';
import { healthInsuranceMethodologyForLanguage, type MethodologyLang } from './genericSalesMethodologies';
import { TRANSACTION_SPECS, buildTransactionMethodology, type MethodologyGroup } from './transactionMethodologies';
import { withoutForeignCompliance } from './gigMethodology';

export interface SectorCase {
  id: string;
  group: MethodologyGroup;
  name: string;
  /** Skeleton handed to the AI: one block per methodology component, with its topics. */
  outline: Array<{ title: string; topics: string[] }>;
}

function toCase(id: string, group: MethodologyGroup, methodology: TrainingMethodology): SectorCase {
  return {
    id,
    group,
    name: methodology.name,
    outline: methodology.components.map((c) => ({ title: c.title, topics: c.modules })),
  };
}

/** Every regulated / sector case the platform knows, for which an AI knowledge base can be created. */
export function listSectorCases(lang: MethodologyLang, countryLabel?: string | null): SectorCase[] {
  const health = withoutForeignCompliance(healthInsuranceMethodologyForLanguage(lang), countryLabel);
  return [
    toCase('health-insurance', 'insurance', health),
    ...TRANSACTION_SPECS.filter((spec) => spec.group !== 'generic').map((spec) =>
      toCase(spec.id, spec.group, withoutForeignCompliance(buildTransactionMethodology(lang, spec, countryLabel || undefined), countryLabel))
    ),
  ];
}
