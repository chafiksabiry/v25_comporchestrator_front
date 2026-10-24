import type {
  MethodologyComponent,
  TrainingMethodology,
} from '../types/methodology';
import { healthInsuranceMethodology } from './healthInsuranceMethodology';

export type MethodologyLang = 'fr' | 'en';

export type Copy = { fr: string; en: string };

export const text = (lang: MethodologyLang, copy: Copy) => copy[lang];

export function component(
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

export function withFramework(
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

/**
 * Generic, country-agnostic regulatory module reused across every methodology.
 * Content stays at the level of universal telemarketing/data-privacy principles
 * (consent, opt-out/do-not-call registries, call recording disclosure, data
 * retention, calling hours) and explicitly tells the REP to verify the exact
 * local rules — it never asserts a specific law for a specific country, since
 * that depends on the destination country, the industry and local regulation
 * and must be confirmed with compliance/legal, not hard-coded here.
 */
export function buildRegulatoryComponent(
  lang: MethodologyLang,
  idPrefix: string,
  countryLabel?: string
): MethodologyComponent {
  const country = countryLabel?.trim();
  const countryPhrase = country
    ? text(lang, { fr: `pour ${country}`, en: `for ${country}` })
    : text(lang, { fr: 'du pays ciblé par la campagne', en: "of the campaign's target country" });

  return component(lang, {
    id: `${idPrefix}-regulatory`,
    category: 'regulatory',
    title: { fr: 'Conformité et réglementation locale', en: 'Compliance and local regulation' },
    description: {
      fr: `Les règles exactes dépendent du pays, du secteur d'activité et de la nature de l'appel — à vérifier ${countryPhrase} avec le service conformité/juridique avant la campagne.`,
      en: `The exact rules depend on the country, the industry and the nature of the call — to verify ${countryPhrase} with the compliance/legal team before the campaign.`,
    },
    modules: [
      {
        fr: 'Base légale du contact et consentement (ex. opt-in, intérêt légitime, relation client existante)',
        en: 'Legal basis for the contact and consent (e.g. opt-in, legitimate interest, existing customer relationship)',
      },
      {
        fr: 'Listes d\'opposition / ne-pas-appeler locales (ex. Bloctel, DNC) : vérification et exclusion avant appel',
        en: 'Local do-not-call / opt-out registries (e.g. Bloctel, DNC): checked and excluded before calling',
      },
      {
        fr: 'Horaires d\'appel autorisés et fréquence de contact selon la réglementation locale',
        en: 'Allowed calling hours and contact frequency under local regulation',
      },
      {
        fr: 'Enregistrement de l\'appel : information du client et recueil du consentement si requis',
        en: 'Call recording: informing the customer and obtaining consent where required',
      },
      {
        fr: 'Données personnelles : collecte minimale, durée de conservation, droits d\'accès/rectification/suppression',
        en: 'Personal data: minimal collection, retention period, access/rectification/erasure rights',
      },
      {
        fr: 'Mentions obligatoires selon le secteur (ex. assurance, finance, santé, recouvrement) si l\'activité l\'exige',
        en: 'Mandatory disclosures by sector (e.g. insurance, finance, health, collections) when the activity requires them',
      },
    ],
    weight: 10,
    estimatedDuration: 4,
    mandatory: true,
  });
}

export function buildProspectingMethodology(lang: MethodologyLang, countryLabel?: string): TrainingMethodology {
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
        weight: 5,
        estimatedDuration: 3,
        mandatory: false,
      }),
      buildRegulatoryComponent(lang, 'prospecting', countryLabel),
    ],
  });
}

export function buildB2bServicesMethodology(lang: MethodologyLang, countryLabel?: string): TrainingMethodology {
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
        weight: 5,
        estimatedDuration: 3,
        mandatory: false,
      }),
      buildRegulatoryComponent(lang, 'b2b', countryLabel),
    ],
  });
}

export function buildCollectionsMethodology(lang: MethodologyLang, countryLabel?: string): TrainingMethodology {
  return withFramework(lang, {
    id: 'generic-collections',
    name: text(lang, { fr: 'Recouvrement', en: 'Collections' }),
    description: text(lang, {
      fr: 'Formation au recouvrement amiable et contentieux : cadre légal, scripts et négociation.',
      en: 'Amiable and pre-litigation collections training: legal frame, scripts and negotiation.',
    }),
    industry: text(lang, { fr: 'Recouvrement', en: 'Collections' }),
    components: [
      component(lang, {
        id: 'collections-frame',
        category: 'foundational',
        title: { fr: 'Cadre légal et déroulé de l’appel', en: 'Legal frame and call flow' },
        description: {
          fr: 'Rappeler la situation avec exactitude, sans menace ni pression abusive.',
          en: 'State the situation accurately, with no threat or abusive pressure.',
        },
        modules: [
          { fr: 'Accueil, identification et légal', en: 'Greeting, identification and legal disclosure' },
          { fr: 'Rappel factuel et neutre de la créance', en: 'Factual, neutral statement of the debt' },
          { fr: 'Ce qu’il est interdit de dire ou de faire', en: 'What must never be said or done' },
        ],
        weight: 20,
        estimatedDuration: 4,
      }),
      component(lang, {
        id: 'collections-listen',
        category: 'industry-specific',
        title: { fr: 'Comprendre la situation du débiteur', en: 'Understand the debtor’s situation' },
        description: {
          fr: 'Écouter avant de proposer, pour trouver une solution réaliste.',
          en: 'Listen before proposing, to find a realistic solution.',
        },
        modules: [
          { fr: 'Questions ouvertes sur la capacité de paiement', en: 'Open questions on payment capacity' },
          { fr: 'Repérer une situation de vulnérabilité', en: 'Spot a vulnerable-customer situation' },
          { fr: 'Garder un ton factuel et respectueux', en: 'Keep a factual, respectful tone' },
        ],
        weight: 20,
        estimatedDuration: 5,
      }),
      component(lang, {
        id: 'collections-plan',
        category: 'operational',
        title: { fr: 'Proposer un plan ou une solution', en: 'Propose a plan or a solution' },
        description: {
          fr: 'Construire une proposition de paiement acceptable des deux côtés.',
          en: 'Build a payment proposal acceptable to both sides.',
        },
        modules: [
          { fr: 'Options de règlement disponibles', en: 'Available settlement options' },
          { fr: 'Adapter l’échéancier à la situation', en: 'Adapt the schedule to the situation' },
          { fr: 'Formaliser l’accord', en: 'Formalise the agreement' },
        ],
        weight: 20,
        estimatedDuration: 5,
        prerequisites: ['collections-listen'],
      }),
      component(lang, {
        id: 'collections-commitment',
        category: 'operational',
        title: { fr: 'Obtenir un engagement clair', en: 'Secure a clear commitment' },
        description: {
          fr: 'Faire confirmer précisément le montant, la date et le moyen de paiement.',
          en: 'Have the amount, date and payment method confirmed precisely.',
        },
        modules: [
          { fr: 'Confirmer les termes avec le débiteur', en: 'Confirm the terms with the debtor' },
          { fr: 'Expliquer les conséquences d’un non-respect', en: 'Explain the consequences of non-compliance' },
          { fr: 'Tracer l’engagement dans le système', en: 'Log the commitment in the system' },
        ],
        weight: 20,
        estimatedDuration: 4,
        prerequisites: ['collections-plan'],
      }),
      component(lang, {
        id: 'collections-posture',
        category: 'soft-skills',
        title: { fr: 'Gérer la tension et la prise de congé', en: 'Handle tension and close the call' },
        description: {
          fr: 'Rester professionnel face à un interlocuteur sous stress, et conclure correctement.',
          en: 'Stay professional with a stressed caller, and close the call properly.',
        },
        modules: [
          { fr: 'Désamorcer l’agressivité', en: 'De-escalate hostility' },
          { fr: 'Savoir orienter vers un service dédié si besoin', en: 'Know when to escalate to a dedicated service' },
          { fr: 'Prise de congé claire', en: 'Clear call closing' },
        ],
        weight: 10,
        estimatedDuration: 3,
        mandatory: false,
      }),
      buildRegulatoryComponent(lang, 'collections', countryLabel),
    ],
  });
}

export function buildSurveyMethodology(lang: MethodologyLang, countryLabel?: string): TrainingMethodology {
  return withFramework(lang, {
    id: 'generic-survey',
    name: text(lang, { fr: 'Enquête de satisfaction / Sondage', en: 'Satisfaction survey / Polling' }),
    description: text(lang, {
      fr: 'Formation aux enquêtes et sondages : écoute client, questionnaires et restitution.',
      en: 'Survey and polling training: active listening, questionnaires and reporting.',
    }),
    industry: text(lang, { fr: 'Enquête / Sondage', en: 'Survey / Polling' }),
    components: [
      component(lang, {
        id: 'survey-frame',
        category: 'foundational',
        title: { fr: 'Cadrer l’objectif de l’enquête', en: 'Frame the survey objective' },
        description: {
          fr: 'Présenter l’enquête de façon neutre, sans orienter la réponse.',
          en: 'Present the survey neutrally, without steering the answer.',
        },
        modules: [
          { fr: 'Objectif et durée annoncés', en: 'Stated objective and duration' },
          { fr: 'Neutralité : ne jamais suggérer une réponse', en: 'Neutrality: never suggest an answer' },
          { fr: 'Confidentialité des réponses', en: 'Confidentiality of answers' },
        ],
        weight: 20,
        estimatedDuration: 3,
      }),
      component(lang, {
        id: 'survey-method',
        category: 'industry-specific',
        title: { fr: 'Méthode d’enquête et de sondage', en: 'Survey and polling method' },
        description: {
          fr: 'Suivre le questionnaire sans le déformer, et gérer les refus.',
          en: 'Follow the questionnaire without distorting it, and handle refusals.',
        },
        modules: [
          { fr: 'Lire la question telle qu’écrite', en: 'Read the question as written' },
          { fr: 'Gérer une non-réponse ou un refus', en: 'Handle a non-answer or a refusal' },
          { fr: 'Éviter les biais d’interprétation', en: 'Avoid interpretation bias' },
        ],
        weight: 20,
        estimatedDuration: 4,
      }),
      component(lang, {
        id: 'survey-listening',
        category: 'operational',
        title: { fr: 'Écoute active et reformulation', en: 'Active listening and reformulation' },
        description: {
          fr: 'Capter la réponse exacte du répondant, même si elle est nuancée.',
          en: 'Capture the respondent’s exact answer, even when nuanced.',
        },
        modules: [
          { fr: 'Reformuler sans déformer', en: 'Reformulate without distorting' },
          { fr: 'Noter les réponses ouvertes fidèlement', en: 'Log open answers faithfully' },
          { fr: 'Relancer sans insister', en: 'Probe without pushing' },
        ],
        weight: 20,
        estimatedDuration: 4,
      }),
      component(lang, {
        id: 'survey-admin',
        category: 'operational',
        title: { fr: 'Administration du questionnaire', en: 'Questionnaire administration' },
        description: {
          fr: 'Saisir et clôturer correctement chaque réponse dans l’outil.',
          en: 'Enter and close each answer correctly in the tool.',
        },
        modules: [
          { fr: 'Saisie correcte dans l’outil', en: 'Correct entry in the tool' },
          { fr: 'Gérer un questionnaire incomplet', en: 'Handle an incomplete questionnaire' },
          { fr: 'Remerciement et prise de congé', en: 'Thank-you and call closing' },
        ],
        weight: 15,
        estimatedDuration: 3,
      }),
      component(lang, {
        id: 'survey-posture',
        category: 'soft-skills',
        title: { fr: 'Posture neutre et professionnelle', en: 'Neutral, professional posture' },
        description: {
          fr: 'Garder un ton égal quelle que soit la réponse donnée.',
          en: 'Keep an even tone whatever answer is given.',
        },
        modules: [
          { fr: 'Ne jamais réagir à une critique', en: 'Never react to criticism' },
          { fr: 'Rester factuel face à une réponse négative', en: 'Stay factual facing a negative answer' },
        ],
        weight: 5,
        estimatedDuration: 2,
        mandatory: false,
      }),
      buildRegulatoryComponent(lang, 'survey', countryLabel),
    ],
  });
}

export function buildWelcomeCallMethodology(lang: MethodologyLang, countryLabel?: string): TrainingMethodology {
  return withFramework(lang, {
    id: 'generic-welcome-call',
    name: text(lang, { fr: 'Information / Welcome Call', en: 'Information / Welcome Call' }),
    description: text(lang, {
      fr: 'Formation aux appels d’accueil et d’information : onboarding client, clarté et relation.',
      en: 'Welcome and information call training: customer onboarding, clarity and relationship.',
    }),
    industry: text(lang, { fr: 'Information / Welcome Call', en: 'Information / Welcome Call' }),
    components: [
      component(lang, {
        id: 'welcome-frame',
        category: 'foundational',
        title: { fr: 'Accueil et premier contact', en: 'Greeting and first contact' },
        description: {
          fr: 'Donner une première impression claire, chaleureuse et utile.',
          en: 'Give a clear, warm and useful first impression.',
        },
        modules: [
          { fr: 'Présentation et objet de l’appel', en: 'Introduction and purpose of the call' },
          { fr: 'Ton chaleureux et rythme adapté', en: 'Warm tone and adapted pace' },
          { fr: 'Vérifier l’identité et le contexte client', en: 'Verify identity and customer context' },
        ],
        weight: 20,
        estimatedDuration: 3,
      }),
      component(lang, {
        id: 'welcome-onboarding',
        category: 'industry-specific',
        title: { fr: 'Onboarding et prise en main', en: 'Onboarding and getting started' },
        description: {
          fr: 'Donner au client les informations clés pour bien démarrer.',
          en: 'Give the customer the key information to get started well.',
        },
        modules: [
          { fr: 'Informations essentielles à transmettre', en: 'Essential information to convey' },
          { fr: 'Anticiper les questions fréquentes', en: 'Anticipate frequent questions' },
          { fr: 'Orienter vers les bonnes ressources', en: 'Point to the right resources' },
        ],
        weight: 25,
        estimatedDuration: 5,
      }),
      component(lang, {
        id: 'welcome-needs',
        category: 'operational',
        title: { fr: 'Clarification des besoins', en: 'Clarifying needs' },
        description: {
          fr: 'Identifier ce que le client cherche réellement avant de répondre.',
          en: 'Identify what the customer actually needs before answering.',
        },
        modules: [
          { fr: 'Questions de clarification', en: 'Clarifying questions' },
          { fr: 'Reformuler pour confirmer la compréhension', en: 'Reformulate to confirm understanding' },
          { fr: 'Distinguer information et demande d’action', en: 'Distinguish information from an action request' },
        ],
        weight: 20,
        estimatedDuration: 4,
      }),
      component(lang, {
        id: 'welcome-escalation',
        category: 'operational',
        title: { fr: 'Réponse claire ou orientation', en: 'Clear answer or hand-off' },
        description: {
          fr: 'Répondre directement quand c’est possible, orienter sinon.',
          en: 'Answer directly when possible, hand off otherwise.',
        },
        modules: [
          { fr: 'Répondre avec les ressources disponibles', en: 'Answer using available resources' },
          { fr: 'Savoir quand transférer ou escalader', en: 'Know when to transfer or escalate' },
          { fr: 'Confirmer la satisfaction avant de conclure', en: 'Confirm satisfaction before closing' },
        ],
        weight: 20,
        estimatedDuration: 4,
        prerequisites: ['welcome-needs'],
      }),
      component(lang, {
        id: 'welcome-posture',
        category: 'soft-skills',
        title: { fr: 'Relation et prise de congé', en: 'Relationship and call closing' },
        description: {
          fr: 'Laisser une impression positive et une porte ouverte.',
          en: 'Leave a positive impression and an open door.',
        },
        modules: [
          { fr: 'Ton rassurant en toute circonstance', en: 'Reassuring tone in every circumstance' },
          { fr: 'Prise de congé claire et chaleureuse', en: 'Clear, warm call closing' },
        ],
        weight: 5,
        estimatedDuration: 2,
        mandatory: false,
      }),
      buildRegulatoryComponent(lang, 'welcome', countryLabel),
    ],
  });
}

/**
 * Maps a Gig.category value (free text, suggested by the GIG-creation AI from
 * a fixed list — see v25_gigsmanualcreation_backend's aiService.ts
 * PREDEFINED_CATEGORIES) to the id of the generic methodology that best fits
 * it. Only categories with a clear, honest match are listed — anything else
 * (e.g. the various insurance/support categories with no generic methodology
 * yet) is left unmapped rather than forced onto the wrong training.
 */
const GIG_CATEGORY_TO_METHODOLOGY_ID: Record<string, string> = {
  'Outbound Sales': 'generic-prospecting',
  'Lead Generation': 'generic-prospecting',
  'Appointment Setting': 'generic-appointment-setting',
  'Inbound Sales': 'generic-inbound-sales',
  'Order Processing': 'generic-distance-selling',
  'Customer Retention': 'generic-retention',
  'Account Management': 'generic-b2b-services',
  Collections: 'generic-collections',
  'Survey Calls': 'generic-survey',
  'Market Research': 'generic-survey',
  'Welcome Calls': 'generic-welcome-call',
  'Follow-up Calls': 'generic-welcome-call',
};

export function matchMethodologyIdForGigCategory(gigCategory?: string | null): string | null {
  const key = String(gigCategory || '').trim();
  if (!key) return null;
  return GIG_CATEGORY_TO_METHODOLOGY_ID[key] || null;
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
