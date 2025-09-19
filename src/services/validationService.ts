import axios from 'axios';

interface AddressFields {
  street: string;
  city: string;
  postalCode: string;
  state: string;
  country: string;
  streetNumber?: string;
  streetType?: string;
  buildingName?: string;
  floor?: string;
  apartment?: string;
  district?: string;
  region?: string;
  additionalInfo?: string;
}

interface ValidationResponse {
  id: string;
  status: 'valid' | 'invalid';
  errors?: string[];
}

export const validationService = {
  // Valider et enregistrer une adresse
  async validateAddress(address: AddressFields): Promise<ValidationResponse> {
    try {
      const response = await axios.post<ValidationResponse>(
        `${import.meta.env.VITE_API_BASE_URL}/validation/address`,
        address
      );
      return response.data;
    } catch (error) {
      console.error('Error validating address:', error);
      throw error;
    }
  },

  // Valider et enregistrer un document
  async validateDocument(file: File): Promise<ValidationResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post<ValidationResponse>(
        `${import.meta.env.VITE_API_BASE_URL}/validation/document`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error validating document:', error);
      throw error;
    }
  },

  // Valider une valeur textuelle
  async validateTextValue(value: string, criteria: {
    min_length?: number;
    max_length?: number;
    acceptable_values?: string[];
  }): Promise<ValidationResponse> {
    try {
      const response = await axios.post<ValidationResponse>(
        `${import.meta.env.VITE_API_BASE_URL}/validation/text`,
        {
          value,
          criteria
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error validating text value:', error);
      throw error;
    }
  }
};
