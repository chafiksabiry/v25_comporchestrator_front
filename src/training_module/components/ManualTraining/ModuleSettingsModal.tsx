import React, { useState } from 'react';
import { X, Save, BookOpen, Clock, FileText } from 'lucide-react';
import { ManualTrainingModule } from '../../types/manualTraining';
import axios from 'axios';

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  return isLocal ? 'http://localhost:5010' : 'https://v25platformtrainingbackend-production.up.railway.app';
};

const API_BASE = getApiBaseUrl();

interface ModuleSettingsModalProps {
  module: ManualTrainingModule;
  onClose: () => void;
  onUpdate: () => void;
}

export const ModuleSettingsModal: React.FC<ModuleSettingsModalProps> = ({
  module,
  onClose,
  onUpdate,
}) => {
  const [form, setForm] = useState({
    title: module.title || '',
    description: module.description || '',
    estimatedDuration: module.estimatedDuration || 0,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.title.trim()) {
      alert('Title is required');
      return;
    }

    setSaving(true);
    try {
      const response = await axios.put(
        `${API_BASE}/manual-trainings/modules/${module.id}`,
        form
      );

      if (response.data.success) {
        // Update the module object
        Object.assign(module, form);
        alert('Module updated successfully!');
        onUpdate();
        onClose();
      }
    } catch (error) {
      console.error('Error updating module:', error);
      alert('Error updating module');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BookOpen className="w-6 h-6" />
            <h2 className="text-2xl font-bold">Module Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Module Title *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-lg font-medium"
              placeholder="Ex: Introduction to Databases"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={5}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              placeholder="Describe the content and objectives of this module..."
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              Estimated Duration (minutes)
            </label>
            <input
              type="number"
              value={form.estimatedDuration}
              onChange={(e) => setForm({ ...form, estimatedDuration: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="45"
              min="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              Estimated time to complete all sections of this module
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <FileText className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-purple-900 mb-1">About the module</h4>
                <p className="text-sm text-purple-700">
                  Organize your content into thematic modules. Each module can contain
                  multiple sections (videos, documents, etc.) and an end-of-module quiz.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-6 py-3 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.title.trim()}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-2"
          >
            <Save className="w-5 h-5" />
            <span>{saving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

