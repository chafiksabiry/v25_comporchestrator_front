// API Client for Manual Training System
import axios from 'axios';
import { ManualTraining, ManualTrainingModule, ManualQuiz, TrainingProgress, QuizResult } from '../types/manualTraining';

// Détection automatique de l'environnement
const getApiBaseUrl = () => {
  // Si une variable d'environnement est définie, l'utiliser
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  // Détecter selon l'hostname
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  if (isLocal) {
    // Environnement local
    return 'http://localhost:5010';
  } else {
    // Environnement production
    return 'https://v25platformtrainingbackend-production.up.railway.app';
  }
};

const API_BASE = getApiBaseUrl();

console.log('🌐 API Base URL:', API_BASE);

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ========== TRAINING APIs ==========

export const trainingApi = {
  // Get all trainings for a company
  getByCompany: async (companyId: string) => {
    const response = await api.get(`/manual-trainings/company/${companyId}`);
    return response.data;
  },

  // Get training by ID
  getById: async (id: string) => {
    const response = await api.get(`/manual-trainings/${id}`);
    return response.data;
  },

  // Create new training
  create: async (training: Partial<ManualTraining>) => {
    const response = await api.post('/manual-trainings', training);
    return response.data;
  },

  // Update training
  update: async (id: string, training: Partial<ManualTraining>) => {
    const response = await api.put(`/manual-trainings/${id}`, training);
    return response.data;
  },

  // Delete training
  delete: async (id: string) => {
    const response = await api.delete(`/manual-trainings/${id}`);
    return response.data;
  },

  // Publish training
  publish: async (id: string) => {
    const response = await api.post(`/manual-trainings/${id}/publish`);
    return response.data;
  },

  // Archive training
  archive: async (id: string) => {
    const response = await api.post(`/manual-trainings/${id}/archive`);
    return response.data;
  },

  // Upload thumbnail
  uploadThumbnail: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/manual-trainings/${id}/thumbnail`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Get statistics
  getStats: async (companyId: string) => {
    const response = await api.get(`/manual-trainings/company/${companyId}/stats`);
    return response.data;
  },
};

// ========== MODULE APIs ==========

export const moduleApi = {
  // Get all modules for a training
  getByTraining: async (trainingId: string) => {
    const response = await api.get(`/manual-trainings/${trainingId}/modules`);
    return response.data;
  },

  // Get module by ID
  getById: async (id: string) => {
    const response = await api.get(`/manual-trainings/modules/${id}`);
    return response.data;
  },

  // Create new module
  create: async (trainingId: string, module: Partial<ManualTrainingModule>) => {
    const response = await api.post(`/manual-trainings/${trainingId}/modules`, module);
    return response.data;
  },

  // Update module
  update: async (id: string, module: Partial<ManualTrainingModule>) => {
    const response = await api.put(`/manual-trainings/modules/${id}`, module);
    return response.data;
  },

  // Delete module
  delete: async (id: string) => {
    const response = await api.delete(`/manual-trainings/modules/${id}`);
    return response.data;
  },

  // Add section to module
  addSection: async (moduleId: string, section: any) => {
    const response = await api.post(`/manual-trainings/modules/${moduleId}/sections`, section);
    return response.data;
  },

  // Update section
  updateSection: async (moduleId: string, sectionId: string, section: any) => {
    const response = await api.put(`/manual-trainings/modules/${moduleId}/sections/${sectionId}`, section);
    return response.data;
  },

  // Delete section
  deleteSection: async (moduleId: string, sectionId: string) => {
    const response = await api.delete(`/manual-trainings/modules/${moduleId}/sections/${sectionId}`);
    return response.data;
  },

  // Upload file
  uploadFile: async (file: File, fileType: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileType', fileType);
    const response = await api.post('/manual-trainings/modules/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Reorder modules
  reorder: async (trainingId: string, moduleIds: string[]) => {
    const response = await api.post(`/manual-trainings/${trainingId}/modules/reorder`, moduleIds);
    return response.data;
  },
};

// ========== QUIZ APIs ==========

export const quizApi = {
  // Get all quizzes for a module
  getByModule: async (moduleId: string) => {
    const response = await api.get(`/manual-trainings/modules/${moduleId}/quizzes`);
    return response.data;
  },

  // Get all quizzes for a training
  getByTraining: async (trainingId: string) => {
    const response = await api.get(`/manual-trainings/${trainingId}/quizzes`);
    return response.data;
  },

  // Get quiz by ID
  getById: async (id: string) => {
    const response = await api.get(`/manual-trainings/quizzes/${id}`);
    return response.data;
  },

  // Create new quiz
  create: async (moduleId: string, quiz: Partial<ManualQuiz>) => {
    const response = await api.post(`/manual-trainings/modules/${moduleId}/quizzes`, quiz);
    return response.data;
  },

  // Update quiz
  update: async (id: string, quiz: Partial<ManualQuiz>) => {
    const response = await api.put(`/manual-trainings/quizzes/${id}`, quiz);
    return response.data;
  },

  // Delete quiz
  delete: async (id: string) => {
    const response = await api.delete(`/manual-trainings/quizzes/${id}`);
    return response.data;
  },

  // Add question to quiz
  addQuestion: async (quizId: string, question: any) => {
    const response = await api.post(`/manual-trainings/quizzes/${quizId}/questions`, question);
    return response.data;
  },

  // Update question
  updateQuestion: async (quizId: string, questionId: string, question: any) => {
    const response = await api.put(`/manual-trainings/quizzes/${quizId}/questions/${questionId}`, question);
    return response.data;
  },

  // Delete question
  deleteQuestion: async (quizId: string, questionId: string) => {
    const response = await api.delete(`/manual-trainings/quizzes/${quizId}/questions/${questionId}`);
    return response.data;
  },

  // Submit quiz
  submit: async (quizId: string, userId: string, answers: Record<string, any>) => {
    const response = await api.post(`/manual-trainings/quizzes/${quizId}/submit?userId=${userId}`, answers);
    return response.data;
  },
};

export default {
  training: trainingApi,
  module: moduleApi,
  quiz: quizApi,
};

