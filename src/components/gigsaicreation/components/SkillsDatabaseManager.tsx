import React, { useState, useEffect } from 'react';
import { skillsManager, SkillData } from '../lib/skillsManager';
import { Plus, Edit2, Trash2, Search, Save, X, RefreshCw } from 'lucide-react';

interface SkillsDatabaseManagerProps {
  onClose?: () => void;
}

export const SkillsDatabaseManager: React.FC<SkillsDatabaseManagerProps> = ({ onClose }) => {
  const [skills, setSkills] = useState<{
    soft: SkillData[];
    technical: SkillData[];
    professional: SkillData[];
  }>({ soft: [], technical: [], professional: [] });
  
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'soft' | 'technical' | 'professional'>('soft');
  const [editingSkill, setEditingSkill] = useState<SkillData | null>(null);
  const [newSkill, setNewSkill] = useState<Partial<SkillData>>({
    name: '',
    description: '',
    category: 'soft',
    level: 1,
    details: '' // Add details field
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load skills on component mount
  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    setLoading(true);
    try {
      const allSkills = await skillsManager.getAllSkills();
      setSkills(allSkills);
      setMessage({ type: 'success', text: 'Skills loaded successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load skills' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSkill = async () => {
    if (!newSkill.name || !newSkill.description || !newSkill.category) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    setLoading(true);
    try {
      const result = await skillsManager.saveSkill(newSkill as SkillData);
      
      if (result.error) {
        throw result.error;
      }

      setMessage({ type: 'success', text: 'Skill saved successfully!' });
      setNewSkill({ name: '', description: '', category: 'soft', level: 1, details: '' });
      setShowAddForm(false);
      await loadSkills(); // Reload skills
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save skill' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSkill = async () => {
    if (!editingSkill || !editingSkill._id) {
      setMessage({ type: 'error', text: 'No skill selected for editing' });
      return;
    }

    setLoading(true);
    try {
      const result = await skillsManager.updateSkill(editingSkill._id, editingSkill);
      
      if (result.error) {
        throw result.error;
      }

      setMessage({ type: 'success', text: 'Skill updated successfully!' });
      setEditingSkill(null);
      await loadSkills(); // Reload skills
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update skill' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSkill = async (skillId: string, category: 'soft' | 'technical' | 'professional') => {
    const confirmed = window.confirm('Are you sure you want to delete this skill? Click OK to delete or Cancel to keep it.');
    if (!confirmed) {
      return;
    }

    setLoading(true);
    try {
      const result = await skillsManager.deleteSkill(skillId, category);
      
      if (result.error) {
        throw result.error;
      }

      setMessage({ type: 'success', text: 'Skill deleted successfully!' });
      await loadSkills(); // Reload skills
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete skill' });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      await loadSkills();
      return;
    }

    setLoading(true);
    try {
      const result = await skillsManager.searchSkillsByName(searchTerm, selectedCategory);
      
      if (result.error) {
        throw result.error;
      }

      // Update the selected category with search results
      setSkills(prev => ({
        ...prev,
        [selectedCategory]: result.data
      }));
      
      setMessage({ type: 'success', text: `Found ${result.data.length} skills` });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to search skills' });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncPredefinedSkills = async () => {
    try {
      setLoading(true);
      setMessage({ type: 'success', text: 'Syncing predefined skills with database...' });
      
      const { syncPredefinedSkills } = await import('../lib/skillsManager');
      await syncPredefinedSkills();
      
      // Refresh the skills list
      await loadSkills();
    } catch (error) {
      console.error('Error syncing predefined skills:', error);
      setMessage({ type: 'error', text: `Error syncing predefined skills: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
      setLoading(false);
    }
  };

  const filteredSkills = skills[selectedCategory] || [];

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'soft': return 'text-harx-alt-600 bg-harx-alt-100';
      case 'technical': return 'text-harx-600 bg-harx-100';
      case 'professional': return 'text-harx-alt-700 bg-harx-alt-50';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Skills Database Manager</h2>
            <p className="text-sm text-gray-600">Manage skills in the database</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadSkills}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-harx-500 text-white rounded-lg hover:bg-harx-600 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleSyncPredefinedSkills}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-harx-alt-500 text-white rounded-lg hover:bg-harx-alt-600 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Sync Predefined Skills
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mx-6 mt-4 p-3 rounded-lg ${
            message.type === 'success' ? 'bg-harx-50 text-harx-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Controls */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search skills..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-harx-500 focus:border-harx-500"
                />
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              </div>
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-harx-500 focus:border-harx-500"
            >
              <option value="soft">Soft Skills</option>
              <option value="technical">Technical Skills</option>
              <option value="professional">Professional Skills</option>
            </select>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-4 py-2 bg-harx-500 text-white rounded-lg hover:bg-harx-600 disabled:opacity-50"
            >
              Search
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-harx-alt-500 text-white rounded-lg hover:bg-harx-alt-600"
            >
              <Plus className="w-4 h-4" />
              Add Skill
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-harx-500" />
                <span className="text-gray-600">Loading...</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSkills.map((skill) => (
                <div
                  key={skill._id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{skill.name}</h3>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(skill.category)}`}>
                        {skill.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingSkill(skill)}
                        className="p-1 text-harx-600 hover:text-harx-800 hover:bg-harx-50 rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => skill._id && handleDeleteSkill(skill._id, skill.category)}
                        className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{skill.description}</p>
                  {skill.details && (
                    <p className="text-xs text-gray-500 mb-2">{skill.details}</p>
                  )}
                  {skill.level && (
                    <div className="text-xs text-gray-500">
                      Level: {skill.level}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Skill Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-semibold mb-4">Add New Skill</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={newSkill.name}
                    onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-harx-500 focus:border-harx-500"
                    placeholder="Skill name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newSkill.description}
                    onChange={(e) => setNewSkill({ ...newSkill, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-harx-500 focus:border-harx-500"
                    rows={3}
                    placeholder="Skill description"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Details</label>
                  <textarea
                    value={newSkill.details}
                    onChange={(e) => setNewSkill({ ...newSkill, details: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-harx-500 focus:border-harx-500"
                    rows={2}
                    placeholder="Additional details about the skill"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={newSkill.category}
                    onChange={(e) => setNewSkill({ ...newSkill, category: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-harx-500 focus:border-harx-500"
                  >
                    <option value="soft">Soft Skills</option>
                    <option value="technical">Technical Skills</option>
                    <option value="professional">Professional Skills</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={newSkill.level}
                    onChange={(e) => setNewSkill({ ...newSkill, level: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-harx-500 focus:border-harx-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={handleSaveSkill}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-harx-500 text-white rounded-lg hover:bg-harx-600 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Skill Modal */}
        {editingSkill && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-semibold mb-4">Edit Skill</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={editingSkill.name}
                    onChange={(e) => setEditingSkill({ ...editingSkill, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-harx-500 focus:border-harx-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={editingSkill.description}
                    onChange={(e) => setEditingSkill({ ...editingSkill, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-harx-500 focus:border-harx-500"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Details</label>
                  <textarea
                    value={editingSkill.details || ''}
                    onChange={(e) => setEditingSkill({ ...editingSkill, details: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-harx-500 focus:border-harx-500"
                    rows={2}
                    placeholder="Additional details about the skill"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={editingSkill.category}
                    onChange={(e) => setEditingSkill({ ...editingSkill, category: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-harx-500 focus:border-harx-500"
                  >
                    <option value="soft">Soft Skills</option>
                    <option value="technical">Technical Skills</option>
                    <option value="professional">Professional Skills</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={editingSkill.level}
                    onChange={(e) => setEditingSkill({ ...editingSkill, level: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-harx-500 focus:border-harx-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={handleUpdateSkill}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-harx-500 text-white rounded-lg hover:bg-harx-600 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  Update
                </button>
                <button
                  onClick={() => setEditingSkill(null)}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 
