import React, { useState, useCallback } from 'react';
import { documentService } from '../services/documentService';
import { addressService } from '../services/addressService';
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
  businessName: string;
  streetAddress: string;
  locality: string;
  postalCode: string;
  countryCode: string;
  extendedAddress?: string;
  administrativeArea?: string;
}

interface SteppedRequirementFormProps {
  requirements: RequirementType[];
  existingValues?: RequirementValue[];
  requirementGroupId?: string;
  destinationZone: string;
  onSubmit: (values: Record<string, any>) => Promise<void>;
  onCancel: () => void;
}

export const SteppedRequirementForm: React.FC<SteppedRequirementFormProps> = ({
  requirements,
  existingValues,
  requirementGroupId: initialGroupId,
  destinationZone,
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

  // Trouver l'index du premier requirement non complété
  const findFirstIncompleteStep = useCallback(() => {
    if (!existingValues) return 0;
    
    const completedFields = new Set(
      existingValues
        .filter(v => v.status === 'completed')
        .map(v => v.field)
    );

    return steps.findIndex(step => !completedFields.has(step.id)) || 0;
  }, [steps, existingValues]);

  const [currentStepIndex, setCurrentStepIndex] = useState(findFirstIncompleteStep);
  const [values, setValues] = useState<Record<string, any>>(() => {
    if (!existingValues || !Array.isArray(existingValues)) return {};
    
    return existingValues.reduce((acc, val) => {
      if (!val.value) return acc;
      
      try {
        // Pour les documents et adresses, parser la valeur JSON
        const parsedValue = JSON.parse(val.value);
        if (typeof parsedValue === 'object' && parsedValue !== null) {
          // Stocker à la fois la valeur parsée et les détails
          acc[val.field] = parsedValue;
          acc[`${val.field}_details`] = {
            ...parsedValue,
            status: val.status,
            submittedAt: val.submittedAt
          };
        } else {
          // Pour les valeurs textuelles, utiliser directement
          acc[val.field] = val.value;
        }
      } catch (e) {
        // Si ce n'est pas du JSON, c'est une valeur textuelle
        acc[val.field] = val.value;
      }
      
      return acc;
    }, {} as Record<string, any>);
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validatedSteps, setValidatedSteps] = useState<number[]>([]);

  // État pour les champs d'adresse
  const [addressFields, setAddressFields] = useState<Record<string, AddressFields>>(() => {
    const initialFields = existingValues?.reduce((acc, val) => {
      if (val.value && val.field) {
        try {
          const parsedValue = JSON.parse(val.value);
          if (typeof parsedValue === 'object' && parsedValue !== null) {
            // Pour les adresses existantes
            if (parsedValue.businessName || parsedValue.streetAddress) {
              acc[val.field] = {
                businessName: parsedValue.businessName || '',
                streetAddress: parsedValue.streetAddress || '',
                locality: parsedValue.locality || '',
                postalCode: parsedValue.postalCode || '',
                countryCode: destinationZone,
                extendedAddress: parsedValue.extendedAddress || '',
                administrativeArea: parsedValue.administrativeArea || ''
              };
            }
          }
        } catch (e) {
          console.log('Not a valid address data for field:', val.field);
        }
      }
      return acc;
    }, {} as Record<string, AddressFields>) || {};

    // Log pour le debugging
    console.log('🏠 Initial address fields:', {
      existingValues,
      initialFields,
      destinationZone
    });

    return initialFields;
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
          if (!requirementGroupId) {
            throw new Error('Requirement group ID is missing');
          }

          const addressData = typeof value === 'string' ? JSON.parse(value) : value;
          
          // Vérifier tous les champs requis
          if (!addressData.businessName || !addressData.streetAddress || !addressData.locality || 
              !addressData.postalCode) {
            throw new Error('Required address fields are missing');
          }

          console.log('🔍 Validating address data:', {
            addressData,
            destinationZone,
            countryCode: addressData.countryCode
          });

          // Créer l'adresse dans Telnyx
          const addressResult = await addressService.createAddress({
            ...addressData,
            countryCode: destinationZone,
            customerReference: requirementGroupId
          });

          if (!addressResult.id) {
            throw new Error('Failed to create address');
          }

          try {
            // Mettre à jour le requirement group avec l'ID de l'adresse
            console.log('Updating requirement group with address ID:', {
              groupId: requirementGroupId,
              requirementId: currentRequirement.id,
              addressId: addressResult.id
            });

            await requirementGroupService.updateRequirements(requirementGroupId, [{
              requirementId: currentRequirement.id,
              value: addressResult.id
            }]);
          } catch (error) {
            console.error('Failed to update requirement group with address ID:', error);
            throw new Error('Failed to update requirement group with address ID');
          }

          // Stocker les détails de l'adresse pour l'affichage
          setValues(prev => ({
            ...prev,
            [`${currentRequirement.id}_details`]: {
              id: addressResult.id,
              status: 'pending',
              createdAt: addressResult.createdAt
            }
          }));
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
            console.log('Uploading new document:', value.name);
            // Upload du nouveau document
            const filename = `${currentRequirement.name.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString()}`;
            
            const uploadResult = await documentService.uploadDocument(
              value,
              filename,
              requirementGroupId
            );
            console.log('Upload result:', uploadResult);
            
            if (!uploadResult.id) {
              throw new Error('Document upload failed - no ID received');
            }

            // Utiliser uniquement l'ID du document
            submittedValue = uploadResult.id;
          } else if (typeof value === 'object' && value !== null) {
            // Si c'est un document existant et pas de nouveau fichier sélectionné
            console.log('Using existing document ID:', value.id);
            submittedValue = value.id;
          } else if (typeof value === 'string') {
            // Si c'est déjà un ID
            console.log('Using existing document ID (string):', value);
            submittedValue = value;
          }
          break;

        case 'address':
          const addressData = typeof value === 'string' ? JSON.parse(value) : value;
          // S'assurer que le countryCode est inclus
          const addressToCreate = {
            ...addressData,
            countryCode: destinationZone
          };
          
          // Log pour le debugging
          console.log('🌍 Destination Zone in SteppedForm:', destinationZone);
          console.log('📦 Address data to send:', addressToCreate);
          
          // Créer l'adresse et obtenir l'ID
          const addressResult = await addressService.createAddress(addressToCreate);
          console.log('📬 Address creation response:', addressResult);

          if (!addressResult.id) {
            throw new Error('Failed to create address - no ID received');
          }

          // Utiliser l'ID pour mettre à jour le requirement group
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

      // S'assurer que nous n'envoyons que l'ID et la valeur
      const updatePayload = {
        requirementId: currentRequirement.id,
        value: submittedValue
      };

      console.log('📝 Update payload:', updatePayload);
      await requirementGroupService.updateRequirements(requirementGroupId, [updatePayload]);

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
    const existingValue = existingValues?.find(v => v.field === req.id);
    const isCompleted = existingValue?.status === 'completed';
    
    // Si l'adresse est déjà complétée, utiliser ses valeurs
    const addressData = isCompleted && existingValue?.value
      ? JSON.parse(existingValue.value)
      : addressFields[req.id] || {};
    
    const error = errors[req.id];

    const updateAddressField = (field: keyof AddressFields, value: string) => {
      const newAddressData = {
        ...addressData,
        [field]: value,
        countryCode: destinationZone // Toujours inclure le code pays
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
            placeholder="Business Name *"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            value={addressData.businessName || ''}
            onChange={e => updateAddressField('businessName', e.target.value)}
          />
          <input
            type="text"
            placeholder="Street Address *"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            value={addressData.streetAddress || ''}
            onChange={e => updateAddressField('streetAddress', e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="City *"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={addressData.locality || ''}
              onChange={e => updateAddressField('locality', e.target.value)}
            />
            <input
              type="text"
              placeholder="Postal Code *"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={addressData.postalCode || ''}
              onChange={e => updateAddressField('postalCode', e.target.value)}
            />
          </div>
          <input
            type="text"
            placeholder="Administrative Area (State/Province) *"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            value={addressData.administrativeArea || ''}
            onChange={e => updateAddressField('administrativeArea', e.target.value)}
          />
          <div className="mt-2">
            <label className="block text-sm font-medium text-gray-700">Country Code</label>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={destinationZone}
              readOnly
              disabled
            />
        </div>
</div>
        {/* Champ optionnel */}
        <div className="mt-4 border-t border-gray-200 pt-4">
          <p className="mb-2 text-sm text-gray-500">Additional Information (Optional)</p>
          <input
            type="text"
            placeholder="Extended Address (Apartment, Suite, etc.)"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            value={addressData.extendedAddress || ''}
            onChange={e => updateAddressField('extendedAddress', e.target.value)}
          />
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
    const existingValue = existingValues?.find(v => v.field === req.id);
    const isCompleted = existingValue?.status === 'completed';

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
            {isCompleted && existingValue?.value ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-700">
                        {JSON.parse(existingValue.value).filename}
                      </span>
                      <span className="text-xs text-gray-500">
                        Submitted: {new Date(existingValue.submittedAt).toLocaleString()}
                      </span>
                    </div>
                    <a
                      href={`${import.meta.env.VITE_API_BASE_URL}/documents/${JSON.parse(existingValue.value).id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      View Document
                    </a>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                </div>
                <div className="flex items-center space-x-3">
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
                    Change Document
                  </label>
                  {values[req.id] instanceof File && (
                    <span className="text-sm text-gray-500">New file selected: {values[req.id].name}</span>
                  )}
                </div>
              </div>
            ) : (
              <>
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
                {value instanceof File && (
                  <span className="text-sm text-gray-500">{value.name}</span>
                )}
              </>
            )}
          </div>
        ) : req.type === 'address' ? (
          renderAddressFields(req)
        ) : (
          isCompleted && existingValue?.value ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex-grow">
                  <p className="text-sm font-medium text-gray-900">{existingValue.value}</p>
                  <p className="text-xs text-gray-500">
                    Submitted: {new Date(existingValue.submittedAt).toLocaleString()}
                  </p>
                </div>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
            </div>
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
          )
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
