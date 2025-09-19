import React, { useState } from 'react';
import {
  FileText,
  Upload,
  AlertCircle,
  CheckCircle,
  MapPin,
  User,
  Building,
  Phone
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

interface RequirementFormProps {
  requirements: RequirementType[];
  existingValues?: {
    field: string;
    value?: string;
    documentUrl?: string;
    status: string;
    rejectionReason?: string;
  }[];
  onSubmit: (values: Record<string, string | File>) => Promise<void>;
  onCancel: () => void;
}

export const RequirementForm: React.FC<RequirementFormProps> = ({
  requirements,
  existingValues,
  onSubmit,
  onCancel
}) => {
  const [values, setValues] = useState<Record<string, string | File>>(() => {
    if (!existingValues || !Array.isArray(existingValues)) return {};
    return existingValues.reduce((acc, val) => {
      if (val.value && val.field) acc[val.field] = val.value;
      return acc;
    }, {} as Record<string, string | File>);
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addressFields, setAddressFields] = useState<Record<string, Record<string, string>>>(() => {
    if (!existingValues || !Array.isArray(existingValues)) return {};
    return existingValues.reduce((acc, val) => {
      if (val.value && val.field) {
        try {
          const addressData = JSON.parse(val.value);
          if (typeof addressData === 'object' && addressData !== null) {
            acc[val.field] = addressData;
          }
        } catch (e) {
          // Not a JSON string, ignore
          console.log('Not a JSON string for address field:', val.field);
        }
      }
      return acc;
    }, {} as Record<string, Record<string, string>>);
  });

  const handleTextChange = (id: string, value: string) => {
    setValues(prev => ({ ...prev, [id]: value }));
    setErrors(prev => ({ ...prev, [id]: '' }));
  };

  const handleFileChange = (id: string, file: File | null) => {
    if (file) {
      setValues(prev => ({ ...prev, [id]: file }));
      setErrors(prev => ({ ...prev, [id]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    requirements.forEach(req => {
      const value = values[req.id];
      if (!value) {
        newErrors[req.id] = 'This field is required';
        isValid = false;
        return;
      }

      if (req.type === 'document' && value instanceof File) {
        // Vérifier la taille du fichier (max 5MB)
        if (value.size > 5 * 1024 * 1024) {
          newErrors[req.id] = 'File size must be less than 5MB';
          isValid = false;
        }
        // Vérifier le type de fichier
        const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (!allowedTypes.includes(value.type)) {
          newErrors[req.id] = 'Only JPG, PNG and PDF files are allowed';
          isValid = false;
        }
      }

      if (req.acceptance_criteria) {
        const { min_length, max_length } = req.acceptance_criteria;
        if (typeof value === 'string') {
          if (min_length && value.length < min_length) {
            newErrors[req.id] = `Minimum length is ${min_length} characters`;
            isValid = false;
          }
          if (max_length && value.length > max_length) {
            newErrors[req.id] = `Maximum length is ${max_length} characters`;
            isValid = false;
          }
        }
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

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

  const renderRequirement = (req: RequirementType) => {
    const error = errors[req.id];
    const value = values[req.id];

    const getIcon = () => {
      switch (req.type) {
        case 'document':
          return FileText;
        case 'address':
          return MapPin;
        case 'textual':
          if (req.name.toLowerCase().includes('contact')) return Phone;
          if (req.name.toLowerCase().includes('business')) return Building;
          return User;
        default:
          return FileText;
      }
    };

    const Icon = getIcon();

    return (
      <div key={req.id} className="space-y-4 bg-gray-50 p-6 rounded-lg border border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <Icon className="h-5 w-5 text-gray-400" />
            <label className="block text-sm font-medium text-gray-700">
              {req.name}
              {req.acceptance_criteria.time_limit && (
                <span className="ml-1 text-xs text-yellow-600">
                  (within {req.acceptance_criteria.time_limit})
                </span>
              )}
            </label>
          </div>
          {value && !error && (
            <CheckCircle className="h-5 w-5 text-green-500" />
          )}
        </div>

        <p className="text-sm text-gray-500">{req.description}</p>

        {req.type === 'document' ? (
          <div className="mt-1 flex items-center space-x-3">
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={e => handleFileChange(req.id, e.target.files?.[0] || null)}
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
          </div>
        ) : (
          <div className="mt-1">
            {req.type === 'address' ? (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Street address"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  value={addressFields[req.id]?.street || ''}
                  onChange={e => {
                    setAddressFields(prev => ({
                      ...prev,
                      [req.id]: { ...prev[req.id], street: e.target.value }
                    }));
                    handleTextChange(
                      req.id,
                      JSON.stringify({
                        ...addressFields[req.id],
                        street: e.target.value
                      })
                    );
                  }}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="City"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    value={addressFields[req.id]?.city || ''}
                    onChange={e => {
                      setAddressFields(prev => ({
                        ...prev,
                        [req.id]: { ...prev[req.id], city: e.target.value }
                      }));
                      handleTextChange(
                        req.id,
                        JSON.stringify({
                          ...addressFields[req.id],
                          city: e.target.value
                        })
                      );
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Postal code"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    value={addressFields[req.id]?.postalCode || ''}
                    onChange={e => {
                      setAddressFields(prev => ({
                        ...prev,
                        [req.id]: { ...prev[req.id], postalCode: e.target.value }
                      }));
                      handleTextChange(
                        req.id,
                        JSON.stringify({
                          ...addressFields[req.id],
                          postalCode: e.target.value
                        })
                      );
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="State/Province"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    value={addressFields[req.id]?.state || ''}
                    onChange={e => {
                      setAddressFields(prev => ({
                        ...prev,
                        [req.id]: { ...prev[req.id], state: e.target.value }
                      }));
                      handleTextChange(
                        req.id,
                        JSON.stringify({
                          ...addressFields[req.id],
                          state: e.target.value
                        })
                      );
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Country"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    value={addressFields[req.id]?.country || ''}
                    onChange={e => {
                      setAddressFields(prev => ({
                        ...prev,
                        [req.id]: { ...prev[req.id], country: e.target.value }
                      }));
                      handleTextChange(
                        req.id,
                        JSON.stringify({
                          ...addressFields[req.id],
                          country: e.target.value
                        })
                      );
                    }}
                  />
                </div>
              </div>
            ) : (
              <input
                type="text"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder={req.example}
                value={typeof value === 'string' ? value : ''}
                onChange={e => handleTextChange(req.id, e.target.value)}
              />
            )}
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6 space-y-8">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Required Information
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>
              Please provide the following information to purchase phone numbers in this region.
              All documents must be clear and legible.
            </p>
          </div>

          <div className="mt-5 space-y-6">
            {requirements.map(renderRequirement)}
          </div>

          {errors.submit && (
            <div className="mt-4 rounded-md bg-red-50 p-4">
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

          <div className="mt-5 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Submitting...
                </>
              ) : (
                'Submit Requirements'
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};
