import type {
  MethodologyComponent,
  TrainingMethodology,
} from '../types/methodology';
import { healthInsuranceMethodology } from './healthInsuranceMethodology';

export type MethodologyLang = 'fr' | 'en';

type Copy = { fr: string; en: string };

const text = (lang: MethodologyLang, copy: Copy) => copy[lang];

function component(
  lang: MethodologyLang,
  input: {
    id: string;
    category: MethodologyComponent['category'];
    title: Copy;
    description: Copy;
    modules: Copy[];
    weight: number;
    estimatedDuration: number;
    prerequisites?: string[];
    competencyLevel?: MethodologyComponent['competencyLevel'];
    mandatory?: boolean;
  }
): MethodologyComponent {
  return {
    id: input.id,
    category: input.category,
    title: text(lang, input.title),
    description: text(lang, input.description),
    modules: input.modules.map((item) => text(lang, item)),
    weight: input.weight,
    prerequisites: input.prerequisites ?? [],
    estimatedDuration: input.estimatedDuration,
    competencyLevel: input.competencyLevel ?? 'working',
    mandatoryForCertification: input.mandatory ?? true,
  };
}

function withFramework(
  lang: MethodologyLang,
  base: Pick<TrainingMethodology, 'id' | 'name' | 'description' | 'industry' | 'components'>
): TrainingMethodology {
  const levelName = text(lang, { fr: 'Opérationnel', en: 'Operational' });
  return {
    ...base,
    region: 'global',
    learningFramework: {
      approach: 'bloom-taxonomy',
      learningObjectives: [
        {
          id: `${base.id}-apply`,
          level: 'apply',
          description: text(lang, {
            fr: 'Appliquer la méthode sur un cas commercial réel.',
            en: 'Apply the method on a real commercial case.',
          }),
          measurableOutcome: text(lang, {
            fr: 'Un entretien ou une proposition mené selon le cadre.',
            en: 'A call or proposal run with the framework.',
          }),
          assessmentMethod: ['scenario-practice'],
        },
      ],
      deliveryMethods: [
        {
          type: 'scenario-based',
          percentage: 50,
          rationale: text(lang, {
            fr: 'La pratique sur des cas concrets ancre les réflexes.',
            en: 'Practice on concrete cases builds the reflexes.',
          }),
        },
        {
          type: 'microlearning',
          percentage: 50,
          rationale: text(lang, {
            fr: 'Des modules courts, réutilisables avant un appel.',
            en: 'Short modules that can be reused before a call.',
          }),
        },
      ],
      reinforcementStrategy: {
        spacedRepetition: true,
        practiceIntervals: [1, 7, 30],
        refresherContent: [
          text(lang, { fr: 'Rejeu d’un cas', en: 'Case replay' }),
        ],
        performanceSupport: [
          text(lang, { fr: 'Aide-mémoire d’appel', en: 'Call checklist' }),
        ],
      },
    },
    assessmentStrategy: {
      formative: [
        { type: 'scenario-practice', frequency: 'per-module', feedback: 'immediate' },
      ],
      summative: [
        {
          type: 'practical-demonstration',
          passingCriteria: text(lang, {
            fr: 'Mener un cas jusqu’à la prochaine étape commerciale.',
            en: 'Run a case through to the next commercial step.',
          }),
          retakePolicy: text(lang, {
            fr: 'Un nouvel essai après correction.',
            en: 'One retry after feedback.',
          }),
          certificationWeight: 100,
        },
      ],
      competencyMapping: [
        {
          competency: levelName,
          behavioralIndicators: [
            text(lang, {
              fr: 'Suit le cadre sans improviser les étapes clés.',
              en: 'Follows the framework on the key steps.',
            }),
          ],
          assessmentMethods: ['scenario-practice'],
          proficiencyLevels: [
            {
              level: 1,
              name: text(lang, { fr: 'Découverte', en: 'Awareness' }),
              description: text(lang, {
                fr: 'Connaît les étapes.',
                en: 'Knows the steps.',
              }),
              criteria: [text(lang, { fr: 'Nomme les étapes', en: 'Names the steps' })],
            },
            {
              level: 2,
              name: levelName,
              description: text(lang, {
                fr: 'Applique les étapes sur un cas simple.',
                en: 'Applies the steps on a simple case.',
              }),
              criteria: [text(lang, { fr: 'Mène le cas', en: 'Runs the case' })],
            },
          ],
        },
      ],
      continuousImprovement: true,
    },
    certificationPath: {
      levels: [
        {
          id: `${base.id}-ready`,
          name: text(lang, { fr: 'Prêt à exercer', en: 'Ready to practice' }),
          description: text(lang, {
            fr: 'Peut mener un cycle commercial avec le cadre.',
            en: 'Can run a commercial cycle with the framework.',
          }),
          requiredComponents: base.components.filter((item) => item.mandatoryForCertification).map((item) => item.id),
          minimumScore: 70,
          practicalRequirements: [
            text(lang, {
              fr: 'Réussir un cas pratique de bout en bout.',
              en: 'Pass an end-to-end practical case.',
            }),
          ],
          timeframe: text(lang, { fr: '30 jours', en: '30 days' }),
          badge: `${base.id}-badge`,
        },
      ],
      maintenanceRequirements: [
        {
          type: 'refresher-training',
          frequency: text(lang, { fr: 'Trimestrielle', en: 'Quarterly' }),
          hours: 2,
          description: text(lang, {
            fr: 'Revoir les cas et les objections fréquentes.',
            en: 'Review cases and frequent objections.',
          }),
        },
      ],
      advancementCriteria: [],
    },
  };
}

export function buildProspectingMethodology(lang: MethodologyLang): TrainingMethodology {
  return withFramework(lang, {
    id: 'generic-prospecting',
    name: text(lang, { fr: 'Prospection', en: 'Prospecting' }),
    description: text(lang, {
      fr: 'Méthode générique pour trouver, qualifier et relancer des prospects, quel que soit le métier.',
      en: 'Generic method to find, qualify and follow up with prospects, for any profession.',
    }),
    industry: text(lang, { fr: 'Prospection', en: 'Prospecting' }),
    components: [
      component(lang, {
        id: 'prospecting-frame',
        category: 'foundational',
        title: { fr: 'Cadrer la prospection', en: 'Frame the prospecting' },
        description: {
          fr: 'Définir l’offre, la cible et le résultat attendu d’un premier contact.',
          en: 'Define the offer, the target and the expected outcome of a first contact.',
        },
        modules: [
          { fr: 'Offre en une phrase', en: 'Offer in one sentence' },
          { fr: 'Cible et critères d’exclusion', en: 'Target and exclusion criteria' },
          { fr: 'Objectif du premier échange', en: 'Goal of the first conversation' },
        ],
        weight: 20,
        estimatedDuration: 4,
      }),
      component(lang, {
        id: 'prospecting-qualify',
        category: 'industry-specific',
        title: { fr: 'Cibler et qualifier', en: 'Target and qualify' },
        description: {
          fr: 'Repérer les bons comptes et vérifier qu’un échange vaut le coup.',
          en: 'Find the right accounts and check that a conversation is worth it.',
        },
        modules: [
          { fr: 'Sources de prospects', en: 'Prospect sources' },
          { fr: 'Signaux d’intérêt', en: 'Signals of interest' },
          { fr: 'Questions de qualification', en: 'Qualification questions' },
        ],
        weight: 25,
        estimatedDuration: 6,
      }),
      component(lang, {
        id: 'prospecting-outreach',
        category: 'operational',
        title: { fr: 'Prendre contact', en: 'Make first contact' },
        description: {
          fr: 'Ouvrir un appel, un message ou un email sans pitcher trop tôt.',
          en: 'Open a call, a message or an email without pitching too early.',
        },
        modules: [
          { fr: 'Accroche et raison de l’appel', en: 'Hook and reason for the call' },
          { fr: 'Permission de continuer', en: 'Permission to continue' },
          { fr: 'Prochaine étape concrète', en: 'Concrete next step' },
        ],
        weight: 25,
        estimatedDuration: 6,
      }),
      component(lang, {
        id: 'prospecting-followup',
        category: 'operational',
        title: { fr: 'Relancer et suivre', en: 'Follow up' },
        description: {
          fr: 'Tenir un rythme de relance sans harceler.',
          en: 'Keep a follow-up rhythm without chasing.',
        },
        modules: [
          { fr: 'Cadence de relance', en: 'Follow-up cadence' },
          { fr: 'Message de relance utile', en: 'Useful follow-up message' },
          { fr: 'Classer : à rappeler, nourrir, abandonner', en: 'Sort: call back, nurture, drop' },
        ],
        weight: 20,
        estimatedDuration: 4,
        prerequisites: ['prospecting-outreach'],
      }),
      component(lang, {
        id: 'prospecting-posture',
        category: 'soft-skills',
        title: { fr: 'Posture commerciale', en: 'Commercial posture' },
        description: {
          fr: 'Écouter, noter et rester clair sous la pression du volume.',
          en: 'Listen, take notes and stay clear under volume pressure.',
        },
        modules: [
          { fr: 'Écoute et reformulation', en: 'Listening and reformulation' },
          { fr: 'Gestion du refus', en: 'Handling a no' },
          { fr: 'Organisation de la journée', en: 'Organising the day' },
        ],
        weight: 10,
        estimatedDuration: 3,
        mandatory: false,
      }),
    ],
  });
}

export function buildB2bServicesMethodology(lang: MethodologyLang): TrainingMethodology {
  return withFramework(lang, {
    id: 'generic-b2b-services',
    name: text(lang, { fr: 'Vente de services B2B', en: 'B2B services sales' }),
    description: text(lang, {
      fr: 'Méthode générique pour vendre un service à une entreprise : besoin, valeur, objections et décision.',
      en: 'Generic method to sell a service to a company: need, value, objections and decision.',
    }),
    industry: text(lang, { fr: 'Vente de services B2B', en: 'B2B services sales' }),
    components: [
      component(lang, {
        id: 'b2b-offer',
        category: 'foundational',
        title: { fr: 'Comprendre l’offre de service', en: 'Understand the service offer' },
        description: {
          fr: 'Savoir expliquer le service, pour qui il est fait, et ce qu’il change.',
          en: 'Explain the service, who it is for, and what it changes.',
        },
        modules: [
          { fr: 'Problème client et promesse', en: 'Customer problem and promise' },
          { fr: 'Périmètre et limites du service', en: 'Scope and limits of the service' },
          { fr: 'Preuves : cas, chiffres, références', en: 'Proof: cases, numbers, references' },
        ],
        weight: 20,
        estimatedDuration: 4,
      }),
      component(lang, {
        id: 'b2b-discovery',
        category: 'industry-specific',
        title: { fr: 'Découvrir le besoin', en: 'Discover the need' },
        description: {
          fr: 'Faire parler l’interlocuteur avant de présenter la solution.',
          en: 'Let the contact speak before presenting the solution.',
        },
        modules: [
          { fr: 'Contexte et enjeux', en: 'Context and stakes' },
          { fr: 'Décideurs et calendrier', en: 'Decision makers and timeline' },
          { fr: 'Critères de choix', en: 'Decision criteria' },
        ],
        weight: 25,
        estimatedDuration: 6,
      }),
      component(lang, {
        id: 'b2b-value',
        category: 'operational',
        title: { fr: 'Proposition de valeur', en: 'Value proposition' },
        description: {
          fr: 'Relier le service au problème entendu, pas à une plaquette.',
          en: 'Tie the service to the problem you heard, not to a brochure.',
        },
        modules: [
          { fr: 'Reformuler le besoin', en: 'Restate the need' },
          { fr: 'Bénéfice concret', en: 'Concrete benefit' },
          { fr: 'Prochaine étape proposée', en: 'Proposed next step' },
        ],
        weight: 20,
        estimatedDuration: 5,
        prerequisites: ['b2b-discovery'],
      }),
      component(lang, {
        id: 'b2b-objections',
        category: 'operational',
        title: { fr: 'Objections, négociation et décision', en: 'Objections, negotiation and decision' },
        description: {
          fr: 'Traiter le prix, le timing et le statut quo, puis demander une décision.',
          en: 'Handle price, timing and the status quo, then ask for a decision.',
        },
        modules: [
          { fr: 'Prix et valeur', en: 'Price and value' },
          { fr: '« On verra plus tard »', en: '“We will see later”' },
          { fr: 'Demander la décision', en: 'Ask for the decision' },
        ],
        weight: 25,
        estimatedDuration: 6,
        prerequisites: ['b2b-value'],
      }),
      component(lang, {
        id: 'b2b-account',
        category: 'soft-skills',
        title: { fr: 'Tenir la relation', en: 'Hold the relationship' },
        description: {
          fr: 'Après la signature : suivi, satisfaction et suite du compte.',
          en: 'After the signature: follow-up, satisfaction and the next account step.',
        },
        modules: [
          { fr: 'Lancement et points de suivi', en: 'Kickoff and check-ins' },
          { fr: 'Remontée d’un problème', en: 'Raising a problem' },
          { fr: 'Élargir le compte', en: 'Expand the account' },
        ],
        weight: 10,
        estimatedDuration: 3,
        mandatory: false,
      }),
    ],
  });
}

const HEALTH_FR_TITLES: Record<string, string> = {
  'foundational-knowledge': 'Fondamentaux de l’assurance et vue d’ensemble',
  'regulatory-compliance': 'Conformité réglementaire et cadre légal',
  'product-mastery': 'Maîtrise des produits d’assurance santé',
  'sales-excellence': 'Excellence commerciale et acquisition',
  'customer-service-excellence': 'Service client et fidélisation',
  'technology-proficiency': 'Outils et systèmes',
  'company-culture': 'Culture, valeurs et procédures de l’entreprise',
  'professional-development': 'Développement professionnel',
  'regional-compliance-eu': 'Conformité européenne et protection des données',
  'contact-centre-operations': 'Excellence du centre de contact',
  'regional-compliance-us': 'Conformité fédérale et des États (États-Unis)',
};

/** Card and AI titles follow the UI language. Module bodies of the specialist program stay as authored. */
export function healthInsuranceMethodologyForLanguage(lang: MethodologyLang): TrainingMethodology {
  if (lang === 'en') return healthInsuranceMethodology;
  return {
    ...healthInsuranceMethodology,
    name: 'Courtage en assurance santé',
    description:
      'Formation complète pour les courtiers en assurance santé : conformité, produits et excellence commerciale.',
    industry: 'Assurance santé',
    components: healthInsuranceMethodology.components.map((item) => ({
      ...item,
      title: HEALTH_FR_TITLES[item.id] || item.title,
    })),
  };
}
