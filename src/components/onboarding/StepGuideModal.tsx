import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { X, ChevronRight, Lightbulb, PlayCircle } from 'lucide-react';

export type StepGuideVariant = 'before' | 'inside';

interface StepGuideModalProps {
  isOpen: boolean;
  stepId: number;
  phaseId: number;
  variant: StepGuideVariant;
  onClose: () => void;
}

const STEP_GRADIENTS = [
  'from-rose-500 via-pink-500 to-fuchsia-600',
  'from-blue-500 via-indigo-500 to-violet-600',
  'from-emerald-500 via-teal-500 to-cyan-600',
  'from-amber-500 via-orange-500 to-rose-500',
];

const StepGuideModal: React.FC<StepGuideModalProps> = ({
  isOpen,
  stepId,
  phaseId,
  variant,
  onClose,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const isBefore = variant === 'before';
  const gradient = STEP_GRADIENTS[(phaseId - 1) % STEP_GRADIENTS.length];
  const title = t(`companyOnboarding.phases.${phaseId}.steps.${stepId}.title`);
  const description = t(`companyOnboarding.phases.${phaseId}.steps.${stepId}.description`);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
    >
      <motion.div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          aria-label={t('orchestratorGuide.close')}
        >
          <X className="h-4 w-4" />
        </button>

        <motion.div className={`h-32 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm ring-4 ring-white/25"
          >
            {isBefore ? (
              <PlayCircle className="h-8 w-8 text-white" />
            ) : (
              <Lightbulb className="h-8 w-8 text-white" />
            )}
          </motion.div>
        </motion.div>

        <motion.div className="px-6 pt-5 pb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-rose-500 mb-1">
            {isBefore
              ? t('companyOnboarding.stepGuide.beforeBadge', { step: stepId })
              : t('companyOnboarding.stepGuide.insideBadge', { step: stepId })}
          </p>
          <h2 className="text-lg font-bold text-slate-800">
            {isBefore
              ? t('companyOnboarding.stepGuide.beforeHeading', { title })
              : title}
          </h2>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">{description}</p>
          {!isBefore && (
            <p className="mt-2 text-xs text-slate-500">
              {t('companyOnboarding.stepGuide.insideHint')}
            </p>
          )}

          <button
            onClick={onClose}
            className="mt-5 w-full flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/25 transition-all hover:bg-blue-700 active:scale-[0.98]"
          >
            {isBefore
              ? t('companyOnboarding.stepGuide.beforeStart')
              : t('companyOnboarding.stepGuide.start')}
            <ChevronRight className="h-4 w-4" />
          </button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default StepGuideModal;
