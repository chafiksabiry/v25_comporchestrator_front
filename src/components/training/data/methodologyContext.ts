import type { TrainingMethodology } from '../types/methodology';

const MAX_ENTRY_CHARS = 700;

/**
 * What the training generator receives about the chosen methodology: each component with its
 * topics ("Title : topic ; topic"), not just the title, so sector-specific content (guarantees of an
 * auto policy, mortgage disclosures, rental rules…) actually shapes the plan.
 */
export function methodologyComponentsForAI(methodology?: TrainingMethodology | null): string[] {
  if (!methodology || !Array.isArray(methodology.components)) return [];
  return methodology.components
    .map((component) => {
      const title = String(component?.title || '').trim();
      if (!title) return '';
      const topics = Array.isArray(component.modules)
        ? component.modules.map((m) => String(m || '').trim()).filter(Boolean)
        : [];
      const entry = topics.length > 0 ? `${title} : ${topics.join(' ; ')}` : title;
      return entry.length > MAX_ENTRY_CHARS ? `${entry.slice(0, MAX_ENTRY_CHARS - 1)}…` : entry;
    })
    .filter(Boolean);
}
