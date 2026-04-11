import { useState, useEffect } from 'react';
import { Building2, Loader2, Target, Users, Sparkles, Briefcase, AlertCircle, CheckCircle, ArrowRight, ArrowLeft, ChevronDown, Check, Zap, Shield, BarChart3 } from 'lucide-react';
import { Company, TrainingJourney } from '../../types/core';
import { Industry, GigFromApi } from '../../types';
import { TrainingMethodology } from '../../types/methodology';
import MethodologySelector from './MethodologySelector';
import MethodologyBuilder from '../Methodology/MethodologyBuilder';
import { OnboardingService } from '../../infrastructure/services/OnboardingService';
import GigSelector from '../Dashboard/GigSelector';
import TrainingDetailsForm from './TrainingDetailsForm';
import React from 'react';

interface SetupWizardProps {
  onComplete: (company: Company, journey: TrainingJourney, methodology?: TrainingMethodology, gigId?: string) => void;
}

const STEP_META = [
  {
    id: 1,
    label: 'Industry',
    icon: Building2,
    title: 'Industry & Gig',
    headline: 'Set up your training context',
    description: 'Choose your industry and gig to unlock AI-powered templates tailored to your business.',
    features: [
      { icon: Zap, text: 'AI-powered templates' },
      { icon: Shield, text: 'Compliance ready' },
      { icon: BarChart3, text: 'Smart defaults' },
    ],
  },
  {
    id: 2,
    label: 'Vision',
    icon: Target,
    title: 'Training Vision',
    headline: 'Define your objectives',
    description: 'Name your program, set duration, and let AI suggest goals aligned with your industry.',
    features: [
      { icon: Target, text: 'AI-suggested goals' },
      { icon: BarChart3, text: 'Success metrics' },
      { icon: Zap, text: 'Timeline planning' },
    ],
  },
  {
    id: 3,
    label: 'Team',
    icon: Users,
    title: 'Team & Roles',
    headline: 'Identify your learners',
    description: 'Select target roles and departments to create personalized learning paths.',
    features: [
      { icon: Users, text: 'Role-based paths' },
      { icon: BarChart3, text: 'Skill assessments' },
      { icon: Sparkles, text: 'Personalization' },
    ],
  },
  {
    id: 4,
    label: 'Methodology',
    icon: Sparkles,
    title: 'Methodology',
    headline: 'Choose your approach',
    description: 'Select a comprehensive training methodology that fits your organization.',
    features: [
      { icon: Sparkles, text: '360° methodology' },
      { icon: Shield, text: 'Industry-specific' },
      { icon: Zap, text: 'Compliance-ready' },
    ],
  },
];

const STEP5_META = {
  title: 'Review',
  headline: 'Ready to build',
  description: 'Your training program is configured. Review the summary and start building content.',
  features: [
    { icon: CheckCircle, text: 'Setup complete' },
    { icon: Sparkles, text: 'Methodology applied' },
    { icon: ArrowRight, text: 'Start content upload' },
  ],
};

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [company, setCompany] = useState<Partial<Company>>({});
  const [companyData, setCompanyData] = useState<any>(null);
  const [journey, setJourney] = useState<Partial<TrainingJourney>>({});
  const [selectedMethodology, setSelectedMethodology] = useState<TrainingMethodology | null>(null);
  const [showMethodologySelector, setShowMethodologySelector] = useState(false);
  const [showMethodologyBuilder, setShowMethodologyBuilder] = useState(false);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [loadingIndustries, setLoadingIndustries] = useState(true);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [selectedGig, setSelectedGig] = useState<GigFromApi | null>(null);
  const [trainingDetails, setTrainingDetails] = useState<{ trainingName: string; trainingDescription: string; estimatedDuration: string } | null>(null);
  const [showAllComponents, setShowAllComponents] = useState(false);

  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        setLoadingCompany(true);
        const response = await OnboardingService.fetchCompanyData();
        if (response.success && response.data) {
          setCompanyData(response.data);
          setCompany(prev => ({ ...prev, name: response.data.name, industry: response.data.industry }));
        }
      } catch (error) {
        console.error('Error fetching company data:', error);
      } finally {
        setLoadingCompany(false);
      }
    };
    fetchCompanyData();
  }, []);

  useEffect(() => {
    const fetchIndustries = async () => {
      try {
        setLoadingIndustries(true);
        const response = await OnboardingService.fetchIndustries();
        if (response.success && response.data) {
          setIndustries(response.data.filter(ind => ind.isActive));
        }
      } catch (error) {
        console.error('Error fetching industries:', error);
      } finally {
        setLoadingIndustries(false);
      }
    };
    fetchIndustries();
  }, []);

  useEffect(() => {
    const el = document.querySelector('[data-journey-main-scroll]');
    if (el instanceof HTMLElement) el.scrollTo({ top: 0, behavior: 'auto' });
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep === 5) {
      const realCompanyId = OnboardingService.getCompanyId();
      if (!realCompanyId) {
        alert('Internal Error: Company ID not found. Please refresh the page.');
        return;
      }
      const completeCompany: Company = {
        id: realCompanyId,
        name: companyData?.name || companyData?.data?.name || company.name || '',
        industry: company.industry || '',
        size: company.size || 'medium',
        setupComplete: true,
      };
      const completeJourney: TrainingJourney = {
        id: Date.now().toString(),
        companyId: completeCompany.id,
        name: trainingDetails?.trainingName || selectedGig?.title || 'New Training Journey',
        description: trainingDetails?.trainingDescription || selectedGig?.description || '',
        status: 'draft',
        steps: [
          { id: '1', title: 'Upload & Transform Content', description: 'Upload existing materials and let AI transform them', type: 'content-upload', status: 'pending', order: 1, estimatedTime: '15 minutes', requirements: ['Documents', 'Videos', 'Presentations'], outputs: ['Enhanced content', 'Media elements', 'Interactive components'] },
          { id: '2', title: 'AI Content Enhancement', description: 'AI analyzes and enhances your content', type: 'ai-analysis', status: 'pending', order: 2, estimatedTime: '10 minutes', requirements: ['Uploaded content'], outputs: ['Videos', 'Audio narration', 'Infographics'] },
          { id: '3', title: 'Curriculum Design', description: 'Structure your content into learning modules', type: 'curriculum-design', status: 'pending', order: 3, estimatedTime: '20 minutes', requirements: ['Enhanced content'], outputs: ['Learning modules', 'Assessments'] },
          { id: '4', title: 'Live Training Setup', description: 'Configure live streaming and interactive sessions', type: 'live-setup', status: 'pending', order: 4, estimatedTime: '10 minutes', requirements: ['Curriculum'], outputs: ['Live sessions', 'Interactive features'] },
          { id: '5', title: 'Launch & Monitor', description: 'Deploy your training program', type: 'launch', status: 'pending', order: 5, estimatedTime: '5 minutes', requirements: ['Complete setup'], outputs: ['Live training program', 'Analytics dashboard'] },
        ],
        createdAt: new Date().toISOString(),
        estimatedDuration: trainingDetails?.estimatedDuration || journey.estimatedDuration || '1 hour total setup',
        targetRoles: journey.targetRoles || [],
      };
      onComplete(completeCompany, completeJourney, selectedMethodology || undefined, selectedGig?._id);
    } else if (currentStep === 3) {
      setShowMethodologySelector(true);
    } else if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep === 5) setCurrentStep(4);
    else if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleTrainingDetailsComplete = (details: { trainingName: string; trainingDescription: string; estimatedDuration: string }) => {
    setTrainingDetails(details);
    setCurrentStep(3);
  };

  const handleGigSelect = (gig: GigFromApi) => setSelectedGig(gig);

  const handleMethodologySelect = (methodology: TrainingMethodology) => {
    setSelectedMethodology(methodology);
    setShowMethodologySelector(false);
    setCurrentStep(5);
  };

  const handleMethodologyApply = (methodology: TrainingMethodology) => {
    setSelectedMethodology(methodology);
    setShowMethodologyBuilder(false);
    setCurrentStep(5);
  };

  const handleCustomMethodology = () => {
    setShowMethodologySelector(false);
    setCurrentStep(5);
  };

  if (showMethodologySelector) {
    return (
      <MethodologySelector
        onMethodologySelect={handleMethodologySelect}
        onCustomMethodology={handleCustomMethodology}
        onBack={() => { setShowMethodologySelector(false); setCurrentStep(3); }}
      />
    );
  }

  if (showMethodologyBuilder) {
    return (
      <MethodologyBuilder
        onApplyMethodology={handleMethodologyApply}
        selectedIndustry={company.industry}
      />
    );
  }

  const isStepValid = () => {
    switch (currentStep) {
      case 1: return companyData && company.industry && selectedGig !== null;
      case 2: return trainingDetails !== null;
      case 3: return journey.targetRoles && journey.targetRoles.length > 0;
      case 5: return true;
      default: return true;
    }
  };

  const meta = currentStep === 5 ? STEP5_META : STEP_META.find(s => s.id === currentStep) || STEP_META[0];
  const displayStep = currentStep > 4 ? 4 : currentStep;

  /* ─── Left info panel ─── */
  const LeftPanel = () => (
    <div className="hidden w-[260px] shrink-0 flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-800 to-purple-950 p-5 lg:flex xl:w-[280px] xl:p-6">
      <div>
        <div className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white/50">
          Step {displayStep} of 4
        </div>
        <h2 className="mt-3 text-lg font-bold leading-snug text-white xl:text-xl">{meta.headline}</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-white/50">{meta.description}</p>
      </div>

      <div className="space-y-3">
        {meta.features.map((f, i) => {
          const Icon = f.icon;
          return (
            <div key={i} className="flex items-center gap-2.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/[0.07]">
                <Icon className="h-3.5 w-3.5 text-purple-300" />
              </div>
              <span className="text-[13px] text-white/70">{f.text}</span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        {STEP_META.map((s) => (
          <div
            key={s.id}
            className={`h-1 rounded-full transition-all duration-300 ${
              s.id === displayStep ? 'w-8 bg-purple-400' : s.id < displayStep ? 'w-3 bg-emerald-400/70' : 'w-3 bg-white/10'
            }`}
          />
        ))}
      </div>
    </div>
  );

  /* ─── Mobile header (when left panel is hidden) ─── */
  const MobileHeader = () => (
    <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-2 lg:hidden">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Step {displayStep}/4</span>
        <span className="text-xs font-bold text-gray-800">{meta.title}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {STEP_META.map((s) => (
          <div
            key={s.id}
            className={`h-1 rounded-full transition-all ${
              s.id === displayStep ? 'w-4 bg-fuchsia-500' : s.id < displayStep ? 'w-1.5 bg-emerald-400' : 'w-1.5 bg-gray-200'
            }`}
          />
        ))}
      </div>
    </div>
  );

  /* ─── Footer nav ─── */
  const Footer = () => (
    <div className="shrink-0 border-t border-gray-100 bg-white px-5 py-2.5 md:px-8">
      <div className="mx-auto flex max-w-lg items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          disabled={currentStep === 1}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
            currentStep === 1
              ? 'cursor-not-allowed text-gray-300'
              : 'border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={!isStepValid()}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-fuchsia-600 to-purple-600 px-5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:from-fuchsia-700 hover:to-purple-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
        >
          {currentStep === 5 ? 'Start building' : 'Continue'}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );

  /* ─── Step contents ─── */
  const renderStep1 = () => (
    <div className="mx-auto w-full max-w-lg space-y-5">
      {loadingCompany ? (
        <div className="flex flex-col items-center justify-center py-10">
          <Loader2 className="mb-3 h-6 w-6 animate-spin text-fuchsia-500" />
          <p className="text-sm text-gray-400">Loading company information...</p>
        </div>
      ) : companyData ? (
        <>
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-gray-800">
              Training industry <span className="text-rose-500">*</span>
            </label>
            {loadingIndustries ? (
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-gray-200 px-3 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                <span className="text-xs text-gray-400">Loading industries...</span>
              </div>
            ) : (
              <div className="relative">
                <select
                  value={company.industry || ''}
                  onChange={(e) => setCompany({ ...company, industry: e.target.value })}
                  className="w-full cursor-pointer appearance-none rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm transition-all outline-none hover:border-gray-300 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/15"
                >
                  <option value="">Select industry...</option>
                  {industries.map((ind) => (
                    <option key={ind._id} value={ind._id}>{ind.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-gray-800">
              <Briefcase className="h-3.5 w-3.5 text-gray-400" />
              Your gig <span className="text-rose-500">*</span>
            </label>
            <GigSelector
              industryFilter={company.industry}
              industryName={industries.find(ind => ind._id === company.industry)?.name || company.industry}
              onGigSelect={handleGigSelect}
              selectedGigId={selectedGig?._id}
            />
          </div>

          {selectedGig && (
            <div className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5">
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
              <div>
                <p className="text-xs font-semibold text-emerald-900">{selectedGig.title}</p>
                {selectedGig.description && (
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-emerald-700/70">{selectedGig.description}</p>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="py-8 text-center">
          <AlertCircle className="mx-auto mb-2 h-8 w-8 text-red-400" />
          <p className="text-sm text-red-500">Failed to load company data</p>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="mx-auto w-full max-w-lg space-y-4">
      <div>
        <label className="mb-2 block text-[13px] font-semibold text-gray-800">
          Target roles & departments <span className="text-rose-500">*</span>
        </label>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {[
            { role: 'Customer Success Representatives', dept: 'Customer Success', icon: '🎯' },
            { role: 'Sales Representatives', dept: 'Sales', icon: '💼' },
            { role: 'Support Agents', dept: 'Customer Support', icon: '🛟' },
            { role: 'Account Managers', dept: 'Sales', icon: '🤝' },
            { role: 'Product Specialists', dept: 'Product', icon: '⚙️' },
            { role: 'New Hires', dept: 'All Departments', icon: '🌟' },
            { role: 'Team Leaders', dept: 'Management', icon: '👥' },
            { role: 'All Employees', dept: 'Company-wide', icon: '🏢' },
          ].map((item) => {
            const selected = journey.targetRoles?.includes(item.role) || false;
            return (
              <label
                key={item.role}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 transition-all ${
                  selected
                    ? 'border-purple-300 bg-purple-50/80 ring-1 ring-purple-200'
                    : 'border-gray-150 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(e) => {
                    const roles = journey.targetRoles || [];
                    setJourney({
                      ...journey,
                      targetRoles: e.target.checked ? [...roles, item.role] : roles.filter(r => r !== item.role),
                    });
                  }}
                  className="sr-only"
                />
                <div className={`flex h-4.5 w-4.5 items-center justify-center rounded border text-white transition-colors ${
                  selected ? 'border-purple-500 bg-purple-500' : 'border-gray-300 bg-white'
                }`}>
                  {selected && <Check className="h-3 w-3" />}
                </div>
                <span className="text-base leading-none">{item.icon}</span>
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium text-gray-900">{item.role}</div>
                  <div className="text-[10px] text-gray-400">{item.dept}</div>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="mx-auto w-full max-w-lg space-y-4">
      <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
        <div className="px-4 py-3">
          <h5 className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            <Building2 className="h-3.5 w-3.5 text-fuchsia-500" /> Industry & Gig
          </h5>
          <p className="text-sm text-gray-800">
            {(() => {
              if (company.industry) {
                const ind = industries.find(i => i._id === company.industry);
                return ind ? ind.name : company.industry;
              }
              return 'N/A';
            })()}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">{selectedGig?.title || 'No gig selected'}</p>
        </div>
        <div className="px-4 py-3">
          <h5 className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            <Target className="h-3.5 w-3.5 text-fuchsia-500" /> Training Program
          </h5>
          <p className="text-sm text-gray-800">{trainingDetails?.trainingName || selectedGig?.title || 'N/A'}</p>
          <p className="mt-0.5 text-xs text-gray-500">
            {trainingDetails?.estimatedDuration
              ? (() => {
                  const m = parseInt(trainingDetails.estimatedDuration);
                  if (m >= 1440) return `${Math.round(m / 1440)} day(s)`;
                  if (m >= 60) return `${Math.round(m / 60)} hour(s)`;
                  return `${m} minute(s)`;
                })()
              : journey.estimatedDuration || 'N/A'}
            {' · '}{journey.targetRoles?.length || 0} target roles
          </p>
        </div>
        {selectedMethodology && (
          <div className="px-4 py-3">
            <h5 className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              <Sparkles className="h-3.5 w-3.5 text-fuchsia-500" /> Methodology
            </h5>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {selectedMethodology.components?.slice(0, showAllComponents ? undefined : 6).map((c: any, i: number) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-gray-700">
                  <Check className="h-3 w-3 shrink-0 text-emerald-500" />
                  <span className="truncate">{c.title}</span>
                </div>
              ))}
            </div>
            {selectedMethodology.components && selectedMethodology.components.length > 6 && (
              <button
                type="button"
                onClick={() => setShowAllComponents(!showAllComponents)}
                className="mt-1.5 text-[11px] font-semibold text-fuchsia-600 hover:text-fuchsia-700"
              >
                {showAllComponents ? 'Show less' : `+${selectedMethodology.components.length - 6} more`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  /* ─── Main layout ─── */

  if (currentStep === 4) return null;

  const isStep2 = currentStep === 2;

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-white">
      <LeftPanel />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <MobileHeader />

        {/* Scrollable content area */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-8 md:py-6">
          {currentStep === 1 && renderStep1()}
          {isStep2 && (
            <TrainingDetailsForm
              onComplete={handleTrainingDetailsComplete}
              onBack={() => setCurrentStep(1)}
              gigData={selectedGig}
            />
          )}
          {currentStep === 3 && renderStep3()}
          {currentStep === 5 && renderStep5()}
        </div>

        {!isStep2 && <Footer />}
      </div>
    </div>
  );
}
