import { useState, useEffect } from 'react';
import { Building2, Loader2, Target, Users, Sparkles, Briefcase, AlertCircle, CheckCircle, ArrowRight, ArrowLeft, ChevronDown, Check, Zap, Shield, LayoutTemplate } from 'lucide-react';
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
        alert('Internal Error: Company ID not found. Please refresh the page.');
        return;
      }
      const completeCompany: Company = {
        id: realCompanyId, name: companyData?.name || companyData?.data?.name || company.name || '',
        industry: company.industry || '', size: company.size || 'medium', setupComplete: true,
      };
      const completeJourney: TrainingJourney = {
        id: Date.now().toString(), companyId: completeCompany.id,
        name: trainingDetails?.trainingName || selectedGig?.title || 'New Training Journey',
        description: trainingDetails?.trainingDescription || selectedGig?.description || '',
        status: 'draft',
        steps: [
          { id: '1', title: 'Upload & Transform Content', description: 'Upload existing materials and let AI transform them', type: 'content-upload', status: 'pending', order: 1, estimatedTime: '15 minutes', requirements: ['Documents', 'Videos', 'Presentations'], outputs: ['Enhanced content', 'Media elements', 'Interactive components'] },
          { id: '2', title: 'AI Content Enhancement', description: 'AI analyzes and enhances your content with multimedia', type: 'ai-analysis', status: 'pending', order: 2, estimatedTime: '10 minutes', requirements: ['Uploaded content'], outputs: ['Videos', 'Audio narration', 'Infographics', 'Interactive elements'] },
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
  const handleGigSelect = (gig: GigFromApi) => setSelectedGig(gig);
  const handleMethodologySelect = (m: TrainingMethodology) => { setSelectedMethodology(m); setShowMethodologySelector(false); setCurrentStep(5); };
  const handleMethodologyApply = (m: TrainingMethodology) => { setSelectedMethodology(m); setShowMethodologyBuilder(false); setCurrentStep(5); };
  const handleCustomMethodology = () => { setShowMethodologySelector(false); setCurrentStep(5); };

  if (showMethodologySelector) {
    return <MethodologySelector onMethodologySelect={handleMethodologySelect} onCustomMethodology={handleCustomMethodology} onBack={() => { setShowMethodologySelector(false); setCurrentStep(3); }} />;
  }
  if (showMethodologyBuilder) {
    return <MethodologyBuilder onApplyMethodology={handleMethodologyApply} selectedIndustry={company.industry} />;
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

  /* ═══════════════════ STEP 1: Full-page two-column layout ═══════════════════ */
  if (currentStep === 1) {
    const features = [
      { icon: LayoutTemplate, label: 'Industry templates', desc: 'Pre-built training frameworks' },
      { icon: Zap, label: 'Smart defaults', desc: 'AI-powered configuration' },
      { icon: Shield, label: 'Compliance ready', desc: 'Built-in regulatory checks' },
    ];

    return (
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-white">
        {/* Two-column main area */}
        <div className="flex min-h-0 flex-1">
          {/* LEFT: gradient info panel */}
          <div className="hidden w-[280px] shrink-0 flex-col justify-between bg-gradient-to-b from-fuchsia-600 via-purple-600 to-indigo-700 p-5 text-white lg:flex xl:w-[320px]">
            <div>
              {/* Stepper vertical */}
              <div className="space-y-3">
                {steps.map((step, idx) => {
                  const active = currentStep === step.id;
                  const done = currentStep > step.id;
                  const Icon = step.icon;
                  return (
                    <div key={step.id} className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                        done ? 'bg-white/20' : active ? 'bg-white text-fuchsia-700 shadow-lg' : 'bg-white/10'
                      }`}>
                        {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className={`text-xs font-semibold ${active ? 'text-white' : 'text-white/60'}`}>
                          Step {step.id}
                        </div>
                        <div className={`text-[11px] ${active ? 'text-white/90' : 'text-white/40'}`}>
                          {step.label}
                        </div>
                      </div>
                      {idx < steps.length - 1 && (
                        <div className={`ml-auto h-px w-4 ${done ? 'bg-white/30' : 'bg-white/10'}`} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Separator */}
              <div className="my-5 h-px bg-white/15" />

              {/* Features list */}
              <div className="space-y-3">
                {features.map(f => (
                  <div key={f.label} className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10">
                      <f.icon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold">{f.label}</div>
                      <div className="text-[10px] text-white/50">{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-white/10 p-3 backdrop-blur-sm">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/60">Powered by</div>
              <div className="mt-0.5 text-sm font-bold">Smart Orchestrator AI</div>
            </div>
          </div>

          {/* RIGHT: form area */}
          <div className="flex min-h-0 flex-1 flex-col">
            {/* Horizontal stepper for mobile / when left panel hidden */}
            <div className="shrink-0 border-b border-gray-100 px-4 py-2 lg:hidden">
              <div className="flex items-center justify-center gap-1">
                {steps.map((step, index) => {
                  const active = currentStep === step.id;
                  const done = currentStep > step.id;
                  return (
                    <React.Fragment key={step.id}>
                      <div className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        done ? 'bg-emerald-50 text-emerald-700' : active ? 'bg-fuchsia-50 text-fuchsia-700 ring-1 ring-fuchsia-200' : 'text-gray-400'
                      }`}>
                        <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                          done ? 'bg-emerald-500 text-white' : active ? 'bg-fuchsia-500 text-white' : 'bg-gray-200 text-gray-500'
                        }`}>
                          {done ? <Check className="h-3 w-3" /> : step.id}
                        </span>
                        <span className="hidden sm:inline">{step.label}</span>
                      </div>
                      {index < steps.length - 1 && <div className={`h-px w-4 ${done ? 'bg-emerald-300' : 'bg-gray-200'}`} />}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Form content */}
            <div className="flex min-h-0 flex-1 flex-col justify-center px-6 py-4 sm:px-8 md:px-12 lg:px-16">
              <div className="w-full max-w-md">
                <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
                  Set up your training
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Select your industry and gig to get started with AI-powered training.
                </p>

                {loadingCompany ? (
                  <div className="mt-8 flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-fuchsia-500" />
                    <span className="text-sm text-gray-500">Loading company data...</span>
                  </div>
                ) : companyData ? (
                  <div className="mt-6 space-y-5">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        Training industry <span className="text-rose-500">*</span>
                      </label>
                      {loadingIndustries ? (
                        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                          <Loader2 className="h-4 w-4 animate-spin text-fuchsia-500" />
                          <span className="text-sm text-gray-400">Loading industries...</span>
                        </div>
                      ) : (
                        <div className="relative">
                          <select
                            value={company.industry || ''}
                            onChange={(e) => setCompany({ ...company, industry: e.target.value })}
                            className="w-full cursor-pointer appearance-none rounded-lg border border-gray-300 bg-white py-2.5 pl-3.5 pr-10 text-sm text-gray-900 transition-all outline-none hover:border-fuchsia-400 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20"
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
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
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
                      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                        <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
                        <span className="text-sm font-medium text-emerald-800">{selectedGig.title}</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={!isStepValid()}
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-fuchsia-500 to-purple-600 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:from-fuchsia-600 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="mt-8 text-center">
                    <AlertCircle className="mx-auto h-8 w-8 text-red-400" />
                    <p className="mt-2 text-sm text-red-600">Failed to load company data</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════ STEPS 2-5: Shared layout ═══════════════════ */

  if (currentStep === 4) return null;
  const isStep2 = currentStep === 2;

  const renderStepper = () => (
    <div className="flex items-center justify-center gap-1">
      {steps.map((step, index) => {
        const active = currentStep === step.id;
        const done = currentStep > step.id;
        return (
          <React.Fragment key={step.id}>
            <button
              type="button"
              onClick={() => { if (done) setCurrentStep(step.id); }}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${
                done ? 'cursor-pointer bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : active ? 'bg-fuchsia-50 text-fuchsia-700 ring-1 ring-fuchsia-200' : 'cursor-default text-gray-400'
              }`}
            >
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                done ? 'bg-emerald-500 text-white' : active ? 'bg-fuchsia-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {done ? <Check className="h-3 w-3" /> : step.id}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </button>
            {index < steps.length - 1 && <div className={`h-px w-4 sm:w-6 ${done ? 'bg-emerald-300' : 'bg-gray-200'}`} />}
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

  const renderStep3 = () => (
    <div className="space-y-5">
      <div className="text-center">
        <h3 className="flex items-center justify-center gap-2 text-base font-bold text-gray-900 md:text-lg">
          <Users className="h-5 w-5 text-fuchsia-600" />
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
              <input type="checkbox" checked={journey.targetRoles?.includes(item.role) || false}
                onChange={(e) => {
                  const roles = journey.targetRoles || [];
                  setJourney({ ...journey, targetRoles: e.target.checked ? [...roles, item.role] : roles.filter(r => r !== item.role) });
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

  const renderStep5 = () => (
    <div className="space-y-5">
      <div className="text-center">
        <h3 className="flex items-center justify-center gap-2 text-base font-bold text-gray-900 md:text-lg">
          <CheckCircle className="h-5 w-5 text-emerald-600" /> Setup complete
        </h3>
        <p className="mt-1 text-sm text-gray-600">360° methodology applied. Upload and transform content next.</p>
      </div>
      <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200">
        <div className="px-4 py-3">
          <h5 className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500">
            <Building2 className="h-4 w-4 text-fuchsia-600" /> Industry & gig
          </h5>
          <ul className="space-y-0.5 text-sm text-gray-700">
            <li>{(() => { if (company.industry) { const ind = industries.find(i => i._id === company.industry); return ind ? ind.name : company.industry; } return 'N/A'; })()}</li>
            <li className="text-gray-500">{selectedGig?.title || 'No gig selected'}</li>
          </ul>
        </div>
        <div className="px-4 py-3">
          <h5 className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500">
            <Target className="h-4 w-4 text-fuchsia-600" /> Training program
          </h5>
          <ul className="space-y-0.5 text-sm text-gray-700">
            <li>{trainingDetails?.trainingName || selectedGig?.title || 'N/A'}</li>
            <li className="text-gray-500">
              {trainingDetails?.estimatedDuration
                ? (() => { const m = parseInt(trainingDetails.estimatedDuration); if (m >= 1440) return `${Math.round(m / 1440)} day(s)`; if (m >= 60) return `${Math.round(m / 60)} hour(s)`; return `${m} minute(s)`; })()
                : journey.estimatedDuration || 'N/A'}
            </li>
            <li className="text-gray-500">{journey.targetRoles?.length || 0} target roles</li>
          </ul>
        </div>
        {selectedMethodology && (
          <div className="px-4 py-3">
            <h5 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500">
              <Sparkles className="h-4 w-4 text-fuchsia-600" /> Methodology
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
              <button type="button" onClick={() => setShowAllComponents(!showAllComponents)} className="mt-2 text-xs font-semibold text-fuchsia-700 hover:text-fuchsia-800">
                {showAllComponents ? 'Show less' : `+${selectedMethodology.components.length - 6} more`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-gray-100 px-3 py-2">
        {renderStepper()}
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className={`mx-auto w-full max-w-3xl px-4 md:px-6 ${isStep2 ? 'min-h-0 flex-1 overflow-y-auto py-3' : 'min-h-0 flex-1 overflow-y-auto py-4'}`}>
          {isStep2 && <TrainingDetailsForm onComplete={handleTrainingDetailsComplete} onBack={() => setCurrentStep(1)} gigData={selectedGig} />}
          {currentStep === 3 && renderStep3()}
          {currentStep === 5 && renderStep5()}
        </div>
        {!isStep2 && (
          <div className="mt-auto flex shrink-0 items-center justify-between border-t border-gray-100 bg-white px-4 py-2 md:px-6">
            <button type="button"
              onClick={() => { if (currentStep === 5) setCurrentStep(4); else if (currentStep > 1) setCurrentStep(currentStep - 1); }}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <span className="text-[11px] text-gray-400">Step {currentStep > 4 ? 4 : currentStep} of {steps.length}</span>
            <button type="button" onClick={handleNext} disabled={!isStepValid()}
              className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-fuchsia-500 to-purple-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:shadow-md hover:from-fuchsia-600 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {currentStep === 5 ? 'Start building' : 'Continue'} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
