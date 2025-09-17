import React, { useState, useCallback } from 'react';
import { validationService } from '../services/validationService';
import { documentService } from '../services/documentService';
import { requirementGroupService } from '../services/requirementGroupService';
import {
  FileText,
  Upload,
  AlertCircle,
  CheckCircle,
  MapPin,
  User,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';

interface RequirementType {
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
}

interface RequirementValue {
  field: string;
  value?: string;
  documentUrl?: string;
  status: string;
  rejectionReason?: string;
}

interface AddressFields {
  street: string;
  city: string;
  postalCode: string;
  state: string;
  country: string;
  // Champs optionnels
  streetNumber?: string;
  streetType?: string;
  buildingName?: string;
  floor?: string;
  apartment?: string;
  district?: string;
  region?: string;
  additionalInfo?: string;
}

interface SteppedRequirementFormProps {
  requirements: RequirementType[];
  existingValues?: RequirementValue[];
  requirementGroupId?: string;
  onSubmit: (values: Record<string, any>) => Promise<void>;
  onCancel: () => void;
}

export const SteppedRequirementForm: React.FC<SteppedRequirementFormProps> = ({
  requirements,
  existingValues,
  requirementGroupId: initialGroupId,
  onSubmit,
  onCancel
}) => {
  // Créer une étape pour chaque requirement
  const steps = requirements.map(req => {
    let icon;
    let label;
    switch (req.type) {
      case 'document':
        icon = FileText;
        label = req.name;
        break;
      case 'address':
        icon = MapPin;
        label = req.name;
        break;
      case 'textual':
        icon = User;
        label = req.name;
        break;
      default:
        icon = User;
        label = req.name;
    }
    return {
      id: req.id,
      label,
      icon,
      requirement: req
    };
  });

  // État pour stocker l'ID du groupe de requirements
  const [requirementGroupId, setRequirementGroupId] = useState<string | null>(initialGroupId || null);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [values, setValues] = useState<Record<string, any>>(() => {
    if (!existingValues || !Array.isArray(existingValues)) return {};
    return existingValues.reduce((acc, val) => {
      if (val.value) {
        acc[val.field] = val.value;
      } else if (val.documentUrl) {
        acc[val.field] = val.documentUrl;
      }
      return acc;
    }, {} as Record<string, any>);
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validatedSteps, setValidatedSteps] = useState<number[]>([]);

  // État pour les champs d'adresse
  const [addressFields, setAddressFields] = useState<Record<string, AddressFields>>(() => {
    if (!existingValues) return {};
    return existingValues.reduce((acc, val) => {
      if (val.value && val.field) {
        try {
          const addressData = JSON.parse(val.value);
          if (typeof addressData === 'object' && addressData !== null) {
            acc[val.field] = addressData;
          }
        } catch (e) {
          console.log('Not a JSON string for address field:', val.field);
        }
      }
      return acc;
    }, {} as Record<string, AddressFields>);
  });

  const currentStep = steps[currentStepIndex];
  const currentRequirement = currentStep?.requirement;

  // Log pour le debugging
  console.log('Current step data:', {
    currentStepIndex,
    currentStep,
    currentRequirement,
    requirementGroupId,
    values
  });

  // S'assurer qu'il y a au moins une étape
  React.useEffect(() => {
    if (steps.length === 0) {
      console.warn('No steps available - no requirements found');
      onCancel();
    }
  }, [steps.length, onCancel]);

  const validateStep = useCallback(async () => {
    if (!currentRequirement || !currentStep) return false;

    const stepErrors: Record<string, string> = {};
    let isValid = true;
    const value = values[currentStep.id];

    // Validation de base
    if (!value && !existingValues?.find(v => v.field === currentStep.id)) {
      stepErrors[currentStep.id] = 'This field is required';
      isValid = false;
    }

    // Si la valeur existe déjà et est valide, on continue
    const existingValue = existingValues?.find(v => v.field === currentStep.id);
    if (existingValue && existingValue.status === 'approved') {
      return true;
    }

    if (!isValid) {
      setErrors(stepErrors);
      return false;
    }

    // Initialiser submittedValue avec la valeur actuelle
    let submittedValue = value;

    // Validation spécifique par type
    try {
      switch (currentRequirement.type) {
        case 'document':
          if (value instanceof File) {
            if (value.size > 5 * 1024 * 1024) {
              throw new Error('File size must be less than 5MB');
            }
            const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
            if (!allowedTypes.includes(value.type)) {
              throw new Error('Only JPG, PNG and PDF files are allowed');
            }
          }
          break;

        case 'address':
          const addressData = typeof value === 'string' ? JSON.parse(value) : value;
          if (!addressData.street || !addressData.city || !addressData.postalCode || !addressData.country) {
            throw new Error('Required address fields are missing');
          }
          break;

        case 'textual':
          if (currentRequirement.acceptance_criteria) {
            const { min_length, max_length } = currentRequirement.acceptance_criteria;
            if (min_length && value.length < min_length) {
              throw new Error(`Minimum length is ${min_length} characters`);
            }
            if (max_length && value.length > max_length) {
              throw new Error(`Maximum length is ${max_length} characters`);
            }
          }
          break;
      }

      // Retourner la valeur validée
      return { isValid: true, submittedValue };
    } catch (error) {
      console.error('Validation error:', error);
      setErrors({
        [currentStep.id]: error instanceof Error ? error.message : 'Validation failed'
      });
      return { isValid: false, submittedValue: null };
    }
  }, [currentStep, currentRequirement, values]);

  const handleNext = async () => {
    if (!currentStep || !currentRequirement) {
      console.error('Missing current step or requirement data');
      return;
    }

    if (!requirementGroupId) {
      console.error('Missing requirement group ID');
      setErrors({
        submit: 'Configuration error: Missing requirement group ID'
      });
      return;
    }

    console.log('Processing step:', {
      currentStep,
      currentRequirement,
      requirementGroupId,
      value: values[currentStep.id]
    });

    const isValid = await validateStep();
    if (!isValid) {
      console.error('Validation failed');
      return;
    }

    try {
      // Obtenir la valeur actuelle
      const value = values[currentStep.id];
      if (!value) {
        console.error('No value provided for current step');
        return;
      }

      // Utiliser la valeur actuelle
      let submittedValue = value;
      switch (currentRequirement.type) {
        case 'document':
          if (value instanceof File) {
            console.log('Uploading document:', value.name);
            // 1. Upload du document pour obtenir un ID
            // Créer un nom de fichier personnalisé basé sur le type de document
            const filename = `${currentRequirement.name.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString()}`;
            
            const uploadResult = await documentService.uploadDocument(
              value,
              filename,
              requirementGroupId // Utiliser l'ID du groupe comme référence client
            );
            console.log('Upload result:', uploadResult);
            
            if (!uploadResult.id) {
              throw new Error('Document upload failed - no ID received');
            }

            // Le document est uploadé avec succès, on peut utiliser son ID
            submittedValue = uploadResult.id;

            // Stocker les informations du document pour l'affichage et pour la mise à jour
            const documentDetails = {
              id: uploadResult.id,
              filename: uploadResult.filename,
              status: uploadResult.status,
              createdAt: uploadResult.createdAt
            };

            setValues(prev => ({
              ...prev,
              [`${currentRequirement.id}_details`]: documentDetails
            }));

            // On stocke l'ID pour la mise à jour unique à la fin
            submittedValue = uploadResult.id;
          } else {
            console.log('Using existing document value');
            submittedValue = value;
          }
          break;

        case 'address':
          const addressData = typeof value === 'string' ? JSON.parse(value) : value;
          const addressResult = await validationService.validateAddress(addressData);
          if (addressResult.status !== 'valid' || !addressResult.id) {
            throw new Error('Address validation failed');
          }
          submittedValue = addressResult.id;
          break;

        case 'textual':
          submittedValue = value;
          break;

        default:
          throw new Error(`Unsupported requirement type: ${currentRequirement.type}`);
      }

      // Mettre à jour le requirement group dans le backend avec la valeur finale
      console.log('Updating requirement group:', {
        groupId: requirementGroupId,
        requirementId: currentRequirement.id,
        value: submittedValue
      });

      await requirementGroupService.updateRequirements(requirementGroupId, [{
        requirementId: currentRequirement.id,
        value: submittedValue
      }]);

      // Marquer l'étape comme validée
      if (!validatedSteps.includes(currentStepIndex)) {
        setValidatedSteps(prev => [...prev, currentStepIndex]);
      }

      // Passer à l'étape suivante ou terminer
      if (currentStepIndex < steps.length - 1) {
        setCurrentStepIndex(prev => prev + 1);
      } else {
        handleSubmit();
      }

    } catch (error) {
      console.error('Error processing step:', error);
      setErrors(prev => ({
        ...prev,
        [currentStep.id]: error instanceof Error ? error.message : 'Failed to process step'
      }));
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    const isValid = await validateStep();
    if (!isValid) return;

    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } catch (error) {
      console.error('Error submitting requirements:', error);
      setErrors(prev => ({
        ...prev,
        submit: error instanceof Error ? error.message : 'Failed to submit requirements'
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderAddressFields = (req: RequirementType) => {
    const addressData = addressFields[req.id] || {};
    const error = errors[req.id];

    const updateAddressField = (field: keyof AddressFields, value: string) => {
      const newAddressData = {
        ...addressData,
        [field]: value
      };
      setAddressFields(prev => ({
        ...prev,
        [req.id]: newAddressData
      }));
      setValues(prev => ({
        ...prev,
        [req.id]: JSON.stringify(newAddressData)
      }));
    };

    return (
      <div className="space-y-4">
        {/* Champs requis */}
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Street address *"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            value={addressData.street || ''}
            onChange={e => updateAddressField('street', e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="City *"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={addressData.city || ''}
              onChange={e => updateAddressField('city', e.target.value)}
            />
            <input
              type="text"
              placeholder="Postal code *"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={addressData.postalCode || ''}
              onChange={e => updateAddressField('postalCode', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="State/Province *"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={addressData.state || ''}
              onChange={e => updateAddressField('state', e.target.value)}
            />
            <input
              type="text"
              placeholder="Country *"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={addressData.country || ''}
              onChange={e => updateAddressField('country', e.target.value)}
            />
          </div>
        </div>

        {/* Champs optionnels */}
        <div className="mt-4 border-t border-gray-200 pt-4">
          <p className="mb-2 text-sm text-gray-500">Additional Information (Optional)</p>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Street Number"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={addressData.streetNumber || ''}
                onChange={e => updateAddressField('streetNumber', e.target.value)}
              />
              <input
                type="text"
                placeholder="Street Type"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={addressData.streetType || ''}
                onChange={e => updateAddressField('streetType', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Building Name"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={addressData.buildingName || ''}
                onChange={e => updateAddressField('buildingName', e.target.value)}
              />
              <input
                type="text"
                placeholder="Floor"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={addressData.floor || ''}
                onChange={e => updateAddressField('floor', e.target.value)}
              />
            </div>
            <input
              type="text"
              placeholder="Apartment/Suite"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={addressData.apartment || ''}
              onChange={e => updateAddressField('apartment', e.target.value)}
            />
            <input
              type="text"
              placeholder="District"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={addressData.district || ''}
              onChange={e => updateAddressField('district', e.target.value)}
            />
            <input
              type="text"
              placeholder="Additional Information"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={addressData.additionalInfo || ''}
              onChange={e => updateAddressField('additionalInfo', e.target.value)}
            />
          </div>
        </div>

        {error && (
          <p className="mt-1 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  };

  const renderRequirement = (req: RequirementType) => {
    const error = errors[req.id];
    const value = values[req.id];

    return (
      <div key={req.id} className="space-y-4 bg-gray-50 p-6 rounded-lg border border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            {(() => {
              const Icon = req.type === 'document' ? FileText : req.type === 'address' ? MapPin : User;
              return <Icon className="h-5 w-5 text-gray-400" />;
            })()}
            <label className="block text-sm font-medium text-gray-700">
              {req.name}
              {req.acceptance_criteria.time_limit && (
                <span className="ml-1 text-xs text-yellow-600">
                  (within {req.acceptance_criteria.time_limit})
                </span>
              )}
            </label>
          </div>
          {(value || existingValues?.find(v => v.field === req.id)?.status === 'approved') && !error && (
            <CheckCircle className="h-5 w-5 text-green-500" />
          )}
        </div>

        <p className="text-sm text-gray-500">{req.description}</p>

        {req.type === 'document' ? (
          <div className="mt-1 flex items-center space-x-3">
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) {
                  setValues(prev => ({ ...prev, [req.id]: file }));
                  setErrors(prev => ({ ...prev, [req.id]: '' }));
                }
              }}
              className="hidden"
              id={`file-${req.id}`}
            />
            <label
              htmlFor={`file-${req.id}`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Upload className="-ml-1 mr-2 h-5 w-5" />
              Choose File
            </label>
            {value instanceof File ? (
              <span className="text-sm text-gray-500">{value.name}</span>
            ) : values[`${req.id}_details`] ? (
              <div className="flex items-center space-x-2">
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500">
                    {values[`${req.id}_details`].filename}
                  </span>
                  <span className="text-xs text-gray-400">
                    Status: {values[`${req.id}_details`].status}
                  </span>
                </div>
                {values[`${req.id}_details`].status === 'approved' && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
              </div>
            ) : existingValues?.find(v => v.field === req.id)?.documentUrl ? (
              <div className="flex items-center space-x-2">
                <a 
                  href={existingValues.find(v => v.field === req.id)?.documentUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-indigo-600 hover:text-indigo-800"
                >
                  View existing document
                </a>
                {existingValues.find(v => v.field === req.id)?.status === 'approved' && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
              </div>
            ) : null}
          </div>
        ) : req.type === 'address' ? (
          renderAddressFields(req)
        ) : (
          <input
            type="text"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder={req.example}
            value={typeof value === 'string' ? value : ''}
            onChange={e => {
              setValues(prev => ({ ...prev, [req.id]: e.target.value }));
              setErrors(prev => ({ ...prev, [req.id]: '' }));
            }}
          />
        )}

        {error && (
          <p className="mt-1 text-sm text-red-600">
            {error}
          </p>
        )}

        {req.example && !error && (
          <p className="mt-1 text-xs text-gray-500">
            Example: {req.example}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <nav aria-label="Progress">
        <ol role="list" className="flex items-center">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            return (
              <li key={step.id} className={`relative ${index !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
                <div className="flex items-center">
                  <div
                    className={`${
                      index === currentStepIndex
                        ? 'border-indigo-600 bg-indigo-600'
                        : validatedSteps.includes(index)
                        ? 'border-indigo-600 bg-white'
                        : 'border-gray-300 bg-white'
                    } relative flex h-8 w-8 items-center justify-center rounded-full border-2`}
                  >
                    <StepIcon
                      className={`h-5 w-5 ${
                        index === currentStepIndex
                          ? 'text-white'
                          : validatedSteps.includes(index)
                          ? 'text-indigo-600'
                          : 'text-gray-500'
                      }`}
                    />
                  </div>
                  {index !== steps.length - 1 && (
                    <div
                      className={`absolute top-4 w-full h-0.5 ${
                        validatedSteps.includes(index) ? 'bg-indigo-600' : 'bg-gray-300'
                      }`}
                      style={{ left: '100%', width: 'calc(100% - 2rem)' }}
                    />
                  )}
                </div>
                <span className="absolute -bottom-6 w-max text-sm font-medium text-gray-500">
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Current Step Content */}
      <div className="mt-8 space-y-6">
        {currentRequirement && renderRequirement(currentRequirement)}
      </div>

      {/* Error Message */}
      {errors.submit && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error submitting requirements
              </h3>
              <div className="mt-2 text-sm text-red-700">
                {errors.submit}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="mt-8 flex justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Cancel
        </button>
        <div className="flex space-x-3">
          {currentStepIndex > 0 && (
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </button>
          )}
          <button
            type="button"
            onClick={handleNext}
            disabled={isSubmitting}
            className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Processing...
              </>
            ) : currentStepIndex === steps.length - 1 ? (
              'Submit'
            ) : (
              <>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
