import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sparkles,
  Building2,
  Briefcase,
  BookOpen,
  LayoutDashboard,
  ChevronRight,
  Rocket,
} from 'lucide-react';

interface OrchestratorGuideModalProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
  userName?: string;
}

const STEP_ICONS = [Sparkles, Building2, Briefcase, BookOpen, LayoutDashboard] as const;
const STEP_GRADIENTS = [
  'from-rose-500 via-pink-500 to-fuchsia-600',
  'from-blue-500 via-indigo-500 to-violet-600',
  'from-emerald-500 via-teal-500 to-cyan-600',
  'from-amber-500 via-orange-500 to-rose-500',
  'from-slate-700 via-slate-800 to-slate-900',
];

const OrchestratorGuideModal: React.FC<OrchestratorGuideModalProps> = ({
  isOpen,
  onComplete,
  onSkip,
  userName,
}) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);

  const totalSteps = 5;
  const isIntro = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  if (!isOpen) return null;

  const StepIcon = STEP_ICONS[currentStep] ?? Sparkles;
  const gradient = STEP_GRADIENTS[currentStep] ?? STEP_GRADIENTS[0];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleSkip}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />

      <AnimatePresence mode="wait">
        {isIntro ? (
          <motion.div
            key="intro"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="relative w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              className={`bg-gradient-to-br ${gradient} px-8 pt-10 pb-8 text-center`}
            >
              <motion.div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm ring-4 ring-white/30">
                <Rocket className="h-10 w-10 text-white" />
              </motion.div>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">
                {t('orchestratorGuide.intro.title', {
                  name: userName ? `, ${userName}` : '',
                })}
              </h2>
              <p className="mt-4 text-base text-white/90 leading-relaxed">
                {t('orchestratorGuide.intro.description')}
              </p>
            </motion.div>

            <motion.div className="bg-white px-8 py-6 flex flex-col items-center gap-3">
              <button
                onClick={handleNext}
                className="w-full rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 px-6 py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-rose-500/30 transition-all hover:from-rose-600 hover:to-pink-700 hover:shadow-xl active:scale-[0.98]"
              >
                {t('orchestratorGuide.intro.startTour')}
              </button>
              <button
                onClick={handleSkip}
                className="text-sm text-gray-500 hover:text-gray-800 transition-colors py-1"
              >
                {t('orchestratorGuide.skipTour')}
              </button>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key={`step-${currentStep}`}
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleSkip}
              className="absolute top-4 right-4 z-10 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label={t('orchestratorGuide.close')}
            >
              <X className="h-5 w-5" />
            </button>

            <div className={`relative h-44 bg-gradient-to-br ${gradient} flex items-center justify-center overflow-hidden`}>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.4 }}
                className="relative flex items-center justify-center"
              >
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                  className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm ring-4 ring-white/25"
                >
                  <StepIcon className="h-12 w-12 text-white" />
                </motion.div>
                <div className="absolute -left-8 top-4 h-16 w-16 rounded-full bg-white/10" />
                <motion.div
                  animate={{ y: [0, 6, 0] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut', delay: 0.5 }}
                  className="absolute -right-6 bottom-2 h-12 w-12 rounded-lg bg-white/15 rotate-12"
                />
                <div className="absolute left-6 bottom-4 h-8 w-8 rounded-full bg-white/20" />
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="px-8 pt-6 pb-2"
            >
              <h2 className="text-xl font-bold text-slate-800">
                {t(`orchestratorGuide.steps.${currentStep}.title`)}
              </h2>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                {t(`orchestratorGuide.steps.${currentStep}.description`)}
              </p>
            </motion.div>

            <div className="px-8 pt-4 pb-6 flex items-center justify-between gap-4">
              <motion.div
                className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <motion.div
                  className="h-full bg-gradient-to-r from-rose-500 to-pink-600 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(currentStep / (totalSteps - 1)) * 100}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </motion.div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={handleSkip}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors hidden sm:block"
                >
                  {t('orchestratorGuide.skip')}
                </button>
                <button
                  onClick={handleNext}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/25 transition-all hover:bg-blue-700 active:scale-[0.98]"
                >
                  {isLastStep ? t('orchestratorGuide.finish') : t('orchestratorGuide.next')}
                  {!isLastStep && <ChevronRight className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <p className="px-8 pb-4 text-xs text-center text-gray-400">
              {t('orchestratorGuide.stepIndicator', {
                current: currentStep,
                total: totalSteps - 1,
              })}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default OrchestratorGuideModal;
