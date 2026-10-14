export type PermissionMap = Record<string, boolean>;

export type PermissionGroup = {
  id: string;
  label: string;
  actions: { id: string; label: string }[];
};

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'gigs',
    label: 'Gigs',
    actions: [
      { id: 'view', label: 'Voir' },
      { id: 'create', label: 'Créer' },
      { id: 'edit', label: 'Modifier' },
      { id: 'delete', label: 'Supprimer' },
      { id: 'activate', label: 'Activer / pause' },
    ],
  },
  {
    id: 'leads',
    label: 'Prospects',
    actions: [
      { id: 'view', label: 'Voir' },
      { id: 'import', label: 'Importer' },
      { id: 'create', label: 'Créer' },
      { id: 'edit', label: 'Modifier' },
      { id: 'archive', label: 'Archiver' },
      { id: 'export', label: 'Exporter' },
    ],
  },
  {
    id: 'telephony',
    label: 'Téléphonie',
    actions: [
      { id: 'view', label: 'Voir' },
      { id: 'search', label: 'Rechercher' },
      { id: 'buy', label: 'Acheter' },
      { id: 'assign', label: 'Affecter' },
      { id: 'terminate', label: 'Résilier' },
      { id: 'test', label: 'Appel test' },
    ],
  },
  {
    id: 'scripts',
    label: 'Scripts',
    actions: [
      { id: 'view', label: 'Voir' },
      { id: 'create', label: 'Créer' },
      { id: 'edit', label: 'Modifier' },
      { id: 'delete', label: 'Supprimer' },
    ],
  },
  {
    id: 'knowledge',
    label: 'Base de connaissances',
    actions: [
      { id: 'view', label: 'Voir' },
      { id: 'create', label: 'Ajouter' },
      { id: 'edit', label: 'Modifier' },
      { id: 'delete', label: 'Supprimer' },
    ],
  },
  {
    id: 'matching',
    label: 'Matching / REPs',
    actions: [
      { id: 'view', label: 'Voir' },
      { id: 'invite', label: 'Inviter' },
      { id: 'decide', label: 'Accepter / refuser' },
    ],
  },
  {
    id: 'training',
    label: 'Formation',
    actions: [
      { id: 'view', label: 'Voir' },
      { id: 'create', label: 'Créer' },
      { id: 'edit', label: 'Modifier' },
      { id: 'delete', label: 'Supprimer' },
    ],
  },
  {
    id: 'calls',
    label: 'Appels',
    actions: [
      { id: 'view', label: 'Voir' },
      { id: 'listen', label: 'Écouter' },
      { id: 'validate', label: 'Valider' },
      { id: 'export', label: 'Exporter' },
    ],
  },
  {
    id: 'dashboard',
    label: 'Tableau de bord',
    actions: [{ id: 'view', label: 'Voir' }],
  },
  {
    id: 'agents',
    label: 'Agents',
    actions: [
      { id: 'view', label: 'Voir' },
      { id: 'create', label: 'Créer' },
      { id: 'edit', label: 'Modifier' },
      { id: 'remove', label: 'Retirer' },
    ],
  },
  {
    id: 'planning',
    label: 'Planification',
    actions: [
      { id: 'view', label: 'Voir' },
      { id: 'create', label: 'Créer' },
      { id: 'edit', label: 'Modifier' },
      { id: 'delete', label: 'Supprimer' },
    ],
  },
  {
    id: 'emails',
    label: 'E-mails',
    actions: [
      { id: 'view', label: 'Voir' },
      { id: 'create', label: 'Créer' },
      { id: 'send', label: 'Envoyer' },
    ],
  },
  {
    id: 'voice',
    label: 'Assistant vocal',
    actions: [
      { id: 'view', label: 'Voir' },
      { id: 'edit', label: 'Configurer' },
    ],
  },
  {
    id: 'activation',
    label: 'Activation des gigs',
    actions: [
      { id: 'view', label: 'Voir' },
      { id: 'edit', label: 'Modifier' },
    ],
  },
  {
    id: 'quality',
    label: 'Qualité',
    actions: [
      { id: 'view', label: 'Voir' },
      { id: 'review', label: 'Contrôler' },
    ],
  },
  {
    id: 'operations',
    label: 'Opérations',
    actions: [{ id: 'view', label: 'Voir' }],
  },
  {
    id: 'analytics',
    label: 'Analytique',
    actions: [{ id: 'view', label: 'Voir' }],
  },
  {
    id: 'wallet',
    label: 'Portefeuille',
    actions: [
      { id: 'view', label: 'Voir' },
      { id: 'deposit', label: 'Déposer' },
      { id: 'withdraw', label: 'Retirer' },
    ],
  },
  {
    id: 'subscription',
    label: 'Abonnement',
    actions: [
      { id: 'view', label: 'Voir' },
      { id: 'change', label: 'Changer de plan' },
    ],
  },
  {
    id: 'billing',
    label: 'Tokens et facturation',
    actions: [
      { id: 'view', label: 'Voir' },
      { id: 'buy', label: 'Acheter' },
    ],
  },
  {
    id: 'members',
    label: 'Équipe',
    actions: [
      { id: 'view', label: 'Voir' },
      { id: 'invite', label: 'Inviter' },
      { id: 'edit', label: 'Modifier les droits' },
      { id: 'remove', label: 'Retirer' },
    ],
  },
  {
    id: 'settings',
    label: 'Réglages',
    actions: [
      { id: 'view', label: 'Voir' },
      { id: 'edit', label: 'Modifier' },
    ],
  },
];

export const PRESET_IDS = ['admin', 'operator', 'readonly'] as const;
export type PresetId = (typeof PRESET_IDS)[number] | 'custom' | 'owner';

const OPERATOR = [
  'gigs.view', 'gigs.create', 'gigs.edit', 'gigs.activate',
  'leads.view', 'leads.import', 'leads.create', 'leads.edit',
  'telephony.view', 'telephony.search', 'telephony.assign', 'telephony.test',
  'scripts.view', 'scripts.create', 'scripts.edit',
  'knowledge.view', 'knowledge.create', 'knowledge.edit',
  'matching.view',
  'training.view',
  'calls.view', 'calls.listen', 'calls.validate',
  'billing.view',
  'settings.view',
];

export function allPermissionKeys(): string[] {
  return PERMISSION_GROUPS.flatMap((group) => group.actions.map((action) => `${group.id}.${action.id}`));
}

export function emptyPermissions(): PermissionMap {
  return Object.fromEntries(allPermissionKeys().map((key) => [key, false]));
}

export function permissionsForPreset(preset: string): PermissionMap {
  const base = emptyPermissions();
  if (preset === 'admin') {
    for (const key of Object.keys(base)) base[key] = true;
    return base;
  }
  if (preset === 'readonly') {
    for (const key of Object.keys(base)) {
      if (key.endsWith('.view')) base[key] = true;
    }
    return base;
  }
  if (preset === 'operator') {
    for (const key of OPERATOR) base[key] = true;
    return base;
  }
  return base;
}

/** Sidebar item key → permission required to see it. Owners skip this map. */
export const SIDEBAR_PERMISSION: Record<string, string> = {
  'premium-dashboard': 'dashboard.view',
  calls: 'calls.view',
  'cc-agents': 'agents.view',
  leads: 'leads.view',
  'rep-matching': 'matching.view',
  training: 'training.view',
  scheduler: 'planning.view',
  emails: 'emails.view',
  gigs: 'gigs.view',
  'script-generator': 'scripts.view',
  'knowledge-base': 'knowledge.view',
  telephony: 'telephony.view',
  'voice-assistant': 'voice.view',
  integrations: 'activation.view',
  'quality-assurance': 'quality.view',
  operations: 'operations.view',
  analytics: 'analytics.view',
  team: 'members.view',
};

/** Older memberships were granted through these keys before each area had its own right. */
export const SIDEBAR_PERMISSION_FALLBACK: Record<string, string> = {
  'premium-dashboard': 'calls.view',
  scheduler: 'matching.view',
  emails: 'calls.view',
  integrations: 'gigs.activate',
  'quality-assurance': 'calls.view',
  operations: 'calls.view',
  analytics: 'calls.view',
};
