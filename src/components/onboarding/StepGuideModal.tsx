import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Check,
  ClipboardList,
  FileCheck2,
  Globe,
  HelpCircle,
  ListChecks,
  PenLine,
  Search,
  Sparkles,
  Target,
  X,
} from 'lucide-react';

export type StepGuideVariant = 'before' | 'inside';

interface StepGuideModalProps {
  isOpen: boolean;
  stepId: number;
  phaseId: number;
  variant: StepGuideVariant;
  onClose: () => void;
  onConfirm?: () => void;
}

const Step1GuideExtras: React.FC<{ variant: StepGuideVariant }> = ({ variant }) => {
  const { t } = useTranslation();
  const isBefore = variant === 'before';

  const modes = [
    {
      icon: Search,
      titleKey: 'companyOnboarding.stepGuide.step1.modes.search.title',
      defaultTitle: 'Search by name',
      descKey: 'companyOnboarding.stepGuide.step1.modes.search.desc',
      defaultDesc: 'Type the company name — AI finds it on the web and pre-fills everything.',
      gradient: 'from-rose-500/80 to-pink-500/80',
    },
    {
      icon: Globe,
      titleKey: 'companyOnboarding.stepGuide.step1.modes.scrape.title',
      defaultTitle: 'Paste a website URL',
      descKey: 'companyOnboarding.stepGuide.step1.modes.scrape.desc',
      defaultDesc: 'We scrape the page to extract phone, social media and contact info.',
      gradient: 'from-violet-500/80 to-indigo-500/80',
    },
    {
      icon: PenLine,
      titleKey: 'companyOnboarding.stepGuide.step1.modes.manual.title',
      defaultTitle: 'Create manually',
      descKey: 'companyOnboarding.stepGuide.step1.modes.manual.desc',
      defaultDesc: 'No website? Use the form to enter all details yourself, with logo upload.',
      gradient: 'from-amber-500/80 to-orange-500/80',
    },
  ];

  const tipsKey = isBefore
    ? 'companyOnboarding.stepGuide.step1.tips.before'
    : 'companyOnboarding.stepGuide.step1.tips.inside';
  const tipsFallback = isBefore
    ? [
        'You only need the company name OR its website to start.',
        'Every field can be edited before publishing.',
        'Logo, mission and contact info are auto-filled when possible.',
      ]
    : [
        'Click "Edit" on any field once the profile loads to refine it.',
        'For better contact extraction, paste the company website rather than just its name.',
        'You can switch to manual creation any time using the floating button.',
      ];

  const rawTips = t(tipsKey, { returnObjects: true }) as unknown;
  const tips = Array.isArray(rawTips) && rawTips.length > 0 ? (rawTips as string[]) : tipsFallback;

  return (
    <div className="mt-3 space-y-2.5">
      <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">
        {t('companyOnboarding.stepGuide.step1.modesLabel', 'Three ways to create your profile')}
      </p>

      <div className="grid gap-2 sm:grid-cols-3">
        {modes.map(({ icon: Icon, titleKey, defaultTitle, descKey, defaultDesc, gradient }) => (
          <div
            key={titleKey}
            className="group flex items-start gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-2.5"
          >
            <div
              className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}
            >
              <Icon className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900">{t(titleKey, defaultTitle)}</p>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">{t(descKey, defaultDesc)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">
            {t('companyOnboarding.stepGuide.step1.tipsLabel', 'Pro tips')}
          </span>
        </div>
        <ul className="space-y-1">
          {tips.map((tip, idx) => (
            <li key={idx} className="flex items-start gap-2 text-xs text-amber-900/80 leading-snug">
              <Check className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const Step8GuideExtras: React.FC<{ variant: StepGuideVariant }> = ({ variant }) => {
  const { t } = useTranslation();
  const isBefore = variant === 'before';

  const stages = [
    {
      icon: Target,
      titleKey: 'companyOnboarding.stepGuide.step8.stages.methodology.title',
      defaultTitle: 'Choisissez la méthodologie',
      descKey: 'companyOnboarding.stepGuide.step8.stages.methodology.desc',
      defaultDesc: 'La rubrique adaptée à votre GIG est mise en avant ("Recommandé pour ce GIG") — vous pouvez quand même en choisir une autre.',
      gradient: 'from-emerald-500/80 to-teal-500/80',
    },
    {
      icon: ClipboardList,
      titleKey: 'companyOnboarding.stepGuide.step8.stages.personalize.title',
      defaultTitle: 'Répondez aux 4 questions',
      descKey: 'companyOnboarding.stepGuide.step8.stages.personalize.desc',
      defaultDesc: 'Source, niveau, objectif, format : ces réponses pilotent réellement le contenu généré, pas une simple formalité.',
      gradient: 'from-sky-500/80 to-blue-500/80',
    },
    {
      icon: ListChecks,
      titleKey: 'companyOnboarding.stepGuide.step8.stages.modules.title',
      defaultTitle: 'Générez et validez chaque module',
      descKey: 'companyOnboarding.stepGuide.step8.stages.modules.desc',
      defaultDesc: 'Validez le plan, puis générez le contenu de chaque module un par un jusqu’à ce qu’ils soient tous validés.',
      gradient: 'from-violet-500/80 to-indigo-500/80',
    },
    {
      icon: FileCheck2,
      titleKey: 'companyOnboarding.stepGuide.step8.stages.document.title',
      defaultTitle: 'Générez le document de support',
      descKey: 'companyOnboarding.stepGuide.step8.stages.document.desc',
      defaultDesc: 'L’étape ne se termine que lorsque le document (présentation) est généré — pas avant, même si le plan est déjà validé.',
      gradient: 'from-amber-500/80 to-orange-500/80',
    },
  ];

  const tipsKey = isBefore
    ? 'companyOnboarding.stepGuide.step8.tips.before'
    : 'companyOnboarding.stepGuide.step8.tips.inside';
  const tipsFallback = isBefore
    ? [
        'Comptez les 4 étapes ci-dessous avant de passer à la suite.',
        'Le contenu généré par IA reste une proposition — relisez-le et corrigez-le avant de le diffuser à vos REPS.',
      ]
    : [
        'Si "Étape terminée" n’apparaît pas, c’est qu’il manque soit du contenu de module, soit le document de support.',
        'Vous pouvez revenir corriger un module à tout moment avant la diffusion aux REPS.',
      ];

  const rawTips = t(tipsKey, { returnObjects: true }) as unknown;
  const tips = Array.isArray(rawTips) && rawTips.length > 0 ? (rawTips as string[]) : tipsFallback;

  return (
    <div className="mt-3 space-y-2.5">
      <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">
        {t('companyOnboarding.stepGuide.step8.stagesLabel', 'Les 4 étapes de la formation')}
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        {stages.map(({ icon: Icon, titleKey, defaultTitle, descKey, defaultDesc, gradient }) => (
          <div
            key={titleKey}
            className="group flex items-start gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-2.5"
          >
            <div
              className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}
            >
              <Icon className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900">{t(titleKey, defaultTitle)}</p>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">{t(descKey, defaultDesc)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">
            {t('companyOnboarding.stepGuide.step1.tipsLabel', 'Pro tips')}
          </span>
        </div>
        <ul className="space-y-1">
          {tips.map((tip, idx) => (
            <li key={idx} className="flex items-start gap-2 text-xs text-amber-900/80 leading-snug">
              <Check className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

/**
 * Concrete, actionable tips for the steps that don't get a full custom
 * "Extras" layout (1 and 8) — grounded in the real screens (gating
 * conditions, confirmation steps, hidden requirements) rather than generic
 * descriptions, so the "inside" guide actually helps instead of restating
 * the step title.
 */
const GENERIC_STEP_TIPS_FR: Record<number, string[]> = {
  3: [
    'Décrivez votre besoin en langage libre dans la zone de texte — la génération IA ne démarre qu’une fois ce champ rempli.',
    'Vous accédez ensuite aux sections structurées (infos de base, planning, commission, compétences, équipe), puis à la relecture avant publication.',
  ],
  4: [
    'Créez d’abord un GIG avec sa zone de destination — sans GIG sélectionné, aucun numéro n’est disponible ici.',
    'Si le pays l’exige, un formulaire réglementaire doit être complété avant de pouvoir acheter un numéro.',
  ],
  5: [
    'Après l’import, mappez chaque colonne de votre fichier vers les champs HARX par glisser-déposer.',
    'Les contacts restent en aperçu tant que le mapping n’est pas confirmé — ils ne sont réellement importés qu’après validation.',
  ],
  7: [
    'Sélectionnez le GIG concerné avant d’uploader — les documents restent rattachés à ce GIG, même si vous en changez après coup.',
    'Formats acceptés : PDF, Word, texte, audio, vidéo.',
  ],
  9: [
    'Générez un script interactif par IA, ou partez d’un script déjà existant pour ce GIG.',
    'Un script en brouillon n’est pas utilisable par vos REPS — il faut l’activer explicitement pour qu’il devienne le script actif du GIG.',
  ],
  10: [
    'Cliquez ou glissez sur une case du calendrier pour définir le nombre de REPS attendus sur ce créneau, puis cliquez sur « Enregistrer les modifications » en haut à droite pour sauvegarder.',
    'Le bouton affiche « Enregistré » (vert) tant qu’aucune modification n’est en attente — ce n’est pas désactivé définitivement : cliquez à nouveau sur une case pour modifier, le bouton redevient actif.',
    'Cette étape de l’onboarding se valide automatiquement dès qu’un créneau a été enregistré — pas besoin d’une action supplémentaire pour la clôturer.',
  ],
  11: [
    'Le paiement se fait directement dans la page, via Stripe.',
    'Après paiement, un court délai peut s’écouler avant que l’étape apparaisse validée — c’est normal, inutile de recommencer.',
  ],
  12: [
    'Le bouton « Activer » se débloque une fois les prérequis du GIG réunis (téléphonie, contacts, script, planification) et le solde suffisant.',
    'La base de connaissances n’est pas obligatoire pour activer un GIG — mais mieux vaut la compléter avant de lancer réellement les appels.',
  ],
  13: [
    'Trois onglets à connaître : « matching » pour trouver des REPS, « invited » pour suivre vos invitations envoyées, « enrollment » pour traiter les demandes entrantes.',
    'Ajustez les poids de correspondance (expérience, compétences, secteur, langues, disponibilité…) pour affiner les suggestions.',
  ],
};

const GenericStepTips: React.FC<{ stepId: number }> = ({ stepId }) => {
  const { t } = useTranslation();
  const fallback = GENERIC_STEP_TIPS_FR[stepId];
  if (!fallback) return null;
  const rawTips = t(`companyOnboarding.stepGuide.step${stepId}.tips`, { returnObjects: true }) as unknown;
  const tips = Array.isArray(rawTips) && rawTips.length > 0 ? (rawTips as string[]) : fallback;

  return (
    <ul className="mt-3 space-y-1.5">
      {tips.map((tip, idx) => (
        <li
          key={idx}
          className="flex items-start gap-2 rounded-2xl border border-harx-100 bg-harx-50/60 px-3 py-2 text-xs text-slate-600 leading-snug"
        >
          <Check className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-emerald-400" />
          <span>{tip}</span>
        </li>
      ))}
    </ul>
  );
};

const StepGuideModal: React.FC<StepGuideModalProps> = ({
  isOpen,
  stepId,
  phaseId,
  variant,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation();

  const isBefore = variant === 'before';
  const title = t(`companyOnboarding.phases.${phaseId}.steps.${stepId}.title`);
  const description = t(`companyOnboarding.phases.${phaseId}.steps.${stepId}.description`);
  const isStep1 = stepId === 1;
  const isStep8 = stepId === 8;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 bg-slate-900/50 backdrop-blur-sm overflow-hidden">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="company-onboarding-help-title"
        className={`relative w-full ${isStep1 || isStep8 ? 'max-w-3xl' : 'max-w-md'} overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 shadow-2xl`}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          aria-label={t('orchestratorGuide.close', 'Fermer')}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-3 flex items-center gap-3 pr-8">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-harx text-white shadow-md">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-black tracking-wide text-slate-900">
              {t('companyOnboarding.ui.help', 'Aide')}
            </p>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              {isBefore
                ? t('companyOnboarding.stepGuide.beforeBadge', { step: stepId })
                : t('companyOnboarding.stepGuide.insideBadge', { step: stepId })}
            </p>
          </div>
        </div>

        <h2 id="company-onboarding-help-title" className="text-lg font-black tracking-tight text-slate-900 leading-snug">
          {isBefore ? t('companyOnboarding.stepGuide.beforeHeading', { title }) : title}
        </h2>
        <p className="mt-1.5 text-sm font-medium text-slate-500 leading-relaxed">
          {isStep1
            ? t(
                `companyOnboarding.stepGuide.step1.${isBefore ? 'beforeDescription' : 'insideDescription'}`,
                description
              )
            : description}
        </p>

        {isStep1 && <Step1GuideExtras variant={variant} />}
        {isStep8 && <Step8GuideExtras variant={variant} />}
        {!isStep1 && !isStep8 && !isBefore && <GenericStepTips stepId={stepId} />}

        {!isBefore && !isStep1 && !isStep8 && !GENERIC_STEP_TIPS_FR[stepId] && (
          <p className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500 leading-relaxed">
            {t('companyOnboarding.stepGuide.insideHint')}
          </p>
        )}

        <button
          type="button"
          onClick={onConfirm ?? onClose}
          className="mt-4 w-full rounded-xl bg-gradient-harx px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-harx-500/20 transition hover:opacity-90"
        >
          {t('companyOnboarding.stepGuide.start', 'Compris')}
        </button>
      </div>
    </div>
  );
};

export default StepGuideModal;
