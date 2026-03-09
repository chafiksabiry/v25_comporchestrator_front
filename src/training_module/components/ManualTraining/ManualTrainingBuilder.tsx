import React, { useState, useEffect } from 'react';
import { Plus, Save, Eye, Trash2, ArrowLeft, ArrowRight, BookOpen, Settings, Image as ImageIcon, X as XIcon } from 'lucide-react';
import { ManualTraining, TrainingMetadata, ManualTrainingModule } from '../../types/manualTraining';
import { CloudinaryUploadResult } from '../../lib/cloudinaryService';
import { FileUploader } from './FileUploader';
import { ModuleEditor } from './ModuleEditor';
import { AIContentOrganizer } from './AIContentOrganizer';
import axios from 'axios';

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  return isLocal ? 'http://localhost:5010' : 'https://v25platformtrainingbackend-production.up.railway.app';
};

const API_BASE = getApiBaseUrl();

interface ManualTrainingBuilderProps {
  companyId: string;
  onBack?: () => void;
  setupData?: {
    companyName: string;
    industry: string;
    trainingName: string;
    trainingDescription: string;
    estimatedDuration: string;
    gig?: any;
  };
}

export const ManualTrainingBuilder: React.FC<ManualTrainingBuilderProps> = ({
  companyId,
  onBack,
  setupData,
}) => {
  const [currentView, setCurrentView] = useState<'list' | 'create' | 'edit' | 'ai-organize' | 'modules'>(
    setupData ? 'create' : 'list'
  );
  const [trainings, setTrainings] = useState<ManualTraining[]>([]);
  const [selectedTraining, setSelectedTraining] = useState<ManualTraining | null>(null);
  const [loading, setLoading] = useState(false);
  const [showThumbnailUpload, setShowThumbnailUpload] = useState(false);
  const [tagInput, setTagInput] = useState('');

  // Form state - Pre-fill with setupData if available
  const [formData, setFormData] = useState<Partial<ManualTraining>>({
    companyId,
    title: setupData?.trainingName || '',
    description: setupData?.trainingDescription || '',
    status: 'draft',
    metadata: {
      category: setupData?.industry || '',
      difficulty: 'beginner',
      estimatedDuration: parseInt(setupData?.estimatedDuration || '2400'), // Duration in minutes
      tags: setupData?.industry ? [setupData.industry] : [],
      targetRoles: setupData?.gig ? [setupData.gig.title] : [],
      language: 'fr',
    },
  });

  useEffect(() => {
    loadTrainings();
  }, [companyId]);

  const loadTrainings = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/manual-trainings/company/${companyId}`);
      if (response.data.success) {
        setTrainings(response.data.data);
      }
    } catch (error) {
      console.error('Error loading trainings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (goToModules: boolean = false) => {
    setLoading(true);
    try {
      if (selectedTraining?.id) {
        // Update existing
        const response = await axios.put(
          `${API_BASE}/manual-trainings/${selectedTraining.id}`,
          formData
        );
        if (response.data.success) {
          await loadTrainings();
          if (goToModules) {
            setSelectedTraining(response.data.data);
            setCurrentView('ai-organize'); // ✨ Go to AI organize first
          } else {
            setCurrentView('list');
          }
        }
      } else {
        // Create new
        const response = await axios.post(`${API_BASE}/manual-trainings`, formData);
        if (response.data.success) {
          await loadTrainings();
          const newTraining = response.data.data;
          setSelectedTraining(newTraining);

          if (goToModules) {
            setCurrentView('ai-organize'); // ✨ Go to AI organize first
          } else {
            setCurrentView('list');
          }
        }
      }
    } catch (error) {
      console.error('Error saving training:', error);
      alert('Error saving training');
    } finally {
      setLoading(false);
    }
  };

  const handleThumbnailUpload = async (result: CloudinaryUploadResult) => {
    if (!selectedTraining?.id) return;

    try {
      const formData = new FormData();
      // Note: This is just updating the URL, actual file was already uploaded to Cloudinary
      const response = await axios.put(
        `${API_BASE}/manual-trainings/${selectedTraining.id}`,
        {
          ...selectedTraining,
          thumbnail: result.secureUrl,
        }
      );

      if (response.data.success) {
        setSelectedTraining(response.data.data);
        setShowThumbnailUpload(false);
        await loadTrainings();
      }
    } catch (error) {
      console.error('Error updating thumbnail:', error);
    }
  };

  const handlePublish = async (training: ManualTraining) => {
    if (!training.id) return;

    if (!confirm('Are you sure you want to publish this training? It will be visible to all users.')) {
      return;
    }

    try {
      const response = await axios.post(`${API_BASE}/manual-trainings/${training.id}/publish`);
      if (response.data.success) {
        await loadTrainings();
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error publishing training');
    }
  };

  const handleDelete = async (training: ManualTraining) => {
    if (!training.id) return;

    if (!confirm('Are you sure you want to delete this training? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`${API_BASE}/manual-trainings/${training.id}`);
      await loadTrainings();
    } catch (error) {
      console.error('Error deleting training:', error);
      alert('Error deleting training');
    }
  };

  // Tag management functions
  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !formData.metadata?.tags?.includes(trimmedTag)) {
      setFormData({
        ...formData,
        metadata: {
          ...formData.metadata!,
          tags: [...(formData.metadata?.tags || []), trimmedTag]
        }
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      metadata: {
        ...formData.metadata!,
        tags: formData.metadata?.tags?.filter(tag => tag !== tagToRemove) || []
      }
    });
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Si l'utilisateur tape une virgule, ajouter le tag
    if (value.includes(',')) {
      const tagToAdd = value.replace(',', '').trim();
      if (tagToAdd && !formData.metadata?.tags?.includes(tagToAdd)) {
        setFormData({
          ...formData,
          metadata: {
            ...formData.metadata!,
            tags: [...(formData.metadata?.tags || []), tagToAdd]
          }
        });
      }
      setTagInput('');
    } else {
      setTagInput(value);
    }
  };

  const handleCreateNew = () => {
    setSelectedTraining(null);
    setTagInput('');
    setFormData({
      companyId,
      title: '',
      description: '',
      status: 'draft',
      metadata: {
        category: '',
        difficulty: 'beginner',
        estimatedDuration: 0,
        tags: [],
        targetRoles: [],
        language: 'fr',
      },
    });
    setCurrentView('create');
  };

  const handleEdit = (training: ManualTraining) => {
    setSelectedTraining(training);
    setFormData(training);
    setTagInput('');
    setCurrentView('edit');
  };

  const handleManageModules = (training: ManualTraining) => {
    setSelectedTraining(training);
    setCurrentView('modules');
  };

  // List View
  if (currentView === 'list') {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h1 className="text-3xl font-bold">Manual Trainings</h1>
          </div>

          <button
            onClick={handleCreateNew}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Training
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading trainings...</p>
          </div>
        ) : trainings.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl text-gray-600">No trainings yet</p>
            <p className="text-gray-500 mt-2">Create your first manual training to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trainings.map((training) => (
              <div key={training.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                {/* Thumbnail */}
                <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  {training.thumbnail ? (
                    <img src={training.thumbnail} alt={training.title} className="w-full h-full object-cover" />
                  ) : (
                    <BookOpen className="w-16 h-16 text-white opacity-50" />
                  )}
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-bold text-gray-900 flex-1">{training.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${training.status === 'published' ? 'bg-green-100 text-green-800' :
                        training.status === 'archived' ? 'bg-gray-100 text-gray-800' :
                          'bg-yellow-100 text-yellow-800'
                      }`}>
                      {training.status}
                    </span>
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{training.description}</p>

                  <div className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                      {training.metadata?.estimatedDuration} min
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleManageModules(training)}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center justify-center"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Modules
                    </button>

                    <button
                      onClick={() => handleEdit(training)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                    >
                      Edit
                    </button>

                    {training.status === 'draft' && (
                      <button
                        onClick={() => handlePublish(training)}
                        className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
                      >
                        Publish
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(training)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Create/Edit View
  if (currentView === 'create' || currentView === 'edit') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Fixed Header */}
        <div className="fixed top-0 left-0 right-0 bg-white shadow-md z-50 px-6 py-4">
          <div className="flex items-center space-x-4 max-w-4xl mx-auto">
            <button
              onClick={() => setCurrentView('list')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-3xl font-bold">
              {currentView === 'create' ? 'Create New Training' : 'Edit Training'}
            </h1>
          </div>
        </div>

        {/* Content with padding-top to account for fixed header */}
        <div className="pt-32 px-6 pb-6 max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8 space-y-6">
            {/* Basic Information */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Training Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter training title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter training description"
              />
            </div>

            {/* Metadata */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Duration (minutes)
              </label>
              <input
                type="number"
                value={formData.metadata?.estimatedDuration || 0}
                onChange={(e) => setFormData({
                  ...formData,
                  metadata: { ...formData.metadata!, estimatedDuration: parseInt(e.target.value) || 0 }
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 60"
              />
            </div>

            {/* Tags - YouTube Style */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>

              {/* Tags Display */}
              {formData.metadata?.tags && formData.metadata.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.metadata.tags.map((tag, index) => (
                    <div
                      key={index}
                      className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-2 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                      >
                        <XIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Tag Input */}
              <input
                type="text"
                value={tagInput}
                onChange={handleTagInputChange}
                onKeyDown={handleTagKeyDown}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Type a tag and press Enter or comma (,)"
              />
              <p className="mt-1 text-xs text-gray-500">
                Press Enter or type comma (,) to add a tag
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-6 border-t">
              <button
                onClick={() => setCurrentView('list')}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleSave(false)}
                  disabled={loading || !formData.title || !formData.description}
                  className="px-6 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Saving...' : 'Save'}
                </button>

                <button
                  onClick={() => handleSave(true)}
                  disabled={loading || !formData.title || !formData.description}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Save & Create Modules'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // AI Content Organizer View
  if (currentView === 'ai-organize' && selectedTraining) {
    return (
      <AIContentOrganizer
        trainingId={selectedTraining.id!}
        trainingTitle={selectedTraining.title}
        onComplete={async () => {
          // AI has organized the content, reload and go to modules
          await loadTrainings();
          const updatedTraining = trainings.find(t => t.id === selectedTraining.id);
          if (updatedTraining) {
            setSelectedTraining(updatedTraining);
          }
          setCurrentView('modules');
        }}
        onSkip={() => {
          // Skip AI and go directly to manual module creation
          setCurrentView('modules');
        }}
      />
    );
  }

  // Modules View
  if (currentView === 'modules' && selectedTraining) {
    return (
      <ModuleEditor
        training={selectedTraining}
        onBack={() => {
          setCurrentView('list');
          setSelectedTraining(null);
        }}
      />
    );
  }

  return null;
};

