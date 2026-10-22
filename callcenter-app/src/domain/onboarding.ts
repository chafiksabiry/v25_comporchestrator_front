/**
 * Parcours de mise en route. Chaque étape a un budget de temps ; ce qui ne le respecte pas sort du
 * parcours initial. La création du compte (≈ 1 min) se fait en amont, dans l'application d'inscription.
 */

export type OnboardingStepId =
  | 'company'
  | 'template'
  | 'team'
  | 'plan'
  | 'telephony'
  | 'queue'
  | 'test';

export interface OnboardingStep {
  id: OnboardingStepId;
  title: string;
  hint: string;
  budgetMinutes: number;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  { id: 'company', title: 'Entreprise', hint: 'Identité légale et justificatifs KYB', budgetMinutes: 1 },
  { id: 'template', title: 'Modèle', hint: 'Votre cas d’usage pré-configure files, script et indicateurs', budgetMinutes: 1 },
  { id: 'team', title: 'Équipe', hint: 'Invitez vos agents par email', budgetMinutes: 1 },
  { id: 'plan', title: 'Forfait et solde', hint: 'Abonnement par carte, première recharge prépayée', budgetMinutes: 2 },
  { id: 'telephony', title: 'Téléphonie', hint: 'Votre numéro français et votre ligne', budgetMinutes: 2 },
  { id: 'queue', title: 'File et script', hint: 'Relisez la file et le script proposés', budgetMinutes: 1 },
  { id: 'test', title: 'Appel de test', hint: 'Vérifiez micro, audio et routage', budgetMinutes: 1 },
];

/** Budget total du parcours dans l'application (hors création de compte). */
export const TOTAL_BUDGET_MINUTES = ONBOARDING_STEPS.reduce((s, st) => s + st.budgetMinutes, 0);

export interface StepTiming {
  startedAt: number;
  completedAt?: number;
}

export type OnboardingTimings = Partial<Record<OnboardingStepId, StepTiming>>;

export function stepElapsedMs(t: StepTiming | undefined, now: number): number {
  if (!t) return 0;
  return Math.max(0, (t.completedAt ?? now) - t.startedAt);
}

export function overBudgetSteps(timings: OnboardingTimings, now: number): OnboardingStepId[] {
  return ONBOARDING_STEPS.filter((s) => stepElapsedMs(timings[s.id], now) > s.budgetMinutes * 60_000).map(
    (s) => s.id
  );
}

export function totalElapsedMs(timings: OnboardingTimings, now: number): number {
  return ONBOARDING_STEPS.reduce((sum, s) => sum + stepElapsedMs(timings[s.id], now), 0);
}

const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/;

export interface ParsedEmails {
  valid: string[];
  invalid: string[];
  duplicates: string[];
}

/** Saisie libre : séparateurs espace, virgule, point-virgule ou retour à la ligne. */
export function parseEmails(input: string): ParsedEmails {
  const tokens = input
    .split(/[\s,;]+/)
    .map((t) => t.trim().replace(/^<|>$/g, '').toLowerCase())
    .filter(Boolean);
  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];
  const duplicates: string[] = [];
  for (const t of tokens) {
    if (!EMAIL_RE.test(t)) {
      invalid.push(t);
    } else if (seen.has(t)) {
      duplicates.push(t);
    } else {
      seen.add(t);
      valid.push(t);
    }
  }
  return { valid, invalid, duplicates };
}

/** Prénom / nom par défaut déduits de la partie locale de l'email (modifiable ensuite). */
export function nameFromEmail(email: string): { firstName: string; lastName: string } {
  const local = email.split('@')[0] ?? '';
  const parts = local.split(/[._-]+/).filter(Boolean);
  const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
  return { firstName: cap(parts[0] ?? ''), lastName: parts.slice(1).map(cap).join(' ') };
}

/** Numéro SIREN : 9 chiffres, contrôle de Luhn. */
export function isValidSiren(value: string): boolean {
  const digits = value.replace(/\s/g, '');
  if (!/^\d{9}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let n = Number(digits[8 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}
