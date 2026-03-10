import { User } from '../../core/entities/User';
import { ApiClient } from '../../lib/api';

export class AuthService {
  static async login(email: string, password: string): Promise<User> {
    const response = await ApiClient.post('/auth/login', { email, password });
    
    if (response.data.token) {
      ApiClient.setToken(response.data.token);
    }
    
    return response.data.user;
  }

  static async register(userData: {
    name: string;
    email: string;
    password: string;
    role: string;
    department: string;
  }): Promise<User> {
    const response = await ApiClient.post('/auth/register', userData);
    
    if (response.data.token) {
      ApiClient.setToken(response.data.token);
    }
    
    return response.data.user;
  }

  static async logout(): Promise<void> {
    await ApiClient.post('/auth/logout');
    ApiClient.clearToken();
  }

  static async getCurrentUser(): Promise<User | null> {
    try {
      const response = await ApiClient.get('/auth/me');
      return response.data.user;
    } catch (error) {
      return null;
    }
  }

  static async refreshToken(): Promise<string> {
    const response = await ApiClient.post('/auth/refresh');
    const token = response.data.token;
    ApiClient.setToken(token);
    return token;
  }

  static async updateProfile(userId: string, updates: Partial<User>): Promise<User> {
    const response = await ApiClient.put(`/auth/profile/${userId}`, updates);
    return response.data.user;
  }
}