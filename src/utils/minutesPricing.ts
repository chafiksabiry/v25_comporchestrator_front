export const MINUTE_PACKS = [
  { label: 'Standard', mins: 150, priceCents: 1000, cost: '10 €' },
  { label: 'Pro', mins: 500, priceCents: 3200, cost: '32 €' },
  { label: 'Expert', mins: 1000, priceCents: 6200, cost: '62 €' },
] as const;

/** Custom quantity rate: 10 EUR / 150 min */
const CUSTOM_RATE_CENTS = (1000 / 150);

export function computeMinutesPurchaseCents(minutes: number): number {
  const qty = Number(minutes);
  if (!Number.isFinite(qty) || qty <= 0) return 0;

  const pack = MINUTE_PACKS.find((p) => p.mins === qty);
  if (pack) return pack.priceCents;

  return Math.round(qty * CUSTOM_RATE_CENTS);
}

export function formatMinutesPurchasePrice(minutes: number): string {
  const cents = computeMinutesPurchaseCents(minutes);
  return `${(cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}
