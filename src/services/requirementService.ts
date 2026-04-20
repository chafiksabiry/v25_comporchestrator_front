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

export interface GroupStatusResponse {
  groupId: string;
  destinationZone: string;
  isComplete: boolean;
  totalRequirements: number;
  completedRequirements: RequirementDetail[];
  pendingRequirements: number;
}

export interface RequirementDetail {
  id: string;
  type: 'document' | 'textual' | 'address';
  status: 'completed';
  submittedAt: string;
  value: DocumentValue | AddressValue | string;
}

export interface DocumentValue {
  id: string;
  filename: string;
  size: {
    unit: 'bytes';
    amount: number;
  };
  sha256: string;
  status: string;
  content_type: string;
  customerReference: string;
  createdAt: string;
  downloadUrl: string;
}

export interface AddressValue {
  id: string;
  businessName: string;
  streetAddress: string;
  locality: string;
  postalCode: string;
  countryCode: string;
  extendedAddress?: string;
  administrativeArea?: string;
}

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
      
      const response = await axios.get<{
        hasRequirements: boolean;
        requirements?: RequirementType[];
      }>(
        `${import.meta.env.VITE_API_BASE_URL}/requirements/countries/${countryCode}/requirements`
      );
      
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
      
      
      // First, try to get existing group
      try {
        const response = await axios.get<RequirementGroup>(
          `${import.meta.env.VITE_API_BASE_URL}/requirement-groups/companies/${companyId}/zones/${destinationZone}`
        );
        
        return {
          group: response.data,
          isNew: false
        };
      } catch (error: unknown) {
        // If 404, create new group
        if (isAxiosError(error) && error.response?.status === 404) {
          
          try {
            const createResponse = await axios.post<RequirementGroup>(
              `${import.meta.env.VITE_API_BASE_URL}/requirement-groups`,
              {
                companyId,
                destinationZone
              }
            );
            
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
      
      return response.data;
    } catch (error: unknown) {
      console.error('❌ Error submitting document:', error);
      throw error;
    }
  },

  // Soumettre une valeur textuelle
  async submitTextValue(groupId: string, field: string, value: string): Promise<RequirementGroup> {
    try {
      
      const response = await axios.post<RequirementGroup>(
        `${import.meta.env.VITE_API_BASE_URL}/requirements/groups/${groupId}/values/${field}`,
        { value }
      );
      
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
      
      return response.data;
    } catch (error: unknown) {
      console.error('❌ Error checking status:', error);
      throw error;
    }
  },

  // Obtenir le statut détaillé d'un groupe
  async getDetailedGroupStatus(groupId: string): Promise<GroupStatusResponse> {
    try {
      
      const response = await axios.get<GroupStatusResponse>(
        `${import.meta.env.VITE_API_BASE_URL}/requirement-groups/${groupId}/status`
      );
      
      return response.data;
    } catch (error: unknown) {
      console.error('❌ Error getting detailed status:', error);
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
      
      const response = await axios.post<{
        isValid: boolean;
        missingRequirements?: { field: string; type: string }[];
        groupId?: string;
        telnyxId?: string;
      }>(
        `${import.meta.env.VITE_API_BASE_URL}/requirements/groups/${groupId}/validate`
      );
      
      return response.data;
    } catch (error: unknown) {
      console.error('❌ Error validating requirements:', error);
      throw error;
    }
  }
};
