import React, { useState, useEffect } from "react";
import {
  Upload,
  FileText,
  Users,
  CheckCircle,
  AlertCircle,
  Download,
  X,
  Phone,
  Mail,
  Building2,
  User,
  Loader2,
} from "lucide-react";
import axios from "axios";
import Cookies from "js-cookie";

interface Contact {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company?: string;
  position?: string;
  source?: string;
}

interface UploadResult {
  success: boolean;
  totalProcessed: number;
  successfulUploads: number;
  errors: string[];
  duplicates: number;
}

const UploadContacts = () => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [isStepCompleted, setIsStepCompleted] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<'upload' | 'preview' | 'processing' | 'completed'>('upload');

  const companyId = Cookies.get("companyId");
  const userId = Cookies.get("userId");

  // Check if step is already completed
  useEffect(() => {
    const checkStepCompletion = async () => {
      if (!companyId) return;

      try {
        const response = await axios.get(
          `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding`
        );
        const completedSteps = response.data.completedSteps || [];
        setIsStepCompleted(completedSteps.includes(6));
      } catch (error) {
        console.error("Error checking step completion:", error);
      }
    };

    checkStepCompletion();
  }, [companyId]);

  // Check for existing parsed leads from localStorage
  useEffect(() => {
    const parsedLeads = localStorage.getItem("parsedLeads");
    if (parsedLeads) {
      try {
        const leads = JSON.parse(parsedLeads);
        if (Array.isArray(leads) && leads.length > 0) {
          setContacts(leads);
          setCurrentStep('preview');
          console.log("🔄 Restored contacts from localStorage:", leads.length);
        }
      } catch (error) {
        console.error("Error parsing stored leads:", error);
        localStorage.removeItem("parsedLeads");
      }
    }
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const parseCSV = (csvText: string): Contact[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const contacts: Contact[] = [];

    // Map common column names
    const fieldMap: Record<string, string> = {
      'first name': 'firstName',
      'firstname': 'firstName',
      'first_name': 'firstName',
      'prénom': 'firstName',
      'last name': 'lastName',
      'lastname': 'lastName',
      'last_name': 'lastName',
      'nom': 'lastName',
      'email': 'email',
      'e-mail': 'email',
      'mail': 'email',
      'phone': 'phone',
      'telephone': 'phone',
      'téléphone': 'phone',
      'mobile': 'phone',
      'company': 'company',
      'société': 'company',
      'entreprise': 'company',
      'position': 'position',
      'job title': 'position',
      'title': 'position',
      'poste': 'position',
    };

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const contact: Contact = {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
      };

      headers.forEach((header, index) => {
        const fieldName = fieldMap[header];
        if (fieldName && values[index]) {
          (contact as any)[fieldName] = values[index];
        }
      });

      // Only add contact if it has at least email or phone
      if (contact.email || contact.phone) {
        contacts.push(contact);
      }
    }

    return contacts;
  };

  const handleFileUpload = async (file: File) => {
    setUploadedFile(file);
    setValidationErrors([]);

    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    
    if (!validTypes.includes(file.type) && !file.name.endsWith('.csv')) {
      setValidationErrors(['Please upload a CSV file']);
      return;
    }

    try {
      const text = await file.text();
      const parsedContacts = parseCSV(text);
      
      if (parsedContacts.length === 0) {
        setValidationErrors(['No valid contacts found in the file. Please check the format.']);
        return;
      }

      setContacts(parsedContacts);
      setCurrentStep('preview');
      
      // Store in localStorage for persistence
      localStorage.setItem("parsedLeads", JSON.stringify(parsedContacts));
      console.log(`📁 Parsed ${parsedContacts.length} contacts from file`);
      
    } catch (error) {
      console.error("Error parsing file:", error);
      setValidationErrors(['Error reading file. Please check the file format.']);
    }
  };

  const validateContacts = (): string[] => {
    const errors: string[] = [];
    let validEmails = 0;
    let validPhones = 0;

    contacts.forEach((contact, index) => {
      if (!contact.email && !contact.phone) {
        errors.push(`Contact ${index + 1}: Missing both email and phone`);
      }
      if (contact.email && !/\S+@\S+\.\S+/.test(contact.email)) {
        errors.push(`Contact ${index + 1}: Invalid email format`);
      } else if (contact.email) {
        validEmails++;
      }
      if (contact.phone) {
        validPhones++;
      }
    });

    if (validEmails === 0 && validPhones === 0) {
      errors.push('No contacts with valid email or phone numbers found');
    }

    return errors;
  };

  const handleUploadContacts = async () => {
    if (!companyId) {
      console.error("❌ No companyId available");
      return;
    }

    const errors = validateContacts();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsProcessing(true);
    setCurrentStep('processing');
    setValidationErrors([]);

    try {
      console.log("🚀 Uploading contacts to database...");

      // Prepare contacts data
      const contactsData = contacts.map(contact => ({
        ...contact,
        companyId,
        userId,
        source: 'csv_upload',
        createdAt: new Date().toISOString(),
      }));

      // Upload contacts to the leads API
      const response = await axios.post(
        `${import.meta.env.VITE_DASHBOARD_API}/leads/bulk-create`,
        {
          leads: contactsData,
          companyId,
        }
      );

      console.log("✅ Contacts uploaded successfully:", response.data);

      const result: UploadResult = {
        success: true,
        totalProcessed: contacts.length,
        successfulUploads: response.data.successCount || contacts.length,
        errors: response.data.errors || [],
        duplicates: response.data.duplicateCount || 0,
      };

      setUploadResult(result);
      setCurrentStep('completed');

      // Mark step 6 as completed
      await markStepAsCompleted();

      // Clean up localStorage after successful upload
      localStorage.removeItem("parsedLeads");
      localStorage.removeItem("validationResults");
      localStorage.removeItem("uploadProcessing");

      console.log("💾 Contacts upload completed successfully");

    } catch (error: any) {
      console.error("❌ Error uploading contacts:", error);
      
      const result: UploadResult = {
        success: false,
        totalProcessed: contacts.length,
        successfulUploads: 0,
        errors: [error.response?.data?.message || "Failed to upload contacts"],
        duplicates: 0,
      };
      
      setUploadResult(result);
      setCurrentStep('completed');
    } finally {
      setIsProcessing(false);
    }
  };

  const markStepAsCompleted = async () => {
    try {
      if (!companyId) {
        console.error('❌ No companyId available');
        return;
      }

      console.log('🎯 Marking step 6 as completed...');
      
      // Mark step 6 as completed in the onboarding API
      const stepResponse = await axios.put(
        `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/phases/2/steps/6`,
        { status: 'completed' }
      );
      
      console.log('✅ Step 6 marked as completed:', stepResponse.data);
      
      // Update local state
      setIsStepCompleted(true);
      
      // Get current onboarding progress
      const progressResponse = await axios.get(
        `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding`
      );
      
      const currentCompletedSteps = progressResponse.data.completedSteps || [];
      const newCompletedSteps = currentCompletedSteps.includes(6) ? currentCompletedSteps : [...currentCompletedSteps, 6];
      
      // Update localStorage with new progress
      const currentProgress = {
        currentPhase: 2,
        completedSteps: newCompletedSteps,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem('companyOnboardingProgress', JSON.stringify(currentProgress));
      
      // Update cookies
      Cookies.set('uploadContactsStepCompleted', 'true', { expires: 7 });
      
      // Notify parent component
      window.dispatchEvent(new CustomEvent('stepCompleted', { 
        detail: { 
          stepId: 6, 
          phaseId: 2, 
          status: 'completed',
          completedSteps: newCompletedSteps
        } 
      }));
      
      console.log('💾 Upload contacts step completed and progress updated');
      
    } catch (error) {
      console.error('❌ Error marking step as completed:', error);
    }
  };

  const handleReset = () => {
    setUploadedFile(null);
    setContacts([]);
    setUploadResult(null);
    setValidationErrors([]);
    setCurrentStep('upload');
    localStorage.removeItem("parsedLeads");
    localStorage.removeItem("validationResults");
    localStorage.removeItem("uploadProcessing");
  };

  const downloadTemplate = () => {
    const csvContent = "firstName,lastName,email,phone,company,position\nJohn,Doe,john.doe@example.com,+1234567890,Example Corp,Sales Manager\nJane,Smith,jane.smith@example.com,+0987654321,Tech Solutions,Marketing Director";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'contacts_template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  if (isStepCompleted && currentStep === 'upload') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Contacts Upload Completed
          </h2>
          <p className="text-gray-600 mb-6">
            Your contacts have been successfully uploaded and are ready for engagement.
          </p>
          <button
            onClick={handleReset}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
          >
            Upload More Contacts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Contacts</h1>
        <p className="text-gray-600">
          Import your contact list to start multi-channel engagement campaigns
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        <div className={`flex items-center ${currentStep === 'upload' ? 'text-indigo-600' : currentStep === 'preview' || currentStep === 'processing' || currentStep === 'completed' ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'upload' ? 'bg-indigo-100' : currentStep === 'preview' || currentStep === 'processing' || currentStep === 'completed' ? 'bg-green-100' : 'bg-gray-100'}`}>
            {currentStep === 'preview' || currentStep === 'processing' || currentStep === 'completed' ? <CheckCircle className="w-5 h-5" /> : '1'}
          </div>
          <span className="ml-2 font-medium">Upload File</span>
        </div>
        
        <div className={`w-12 h-0.5 ${currentStep === 'preview' || currentStep === 'processing' || currentStep === 'completed' ? 'bg-green-600' : 'bg-gray-300'}`}></div>
        
        <div className={`flex items-center ${currentStep === 'preview' ? 'text-indigo-600' : currentStep === 'processing' || currentStep === 'completed' ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'preview' ? 'bg-indigo-100' : currentStep === 'processing' || currentStep === 'completed' ? 'bg-green-100' : 'bg-gray-100'}`}>
            {currentStep === 'processing' || currentStep === 'completed' ? <CheckCircle className="w-5 h-5" /> : '2'}
          </div>
          <span className="ml-2 font-medium">Preview & Validate</span>
        </div>
        
        <div className={`w-12 h-0.5 ${currentStep === 'completed' ? 'bg-green-600' : 'bg-gray-300'}`}></div>
        
        <div className={`flex items-center ${currentStep === 'processing' ? 'text-indigo-600' : currentStep === 'completed' ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'processing' ? 'bg-indigo-100' : currentStep === 'completed' ? 'bg-green-100' : 'bg-gray-100'}`}>
            {currentStep === 'completed' ? <CheckCircle className="w-5 h-5" /> : currentStep === 'processing' ? <Loader2 className="w-5 h-5 animate-spin" /> : '3'}
          </div>
          <span className="ml-2 font-medium">Save Contacts</span>
        </div>
      </div>

      {/* Step Content */}
      {currentStep === 'upload' && (
        <div className="space-y-6">
          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Upload your contact list
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Drag and drop your CSV file here, or click to browse
            </p>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 inline-block"
            >
              Choose File
            </label>
          </div>

          {/* Template Download */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Need a template?</h4>
                <p className="text-sm text-gray-600">
                  Download our CSV template with the correct format
                </p>
              </div>
              <button
                onClick={downloadTemplate}
                className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-700"
              >
                <Download className="h-4 w-4" />
                <span>Download Template</span>
              </button>
            </div>
          </div>

          {/* Format Requirements */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">File Format Requirements</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• CSV format (.csv)</li>
              <li>• Required columns: firstName, lastName, email OR phone</li>
              <li>• Optional columns: company, position</li>
              <li>• Maximum file size: 10MB</li>
              <li>• Maximum contacts: 10,000 per upload</li>
            </ul>
          </div>
        </div>
      )}

      {currentStep === 'preview' && (
        <div className="space-y-6">
          {/* File Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-gray-400" />
                <div>
                  <h4 className="font-medium text-gray-900">{uploadedFile?.name}</h4>
                  <p className="text-sm text-gray-600">{contacts.length} contacts found</p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-900">Validation Errors</h4>
                  <ul className="mt-2 text-sm text-red-800 space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Contact Preview */}
          <div className="bg-white border rounded-lg">
            <div className="px-4 py-3 border-b">
              <h4 className="font-medium text-gray-900">Contact Preview</h4>
              <p className="text-sm text-gray-600">
                Showing first 5 contacts. {contacts.length} total contacts will be uploaded.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {contacts.slice(0, 5).map((contact, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {contact.firstName} {contact.lastName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {contact.email && (
                          <div className="flex items-center space-x-1">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span>{contact.email}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {contact.phone && (
                          <div className="flex items-center space-x-1">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span>{contact.phone}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {contact.company && (
                          <div className="flex items-center space-x-1">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            <span>{contact.company}</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <button
              onClick={handleReset}
              className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
            >
              Upload Different File
            </button>
            <button
              onClick={handleUploadContacts}
              disabled={validationErrors.length > 0}
              className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Upload {contacts.length} Contacts
            </button>
          </div>
        </div>
      )}

      {currentStep === 'processing' && (
        <div className="text-center py-12">
          <Loader2 className="mx-auto h-12 w-12 text-indigo-600 animate-spin mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Uploading Contacts</h3>
          <p className="text-gray-600">
            Please wait while we process and save your contacts...
          </p>
        </div>
      )}

      {currentStep === 'completed' && uploadResult && (
        <div className="space-y-6">
          {/* Results Summary */}
          <div className={`rounded-lg p-6 ${uploadResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-start space-x-3">
              {uploadResult.success ? (
                <CheckCircle className="h-6 w-6 text-green-500 mt-1" />
              ) : (
                <AlertCircle className="h-6 w-6 text-red-500 mt-1" />
              )}
              <div className="flex-1">
                <h3 className={`font-medium ${uploadResult.success ? 'text-green-900' : 'text-red-900'}`}>
                  {uploadResult.success ? 'Upload Completed Successfully' : 'Upload Completed with Errors'}
                </h3>
                <div className="mt-2 space-y-1 text-sm">
                  <p className={uploadResult.success ? 'text-green-800' : 'text-red-800'}>
                    Successfully uploaded: {uploadResult.successfulUploads} contacts
                  </p>
                  {uploadResult.duplicates > 0 && (
                    <p className="text-yellow-800">
                      Duplicates skipped: {uploadResult.duplicates}
                    </p>
                  )}
                  {uploadResult.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-red-800 font-medium">Errors:</p>
                      <ul className="mt-1 space-y-1">
                        {uploadResult.errors.map((error, index) => (
                          <li key={index} className="text-red-700">• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Success Actions */}
          {uploadResult.success && (
            <div className="text-center">
              <Users className="mx-auto h-16 w-16 text-green-500 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Contacts Ready for Engagement
              </h2>
              <p className="text-gray-600 mb-6">
                Your {uploadResult.successfulUploads} contacts are now available for multi-channel campaigns.
              </p>
              <div className="flex space-x-4 justify-center">
                <button
                  onClick={handleReset}
                  className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50"
                >
                  Upload More Contacts
                </button>
                <button
                  onClick={() => {
                    // Navigate back to onboarding to continue next steps
                    window.dispatchEvent(new CustomEvent('contactsUploadCompleted'));
                  }}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
                >
                  Continue Onboarding
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UploadContacts;
