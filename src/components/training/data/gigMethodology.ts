import type { MethodologyComponent, TrainingMethodology } from '../types/methodology';
import { buildProspectingMethodology, type MethodologyLang } from './genericSalesMethodologies';
import { buildGigSnapshotForAi } from '../utils/gigSnapshotForAi';

const L = (lang: MethodologyLang, fr: string, en: string) => (lang === 'fr' ? fr : en);

function sentences(text: string, max: number): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3)
    .slice(0, max);
}

/**
 * Methodology built only from the gig itself (offer, activities, skills, deliverables, sector, country):
 * nothing sector-specific is hard-coded, so it stays right for any profession, regulated or not.
 */
export function buildGigSpecificMethodology(
  lang: MethodologyLang,
  gig: unknown,
  countryLabel?: string
): TrainingMethodology | null {
  const snap = buildGigSnapshotForAi(gig) as Record<string, any> | null;
  if (!snap) return null;

  const skills = snap.skillsSummary || {};
  const domains = [...(snap.sectors || []), ...(snap.industries || [])].slice(0, 6) as string[];
  const domainLabel = domains.join(', ') || String(snap.category || snap.title);
  const country = countryLabel || snap.destinationZone || '';

  const make = (
    id: string,
    category: MethodologyComponent['category'],
    title: string,
    description: string,
    modules: string[],
    weight: number,
    hours: number
  ): MethodologyComponent => ({
    id,
    category,
    title,
    description,
    modules: modules.filter(Boolean),
    weight,
    prerequisites: [],
    estimatedDuration: hours,
    competencyLevel: 'working',
    mandatoryForCertification: true,
  });

  const components: MethodologyComponent[] = [
    make(
      'gig-offer',
      'company-specific',
      L(lang, 'Le gig, l’offre et le contexte client', 'The gig, the offer and the customer context'),
      L(lang, 'Comprendre la mission telle que décrite dans le gig.', 'Understand the mission as described in the gig.'),
      [String(snap.title), ...sentences(String(snap.description || ''), 4), domainLabel],
      20,
      2
    ),
    make(
      'gig-activities',
      'operational',
      L(lang, 'Activités à maîtriser', 'Activities to master'),
      L(lang, 'Les activités listées dans le gig.', 'The activities listed in the gig.'),
      (snap.activities as string[]).length > 0
        ? (snap.activities as string[])
        : [L(lang, 'Déroulé d’un contact de bout en bout', 'End-to-end flow of a contact')],
      25,
      3
    ),
    make(
      'gig-skills',
      'soft-skills',
      L(lang, 'Compétences attendues', 'Expected skills'),
      L(lang, 'Compétences professionnelles, techniques et comportementales du gig.', 'Professional, technical and behavioural skills of the gig.'),
      [...(skills.professional || []), ...(skills.technical || []), ...(skills.soft || [])].slice(0, 12),
      20,
      2
    ),
    make(
      'gig-regulation',
      'regulatory',
      L(lang, 'Cadre légal et conformité de l’activité', 'Legal framework and compliance of the activity'),
      L(
        lang,
        'Règles applicables à cette activité et à ce pays ; à vérifier auprès de sources officielles.',
        'Rules applicable to this activity and country; to be checked against official sources.'
      ),
      [
        L(
          lang,
          `Règles propres à l’activité (${domainLabel}) : obligations d’information, de conseil, de consentement et de traçabilité`,
          `Activity-specific rules (${domainLabel}): disclosure, advice, consent and record-keeping duties`
        ),
        country
          ? L(lang, `Réglementation applicable en ${country} (protection des données, démarchage)`, `Regulation applicable in ${country} (data protection, solicitation)`)
          : L(lang, 'Protection des données et règles de démarchage du pays cible', 'Data protection and solicitation rules of the target country'),
        L(lang, 'Ce qu’il faut dire, ne pas dire et consigner', 'What to say, not to say and to record'),
      ],
      15,
      2
    ),
    make(
      'gig-results',
      'company-specific',
      L(lang, 'Objectifs, livrables et rémunération', 'Objectives, deliverables and compensation'),
      L(lang, 'Résultats attendus et suivi de la performance.', 'Expected results and performance follow-up.'),
      [...(snap.deliverables || []), ...(snap.highlights || [])].slice(0, 8).concat(
        snap.commission?.structure ? [String(snap.commission.structure)] : []
      ),
      20,
      1
    ),
  ];

  const base = buildProspectingMethodology(lang, countryLabel);
  return {
    ...base,
    id: `gig-specific-${String(snap.id || snap.title)}`,
    name: L(lang, `Spécifique au gig : ${snap.title}`, `Gig-specific: ${snap.title}`),
    description: L(
      lang,
      'Méthodologie construite uniquement à partir de ce gig : offre, activités, compétences, cadre légal et objectifs.',
      'Methodology built only from this gig: offer, activities, skills, legal framework and objectives.'
    ),
    industry: domainLabel,
    components,
  };
}

const SECTOR_KEYWORDS: Array<{ id: string; pattern: RegExp }> = [
  { id: 'health-insurance', pattern: /assurance[s]?\s+sant[ée]|mutuelle|health\s+insurance|complementary health/i },
  { id: 'insurance-auto', pattern: /assurance[s]?\s+auto|auto(mobile)?\s+insurance|car\s+insurance|motor\s+insurance/i },
  { id: 'insurance-property', pattern: /assurance[s]?\s+(habitation|logement|multirisque)|home\s+insurance|property\s+insurance/i },
  { id: 'insurance-life', pattern: /assurance[s]?[\s-]+vie|life\s+insurance|[ée]pargne\s+retraite/i },
  { id: 'insurance-protection', pattern: /pr[ée]voyance|protection\s+(sociale|famille)|income\s+protection/i },
  { id: 'insurance-professional', pattern: /assurance[s]?\s+(pro|professionnelle|entreprise)|business\s+insurance|commercial\s+insurance/i },
  { id: 'finance-consumer-credit', pattern: /cr[ée]dit\s+(conso|à la consommation)|consumer\s+(credit|loan)|pr[êe]t\s+personnel/i },
  { id: 'finance-mortgage', pattern: /cr[ée]dit\s+immobilier|pr[êe]t\s+immobilier|mortgage|courtage\s+en\s+pr[êe]t/i },
  { id: 'finance-investment', pattern: /placement|investissement\s+financier|investment\s+(product|advice)|gestion\s+de\s+patrimoine|wealth/i },
  { id: 'finance-banking', pattern: /banque|bancaire|banking|compte\s+courant/i },
  { id: 'realestate-sales', pattern: /vente\s+immobili|real\s+estate\s+sales|agent\s+immobilier/i },
  { id: 'realestate-rental', pattern: /location\s+immobili|gestion\s+locative|rental|letting/i },
  { id: 'realestate-investment', pattern: /investissement\s+immobilier|real\s+estate\s+investment|defiscalisation|pinel/i },
  { id: 'regulated-energy', pattern: /[ée]nergie|[ée]lectricit[ée]|gaz\b|energy\s+supplier|utilities/i },
  { id: 'regulated-telecom', pattern: /t[ée]l[ée]com|op[ée]rateur|fibre|mobile\s+plan|telecom/i },
  { id: 'regulated-healthcare', pattern: /sant[ée]\s+(r[ée]glement|professionnel)|healthcare|pharma|m[ée]dical/i },
];

/** Sector cases that match the gig's own text (title, description, category, sectors, industries, activities). */
export function detectSectorIds(gig: unknown): string[] {
  const snap = buildGigSnapshotForAi(gig) as Record<string, any> | null;
  if (!snap) return [];
  const text = [snap.title, snap.description, snap.category, ...(snap.sectors || []), ...(snap.industries || []), ...(snap.activities || [])].join(' \n ');
  return SECTOR_KEYWORDS.filter((s) => s.pattern.test(text)).map((s) => s.id);
}

const EU_COUNTRIES =
  /france|germany|allemagne|spain|espagne|italy|italie|portugal|belgium|belgique|netherlands|pays-bas|luxembourg|ireland|irlande|austria|autriche|poland|pologne|sweden|su[èe]de|denmark|danemark|finland|finlande|greece|gr[èe]ce|czech|tch[èe]que|romania|roumanie|bulgaria|bulgarie|hungary|hongrie|croatia|croatie|slovak|slov[ée]nie|slovenia|estonia|estonie|latvia|lettonie|lithuania|lituanie|malta|malte|cyprus|chypre/i;
const US_COUNTRIES = /united states|[ée]tats-unis|\busa\b|\bus\b/i;

/**
 * Drops the regional compliance blocks that do not concern the gig's destination country
 * (e.g. US federal rules for a gig in France), so the generated training is not polluted.
 */
export function withoutForeignCompliance(methodology: TrainingMethodology, countryLabel?: string | null): TrainingMethodology {
  const country = String(countryLabel || '').trim();
  const components = methodology.components.filter((c) => {
    if (c.id === 'regional-compliance-us') return country ? US_COUNTRIES.test(country) : false;
    if (c.id === 'regional-compliance-eu') return country ? EU_COUNTRIES.test(country) : true;
    return true;
  });
  return { ...methodology, components };
}

export interface MethodologyComparison {
  /** What the gig-specific methodology brings that a ready-made one cannot. */
  adds: string[];
  /** Where a recommended ready-made methodology goes further. */
  lacks: string[];
}

const sizeOf = (m: TrainingMethodology) => ({
  hours: m.components.reduce((n, c) => n + (c.estimatedDuration || 0), 0),
  modules: m.components.reduce((n, c) => n + c.modules.length, 0),
  levels: m.certificationPath?.levels?.length || 0,
});

/**
 * Explains, from the data, how the gig-specific methodology differs from the other recommended ones,
 * so the user can choose knowingly.
 */
export function compareGigMethodology(
  lang: MethodologyLang,
  gigMethodology: TrainingMethodology,
  gig: unknown,
  recommended: TrainingMethodology[],
  countryLabel?: string
): MethodologyComparison {
  const snap = (buildGigSnapshotForAi(gig) || {}) as Record<string, any>;
  const adds: string[] = [];
  const activities = (snap.activities || []) as string[];
  const skillCount =
    ((snap.skillsSummary?.professional || []) as string[]).length +
    ((snap.skillsSummary?.technical || []) as string[]).length +
    ((snap.skillsSummary?.soft || []) as string[]).length;
  if (activities.length > 0) {
    adds.push(
      L(lang, `${activities.length === 1 ? 'Reprend l’activité' : `Reprend les ${activities.length} activités`} de votre gig : ${activities.slice(0, 4).join(', ')}${activities.length > 4 ? '…' : ''}`,
        `Covers the ${activities.length === 1 ? 'activity' : `${activities.length} activities`} of your gig: ${activities.slice(0, 4).join(', ')}${activities.length > 4 ? '…' : ''}`)
    );
  }
  if (skillCount > 0) {
    adds.push(
      L(
        lang,
        skillCount === 1 ? 'Forme à la compétence listée dans le gig' : `Forme aux ${skillCount} compétences listées dans le gig`,
        skillCount === 1 ? 'Trains the skill listed in the gig' : `Trains the ${skillCount} skills listed in the gig`
      )
    );
  }
  if (snap.description) {
    adds.push(L(lang, 'Utilise le vocabulaire et l’offre exacts décrits dans la fiche du gig', 'Uses the exact vocabulary and offer described in the gig sheet'));
  }
  const country = countryLabel || snap.destinationZone;
  if (country) adds.push(L(lang, `Cadre légal ciblé sur ${country}`, `Legal framework targeted at ${country}`));
  if ((snap.deliverables || []).length + (snap.highlights || []).length > 0) {
    adds.push(L(lang, 'Intègre les objectifs et livrables du gig', 'Includes the gig’s objectives and deliverables'));
  }

  const mine = sizeOf(gigMethodology);
  const lacks: string[] = [];
  for (const other of recommended) {
    const o = sizeOf(other);
    const gaps: string[] = [];
    if (o.hours > mine.hours) gaps.push(L(lang, `${o.hours} h de formation contre ${mine.hours} h`, `${o.hours} h of training vs ${mine.hours} h`));
    if (o.modules > mine.modules) gaps.push(L(lang, `${o.modules} thèmes contre ${mine.modules}`, `${o.modules} topics vs ${mine.modules}`));
    if (o.levels > mine.levels) gaps.push(L(lang, `${o.levels} niveaux de certification contre ${mine.levels}`, `${o.levels} certification levels vs ${mine.levels}`));
    if (gaps.length > 0) lacks.push(`${other.name} : ${gaps.join(', ')}`);
  }
  return { adds, lacks };
}
