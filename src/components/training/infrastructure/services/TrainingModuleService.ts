import { ApiClient } from '../../lib/api';

export interface TrainingModule {
  _id?: string;
  id?: string;
  trainingJourneyId: string;
  title: string;
  description?: string;
  duration?: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  learningObjectives?: string[];
  prerequisites?: string[];
  topics?: string[];
  sectionIds?: string[];
  quizIds?: string[];
  order?: number;
}

export interface TrainingSection {
  _id?: string;
  id?: string;
  moduleId: string;
  title: string;
  type?: string;
  order?: number;
  content?: {
    text?: string;
    file?: {
      id: string;
      name: string;
      type: string;
      url: string;
      publicId?: string;
      size?: number;
      mimeType?: string;
    };
    youtubeUrl?: string;
  };
  duration?: number;
}

export class TrainingModuleService {
  /**
   * Create a new training module
   */
  static async createModule(module: TrainingModule): Promise<TrainingModule> {
    const response = await ApiClient.post('/training_modules', module);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error('Failed to create module');
  }

  /**
   * Get a module by ID
   */
  static async getModuleById(moduleId: string): Promise<TrainingModule> {
    const response = await ApiClient.get(`/training_modules/${moduleId}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error('Module not found');
  }

  /**
   * Get all modules for a training journey
   */
  static async getModulesByJourney(journeyId: string): Promise<TrainingModule[]> {
    const response = await ApiClient.get(`/training_modules/journey/${journeyId}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    return [];
  }

  /**
   * Update a module
   */
  static async updateModule(moduleId: string, module: Partial<TrainingModule>): Promise<TrainingModule> {
    const response = await ApiClient.put(`/training_modules/${moduleId}`, module);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error('Failed to update module');
  }

  /**
   * Delete a module
   */
  static async deleteModule(moduleId: string): Promise<void> {
    const response = await ApiClient.delete(`/training_modules/${moduleId}`);
    if (!response.data.success) {
      throw new Error('Failed to delete module');
    }
  }

  /**
   * Create a section for a module
   */
  static async createSection(moduleId: string, section: TrainingSection): Promise<TrainingSection> {
    const response = await ApiClient.post(`/training_modules/${moduleId}/sections`, section);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error('Failed to create section');
  }

  /**
   * Get all sections for a module
   */
  static async getSectionsByModule(moduleId: string): Promise<TrainingSection[]> {
    const response = await ApiClient.get(`/training_modules/${moduleId}/sections`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    return [];
  }

  /**
   * Get a section by ID
   */
  static async getSectionById(sectionId: string): Promise<TrainingSection> {
    const response = await ApiClient.get(`/training_modules/sections/${sectionId}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error('Section not found');
  }

  /**
   * Update a section
   */
  static async updateSection(sectionId: string, section: Partial<TrainingSection>): Promise<TrainingSection> {
    const response = await ApiClient.put(`/training_modules/sections/${sectionId}`, section);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error('Failed to update section');
  }

  /**
   * Delete a section
   */
  static async deleteSection(sectionId: string): Promise<void> {
    const response = await ApiClient.delete(`/training_modules/sections/${sectionId}`);
    if (!response.data.success) {
      throw new Error('Failed to delete section');
    }
  }
}

