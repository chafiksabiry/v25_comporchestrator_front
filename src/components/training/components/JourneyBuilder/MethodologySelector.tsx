import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  Heart,
  Car,
  Home,
  Stethoscope,
  Shield,
  TrendingUp,
  Users,
  ArrowLeft,
  CheckCircle,
  Clock,
  Target,
  Briefcase,
  Brain,
  BookOpen,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { TrainingMethodology } from '../../types/methodology';
import {
  buildB2bServicesMethodology,
  buildProspectingMethodology,
  healthInsuranceMethodologyForLanguage,
  type MethodologyLang,
} from '../../data/genericSalesMethodologies';
import { scrollJourneyMainToTop } from './journeyScroll';

interface MethodologySelectorProps {
  onMethodologySelect: (methodology: TrainingMethodology) => void;
  onCustomMethodology: () => void;
  onBack?: () => void;
  /** When true, wizard footer provides Back — hide duplicate top Back */
  hideBackButton?: boolean;
}

type IndustryCard = {
  id: string;
  name: string;
  icon: LucideIcon;
  description: string;
  methodology: TrainingMethodology | null;
  features: string[];
  duration: string;
  certificationLevels: number;
};

function featureList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

export default function MethodologySelector({ onMethodologySelect, onBack, hideBackButton }: MethodologySelectorProps) {
  const { t, i18n } = useTranslation();
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const lang: MethodologyLang = (i18n.resolvedLanguage || i18n.language || 'fr').toLowerCase().startsWith('en') ? 'en' : 'fr';

  const industries = useMemo<IndustryCard[]>(() => {
    const prospecting = buildProspectingMethodology(lang);
    const b2b = buildB2bServicesMethodology(lang);
    const health = healthInsuranceMethodologyForLanguage(lang);
    const hours = (methodology: TrainingMethodology) =>
      t('trainingMethodology.hours', {
        count: methodology.components.reduce((sum, item) => sum + (item.estimatedDuration || 0), 0),
      });
    const soon = (
      id: string,
      icon: LucideIcon,
      key: 'auto' | 'property' | 'life' | 'financial' | 'healthcare',
      certificationLevels: number,
    ): IndustryCard => ({
      id,
      name: t(`trainingMethodology.industries.${key}.name`),
      icon,
      description: t(`trainingMethodology.industries.${key}.description`),
      methodology: null,
      features: featureList(t(`trainingMethodology.industries.${key}.features`, { returnObjects: true })),
      duration: t(`trainingMethodology.industries.${key}.duration`),
      certificationLevels,
    });

    return [
      {
        id: 'prospecting',
        name: prospecting.name,
        icon: Target,
        description: prospecting.description,
        methodology: prospecting,
        features: prospecting.components.map((item) => item.title),
        duration: hours(prospecting),
        certificationLevels: prospecting.certificationPath.levels.length,
      },
      {
        id: 'b2b-services',
        name: b2b.name,
        icon: Briefcase,
        description: b2b.description,
        methodology: b2b,
        features: b2b.components.map((item) => item.title),
        duration: hours(b2b),
        certificationLevels: b2b.certificationPath.levels.length,
      },
      {
        id: 'health-insurance',
        name: health.name,
        icon: Heart,
        description: health.description,
        methodology: health,
        features: health.components.map((item) => item.title).slice(0, 8),
        duration: t('trainingMethodology.industries.health.duration'),
        certificationLevels: health.certificationPath.levels.length,
      },
      soon('auto-insurance', Car, 'auto', 3),
      soon('property-insurance', Home, 'property', 3),
      soon('life-insurance', Shield, 'life', 4),
      soon('financial-services', TrendingUp, 'financial', 4),
      soon('healthcare', Stethoscope, 'healthcare', 3),
    ];
  }, [lang, t]);

  const handleIndustrySelect = (industry: IndustryCard) => {
    if (industry.methodology) {
      onMethodologySelect(industry.methodology);
    } else {
      setSelectedIndustry(industry.id);
    }
  };

  useEffect(() => {
    scrollJourneyMainToTop();
  }, []);

  const featureItems = [
    { id: 'foundational', Icon: BookOpen, label: t('trainingMethodology.features.foundational') },
    { id: 'compliance', Icon: Shield, label: t('trainingMethodology.features.compliance') },
    { id: 'industry', Icon: Building2, label: t('trainingMethodology.features.industry') },
    { id: 'operational', Icon: Zap, label: t('trainingMethodology.features.operational') },
    { id: 'integration', Icon: Users, label: t('trainingMethodology.features.integration') },
    { id: 'development', Icon: Target, label: t('trainingMethodology.features.development') },
  ];

  return (
    <div className="harx-training-page w-full min-w-0 bg-white">
      <div className="mx-auto flex w-full min-w-0 max-w-[1120px] flex-col gap-3 px-1 py-1 sm:px-2">
        <div>
          {onBack && !hideBackButton && (
            <button
              type="button"
              onClick={onBack}
              className="mb-2 inline-flex items-center gap-1.5 rounded-lg border border-harx-200 px-2.5 py-1.5 text-xs font-bold text-harx-600 transition-all hover:border-harx-300 hover:bg-harx-50/60"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t('trainingMethodology.back')}
            </button>
          )}
          <div className="text-center">
            <h1 className="mb-1 flex flex-wrap items-center justify-center gap-2 text-base font-extrabold tracking-tight text-gray-900 sm:text-lg">
              <Brain className="h-[18px] w-[18px] shrink-0 text-harx-500" />
              {t('trainingMethodology.title')}
            </h1>
            <p className="mx-auto max-w-3xl text-xs leading-relaxed text-gray-500 sm:text-sm">
              {t('trainingMethodology.subtitle')}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-harx-100/80 bg-harx-50/35 p-2 sm:p-3">
          <h2 className="mb-2 text-center text-[11px] font-bold uppercase tracking-wide text-gray-800">
            {t('trainingMethodology.includesTitle')}
          </h2>
          <div className="flex flex-wrap justify-center gap-1.5">
            {featureItems.map(({ id, Icon, label }) => (
              <div
                key={id}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-harx-100/70 bg-white px-2.5 py-1 text-left shadow-sm"
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-harx-500" />
                <span className="text-[11px] font-semibold leading-tight text-gray-800">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-center text-sm font-extrabold text-gray-900">{t('trainingMethodology.selectIndustry')}</h2>
          <div className="harx-method-grid">
            {industries.map((industry) => {
              const Icon = industry.icon;
              const isAvailable = industry.methodology !== null;
              const isSelectedSoon = selectedIndustry === industry.id;

              return (
                <div
                  key={industry.id}
                  role={isAvailable ? 'button' : undefined}
                  tabIndex={isAvailable ? 0 : undefined}
                  onClick={() => isAvailable && handleIndustrySelect(industry)}
                  onKeyDown={(e) => {
                    if (isAvailable && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      handleIndustrySelect(industry);
                    }
                  }}
                  className={`harx-method-card rounded-xl border bg-white p-3 transition-all duration-200 sm:p-4 ${
                    isAvailable
                      ? 'cursor-pointer border-gray-200 hover:border-harx-300 hover:shadow-md focus-visible:outline focus-visible:ring-2 focus-visible:ring-harx-500/25'
                      : 'border-gray-100 opacity-[0.82]'
                  } ${isSelectedSoon && !isAvailable ? 'ring-1 ring-harx-200/50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-2">
                      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-harx-500" />
                      <h3 className="text-sm font-bold leading-snug text-gray-900">{industry.name}</h3>
                    </div>
                    {isAvailable ? (
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    ) : (
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                    )}
                  </div>

                  <p className="text-xs leading-relaxed text-gray-500">{industry.description}</p>

                  <ul className="flex flex-col gap-1">
                    {industry.features.slice(0, 4).map((feature) => (
                      <li key={feature} className="text-xs leading-snug text-gray-700">
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-gray-500">
                    <div>
                      <span className="text-gray-400">{t('trainingMethodology.duration')}: </span>
                      <span className="font-semibold text-gray-800">{industry.duration}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">{t('trainingMethodology.cert')}: </span>
                      <span className="font-semibold text-gray-800">{t('trainingMethodology.levels', { count: industry.certificationLevels })}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!isAvailable}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isAvailable) handleIndustrySelect(industry);
                    }}
                    className={`w-full rounded-lg px-3 py-2.5 text-sm font-bold transition-all ${
                      isAvailable
                        ? 'bg-gradient-harx text-white shadow-sm hover:shadow-md hover:brightness-[1.03] active:brightness-[0.98]'
                        : 'cursor-not-allowed bg-gray-100 font-semibold text-gray-400'
                    }`}
                  >
                    {isAvailable ? t('trainingMethodology.select') : t('trainingMethodology.comingSoon')}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
