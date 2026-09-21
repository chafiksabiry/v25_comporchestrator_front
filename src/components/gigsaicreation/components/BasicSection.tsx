import React from 'react';
import { useTranslation } from 'react-i18next';
import { InfoText } from './InfoText';
import { Briefcase, ArrowRight, ArrowLeft } from 'lucide-react';
import { GigData } from '../types';
import { predefinedOptions } from '../lib/guidance';

interface BasicSectionProps {
  data: GigData;
  onChange: (data: GigData) => void;
  errors: { [key: string]: string[] };
  onNext?: () => void;
  onPrevious?: () => void;
  onSave?: () => void;
  onAIAssist?: () => void;
  onSectionChange?: (sectionId: string) => void;
  currentSection: string;
}

/**
 * Create-gig basics: title (required) + category / seniority / experience.
 * Next continues the wizard; Skip to review remains available.
 */
const BasicSection: React.FC<BasicSectionProps> = ({
  data,
  onChange,
  errors,
  onPrevious,
  onNext,
  onSectionChange,
}) => {
  const { t } = useTranslation();
  const titleOk = Boolean(String(data.title || '').trim());

  const goNext = () => {
    if (!titleOk) return;
    onNext?.();
  };

  const goSkipToReview = () => {
    if (!titleOk) return;
    if (onSectionChange) {
      onSectionChange('review');
      return;
    }
    onNext?.();
  };

  const updateSeniority = (patch: Partial<GigData['seniority']>) => {
    onChange({
      ...data,
      seniority: {
        level: data.seniority?.level || '',
        yearsExperience: data.seniority?.yearsExperience ?? 0,
        ...patch,
      },
    });
  };

  return (
    <div className="w-full bg-white py-6">
      <div className="space-y-8">
        <InfoText>{t('gigCreation.basic.infoBanner')}</InfoText>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-harx px-6 py-4">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-lg mr-3">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{t('gigCreation.basic.sectionTitle')}</h3>
                <p className="text-white/80 text-sm">{t('gigCreation.basic.titleHint')}</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('gigCreation.basic.titleLabel')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={data.title || ''}
                onChange={(e) => onChange({ ...data, title: e.target.value })}
                className={`w-full px-4 py-3 bg-gradient-to-r from-harx-50 to-harx-alt-50 border-2 rounded-xl text-harx-900 font-medium focus:outline-none focus:ring-3 focus:ring-harx-300 focus:border-harx-400 transition-all ${
                  errors.title ? 'border-red-300 focus:ring-red-300' : 'border-harx-200'
                }`}
                placeholder={t('gigCreation.basic.titlePlaceholder')}
              />
              {errors.title && (
                <p className="mt-2 text-sm text-red-600 font-medium">{errors.title.join(', ')}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('gigCreation.basic.categoryLabel')}
              </label>
              <select
                value={data.category || ''}
                onChange={(e) => onChange({ ...data, category: e.target.value })}
                className="w-full px-4 py-3 bg-white border-2 border-harx-200 rounded-xl text-harx-900 font-medium focus:outline-none focus:ring-3 focus:ring-harx-300 focus:border-harx-400 transition-all"
              >
                <option value="">{t('gigCreation.basic.categoryPlaceholder')}</option>
                {predefinedOptions.basic.categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('gigCreation.basic.seniorityLabel')}
                </label>
                <select
                  value={data.seniority?.level || ''}
                  onChange={(e) => updateSeniority({ level: e.target.value })}
                  className="w-full px-4 py-3 bg-white border-2 border-harx-200 rounded-xl text-harx-900 font-medium focus:outline-none focus:ring-3 focus:ring-harx-300 focus:border-harx-400 transition-all"
                >
                  <option value="">{t('gigCreation.basic.seniorityPlaceholder')}</option>
                  {predefinedOptions.basic.seniorityLevels.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('gigCreation.basic.yearsLabel')}
                </label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={data.seniority?.yearsExperience ?? 0}
                  onChange={(e) =>
                    updateSeniority({
                      yearsExperience: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="w-full px-4 py-3 bg-white border-2 border-harx-200 rounded-xl text-harx-900 font-medium focus:outline-none focus:ring-3 focus:ring-harx-300 focus:border-harx-400 transition-all"
                  placeholder="0"
                />
              </div>
            </div>

            <p className="text-xs text-gray-500">{t('gigCreation.basic.skipTip')}</p>
          </div>
        </div>

        <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onPrevious}
            disabled={!onPrevious}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-gray-700 border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('gigCreation.nav.previous')}
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={goSkipToReview}
              disabled={!titleOk}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-harx-200 text-harx-700 hover:bg-harx-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {t('gigCreation.basic.skipToReview')}
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={!titleOk}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-harx-500 text-white hover:bg-harx-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {t('gigCreation.nav.next')}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BasicSection;
