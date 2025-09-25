import { Dialog, Transition } from '@headlessui/react';
import React, { Fragment } from 'react';
import { SteppedRequirementForm } from './SteppedRequirementForm';
import { X } from 'lucide-react';

export interface RequirementFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  countryCode: string;
  requirements: Array<{
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
  }>;
  existingValues?: Array<{
    field: string;
    status: string;
    value?: string;
    documentUrl?: string;
    rejectionReason?: string;
    submittedAt?: string;
  }>;
  requirementGroupId?: string;
  requirementStatus: {
    isChecking: boolean;
    hasRequirements: boolean;
    isComplete: boolean;
    error: string | null;
    groupId?: string;
    telnyxId?: string;
    completionPercentage?: number;
    completedRequirements?: any[];
    totalRequirements?: number;
    pendingRequirements?: number;
  };
  onSubmit: (values: Record<string, any>) => Promise<void>;
}

export const RequirementFormModal: React.FC<RequirementFormModalProps> = ({
  isOpen,
  onClose,
  countryCode,
  requirements,
  existingValues,
  requirementGroupId,
  onSubmit
}) => {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => {}} static>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all">
                {/* Header avec gradient */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
                  <Dialog.Title as="div" className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-white">
                        Complete Requirements
                      </h3>
                      <p className="mt-1 text-sm text-indigo-100">
                        Required information for {countryCode} phone numbers
                      </p>
                    </div>
                    <button
                      type="button"
                      className="rounded-full p-1 text-indigo-100 hover:bg-indigo-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
                      onClick={onClose}
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </Dialog.Title>
                </div>

                {/* Corps du modal avec ombre subtile */}
                <div className="px-6 py-4 bg-gray-50">
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-yellow-700">
                          Please ensure all documents are clear, legible, and in the correct format.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-6 pb-6">
                  <SteppedRequirementForm
                    requirements={requirements}
                    existingValues={existingValues}
                    requirementGroupId={requirementGroupId}
                    destinationZone={countryCode.toLowerCase()}
                    onSubmit={onSubmit}
                    onCancel={onClose}
                  />
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};