import type { TrainingMethodology } from '../types/methodology';
import {
  buildRegulatoryComponent,
  component,
  withFramework,
  type MethodologyLang,
} from './genericSalesMethodologies';

/** [French, English] */
type P = [string, string];

export type MethodologyGroup = 'generic' | 'insurance' | 'finance' | 'realEstate' | 'regulated';

export const METHODOLOGY_GROUP_ORDER: MethodologyGroup[] = [
  'generic',
  'insurance',
  'finance',
  'realEstate',
  'regulated',
];

interface TransactionSpec {
  id: string;
  group: MethodologyGroup;
  name: P;
  description: P;
  /** Module lists of the six common building blocks of a transaction. */
  product: P[];
  discovery: P[];
  proposal: P[];
  objections: P[];
  aftercare: P[];
  /**
   * Sector-specific compliance topics. Stated as principles only: the exact rules depend on the
   * country, the product and the channel and must be confirmed by the company's compliance/legal
   * team (the shared regulatory module below says so explicitly).
   */
  regulation?: P[];
  /** Regulated activities get a longer program and two extra certification levels. */
  regulated?: boolean;
}

const copy = (pair: P) => ({ fr: pair[0], en: pair[1] });

export const TRANSACTION_SPECS: TransactionSpec[] = [
  // ───────────────────────── Generic transaction types ─────────────────────────
  {
    id: 'generic-inbound-sales',
    group: 'generic',
    name: ['Vente entrante', 'Inbound sales'],
    description: [
      'Transformer les appels et demandes entrants en ventes, quel que soit le métier.',
      'Turn inbound calls and requests into sales, for any profession.',
    ],
    product: [
      ['Connaître l’offre, les tarifs et les conditions', 'Know the offer, prices and conditions'],
      ['Savoir retrouver vite une information produit', 'Find product information quickly'],
      ['Promotions en cours et règles d’application', 'Current promotions and how they apply'],
    ],
    discovery: [
      ['Accueil et identification du besoin', 'Welcome and identify the need'],
      ['Questions ouvertes puis fermées', 'Open then closed questions'],
      ['Qualifier l’urgence et le budget', 'Qualify urgency and budget'],
    ],
    proposal: [
      ['Recommander l’offre adaptée', 'Recommend the right offer'],
      ['Présenter prix et conditions sans ambiguïté', 'Present price and conditions clearly'],
      ['Prise de commande et récapitulatif', 'Take the order and recap it'],
    ],
    objections: [
      ['« C’est trop cher »', '"It is too expensive"'],
      ['« Je vais réfléchir »', '"I will think about it"'],
      ['Comparaison avec un concurrent', 'Comparison with a competitor'],
    ],
    aftercare: [
      ['Confirmer la commande et les délais', 'Confirm the order and lead times'],
      ['Saisie fiable dans le CRM', 'Reliable CRM entry'],
      ['Proposer le suivi', 'Offer follow-up'],
    ],
  },
  {
    id: 'generic-appointment-setting',
    group: 'generic',
    name: ['Prise de rendez-vous', 'Appointment setting'],
    description: [
      'Obtenir des rendez-vous qualifiés pour un commercial ou un expert, et limiter les absences.',
      'Book qualified appointments for a salesperson or an expert, and reduce no-shows.',
    ],
    product: [
      ['Valeur du rendez-vous pour le prospect', 'Value of the meeting for the prospect'],
      ['Qui rencontre le prospect et pour quoi faire', 'Who meets the prospect and why'],
      ['Disponibilités et règles d’agenda', 'Availability and calendar rules'],
    ],
    discovery: [
      ['Identifier le décideur et son enjeu', 'Identify the decision maker and their stake'],
      ['Critères d’un rendez-vous qualifié', 'Criteria of a qualified appointment'],
      ['Repérer le bon moment', 'Spot the right timing'],
    ],
    proposal: [
      ['Proposer deux créneaux précis', 'Offer two precise slots'],
      ['Confirmer coordonnées et format (visio, téléphone, sur place)', 'Confirm contact details and format (video, phone, on site)'],
      ['Envoyer l’invitation et le rappel', 'Send the invitation and the reminder'],
    ],
    objections: [
      ['« Envoyez-moi un email »', '"Just send me an email"'],
      ['« Je n’ai pas le temps »', '"I do not have time"'],
      ['« Pas intéressé pour l’instant »', '"Not interested right now"'],
    ],
    aftercare: [
      ['Rappel la veille pour réduire les absences', 'Reminder the day before to reduce no-shows'],
      ['Transmettre le contexte au commercial', 'Hand the context over to the salesperson'],
      ['Reporter ou annuler proprement', 'Reschedule or cancel cleanly'],
    ],
  },
  {
    id: 'generic-upsell',
    group: 'generic',
    name: ['Vente additionnelle et montée en gamme', 'Upsell and cross-sell'],
    description: [
      'Proposer l’option ou l’offre complémentaire qui sert vraiment le client existant.',
      'Offer the add-on or upgrade that genuinely serves the existing customer.',
    ],
    product: [
      ['Gamme, options et offres complémentaires', 'Range, options and complementary offers'],
      ['Compatibilité entre offres', 'Compatibility between offers'],
      ['Argumentaire de montée en gamme', 'Upgrade pitch'],
    ],
    discovery: [
      ['Comprendre l’usage actuel du client', 'Understand the customer’s current usage'],
      ['Détecter un besoin non couvert', 'Detect an uncovered need'],
      ['Choisir le bon moment dans l’appel', 'Pick the right moment in the call'],
    ],
    proposal: [
      ['Présenter le bénéfice avant le prix', 'Present the benefit before the price'],
      ['Comparer avant / après', 'Compare before / after'],
      ['Proposer un essai ou une option réversible', 'Offer a trial or a reversible option'],
    ],
    objections: [
      ['« J’ai déjà ce qu’il me faut »', '"I already have what I need"'],
      ['« C’est trop cher pour moi »', '"It is too expensive for me"'],
      ['« Je ne veux rien changer »', '"I do not want to change anything"'],
    ],
    aftercare: [
      ['Modifier le contrat sans erreur', 'Update the contract without errors'],
      ['Confirmer la nouvelle facturation', 'Confirm the new billing'],
      ['Mesurer la satisfaction après vente', 'Measure post-sale satisfaction'],
    ],
  },
  {
    id: 'generic-retention',
    group: 'generic',
    name: ['Fidélisation et rétention', 'Retention and anti-churn'],
    description: [
      'Comprendre pourquoi un client veut partir et proposer une solution honnête pour le garder.',
      'Understand why a customer wants to leave and offer an honest solution to keep them.',
    ],
    product: [
      ['Offres de rétention autorisées', 'Authorised retention offers'],
      ['Conditions de résiliation et préavis', 'Cancellation terms and notice'],
      ['Engagements et pénalités éventuelles', 'Commitments and possible penalties'],
    ],
    discovery: [
      ['Comprendre la vraie raison du départ', 'Understand the real reason for leaving'],
      ['Écouter sans se justifier', 'Listen without defending'],
      ['Identifier ce qui peut être résolu', 'Identify what can be fixed'],
    ],
    proposal: [
      ['Proposer une solution ciblée', 'Offer a targeted solution'],
      ['Geste commercial dans les limites autorisées', 'Commercial gesture within allowed limits'],
      ['Reformuler l’accord avant de conclure', 'Restate the agreement before closing'],
    ],
    objections: [
      ['Le client maintient sa demande de résiliation', 'The customer insists on cancelling'],
      ['Concurrent moins cher', 'Cheaper competitor'],
      ['Mauvaise expérience passée', 'Past bad experience'],
    ],
    aftercare: [
      ['Tracer le motif et l’issue', 'Record the reason and the outcome'],
      ['Traiter la résiliation si elle est maintenue', 'Process the cancellation if maintained'],
      ['Relance de satisfaction', 'Satisfaction follow-up'],
    ],
    regulation: [
      ['Respect du droit de résiliation et de ses modalités', 'Respect of the right to cancel and its procedure'],
      ['Aucune pression ni obstacle à une résiliation demandée', 'No pressure or obstacle to a requested cancellation'],
      ['Informations précontractuelles sur toute nouvelle offre proposée', 'Pre-contractual information on any new offer proposed'],
    ],
  },
  {
    id: 'generic-distance-selling',
    group: 'generic',
    name: ['Vente à distance et prise de commande', 'Distance selling and order taking'],
    description: [
      'Vendre au consommateur par téléphone ou en ligne : commande, paiement et livraison.',
      'Sell to consumers by phone or online: order, payment and delivery.',
    ],
    product: [
      ['Catalogue, stocks et délais', 'Catalogue, stock and lead times'],
      ['Prix, remises et frais de livraison', 'Prices, discounts and delivery fees'],
      ['Moyens de paiement sécurisés', 'Secure payment methods'],
    ],
    discovery: [
      ['Identifier le produit recherché', 'Identify the product wanted'],
      ['Vérifier l’usage et la compatibilité', 'Check usage and compatibility'],
      ['Adresse et mode de livraison', 'Address and delivery method'],
    ],
    proposal: [
      ['Récapituler la commande et le prix total', 'Recap the order and the total price'],
      ['Encaissement sécurisé', 'Secure payment collection'],
      ['Confirmation écrite de la commande', 'Written order confirmation'],
    ],
    objections: [
      ['Frais de livraison', 'Delivery fees'],
      ['Peur de payer par téléphone', 'Fear of paying by phone'],
      ['« Je préfère voir en magasin »', '"I prefer to see it in store"'],
    ],
    aftercare: [
      ['Suivi de livraison', 'Delivery tracking'],
      ['Retours et échanges', 'Returns and exchanges'],
      ['Gestion d’un litige de livraison', 'Handling a delivery dispute'],
    ],
    regulation: [
      ['Information précontractuelle et droit de rétractation de la vente à distance', 'Pre-contractual information and the right of withdrawal in distance selling'],
      ['Prix toutes taxes comprises et frais affichés avant la commande', 'Price including taxes and fees shown before the order'],
      ['Confirmation de la commande sur support durable', 'Order confirmation on a durable medium'],
    ],
  },

  // ───────────────────────────────── Insurance ─────────────────────────────────
  {
    id: 'insurance-auto',
    group: 'insurance',
    regulated: true,
    name: ['Assurance auto', 'Auto insurance'],
    description: [
      'Vendre et conseiller l’assurance automobile : garanties, tarification et obligations légales.',
      'Sell and advise on motor insurance: cover, pricing and legal obligations.',
    ],
    product: [
      ['Garanties : responsabilité civile, tous risques, vol, bris de glace', 'Cover: third-party liability, comprehensive, theft, glass'],
      ['Franchises, plafonds et exclusions', 'Excesses, limits and exclusions'],
      ['Bonus-malus et historique du conducteur', 'No-claims bonus and driver history'],
      ['Assistance et véhicule de remplacement', 'Assistance and replacement vehicle'],
    ],
    discovery: [
      ['Profil du conducteur et usage du véhicule', 'Driver profile and vehicle use'],
      ['Contrat en cours, sinistres et résiliation', 'Current contract, claims and cancellation'],
      ['Besoin réel face à l’obligation minimale', 'Real need versus the legal minimum'],
    ],
    proposal: [
      ['Devis comparatif lisible', 'Readable comparative quote'],
      ['Recommandation motivée par le besoin exprimé', 'Recommendation justified by the stated need'],
      ['Adhésion, pièces justificatives et date d’effet', 'Subscription, supporting documents and effective date'],
    ],
    objections: [
      ['« C’est moins cher en ligne »', '"It is cheaper online"'],
      ['« J’ai déjà un assureur »', '"I already have an insurer"'],
      ['« La franchise est trop élevée »', '"The excess is too high"'],
    ],
    aftercare: [
      ['Attestation d’assurance et documents', 'Insurance certificate and documents'],
      ['Déclaration de sinistre : le rôle du conseiller', 'Claim declaration: the adviser’s role'],
      ['Révision annuelle de la cotisation', 'Annual premium review'],
    ],
    regulation: [
      ['Obligation d’assurance de responsabilité civile du véhicule', 'Compulsory third-party motor liability cover'],
      ['Devoir de conseil et adéquation de la garantie au besoin', 'Duty of advice and suitability of the cover'],
      ['Document d’information produit et conditions générales remis avant signature', 'Product information document and terms handed over before signing'],
      ['Délai de renonciation et résiliation selon le pays et le canal', 'Withdrawal period and cancellation depending on country and channel'],
      ['Statut de l’intermédiaire (agent, courtier) et information sur sa rémunération', 'Intermediary status (agent, broker) and disclosure of remuneration'],
      ['Exactitude des déclarations et conséquences d’une fausse déclaration', 'Accuracy of declarations and consequences of a false declaration'],
    ],
  },
  {
    id: 'insurance-property',
    group: 'insurance',
    regulated: true,
    name: ['Assurance habitation et dommages', 'Home and property insurance'],
    description: [
      'Conseiller et souscrire l’assurance habitation et IARD : risques, capitaux et sinistres.',
      'Advise on and sell home and property insurance: risks, sums insured and claims.',
    ],
    product: [
      ['Multirisque habitation : incendie, dégâts des eaux, vol', 'Home multi-risk: fire, water damage, theft'],
      ['Responsabilité civile vie privée', 'Personal liability'],
      ['Biens assurés, valeur à neuf et plafonds', 'Insured items, new-for-old value and limits'],
      ['Locataire, propriétaire occupant, propriétaire non occupant', 'Tenant, owner-occupier, landlord'],
    ],
    discovery: [
      ['Logement : nature, surface, équipements', 'Home: type, size, equipment'],
      ['Valeur des biens à protéger', 'Value of the items to protect'],
      ['Contrats existants et sinistres passés', 'Existing contracts and past claims'],
    ],
    proposal: [
      ['Chiffrer le capital mobilier', 'Estimate the contents sum insured'],
      ['Garanties optionnelles réellement utiles', 'Optional cover that is really useful'],
      ['Devis et conditions de souscription', 'Quote and subscription conditions'],
    ],
    objections: [
      ['« Mon propriétaire me couvre déjà »', '"My landlord already covers me"'],
      ['« La prime est trop élevée »', '"The premium is too high"'],
      ['« Je n’ai jamais eu de sinistre »', '"I have never had a claim"'],
    ],
    aftercare: [
      ['Attestation pour le bailleur', 'Certificate for the landlord'],
      ['Déclaration de sinistre : délais à respecter', 'Claim declaration: deadlines to meet'],
      ['Mise à jour lors d’un déménagement', 'Update when moving'],
    ],
    regulation: [
      ['Assurance obligatoire du locataire selon le pays', 'Compulsory tenant insurance depending on the country'],
      ['Devoir de conseil et adéquation aux besoins', 'Duty of advice and suitability to needs'],
      ['Informations précontractuelles et fiche d’information produit', 'Pre-contractual information and product fact sheet'],
      ['Questionnaire de risque : exactitude des déclarations', 'Risk questionnaire: accuracy of declarations'],
      ['Délai de renonciation en vente à distance', 'Withdrawal period in distance selling'],
      ['Statut et rémunération de l’intermédiaire', 'Intermediary status and remuneration'],
    ],
  },
  {
    id: 'insurance-life',
    group: 'insurance',
    regulated: true,
    name: ['Assurance vie et épargne', 'Life insurance and savings'],
    description: [
      'Conseiller l’épargne et l’assurance vie : objectifs, risques, frais et transmission.',
      'Advise on savings and life insurance: goals, risks, fees and succession.',
    ],
    product: [
      ['Fonds en euros et unités de compte', 'Euro funds and unit-linked funds'],
      ['Fiscalité et transmission selon le pays', 'Taxation and succession depending on the country'],
      ['Frais de versement, de gestion et d’arbitrage', 'Entry, management and switching fees'],
      ['Clause bénéficiaire', 'Beneficiary clause'],
    ],
    discovery: [
      ['Situation familiale et patrimoniale', 'Family and asset situation'],
      ['Objectifs et horizon de placement', 'Goals and investment horizon'],
      ['Profil de risque et connaissance financière', 'Risk profile and financial knowledge'],
    ],
    proposal: [
      ['Allocation cohérente avec le profil', 'Allocation consistent with the profile'],
      ['Expliquer risques, frais et possibilité de perte en capital', 'Explain risks, fees and the possibility of capital loss'],
      ['Rédiger la clause bénéficiaire avec le client', 'Draft the beneficiary clause with the client'],
    ],
    objections: [
      ['« Je préfère mon livret »', '"I prefer my savings account"'],
      ['« J’ai peur de perdre du capital »', '"I am afraid of losing capital"'],
      ['« Les frais sont trop élevés »', '"The fees are too high"'],
    ],
    aftercare: [
      ['Information annuelle et arbitrages', 'Annual information and switches'],
      ['Rachat partiel : conséquences', 'Partial surrender: consequences'],
      ['Mise à jour de la clause bénéficiaire', 'Updating the beneficiary clause'],
    ],
    regulation: [
      ['Connaissance du client : objectifs, situation, profil de risque', 'Know-your-client: goals, situation, risk profile'],
      ['Obligation de conseil et adéquation du produit', 'Duty of advice and product suitability'],
      ['Information sur les risques, les frais et la perte en capital possible', 'Information on risks, fees and possible capital loss'],
      ['Délai de renonciation du contrat', 'Contract withdrawal period'],
      ['Lutte contre le blanchiment et le financement du terrorisme (origine des fonds)', 'Anti-money-laundering and counter-terrorist financing (source of funds)'],
      ['Aucune promesse de rendement garanti pour les unités de compte', 'No guaranteed-return promise on unit-linked funds'],
    ],
  },
  {
    id: 'insurance-protection',
    group: 'insurance',
    regulated: true,
    name: ['Prévoyance et assurance emprunteur', 'Protection and borrower insurance'],
    description: [
      'Conseiller la protection des revenus et des proches, et l’assurance d’un prêt.',
      'Advise on income and family protection, and on loan insurance.',
    ],
    product: [
      ['Décès, invalidité, incapacité de travail', 'Death, disability, incapacity to work'],
      ['Garanties emprunteur et quotité', 'Borrower cover and share insured'],
      ['Changement d’assurance de prêt selon le pays', 'Changing loan insurance depending on the country'],
      ['Exclusions, délais de carence et questionnaire de santé', 'Exclusions, waiting periods and health questionnaire'],
    ],
    discovery: [
      ['Charges familiales et revenus à protéger', 'Family expenses and income to protect'],
      ['Prêt en cours ou à venir', 'Existing or upcoming loan'],
      ['Situation professionnelle et santé déclarée', 'Professional situation and declared health'],
    ],
    proposal: [
      ['Calculer le besoin de couverture', 'Calculate the cover needed'],
      ['Comparer avec l’offre de la banque', 'Compare with the bank’s offer'],
      ['Questionnaire de santé et pièces', 'Health questionnaire and documents'],
    ],
    objections: [
      ['« La banque propose déjà son assurance »', '"The bank already offers its insurance"'],
      ['« Je suis en bonne santé »', '"I am in good health"'],
      ['« Le coût est trop élevé »', '"The cost is too high"'],
    ],
    aftercare: [
      ['Suivi du dossier médical', 'Medical file follow-up'],
      ['Information en cas de changement de situation', 'Information when circumstances change'],
      ['Accompagnement en cas de sinistre', 'Support in case of a claim'],
    ],
    regulation: [
      ['Questionnaire de santé : sincérité des réponses et confidentialité', 'Health questionnaire: honest answers and confidentiality'],
      ['Données de santé : base légale et sécurité renforcée', 'Health data: legal basis and enhanced security'],
      ['Conditions de substitution de l’assurance emprunteur selon le pays', 'Conditions for replacing borrower insurance depending on the country'],
      ['Non-discrimination dans la tarification', 'Non-discrimination in pricing'],
      ['Devoir de conseil et d’information', 'Duty of advice and information'],
      ['Délai de renonciation', 'Withdrawal period'],
    ],
  },
  {
    id: 'insurance-professional',
    group: 'insurance',
    regulated: true,
    name: ['Assurance professionnelle', 'Business insurance'],
    description: [
      'Assurer les entreprises et les indépendants : responsabilité civile, multirisque, cyber, flotte.',
      'Insure businesses and freelancers: liability, multi-risk, cyber, fleet.',
    ],
    product: [
      ['Responsabilité civile professionnelle', 'Professional liability'],
      ['Multirisque pro, cyber, flotte, protection juridique', 'Business multi-risk, cyber, fleet, legal protection'],
      ['Assurances obligatoires selon le métier', 'Compulsory insurance by profession'],
      ['Perte d’exploitation', 'Business interruption'],
    ],
    discovery: [
      ['Activité, chiffre d’affaires, effectifs', 'Activity, turnover, headcount'],
      ['Risques propres au métier', 'Risks specific to the trade'],
      ['Contrats et sinistres en cours', 'Current contracts and claims'],
    ],
    proposal: [
      ['Dimensionner garanties et plafonds', 'Size cover and limits'],
      ['Options sectorielles pertinentes', 'Relevant sector options'],
      ['Devis et pièces (immatriculation, attestations)', 'Quote and documents (registration, certificates)'],
    ],
    objections: [
      ['« Je suis déjà assuré »', '"I am already insured"'],
      ['« Mon budget est serré »', '"My budget is tight"'],
      ['« Mon activité est peu risquée »', '"My activity is low risk"'],
    ],
    aftercare: [
      ['Attestations pour les clients du professionnel', 'Certificates for the professional’s clients'],
      ['Mise à jour du chiffre d’affaires', 'Turnover update'],
      ['Déclaration de sinistre', 'Claim declaration'],
    ],
    regulation: [
      ['Assurances obligatoires selon la profession et le pays', 'Compulsory insurance depending on profession and country'],
      ['Devoir de conseil adapté à une clientèle professionnelle', 'Duty of advice adapted to business customers'],
      ['Exactitude des déclarations d’activité', 'Accuracy of activity declarations'],
      ['Information précontractuelle et conditions générales', 'Pre-contractual information and terms'],
      ['Statut et rémunération de l’intermédiaire', 'Intermediary status and remuneration'],
      ['Protection des données des clients du professionnel', 'Protection of the professional’s customer data'],
    ],
  },

  // ─────────────────────────────────── Finance ───────────────────────────────────
  {
    id: 'finance-consumer-credit',
    group: 'finance',
    regulated: true,
    name: ['Crédit à la consommation', 'Consumer credit'],
    description: [
      'Présenter et conclure un crédit à la consommation en toute transparence.',
      'Present and conclude consumer credit transparently.',
    ],
    product: [
      ['Crédit amortissable, renouvelable, location avec option d’achat', 'Instalment loan, revolving credit, hire-purchase'],
      ['Taux, TAEG, durée et coût total', 'Rate, APR, term and total cost'],
      ['Assurance facultative et garanties', 'Optional insurance and guarantees'],
      ['Rachat et regroupement de crédits', 'Credit buy-back and consolidation'],
    ],
    discovery: [
      ['Projet financé et besoin réel', 'Financed project and real need'],
      ['Revenus, charges et endettement', 'Income, expenses and debt level'],
      ['Crédits en cours', 'Existing credits'],
    ],
    proposal: [
      ['Simulation claire : mensualité et coût total', 'Clear simulation: instalment and total cost'],
      ['Offre précontractuelle remise au client', 'Pre-contractual offer handed to the customer'],
      ['Pièces justificatives et signature', 'Supporting documents and signature'],
    ],
    objections: [
      ['« Le taux est trop élevé »', '"The rate is too high"'],
      ['« J’ai peur de m’endetter »', '"I am afraid of getting into debt"'],
      ['« Je vais comparer »', '"I will compare"'],
    ],
    aftercare: [
      ['Délai de rétractation et déblocage des fonds', 'Withdrawal period and release of funds'],
      ['Suivi des échéances', 'Instalment follow-up'],
      ['Difficultés de paiement : orienter le client', 'Payment difficulties: guide the customer'],
    ],
    regulation: [
      ['Information précontractuelle standardisée et TAEG', 'Standardised pre-contractual information and APR'],
      ['Évaluation de la solvabilité et fichiers autorisés', 'Creditworthiness assessment and authorised registers'],
      ['Mise en garde contre le surendettement', 'Warning about over-indebtedness'],
      ['Délai de rétractation', 'Right of withdrawal'],
      ['Interdiction des pratiques agressives et des ventes liées abusives', 'No aggressive practices or abusive tied sales'],
      ['Statut d’intermédiaire en crédit et information sur la rémunération', 'Credit intermediary status and disclosure of remuneration'],
    ],
  },
  {
    id: 'finance-mortgage',
    group: 'finance',
    regulated: true,
    name: ['Crédit immobilier et courtage', 'Mortgage and brokerage'],
    description: [
      'Accompagner un financement immobilier : capacité d’emprunt, dossier et négociation.',
      'Support a property financing: borrowing capacity, file and negotiation.',
    ],
    product: [
      ['Taux fixe ou variable, durée et apport', 'Fixed or variable rate, term and deposit'],
      ['Assurance emprunteur et garanties (hypothèque, caution)', 'Borrower insurance and security (mortgage, guarantor)'],
      ['Frais : dossier, garantie, courtage', 'Fees: arrangement, security, brokerage'],
      ['Prêts aidés selon le pays', 'Subsidised loans depending on the country'],
    ],
    discovery: [
      ['Projet immobilier et calendrier', 'Property project and timeline'],
      ['Capacité d’emprunt et apport', 'Borrowing capacity and deposit'],
      ['Situation professionnelle et patrimoniale', 'Professional and asset situation'],
    ],
    proposal: [
      ['Simulation et plan de financement', 'Simulation and financing plan'],
      ['Constitution du dossier', 'Building the file'],
      ['Négociation avec les établissements', 'Negotiation with lenders'],
    ],
    objections: [
      ['« Ma banque me propose mieux »', '"My bank offers me better"'],
      ['« Vos frais de courtage sont trop élevés »', '"Your brokerage fees are too high"'],
      ['« J’ai peur d’un refus »', '"I am afraid of a refusal"'],
    ],
    aftercare: [
      ['Suivi jusqu’à l’offre de prêt', 'Follow-up until the loan offer'],
      ['Délai de réflexion', 'Reflection period'],
      ['Renégociation ou rachat futur', 'Future renegotiation or buy-back'],
    ],
    regulation: [
      ['Information précontractuelle standardisée', 'Standardised pre-contractual information'],
      ['Évaluation de la solvabilité de l’emprunteur', 'Assessment of the borrower’s creditworthiness'],
      ['Délai de réflexion avant acceptation selon le pays', 'Reflection period before acceptance depending on the country'],
      ['Statut de l’intermédiaire de crédit et rémunération', 'Credit intermediary status and remuneration'],
      ['Conseil adapté et mise en garde', 'Suitable advice and warning'],
      ['Connaissance du client et lutte contre le blanchiment', 'Know-your-client and anti-money-laundering'],
    ],
  },
  {
    id: 'finance-investment',
    group: 'finance',
    regulated: true,
    name: ['Épargne et conseil en investissement', 'Savings and investment advice'],
    description: [
      'Conseiller des placements adaptés au profil, à l’horizon et à la tolérance au risque.',
      'Advise on investments suited to profile, horizon and risk tolerance.',
    ],
    product: [
      ['Livrets, assurance vie, comptes-titres, retraite', 'Savings accounts, life insurance, securities accounts, pensions'],
      ['Risque, horizon, liquidité et fiscalité', 'Risk, horizon, liquidity and taxation'],
      ['Frais d’entrée et frais courants', 'Entry and ongoing charges'],
      ['Produits complexes : points de vigilance', 'Complex products: points of caution'],
    ],
    discovery: [
      ['Objectifs, horizon et besoins de liquidité', 'Goals, horizon and liquidity needs'],
      ['Connaissances et expérience financières', 'Financial knowledge and experience'],
      ['Capacité à supporter des pertes', 'Ability to bear losses'],
    ],
    proposal: [
      ['Allocation adaptée au profil', 'Allocation suited to the profile'],
      ['Documents d’informations clés remis', 'Key information documents handed over'],
      ['Rapport d’adéquation', 'Suitability report'],
    ],
    objections: [
      ['« Je ne fais pas confiance aux marchés »', '"I do not trust the markets"'],
      ['« Les frais sont trop élevés »', '"The fees are too high"'],
      ['« Je préfère l’immobilier »', '"I prefer real estate"'],
    ],
    aftercare: [
      ['Revue périodique du profil', 'Periodic profile review'],
      ['Rapports et informations aux clients', 'Reports and client information'],
      ['Traitement des réclamations', 'Complaint handling'],
    ],
    regulation: [
      ['Classification du client et évaluation du caractère adéquat ou approprié', 'Client classification and suitability or appropriateness assessment'],
      ['Document d’informations clés et information sur les risques', 'Key information document and risk disclosure'],
      ['Aucune promesse de rendement et aucun frais dissimulé', 'No promise of returns and no hidden fees'],
      ['Conflits d’intérêts et rémunération', 'Conflicts of interest and remuneration'],
      ['Enregistrement des échanges et conservation selon la réglementation', 'Recording of communications and retention under the regulation'],
      ['Connaissance du client et lutte contre le blanchiment', 'Know-your-client and anti-money-laundering'],
    ],
  },
  {
    id: 'finance-banking',
    group: 'finance',
    regulated: true,
    name: ['Banque et moyens de paiement', 'Banking and payments'],
    description: [
      'Présenter comptes, cartes et services bancaires et ouvrir une relation en conformité.',
      'Present accounts, cards and banking services and open a relationship compliantly.',
    ],
    product: [
      ['Comptes, cartes, découvert, virements', 'Accounts, cards, overdraft, transfers'],
      ['Packages et tarification', 'Packages and pricing'],
      ['Banque en ligne et sécurité', 'Online banking and security'],
      ['Offres jeunes, particuliers et professionnels', 'Offers for young people, individuals and professionals'],
    ],
    discovery: [
      ['Usages bancaires et besoins', 'Banking usage and needs'],
      ['Établissement actuel et mobilité bancaire', 'Current bank and account switching'],
      ['Profil et éligibilité', 'Profile and eligibility'],
    ],
    proposal: [
      ['Recommander le compte et les services utiles', 'Recommend the right account and services'],
      ['Frais présentés en toute transparence', 'Fees presented transparently'],
      ['Ouverture de compte et pièces', 'Account opening and documents'],
    ],
    objections: [
      ['« Je ne veux pas changer de banque »', '"I do not want to change bank"'],
      ['« Les frais sont trop élevés »', '"The fees are too high"'],
      ['« Je me méfie de la banque en ligne »', '"I distrust online banking"'],
    ],
    aftercare: [
      ['Activation et première utilisation', 'Activation and first use'],
      ['Mobilité bancaire : démarches', 'Account switching: steps'],
      ['Prévention de la fraude', 'Fraud prevention'],
    ],
    regulation: [
      ['Identification et vérification du client (KYC)', 'Customer identification and verification (KYC)'],
      ['Lutte contre le blanchiment et le financement du terrorisme', 'Anti-money-laundering and counter-terrorist financing'],
      ['Transparence tarifaire et information sur les frais', 'Fee transparency and information'],
      ['Authentification forte et prévention de la fraude', 'Strong authentication and fraud prevention'],
      ['Droit au compte et mobilité bancaire selon le pays', 'Right to an account and switching depending on the country'],
      ['Protection des données bancaires', 'Protection of banking data'],
    ],
  },

  // ─────────────────────────────────── Real estate ───────────────────────────────────
  {
    id: 'realestate-sales',
    group: 'realEstate',
    regulated: true,
    name: ['Transaction immobilière', 'Real estate sales'],
    description: [
      'Accompagner vendeurs et acquéreurs : estimation, mandat, visites, offre et signature.',
      'Support sellers and buyers: valuation, mandate, viewings, offer and signing.',
    ],
    product: [
      ['Marché local et prix au mètre carré', 'Local market and price per square metre'],
      ['Étapes d’une vente : mandat, compromis, acte', 'Steps of a sale: mandate, preliminary contract, deed'],
      ['Diagnostics obligatoires', 'Mandatory surveys and certificates'],
      ['Frais de notaire et honoraires', 'Notary fees and agency fees'],
    ],
    discovery: [
      ['Projet du vendeur ou de l’acquéreur', 'Seller’s or buyer’s project'],
      ['Calendrier, budget et financement', 'Timeline, budget and financing'],
      ['Critères et contraintes du bien', 'Property criteria and constraints'],
    ],
    proposal: [
      ['Estimation argumentée', 'Reasoned valuation'],
      ['Mandat : types et durée', 'Mandate: types and duration'],
      ['Visites, offre et négociation', 'Viewings, offer and negotiation'],
    ],
    objections: [
      ['« Je vends seul »', '"I will sell on my own"'],
      ['« Vos honoraires sont trop élevés »', '"Your fees are too high"'],
      ['« L’estimation est trop basse »', '"The valuation is too low"'],
    ],
    aftercare: [
      ['Suivi jusqu’à la signature', 'Follow-up until signing'],
      ['Coordination notaire, banque, diagnostiqueur', 'Coordination with notary, bank and surveyor'],
      ['Avis client', 'Customer review'],
    ],
    regulation: [
      ['Exercice encadré de la profession (habilitation, garantie financière) selon le pays', 'Regulated practice of the profession (licence, financial guarantee) depending on the country'],
      ['Mandat écrit, mentions obligatoires et honoraires affichés', 'Written mandate, mandatory mentions and displayed fees'],
      ['Diagnostics et information de l’acquéreur', 'Surveys and information given to the buyer'],
      ['Délai de rétractation ou de réflexion de l’acquéreur selon le pays', 'Buyer’s withdrawal or cooling-off period depending on the country'],
      ['Lutte contre le blanchiment : identification de l’acquéreur et du vendeur', 'Anti-money-laundering: identifying buyer and seller'],
      ['Non-discrimination dans l’accès au logement', 'Non-discrimination in access to housing'],
    ],
  },
  {
    id: 'realestate-rental',
    group: 'realEstate',
    regulated: true,
    name: ['Location et gestion locative', 'Rental and property management'],
    description: [
      'Louer et gérer un bien : sélection du locataire, bail, état des lieux et suivi.',
      'Let and manage a property: tenant selection, lease, inventory and follow-up.',
    ],
    product: [
      ['Bail, loyer, charges et dépôt de garantie', 'Lease, rent, charges and deposit'],
      ['Encadrement des loyers selon le pays', 'Rent regulation depending on the country'],
      ['Mission du gestionnaire', 'The manager’s mission'],
      ['Garantie des loyers impayés', 'Rent default guarantee'],
    ],
    discovery: [
      ['Besoin du propriétaire ou du locataire', 'Owner’s or tenant’s need'],
      ['Dossier et solvabilité du locataire', 'Tenant file and solvency'],
      ['État du logement et diagnostics', 'Condition of the property and surveys'],
    ],
    proposal: [
      ['Fixer le loyer et la stratégie de mise en location', 'Set the rent and the letting strategy'],
      ['Sélection du locataire', 'Tenant selection'],
      ['Offre de gestion et honoraires', 'Management offer and fees'],
    ],
    objections: [
      ['« Je gère moi-même »', '"I manage it myself"'],
      ['« Les frais de gestion sont trop élevés »', '"The management fees are too high"'],
      ['« J’ai peur des impayés »', '"I am afraid of unpaid rent"'],
    ],
    aftercare: [
      ['État des lieux', 'Inventory check'],
      ['Quittancement et régularisation des charges', 'Rent receipts and service charge reconciliation'],
      ['Travaux et litiges', 'Works and disputes'],
    ],
    regulation: [
      ['Cadre légal du bail selon le pays', 'Legal framework of the lease depending on the country'],
      ['Encadrement des loyers et des honoraires de location', 'Rent and letting fee caps'],
      ['Pièces qu’il est interdit de demander à un candidat locataire', 'Documents that must not be requested from a tenant applicant'],
      ['Non-discrimination dans la sélection des candidats', 'Non-discrimination in applicant selection'],
      ['Mandat de gestion et séparation des fonds du mandant', 'Management mandate and segregation of the principal’s funds'],
      ['Diagnostics et obligations de décence du logement', 'Surveys and housing decency obligations'],
    ],
  },
  {
    id: 'realestate-investment',
    group: 'realEstate',
    regulated: true,
    name: ['Investissement locatif et programmes neufs', 'Rental investment and new-build programmes'],
    description: [
      'Présenter un investissement immobilier avec ses hypothèses, ses risques et son financement.',
      'Present a property investment with its assumptions, risks and financing.',
    ],
    product: [
      ['Rentabilité brute, nette et cash-flow', 'Gross and net yield, cash flow'],
      ['Dispositifs fiscaux selon le pays', 'Tax schemes depending on the country'],
      ['Programmes neufs : réservation, vente sur plan, garanties', 'New-build programmes: reservation, off-plan sale, guarantees'],
      ['Risques : vacance, marché, travaux', 'Risks: vacancy, market, works'],
    ],
    discovery: [
      ['Capacité d’investissement et fiscalité', 'Investment capacity and taxation'],
      ['Objectif : revenu, patrimoine ou fiscalité', 'Goal: income, wealth or tax'],
      ['Expérience d’investisseur', 'Investor experience'],
    ],
    proposal: [
      ['Simulation d’investissement chiffrée', 'Quantified investment simulation'],
      ['Présenter les risques et les hypothèses', 'Present the risks and assumptions'],
      ['Réservation et financement', 'Reservation and financing'],
    ],
    objections: [
      ['« J’ai peur de la vacance locative »', '"I am afraid of vacancy"'],
      ['« Le rendement est trop faible »', '"The yield is too low"'],
      ['« Je préfère un placement financier »', '"I prefer a financial investment"'],
    ],
    aftercare: [
      ['Suivi jusqu’à la livraison', 'Follow-up until delivery'],
      ['Mise en location', 'Letting the property'],
      ['Revue patrimoniale', 'Wealth review'],
    ],
    regulation: [
      ['Information loyale et complète sur les risques', 'Fair and complete information on risks'],
      ['Aucune promesse de rentabilité garantie', 'No guaranteed-profitability promise'],
      ['Connaissance du client et conseil adapté', 'Know-your-client and suitable advice'],
      ['Encadrement des dispositifs de défiscalisation selon le pays', 'Rules on tax-incentive schemes depending on the country'],
      ['Délais de réservation et de rétractation', 'Reservation and withdrawal periods'],
      ['Identification du client et lutte contre le blanchiment', 'Customer identification and anti-money-laundering'],
    ],
  },

  // ─────────────────────────── Other regulated activities ───────────────────────────
  {
    id: 'regulated-energy',
    group: 'regulated',
    regulated: true,
    name: ['Énergie et rénovation énergétique', 'Energy and energy renovation'],
    description: [
      'Vendre une offre d’énergie ou des travaux de rénovation en respectant le cadre du démarchage.',
      'Sell an energy offer or renovation works within the rules on solicitation.',
    ],
    product: [
      ['Offres : prix fixe, indexé, énergie verte', 'Offers: fixed price, indexed, green energy'],
      ['Compteur, puissance et abonnement', 'Meter, capacity and subscription'],
      ['Rénovation : isolation, pompe à chaleur, aides', 'Renovation: insulation, heat pump, subsidies'],
      ['Mix énergétique', 'Energy mix'],
    ],
    discovery: [
      ['Consommation et factures actuelles', 'Current consumption and bills'],
      ['Logement et équipements', 'Home and equipment'],
      ['Éligibilité aux aides', 'Eligibility for subsidies'],
    ],
    proposal: [
      ['Comparer avec la facture actuelle', 'Compare with the current bill'],
      ['Expliquer le changement de fournisseur', 'Explain the change of supplier'],
      ['Devis de rénovation et aides', 'Renovation quote and subsidies'],
    ],
    objections: [
      ['« J’ai peur d’une coupure lors du changement »', '"I am afraid of a cut-off during the switch"'],
      ['« Je suis déjà en prix fixe »', '"I am already on a fixed price"'],
      ['« Je me méfie du démarchage »', '"I distrust cold calling"'],
    ],
    aftercare: [
      ['Suivi de la mise en service', 'Follow-up of the activation'],
      ['Première facture', 'First bill'],
      ['Réclamation et médiation', 'Complaint and mediation'],
    ],
    regulation: [
      ['Consentement explicite au changement de fournisseur', 'Explicit consent to switch supplier'],
      ['Interdiction du démarchage trompeur (fausse qualité d’agent d’un fournisseur ou d’un organisme public)', 'No misleading solicitation (posing as a supplier’s or public body’s agent)'],
      ['Information sur les prix et la durée d’engagement', 'Information on prices and commitment period'],
      ['Délai de rétractation', 'Right of withdrawal'],
      ['Encadrement du démarchage pour travaux et aides publiques selon le pays', 'Rules on solicitation for works and public subsidies depending on the country'],
      ['Médiation et traitement des réclamations', 'Mediation and complaint handling'],
    ],
  },
  {
    id: 'regulated-telecom',
    group: 'regulated',
    regulated: true,
    name: ['Télécoms et offres numériques', 'Telecoms and digital offers'],
    description: [
      'Vendre mobile, internet et services numériques avec une information de prix et d’engagement claire.',
      'Sell mobile, internet and digital services with clear price and commitment information.',
    ],
    product: [
      ['Mobile, fibre, box et options', 'Mobile, fibre, box and options'],
      ['Débit, couverture et engagement', 'Speed, coverage and commitment'],
      ['Terminaux et paiement échelonné', 'Devices and instalment payment'],
      ['Portabilité du numéro', 'Number portability'],
    ],
    discovery: [
      ['Usages et nombre de lignes', 'Usage and number of lines'],
      ['Équipements actuels', 'Current equipment'],
      ['Contrat en cours : engagement et frais de sortie', 'Current contract: commitment and exit fees'],
    ],
    proposal: [
      ['Offre adaptée et prix total sur la durée', 'Suitable offer and total price over the term'],
      ['Calendrier de raccordement', 'Connection schedule'],
      ['Souscription et contrat', 'Subscription and contract'],
    ],
    objections: [
      ['« Je suis engagé chez mon opérateur »', '"I am tied to my operator"'],
      ['« La couverture est mauvaise chez moi »', '"Coverage is poor where I live"'],
      ['« Le prix promotionnel est limité »', '"The promotional price is limited"'],
    ],
    aftercare: [
      ['Suivi de l’activation', 'Activation follow-up'],
      ['Portabilité du numéro', 'Number portability'],
      ['Service après-vente', 'After-sales service'],
    ],
    regulation: [
      ['Information précontractuelle claire : prix, durée, débit', 'Clear pre-contractual information: price, term, speed'],
      ['Portabilité et résiliation facilitée selon le pays', 'Portability and easier cancellation depending on the country'],
      ['Durée d’engagement et frais de sortie', 'Commitment period and exit fees'],
      ['Consentement pour les options payantes', 'Consent for paid options'],
      ['Démarchage : listes d’opposition et horaires', 'Solicitation: opt-out registries and calling hours'],
      ['Protection des mineurs et des personnes vulnérables', 'Protection of minors and vulnerable people'],
    ],
  },
  {
    id: 'regulated-healthcare',
    group: 'regulated',
    regulated: true,
    name: ['Services de santé', 'Healthcare services'],
    description: [
      'Gérer prises de rendez-vous et parcours administratifs de santé sans jamais sortir de son rôle.',
      'Handle appointments and administrative health journeys without ever stepping outside the role.',
    ],
    product: [
      ['Parcours de soins et organisation', 'Care pathway and organisation'],
      ['Prise de rendez-vous médicaux', 'Booking medical appointments'],
      ['Mutuelles et remboursements', 'Health insurers and reimbursements'],
      ['Vocabulaire de base', 'Basic vocabulary'],
    ],
    discovery: [
      ['Besoin du patient, sans avis médical', 'Patient’s need, without medical advice'],
      ['Urgence : orienter vers les services compétents', 'Emergency: direct to the proper services'],
      ['Disponibilités et préférences', 'Availability and preferences'],
    ],
    proposal: [
      ['Proposer un créneau adapté', 'Offer a suitable slot'],
      ['Informations pratiques et pièces à apporter', 'Practical information and documents to bring'],
      ['Confirmer et rappeler', 'Confirm and remind'],
    ],
    objections: [
      ['« J’ai peur d’attendre trop longtemps »', '"I am afraid of waiting too long"'],
      ['« Le reste à charge est trop élevé »', '"The out-of-pocket cost is too high"'],
      ['« Je veux un praticien précis »', '"I want a specific practitioner"'],
    ],
    aftercare: [
      ['Rappel du rendez-vous', 'Appointment reminder'],
      ['Suivi administratif', 'Administrative follow-up'],
      ['Satisfaction', 'Satisfaction'],
    ],
    regulation: [
      ['Aucun avis ni conseil médical : rester dans le rôle administratif', 'No medical opinion or advice: stay in the administrative role'],
      ['Données de santé : base légale, minimisation et sécurité renforcée', 'Health data: legal basis, minimisation and enhanced security'],
      ['Secret professionnel et confidentialité', 'Professional secrecy and confidentiality'],
      ['Orientation vers les urgences en cas de signal de gravité', 'Referral to emergency services on any sign of seriousness'],
      ['Consentement pour l’enregistrement et la conservation', 'Consent for recording and retention'],
      ['Accessibilité et non-discrimination', 'Accessibility and non-discrimination'],
    ],
  },
];

const mods = (items: P[]) => items.map(copy);

export function transactionSpecById(id: string): TransactionSpec | undefined {
  return TRANSACTION_SPECS.find((spec) => spec.id === id);
}

/** Builds the full methodology (same shape as the hand-written ones) for a transaction type. */
export function buildTransactionMethodology(
  lang: MethodologyLang,
  spec: TransactionSpec,
  countryLabel?: string
): TrainingMethodology {
  const scale = spec.regulated ? 1.5 : 1;
  const hours = (h: number) => Math.round(h * scale);
  const prefix = spec.id;
  const sectorRegulatory = spec.regulation
    ? [
        component(lang, {
          id: `${prefix}-sector-rules`,
          category: 'regulatory',
          title: { fr: 'Règles propres à l’activité', en: 'Rules specific to the activity' },
          description: {
            fr: 'Principes de conformité de cette activité. Les règles exactes dépendent du pays, du produit et du canal : à valider avec le service conformité ou juridique.',
            en: 'Compliance principles for this activity. The exact rules depend on the country, the product and the channel: to be validated with compliance or legal.',
          },
          modules: mods(spec.regulation),
          weight: 12,
          estimatedDuration: hours(6),
          competencyLevel: spec.regulated ? 'proficient' : 'working',
        }),
      ]
    : [];

  const base = withFramework(lang, {
    id: spec.id,
    name: copy(spec.name)[lang],
    description: copy(spec.description)[lang],
    industry: copy(spec.name)[lang],
    components: [
      component(lang, {
        id: `${prefix}-product`,
        category: 'industry-specific',
        title: { fr: 'Maîtriser l’offre', en: 'Master the offer' },
        description: {
          fr: 'Connaître ce que l’on vend, ses limites et ses conditions.',
          en: 'Know what you sell, its limits and its conditions.',
        },
        modules: mods(spec.product),
        weight: 20,
        estimatedDuration: hours(5),
      }),
      component(lang, {
        id: `${prefix}-discovery`,
        category: 'foundational',
        title: { fr: 'Comprendre le besoin', en: 'Understand the need' },
        description: {
          fr: 'Poser les bonnes questions avant de recommander.',
          en: 'Ask the right questions before recommending.',
        },
        modules: mods(spec.discovery),
        weight: 18,
        estimatedDuration: hours(4),
      }),
      component(lang, {
        id: `${prefix}-proposal`,
        category: 'operational',
        title: { fr: 'Proposer et conclure', en: 'Propose and close' },
        description: {
          fr: 'Présenter la recommandation, chiffrer, puis conclure la transaction.',
          en: 'Present the recommendation, quantify it, then close the transaction.',
        },
        modules: mods(spec.proposal),
        weight: 18,
        estimatedDuration: hours(4),
        prerequisites: [`${prefix}-discovery`],
      }),
      component(lang, {
        id: `${prefix}-objections`,
        category: 'soft-skills',
        title: { fr: 'Traiter les objections', en: 'Handle objections' },
        description: {
          fr: 'Répondre aux freins fréquents sans forcer la décision.',
          en: 'Answer frequent hesitations without forcing the decision.',
        },
        modules: mods(spec.objections),
        weight: 14,
        estimatedDuration: hours(3),
      }),
      component(lang, {
        id: `${prefix}-aftercare`,
        category: 'operational',
        title: { fr: 'Suivi après la transaction', en: 'After the transaction' },
        description: {
          fr: 'Sécuriser la transaction, tracer l’échange et préparer la suite.',
          en: 'Secure the transaction, record the exchange and prepare what follows.',
        },
        modules: mods(spec.aftercare),
        weight: 8,
        estimatedDuration: hours(2),
        mandatory: false,
      }),
      ...sectorRegulatory,
      buildRegulatoryComponent(lang, prefix, countryLabel),
    ],
  });

  if (!spec.regulated) return base;

  const requiredAll = base.components.filter((c) => c.mandatoryForCertification).map((c) => c.id);
  const regulatoryIds = base.components.filter((c) => c.category === 'regulatory').map((c) => c.id);
  return {
    ...base,
    certificationPath: {
      ...base.certificationPath,
      levels: [
        ...base.certificationPath.levels,
        {
          id: `${spec.id}-compliant`,
          name: lang === 'fr' ? 'Conformité validée' : 'Compliance validated',
          description:
            lang === 'fr'
              ? 'Maîtrise des règles de l’activité et des mentions obligatoires.'
              : 'Mastery of the activity’s rules and mandatory disclosures.',
          requiredComponents: regulatoryIds,
          minimumScore: 85,
          practicalRequirements: [
            lang === 'fr'
              ? 'Mener un appel simulé sans manquement aux obligations d’information.'
              : 'Run a simulated call with no breach of the information obligations.',
          ],
          timeframe: lang === 'fr' ? '45 jours' : '45 days',
          badge: `${spec.id}-compliant-badge`,
        },
        {
          id: `${spec.id}-expert`,
          name: lang === 'fr' ? 'Expert' : 'Expert',
          description:
            lang === 'fr'
              ? 'Conduit des cas complexes et accompagne les nouveaux REPS.'
              : 'Handles complex cases and coaches new REPS.',
          requiredComponents: requiredAll,
          minimumScore: 90,
          practicalRequirements: [
            lang === 'fr'
              ? 'Réussir un cas complexe de bout en bout, conformité comprise.'
              : 'Pass a complex end-to-end case, compliance included.',
          ],
          timeframe: lang === 'fr' ? '90 jours' : '90 days',
          badge: `${spec.id}-expert-badge`,
        },
      ],
    },
  };
}
