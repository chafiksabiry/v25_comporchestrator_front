import { useState, useEffect } from 'react';
import { Building2, Loader2, Target, Users, Sparkles, Briefcase, AlertCircle, CheckCircle, ArrowRight, ArrowLeft, ChevronDown, Check } from 'lucide-react';
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
          setCompany(prev => ({
            ...prev,
            name: response.data.name,
            industry: response.data.industry
          }));
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
    if (el instanceof HTMLElement) {
      el.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [currentStep]);

  const steps = [
    { id: 1, label: 'Industry', icon: Building2 },
    { id: 2, label: 'Vision', icon: Target },
    { id: 3, label: 'Team', icon: Users },
    { id: 4, label: 'Methodology', icon: Sparkles },
  ];

  const handleNext = () => {
    if (currentStep === 5) {
      const realCompanyId = OnboardingService.getCompanyId();
      if (!realCompanyId) {
        console.error('[SetupWizard] No company ID found! Cannot create journey.');
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
          { id: '1', title: 'Upload & Transform Content', description: 'Upload existing materials and let AI transform them into engaging content', type: 'content-upload', status: 'pending', order: 1, estimatedTime: '15 minutes', requirements: ['Documents', 'Videos', 'Presentations'], outputs: ['Enhanced content', 'Media elements', 'Interactive components'] },
          { id: '2', title: 'AI Content Enhancement', description: 'AI analyzes and enhances your content with multimedia elements', type: 'ai-analysis', status: 'pending', order: 2, estimatedTime: '10 minutes', requirements: ['Uploaded content'], outputs: ['Videos', 'Audio narration', 'Infographics', 'Interactive elements'] },
          { id: '3', title: 'Curriculum Design', description: 'Structure your enhanced content into learning modules', type: 'curriculum-design', status: 'pending', order: 3, estimatedTime: '20 minutes', requirements: ['Enhanced content'], outputs: ['Learning modules', 'Assessments', 'Progress tracking'] },
          { id: '4', title: 'Live Training Setup', description: 'Configure live streaming and interactive sessions', type: 'live-setup', status: 'pending', order: 4, estimatedTime: '10 minutes', requirements: ['Curriculum'], outputs: ['Live sessions', 'Interactive features', 'Recording setup'] },
          { id: '5', title: 'Launch & Monitor', description: 'Deploy your training program and track progress', type: 'launch', status: 'pending', order: 5, estimatedTime: '5 minutes', requirements: ['Complete setup'], outputs: ['Live training program', 'Analytics dashboard', 'Progress reports'] },
        ],
        createdAt: new Date().toISOString(),
        estimatedDuration: trainingDetails?.estimatedDuration || journey.estimatedDuration || '1 hour total setup',
        targetRoles: journey.targetRoles || [],
      };

      onComplete(completeCompany, completeJourney, selectedMethodology || undefined, selectedGig?._id);
    } else if (currentStep === 3) {
      setShowMethodologySelector(true);
    } else if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleTrainingDetailsComplete = (details: { trainingName: string; trainingDescription: string; estimatedDuration: string }) => {
    setTrainingDetails(details);
    setCurrentStep(3);
  };

  const handleGigSelect = (gig: GigFromApi) => {
    setSelectedGig(gig);
  };

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
      case 4: return selectedMethodology !== null;
      case 5: return true;
      default: return true;
    }
  };

  /* ─────────────── Stepper (compact horizontal) ─────────────── */
  const renderStepper = () => (
    <div className="flex items-center justify-center gap-1">
      {steps.map((step, index) => {
        const isActive = currentStep === step.id;
        const isCompleted = currentStep > step.id;
        return (
          <React.Fragment key={step.id}>
            <button
              type="button"
              onClick={() => { if (isCompleted) setCurrentStep(step.id); }}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${
                isCompleted
                  ? 'cursor-pointer bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : isActive
                    ? 'bg-gradient-to-r from-fuchsia-50 to-purple-50 text-fuchsia-700 ring-1 ring-fuchsia-200'
                    : 'cursor-default text-gray-400'
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  isCompleted
                    ? 'bg-emerald-500 text-white'
                    : isActive
                      ? 'bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isCompleted ? <Check className="h-3 w-3" /> : step.id}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </button>
            {index < steps.length - 1 && (
              <div className={`h-px w-4 sm:w-6 ${isCompleted ? 'bg-emerald-300' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        );
      })}
      {currentStep === 5 && (
        <>
          <div className="h-px w-4 sm:w-6 bg-emerald-300" />
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
            <Check className="h-3 w-3" />
          </span>
        </>
      )}
    </div>
  );

  /* ─────────────── Step 1: Industry & Gig ─────────────── */
  const renderStep1Body = () => (
    <div className="mx-auto w-full max-w-lg space-y-4">
      {/* Title */}
      <div className="text-center">
        <h3 className="text-base font-bold text-gray-900">Welcome to your training journey</h3>
        <p className="mt-0.5 text-xs text-gray-500">Industry templates · Smart defaults · Compliance</p>
      </div>

      {loadingCompany ? (
        <div className="flex flex-col items-center justify-center py-6">
          <Loader2 className="mb-2 h-5 w-5 animate-spin text-fuchsia-500" />
          <p className="text-xs text-gray-500">Loading company information...</p>
        </div>
      ) : companyData ? (
        <div className="space-y-3">
          {/* Industry select */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">
              Training industry <span className="text-rose-500">*</span>
            </label>
            {loadingIndustries ? (
              <div className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2.5">
                <Loader2 className="h-4 w-4 animate-spin text-fuchsia-500" />
                <span className="text-xs text-gray-500">Loading...</span>
              </div>
            ) : (
              <div className="relative">
                <select
                  value={company.industry || ''}
                  onChange={(e) => setCompany({ ...company, industry: e.target.value })}
                  className="w-full cursor-pointer appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-3 pr-10 text-sm text-gray-900 shadow-sm transition-all outline-none hover:border-fuchsia-300 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20"
                >
                  <option value="" className="text-gray-400">Select industry...</option>
                  {industries.map((industry) => (
                    <option key={industry._id} value={industry._id}>{industry.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
              </div>
            )}
          </div>

          {/* Gig select */}
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-gray-700">
              <Briefcase className="h-3.5 w-3.5 text-fuchsia-500" />
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
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              <span className="font-medium">{selectedGig.title}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="py-4 text-center">
          <AlertCircle className="mx-auto mb-2 h-7 w-7 text-red-400" />
          <p className="text-sm text-red-600">Failed to load company data</p>
        </div>
      )}
    </div>
  );

  /* ─────────────── Step 3: Team & Roles ─────────────── */
  const renderStep3 = () => (
    <div className="space-y-5">
      <div className="text-center">
        <h3 className="flex items-center justify-center gap-2 text-base font-bold text-gray-900 md:text-lg">
          <Users className="h-5 w-5 text-fuchsia-600" aria-hidden />
          Identify your learners
        </h3>
        <p className="mt-1 text-xs text-gray-500">Role-based paths · Skill assessments · Personalization</p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-gray-800">
          Target roles & departments <span className="text-rose-500">*</span>
        </label>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {[
            { role: 'Customer Success Representatives', dept: 'Customer Success', icon: '🎯' },
            { role: 'Sales Representatives', dept: 'Sales', icon: '💼' },
            { role: 'Support Agents', dept: 'Customer Support', icon: '🛟' },
            { role: 'Account Managers', dept: 'Sales', icon: '🤝' },
            { role: 'Product Specialists', dept: 'Product', icon: '⚙️' },
            { role: 'New Hires', dept: 'All Departments', icon: '🌟' },
            { role: 'Team Leaders', dept: 'Management', icon: '👥' },
            { role: 'All Employees', dept: 'Company-wide', icon: '🏢' },
          ].map((item) => (
            <label key={item.role} className="flex cursor-pointer items-center rounded-lg border border-gray-200 p-2 transition-all hover:border-purple-300 hover:bg-purple-50">
              <input
                type="checkbox"
                checked={journey.targetRoles?.includes(item.role) || false}
                onChange={(e) => {
                  const currentRoles = journey.targetRoles || [];
                  if (e.target.checked) {
                    setJourney({ ...journey, targetRoles: [...currentRoles, item.role] });
                  } else {
                    setJourney({ ...journey, targetRoles: currentRoles.filter(r => r !== item.role) });
                  }
                }}
                className="mr-2 h-3.5 w-3.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <div className="flex items-center space-x-1.5">
                <span className="text-sm">{item.icon}</span>
                <div>
                  <div className="text-[11px] font-medium leading-tight text-gray-900">{item.role}</div>
                  <div className="text-[9px] text-gray-500">{item.dept}</div>
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  /* ─────────────── Step 5: Summary ─────────────── */
  const renderStep5 = () => (
    <div className="space-y-5">
      <div className="text-center">
        <h3 className="flex items-center justify-center gap-2 text-base font-bold text-gray-900 md:text-lg">
          <CheckCircle className="h-5 w-5 text-emerald-600" aria-hidden />
          Setup complete
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          360° methodology applied. Upload and transform content next.
        </p>
      </div>

      <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200">
        <div className="px-4 py-3">
          <h5 className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500">
            <Building2 className="h-4 w-4 text-fuchsia-600" />
            Industry & gig
          </h5>
          <ul className="space-y-0.5 text-sm text-gray-700">
            <li className="line-clamp-2">
              {(() => {
                if (company.industry) {
                  const ind = industries.find(i => i._id === company.industry);
                  return ind ? ind.name : company.industry;
                }
                return 'N/A';
              })()}
            </li>
            <li className="line-clamp-2 text-gray-500">{selectedGig?.title || 'No gig selected'}</li>
          </ul>
        </div>
        <div className="px-4 py-3">
          <h5 className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500">
            <Target className="h-4 w-4 text-fuchsia-600" />
            Training program
          </h5>
          <ul className="space-y-0.5 text-sm text-gray-700">
            <li>{trainingDetails?.trainingName || selectedGig?.title || 'N/A'}</li>
            <li className="text-gray-500">
              {trainingDetails?.estimatedDuration
                ? (() => {
                    const m = parseInt(trainingDetails.estimatedDuration);
                    if (m >= 1440) return `${Math.round(m / 1440)} day(s)`;
                    if (m >= 60) return `${Math.round(m / 60)} hour(s)`;
                    return `${m} minute(s)`;
                  })()
                : journey.estimatedDuration || 'N/A'}
            </li>
            <li className="text-gray-500">{journey.targetRoles?.length || 0} target roles</li>
          </ul>
        </div>
        {selectedMethodology && (
          <div className="px-4 py-3">
            <h5 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500">
              <Sparkles className="h-4 w-4 text-fuchsia-600" />
              Methodology
            </h5>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {selectedMethodology.components?.slice(0, showAllComponents ? undefined : 6).map((c: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  <span className="line-clamp-1">{c.title}</span>
                </div>
              ))}
            </div>
            {selectedMethodology.components && selectedMethodology.components.length > 6 && (
              <button
                type="button"
                onClick={() => setShowAllComponents(!showAllComponents)}
                className="mt-2 text-xs font-semibold text-fuchsia-700 hover:text-fuchsia-800"
              >
                {showAllComponents ? 'Show less' : `+${selectedMethodology.components.length - 6} more`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  /* ─────────────── Generic content for steps 3/5 ─────────────── */
  const renderGenericStepContent = () => {
    switch (currentStep) {
      case 3: return renderStep3();
      case 5: return renderStep5();
      default: return null;
    }
  };

  /* ─────────────── Shared footer ─────────────── */
  const renderFooter = () => (
    <div className="flex shrink-0 items-center justify-between border-t border-gray-100 bg-white px-4 py-2 md:px-6">
      <button
        type="button"
        onClick={() => {
          if (currentStep === 5) setCurrentStep(4);
          else if (currentStep > 1) setCurrentStep(currentStep - 1);
        }}
        disabled={currentStep === 1}
        className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
          currentStep === 1
            ? 'cursor-not-allowed text-gray-300'
            : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
        }`}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </button>

      <span className="text-[11px] text-gray-400">
        Step {currentStep > 4 ? 4 : currentStep} of {steps.length}
      </span>

      <button
        type="button"
        onClick={handleNext}
        disabled={!isStepValid()}
        className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-fuchsia-500 to-purple-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:shadow-md hover:from-fuchsia-600 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {currentStep === 5 ? 'Start building' : 'Continue'}
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  /* ─────────────── Main layout (same shell for every step) ─────────────── */

  if (currentStep === 4) return null;

  const isStep2 = currentStep === 2;

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-white">
      {/* Stepper */}
      <div className="shrink-0 border-b border-gray-100 px-3 py-2">
        {renderStepper()}
      </div>

      {/* Body + footer wrapper: flex-1 so footer stays at bottom */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          className={`mx-auto w-full max-w-3xl px-4 md:px-6 ${
            currentStep === 1
              ? 'shrink-0 pt-3 pb-2'
              : 'min-h-0 flex-1 overflow-y-auto py-3'
          }`}
        >
          {currentStep === 1 && renderStep1Body()}
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

        {!isStep2 && <div className="mt-auto">{renderFooter()}</div>}
      </div>
    </div>
  );
}
