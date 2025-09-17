import axios from 'axios';

interface ApiError {
  response?: {
    status?: number;
    data?: any;
  };
}

const isAxiosError = (error: unknown): error is ApiError => {
  return error !== null && typeof error === 'object' && 'response' in error;
};

export interface RequirementType {
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

export interface RequirementGroup {
  _id: string;
  telnyxId: string;
  companyId: string;
  destinationZone: string;
  status: 'pending' | 'active' | 'rejected';
  requirements: {
    requirementId: string;
    type: 'document' | 'textual' | 'address';
    status: 'pending' | 'approved' | 'rejected';
    submittedValueId?: string;
    submittedAt?: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export const requirementService = {
  // Vérifier les requirements pour un pays
  async checkCountryRequirements(countryCode: string): Promise<{
    hasRequirements: boolean;
    requirements?: RequirementType[];
  }> {
    try {
      console.log(`🔍 Checking requirements for ${countryCode}`);
      const response = await axios.get<{
        hasRequirements: boolean;
        requirements?: RequirementType[];
      }>(
        `${import.meta.env.VITE_API_BASE_URL}/requirements/countries/${countryCode}/requirements`
      );
      console.log('✅ Requirements:', response.data);
      return response.data;
    } catch (error: unknown) {
      console.error('❌ Error checking requirements:', error);
      throw error;
    }
  },

  // Obtenir ou créer un groupe de requirements
  async getOrCreateGroup(companyId: string, destinationZone: string): Promise<{
    group: RequirementGroup;
    isNew: boolean;
  }> {
    try {
      console.log(`🔍 Getting/creating requirement group for ${companyId} in ${destinationZone}`);
      
      // First, try to get existing group
      try {
        const response = await axios.get<RequirementGroup>(
          `${import.meta.env.VITE_API_BASE_URL}/requirement-groups/companies/${companyId}/zones/${destinationZone}`
        );
        console.log('✅ Found existing group:', response.data);
        return {
          group: response.data,
          isNew: false
        };
      } catch (error: unknown) {
        // If 404, create new group
        if (isAxiosError(error) && error.response?.status === 404) {
          console.log('⚠️ No existing group found, creating new one...');
          try {
            const createResponse = await axios.post<RequirementGroup>(
              `${import.meta.env.VITE_API_BASE_URL}/requirement-groups`,
              {
                companyId,
                destinationZone
              }
            );
            console.log('✅ Created new group:', createResponse.data);
            return {
              group: createResponse.data,
              isNew: true
            };
          } catch (createError: unknown) {
            if (isAxiosError(createError)) {
              if (createError.response?.status === 400) {
                throw new Error(createError.response.data.message || 'Invalid request parameters');
              }
              if (createError.response?.status === 409) {
                // If group already exists (rare race condition)
                console.log('⚠️ Group was created by another request, retrying get...');
                const retryResponse = await axios.get<RequirementGroup>(
                  `${import.meta.env.VITE_API_BASE_URL}/requirement-groups/companies/${companyId}/zones/${destinationZone}`
                );
                return {
                  group: retryResponse.data,
                  isNew: false
                };
              }
            }
            throw createError;
          }
        }
        throw error;
      }
    } catch (error: unknown) {
      console.error('❌ Error getting/creating group:', error);
      throw error;
    }
  },

  // Soumettre un document
  async submitDocument(groupId: string, field: string, file: File): Promise<RequirementGroup> {
    try {
      console.log(`📄 Submitting document for ${groupId}, field ${field}`);
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post<RequirementGroup>(
        `${import.meta.env.VITE_API_BASE_URL}/requirements/groups/${groupId}/documents/${field}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      console.log('✅ Document submitted:', response.data);
      return response.data;
    } catch (error: unknown) {
      console.error('❌ Error submitting document:', error);
      throw error;
    }
  },

  // Soumettre une valeur textuelle
  async submitTextValue(groupId: string, field: string, value: string): Promise<RequirementGroup> {
    try {
      console.log(`📝 Submitting text value for ${groupId}, field ${field}`);
      const response = await axios.post<RequirementGroup>(
        `${import.meta.env.VITE_API_BASE_URL}/requirements/groups/${groupId}/values/${field}`,
        { value }
      );
      console.log('✅ Value submitted:', response.data);
      return response.data;
    } catch (error: unknown) {
      console.error('❌ Error submitting value:', error);
      throw error;
    }
  },

  // Vérifier le statut d'un groupe
  async checkGroupStatus(groupId: string): Promise<{
    id: string;
    status: string;
    requirements: {
      field: string;
      status: string;
      rejectionReason?: string;
    }[];
    validUntil?: string;
    isComplete: boolean;
  }> {
    try {
      console.log(`🔍 Checking status for group ${groupId}`);
      const response = await axios.get<{
        id: string;
        status: string;
        requirements: {
          field: string;
          status: string;
          rejectionReason?: string;
        }[];
        validUntil?: string;
        isComplete: boolean;
      }>(
        `${import.meta.env.VITE_API_BASE_URL}/requirements/groups/${groupId}/status`
      );
      console.log('✅ Status:', response.data);
      return response.data;
    } catch (error: unknown) {
      console.error('❌ Error checking status:', error);
      throw error;
    }
  },

  // Valider les requirements d'un groupe
  async validateRequirements(groupId: string): Promise<{
    isValid: boolean;
    missingRequirements?: { field: string; type: string }[];
    groupId?: string;
    telnyxId?: string;
  }> {
    try {
      console.log(`🔍 Validating requirements for group ${groupId}`);
      const response = await axios.post<{
        isValid: boolean;
        missingRequirements?: { field: string; type: string }[];
        groupId?: string;
        telnyxId?: string;
      }>(
        `${import.meta.env.VITE_API_BASE_URL}/requirements/groups/${groupId}/validate`
      );
      console.log('✅ Validation result:', response.data);
      return response.data;
    } catch (error: unknown) {
      console.error('❌ Error validating requirements:', error);
      throw error;
    }
  }
};