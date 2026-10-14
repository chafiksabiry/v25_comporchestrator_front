/**
 * Serializes a gig from the gigs API for AI prompts (chat, slides, curriculum).
 * Keeps learner-relevant fields only; avoids dumping huge nested objects.
 */

function namesFromList(items: unknown, keys: string[]): string[] {
  if (!Array.isArray(items)) return [];
  const out: string[] = [];
  for (const item of items) {
    if (item == null) continue;
    if (typeof item === 'string') {
      const s = item.trim();
      if (s) out.push(s);
      continue;
    }
    if (typeof item === 'object') {
      const o = item as Record<string, unknown>;
      for (const k of keys) {
        const v = o[k];
        if (typeof v === 'string' && v.trim()) {
          out.push(v.trim());
          break;
        }
      }
    }
  }
  return [...new Set(out)].slice(0, 24);
}

function skillRows(list: unknown, max: number): string[] {
  if (!Array.isArray(list)) return [];
  const rows: string[] = [];
  for (const row of list) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, any>;
    const details = String(r.details || '').trim();
    const skillObj = r.skill && typeof r.skill === 'object' ? r.skill : null;
    const skillName = skillObj ? String(skillObj.name || skillObj.title || '').trim() : '';
    const line = [skillName, details].filter(Boolean).join(' — ');
    if (line) rows.push(line);
    if (rows.length >= max) break;
  }
  return rows;
}

export function buildGigSnapshotForAi(gig: unknown): Record<string, unknown> | null {
  if (!gig || typeof gig !== 'object') return null;
  const g = gig as Record<string, any>;
  const id = String(g._id || g.id || '').trim();
  const title = String(g.title || '').trim();
  if (!id && !title) return null;

  const dz = g.destination_zone;
  const destinationZone =
    dz && typeof dz === 'object'
      ? String(dz.name || dz.label || dz.title || '').trim()
      : typeof dz === 'string'
        ? dz.trim()
        : '';

  const seniority =
    g.seniority && typeof g.seniority === 'object'
      ? {
          level: String(g.seniority.level || '').trim(),
          yearsExperience: String(g.seniority.yearsExperience || '').trim(),
        }
      : undefined;

  const commission = g.commission && typeof g.commission === 'object' ? g.commission : null;

  return {
    id: id || undefined,
    title: title || 'Untitled gig',
    description: String(g.description || '').trim(),
    category: String(g.category || '').trim(),
    status: String(g.status || '').trim(),
    industries: namesFromList(g.industries, ['name', 'title', 'label']),
    activities: namesFromList(g.activities, ['name', 'title', 'label']),
    sectors: namesFromList(g.sectors, ['name', 'title', 'label']),
    destinationZone: destinationZone || undefined,
    destinationLanguage: languageFromDestinationZone(dz) || undefined,
    seniority: seniority?.level || seniority?.yearsExperience ? seniority : undefined,
    highlights: Array.isArray(g.highlights)
      ? g.highlights.filter((x: unknown) => typeof x === 'string').map((x: string) => x.trim()).filter(Boolean).slice(0, 24)
      : [],
    deliverables: Array.isArray(g.deliverables)
      ? g.deliverables.filter((x: unknown) => typeof x === 'string').map((x: string) => x.trim()).filter(Boolean).slice(0, 24)
      : [],
    skillsSummary: {
      professional: skillRows(g.skills?.professional, 12),
      technical: skillRows(g.skills?.technical, 12),
      soft: skillRows(g.skills?.soft, 8),
    },
    commission: commission
      ? {
          structure: String(commission.structure || '').trim(),
          additionalDetails: String(commission.additionalDetails || '').trim(),
        }
      : undefined,
  };
}

const FRENCH_COUNTRY_CODES = new Set([
  'FR', 'BE', 'CH', 'LU', 'MC', 'SN', 'CI', 'CM', 'MA', 'TN', 'DZ', 'MG',
  'HT', 'GP', 'MQ', 'RE', 'GF', 'YT', 'PF', 'NC', 'CD', 'CG', 'GA', 'ML',
  'NE', 'BF', 'BJ', 'TG', 'TD', 'GN', 'RW', 'BI', 'DJ', 'KM',
]);

function zoneRecord(zone: unknown): Record<string, any> | null {
  if (!zone || typeof zone !== 'object') return null;
  return zone as Record<string, any>;
}

/** Language spoken in the gig destination zone. France → fr, United States → en. */
export function languageFromDestinationZone(zone: unknown): 'fr' | 'en' | null {
  if (!zone) return null;
  if (typeof zone === 'string') {
    const raw = zone.trim();
    const lower = raw.toLowerCase();
    if (/france|belg|suisse|switzerland|luxem|monaco|français|french/.test(lower)) return 'fr';
    if (/^[a-z]{2}$/i.test(raw)) {
      return FRENCH_COUNTRY_CODES.has(raw.toUpperCase()) ? 'fr' : 'en';
    }
    if (lower) return 'en';
    return null;
  }
  const z = zoneRecord(zone);
  if (!z) return null;
  const langs = z.languages;
  if (langs && typeof langs === 'object' && !Array.isArray(langs)) {
    const keys = Object.keys(langs).map((key) => key.toLowerCase());
    const first = keys[0] || '';
    if (first === 'fra' || first === 'fre' || first === 'fr') return 'fr';
    if (first === 'eng' || first === 'en') return 'en';
    const blob = [...keys, ...Object.values(langs).map((value) => String(value).toLowerCase())].join(' ');
    if (/\b(fra|fre|french|français)\b/.test(blob) && !/\b(eng|english|anglais)\b/.test(blob)) return 'fr';
    if (/\b(eng|english|anglais)\b/.test(blob)) return 'en';
  }
  const code = String(z.cca2 || '').toUpperCase();
  if (code.length === 2) return FRENCH_COUNTRY_CODES.has(code) ? 'fr' : 'en';
  const name = String(z.name?.common || z.name?.official || z.name || z.label || '').toLowerCase();
  if (/france|belgium|belgique|switzerland|suisse|luxembourg|monaco/.test(name)) return 'fr';
  if (name) return 'en';
  return null;
}

export function otherContentLanguage(lang: 'fr' | 'en'): 'fr' | 'en' {
  return lang === 'fr' ? 'en' : 'fr';
}

/** Display and generation language: destination zone first, gig text only as a fallback. */
export function resolveGigContentLanguage(
  gig: unknown,
  title?: string | null,
  description?: string | null
): 'fr' | 'en' {
  const row = gig && typeof gig === 'object' ? (gig as Record<string, any>) : null;
  const fromZone = languageFromDestinationZone(row?.destination_zone);
  if (fromZone) return fromZone;
  return detectOutputLanguageFromGigText(title ?? row?.title, description ?? row?.description);
}

export function languageName(lang: 'fr' | 'en'): string {
  return lang === 'fr' ? 'French' : 'English';
}

/** Visible copy in the zone language, plus a fenced translation the UI does not parse as the plan. */
export function bilingualGenerationInstruction(display: 'fr' | 'en'): string {
  const other = otherContentLanguage(display);
  return `The gig destination zone language is ${languageName(display)}. Write the visible title, every section heading, the plan, and all module or script lines ONLY in ${languageName(display)}. Number modules 1, 2, 3… once. Do not switch language on a later module, and do not start again at Module 1. Then append a fenced block containing the full ${languageName(other)} translation of those SAME modules:\n\`\`\`translation-${other}\n...\n\`\`\`\nDo not repeat the translation outside that fence.`;
}

function moduleHeadingNumber(line: string): number | null {
  const n = line.replace(/\*\*/g, '').replace(/^#+\s*/, '').trim();
  const at = n.search(/\bmodule\s*\d+/i);
  if (at < 0 || at > 24) return null;
  if (/[a-zà-ÿæœ]/i.test(n.slice(0, at))) return null;
  const match = n.slice(at).match(/^module\s*(\d+)/i);
  const num = match ? Number(match[1]) : NaN;
  return Number.isFinite(num) ? num : null;
}

function planLanguageScore(block: string): number {
  const body = block.replace(
    /^.*\b(objectifs?|key\s*topics?|learning\s+objectives?|sujets?\s*cl[eé]s?|th[eè]mes?\s*cl[eé]s?)\b.*$/gim,
    ''
  );
  const lower = body.toLowerCase();
  const french =
    (lower.match(/\b(le|la|les|des|une|pour|dans|avec|est|sont|cette|ces|aux|qui|sur)\b/g) || []).length +
    (body.match(/[àâäéèêëïîôùûüçœæ]/gi) || []).length;
  const english =
    (lower.match(/\b(the|and|with|for|this|that|these|from|overview|framework|compliance|retention|excellence)\b/g) || []).length;
  return french - english;
}

/** Drop a second-language copy that the model appends as Module 7+ or as a new Module 1. */
function isolatePrimaryLanguagePlan(text: string): { visible: string; extra: string } {
  const lines = String(text || '').split(/\r?\n/);
  const heads: { line: number; num: number }[] = [];
  lines.forEach((line, index) => {
    const num = moduleHeadingNumber(line);
    if (num != null) heads.push({ line: index, num });
  });
  if (heads.length < 2) return { visible: text, extra: '' };

  for (let i = 1; i < heads.length; i++) {
    if (heads[i].num === 1 && heads[i - 1].num >= 2) {
      return {
        visible: lines.slice(0, heads[i].line).join('\n').trim(),
        extra: lines.slice(heads[i].line).join('\n').trim(),
      };
    }
  }

  const scores = heads.map((head, index) => {
    const end = index + 1 < heads.length ? heads[index + 1].line : lines.length;
    return planLanguageScore(lines.slice(head.line, end).join('\n'));
  });
  const primaryIsFrench = scores[0] >= 1;
  const primaryIsEnglish = scores[0] <= -1;
  if (!primaryIsFrench && !primaryIsEnglish) return { visible: text, extra: '' };

  for (let i = 1; i < scores.length; i++) {
    const switched = primaryIsFrench ? scores[i] <= -1 : scores[i] >= 1;
    if (!switched) continue;
    const restStays = scores.slice(i).every((score) => (primaryIsFrench ? score < 0 : score > 0));
    if (!restStays) continue;
    return {
      visible: lines.slice(0, heads[i].line).join('\n').trim(),
      extra: lines.slice(heads[i].line).join('\n').trim(),
    };
  }
  return { visible: text, extra: '' };
}

export function splitBilingualContent(text: string): {
  visible: string;
  translations: Partial<Record<'fr' | 'en', string>>;
} {
  const translations: Partial<Record<'fr' | 'en', string>> = {};
  let visible = String(text || '').replace(
    /```translation-(fr|en)\s*([\s\S]*?)```/gi,
    (_match, lang: string, body: string) => {
      const key = lang.toLowerCase() === 'fr' ? 'fr' : 'en';
      translations[key] = String(body || '').trim();
      return '';
    }
  );
  const unclosed = visible.search(/```translation-(fr|en)\b/i);
  if (unclosed >= 0) {
    const lang = visible.slice(unclosed).match(/```translation-(fr|en)/i)?.[1]?.toLowerCase() === 'fr' ? 'fr' : 'en';
    translations[lang] = visible.slice(unclosed).replace(/```translation-(fr|en)\s*/i, '').trim();
    visible = visible.slice(0, unclosed);
  }
  const isolated = isolatePrimaryLanguagePlan(visible);
  if (isolated.extra && !translations.fr && !translations.en) {
    const extraScore = planLanguageScore(isolated.extra);
    translations[extraScore >= 0 ? 'fr' : 'en'] = isolated.extra;
  }
  return { visible: isolated.visible.trim(), translations };
}

export function planSectionLabels(lang: 'fr' | 'en'): {
  plan: string;
  planSaved: string;
  objectives: string;
  keyTopics: string;
} {
  return lang === 'fr'
    ? {
        plan: 'Plan de formation',
        planSaved: 'Plan de formation (sauvegardé)',
        objectives: 'Objectifs',
        keyTopics: 'Sujets clés',
      }
    : {
        plan: 'Training plan',
        planSaved: 'Training plan (saved)',
        objectives: 'Objectives',
        keyTopics: 'Key topics',
      };
}

export function scriptChromeLabels(lang: 'fr' | 'en'): {
  intelligent: string;
  subtitle: string;
  interactive: string;
  fallbackTitle: string;
  back: string;
} {
  return lang === 'fr'
    ? {
        intelligent: "Script d'Appel Intelligent",
        subtitle: "Concevez votre script de vente idéal en dialoguant avec l'IA HARX",
        interactive: 'Script Interactif Intelligent',
        fallbackTitle: "Script d'Appel Interactif",
        back: 'Retour',
      }
    : {
        intelligent: 'Intelligent Call Script',
        subtitle: 'Design the call script for this gig with HARX AI',
        interactive: 'Intelligent Interactive Script',
        fallbackTitle: 'Interactive Call Script',
        back: 'Back',
      };
}

/**
 * Infer plan/content output language from gig title + description only.
 * Used when the gig has no destination zone.
 */
export function detectOutputLanguageFromGigText(
  title?: string | null,
  description?: string | null
): 'fr' | 'en' {
  const sample = `${String(title || '').trim()} ${String(description || '').trim()}`.toLowerCase();
  if (!sample.trim()) return 'fr';

  const frHits = (
    sample.match(
      /\b(le|la|les|des|une|un|et|pour|avec|dans|sur|formation|vendeur|assurance|client|objectif|compétence|expérience)\b/gi
    ) || []
  ).length;
  const enHits = (
    sample.match(
      /\b(the|and|for|with|from|training|sales|insurance|customer|objective|skill|experience|senior|junior)\b/gi
    ) || []
  ).length;

  // Accented French characters are a strong signal
  const hasFrAccents = /[àâäéèêëïîôùûüçœæ]/i.test(sample);
  if (hasFrAccents && frHits >= enHits) return 'fr';
  if (enHits > frHits) return 'en';
  if (frHits > enHits) return 'fr';
  return hasFrAccents ? 'fr' : 'en';
}
