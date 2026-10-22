/** Modèles de départ : un cas d'usage pré-configure la première file, le script et les indicateurs. */

export type TemplateId = 'inbound_service' | 'outbound_sales' | 'internal_support';

export interface QueueDraft {
  name: string;
  direction: 'inbound' | 'outbound';
  strategy: 'longest_idle' | 'round_robin';
  /** Message du menu vocal pour une file entrante. */
  greeting?: string;
}

export interface CallCenterTemplate {
  id: TemplateId;
  name: string;
  description: string;
  queue: QueueDraft;
  script: string;
  kpis: string[];
  /** Un centre qui prospecte doit gérer la preuve de consentement (régime français). */
  needsConsent: boolean;
}

export const TEMPLATES: CallCenterTemplate[] = [
  {
    id: 'inbound_service',
    name: 'Service client entrant',
    description: 'Vos clients vous appellent : file d’attente, menu vocal, suivi de la qualité de service.',
    queue: {
      name: 'Service client',
      direction: 'inbound',
      strategy: 'longest_idle',
      greeting: 'Bienvenue. Votre appel est important pour nous, un conseiller va vous répondre.',
    },
    script:
      'Bonjour, {{entreprise}}, {{agent}} à votre écoute.\n\n1. Identifier le client (nom, référence)\n2. Reformuler la demande\n3. Apporter la réponse ou ouvrir un dossier\n4. Confirmer la résolution\n5. Conclure : « Puis-je faire autre chose pour vous ? »',
    kpis: ['Taux de décroché', 'Temps d’attente moyen', 'Durée moyenne de traitement', 'Appels abandonnés'],
    needsConsent: false,
  },
  {
    id: 'outbound_sales',
    name: 'Équipe commerciale sortante',
    description: 'Vos agents appellent des prospects ou des clients : listes, script, suivi des résultats.',
    queue: { name: 'Campagne sortante', direction: 'outbound', strategy: 'round_robin' },
    script:
      'Bonjour {{contact}}, {{agent}} de {{entreprise}}.\n\n1. Rappeler le contexte et vérifier que le moment convient\n2. Poser les questions de qualification\n3. Présenter l’offre en deux phrases\n4. Traiter les objections\n5. Proposer la suite (rendez-vous, devis, rappel)',
    kpis: ['Appels passés', 'Taux de contact', 'Rendez-vous obtenus', 'Durée moyenne d’appel'],
    needsConsent: true,
  },
  {
    id: 'internal_support',
    name: 'Support interne',
    description: 'Vos collaborateurs appellent le support : helpdesk RH, informatique ou administratif.',
    queue: {
      name: 'Support interne',
      direction: 'inbound',
      strategy: 'longest_idle',
      greeting: 'Support interne. Un collaborateur va prendre votre appel.',
    },
    script:
      'Support interne, {{agent}}, bonjour.\n\n1. Identifier le collaborateur et son service\n2. Qualifier le problème\n3. Résoudre ou escalader avec un numéro de ticket\n4. Confirmer la prise en charge',
    kpis: ['Tickets résolus au premier appel', 'Temps d’attente moyen', 'Escalades'],
    needsConsent: false,
  },
];

export const getTemplate = (id: TemplateId): CallCenterTemplate =>
  TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
