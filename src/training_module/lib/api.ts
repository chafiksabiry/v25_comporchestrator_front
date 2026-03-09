interface ApiResponse<T = any> {
  data: T;
  message?: string;
  status: number;
}

export interface ApiError {
  message: string;
  status: number;
  errors?: Record<string, string[]>;
}

class ApiClientClass {
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    // Use same logic as manualTrainingApi.ts for consistency
    if (import.meta.env.VITE_API_BASE_URL) {
      this.baseURL = import.meta.env.VITE_API_BASE_URL;
    } else {
      const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
      const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      this.baseURL = isLocal ? 'http://localhost:5010' : 'https://v25platformtrainingbackend-production.up.railway.app';
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getToken();

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const rawData = await response.json();

      if (!response.ok) {
        throw new ApiError(rawData.message || 'Request failed', response.status, rawData.errors);
      }

      // Normalize ObjectIds from Extended JSON format to strings
      const { normalizeObjectIds } = await import('./mongoUtils');
      const data = normalizeObjectIds(rawData);

      return {
        data,
        status: response.status,
        message: data.message,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Network error', 0);
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async upload<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    const token = this.getToken();

    const config: RequestInit = {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        // Don't set Content-Type for FormData - browser will set it with boundary
      },
      body: formData,
    };

    const url = `${this.baseURL}${endpoint}`;

    try {
      const response = await fetch(url, config);

      // Check if response has content before trying to parse JSON
      const contentType = response.headers.get('content-type');
      let data: any;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // If not JSON, read as text
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          // If text is not JSON, create error object
          data = {
            message: text || 'Upload failed',
            error: text || 'Upload failed'
          };
        }
      }

      if (!response.ok) {
        throw new ApiError(
          data.message || data.error || 'Upload failed',
          response.status,
          data.errors
        );
      }

      return {
        data,
        status: response.status,
        message: data.message,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      // Network or other errors
      throw new ApiError(
        error instanceof Error ? error.message : 'Network error during upload',
        0
      );
    }
  }
}

export const ApiClient = new ApiClientClass();

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}