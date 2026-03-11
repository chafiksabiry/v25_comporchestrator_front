import React, { useState, useEffect } from 'react';
import { Building2, Users, Target, ArrowRight, CheckCircle, Sparkles, Zap, Video, FileText, Loader2, Briefcase, AlertCircle } from 'lucide-react';
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
  const [showGigSelector, setShowGigSelector] = useState(false);
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
      const completeCompany: Company = {
        id: Date.now().toString(),
        name: companyData?.name || company.name || '',
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
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-center mb-2">
              <Building2 className="h-5 w-5 text-indigo-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Welcome to Your Training Journey</h3>
            </div>

            <div className="flex flex-wrap justify-center gap-2 mb-3">
              {steps[0].features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-1 px-2 py-1 bg-indigo-50 rounded text-xs text-indigo-700 font-medium">
                  <Sparkles className="h-3 w-3 text-yellow-500" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            {loadingCompany ? (
              <div className="flex flex-col items-center justify-center py-4">
                <Loader2 className="h-6 w-6 text-indigo-500 animate-spin mb-2" />
                <p className="text-xs text-gray-600">Loading company information...</p>
              </div>
            ) : companyData ? (
              <div className="space-y-3">
                {/* removed company info display */}

                {/* Industry Selector */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Select Training Industry *
                  </label>
                  {loadingIndustries ? (
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-lg flex items-center justify-center">
                      <Loader2 className="h-4 w-4 text-indigo-500 animate-spin mr-2" />
                      <span className="text-xs text-gray-600">Loading industries...</span>
                    </div>
                  ) : (
                    <select
                      value={company.industry || ''}
                      onChange={(e) => setCompany({ ...company, industry: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
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

            <div className="space-y-3">
              {/* Gig Selection */}
              <div className="pt-3 border-t border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <Briefcase className="h-4 w-4 mr-1.5 text-blue-500" />
                  Select Your Gig *
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
              <Users className="h-5 w-5 text-indigo-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Identify Your Learners</h3>
            </div>

            <div className="flex flex-wrap justify-center gap-2 mb-3">
              {steps[2].features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-1 px-2 py-1 bg-indigo-50 rounded text-xs text-indigo-700 font-medium">
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
                    <label key={item.role} className="flex items-center p-2 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer transition-all">
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
                        className="mr-2 h-3.5 w-3.5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
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
                  <Building2 className="h-4 w-4 mr-1.5 text-indigo-500" />
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
                  <Target className="h-4 w-4 mr-1.5 text-indigo-500" />
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
              <div className="bg-white border border-indigo-100 rounded-lg p-3 shadow-sm">
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
                    className="text-[10px] text-indigo-600 hover:text-indigo-700 font-medium mt-1 flex items-center"
                  >
                    {showAllComponents ? 'Show less' : `+${selectedMethodology.components.length - 6} more components`}
                  </button>
                )}
              </div>
            )}

            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-2 mt-2">
              <p className="text-indigo-900 font-medium text-xs text-center flex items-center justify-center gap-1.5">
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
    <div className="h-auto w-full">
      <div className="container mx-auto px-2 py-2">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-2">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-1 flex justify-center items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-500" />
              Create Amazing Training in Minutes
            </h1>
            <p className="text-xs text-gray-600 max-w-2xl mx-auto">
              Transform your existing content into engaging, interactive training programs with the power of AI
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-2">
            <div className="flex items-center space-x-2">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;

                return (
                  <div key={step.id} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300 ${isCompleted
                        ? 'bg-green-500 border-green-500 text-white shadow-sm'
                        : isActive
                          ? 'bg-indigo-500 border-indigo-500 text-white shadow-md'
                          : 'bg-white border-gray-300 text-gray-400'
                        }`}>
                        {isCompleted ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <Icon className="h-4 w-4" />
                        )}
                      </div>
                      <div className="mt-1 text-center">
                        <div className={`text-[10px] font-semibold ${isActive ? 'text-indigo-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                          }`}>
                          {step.title}
                        </div>
                      </div>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`w-8 h-0.5 mx-2 rounded-full transition-all duration-300 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'
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
            <div className="bg-white rounded-lg shadow border border-gray-200 p-3 mb-2">
              {renderStepContent()}
            </div>
          )}

          {/* Navigation Buttons - Hide for step 2 and 4 (TrainingDetailsForm and MethodologySelector handle their own navigation) */}
          {currentStep !== 2 && currentStep !== 4 && (
            <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
              <button
                onClick={() => {
                  if (currentStep === 5) {
                    setCurrentStep(4);
                  } else if (currentStep > 1) {
                    setCurrentStep(currentStep - 1);
                  }
                }}
                className={`px-4 py-2 rounded-lg transition-all text-sm font-medium flex items-center space-x-1 ${currentStep === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  }`}
                disabled={currentStep === 1}
              >
                <span>Back</span>
              </button>

              <div className="flex flex-col items-center w-1/3">
                <div className="text-xs text-gray-500 mb-1">
                  Step {currentStep === 5 ? steps.length : currentStep} of {steps.length}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${(currentStep === 5 ? steps.length : currentStep) / steps.length * 100}%` }}
                  />
                </div>
              </div>

              <button
                onClick={handleNext}
                disabled={!isStepValid()}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium shadow-sm flex items-center space-x-1"
              >
                <span>{currentStep === 5 ? 'Start Building' : 'Continue'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
