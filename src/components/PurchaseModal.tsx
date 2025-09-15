import { CheckCircle, AlertCircle } from 'lucide-react';
import { RequirementForm } from './RequirementForm';
import React from 'react';
interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseStatus: 'idle' | 'confirming' | 'requirements' | 'purchasing' | 'success' | 'error';
  selectedNumber: string | null;
  countryReq: {
    hasRequirements: boolean;
    requirements?: any[];
  };
  requirementStatus: {
    isChecking: boolean;
    hasRequirements: boolean;
    isComplete: boolean;
    error: string | null;
  };
  provider: string;
  purchaseError: string | null;
  onSubmitRequirements: (values: Record<string, any>) => Promise<void>;
  onConfirmPurchase: () => Promise<void>;
  onSetPurchaseStatus: (status: 'idle' | 'confirming' | 'requirements' | 'purchasing' | 'success' | 'error') => void;
  onSetSelectedNumber: (number: string | null) => void;
  onSetShowPurchaseModal: (show: boolean) => void;
}

export const PurchaseModal: React.FC<PurchaseModalProps> = ({
  isOpen,
  onClose,
  purchaseStatus,
  selectedNumber,
  countryReq,
  requirementStatus,
  provider,
  purchaseError,
  onSubmitRequirements,
  onConfirmPurchase,
  onSetPurchaseStatus,
  onSetSelectedNumber,
  onSetShowPurchaseModal
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay avec effet de flou */}
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl rounded-lg bg-white shadow-2xl">
          {/* En-tête du modal avec bouton de fermeture */}
          <div className="relative border-b border-gray-200 p-4">
            <h3 className="pr-8 text-lg font-medium text-gray-900">
              {purchaseStatus === 'confirming' && 'Confirm Purchase'}
              {purchaseStatus === 'requirements' && 'Complete Requirements'}
              {purchaseStatus === 'purchasing' && 'Purchasing Number...'}
              {purchaseStatus === 'success' && 'Purchase Successful!'}
              {purchaseStatus === 'error' && 'Purchase Failed'}
            </h3>
            <button
              onClick={() => {
                onSetShowPurchaseModal(false);
                onSetPurchaseStatus('idle');
                onSetSelectedNumber(null);
              }}
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
            {purchaseStatus === 'requirements' ? (
              <RequirementForm
                requirements={countryReq.requirements || []}
                onSubmit={onSubmitRequirements}
                onCancel={() => {
                  onSetShowPurchaseModal(false);
                  onSetPurchaseStatus('idle');
                  onSetSelectedNumber(null);
                }}
              />
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  Are you sure you want to purchase the number <span className="font-medium">{selectedNumber}</span>?
                </p>
                {provider === 'telnyx' && (
                  <div className={`rounded-lg ${
                    requirementStatus.isComplete ? 'bg-green-50' : 'bg-yellow-50'
                  } p-4`}>
                    <div className="flex">
                      {requirementStatus.isComplete ? (
                        <CheckCircle className="h-5 w-5 text-green-400" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-yellow-400" />
                      )}
                      <div className="ml-3">
                        <p className="text-sm text-gray-600">
                          {requirementStatus.isComplete
                            ? 'Your company is approved to purchase numbers.'
                            : (
                              <>
                                Requirements are needed for this number.
                                <button
                                  onClick={() => onSetPurchaseStatus('requirements')}
                                  className="ml-2 text-indigo-600 hover:text-indigo-500"
                                >
                                  Complete now
                                </button>
                              </>
                            )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {purchaseStatus === 'purchasing' && (
              <div className="flex items-center justify-center space-x-2">
                <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-indigo-600"></div>
                <p className="text-sm text-gray-500">Processing your purchase...</p>
              </div>
            )}
            {purchaseStatus === 'success' && (
              <div className="text-center">
                <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
                <p className="text-sm text-gray-500">
                  Number <span className="font-medium">{selectedNumber}</span> has been successfully purchased!
                </p>
              </div>
            )}
            {purchaseStatus === 'error' && (
              <div className="text-center">
                <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
                <p className="text-sm text-red-600">{purchaseError}</p>
              </div>
            )}
          </div>

          {/* Pied du modal avec boutons */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex justify-end space-x-3">
              {purchaseStatus === 'confirming' && (
                <>
                  <button
                    onClick={() => {
                      onSetShowPurchaseModal(false);
                      onSetPurchaseStatus('idle');
                      onSetSelectedNumber(null);
                    }}
                    className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onConfirmPurchase}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    Confirm Purchase
                  </button>
                </>
              )}
              {(purchaseStatus === 'error' || purchaseStatus === 'success') && (
                <button
                  onClick={() => {
                    onSetShowPurchaseModal(false);
                    onSetPurchaseStatus('idle');
                    onSetSelectedNumber(null);
                  }}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
