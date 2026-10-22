import { describe, expect, it } from 'vitest';
import {
  ONBOARDING_STEPS,
  TOTAL_BUDGET_MINUTES,
  isValidSiren,
  nameFromEmail,
  overBudgetSteps,
  parseEmails,
} from './onboarding';
import { billableExtraLines, cheapestPlanWith, hasFeature } from './plans';

describe('saisie des adresses email', () => {
  it('accepte espaces, virgules, points-virgules et retours à la ligne', () => {
    const r = parseEmails('a@x.fr, b@x.fr;c@x.fr\nd@x.fr   e@x.fr');
    expect(r.valid).toEqual(['a@x.fr', 'b@x.fr', 'c@x.fr', 'd@x.fr', 'e@x.fr']);
  });

  it('signale les invalides et les doublons sans les perdre', () => {
    const r = parseEmails('ok@x.fr, pasunemail, OK@x.fr, autre@x');
    expect(r.valid).toEqual(['ok@x.fr']);
    expect(r.duplicates).toEqual(['ok@x.fr']);
    expect(r.invalid).toEqual(['pasunemail', 'autre@x']);
  });

  it('déduit un prénom et un nom', () => {
    expect(nameFromEmail('marie.dupont@x.fr')).toEqual({ firstName: 'Marie', lastName: 'Dupont' });
    expect(nameFromEmail('jean@x.fr')).toEqual({ firstName: 'Jean', lastName: '' });
  });
});

describe('SIREN', () => {
  it('valide la clé de Luhn', () => {
    expect(isValidSiren('732 829 320')).toBe(true);
    expect(isValidSiren('732829321')).toBe(false);
    expect(isValidSiren('12345')).toBe(false);
  });
});

describe('budget du parcours', () => {
  it('reste dans les 10 minutes avec la création de compte en amont (1 min)', () => {
    expect(TOTAL_BUDGET_MINUTES + 1).toBeLessThanOrEqual(10);
  });

  it('détecte les étapes qui dépassent leur budget', () => {
    const t = { company: { startedAt: 0, completedAt: 61_000 }, template: { startedAt: 0, completedAt: 30_000 } };
    expect(overBudgetSteps(t, 100_000)).toEqual(['company']);
    expect(ONBOARDING_STEPS).toHaveLength(7);
  });
});

describe('forfaits', () => {
  it('l’IA n’est pas dans Essentiel', () => {
    expect(hasFeature('essentiel', 'E')).toBe(false);
    expect(hasFeature('equipe', 'E')).toBe(true);
    expect(cheapestPlanWith('E')?.id).toBe('equipe');
    expect(cheapestPlanWith('I')?.id).toBe('multi_clients');
  });

  it('une ligne incluse, les autres facturées', () => {
    expect(billableExtraLines('essentiel', 1)).toBe(0);
    expect(billableExtraLines('equipe', 10)).toBe(9);
  });
});
