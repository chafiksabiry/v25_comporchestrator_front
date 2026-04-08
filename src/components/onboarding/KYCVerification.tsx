import React, { useState, useEffect } from 'react';
import {
  Shield,
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Camera,
  Download,
  Building2,
  Globe,
  Clock,
  RefreshCw,
  Eye,
  EyeOff,
  HelpCircle,
  ChevronRight,
  X,
  CheckCircle2
} from 'lucide-react';
import axios from 'axios';
import Cookies from 'js-cookie';

const KYCVerification = () => {
  const [verificationMethod, setVerificationMethod] = useState('automatic');
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'in_progress' | 'completed' | 'failed'>('pending');
  const [currentStep, setCurrentStep] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [isStepCompleted, setIsStepCompleted] = useState(false);

  const companyId = Cookies.get('companyid') || Cookies.get('companyId');

  // Vérifier l'état de l'étape au chargement
  useEffect(() => {
    if (companyId) {
      checkStepStatus();
    }
  }, [companyId]);

  // Vérifier l'état de l'étape quand les données changent
  useEffect(() => {
    if (companyId && hasBasicInfo() && !isStepCompleted) {
      console.log('🎯 KYC data changed, checking if step should be auto-completed...');
      checkStepStatus();
    }
  }, [uploadedFiles, verificationStatus, currentStep, companyId, isStepCompleted]);

  const checkStepStatus = async () => {
    try {
      if (!companyId) return;

      console.log('🔍 Checking step 2 status for company:', companyId);

      // Vérifier l'état de l'étape 2 via l'API d'onboarding
      const response = await axios.get(
        `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/phases/1/steps/2`
      );

      console.log('📡 API response for step 2:', response.data);

      if (response.data && (response.data as any).status === 'completed') {
        console.log('✅ Step 2 is already completed according to API');
        setIsStepCompleted(true);
        return;
      }

      // Vérifier aussi le localStorage pour la cohérence
      const storedProgress = localStorage.getItem('companyOnboardingProgress');
      if (storedProgress) {
        try {
          const progress = JSON.parse(storedProgress);
          if (progress.completedSteps && Array.isArray(progress.completedSteps) && progress.completedSteps.includes(2)) {
            console.log('✅ Step 2 found in localStorage, setting as completed');
            setIsStepCompleted(true);
            return;
          }
        } catch (e) {
          console.error('❌ Error parsing stored progress:', e);
        }
      }

      // Si l'étape n'est pas marquée comme complétée mais que les informations de base sont présentes,
      // marquer automatiquement l'étape comme complétée localement
      if (hasBasicInfo() && !isStepCompleted) {
        console.log('🎯 Auto-completing step 2 locally because basic info is present');

        // Marquer l'étape comme complétée localement
        setIsStepCompleted(true);

        // Mettre à jour le localStorage avec l'étape 2 marquée comme complétée
        const currentCompletedSteps = [2];
        const currentProgress = {
          currentPhase: 1,
          completedSteps: currentCompletedSteps,
          lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('companyOnboardingProgress', JSON.stringify(currentProgress));

        // Synchroniser avec les cookies
        Cookies.set('kycVerificationStepCompleted', 'true', { expires: 7 });

        // Notifier le composant parent CompanyOnboarding via un événement personnalisé
        window.dispatchEvent(new CustomEvent('stepCompleted', {
          detail: {
            stepId: 2,
            phaseId: 1,
            status: 'completed',
            completedSteps: currentCompletedSteps
          }
        }));

        console.log('💾 Step 2 marked as completed locally and parent component notified');
      }

    } catch (error) {
      console.error('❌ Error checking step status:', error);

      // En cas d'erreur API, vérifier le localStorage
      const storedProgress = localStorage.getItem('companyOnboardingProgress');
      if (storedProgress) {
        try {
          const progress = JSON.parse(storedProgress);
          if (progress.completedSteps && Array.isArray(progress.completedSteps) && progress.completedSteps.includes(2)) {
            setIsStepCompleted(true);
          }
        } catch (e) {
          console.error('❌ Error parsing stored progress:', e);
        }
      }
    }
  };

  const hasBasicInfo = () => {
    const hasInfo = uploadedFiles.length >= 3 && verificationStatus === 'completed';
    console.log('🔍 Checking basic info for KYC:', {
      uploadedFiles: uploadedFiles.length,
      verificationStatus,
      hasInfo
    });
    return hasInfo;
  };

  const handleCompleteVerification = async () => {
    try {
      if (!companyId) {
        console.error('❌ No companyId available');
        return;
      }

      console.log('🚀 Completing KYC verification...');

      // Marquer l'étape 2 comme complétée
      const stepResponse = await axios.put(
        `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/phases/1/steps/2`,
        { status: 'completed' }
      );

      console.log('✅ Step 2 marked as completed:', stepResponse.data);

      // Mettre à jour l'état local
      setIsStepCompleted(true);

      // Mettre à jour le localStorage
      const currentProgress = {
        currentPhase: 1,
        completedSteps: [2],
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem('companyOnboardingProgress', JSON.stringify(currentProgress));

      // Synchroniser avec les cookies
      Cookies.set('kycVerificationStepCompleted', 'true', { expires: 7 });

      // Notifier le composant parent
      window.dispatchEvent(new CustomEvent('stepCompleted', {
        detail: {
          stepId: 2,
          phaseId: 1,
          status: 'completed',
          completedSteps: [2]
        }
      }));

      console.log('💾 KYC verification completed and step 2 marked as completed');

    } catch (error) {
      console.error('❌ Error completing KYC verification:', error);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileNames = Array.from(files).map(file => file.name);
      setUploadedFiles([...uploadedFiles, ...fileNames]);
    }
  };

  const requiredDocuments = [
    {
      title: 'Certificate of Incorporation',
      description: 'Official document proving company registration',
      format: 'PDF or Image',
      required: true,
      type: 'company'
    },
    {
      title: 'Proof of Address',
      description: 'Recent utility bill or bank statement (less than 3 months old)',
      format: 'PDF or Image',
      required: true,
      type: 'company'
    },
    {
      title: 'Director ID',
      description: 'Government-issued ID of company director',
      format: 'PDF or Image',
      required: true,
      type: 'personal'
    },
    {
      title: 'Bank Statement',
      description: 'Recent bank statement for account verification',
      format: 'PDF',
      required: true,
      type: 'financial'
    },
    {
      title: 'Tax Registration',
      description: 'Company tax registration certificate',
      format: 'PDF',
      required: true,
      type: 'company'
    },
    {
      title: 'Ownership Structure',
      description: 'Document showing company ownership structure',
      format: 'PDF',
      required: true,
      type: 'company'
    }
  ];

  const verificationSteps = [
    {
      title: 'Document Collection',
      description: 'Upload all required documents',
      status: currentStep > 1 ? 'completed' : currentStep === 1 ? 'current' : 'pending'
    },
    {
      title: 'Identity Verification',
      description: 'Verify company director identity',
      status: currentStep > 2 ? 'completed' : currentStep === 2 ? 'current' : 'pending'
    },
    {
      title: 'Business Verification',
      description: 'Verify business details and operations',
      status: currentStep > 3 ? 'completed' : currentStep === 3 ? 'current' : 'pending'
    },
    {
      title: 'Final Review',
      description: 'Review and confirm all information',
      status: currentStep > 4 ? 'completed' : currentStep === 4 ? 'current' : 'pending'
    }
  ];

  const handleDocumentPreview = (title: string) => {
    setSelectedDocument(title);
    setShowPreview(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white rounded-3xl p-8 border border-harx-100 shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-harx-50 rounded-full blur-3xl group-hover:bg-harx-100 transition-colors duration-700"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-harx flex items-center justify-center shadow-lg shadow-harx-500/20">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">KYC/KYB Verification</h2>
                {isStepCompleted && (
                  <div className="flex items-center gap-2 bg-emerald-100 text-emerald-800 px-4 py-1 rounded-full text-sm font-black uppercase tracking-widest shadow-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    Verified
                  </div>
                )}
              </div>
              <p className="text-lg text-gray-500 mt-1">Complete identity verification for your company to unlock all features.</p>
            </div>
          </div>
        </div>
        <div className="flex space-x-4 relative z-10">
          {!isStepCompleted ? (
            <button
              onClick={handleCompleteVerification}
              className="rounded-2xl bg-gradient-harx px-8 py-4 text-lg font-black text-white shadow-xl shadow-harx-500/30 hover:brightness-110 transition-all duration-300 transform hover:scale-[1.05] active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
              disabled={!hasBasicInfo()}
            >
              <CheckCircle className="mr-2 h-6 w-6 inline-block" />
              Submit Verification
            </button>
          ) : (
            <button className="rounded-2xl bg-emerald-600 px-8 py-4 text-lg font-black text-white shadow-xl shadow-emerald-500/20 cursor-not-allowed opacity-90">
              <CheckCircle2 className="mr-2 h-6 w-6 inline-block" />
              Verified Successfully
            </button>
          )}
        </div>
      </div>


      {/* Progress Steps */}
      <div className="rounded-3xl bg-white p-10 shadow-xl border border-harx-100">
        <div className="flex items-center justify-between mb-10">
          <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Verification Roadmap</h3>
          <span className="text-base font-bold text-harx-500 bg-harx-50 px-4 py-1 rounded-full border border-harx-100">Step {currentStep} of 4</span>
        </div>
        <div className="mt-4">
          <div className="relative">
            <div className="absolute left-0 top-5 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner">
              <div
                className="absolute h-full bg-gradient-harx transition-all duration-700 ease-out shadow-lg"
                style={{ width: `${(currentStep - 1) * 33.33}%` }}
              />
            </div>
            <div className="relative flex justify-between">
              {verificationSteps.map((step, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border-4 transition-all duration-500 shadow-md ${step.status === 'completed' ? 'border-harx-400 bg-gradient-harx text-white scale-110 shadow-harx-500/20' :
                    step.status === 'current' ? 'border-harx-500 bg-white text-harx-600 scale-125 shadow-xl ring-4 ring-harx-500/10' :
                      'border-gray-200 bg-white text-gray-300'
                    }`}>
                    {step.status === 'completed' ? (
                      <CheckCircle className="h-6 w-6" />
                    ) : (
                      <span className={`text-lg font-black transition-colors duration-500 ${step.status === 'current' ? 'text-harx-600' : 'text-gray-400'
                        }`}>
                        {index + 1}
                      </span>
                    )}
                  </div>
                  <div className="mt-4 text-center">
                    <p className={`text-base font-black tracking-tight transition-colors duration-500 ${step.status === 'completed' ? 'text-harx-600' :
                      step.status === 'current' ? 'text-gray-900 border-b-2 border-harx-500 pb-1' :
                        'text-gray-400'
                      }`}>
                      {step.title}
                    </p>
                    <p className="mt-2 text-sm text-gray-500 font-medium max-w-[120px]">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>


      {/* Verification Method Selection */}
      <div className="rounded-3xl bg-white p-8 shadow-xl border border-harx-100">
        <h3 className="text-2xl font-bold text-gray-900 mb-8 tracking-tight">Choose Verification Method</h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <button
            className={`flex items-center justify-between rounded-2xl border-2 p-6 transition-all duration-500 group relative overflow-hidden ${verificationMethod === 'automatic'
              ? 'border-harx-500 bg-harx-50 ring-4 ring-harx-500/10'
              : 'border-gray-100 hover:border-harx-200 hover:bg-gray-50'
              }`}
            onClick={() => setVerificationMethod('automatic')}
          >
            <div className="flex items-center relative z-10">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center mr-5 transition-colors duration-500 ${verificationMethod === 'automatic' ? 'bg-gradient-harx text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-harx-100 group-hover:text-harx-500'}`}>
                <Shield className="h-7 w-7" />
              </div>
              <div className="text-left">
                <p className={`text-xl font-bold transition-colors duration-500 ${verificationMethod === 'automatic' ? 'text-gray-900' : 'text-gray-500'}`}>Automatic</p>
                <p className="text-base text-gray-500 mt-1">Verified partner network</p>
              </div>
            </div>
            {verificationMethod === 'automatic' && (
              <CheckCircle className="h-6 w-6 text-harx-500 relative z-10" />
            )}
            <div className={`absolute bottom-0 right-0 w-24 h-24 bg-gradient-harx rounded-tl-[80px] transition-transform duration-700 translate-x-12 translate-y-12 opacity-10 group-hover:translate-x-8 group-hover:translate-y-8`}></div>
          </button>

          <button
            className={`flex items-center justify-between rounded-2xl border-2 p-6 transition-all duration-500 group relative overflow-hidden ${verificationMethod === 'manual'
              ? 'border-harx-500 bg-harx-50 ring-4 ring-harx-500/10'
              : 'border-gray-100 hover:border-harx-200 hover:bg-gray-50'
              }`}
            onClick={() => setVerificationMethod('manual')}
          >
            <div className="flex items-center relative z-10">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center mr-5 transition-colors duration-500 ${verificationMethod === 'manual' ? 'bg-gradient-harx text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-harx-100 group-hover:text-harx-500'}`}>
                <Upload className="h-7 w-7" />
              </div>
              <div className="text-left">
                <p className={`text-xl font-bold transition-colors duration-500 ${verificationMethod === 'manual' ? 'text-gray-900' : 'text-gray-500'}`}>Manual Review</p>
                <p className="text-base text-gray-500 mt-1">Direct document upload</p>
              </div>
            </div>
            {verificationMethod === 'manual' && (
              <CheckCircle className="h-6 w-6 text-harx-500 relative z-10" />
            )}
            <div className={`absolute bottom-0 right-0 w-24 h-24 bg-gradient-harx rounded-tl-[80px] transition-transform duration-700 translate-x-12 translate-y-12 opacity-10 group-hover:translate-x-8 group-hover:translate-y-8`}></div>
          </button>
        </div>
      </div>


      {verificationMethod === 'automatic' ? (
        <div className="rounded-3xl bg-white p-8 shadow-xl border border-harx-100">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="h-7 w-7 text-harx-500" />
            <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Automatic Verification</h3>
          </div>
          <div className="mt-4 space-y-6">
            <div className="rounded-2xl bg-gray-50 p-6 border border-gray-100 group hover:border-harx-200 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center mr-4 shadow-sm group-hover:bg-harx-100 transition-colors">
                    <Camera className="h-5 w-5 text-harx-500" />
                  </div>
                  <span className="text-xl font-bold text-gray-900 tracking-tight">Identity Verification</span>
                </div>
                <button className="rounded-xl bg-gradient-harx px-6 py-3 text-sm font-black text-white shadow-lg shadow-harx-500/20 hover:brightness-110 transition-all duration-300 transform hover:scale-105 active:scale-95">
                  Start Verification
                </button>
              </div>
              <p className="mt-3 text-base text-gray-500 font-medium">
                Complete the verification process through our secure partner platform using your camera.
              </p>
            </div>

            <div className="rounded-2xl bg-gray-50 p-6 border border-gray-100 group hover:border-harx-200 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center mr-4 shadow-sm group-hover:bg-harx-100 transition-colors">
                    <Building2 className="h-5 w-5 text-harx-500" />
                  </div>
                  <span className="text-xl font-bold text-gray-900 tracking-tight">Business Verification</span>
                </div>
                <button className="rounded-xl bg-gradient-harx px-6 py-3 text-sm font-black text-white shadow-lg shadow-harx-500/20 hover:brightness-110 transition-all duration-300 transform hover:scale-105 active:scale-95">
                  Verify Business
                </button>
              </div>
              <p className="mt-3 text-base text-gray-500 font-medium">
                Verify your business through official registries and databases automatically.
              </p>
            </div>

            <div className="rounded-2xl border-2 border-dashed border-harx-100 p-6 bg-harx-50/20">
              <h4 className="text-lg font-black text-harx-900 mb-4 uppercase tracking-widest">Verification Steps</h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  'Prepare valid government-issued ID',
                  'Ensure good lighting for photo capture',
                  'Follow on-screen instructions',
                  'Complete facial recognition check'
                ].map((step, i) => (
                  <li key={i} className="flex items-center text-sm text-gray-600 font-bold bg-white p-3 rounded-xl border border-harx-100 shadow-sm">
                    <CheckCircle className="mr-3 h-5 w-5 text-harx-500" />
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

      ) : (
        <div className="space-y-6">
          {/* Document Categories */}
          <div className="rounded-3xl bg-white p-8 shadow-xl border border-harx-100">
            <div className="mb-8 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Required Documents</h3>
              <div className="flex flex-col items-end">
                <span className="text-base font-bold text-gray-600 mb-2">
                  <span className="text-harx-600">{uploadedFiles.length}</span> of {requiredDocuments.length} uploaded
                </span>
                <div className="h-3 w-48 rounded-full bg-gray-100 shadow-inner overflow-hidden border border-gray-200">
                  <div
                    className="h-full bg-gradient-harx transition-all duration-700 shadow-lg"
                    style={{ width: `${(uploadedFiles.length / requiredDocuments.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {['company', 'personal', 'financial'].map((category) => (
                <div key={category} className="rounded-2xl border border-gray-100 p-6 bg-gray-50/30">
                  <h4 className="mb-6 text-lg font-black text-gray-900 uppercase tracking-widest border-b-2 border-harx-100 pb-2 inline-block capitalize">{category} Documents</h4>
                  <div className="space-y-4">
                    {requiredDocuments
                      .filter(doc => doc.type === category)
                      .map((doc, index) => (
                        <div key={index} className="rounded-2xl border border-gray-100 bg-white p-5 hover:border-harx-200 hover:shadow-lg transition-all duration-300 group">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-4">
                              <div className="mt-1 w-12 h-12 rounded-xl bg-harx-50 flex items-center justify-center transition-colors group-hover:bg-harx-100">
                                <FileText className="h-6 w-6 text-harx-500" />
                              </div>
                              <div>
                                <h4 className="text-lg font-bold text-gray-900 tracking-tight group-hover:text-harx-600 transition-colors">{doc.title}</h4>
                                <p className="text-sm text-gray-500 font-medium">{doc.description}</p>
                                <p className="mt-2 text-xs font-black text-harx-400 uppercase tracking-tighter">Format: {doc.format}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              {uploadedFiles.includes(doc.title) ? (
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => handleDocumentPreview(doc.title)}
                                    className="rounded-xl bg-gray-100 p-3 text-gray-600 hover:bg-harx-100 hover:text-harx-600 transition-all duration-300"
                                  >
                                    <Eye className="h-5 w-5" />
                                  </button>
                                  <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-sm font-black border border-emerald-100">
                                    <CheckCircle className="h-5 w-5" />
                                    <span>UPLOADED</span>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => document.getElementById(`file-${index}`)?.click()}
                                  className="rounded-xl bg-white px-6 py-3 text-sm font-black text-harx-600 shadow-sm ring-2 ring-inset ring-harx-100 hover:bg-harx-50 hover:ring-harx-200 transition-all duration-300"
                                >
                                  Upload
                                </button>
                              )}
                            </div>
                          </div>
                          <input
                            id={`file-${index}`}
                            type="file"
                            className="hidden"
                            onChange={handleFileUpload}
                            accept=".pdf,.jpg,.jpeg,.png"
                          />
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>


          {/* Document Preview Modal */}
          {showPreview && selectedDocument && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>
              <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all w-full max-w-lg p-6">
                <div className="absolute right-0 top-0 pr-4 pt-4">
                  <button
                    onClick={() => setShowPreview(false)}
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 w-full text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">
                      {selectedDocument}
                    </h3>
                    <div className="mt-4">
                      <div className="aspect-w-16 aspect-h-9 overflow-hidden rounded-lg bg-gray-100">
                        <div className="flex h-64 items-center justify-center">
                          <FileText className="h-16 w-16 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 rounded-2xl bg-amber-50 p-6 border border-amber-100 shadow-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-amber-500" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-black text-amber-900 tracking-tight uppercase">Document Guidelines</h3>
                <div className="mt-3 text-base text-amber-800 font-medium">
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-8 list-none">
                    {[
                      'All documents must be clear and legible',
                      'Files should not exceed 5MB in size',
                      'Supported formats: PDF, JPG, PNG',
                      'Documents must be in color',
                      'No expired documents will be accepted'
                    ].map((item, i) => (
                      <li key={i} className="flex items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-2 flex-shrink-0"></span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

        </div>
      )
      }

      {/* Verification Status */}
      <div className="rounded-3xl bg-white p-8 shadow-xl border border-harx-100">
        <h3 className="text-2xl font-bold text-gray-900 tracking-tight mb-8">Verification Status</h3>
        <div className="mt-4">
          <div className="flex items-center justify-between rounded-2xl bg-gray-50 p-8 border border-gray-100 relative overflow-hidden">
            <div className={`absolute left-0 top-0 bottom-0 w-2 ${verificationStatus === 'completed' ? 'bg-emerald-500' :
              verificationStatus === 'failed' ? 'bg-red-500' :
                verificationStatus === 'in_progress' ? 'bg-harx-500' : 'bg-gray-300'
              }`}></div>
            <div className="flex items-center space-x-6">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${verificationStatus === 'completed' ? 'bg-emerald-100 text-emerald-600 shadow-lg shadow-emerald-500/10' :
                verificationStatus === 'failed' ? 'bg-red-100 text-red-600 shadow-lg shadow-red-500/10' :
                  verificationStatus === 'in_progress' ? 'bg-harx-50 text-harx-500 shadow-lg shadow-harx-500/10' : 'bg-gray-100 text-gray-400'
                }`}>
                {verificationStatus === 'completed' ? (
                  <CheckCircle className="h-8 w-8" />
                ) : verificationStatus === 'failed' ? (
                  <AlertCircle className="h-8 w-8" />
                ) : verificationStatus === 'in_progress' ? (
                  <RefreshCw className="h-8 w-8 animate-spin" />
                ) : (
                  <Clock className="h-8 w-8" />
                )}
              </div>
              <div>
                <p className="text-2xl font-black text-gray-900 tracking-tight">
                  {verificationStatus === 'completed'
                    ? 'Verification Complete'
                    : verificationStatus === 'failed'
                      ? 'Verification Failed'
                      : verificationStatus === 'in_progress'
                        ? 'Verification in Progress'
                        : 'Verification Pending'}
                </p>
                <p className="text-base text-gray-500 font-medium mt-1">
                  {verificationStatus === 'completed'
                    ? 'Your company has been successfully verified.'
                    : verificationStatus === 'failed'
                      ? 'Please review and resubmit your documents.'
                      : verificationStatus === 'in_progress'
                        ? 'This process may take 1-2 business days.'
                        : 'Please submit all required documents.'}
                </p>
              </div>
            </div>
            {verificationStatus === 'completed' && (
              <button className="flex items-center rounded-xl bg-white px-6 py-3 text-sm font-black text-harx-600 shadow-md ring-1 ring-inset ring-harx-100 hover:bg-harx-50 transition-all duration-300 transform hover:scale-105">
                <Download className="mr-2 h-5 w-5" />
                Get Certificate
              </button>
            )}
          </div>
        </div>
      </div>


      {/* Help Section */}
      <div className="rounded-3xl bg-white p-8 shadow-xl border border-harx-100 group">
        <div className="flex items-start">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-harx-50 transition-colors">
            <HelpCircle className="h-6 w-6 text-gray-400 group-hover:text-harx-500 transition-colors" />
          </div>
          <div className="ml-5">
            <h3 className="text-xl font-bold text-gray-900 tracking-tight">Need Assistance?</h3>
            <div className="mt-2 text-base text-gray-500 font-medium leading-relaxed">
              <p>
                If you're having trouble with the verification process, our dedicated support team is here to help.
                Contact us through our support portal or schedule a call with our verification specialists.
              </p>
            </div>
            <div className="mt-4">
              <a href="#" className="inline-flex items-center text-sm font-black text-harx-500 hover:text-harx-700 transition-colors tracking-widest uppercase">
                Contact Support <ChevronRight className="ml-2 h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>

    </div >
  );
};

export default KYCVerification;