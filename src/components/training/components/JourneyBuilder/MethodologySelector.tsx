import { useState, useEffect } from 'react';
import {
  Building2,
  Heart,
  Car,
  Home,
  Stethoscope,
  Shield,
  TrendingUp,
  Users,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Clock,
  Target,
  Sparkles,
  Brain,
  BookOpen,
  Zap,
} from 'lucide-react';
import { TrainingMethodology } from '../../types/methodology';
import { healthInsuranceMethodology } from '../../data/healthInsuranceMethodology';

interface MethodologySelectorProps {
  onMethodologySelect: (methodology: TrainingMethodology) => void;
  onCustomMethodology: () => void;
  onBack?: () => void;
  /** When true, wizard footer provides Back — hide duplicate top Back */
  hideBackButton?: boolean;
}

export default function MethodologySelector({ onMethodologySelect, onCustomMethodology, onBack, hideBackButton }: MethodologySelectorProps) {
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);

  const industries = [
    {
      id: 'health-insurance',
      name: 'Health Insurance Brokerage',
      icon: Heart,
      description: 'Comprehensive training for health insurance brokers covering regulatory compliance, product knowledge, and sales excellence',
      methodology: healthInsuranceMethodology,
      features: [
        'ACA & State Regulation Compliance',
        'Product Mastery (Individual, Group, Medicare)',
        'Sales Process Excellence',
        'Customer Service & Retention',
        'Technology Platform Training',
        'EU GDPR & IDD Compliance',
        'Contact Centre Operations',
        'Multi-Regional Support',
      ],
      duration: '120+ hours',
      certificationLevels: 3,
    },
    {
      id: 'auto-insurance',
      name: 'Auto Insurance Sales',
      icon: Car,
      description: 'Complete auto insurance sales training with state regulations and product expertise',
      methodology: null,
      features: [
        'State Insurance Regulations',
        'Auto Insurance Products',
        'Claims Process & Customer Service',
        'Sales Techniques & Objection Handling',
        'Technology Systems Training',
        'Contact Centre Quality Standards',
      ],
      duration: '80+ hours',
      certificationLevels: 3,
    },
    {
      id: 'property-insurance',
      name: 'Property Insurance',
      icon: Home,
      description: 'Property and casualty insurance training with risk assessment and underwriting',
      methodology: null,
      features: [
        'Property Risk Assessment',
        'Underwriting Guidelines',
        'Claims Management',
        'Customer Consultation',
        'Regulatory Compliance',
        'Contact Centre Operations',
      ],
      duration: '90+ hours',
      certificationLevels: 3,
    },
    {
      id: 'life-insurance',
      name: 'Life Insurance Sales',
      icon: Shield,
      description: 'Life insurance and financial planning with estate planning and investment knowledge',
      methodology: null,
      features: [
        'Life Insurance Products',
        'Financial Planning Basics',
        'Estate Planning Concepts',
        'Investment Products',
        'Ethical Sales Practices',
        'Contact Centre Excellence',
      ],
      duration: '100+ hours',
      certificationLevels: 4,
    },
    {
      id: 'financial-services',
      name: 'Financial Services',
      icon: TrendingUp,
      description: 'Comprehensive financial services training including investments, banking, and advisory services',
      methodology: null,
      features: [
        'Investment Products & Strategies',
        'Banking Services & Regulations',
        'Financial Advisory Skills',
        'Risk Management',
        'Compliance & Ethics',
        'Multi-Channel Customer Service',
      ],
      duration: '150+ hours',
      certificationLevels: 4,
    },
    {
      id: 'healthcare',
      name: 'Healthcare Services',
      icon: Stethoscope,
      description: 'Healthcare industry training covering patient care, regulations, and service excellence',
      methodology: null,
      features: [
        'Patient Care Standards',
        'Healthcare Regulations',
        'Medical Terminology',
        'Service Excellence',
        'Technology Systems',
        'Patient Communication Standards',
      ],
      duration: '110+ hours',
      certificationLevels: 3,
    },
  ];

  const handleIndustrySelect = (industry: (typeof industries)[0]) => {
    if (industry.methodology) {
      onMethodologySelect(industry.methodology);
    } else {
      setSelectedIndustry(industry.id);
    }
  };

  useEffect(() => {
    const el = document.querySelector('[data-journey-main-scroll]');
    if (el instanceof HTMLElement) el.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const featureItems = [
    { Icon: BookOpen, label: 'Foundational Knowledge' },
    { Icon: Shield, label: 'Regulatory Compliance' },
    { Icon: Building2, label: 'Industry Expertise' },
    { Icon: Zap, label: 'Operational Excellence' },
    { Icon: Users, label: 'Company Integration' },
    { Icon: Target, label: 'Professional Development' },
  ];

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-white">
      <div className="flex min-h-0 flex-1 flex-col px-5 pt-3 pb-4 md:px-7">
        <div className="mx-auto flex w-full max-w-5xl min-h-0 flex-1 flex-col">
          <div className="mb-3 shrink-0">
            {onBack && !hideBackButton && (
              <button
                type="button"
                onClick={onBack}
                className="mb-2 inline-flex items-center gap-1.5 rounded-lg border border-harx-200 px-2.5 py-1.5 text-xs font-bold text-harx-600 transition-all hover:border-harx-300 hover:bg-harx-50/60"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
            )}
            <div className="text-center">
              <h1 className="mb-1 flex items-center justify-center gap-2 text-[17px] font-extrabold tracking-tight text-gray-900 md:text-lg">
                <Brain className="h-[18px] w-[18px] shrink-0 text-harx-500" />
                Choose Your Industry Training Methodology
              </h1>
              <p className="mx-auto max-w-2xl text-xs leading-snug text-gray-500">
                Select from our comprehensive, industry-specific training methodologies covering all aspects of development.
              </p>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pb-1">
            <div className="mb-3 rounded-xl border border-harx-100/80 bg-harx-50/35 p-3">
              <h2 className="mb-2 text-center text-xs font-bold uppercase tracking-wide text-gray-800">
                Our 360° Methodology Includes
              </h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {featureItems.map(({ Icon, label }) => (
                  <div
                    key={label}
                    className="flex flex-col items-center justify-center rounded-lg border border-harx-100/70 bg-white px-1.5 py-2 text-center shadow-sm"
                  >
                    <Icon className="mb-1 h-4 w-4 text-harx-500" />
                    <h3 className="text-[10px] font-semibold leading-tight text-gray-800">{label}</h3>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-2">
              <h2 className="mb-2 text-center text-sm font-extrabold text-gray-900">Select Your Industry</h2>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
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
                      className={`rounded-xl border bg-white p-3 transition-all duration-200 ${
                        isAvailable
                          ? 'cursor-pointer border-gray-200 hover:border-harx-300 hover:shadow-md focus-visible:outline focus-visible:ring-2 focus-visible:ring-harx-500/25'
                          : 'border-gray-100 opacity-[0.82]'
                      } ${isSelectedSoon && !isAvailable ? 'ring-1 ring-harx-200/50' : ''}`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <Icon className="h-5 w-5 shrink-0 text-harx-500" />
                          <h3 className="truncate text-sm font-bold text-gray-900">{industry.name}</h3>
                        </div>
                        {isAvailable ? (
                          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
                        ) : (
                          <Clock className="h-4 w-4 shrink-0 text-gray-400" />
                        )}
                      </div>

                      <p className="mb-2 line-clamp-2 text-[10px] leading-snug text-gray-500">{industry.description}</p>

                      <div className="mb-2 rounded-lg border border-gray-100 bg-gray-50/80 p-2">
                        <p className="text-[9px] leading-snug text-gray-600">
                          <span className="font-bold text-gray-800">Includes:</span> {industry.features.join(', ')}
                        </p>
                      </div>

                      <div className="mb-2 flex items-center justify-between px-0.5 text-[10px] text-gray-500">
                        <div>
                          <span className="text-gray-400">Duration: </span>
                          <span className="font-semibold text-gray-800">{industry.duration}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Cert: </span>
                          <span className="font-semibold text-gray-800">{industry.certificationLevels} lvl</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={!isAvailable}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isAvailable) handleIndustrySelect(industry);
                        }}
                        className={`w-full rounded-lg py-2 text-xs font-bold transition-all ${
                          isAvailable
                            ? 'bg-gradient-harx text-white shadow-sm hover:shadow-md hover:brightness-[1.03] active:brightness-[0.98]'
                            : 'cursor-not-allowed bg-gray-100 font-semibold text-gray-400'
                        }`}
                      >
                        {isAvailable ? 'Select Methodology' : 'Coming Soon'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-2 flex flex-col gap-3 rounded-xl border border-dashed border-harx-200/90 bg-harx-50/25 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="flex min-w-0 items-start gap-2.5 text-left sm:items-center">
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-harx-400 sm:mt-0" />
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-gray-900">Don&apos;t see your industry?</h3>
                  <p className="text-[10px] leading-snug text-gray-500">
                    Create a custom training methodology tailored to your specific requirements.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onCustomMethodology}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 self-stretch rounded-lg border border-harx-200 bg-white px-3 py-2 text-xs font-bold text-harx-600 shadow-sm transition-all hover:border-harx-300 hover:bg-harx-50/80 sm:self-auto"
              >
                <Brain className="h-3.5 w-3.5" />
                <span>Build custom</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
