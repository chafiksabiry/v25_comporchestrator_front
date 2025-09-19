import axios from 'axios';

interface DocumentUploadResponse {
  id: string;
  filename: string;
  size: {
    unit: string;
    amount: number;
  };
  sha256: string;
  status: string;
  content_type: string;
  customerReference?: string;
  createdAt: string;
}

export const documentService = {
  async uploadDocument(
    file: File,
    filename?: string,
    customerReference?: string
  ): Promise<DocumentUploadResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file); // Le nom du champ doit correspondre à ce que multer attend
      
      if (filename) {
        formData.append('filename', filename);
      }
      
      if (customerReference) {
        formData.append('customer_reference', customerReference);
      }

      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/documents`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  }
};
