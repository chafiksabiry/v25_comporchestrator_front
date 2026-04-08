import { useState, useEffect } from 'react';
import { Building2, Loader2, Target, Users, Sparkles, Briefcase, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { Company, TrainingJourney } from '../../types/core';
import { Industry, GigFromApi } from '../../types';
import { TrainingMethodology } from '../../types/methodology';
import MethodologySelector from './MethodologySelector';
import MethodologyBuilder from '../Methodology/MethodologyBuilder';
import { OnboardingService } from '../../infrastructure/services/OnboardingService';
import GigSelector from '../Dashboard/GigSelector';
import TrainingDetailsForm from './TrainingDetailsForm';

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
      // Robust ID extraction: check all possible locations for the MongoDB ID
      const realCompanyId = 
        companyData?._id || 
        companyData?.id || 
        companyData?.data?._id || 
        companyData?.data?.id || 
        Date.now().toString();

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

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

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
          <div className="space-y-8">
            <div className="flex items-center justify-center mb-6">
              <div className="p-3 bg-rose-50 rounded-xl mr-4 text-rose-500 shadow-inner">
                <Building2 className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome to Your Training Journey</h3>
            </div>

            <div className="flex flex-wrap justify-center gap-3 mb-8">
              {steps[0].features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-2 px-4 py-2 bg-white/80 backdrop-blur border border-purple-100 rounded-full text-sm text-purple-700 font-medium shadow-sm hover:shadow-md transition-shadow">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            {loadingCompany ? (
              <div className="flex flex-col items-center justify-center py-4">
                <Loader2 className="h-6 w-6 text-purple-500 animate-spin mb-2" />
                <p className="text-xs text-gray-600">Loading company information...</p>
              </div>
            ) : companyData ? (
              <div className="space-y-3">
                {/* removed company info display */}

                {/* Industry Selector */}
                <div className="pt-2">
                  <label className="block text-sm font-bold text-gray-800 mb-3 ml-1">
                    Select Training Industry <span className="text-rose-500">*</span>
                  </label>
                  {loadingIndustries ? (
                    <div className="w-full px-4 py-3 border border-gray-200 rounded-xl flex items-center justify-center bg-gray-50">
                      <Loader2 className="h-5 w-5 text-purple-500 animate-spin mr-3" />
                      <span className="text-sm text-gray-600 font-medium">Loading industries...</span>
                    </div>
                  ) : (
                    <select
                      value={company.industry || ''}
                      onChange={(e) => setCompany({ ...company, industry: e.target.value })}
                      className="w-full px-4 py-3.5 border-2 border-gray-100 rounded-xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 text-base font-medium text-gray-700 bg-white shadow-sm hover:border-purple-300 transition-colors cursor-pointer"
                    >
                      <option value="">Select the industry for training</option>
                      {industries.map((industry) => (
                        <option key={industry._id} value={industry._id}>
                          {industry.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600">Failed to load company information</p>
              </div>
            )}

            <div className="space-y-6 mt-8">
              {/* Gig Selection */}
              <div className="pt-8 border-t border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-5 flex items-center">
                  <div className="p-2 bg-purple-50 rounded-lg mr-3 shadow-inner">
                    <Briefcase className="h-5 w-5 text-purple-500" />
                  </div>
                  Select Your Gig <span className="text-rose-500 ml-1">*</span>
                </h3>
                <GigSelector
                  industryFilter={company.industry}
                  industryName={industries.find(ind => ind._id === company.industry)?.name || company.industry}
                  onGigSelect={handleGigSelect}
                  selectedGigId={selectedGig?._id}
                />
              </div>
            </div>
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
          <div className="space-y-3">
            <div className="flex items-center justify-center mb-2">
              <Users className="h-5 w-5 text-purple-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Identify Your Learners</h3>
            </div>

            <div className="flex flex-wrap justify-center gap-2 mb-3">
              {steps[2].features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-1 px-2 py-1 bg-purple-50 rounded text-xs text-purple-700 font-medium">
                  <Users className="h-3 w-3" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Target Roles & Departments *
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
          </div>
        );

      case 4:
        // This step is handled by MethodologySelector component
        return null;

      case 5:
        // Setup Complete - Summary page
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
              <h3 className="text-lg font-bold text-gray-900">Setup Complete!</h3>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 mb-3 flex items-center">
              <Sparkles className="h-4 w-4 text-green-600 mr-2 flex-shrink-0" />
              <p className="text-xs font-semibold text-green-800">360° Methodology Applied Successfully. Ready to transform content!</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              {/* Industry & Gigs Summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <h5 className="font-semibold text-xs text-gray-900 mb-2 flex items-center">
                  <Building2 className="h-4 w-4 mr-1.5 text-purple-500" />
                  Industry & gigs infos
                </h5>
                <ul className="space-y-1 text-[11px] text-gray-600">
                  <li className="line-clamp-1">• {(() => {
                    if (company.industry) {
                      const industry = industries.find(ind => ind._id === company.industry);
                      return industry ? industry.name : company.industry;
                    }
                    return 'N/A';
                  })()}</li>
                  <li className="line-clamp-1">• {selectedGig?.title || 'No gig selected'}</li>
                </ul>
              </div>

              {/* Training Program Summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <h5 className="font-semibold text-xs text-gray-900 mb-2 flex items-center">
                  <Target className="h-4 w-4 mr-1.5 text-purple-500" />
                  Training Program
                </h5>
                <ul className="space-y-1 text-[11px] text-gray-600">
                  <li>• {trainingDetails?.trainingName || selectedGig?.title || 'N/A'}</li>
                  <li>• {trainingDetails?.estimatedDuration
                    ? (() => {
                      const minutes = parseInt(trainingDetails.estimatedDuration);
                      if (minutes >= 1440) return `${Math.round(minutes / 1440)} day(s)`;
                      if (minutes >= 60) return `${Math.round(minutes / 60)} hour(s)`;
                      return `${minutes} minute(s)`;
                    })()
                    : journey.estimatedDuration || 'N/A'}</li>
                  <li>• {journey.targetRoles?.length || 0} target roles</li>
                </ul>
              </div>
            </div>

            {/* Methodology Components */}
            {selectedMethodology && (
              <div className="bg-white border border-purple-100 rounded-lg p-3 shadow-sm">
                <h5 className="font-semibold text-xs text-gray-900 mb-2 flex items-center">
                  <Sparkles className="h-4 w-4 mr-1.5 text-orange-500" />
                  360° Methodology Components
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-2 gap-y-1">
                  {selectedMethodology.components?.slice(0, showAllComponents ? undefined : 6).map((component: any, idx: number) => (
                    <div key={idx} className="text-[10px] text-gray-600 flex items-center line-clamp-1 border-b border-gray-50 pb-1">
                      <CheckCircle className="h-3 w-3 text-green-500 mr-1.5 flex-shrink-0" />
                      <span className="truncate">{component.title}</span>
                    </div>
                  ))}
                </div>
                {selectedMethodology.components && selectedMethodology.components.length > 6 && (
                  <button
                    onClick={() => setShowAllComponents(!showAllComponents)}
                    className="text-[10px] text-purple-600 hover:text-purple-700 font-medium mt-1 flex items-center"
                  >
                    {showAllComponents ? 'Show less' : `+${selectedMethodology.components.length - 6} more components`}
                  </button>
                )}
              </div>
            )}

            <div className="bg-purple-50 border border-purple-100 rounded-lg p-2 mt-2">
              <p className="text-purple-900 font-medium text-xs text-center flex items-center justify-center gap-1.5">
                <ArrowRight className="h-3 w-3" />
                Upload your content next!
              </p>
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

  return (
    <div className="w-full h-full flex flex-col p-2 md:p-4">
      <div className="w-full flex-1 flex flex-col p-6 md:p-10 opacity-100 transition-opacity duration-500 relative bg-white/60 backdrop-blur-xl rounded-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-purple-500 to-pink-500 mb-3 flex justify-center items-center gap-3 drop-shadow-sm leading-tight pb-2">
            <Sparkles className="h-8 w-8 text-rose-500 animate-pulse" />
            Create Amazing Training in Minutes
          </h1>
          <p className="text-sm md:text-base text-gray-600 max-w-2xl mx-auto font-medium">
            Transform your existing content into engaging, interactive training programs with the power of AI
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;

              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-500 ${isCompleted
                      ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 border-transparent text-white shadow-lg shadow-emerald-200/50 scale-105'
                      : isActive
                        ? 'bg-gradient-to-r from-rose-500 to-purple-600 border-transparent text-white shadow-xl shadow-purple-300/50 scale-110 ring-4 ring-rose-100'
                        : 'bg-white border-gray-200 text-gray-400 hover:border-purple-300 hover:text-purple-400'
                      }`}>
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <div className="mt-3 text-center">
                      <div className={`text-[11px] font-bold uppercase tracking-wider ${isActive ? 'text-purple-600' : isCompleted ? 'text-emerald-600' : 'text-gray-400'
                        }`}>
                        {step.title}
                      </div>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-12 h-1 mx-3 rounded-full transition-all duration-500 ${isCompleted ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gray-100'
                      }`} />
                  )}
                </div>
              );
            })}
            {/* Setup Complete Step */}
            {currentStep === 5 && (
              <>
                <div className={`w-8 h-0.5 mx-2 rounded-full bg-green-500 transition-all duration-300`} />
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 bg-green-500 border-green-500 text-white shadow-sm">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                  <div className="mt-1 text-center">
                    <div className="text-[10px] font-semibold text-green-600">
                      Complete
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Step Content */}
        {currentStep !== 4 && (
          <div className="flex-1 overflow-hidden relative transition-all duration-500 mt-4">
            <div className="h-full overflow-y-auto relative z-10 custom-scrollbar pr-4">
              <div className="max-w-4xl mx-auto pb-6">
                {renderStepContent()}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        {currentStep !== 2 && currentStep !== 4 && (
          <div className="sticky bottom-0 pt-6 mt-auto border-t border-gray-100/50 flex items-center justify-between z-20 transition-all duration-300">
            <button
              onClick={() => {
                if (currentStep === 5) {
                  setCurrentStep(4);
                } else if (currentStep > 1) {
                  setCurrentStep(currentStep - 1);
                }
              }}
              className={`px-6 py-3 rounded-xl transition-all duration-300 text-sm font-semibold flex items-center space-x-2 ${currentStep === 1
                ? 'bg-gray-50 text-gray-400 cursor-not-allowed opacity-70'
                : 'bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 border border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}
              disabled={currentStep === 1}
            >
              <span>Back</span>
            </button>

            <div className="flex flex-col items-center w-5/12">
              <div className="text-sm font-medium text-gray-500 mb-2">
                Step {currentStep === 5 ? steps.length : currentStep} of {steps.length}
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden shadow-inner">
                <div
                  className="bg-gradient-to-r from-rose-500 to-purple-600 h-full rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(244,63,94,0.3)]"
                  style={{ width: `${(currentStep === 5 ? steps.length : currentStep) / steps.length * 100}%` }}
                />
              </div>
            </div>

            <button
              onClick={handleNext}
              disabled={!isStepValid()}
              className="px-8 py-3 bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-xl hover:from-rose-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 text-sm font-semibold shadow-lg shadow-rose-500/30 hover:shadow-xl hover:shadow-rose-500/40 hover:-translate-y-0.5 flex items-center space-x-2"
            >
              <span>{currentStep === 5 ? 'Start Building' : 'Continue'}</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
