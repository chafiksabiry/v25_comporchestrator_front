import { uid } from '@/store/store';

export interface NumberCandidate {
  id: string;
  e164: string;
  label: string;
  type: 'local' | 'national';
}

/**
 * MODE DÉMO uniquement. L'API existante expose `/phone-numbers/search/twilio`, `/phone-numbers/purchase`
 * et `/phone-numbers/checkout/*` (utilisées par le panneau téléphonie du micro-frontend entreprise) ;
 * leur contrat exact n'a pas été vérifié, le branchement reste donc à faire (voir README).
 */
const AREAS: Array<{ prefix: string; label: string; e164: string }> = [
  { prefix: '01', label: 'Île-de-France', e164: '+331' },
  { prefix: '02', label: 'Nord-Ouest', e164: '+332' },
  { prefix: '03', label: 'Nord-Est', e164: '+333' },
  { prefix: '04', label: 'Sud-Est', e164: '+334' },
  { prefix: '05', label: 'Sud-Ouest', e164: '+335' },
  { prefix: '09', label: 'National (non géographique)', e164: '+339' },
];

export async function searchNumbers(areaPrefix: string, count = 5): Promise<NumberCandidate[]> {
  await new Promise((r) => setTimeout(r, 300));
  const area = AREAS.find((a) => a.prefix === areaPrefix) ?? AREAS[0];
  return Array.from({ length: count }, () => {
    const rest = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join('');
    return {
      id: uid('num'),
      e164: `${area.e164}${rest}`,
      label: area.label,
      type: area.prefix === '09' ? ('national' as const) : ('local' as const),
    };
  });
}

export const AREA_OPTIONS = AREAS.map((a) => ({ prefix: a.prefix, label: `${a.prefix} — ${a.label}` }));

export function formatFrNumber(e164: string): string {
  const m = e164.match(/^\+33(\d)(\d{8})$/);
  if (!m) return e164;
  const d = `0${m[1]}${m[2]}`;
  return d.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
}
