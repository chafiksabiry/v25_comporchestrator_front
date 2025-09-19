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
  }>;
  requirementGroupId?: string;
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
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="div" className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">
                    Complete Requirements
                  </h3>
                  <button
                    type="button"
                    className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                    onClick={onClose}
                  >
                    <X className="h-6 w-6" />
                  </button>
                </Dialog.Title>

                <div className="mb-4">
                  <p className="text-sm text-gray-500">
                    Please provide the following information to purchase phone numbers in {countryCode}. All documents must be clear and legible.
                  </p>
                </div>

                <SteppedRequirementForm
                  requirements={requirements}
                  existingValues={existingValues}
                  requirementGroupId={requirementGroupId}
                  destinationZone={countryCode.toLowerCase()}
                  onSubmit={onSubmit}
                  onCancel={onClose}
                />
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};