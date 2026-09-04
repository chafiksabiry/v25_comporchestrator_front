import React from 'react';
import { InfoText } from './InfoText';
import { Briefcase, ArrowRight, ArrowLeft } from 'lucide-react';
import { GigData } from '../types';

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
 * Onboarding / create-gig basics: title only.
 * Schedule, commission, skills, team remain optional in later sections.
 */
const BasicSection: React.FC<BasicSectionProps> = ({
  data,
  onChange,
  errors,
  onPrevious,
  onNext,
  onSectionChange,
}) => {
  const titleOk = Boolean(String(data.title || '').trim());

  const goNextOrReview = () => {
    if (!titleOk) return;
    // Prefer jumping to review so optional sections are easy to skip.
    if (onSectionChange) {
      onSectionChange('review');
      return;
    }
    onNext?.();
  };

  return (
    <div className="w-full bg-white py-6">
      <div className="space-y-8">
        <InfoText>
          Give your gig a clear title. Other details (schedule, commission, skills…) are optional —
          you can skip them and complete later.
        </InfoText>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-harx px-6 py-4">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-lg mr-3">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Gig title</h3>
                <p className="text-white/80 text-sm">Only this field is required to continue</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={data.title || ''}
                onChange={(e) => onChange({ ...data, title: e.target.value })}
                className={`w-full px-4 py-3 bg-gradient-to-r from-harx-50 to-harx-alt-50 border-2 rounded-xl text-harx-900 font-medium focus:outline-none focus:ring-3 focus:ring-harx-300 focus:border-harx-400 transition-all ${
                  errors.title ? 'border-red-300 focus:ring-red-300' : 'border-harx-200'
                }`}
                placeholder="e.g., Call Center Agent — Outbound Sales"
              />
              {errors.title && (
                <p className="mt-2 text-sm text-red-600 font-medium">{errors.title.join(', ')}</p>
              )}
            </div>
            <p className="text-xs text-gray-500">
              Tip: Schedule, Commission, Skills and Team are optional — use “Skip to review” to publish with just a title.
            </p>
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
            Previous
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={goNextOrReview}
              disabled={!titleOk}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-harx-200 text-harx-700 hover:bg-harx-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Skip to review
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!titleOk}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-harx-500 text-white hover:bg-harx-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BasicSection;
