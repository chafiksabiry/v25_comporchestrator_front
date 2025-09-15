import axios from 'axios';

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
  id: string;
  status: 'pending' | 'active' | 'rejected';
  requirements: {
    field: string;
    type: string;
    status: 'pending' | 'approved' | 'rejected';
    value?: string;
    documentUrl?: string;
    submittedAt?: string;
    rejectionReason?: string;
  }[];
  validUntil?: string;
}

export const requirementService = {
  // Vérifier les requirements pour un pays
  async checkCountryRequirements(countryCode: string): Promise<{
    hasRequirements: boolean;
    requirements?: RequirementType[];
  }> {
    try {
      console.log(`🔍 Checking requirements for ${countryCode}`);
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/requirements/countries/${countryCode}/requirements`
      );
      console.log('✅ Requirements:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error checking requirements:', error);
      throw error;
    }
  },

  // Obtenir ou créer un groupe de requirements
  async getOrCreateGroup(companyId: string, countryCode: string): Promise<{
    group: RequirementGroup;
    isNew: boolean;
  }> {
    try {
      console.log(`🔍 Getting/creating requirement group for ${companyId} in ${countryCode}`);
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/requirements/companies/${companyId}/countries/${countryCode}/groups`
      );
      console.log('✅ Group:', response.data);
      return response.data;
    } catch (error) {
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

      const response = await axios.post(
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
    } catch (error) {
      console.error('❌ Error submitting document:', error);
      throw error;
    }
  },

  // Soumettre une valeur textuelle
  async submitTextValue(groupId: string, field: string, value: string): Promise<RequirementGroup> {
    try {
      console.log(`📝 Submitting text value for ${groupId}, field ${field}`);
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/requirements/groups/${groupId}/values/${field}`,
        { value }
      );
      console.log('✅ Value submitted:', response.data);
      return response.data;
    } catch (error) {
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
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/requirements/groups/${groupId}/status`
      );
      console.log('✅ Status:', response.data);
      return response.data;
    } catch (error) {
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
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/requirements/groups/${groupId}/validate`
      );
      console.log('✅ Validation result:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error validating requirements:', error);
      throw error;
    }
  }
};