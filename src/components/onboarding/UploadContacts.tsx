import React, { useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import axios from 'axios';
import Cookies from 'js-cookie';

const UploadContacts: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSaveLeads = async () => {
    setIsProcessing(true);
    try {
      const companyId = Cookies.get('companyId');
      if (!companyId) {
        throw new Error('Company ID not found');
      }

      // Simuler la sauvegarde des leads
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mettre à jour l'onboarding
      await axios.put(
        `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/phases/2/steps/6`,
        { status: 'completed' }
      );
      
      // Notifier le parent que l'étape est complétée
      const stepCompletedEvent = new CustomEvent('stepCompleted', {
        detail: {
          stepId: 6,
          phaseId: 2,
          status: 'completed',
          completedSteps: [6]
        }
      });
      window.dispatchEvent(stepCompletedEvent);
      
      localStorage.setItem('stepCompleted', JSON.stringify({
        stepId: 6,
        phaseId: 2,
        data: { success: true, leadsSaved: 1 }
      }));
      
      console.log('✅ Step 6 completion event dispatched successfully');
      
      setUploadStatus('success');
      setMessage('Contacts uploaded and saved successfully!');
    } catch (error) {
      console.error('Error saving leads:', error);
      setUploadStatus('error');
      setMessage('Failed to save contacts. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <Upload className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Contacts</h1>
          <p className="text-gray-600">Import your contacts for multi-channel engagement</p>
        </div>

        {uploadStatus === 'idle' && (
          <div className="space-y-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">Drag and drop your contact file here, or click to browse</p>
              <button 
                onClick={handleSaveLeads}
                disabled={isProcessing}
                className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : 'Upload & Save Contacts'}
              </button>
            </div>
          </div>
        )}

        {uploadStatus === 'success' && (
          <div className="text-center p-8">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-green-900 mb-2">Upload Successful!</h2>
            <p className="text-green-700">{message}</p>
          </div>
        )}

        {uploadStatus === 'error' && (
          <div className="text-center p-8">
            <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-red-900 mb-2">Upload Failed</h2>
            <p className="text-red-700 mb-4">{message}</p>
            <button 
              onClick={() => setUploadStatus('idle')}
              className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadContacts;
