import React, { useState, useEffect } from 'react';
import { Building2, Briefcase, Target, ArrowRight, ArrowLeft, Loader2, CheckCircle, DollarSign, MapPin, Clock, AlertCircle } from 'lucide-react';
import { OnboardingService } from '../../infrastructure/services/OnboardingService';
import { Industry, GigFromApi } from '../../types';

interface ManualTrainingSetupData {
  companyData: any;
  industry: string;
  gig: GigFromApi | null;
  trainingName: string;
  trainingDescription: string;
  estimatedDuration: string;
}

interface ManualTrainingSetupProps {
  onComplete: (setupData: ManualTrainingSetupData) => void;
  onBack?: () => void;
}

export const ManualTrainingSetup: React.FC<ManualTrainingSetupProps> = ({ onComplete, onBack }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [setupData, setSetupData] = useState<ManualTrainingSetupData>({
    companyData: null,
    industry: '',
    gig: null,
    trainingName: '',
    trainingDescription: '',
    estimatedDuration: '2400', // 1 week in minutes
  });

  // Industries and Gigs state
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [loadingIndustries, setLoadingIndustries] = useState(true);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [gigs, setGigs] = useState<GigFromApi[]>([]);
  const [loadingGigs, setLoadingGigs] = useState(false);
  const [gigsError, setGigsError] = useState<string | null>(null);

  // Fetch company data on mount
  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        setLoadingCompany(true);
        const response = await OnboardingService.fetchCompanyData();
        if (response.success && response.data) {
          setSetupData(prev => ({ ...prev, companyData: response.data }));
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

  // Fetch gigs when reaching step 2 - filtered by selected industry
  useEffect(() => {
    const fetchGigs = async () => {
      if (currentStep === 2 && setupData.industry) {
        try {
          setLoadingGigs(true);
          setGigsError(null);
          
          // Fetch gigs filtered by industry (companyId will be retrieved from cookie)
          const response = await OnboardingService.fetchGigsByIndustry(setupData.industry);
          
          if (!response.data || response.data.length === 0) {
            setGigs([]);
            setGigsError(`No gigs available for "${setupData.industry}" industry. Please try selecting a different industry or contact support.`);
          } else {
            setGigs(response.data);
            setGigsError(null);
          }
        } catch (err: any) {
          setGigs([]);
          const errorMessage = err?.message || 'Failed to load available gigs';
          setGigsError(`${errorMessage}. Please try again later or contact support.`);
          console.error('Error loading gigs:', err);
        } finally {
          setLoadingGigs(false);
        }
      } else if (currentStep === 2 && !setupData.industry) {
        setGigs([]);
        setGigsError('Please select an industry first.');
        setLoadingGigs(false);
      }
    };

    fetchGigs();
  }, [currentStep, setupData.industry]);

  const steps = [
    { id: 1, title: 'Company Information', icon: Building2 },
    { id: 2, title: 'Select Gig/Role', icon: Briefcase },
    { id: 3, title: 'Training Details', icon: Target },
  ];

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete setup
      onComplete(setupData);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else if (onBack) {
      onBack();
    }
  };

  const handleGigSelect = (gig: GigFromApi) => {
    setSetupData({ ...setupData, gig });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'to_activate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return setupData.industry && setupData.companyData;
      case 2:
        return setupData.gig !== null;
      case 3:
        return setupData.trainingName.trim() && setupData.estimatedDuration;
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Building2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Company Information</h3>
              <p className="text-gray-600">Select your industry</p>
            </div>

            {loadingCompany ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-12 w-12 text-green-500 animate-spin mb-4" />
                <p className="text-gray-600">Loading company information...</p>
              </div>
            ) : setupData.companyData ? (
              <div className="space-y-6">
                {/* Display Company Info */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    {setupData.companyData.logo && (
                      <img 
                        src={setupData.companyData.logo} 
                        alt={setupData.companyData.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="text-2xl font-bold text-gray-900 mb-2">{setupData.companyData.name}</h4>
                      <p className="text-sm text-gray-600 mb-2">{setupData.companyData.industry}</p>
                      <p className="text-gray-700 leading-relaxed">{setupData.companyData.overview}</p>
                    </div>
                  </div>
                </div>

                {/* Industry Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Training Industry *
                  </label>
                  {loadingIndustries ? (
                    <div className="w-full px-4 py-3 border border-gray-300 rounded-lg flex items-center justify-center">
                      <Loader2 className="h-5 w-5 text-green-500 animate-spin mr-2" />
                      <span className="text-gray-600">Loading industries...</span>
                    </div>
                  ) : (
                    <select
                      value={setupData.industry}
                      onChange={(e) => setSetupData({ ...setupData, industry: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
                    >
                      <option value="">Select the industry for training</option>
                      {industries.map((industry) => (
                        <option key={industry._id} value={industry.name}>
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
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Briefcase className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Select Target Gig/Role</h3>
              <p className="text-gray-600">Choose the position this training is for</p>
            </div>

            {loadingGigs ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-12 w-12 text-green-500 animate-spin mb-4" />
                <p className="text-gray-600">Loading available gigs...</p>
              </div>
            ) : gigsError ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                <p className="text-red-600 font-medium mb-2">Error Loading Gigs</p>
                <p className="text-gray-600 text-sm">{gigsError}</p>
              </div>
            ) : gigs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Briefcase className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-600">No gigs available for this company.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto pr-2">
                {gigs.map((gig) => (
                  <div
                    key={gig._id}
                    onClick={() => handleGigSelect(gig)}
                    className={`border-2 rounded-xl p-5 cursor-pointer transition-all hover:shadow-lg ${
                      setupData.gig?._id === gig._id
                        ? 'border-green-500 bg-green-50 shadow-md'
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-900 mb-1">{gig.title}</h4>
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full border ${getStatusBadgeColor(gig.status)}`}>
                          {gig.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      {setupData.gig?._id === gig._id && (
                        <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 ml-2" />
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{gig.description}</p>

                    {/* Details */}
                    <div className="space-y-2 text-sm">
                      {gig.averageSalary && (
                        <div className="flex items-center text-green-700">
                          <DollarSign className="h-4 w-4 mr-2" />
                          <span className="font-medium">${gig.averageSalary.toLocaleString()}/year</span>
                        </div>
                      )}
                      {gig.location && (
                        <div className="flex items-center text-gray-600">
                          <MapPin className="h-4 w-4 mr-2" />
                          <span>{gig.location}</span>
                        </div>
                      )}
                      {gig.duration && (
                        <div className="flex items-center text-gray-600">
                          <Clock className="h-4 w-4 mr-2" />
                          <span>{gig.duration}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Target className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Training Details</h3>
              <p className="text-gray-600">Define your training program</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Training Name *
                </label>
                <input
                  type="text"
                  value={setupData.trainingName}
                  onChange={(e) => setSetupData({ ...setupData, trainingName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
                  placeholder="e.g., Sales Onboarding Program"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={setupData.trainingDescription}
                  onChange={(e) => setSetupData({ ...setupData, trainingDescription: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Describe what this training covers..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Duration (in minutes) *
                </label>
                <input
                  type="number"
                  value={setupData.estimatedDuration}
                  onChange={(e) => setSetupData({ ...setupData, estimatedDuration: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
                  placeholder="e.g., 60, 120, 480..."
                  min="1"
                />
                <p className="mt-2 text-sm text-gray-600 mb-3">
                  Enter the duration in minutes
                </p>
                
                {/* Duration Suggestions */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Quick Suggestions:</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {[
                      { label: '30 minutes', value: '30' },
                      { label: '1 hour (60 min)', value: '60' },
                      { label: '2 hours (120 min)', value: '120' },
                      { label: '3 hours (180 min)', value: '180' },
                      { label: '4 hours (240 min)', value: '240' },
                      { label: '1 day (480 min)', value: '480' },
                      { label: '2 days (960 min)', value: '960' },
                      { label: '3 days (1440 min)', value: '1440' },
                      { label: '1 week (2400 min)', value: '2400' },
                      { label: '2 weeks (4800 min)', value: '4800' },
                      { label: '1 month (9600 min)', value: '9600' },
                      { label: '3 months (28800 min)', value: '28800' },
                    ].map((suggestion) => (
                      <button
                        key={suggestion.value}
                        type="button"
                        onClick={() => setSetupData({ ...setupData, estimatedDuration: suggestion.value })}
                        className={`px-3 py-2 text-sm rounded-lg border-2 transition-all ${
                          setupData.estimatedDuration === suggestion.value
                            ? 'border-green-500 bg-green-50 text-green-700 font-medium'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-green-300 hover:bg-green-50'
                        }`}
                      >
                        {suggestion.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    currentStep >= step.id
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {currentStep > step.id ? (
                    <CheckCircle className="h-6 w-6" />
                  ) : (
                    <step.icon className="h-6 w-6" />
                  )}
                </div>
                <p className="text-xs mt-2 text-gray-600 font-medium">{step.title}</p>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-4 transition-all ${
                    currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step Content */}
        <div className="mb-8">{renderStepContent()}</div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center">
          <button
            onClick={handleBack}
            className="flex items-center space-x-2 px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </button>

          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className={`flex items-center space-x-2 px-8 py-3 rounded-xl font-semibold transition-all ${
              canProceed()
                ? 'bg-gradient-to-r from-green-500 to-teal-600 text-white hover:from-green-600 hover:to-teal-700 shadow-lg hover:shadow-xl'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <span>{currentStep === 3 ? 'Start Building' : 'Next'}</span>
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

