import axios from 'axios';

interface AddressData {
  businessName: string;
  streetAddress: string;
  locality: string;
  postalCode: string;
  countryCode: string;
  extendedAddress?: string;
  administrativeArea?: string;
  customerReference?: string;
}

interface AddressResponse {
  id: string;
  businessName: string;
  streetAddress: string;
  extendedAddress: string | null;
  locality: string;
  administrativeArea: string | null;
  postalCode: string;
  countryCode: string;
  customerReference: string | null;
  recordType: string;
  createdAt: string;
}

export const addressService = {
  async createAddress(data: AddressData): Promise<AddressResponse> {
    try {
      console.log('📫 Address service - data to send:', data);
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/addresses`,
        data
      );
      return response.data as AddressResponse;
    } catch (error) {
      console.error('Error creating address:', error);
      throw error;
    }
  }
};
