export type ScriptVariableSource = 'harx' | 'custom' | 'system';

export interface ScriptVariable {
  key: string;
  token: string;
  label: string;
  source: ScriptVariableSource;
  example?: string;
  visibleCompany?: boolean;
  visibleRep?: boolean;
}

export type LeadLike = Record<string, any> & {
  customFields?: Record<string, string> | Map<string, string>;
};

const LEGACY_ALIASES: Array<{ pattern: RegExp; resolve: (lead: LeadLike, ctx: MergeContext) => string }> = [
  {
    pattern: /\[\s*Nom du (?:client\/)?prospect\s*\]/gi,
    resolve: (lead, ctx) => ctx.prospectName || leadValue(lead, 'Deal_Name'),
  },
  {
    pattern: /\[\s*Nom(?:\s+du)?\s+prospect\s*\]/gi,
    resolve: (lead, ctx) => ctx.prospectName || leadValue(lead, 'Deal_Name'),
  },
  {
    pattern: /\[\s*Nom du client\s*\]/gi,
    resolve: (lead, ctx) => ctx.prospectName || leadValue(lead, 'Deal_Name'),
  },
  {
    pattern: /\[\s*Votre\s*Nom\s*\]/gi,
    resolve: (_lead, ctx) => ctx.repName,
  },
  {
    pattern: /\[\s*Prénom(?:\s+de\s+l['’]?agent)?\s*\]/gi,
    resolve: (_lead, ctx) => ctx.repName,
  },
  {
    pattern: /\[\s*Nom de (?:l['’])?entreprise(?:\s+prospect)?\s*\]/gi,
    resolve: (lead, ctx) =>
      ctx.companyName ||
      leadValue(lead, 'Account_Name') ||
      leadValue(lead, 'company') ||
      '',
  },
  {
    pattern: /\[\s*Nom de la (?:société|societe|company|compagnie)\s*\]/gi,
    resolve: (_lead, ctx) => ctx.companyName,
  },
  {
    pattern: /\[\s*Société\s*\]/gi,
    resolve: (_lead, ctx) => ctx.companyName,
  },
  {
    pattern: /\[\s*Entreprise\s*\]/gi,
    resolve: (_lead, ctx) => ctx.companyName,
  },
];

export interface MergeContext {
  repName?: string;
  companyName?: string;
  prospectName?: string;
  /** When set, hide HARX fields not visible for REP. */
  repVisibility?: Record<string, boolean>;
  emptyFallback?: string;
}

function leadValue(lead: LeadLike | null | undefined, field: string): string {
  if (!lead) return '';
  const v = lead[field];
  if (v == null) return '';
  return String(v).trim();
}

function customValue(lead: LeadLike | null | undefined, header: string): string {
  if (!lead?.customFields) return '';
  const map = lead.customFields;
  const v = map instanceof Map ? map.get(header) : map[header];
  if (v == null) return '';
  return String(v).trim();
}

/** French / informal labels people type or AI generates inside {{...}}. */
const LABEL_TO_KEY: Record<string, string> = {
  'nom du prospect': 'Deal_Name',
  'nom complet': 'Deal_Name',
  'deal_name': 'Deal_Name',
  'deal name': 'Deal_Name',
  prenom: 'First_Name',
  'prénom': 'First_Name',
  'first_name': 'First_Name',
  'first name': 'First_Name',
  nom: 'Last_Name',
  'last_name': 'Last_Name',
  'last name': 'Last_Name',
  email: 'Email_1',
  'e-mail': 'Email_1',
  'email_1': 'Email_1',
  telephone: 'Phone',
  'téléphone': 'Phone',
  tel: 'Phone',
  phone: 'Phone',
  adresse: 'Address',
  address: 'Address',
  'code postal': 'Postal_Code',
  'postal_code': 'Postal_Code',
  cp: 'Postal_Code',
  ville: 'City',
  city: 'City',
  'date de naissance': 'Date_of_Birth',
  'date_of_birth': 'Date_of_Birth',
  dob: 'Date_of_Birth',
  'votre nom': 'repName',
  'votre nom (rep)': 'repName',
  'votre prénom': 'repName',
  'votre prenom': 'repName',
  'nom du rep': 'repName',
  'nom de l\'entreprise': 'companyName',
  'nom de l’entreprise': 'companyName',
  'nom de l\'entreprise (vendeur)': 'companyName',
  'nom de l’entreprise (vendeur)': 'companyName',
  'entreprise vendeur': 'companyName',
  company: 'companyName',
};

function normalizeTokenKey(raw: string): string {
  const k = String(raw || '').trim();
  if (!k) return '';
  const lower = k.toLowerCase().replace(/\s+/g, ' ');
  return LABEL_TO_KEY[lower] || k;
}

function resolveTokenKey(
  key: string,
  lead: LeadLike | null | undefined,
  ctx: MergeContext
): string {
  const k = normalizeTokenKey(key);
  if (!k) return '';

  if (k === 'repName' || k === 'rep.name') return String(ctx.repName || '').trim();
  if (k === 'companyName' || k === 'company.name') return String(ctx.companyName || '').trim();
  if (k === 'prospectName') {
    return (
      String(ctx.prospectName || '').trim() ||
      leadValue(lead, 'Deal_Name') ||
      `${leadValue(lead, 'First_Name')} ${leadValue(lead, 'Last_Name')}`.trim()
    );
  }

  if (k.startsWith('custom.')) {
    return customValue(lead, k.slice('custom.'.length));
  }

  if (ctx.repVisibility && Object.prototype.hasOwnProperty.call(ctx.repVisibility, k)) {
    if (ctx.repVisibility[k] === false) return '';
  }

  return leadValue(lead, k);
}

/**
 * Replace {{Field}}, {{custom.Header}} and legacy [Nom du prospect] with lead values.
 */
export function renderScript(
  text: string | undefined | null,
  lead?: LeadLike | null,
  ctx: MergeContext = {}
): string {
  if (!text) return '';
  const fallback = ctx.emptyFallback ?? '—';
  let out = String(text);

  out = out.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_full, rawKey: string) => {
    const value = resolveTokenKey(rawKey, lead, ctx);
    return value || fallback;
  });

  for (const alias of LEGACY_ALIASES) {
    out = out.replace(alias.pattern, () => {
      const value = alias.resolve(lead || {}, ctx);
      return value || fallback;
    });
  }

  return out;
}

/** User-facing token: {{Nom du prospect}} — never expose DB keys in the editor. */
export function toFriendlyToken(variable: ScriptVariable): string {
  const label = String(variable.label || variable.key || '').trim();
  return `{{${label}}}`;
}

export function formatVariablesForAiPrompt(variables: ScriptVariable[]): string {
  if (!variables.length) return '';
  const lines = variables.map((v) => {
    const token = toFriendlyToken(v);
    return `- ${token}${v.example ? ` (ex: ${v.example})` : ''}`;
  });
  return [
    'Variables contact disponibles (utiliser EXACTEMENT ces libellés entre {{...}} dans les répliques) :',
    ...lines,
    'Ne remplace pas les tokens par des valeurs figées — garde {{Libellé}} pour le runtime.',
    'Ne jamais utiliser les noms techniques (Deal_Name, Email_1, etc.) — seulement les libellés FR.',
    "Interdit: [Nom du prospect], [Votre Nom], ou tout placeholder entre crochets — uniquement {{Libellé}}.",
    "L'ouverture doit contenir {{Nom du prospect}}, {{Votre nom (REP)}} et {{Nom de l'entreprise (vendeur)}} lorsque ces libellés sont dans la liste.",
  ].join('\n');
}

export async function fetchScriptVariables(gigId: string): Promise<ScriptVariable[]> {
  const base = String(import.meta.env.VITE_DASHBOARD_API || '').replace(/\/$/, '');
  if (!base || !gigId) return [];
  const res = await fetch(`${base}/file-processing/script-variables/${gigId}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return [];
  const json = await res.json();
  const list = json?.data?.variables;
  return Array.isArray(list) ? (list as ScriptVariable[]) : [];
}
