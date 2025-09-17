import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { RequirementForm } from './RequirementForm';

interface RequirementFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  countryCode: string;
  requirements: {
    id: string;
    name: string;
    type: 'document' | 'textual' | 'address';
    description: string;
    example: string;
    acceptance_criteria: {
      max_length?: number;
      min_length?: number;
      time_limit?: string;
      locality_limit?: string;
      acceptable_values?: string[];
    };
  }[];
  existingValues?: {
    field: string;
    value?: string;
    documentUrl?: string;
    status: string;
    rejectionReason?: string;
  }[];
  onSubmit: (values: Record<string, any>) => Promise<void>;
}

export const RequirementFormModal: React.FC<RequirementFormModalProps> = ({
  isOpen,
  onClose,
  countryCode,
  requirements,
  existingValues,
  onSubmit
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay avec effet de flou */}
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl rounded-lg bg-white shadow-2xl">
          {/* En-tête du modal avec bouton de fermeture */}
          <div className="relative border-b border-gray-200 p-4">
            <h3 className="pr-8 text-lg font-medium text-gray-900">
              {existingValues ? 'Update Requirements' : 'Complete Requirements'}
            </h3>
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="sr-only">Close</span>
            </button>
          </div>

          {/* Contenu du modal avec défilement */}
          <div className="max-h-[calc(100vh-16rem)] overflow-y-auto p-6">
            <div className="mb-6">
              <div className="rounded-lg bg-blue-50 p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-blue-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Requirements for {countryCode}
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>
                        Please provide the following information to purchase phone numbers in {countryCode}.
                        All documents must be clear and legible.
                      </p>
                      {existingValues && (
                        <p className="mt-2">
                          You can update existing information or provide missing requirements.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <RequirementForm
              requirements={requirements}
              existingValues={existingValues}
              onSubmit={onSubmit}
              onCancel={onClose}
            />
          </div>
        </div>
      </div>
    </>
  );
};
