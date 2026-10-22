/**
 * Groupes de fonctionnalités et paliers. Les paliers sont une PROPOSITION de structure :
 * aucun prix ici (la tarification est traitée à part). Chaque forfait inclut une seule ligne.
 * L'IA est un accès (groupe E) ; son utilisation est ensuite facturée à la consommation.
 */

export type FeatureGroupId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K';

export interface FeatureGroup {
  id: FeatureGroupId;
  name: string;
  description: string;
}

export const FEATURE_GROUPS: FeatureGroup[] = [
  { id: 'A', name: 'Socle', description: 'Compte, rôles, invitations, tableau de bord de base' },
  { id: 'B', name: 'Téléphonie', description: 'Softphone web, numéros, entrant et sortant, files d’attente, routage, enregistrement' },
  { id: 'C', name: 'Prospects et campagnes', description: 'Listes de contacts, composeur, scripts, preuve de consentement' },
  { id: 'D', name: 'Planning et présence', description: 'Plages de travail par file, couverture, respect du planning, absences' },
  { id: 'E', name: 'Qualité et IA', description: 'Transcription, évaluation des appels, coaching' },
  { id: 'F', name: 'Connaissance et formation', description: 'Base de connaissances, parcours de formation' },
  { id: 'G', name: 'Pilotage', description: 'Indicateurs standard et avancés, exports' },
  { id: 'H', name: 'Intégrations', description: 'CRM, API, webhooks, email, chat' },
  { id: 'I', name: 'Multi-clients (BPO)', description: 'Entité client, files, numéros et rapports par client' },
  { id: 'J', name: 'Conformité et sécurité', description: 'Consentement, conservation des enregistrements, RGPD, audit' },
  { id: 'K', name: 'Services', description: 'Mise en route assistée, support prioritaire' },
];

export type PlanId = 'essentiel' | 'equipe' | 'multi_clients';

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  groups: FeatureGroupId[];
  /** Lignes téléphoniques incluses dans l'abonnement ; les suivantes sont facturées en licence. */
  includedLines: number;
}

export const PLANS: Plan[] = [
  {
    id: 'essentiel',
    name: 'Essentiel',
    tagline: 'Démarrer un centre d’appels simple',
    groups: ['A', 'B', 'C', 'F', 'G', 'J'],
    includedLines: 1,
  },
  {
    id: 'equipe',
    name: 'Équipe',
    tagline: 'Piloter une équipe : planning, qualité et IA',
    groups: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K'],
    includedLines: 1,
  },
  {
    id: 'multi_clients',
    name: 'Multi-clients',
    tagline: 'Un centre qui travaille pour plusieurs clients',
    groups: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'],
    includedLines: 1,
  },
];

export const getPlan = (id: PlanId): Plan => PLANS.find((p) => p.id === id) ?? PLANS[0];

export function hasFeature(planId: PlanId | null | undefined, group: FeatureGroupId): boolean {
  if (!planId) return group === 'A';
  return getPlan(planId).groups.includes(group);
}

/** Premier palier qui débloque le groupe — sert aux messages « disponible avec le forfait … ». */
export function cheapestPlanWith(group: FeatureGroupId): Plan | null {
  return PLANS.find((p) => p.groups.includes(group)) ?? null;
}

/** Lignes à facturer en licence au-delà de celle incluse. */
export function billableExtraLines(planId: PlanId, totalLines: number): number {
  return Math.max(0, totalLines - getPlan(planId).includedLines);
}
