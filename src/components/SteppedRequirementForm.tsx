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
  submittedAt?: string; // Rendre optionnel pour la compatibilité
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
  onCancel: () => void;
  onSubmit: (values: Record<string, any>) => Promise<void>;
}

export const SteppedRequirementForm: React.FC<SteppedRequirementFormProps> = ({
  requirements,
  existingValues,
  requirementGroupId: initialGroupId,
  destinationZone,
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
  const requirementGroupId = initialGroupId || null;

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
        // Trouver le type du requirement
        const requirement = requirements.find(r => r.id === val.field);
        
        if (requirement?.type === 'textual') {
          // Pour les valeurs textuelles, enlever les quotes et utiliser directement
          const textValue = val.value.replace(/^"|"$/g, '');
          acc[val.field] = textValue;
          acc[`${val.field}_details`] = {
            value: textValue,
            status: val.status,
            submittedAt: val.submittedAt
          };
        } else {
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
          }
        }
      } catch (e) {
        console.error('Error parsing value for field:', val.field, e);
      }
      
      return acc;
    }, {} as Record<string, any>);
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validatedSteps, setValidatedSteps] = useState<number[]>([]);

  // État pour les champs d'adresse
  const [addressFields, setAddressFields] = useState<Record<string, AddressFields>>(() => {
    const initialFields = existingValues?.reduce((acc, val) => {
      if (val.value && val.field) {
        try {
          let parsedValue: any;
          if (typeof val.value === 'string') {
            parsedValue = JSON.parse(val.value);
          } else {
            parsedValue = val.value;
          }

          if (typeof parsedValue === 'object' && parsedValue !== null) {
            // Pour les adresses existantes
            if (parsedValue.businessName || parsedValue.streetAddress || parsedValue.id) {
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
    if (!requirements || requirements.length === 0) {
      console.warn('No requirements found:', { requirements });
      return;
    }
    if (steps.length === 0) {
      console.warn('No steps available from requirements:', { requirements, steps });
      return;
    }
  }, [requirements, steps]);

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
      if (existingValue && existingValue.status === 'completed') {
        return true;
      }

      if (!isValid) {
        setErrors(stepErrors);
        return false;
      }

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

        return true;
      } catch (error) {
        console.error('Validation error:', error);
        setErrors({
          [currentStep.id]: error instanceof Error ? error.message : 'Validation failed'
        });
        return false;
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
          if (typeof value === 'object' && value.id) {
            // Si on a déjà un ID d'adresse, on l'utilise directement
            console.log('Using existing address ID:', value.id);
            submittedValue = value.id;
          } else {
            // Sinon, on crée une nouvelle adresse
            const addressData = typeof value === 'string' ? JSON.parse(value) : value;
            const addressToCreate = {
              ...addressData,
              countryCode: destinationZone
            };
            
            console.log('🌍 Creating new address:', addressToCreate);
            
            const addressResult = await addressService.createAddress(addressToCreate);
            console.log('📬 Address creation response:', addressResult);

            if (!addressResult.id) {
              throw new Error('Failed to create address - no ID received');
            }

            submittedValue = addressResult.id;
          }
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
    // Pour le dernier step, on vérifie juste qu'il est valide
    const isValid = await validateStep();
    if (!isValid) return;

    // Si valide, on ferme simplement le modal
    onCancel();
  };

  const renderAddressFields = (req: RequirementType) => {
    // Initialiser les données d'adresse
    let addressData = addressFields[req.id] || {};
    if (!addressData.countryCode) {
      addressData.countryCode = destinationZone;
    }
    
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
      <div className="space-y-6">
        {/* Section des champs requis */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          {/* Business Name */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
              Business Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter your business name"
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm transition-colors"
              value={addressData.businessName || ''}
              onChange={e => updateAddressField('businessName', e.target.value)}
            />
          </div>

          {/* Street Address */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
              Street Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter your street address"
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm transition-colors"
              value={addressData.streetAddress || ''}
              onChange={e => updateAddressField('streetAddress', e.target.value)}
            />
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
              City <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter city name"
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm transition-colors"
              value={addressData.locality || ''}
              onChange={e => updateAddressField('locality', e.target.value)}
            />
          </div>

          {/* Postal Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
              Postal Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter postal code"
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm transition-colors"
              value={addressData.postalCode || ''}
              onChange={e => updateAddressField('postalCode', e.target.value)}
            />
          </div>

          {/* Administrative Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
              State/Province
            </label>
            <input
              type="text"
              placeholder="Enter state or province (optional)"
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm transition-colors"
              value={addressData.administrativeArea || ''}
              onChange={e => updateAddressField('administrativeArea', e.target.value)}
            />
          </div>

          {/* Country Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
              Country Code
            </label>
            <input
              type="text"
              className="block w-full rounded-lg border-gray-300 bg-gray-50 shadow-sm text-sm transition-colors cursor-not-allowed"
              value={destinationZone.toUpperCase()}
              readOnly
              disabled
            />
          </div>
        </div>

        {/* Section des champs optionnels */}
        <div className="pt-4">
          <div className="flex items-center space-x-2 mb-3">
            <div className="h-px flex-1 bg-gray-200"></div>
            <span className="text-sm font-medium text-gray-500">Optional Information</span>
            <div className="h-px flex-1 bg-gray-200"></div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
              Extended Address
            </label>
            <input
              type="text"
              placeholder="Apartment, Suite, Unit, Building, etc."
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm transition-colors"
              value={addressData.extendedAddress || ''}
              onChange={e => updateAddressField('extendedAddress', e.target.value)}
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
    const existingValue = existingValues?.find(v => v.field === req.id);
    const isCompleted = existingValue?.status === 'completed';

    return (
      <div key={req.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        {/* En-tête du requirement */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-3">
            <div className="mt-1">
              {(() => {
                const Icon = req.type === 'document' ? FileText : req.type === 'address' ? MapPin : User;
                return <Icon className="h-5 w-5 text-indigo-500" />;
              })()}
            </div>
            <div>
              <label className="block text-base font-medium text-gray-900">
                {req.name.replace(' (National)', '')}
              </label>
              {req.acceptance_criteria.time_limit && (
                <div className="mt-1 inline-flex items-center px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs">
                  Required within {req.acceptance_criteria.time_limit}
                </div>
              )}
              <p className="mt-1 text-sm text-gray-500 max-w-2xl">{req.description}</p>
            </div>
          </div>
          {(value || existingValues?.find(v => v.field === req.id)?.status === 'approved') && !error && (
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Completed</span>
            </div>
          )}
        </div>

        {/* Ligne de séparation */}
        <div className="border-t border-gray-200 my-4"></div>

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
                        {existingValue?.submittedAt && `Submitted: ${new Date(existingValue.submittedAt).toLocaleString()}`}
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
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex-grow">
                <input
                  type="text"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder={req.example}
                  value={value || (values[`${req.id}_details`]?.value || '')}
                  onChange={e => {
                    setValues(prev => ({ ...prev, [req.id]: e.target.value }));
                    setErrors(prev => ({ ...prev, [req.id]: '' }));
                  }}
                />
                {existingValue?.status === 'completed' && existingValue?.submittedAt && (
                  <p className="text-xs text-gray-500 mt-1">
                    Last submitted: {new Date(existingValue.submittedAt).toLocaleString()}
                  </p>
                )}
              </div>
              {existingValue?.status === 'completed' && <CheckCircle className="h-5 w-5 text-green-500" />}
            </div>
          </div>
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
      <nav aria-label="Progress" className="px-8 py-4 bg-white rounded-lg shadow-sm">
        <ol role="list" className="flex items-center justify-between">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index === currentStepIndex;
            const isCompleted = validatedSteps.includes(index);
            const isLast = index === steps.length - 1;
            
            return (
              <li key={step.id} className={`relative flex-1 ${!isLast ? 'pr-8' : ''}`}>
                <div className="group flex items-center">
                  <div className="flex items-center justify-center">
                    <div
                      className={`
                        relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-200
                        ${isActive ? 'border-indigo-600 bg-indigo-600 ring-2 ring-indigo-100' : 
                          isCompleted ? 'border-green-500 bg-green-500' : 
                          'border-gray-300 bg-white'}
                      `}
                    >
                      <StepIcon
                        className={`h-5 w-5 transition-colors
                          ${isActive || isCompleted ? 'text-white' : 'text-gray-500'}
                        `}
                      />
                      {isCompleted && !isActive && (
                        <CheckCircle className="absolute h-4 w-4 text-white" />
                      )}
                    </div>
                  </div>
                  {!isLast && (
                    <div
                      className={`absolute left-0 top-5 -z-10 h-0.5 w-full transition-colors duration-200
                        ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}
                      `}
                      style={{ left: '50%', width: '100%' }}
                    />
                  )}
                </div>
                <div className="mt-3">
                  <span 
                    className={`block text-center text-sm font-medium transition-colors duration-200
                      ${isActive ? 'text-indigo-600' : 
                        isCompleted ? 'text-green-600' : 
                        'text-gray-500'}
                    `}
                  >
                    {step.label}
                  </span>
                </div>
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
            className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            {currentStepIndex === steps.length - 1 ? (
              'Finish'
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
