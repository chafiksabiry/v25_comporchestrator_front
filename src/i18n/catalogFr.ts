/** English catalog / plan strings stored in the database, shown in French when the UI language is fr. */

const FR: Record<string, string> = {
  'account management': 'Gestion de comptes',
  'billing support': 'Support facturation',
  'chat support': 'Support chat',
  'collections': 'Recouvrement',
  'complaint resolution': 'Traitement des réclamations',
  'customer retention': 'Fidélisation client',
  'customer service': 'Service client',
  'dispatch services': 'Services de répartition',
  'email support': 'Support e-mail',
  'emergency support': "Support d'urgence",
  'follow-up calls': 'Appels de relance',
  'help desk': "Centre d'assistance",
  'inbound sales': 'Ventes entrantes',
  'market research': 'Études de marché',
  'multilingual support': 'Support multilingue',
  'order processing': 'Traitement des commandes',
  'outbound sales': 'Ventes sortantes',
  'product support': 'Support produit',
  'social media support': 'Support réseaux sociaux',
  'survey calls': "Appels d'enquête",
  'technical support': 'Support technique',
  'warranty support': 'Support garantie',
  'welcome calls': 'Appels de bienvenue',
  'lead generation': 'Génération de leads',
  'appointment setting': 'Prise de rendez-vous',
  'call center': "Centre d'appels",
  'cold calling': 'Prospection téléphonique',
  'inside sales': 'Ventes internes',
  'bpo / outsourcing': 'Externalisation / BPO',
  'other': 'Autre',
  'active listening': 'Écoute active',
  'stress management': 'Gestion du stress',
  'clear verbal communication': 'Communication verbale claire',
  'expert': 'Expert',
  'advanced': 'Avancé',
  'beginner': 'Débutant',
  'intermediate': 'Intermédiaire',
  'junior': 'Junior',
  'mid-level': 'Confirmé',
  'senior': 'Senior',
  'c-level': 'Direction',
  'agent': 'Agent',
  'agent junior': 'Agent junior',
  'agent senior': 'Agent senior',
  'supervisor': 'Superviseur',
  'daily': 'Quotidien',
  'weekly': 'Hebdomadaire',
  'monthly': 'Mensuel',
  'flexible hours': 'Horaires flexibles',
  'remote work available': 'Télétravail possible',
  'active gigs': 'Gigs actifs',
  'active gigs (up to)': "Gigs actifs (jusqu'à)",
  'active local numbers (included)': 'Numéros locaux actifs (inclus)',
  'active local number (included)': 'Numéro local actif (inclus)',
  'active reps': 'Reps actifs',
  'active reps (up to)': "Reps actifs (jusqu'à)",
  'active reps (per gig)': 'Reps actifs (par gig)',
  'ai token (million)': 'Jetons IA (millions)',
  'communication minutes included': 'Minutes de communication incluses',
  'onboarding offered then on-demand': "Onboarding offert, puis à la demande",
  'ai powered flow engine': "Moteur de flux propulsé par l'IA",
  'ai powered learning engine': "Moteur d'apprentissage propulsé par l'IA",
  'ai powered reps matching': "Matching REPS propulsé par l'IA",
  'scheduler': 'Planificateur',
  'email support with assisted onboarding': 'Support e-mail avec onboarding assisté',
  'channels: outbound calls only': 'Canaux : appels sortants uniquement',
  'all starter features': 'Toutes les fonctions Starter',
  'call storage: 2 months': 'Stockage des appels : 2 mois',
  'priority support + chat': 'Support prioritaire + chat',
  'all growth features included': 'Toutes les fonctions Growth incluses',
  'priority support — live chat, email': 'Support prioritaire — chat en direct, e-mail',
  'priority support - live chat, email': 'Support prioritaire — chat en direct, e-mail',
  'kb only': 'Base de connaissances seule',
  'kb + uploaded files': 'Base + fichiers téléversés',
  'uploaded files only': 'Fichiers téléversés seuls',
  'no kb, no documents': 'Aucun document',
  'no documents': 'Aucun document',
  'complete beginner': 'Débutant complet',
  'some basics': 'Notions de base',
  'understand the fundamentals': 'Comprendre les fondamentaux',
  'sell the product better': 'Mieux vendre le produit',
  'handle practical use cases': 'Maîtriser les cas pratiques',
  'prepare for certification': 'Préparer une certification',
  'structured training plan': 'Plan de formation structuré',
  'practical cases + exercises': 'Cas pratiques + exercices',
  'interactive workshop format': 'Format atelier interactif',
  'quick reference sheet format': 'Fiche de référence rapide',
};

const PATTERNS: Array<{ re: RegExp; to: (match: RegExpMatchArray) => string }> = [
  { re: /^active gigs:\s*up to\s+(.+)$/i, to: (m) => `Gigs actifs : jusqu'à ${m[1]}` },
  { re: /^active gigs:\s*(.+)$/i, to: (m) => `Gigs actifs : ${m[1]}` },
  { re: /^active reps:\s*up to\s+(.+?)\s+per gig$/i, to: (m) => `Reps actifs : jusqu'à ${m[1]} par gig` },
  { re: /^active reps:\s*up to\s+(.+)$/i, to: (m) => `Reps actifs : jusqu'à ${m[1]}` },
  { re: /^active reps:\s*(.+)$/i, to: (m) => `Reps actifs : ${m[1]}` },
  { re: /^communication minutes:\s*(.+)$/i, to: (m) => `Minutes de communication : ${m[1]}` },
  { re: /^active local numbers:\s*(.+)$/i, to: (m) => `Numéros locaux actifs : ${m[1]}` },
  { re: /^ai tokens:\s*(.+)$/i, to: (m) => `Jetons IA : ${translateCatalogFr(m[1])}` },
];

export function translateCatalogFr(text: string): string {
  const raw = String(text ?? '');
  const trimmed = raw.trim();
  if (!trimmed) return raw;
  const exact = FR[trimmed.toLowerCase()];
  if (exact) return exact;
  for (const pattern of PATTERNS) {
    const match = trimmed.match(pattern.re);
    if (match) return pattern.to(match);
  }
  return raw;
}

export function localizeCatalog(text: string, lang?: string): string {
  const code = String(lang || '').slice(0, 2).toLowerCase();
  if (code === 'en') return text;
  if (code !== 'fr') return text;
  return translateCatalogFr(text);
}
