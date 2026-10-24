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
  HandCoins,
  ClipboardList,
  PhoneIncoming,
  CalendarCheck,
  ArrowUpCircle,
  RefreshCw,
  ShoppingCart,
  Umbrella,
  CreditCard,
  Landmark,
  Wallet,
  KeyRound,
  PiggyBank,
  Wifi,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { TrainingMethodology } from '../../types/methodology';
import {
  buildB2bServicesMethodology,
  buildCollectionsMethodology,
  buildProspectingMethodology,
  buildSurveyMethodology,
  buildWelcomeCallMethodology,
  healthInsuranceMethodologyForLanguage,
  matchMethodologyIdForGigCategory,
  type MethodologyLang,
} from '../../data/genericSalesMethodologies';
import {
  METHODOLOGY_GROUP_ORDER,
  TRANSACTION_SPECS,
  buildTransactionMethodology,
  type MethodologyGroup,
} from '../../data/transactionMethodologies';
import { buildGigSpecificMethodology, detectSectorIds, withoutForeignCompliance } from '../../data/gigMethodology';
import { scrollJourneyMainToTop } from './journeyScroll';

const SPEC_ICONS: Record<string, LucideIcon> = {
  'generic-inbound-sales': PhoneIncoming,
  'generic-appointment-setting': CalendarCheck,
  'generic-upsell': ArrowUpCircle,
  'generic-retention': RefreshCw,
  'generic-distance-selling': ShoppingCart,
  'insurance-auto': Car,
  'insurance-property': Home,
  'insurance-life': Shield,
  'insurance-protection': Umbrella,
  'insurance-professional': Building2,
  'finance-consumer-credit': CreditCard,
  'finance-mortgage': Landmark,
  'finance-investment': TrendingUp,
  'finance-banking': Wallet,
  'realestate-sales': Building2,
  'realestate-rental': KeyRound,
  'realestate-investment': PiggyBank,
  'regulated-energy': Zap,
  'regulated-telecom': Wifi,
  'regulated-healthcare': Stethoscope,
};

interface MethodologySelectorProps {
  onMethodologySelect: (methodology: TrainingMethodology) => void;
  onCustomMethodology: () => void;
  onBack?: () => void;
  /** When true, wizard footer provides Back — hide duplicate top Back */
  hideBackButton?: boolean;
  /** Gig.category of the GIG this training is for (e.g. "Outbound Sales", "Collections") —
   * used to highlight the methodology that matches the GIG's call type. */
  gigCategory?: string | null;
  /** Destination country name of the GIG (selectedGig.destination_zone?.name?.common) —
   * threaded into the regulatory module so it names the country to verify compliance for. */
  countryLabel?: string | null;
  /** The selected GIG: source of the gig-specific methodology. */
  gig?: unknown;
}

type IndustryGroup = 'gig' | MethodologyGroup;

type IndustryCard = {
  id: string;
  group: IndustryGroup;
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

export default function MethodologySelector({ onMethodologySelect, onBack, hideBackButton, gigCategory, countryLabel, gig }: MethodologySelectorProps) {
  const { t, i18n } = useTranslation();
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const lang: MethodologyLang = (i18n.resolvedLanguage || i18n.language || 'fr').toLowerCase().startsWith('en') ? 'en' : 'fr';
  const recommendedId = useMemo(() => matchMethodologyIdForGigCategory(gigCategory), [gigCategory]);
  // Sector cases matching the gig are highlighted and opened; the others stay folded away.
  const gigSectorIds = useMemo(() => detectSectorIds(gig), [gig]);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const industries = useMemo<IndustryCard[]>(() => {
    const country = countryLabel || undefined;
    const prospecting = buildProspectingMethodology(lang, country);
    const b2b = buildB2bServicesMethodology(lang, country);
    const collections = buildCollectionsMethodology(lang, country);
    const survey = buildSurveyMethodology(lang, country);
    const welcomeCall = buildWelcomeCallMethodology(lang, country);
    const health = withoutForeignCompliance(healthInsuranceMethodologyForLanguage(lang), country);
    const hours = (methodology: TrainingMethodology) =>
      t('trainingMethodology.hours', {
        count: methodology.components.reduce((sum, item) => sum + (item.estimatedDuration || 0), 0),
      });
    const gigMethodology = buildGigSpecificMethodology(lang, gig, country);
    const gigCard: IndustryCard[] = gigMethodology
      ? [
          {
            id: 'gig-specific',
            group: 'gig',
            name: gigMethodology.name,
            icon: Target,
            description: gigMethodology.description,
            methodology: gigMethodology,
            features: gigMethodology.components.map((item) => item.title),
            duration: hours(gigMethodology),
            certificationLevels: gigMethodology.certificationPath.levels.length,
          },
        ]
      : [];
    return [
      ...gigCard,
      {
        id: 'prospecting',
        group: 'generic',
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
        group: 'generic',
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
        group: 'insurance',
        name: health.name,
        icon: Heart,
        description: health.description,
        methodology: health,
        features: health.components.map((item) => item.title).slice(0, 8),
        duration: t('trainingMethodology.industries.health.duration'),
        certificationLevels: health.certificationPath.levels.length,
      },
      {
        id: 'collections',
        group: 'generic',
        name: collections.name,
        icon: HandCoins,
        description: collections.description,
        methodology: collections,
        features: collections.components.map((item) => item.title),
        duration: hours(collections),
        certificationLevels: collections.certificationPath.levels.length,
      },
      {
        id: 'satisfaction-survey',
        group: 'generic',
        name: survey.name,
        icon: ClipboardList,
        description: survey.description,
        methodology: survey,
        features: survey.components.map((item) => item.title),
        duration: hours(survey),
        certificationLevels: survey.certificationPath.levels.length,
      },
      {
        id: 'welcome-call',
        group: 'generic',
        name: welcomeCall.name,
        icon: PhoneIncoming,
        description: welcomeCall.description,
        methodology: welcomeCall,
        features: welcomeCall.components.map((item) => item.title),
        duration: hours(welcomeCall),
        certificationLevels: welcomeCall.certificationPath.levels.length,
      },
      ...TRANSACTION_SPECS.map((spec): IndustryCard => {
        const methodology = withoutForeignCompliance(buildTransactionMethodology(lang, spec, country), country);
        return {
          id: spec.id,
          group: spec.group,
          name: methodology.name,
          icon: SPEC_ICONS[spec.id] || Briefcase,
          description: methodology.description,
          methodology,
          features: methodology.components.map((item) => item.title),
          duration: hours(methodology),
          certificationLevels: methodology.certificationPath.levels.length,
        };
      }),
    ];
  }, [lang, t, countryLabel, gig]);

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

        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-xs leading-relaxed text-amber-900">
            <span className="font-bold">{t('trainingMethodology.aiDisclaimerTitle')}</span>{' '}
            {t('trainingMethodology.aiDisclaimerBody')}
          </p>
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
          {(['gig', ...METHODOLOGY_GROUP_ORDER] as IndustryGroup[]).map((group) => {
            const groupItems = industries.filter((industry) => industry.group === group);
            if (groupItems.length === 0) return null;
            const isSector = group !== 'gig' && group !== 'generic';
            const hasGigMatch = groupItems.some((industry) => gigSectorIds.includes(industry.id));
            const isOpen = !isSector || hasGigMatch || Boolean(openGroups[group]);
            return (
              <section key={group} className="mb-5">
                <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500">
                  {t(`trainingMethodology.groups.${group}`)}
                  {isSector && !hasGigMatch && (
                    <button
                      type="button"
                      onClick={() => setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] }))}
                      className="rounded-full border border-gray-200 px-2 py-0.5 text-[10px] font-semibold normal-case text-gray-600 hover:border-harx-300"
                    >
                      {openGroups[group] ? t('trainingMethodology.hideGroup') : t('trainingMethodology.showGroup', { count: groupItems.length })}
                    </button>
                  )}
                </h3>
                {isOpen && (
          <div className="harx-method-grid">
            {groupItems.map((industry) => {
              const Icon = industry.icon;
              const isAvailable = industry.methodology !== null;
              const isSelectedSoon = selectedIndustry === industry.id;
              const isRecommended =
                (!!recommendedId && industry.methodology?.id === recommendedId) || gigSectorIds.includes(industry.id);

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
                  className={`harx-method-card relative rounded-xl border bg-white p-3 transition-all duration-200 sm:p-4 ${
                    isAvailable
                      ? 'cursor-pointer border-gray-200 hover:border-harx-300 hover:shadow-md focus-visible:outline focus-visible:ring-2 focus-visible:ring-harx-500/25'
                      : 'border-gray-100 opacity-[0.82]'
                  } ${isSelectedSoon && !isAvailable ? 'ring-1 ring-harx-200/50' : ''} ${
                    isRecommended ? 'border-harx-400 ring-1 ring-harx-300/60' : ''
                  }`}
                >
                  {isRecommended && (
                    <span className="absolute -top-2 left-3 rounded-full bg-gradient-harx px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                      {t('trainingMethodology.recommendedForGig')}
                    </span>
                  )}
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
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
