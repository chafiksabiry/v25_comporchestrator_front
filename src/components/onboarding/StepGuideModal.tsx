import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Check,
  ChevronRight,
  Globe,
  Lightbulb,
  PenLine,
  PlayCircle,
  Search,
  Sparkles,
} from 'lucide-react';
import {
  GuideBadge,
  GuideHero,
  GuideIconOrb,
  GuideModalLayout,
  GuidePrimaryButton,
} from './GuideModalLayout';

export type StepGuideVariant = 'before' | 'inside';

interface StepGuideModalProps {
  isOpen: boolean;
  stepId: number;
  phaseId: number;
  variant: StepGuideVariant;
  onClose: () => void;
}

const PHASE_GRADIENTS = [
  'from-[#ff4d4d] via-[#ec4899] to-[#c026d3]',
  'from-blue-600 via-indigo-600 to-violet-700',
  'from-emerald-600 via-teal-600 to-cyan-700',
  'from-amber-500 via-orange-500 to-[#ff4d4d]',
];

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
    <div className="mt-6 space-y-4">
      <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">
        {t('companyOnboarding.stepGuide.step1.modesLabel', 'Three ways to create your profile')}
      </p>

      <div className="grid gap-3">
        {modes.map(({ icon: Icon, titleKey, defaultTitle, descKey, defaultDesc, gradient }) => (
          <div
            key={titleKey}
            className="group flex items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4 transition-all hover:border-white/10 hover:bg-white/[0.06]"
          >
            <div
              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}
            >
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">{t(titleKey, defaultTitle)}</p>
              <p className="mt-1 text-xs text-gray-400 leading-relaxed">{t(descKey, defaultDesc)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-amber-400/20 bg-amber-500/[0.08] px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">
            {t('companyOnboarding.stepGuide.step1.tipsLabel', 'Pro tips')}
          </span>
        </div>
        <ul className="space-y-1.5">
          {tips.map((tip, idx) => (
            <li key={idx} className="flex items-start gap-2 text-xs text-amber-100/90 leading-relaxed">
              <Check className="h-3.5 w-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const StepGuideModal: React.FC<StepGuideModalProps> = ({
  isOpen,
  stepId,
  phaseId,
  variant,
  onClose,
}) => {
  const { t } = useTranslation();

  const isBefore = variant === 'before';
  const gradient = PHASE_GRADIENTS[(phaseId - 1) % PHASE_GRADIENTS.length];
  const title = t(`companyOnboarding.phases.${phaseId}.steps.${stepId}.title`);
  const description = t(`companyOnboarding.phases.${phaseId}.steps.${stepId}.description`);
  const isStep1 = stepId === 1;

  return (
    <GuideModalLayout
      isOpen={isOpen}
      onBackdropClick={onClose}
      onClose={onClose}
      closeLabel={t('orchestratorGuide.close')}
      maxWidth={isStep1 ? 'lg' : 'md'}
      footer={
        <GuidePrimaryButton onClick={onClose}>
          {isBefore
            ? t('companyOnboarding.stepGuide.beforeStart')
            : t('companyOnboarding.stepGuide.start')}
          <ChevronRight className="h-4 w-4" />
        </GuidePrimaryButton>
      }
    >
      <GuideHero gradientClass={gradient}>
        <GuideIconOrb>
          {isBefore ? (
            <PlayCircle className="h-9 w-9 text-white drop-shadow-md" />
          ) : (
            <Lightbulb className="h-9 w-9 text-white drop-shadow-md" />
          )}
        </GuideIconOrb>
      </GuideHero>

      <div className="px-6 sm:px-8 pt-6 pb-2">
        <div className="mb-4">
          <GuideBadge>
            {isBefore
              ? t('companyOnboarding.stepGuide.beforeBadge', { step: stepId })
              : t('companyOnboarding.stepGuide.insideBadge', { step: stepId })}
          </GuideBadge>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
          {isBefore ? t('companyOnboarding.stepGuide.beforeHeading', { title }) : title}
        </h2>

        <p className="mt-3 text-sm sm:text-base text-gray-400 leading-relaxed">
          {isStep1
            ? t(
                `companyOnboarding.stepGuide.step1.${isBefore ? 'beforeDescription' : 'insideDescription'}`,
                description
              )
            : description}
        </p>

        {isStep1 && <Step1GuideExtras variant={variant} />}

        {!isBefore && !isStep1 && (
          <p className="mt-4 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3 text-xs text-gray-500 leading-relaxed">
            {t('companyOnboarding.stepGuide.insideHint')}
          </p>
        )}
      </div>
    </GuideModalLayout>
  );
};

export default StepGuideModal;
