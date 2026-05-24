import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Sparkles,
  Building2,
  Briefcase,
  BookOpen,
  ChevronRight,
  Rocket,
} from 'lucide-react';
import {
  GuideBadge,
  GuideHero,
  GuideIconOrb,
  GuideModalLayout,
  GuidePrimaryButton,
  GuideSecondaryButton,
} from './GuideModalLayout';

interface OrchestratorGuideModalProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
  userName?: string;
}

const STEP_ICONS = [Sparkles, Building2, Briefcase, BookOpen] as const;
const STEP_GRADIENTS = [
  'from-[#ff4d4d] via-[#ec4899] to-[#c026d3]',
  'from-blue-600 via-indigo-600 to-violet-700',
  'from-emerald-600 via-teal-600 to-cyan-700',
  'from-amber-500 via-orange-500 to-[#ff4d4d]',
];

const OrchestratorGuideModal: React.FC<OrchestratorGuideModalProps> = ({
  isOpen,
  onComplete,
  onSkip,
  userName,
}) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);

  const totalSteps = 4;
  const isIntro = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  if (!isOpen) return null;

  const StepIcon = STEP_ICONS[currentStep] ?? Sparkles;
  const gradient = STEP_GRADIENTS[currentStep] ?? STEP_GRADIENTS[0];
  const progressPercent = (currentStep / (totalSteps - 1)) * 100;

  const stepFooter = (
    <motion.div className="space-y-4">
      <motion.div className="flex items-center gap-4">
        <motion.div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-harx"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </motion.div>
        <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-gray-500">
          {t('orchestratorGuide.stepIndicator', {
            current: currentStep,
            total: totalSteps - 1,
          })}
        </span>
      </motion.div>
      <motion.div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onSkip}
          className="hidden rounded-2xl px-4 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:text-white sm:block"
        >
          {t('orchestratorGuide.skip')}
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="flex items-center gap-2 rounded-2xl bg-gradient-harx px-6 py-2.5 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-harx-500/25 transition-all hover:-translate-y-0.5 hover:shadow-harx-500/35 active:scale-[0.98]"
        >
          {isLastStep ? t('orchestratorGuide.finish') : t('orchestratorGuide.next')}
          {!isLastStep && <ChevronRight className="h-4 w-4" />}
        </button>
      </motion.div>
    </motion.div>
  );

  const introFooter = (
    <motion.div className="flex flex-col gap-3">
      <GuidePrimaryButton onClick={handleNext}>
        {t('orchestratorGuide.intro.startTour')}
      </GuidePrimaryButton>
      <GuideSecondaryButton onClick={onSkip}>
        {t('orchestratorGuide.skipTour')}
      </GuideSecondaryButton>
    </motion.div>
  );

  return (
    <GuideModalLayout
      isOpen={isOpen}
      onBackdropClick={onSkip}
      onClose={onSkip}
      closeLabel={t('orchestratorGuide.close')}
      maxWidth="lg"
      footer={isIntro ? introFooter : stepFooter}
    >
      <AnimatePresence mode="wait">
        {isIntro ? (
          <motion.div
            key="intro"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.25 }}
          >
            <GuideHero gradientClass={gradient}>
              <GuideIconOrb>
                <Rocket className="h-9 w-9 text-white drop-shadow-md" />
              </GuideIconOrb>
            </GuideHero>
            <motion.div className="px-6 sm:px-8 pt-6 pb-2 text-center sm:text-left">
              <motion.div className="mb-4 flex justify-center sm:justify-start">
                <GuideBadge>HARX Orchestrator</GuideBadge>
              </motion.div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                {t('orchestratorGuide.intro.title', {
                  name: userName ? `, ${userName}` : '',
                })}
              </h2>
              <p className="mt-4 text-sm sm:text-base text-gray-400 leading-relaxed max-w-md mx-auto sm:mx-0">
                {t('orchestratorGuide.intro.description')}
              </p>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key={`step-${currentStep}`}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.25 }}
          >
            <GuideHero gradientClass={gradient}>
              <GuideIconOrb>
                <StepIcon className="h-10 w-10 text-white drop-shadow-md" />
              </GuideIconOrb>
            </GuideHero>
            <motion.div className="px-6 sm:px-8 pt-6 pb-2">
              <motion.div className="mb-4">
                <GuideBadge>
                  {t('orchestratorGuide.stepIndicator', {
                    current: currentStep,
                    total: totalSteps - 1,
                  })}
                </GuideBadge>
              </motion.div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {t(`orchestratorGuide.steps.${currentStep}.title`)}
              </h2>
              <p className="mt-3 text-sm sm:text-base text-gray-400 leading-relaxed">
                {t(`orchestratorGuide.steps.${currentStep}.description`)}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </GuideModalLayout>
  );
};

export default OrchestratorGuideModal;
