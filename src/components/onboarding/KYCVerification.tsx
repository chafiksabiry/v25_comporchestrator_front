import React, { useState } from 'react';
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
  X
} from 'lucide-react';

const KYCVerification = () => {
  const [verificationMethod, setVerificationMethod] = useState('automatic');
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'in_progress' | 'completed' | 'failed'>('pending');
  const [currentStep, setCurrentStep] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">KYC/KYB Verification</h2>
          <p className="text-sm text-gray-500">Complete identity verification for your company</p>
        </div>
        <div className="flex space-x-3">
          <button className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
            Save Progress
          </button>
          <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
            Submit for Verification
          </button>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Verification Progress</h3>
          <span className="text-sm text-gray-500">Step {currentStep} of 4</span>
        </div>
        <div className="mt-4">
          <div className="relative">
            <div className="absolute left-0 top-2 h-0.5 w-full bg-gray-200">
              <div 
                className="absolute h-0.5 bg-indigo-600 transition-all duration-500"
                style={{ width: `${(currentStep - 1) * 33.33}%` }}
              />
            </div>
            <div className="relative flex justify-between">
              {verificationSteps.map((step, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                    step.status === 'completed' ? 'border-indigo-600 bg-indigo-600' :
                    step.status === 'current' ? 'border-indigo-600 bg-white' :
                    'border-gray-300 bg-white'
                  }`}>
                    {step.status === 'completed' ? (
                      <CheckCircle className="h-5 w-5 text-white" />
                    ) : (
                      <span className={`text-sm font-medium ${
                        step.status === 'current' ? 'text-indigo-600' : 'text-gray-500'
                      }`}>
                        {index + 1}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <p className={`text-sm font-medium ${
                      step.status === 'completed' ? 'text-indigo-600' :
                      step.status === 'current' ? 'text-gray-900' :
                      'text-gray-500'
                    }`}>
                      {step.title}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Verification Method Selection */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-lg font-medium text-gray-900">Choose Verification Method</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button
            className={`flex items-center justify-between rounded-lg border p-4 ${
              verificationMethod === 'automatic'
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
            onClick={() => setVerificationMethod('automatic')}
          >
            <div className="flex items-center">
              <Shield className="mr-3 h-6 w-6 text-indigo-600" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Automatic Verification</p>
                <p className="text-sm text-gray-500">Quick verification through our trusted partners</p>
              </div>
            </div>
            {verificationMethod === 'automatic' && (
              <CheckCircle className="h-5 w-5 text-indigo-600" />
            )}
          </button>

          <button
            className={`flex items-center justify-between rounded-lg border p-4 ${
              verificationMethod === 'manual'
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
            onClick={() => setVerificationMethod('manual')}
          >
            <div className="flex items-center">
              <Upload className="mr-3 h-6 w-6 text-indigo-600" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Manual Document Upload</p>
                <p className="text-sm text-gray-500">Upload required documents manually</p>
              </div>
            </div>
            {verificationMethod === 'manual' && (
              <CheckCircle className="h-5 w-5 text-indigo-600" />
            )}
          </button>
        </div>
      </div>

      {verificationMethod === 'automatic' ? (
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-lg font-medium text-gray-900">Automatic Verification</h3>
          <div className="mt-4 space-y-4">
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Camera className="mr-2 h-5 w-5 text-indigo-600" />
                  <span className="font-medium text-gray-900">Identity Verification</span>
                </div>
                <button className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
                  Start Verification
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Complete the verification process through our secure partner platform
              </p>
            </div>

            <div className="rounded-lg bg-gray-50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Building2 className="mr-2 h-5 w-5 text-indigo-600" />
                  <span className="font-medium text-gray-900">Business Verification</span>
                </div>
                <button className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
                  Verify Business
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Verify your business through official registries and databases
              </p>
            </div>

            <div className="rounded-lg border border-gray-200 p-4">
              <h4 className="font-medium text-gray-900">Verification Steps</h4>
              <ul className="mt-2 space-y-2">
                <li className="flex items-center text-sm text-gray-500">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  Prepare valid government-issued ID
                </li>
                <li className="flex items-center text-sm text-gray-500">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  Ensure good lighting for photo capture
                </li>
                <li className="flex items-center text-sm text-gray-500">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  Follow on-screen instructions
                </li>
                <li className="flex items-center text-sm text-gray-500">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  Complete facial recognition check
                </li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Document Categories */}
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Required Documents</h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  {uploadedFiles.length} of {requiredDocuments.length} uploaded
                </span>
                <div className="h-2 w-24 rounded-full bg-gray-200">
                  <div 
                    className="h-2 rounded-full bg-indigo-600" 
                    style={{ width: `${(uploadedFiles.length / requiredDocuments.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {['company', 'personal', 'financial'].map((category) => (
                <div key={category} className="rounded-lg border border-gray-200 p-4">
                  <h4 className="mb-3 font-medium text-gray-900 capitalize">{category} Documents</h4>
                  <div className="space-y-3">
                    {requiredDocuments
                      .filter(doc => doc.type === category)
                      .map((doc, index) => (
                        <div key={index} className="rounded-lg border border-gray-200 p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3">
                              <div className="mt-1">
                                <FileText className="h-5 w-5 text-indigo-600" />
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">{doc.title}</h4>
                                <p className="text-sm text-gray-500">{doc.description}</p>
                                <p className="mt-1 text-xs text-gray-400">Format: {doc.format}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {uploadedFiles.includes(doc.title) ? (
                                <div className="flex items-center space-x-2">
                                  <button 
                                    onClick={() => handleDocumentPreview(doc.title)}
                                    className="rounded-md bg-gray-100 p-1 text-gray-600 hover:bg-gray-200"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                  <span className="text-sm text-green-600">Uploaded</span>
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                </div>
                              ) : (
                                <button
                                  onClick={() => document.getElementById(`file-${index}`)?.click()}
                                  className="rounded-md bg-white px-3 py-2 text-sm font-medium text-indigo-600 shadow-sm ring-1 ring-inset ring-indigo-300 hover:bg-indigo-50"
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
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex min-h-screen items-end justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                  <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>
                <div className="inline-block transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 sm:align-middle">
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
            </div>
          )}

          <div className="mt-6 rounded-lg bg-yellow-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Document Guidelines</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <ul className="list-disc space-y-1 pl-5">
                    <li>All documents must be clear and legible</li>
                    <li>Files should not exceed 5MB in size</li>
                    <li>Supported formats: PDF, JPG, PNG</li>
                    <li>Documents must be in color and not black and white</li>
                    <li>No expired documents will be accepted</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Verification Status */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-lg font-medium text-gray-900">Verification Status</h3>
        <div className="mt-4">
          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
            <div className="flex items-center space-x-3">
              {verificationStatus === 'completed' ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : verificationStatus === 'failed' ? (
                <AlertCircle className="h-6 w-6 text-red-500" />
              ) : verificationStatus === 'in_progress' ? (
                <RefreshCw className="h-6 w-6 animate-spin text-indigo-600" />
              ) : (
                <Clock className="h-6 w-6 text-gray-400" />
              )}
              <div>
                <p className="font-medium text-gray-900">
                  {verificationStatus === 'completed'
                    ? 'Verification Complete'
                    : verificationStatus === 'failed'
                    ? 'Verification Failed'
                    : verificationStatus === 'in_progress'
                    ? 'Verification in Progress'
                    : 'Verification Pending'}
                </p>
                <p className="text-sm text-gray-500">
                  {verificationStatus === 'completed'
                    ? 'Your company has been successfully verified'
                    : verificationStatus === 'failed'
                    ? 'Please review and resubmit your documents'
                    : verificationStatus === 'in_progress'
                    ? 'This process may take 1-2 business days'
                    : 'Please submit all required documents'}
                </p>
              </div>
            </div>
            {verificationStatus === 'completed' && (
              <button className="flex items-center rounded-md bg-white px-3 py-2 text-sm font-medium text-indigo-600 shadow-sm ring-1 ring-inset ring-indigo-300 hover:bg-indigo-50">
                <Download className="mr-2 h-4 w-4" />
                Download Certificate
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <HelpCircle className="h-6 w-6 text-gray-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-gray-900">Need Help?</h3>
            <div className="mt-2 text-sm text-gray-500">
              <p>
                If you're having trouble with the verification process, our support team is here to help.
                Contact us through our support portal or schedule a call with our verification specialists.
              </p>
            </div>
            <div className="mt-3">
              <a href="#" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                Contact Support <ChevronRight className="ml-1 inline-block h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KYCVerification;