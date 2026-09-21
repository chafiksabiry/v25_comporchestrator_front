import React from 'react';
import { useTranslation } from 'react-i18next';
import { HelpCircle } from 'lucide-react';
import { sectionGuidance } from '../lib/guidance';

interface SectionGuidanceProps {
  section: string;
}

export function SectionGuidance({ section }: SectionGuidanceProps) {
  const { t } = useTranslation();
  const fallback = sectionGuidance[section as keyof typeof sectionGuidance];

  if (!fallback) {
    return null;
  }

  const title =
    t(`gigCreation.guidance.${section}.title`, { defaultValue: fallback.title }) ||
    fallback.title;

  const stepsRaw = t(`gigCreation.guidance.${section}.steps`, {
    returnObjects: true,
    defaultValue: fallback.steps,
  });
  const tipsRaw = t(`gigCreation.guidance.${section}.tips`, {
    returnObjects: true,
    defaultValue: fallback.tips,
  });

  const steps = Array.isArray(stepsRaw) ? (stepsRaw as string[]) : fallback.steps;
  const tips = Array.isArray(tipsRaw) ? (tipsRaw as string[]) : fallback.tips;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-blue-700 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-200/50">
        <div className="p-2 bg-blue-100 rounded-lg">
          <HelpCircle className="w-5 h-5 text-blue-600" />
        </div>
        <h3 className="font-semibold text-lg">
          {t('gigCreation.guidance.forSection', { title })}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-6 border border-emerald-200/50 shadow-sm">
          <div className="space-y-4">
            <h4 className="font-semibold text-emerald-800 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
              {t('gigCreation.guidance.stepsLabel')}
            </h4>
            <ol className="space-y-3">
              {steps.map((step, index) => (
                <li key={index} className="flex items-start gap-3 text-emerald-700">
                  <span className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200/50 shadow-sm">
          <div className="space-y-4">
            <h4 className="font-semibold text-amber-800 flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
              {t('gigCreation.guidance.tipsLabel')}
            </h4>
            <ul className="space-y-3">
              {tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-3 text-amber-700">
                  <span className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
