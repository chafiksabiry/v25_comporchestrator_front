import { useState, useEffect } from 'react';
import { Building2, Loader2, Target, Users, Sparkles, Briefcase, AlertCircle, CheckCircle, ArrowRight, ChevronDown } from 'lucide-react';
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

  // Industries and Gigs state
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [loadingIndustries, setLoadingIndustries] = useState(true);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [selectedGig, setSelectedGig] = useState<GigFromApi | null>(null);
  const [trainingDetails, setTrainingDetails] = useState<{ trainingName: string; trainingDescription: string; estimatedDuration: string } | null>(null);
  const [showAllComponents, setShowAllComponents] = useState(false);

  // Fetch company data on mount
  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        setLoadingCompany(true);
        const response = await OnboardingService.fetchCompanyData();
        if (response.success && response.data) {
          setCompanyData(response.data);
          // Set company name and industry from API
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
    {
      id: 1,
      title: 'Industry & gigs infos',
      icon: Building2,
      description: 'Tell us about your organization',
      features: ['Industry-specific templates', 'Smart defaults', 'Compliance settings']
    },
    {
      id: 2,
      title: 'Training Vision',
      icon: Target,
      description: 'Define your learning objectives',
      features: ['AI-suggested goals', 'Success metrics', 'Timeline planning']
    },
    {
      id: 3,
      title: 'Team & Roles',
      icon: Users,
      description: 'Identify your learners',
      features: ['Role-based paths', 'Skill assessments', 'Personalization']
    },
    {
      id: 4,
      title: 'Training Methodology',
      icon: Sparkles,
      description: 'Choose comprehensive training approach',
      features: ['360° methodology', 'Industry-specific', 'Compliance-ready']
    }
  ];

  const handleNext = () => {
    if (currentStep === 5) {
      // Complete setup and move to content upload
      // Robust ID extraction: fetch from centralized service
      const realCompanyId = OnboardingService.getCompanyId();
      
      if (!realCompanyId) {
        console.error('[SetupWizard] No company ID found! Cannot create journey.');
        alert('Internal Error: Company ID not found. Please refresh the page.');
        return;
      }

      console.log('[SetupWizard] Using company ID for journey creation:', realCompanyId);

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
          {
            id: '1',
            title: 'Upload & Transform Content',
            description: 'Upload existing materials and let AI transform them into engaging content',
            type: 'content-upload',
            status: 'pending',
            order: 1,
            estimatedTime: '15 minutes',
            requirements: ['Documents', 'Videos', 'Presentations'],
            outputs: ['Enhanced content', 'Media elements', 'Interactive components']
          },
          {
            id: '2',
            title: 'AI Content Enhancement',
            description: 'AI analyzes and enhances your content with multimedia elements',
            type: 'ai-analysis',
            status: 'pending',
            order: 2,
            estimatedTime: '10 minutes',
            requirements: ['Uploaded content'],
            outputs: ['Videos', 'Audio narration', 'Infographics', 'Interactive elements']
          },
          {
            id: '3',
            title: 'Curriculum Design',
            description: 'Structure your enhanced content into learning modules',
            type: 'curriculum-design',
            status: 'pending',
            order: 3,
            estimatedTime: '20 minutes',
            requirements: ['Enhanced content'],
            outputs: ['Learning modules', 'Assessments', 'Progress tracking']
          },
          {
            id: '4',
            title: 'Live Training Setup',
            description: 'Configure live streaming and interactive sessions',
            type: 'live-setup',
            status: 'pending',
            order: 4,
            estimatedTime: '10 minutes',
            requirements: ['Curriculum'],
            outputs: ['Live sessions', 'Interactive features', 'Recording setup']
          },
          {
            id: '5',
            title: 'Launch & Monitor',
            description: 'Deploy your training program and track progress',
            type: 'launch',
            status: 'pending',
            order: 5,
            estimatedTime: '5 minutes',
            requirements: ['Complete setup'],
            outputs: ['Live training program', 'Analytics dashboard', 'Progress reports']
          }
        ],
        createdAt: new Date().toISOString(),
        estimatedDuration: trainingDetails?.estimatedDuration || journey.estimatedDuration || '1 hour total setup',
        targetRoles: journey.targetRoles || [],
      };

      onComplete(completeCompany, completeJourney, selectedMethodology || undefined, selectedGig?._id);
    } else if (currentStep === 3) {
      // Move to methodology selector
      setShowMethodologySelector(true);
    } else if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleTrainingDetailsComplete = (details: { trainingName: string; trainingDescription: string; estimatedDuration: string }) => {
    setTrainingDetails(details);
    setCurrentStep(3); // Move to Team & Roles
  };

  const handleGigSelect = (gig: GigFromApi) => {
    setSelectedGig(gig);
  };

  const handleMethodologySelect = (methodology: TrainingMethodology) => {
    setSelectedMethodology(methodology);
    setShowMethodologySelector(false);
    // Move to setup complete step (step 5)
    setCurrentStep(5);
  };

  const handleMethodologyApply = (methodology: TrainingMethodology) => {
    setSelectedMethodology(methodology);
    setShowMethodologyBuilder(false);
    // Move to setup complete step (step 5)
    setCurrentStep(5);
  };

  const handleCustomMethodology = () => {
    setShowMethodologySelector(false);
    // Continue without methodology, move to setup complete
    setCurrentStep(5);
  };


  if (showMethodologySelector) {
    return (
      <MethodologySelector
        onMethodologySelect={handleMethodologySelect}
        onCustomMethodology={handleCustomMethodology}
        onBack={() => {
          setShowMethodologySelector(false);
          setCurrentStep(3);
        }}
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

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-2.5 md:space-y-3">
            <div className="text-center">
              <h3 className="flex items-center justify-center gap-1.5 text-sm font-bold tracking-tight text-gray-900 md:gap-2 md:text-base">
                <Building2 className="h-4 w-4 shrink-0 text-fuchsia-600 md:h-5 md:w-5" aria-hidden />
                Welcome to your training journey
              </h3>
              <p className="mt-0.5 text-[11px] text-gray-500 md:text-xs">
                {steps[0].features.join(' · ')}
              </p>
            </div>

            {loadingCompany ? (
              <div className="flex flex-col items-center justify-center py-3">
                <Loader2 className="mb-1 h-5 w-5 animate-spin text-fuchsia-600" />
                <p className="text-xs text-gray-600 md:text-sm">Loading company information…</p>
              </div>
            ) : companyData ? (
              <div className="space-y-2.5 md:space-y-3">
                <div>
                  <label className="mb-0.5 block text-xs font-semibold text-gray-900 md:text-sm">
                    Select training industry <span className="font-bold text-rose-500">*</span>
                  </label>
                  {loadingIndustries ? (
                    <div className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-fuchsia-200 bg-gradient-to-r from-fuchsia-50/80 to-purple-50/50 px-3 py-2.5">
                      <Loader2 className="h-4 w-4 animate-spin text-fuchsia-600" />
                      <span className="text-xs font-medium text-fuchsia-900/80 md:text-sm">Loading industries…</span>
                    </div>
                  ) : (
                    <div className="relative">
                      <select
                        value={company.industry || ''}
                        onChange={(e) => setCompany({ ...company, industry: e.target.value })}
                        className="w-full cursor-pointer appearance-none rounded-xl border-2 border-fuchsia-200/90 bg-gradient-to-b from-white to-fuchsia-50/40 py-2 pl-3 pr-10 text-sm font-medium text-gray-900 shadow-sm transition-all outline-none hover:border-fuchsia-400 hover:shadow-md hover:shadow-fuchsia-500/10 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20 md:py-2.5 md:pl-4 md:pr-12 md:text-base"
                      >
                        <option value="" className="text-gray-500">
                          Select the industry for training
                        </option>
                        {industries.map((industry) => (
                          <option key={industry._id} value={industry._id} className="bg-white text-gray-900">
                            {industry.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fuchsia-600 md:right-3.5 md:h-5 md:w-5"
                        aria-hidden
                      />
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-gray-800 md:gap-2 md:text-sm">
                    <Briefcase className="h-3.5 w-3.5 text-fuchsia-600 md:h-4 md:w-4" aria-hidden />
                    Select your gig <span className="text-rose-500">*</span>
                  </h4>
                  <GigSelector
                    industryFilter={company.industry}
                    industryName={industries.find(ind => ind._id === company.industry)?.name || company.industry}
                    onGigSelect={handleGigSelect}
                    selectedGigId={selectedGig?._id}
                  />
                </div>
              </div>
            ) : (
              <div className="py-6 text-center">
                <AlertCircle className="mx-auto mb-2 h-8 w-8 text-red-500" />
                <p className="text-sm text-red-600">Failed to load company information</p>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <TrainingDetailsForm
            onComplete={handleTrainingDetailsComplete}
            onBack={() => setCurrentStep(1)}
            gigData={selectedGig}
          />
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="flex items-center justify-center gap-2 text-lg font-semibold text-gray-900">
                <Users className="h-5 w-5 text-fuchsia-600" aria-hidden />
                Identify your learners
              </h3>
              <p className="mt-2 text-sm text-gray-500">{steps[2].features.join(' · ')}</p>
            </div>

            <div>
                <label className="mb-2 block text-sm font-semibold text-gray-800">
                  Target roles & departments <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
                    <label key={item.role} className="flex items-center p-2 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 cursor-pointer transition-all">
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
                        className="mr-2 h-3.5 w-3.5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      />
                      <div className="flex items-center space-x-1.5">
                        <span className="text-sm">{item.icon}</span>
                        <div>
                          <div className="font-medium text-[11px] text-gray-900 line-clamp-1">{item.role}</div>
                          <div className="text-[9px] text-gray-500">{item.dept}</div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
            </div>
          </div>
        );

      case 4:
        // This step is handled by MethodologySelector component
        return null;

      case 5:
        // Setup Complete - Summary page
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="flex items-center justify-center gap-2 text-lg font-bold text-gray-900">
                <CheckCircle className="h-6 w-6 text-emerald-600" aria-hidden />
                Setup complete
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                360° methodology applied. You can upload and transform content next.
              </p>
            </div>

            <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200">
              <div className="px-4 py-4">
                <h5 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500">
                  <Building2 className="h-4 w-4 text-fuchsia-600" />
                  Industry & gig
                </h5>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li className="line-clamp-2">
                    {(() => {
                      if (company.industry) {
                        const industry = industries.find(ind => ind._id === company.industry);
                        return industry ? industry.name : company.industry;
                      }
                      return 'N/A';
                    })()}
                  </li>
                  <li className="line-clamp-2 text-gray-600">{selectedGig?.title || 'No gig selected'}</li>
                </ul>
              </div>
              <div className="px-4 py-4">
                <h5 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500">
                  <Target className="h-4 w-4 text-fuchsia-600" />
                  Training program
                </h5>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li>{trainingDetails?.trainingName || selectedGig?.title || 'N/A'}</li>
                  <li className="text-gray-600">
                    {trainingDetails?.estimatedDuration
                      ? (() => {
                          const minutes = parseInt(trainingDetails.estimatedDuration);
                          if (minutes >= 1440) return `${Math.round(minutes / 1440)} day(s)`;
                          if (minutes >= 60) return `${Math.round(minutes / 60)} hour(s)`;
                          return `${minutes} minute(s)`;
                        })()
                      : journey.estimatedDuration || 'N/A'}
                  </li>
                  <li className="text-gray-600">{journey.targetRoles?.length || 0} target roles</li>
                </ul>
              </div>
              {selectedMethodology && (
                <div className="px-4 py-4">
                  <h5 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500">
                    <Sparkles className="h-4 w-4 text-fuchsia-600" />
                    Methodology components
                  </h5>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {selectedMethodology.components?.slice(0, showAllComponents ? undefined : 6).map((component: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        <span className="line-clamp-2">{component.title}</span>
                      </div>
                    ))}
                  </div>
                  {selectedMethodology.components && selectedMethodology.components.length > 6 && (
                    <button
                      type="button"
                      onClick={() => setShowAllComponents(!showAllComponents)}
                      className="mt-3 text-xs font-semibold text-fuchsia-700 hover:text-fuchsia-800"
                    >
                      {showAllComponents ? 'Show less' : `+${selectedMethodology.components.length - 6} more`}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return companyData && company.industry && selectedGig !== null;
      case 2:
        return trainingDetails !== null; // Training details must be completed
      case 3:
        return journey.targetRoles && journey.targetRoles.length > 0; // At least one role selected
      case 4:
        return selectedMethodology !== null; // Methodology must be selected
      case 5:
        return true; // Setup complete, can proceed
      default:
        return true;
    }
  };

  const compactHeaderSteps = currentStep === 1;

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-white">
      <div
        className={`shrink-0 border-b border-gray-100 px-3 md:px-6 ${compactHeaderSteps ? 'py-1.5 md:py-2' : 'py-2 md:py-2.5'}`}
      >
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="flex items-center justify-center gap-1.5 text-base font-extrabold leading-tight text-transparent bg-clip-text bg-gradient-to-r from-rose-600 via-fuchsia-600 to-purple-700 md:gap-2 md:text-xl">
            <Sparkles className="h-4 w-4 shrink-0 text-rose-500 md:h-5 md:w-5" aria-hidden />
            Create amazing training in minutes
          </h1>
          {!compactHeaderSteps && (
            <p className="mx-auto mt-1 max-w-2xl text-xs text-gray-600 md:text-sm">
              Turn your content into interactive programs with AI-assisted steps.
            </p>
          )}
        </div>

        <div className={`mx-auto max-w-4xl overflow-x-auto pb-0.5 ${compactHeaderSteps ? 'mt-1.5 md:mt-2' : 'mt-2 md:mt-2.5'}`}>
          <div className="flex min-w-min items-center justify-center gap-0 px-1">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;

              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300 md:h-9 md:w-9 ${
                        isCompleted
                          ? 'border-transparent bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-md'
                          : isActive
                            ? 'scale-[1.02] border-transparent bg-gradient-to-br from-rose-500 via-fuchsia-500 to-purple-600 text-white shadow-md ring-2 ring-rose-200/80'
                            : 'border-gray-200 bg-white text-gray-400'
                      }`}
                    >
                      {isCompleted ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <div className={`mt-0.5 max-w-[4.75rem] text-center text-[9px] font-bold uppercase leading-tight tracking-wide md:mt-1 md:max-w-[6rem] md:text-[10px] ${isActive ? 'text-fuchsia-700' : isCompleted ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {step.title}
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`mx-1 h-0.5 w-6 shrink-0 rounded-full md:mx-2 md:w-10 ${isCompleted ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gray-100'}`} />
                  )}
                </div>
              );
            })}
            {currentStep === 5 && (
              <>
                <div className="mx-1 h-0.5 w-5 shrink-0 rounded-full bg-emerald-500 md:w-7" />
                <div className="flex flex-col items-center">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-emerald-500 bg-emerald-500 text-white md:h-8 md:w-8">
                    <CheckCircle className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  </div>
                  <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-600 md:mt-1 md:text-[10px]">Done</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Step 1: natural-height body + mt-auto footer removes the empty band above Back/Continue */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {currentStep !== 4 && (
          <div
            className={`mx-auto w-full max-w-3xl px-3 md:px-6 ${
              currentStep === 1
                ? 'shrink-0 py-1'
                : 'min-h-0 flex-1 overflow-y-auto py-2 md:py-3'
            }`}
          >
            {renderStepContent()}
          </div>
        )}

        {currentStep !== 2 && currentStep !== 4 && (
        <div className="mt-auto flex shrink-0 items-center justify-between gap-3 border-t border-gray-100 bg-white px-3 py-1.5 shadow-[0_-2px_8px_rgba(0,0,0,0.04)] md:gap-4 md:px-6 md:py-2">
          <button
            type="button"
            onClick={() => {
              if (currentStep === 5) {
                setCurrentStep(4);
              } else if (currentStep > 1) {
                setCurrentStep(currentStep - 1);
              }
            }}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors md:rounded-xl md:px-5 md:py-2.5 md:text-sm ${
              currentStep === 1
                ? 'cursor-not-allowed text-gray-400'
                : 'border border-gray-200 text-gray-800 hover:border-gray-300 hover:bg-gray-50'
            }`}
            disabled={currentStep === 1}
          >
            Back
          </button>

          <span className="min-w-0 truncate text-center text-xs text-gray-500 sm:text-sm">
            Step {currentStep === 5 ? steps.length : currentStep} of {steps.length}
          </span>

          <button
            type="button"
            onClick={handleNext}
            disabled={!isStepValid()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-rose-500 via-fuchsia-500 to-purple-600 px-4 py-2 text-xs font-bold text-white shadow-md transition-all hover:from-rose-600 hover:via-fuchsia-600 hover:to-purple-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 md:gap-2 md:rounded-xl md:px-6 md:py-2.5 md:text-sm"
          >
            <span>{currentStep === 5 ? 'Start building' : 'Continue'}</span>
            <ArrowRight className="h-4 w-4 md:h-5 md:w-5" />
          </button>
        </div>
        )}
      </div>
    </div>
  );
}
