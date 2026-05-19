import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Lightbulb, PlayCircle } from 'lucide-react';
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

  return (
    <GuideModalLayout
      isOpen={isOpen}
      onBackdropClick={onClose}
      onClose={onClose}
      closeLabel={t('orchestratorGuide.close')}
      maxWidth="md"
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

        <p className="mt-3 text-sm sm:text-base text-gray-400 leading-relaxed">{description}</p>

        {!isBefore && (
          <p className="mt-4 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3 text-xs text-gray-500 leading-relaxed">
            {t('companyOnboarding.stepGuide.insideHint')}
          </p>
        )}
      </div>
    </GuideModalLayout>
  );
};

export default StepGuideModal;
