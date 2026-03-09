import { ApiClient } from '../../lib/api';
import { TrainingJourney, TrainingModule, Rep, Company } from '../../types';

export class TrainingService {
  // Company Management
  static async createCompany(company: Omit<Company, 'id'>): Promise<Company> {
    const response = await ApiClient.post('/companies', company);
    return response.data;
  }

  static async getCompany(id: string): Promise<Company | null> {
    try {
      const response = await ApiClient.get(`/companies/${id}`);
      return response.data;
    } catch (error) {
      return null;
    }
  }

  static async updateCompany(id: string, updates: Partial<Company>): Promise<Company> {
    const response = await ApiClient.put(`/companies/${id}`, updates);
    return response.data;
  }

  // Training Journey Management
  static async createTrainingJourney(journey: Omit<TrainingJourney, 'id'>): Promise<TrainingJourney> {
    const response = await ApiClient.post('/training/journeys', journey);
    return response.data;
  }

  static async getTrainingJourneys(companyId: string): Promise<TrainingJourney[]> {
    const response = await ApiClient.get(`/training/journeys?companyId=${companyId}`);
    return response.data;
  }

  static async updateTrainingJourney(id: string, updates: Partial<TrainingJourney>): Promise<TrainingJourney> {
    const response = await ApiClient.put(`/training/journeys/${id}`, updates);
    return response.data;
  }

  static async deleteTrainingJourney(id: string): Promise<void> {
    await ApiClient.delete(`/training/journeys/${id}`);
  }

  // Training Module Management
  static async createTrainingModule(module: Omit<TrainingModule, 'id'>): Promise<TrainingModule> {
    const response = await ApiClient.post('/training/modules', module);
    return response.data;
  }

  static async getTrainingModules(journeyId: string): Promise<TrainingModule[]> {
    const response = await ApiClient.get(`/training/modules?journeyId=${journeyId}`);
    return response.data;
  }

  static async updateTrainingModule(id: string, updates: Partial<TrainingModule>): Promise<TrainingModule> {
    const response = await ApiClient.put(`/training/modules/${id}`, updates);
    return response.data;
  }

  static async deleteTrainingModule(id: string): Promise<void> {
    await ApiClient.delete(`/training/modules/${id}`);
  }

  // Rep Management
  static async createRep(rep: Omit<Rep, 'id'>): Promise<Rep> {
    const response = await ApiClient.post('/reps', rep);
    return response.data;
  }

  static async getReps(companyId?: string): Promise<Rep[]> {
    const query = companyId ? `?companyId=${companyId}` : '';
    const response = await ApiClient.get(`/reps${query}`);
    return response.data;
  }

  static async updateRep(id: string, updates: Partial<Rep>): Promise<Rep> {
    const response = await ApiClient.put(`/reps/${id}`, updates);
    return response.data;
  }

  static async deleteRep(id: string): Promise<void> {
    await ApiClient.delete(`/reps/${id}`);
  }

  // Progress Tracking
  static async updateProgress(
    repId: string,
    journeyId: string,
    moduleId: string,
    progress: number,
    engagementScore: number = 0
  ): Promise<void> {
    await ApiClient.post('/training/progress', {
      repId,
      journeyId,
      moduleId,
      progress,
      engagementScore
    });
  }

  static async getRepProgress(repId: string, journeyId: string) {
    const response = await ApiClient.get(`/training_journeys/rep-progress?repId=${repId}&journeyId=${journeyId}`);
    return response.data;
  }

  // File Upload
  static async uploadFile(file: File, journeyId: string): Promise<{ fileUrl: string; contentUploadId: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('journeyId', journeyId);

    const response = await ApiClient.upload('/files/upload', formData);
    return response.data;
  }

  // Analytics
  static async getJourneyAnalytics(journeyId: string) {
    const response = await ApiClient.get(`/analytics/journeys/${journeyId}`);
    return response.data;
  }

  static async getCompanyAnalytics(companyId: string) {
    const response = await ApiClient.get(`/analytics/companies/${companyId}`);
    return response.data;
  }
}