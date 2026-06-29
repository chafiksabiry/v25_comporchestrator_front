export const COMPANY_ORCHESTRATOR_TAB_TITLES: Record<string, string> = {
  'company-onboarding': 'Orchestrator · Onboarding',
  'profile-creation': 'Orchestrator · Profil entreprise',
  'gig-generation': 'Orchestrator · Création de gigs',
  matching: 'Orchestrator · Matching reps',
  'approval-publishing': 'Orchestrator · Activation gig',
  optimization: 'Orchestrator · Optimisation',
  'knowledge-base': 'Orchestrator · Base de connaissances',
  'script-generator': "Orchestrator · Script d'appel",
  training: 'Orchestrator · Formation',
  dashboard: 'Tableau de bord',
};

export const COMPANY_ONBOARDING_STEP_TITLES: Record<number, string> = {
  1: 'Orchestrator · Profil entreprise',
  2: 'Orchestrator · Vérification KYC',
  3: 'Orchestrator · Gigs',
  4: 'Orchestrator · Téléphonie',
  5: 'Orchestrator · Import contacts',
  6: 'Orchestrator · Reporting',
  7: 'Orchestrator · Base de connaissances',
  8: 'Orchestrator · E-learning',
  9: "Orchestrator · Script d'appel",
  10: 'Orchestrator · Planification',
  11: 'Orchestrator · Abonnement',
  12: 'Orchestrator · Activation gig',
  13: 'Orchestrator · Matching reps',
};

const COMPANY_DASHBOARD_TITLES: Array<{ test: (path: string) => boolean; label: string }> = [
  { test: (p) => p === '/dashboard/main', label: 'Tableau de bord' },
  { test: (p) => p === '/dashboard/overview', label: "Vue d'ensemble" },
  { test: (p) => p === '/dashboard', label: 'Tableau de bord' },
  { test: (p) => /^\/dashboard\/gigs\/[^/]+$/.test(p), label: 'Détail gig' },
  { test: (p) => p.startsWith('/dashboard/gigs'), label: 'Gigs' },
  { test: (p) => p.startsWith('/dashboard/calls'), label: 'Appels' },
  { test: (p) => p.startsWith('/dashboard/leads'), label: 'Prospects' },
  { test: (p) => p.startsWith('/dashboard/rep-matching'), label: 'Rep Matching' },
  { test: (p) => p.startsWith('/dashboard/training'), label: 'Formation' },
  { test: (p) => p.startsWith('/dashboard/scheduler'), label: 'Planificateur' },
  { test: (p) => p.startsWith('/dashboard/emails'), label: 'Emails' },
  { test: (p) => p.startsWith('/dashboard/chat'), label: 'Chat en direct' },
  { test: (p) => p.startsWith('/dashboard/script-generator'), label: "Script d'appel" },
  { test: (p) => p.startsWith('/dashboard/knowledge-base'), label: 'Base de connaissances' },
  { test: (p) => p.startsWith('/dashboard/kb-insight'), label: 'Insights KB' },
  { test: (p) => p.startsWith('/dashboard/telephony'), label: 'Lignes téléphone' },
  { test: (p) => p.startsWith('/dashboard/gig-activation'), label: 'Activation gig' },
  { test: (p) => p.startsWith('/dashboard/quality-assurance'), label: 'Assurance qualité' },
  { test: (p) => p.startsWith('/dashboard/operations'), label: 'Opérations' },
  { test: (p) => p.startsWith('/dashboard/analytics'), label: 'Analyses' },
  { test: (p) => p.startsWith('/dashboard/wallet'), label: 'Portefeuille' },
  { test: (p) => p.startsWith('/dashboard/minutes'), label: 'Minutes' },
  { test: (p) => p.startsWith('/dashboard/subscription'), label: 'Abonnement' },
  { test: (p) => p.startsWith('/dashboard/upgrade'), label: 'Mise à niveau' },
  { test: (p) => p.startsWith('/dashboard/profile'), label: 'Profil entreprise' },
  { test: (p) => p.startsWith('/dashboard/account-settings'), label: 'Paramètres du compte' },
  { test: (p) => p.startsWith('/dashboard/settings'), label: 'Paramètres' },
  { test: (p) => p.startsWith('/dashboard/call-report'), label: "Rapport d'appel" },
  { test: (p) => p.startsWith('/dashboard/telnyx-call-test'), label: 'Test appel Telnyx' },
  { test: (p) => p === '/orchestrator' || p.startsWith('/orchestrator/'), label: 'Orchestrator · Onboarding' },
];

export function buildCompanyPageTitle(sectionLabel: string): string {
  return `HARX — Entreprise · ${sectionLabel}`;
}

export function resolveCompanyTabTitle(pathname: string): string {
  const path = pathname.replace(/\/+$/, '') || '/';
  const match = COMPANY_DASHBOARD_TITLES.find(({ test }) => test(path));
  return match?.label ?? 'Portail entreprise';
}

export function resolveCompanyOrchestratorTabTitle(activeTab: string): string {
  return COMPANY_ORCHESTRATOR_TAB_TITLES[activeTab] ?? 'Orchestrator · Onboarding';
}

export function resolveCompanyOnboardingFocusTitle(options: {
  focusedStepId: number | null;
  showGigCreation: boolean;
  showGigDetails: boolean;
  showTelephonySetup: boolean;
  showUploadContacts: boolean;
  showKnowledgeBase: boolean;
}): string {
  if (options.showGigCreation) return 'Orchestrator · Création de gig';
  if (options.showGigDetails) return 'Orchestrator · Mes gigs';
  if (options.showTelephonySetup) return 'Orchestrator · Téléphonie';
  if (options.showUploadContacts) return 'Orchestrator · Import contacts';
  if (options.showKnowledgeBase) return 'Orchestrator · Base de connaissances';

  if (options.focusedStepId != null) {
    return COMPANY_ONBOARDING_STEP_TITLES[options.focusedStepId] ?? 'Orchestrator · Onboarding';
  }

  return 'Orchestrator · Onboarding';
}
