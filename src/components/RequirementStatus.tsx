import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  AlertCircle,
  FileText,
  Upload,
  Loader
} from 'lucide-react';
import { requirementService } from '../services/requirementService';

interface RequirementStatusProps {
  countryCode: string;
  onRequirementsComplete?: (groupId: string) => void;
}

export const RequirementStatus: React.FC<RequirementStatusProps> = ({
  countryCode,
  onRequirementsComplete
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [existingGroup, setExistingGroup] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (countryCode) {
      loadRequirements();
    }
  }, [countryCode]);

  const loadRequirements = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 1. Vérifier s'il existe déjà un groupe de requirements
      const group = await requirementService.checkExistingGroup(countryCode);
      setExistingGroup(group);

      if (!group) {
        // 2. Si pas de groupe, charger les requirements nécessaires
        const reqs = await requirementService.getCountryRequirements(countryCode);
        setRequirements(reqs);
      }

      // Si le groupe existe et est actif, notifier le parent
      if (group?.status === 'active' && onRequirementsComplete) {
        onRequirementsComplete(group.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requirements');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (existingGroup) {
    return (
      <div className="rounded-lg bg-white p-4 shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <h3 className="ml-2 text-sm font-medium text-gray-900">
              Requirements Status
            </h3>
          </div>
          <span className={`rounded-full px-2 py-1 text-xs font-medium ${
            existingGroup.status === 'active'
              ? 'bg-green-100 text-green-800'
              : existingGroup.status === 'pending'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {existingGroup.status.charAt(0).toUpperCase() + existingGroup.status.slice(1)}
          </span>
        </div>

        <div className="mt-4 space-y-4">
          {existingGroup.requirements.map((req: any) => (
            <div key={req.id} className="flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="h-4 w-4 text-gray-400" />
                <span className="ml-2 text-sm text-gray-600">{req.type}</span>
              </div>
              <span className={`text-xs ${
                req.status === 'completed'
                  ? 'text-green-600'
                  : req.status === 'pending'
                  ? 'text-yellow-600'
                  : 'text-red-600'
              }`}>
                {req.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-yellow-50 p-4">
      <div className="flex">
        <AlertCircle className="h-5 w-5 text-yellow-400" />
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800">
            Requirements Needed
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>
              To purchase phone numbers in {countryCode}, you need to provide the following information:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {requirements.map(req => (
                <li key={req.id}>{req.name}</li>
              ))}
            </ul>
          </div>
          <div className="mt-4">
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center rounded-md bg-yellow-100 px-3 py-2 text-sm font-medium text-yellow-800 hover:bg-yellow-200"
            >
              <Upload className="mr-2 h-4 w-4" />
              Submit Requirements
            </button>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          {/* TODO: Implement requirement form */}
          <div className="bg-white rounded-lg p-6">
            <h3>Submit Requirements</h3>
            {/* Form content */}
          </div>
        </div>
      )}
    </div>
  );
};
