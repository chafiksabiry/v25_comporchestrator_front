import React, { useState } from 'react';
import { Rocket, Users, Calendar, Settings, CheckCircle, Play, Video, Zap, BarChart3, Globe, Shield, Bell } from 'lucide-react';
import { TrainingJourney, TrainingModule, Rep } from '../../types/core';

interface JourneyLauncherProps {
  journey: TrainingJourney;
  modules: TrainingModule[];
  onLaunch: (journey: TrainingJourney, enrolledReps: Rep[]) => void;
  onBack: () => void;
}

export default function JourneyLauncher({ journey, modules, onLaunch, onBack }: JourneyLauncherProps) {
  const [selectedReps, setSelectedReps] = useState<string[]>([]);
  const [launchSettings, setLaunchSettings] = useState({
    autoEnroll: true,
    sendNotifications: true,
    startDate: new Date().toISOString().split('T')[0],
    deadline: '',
    allowSelfPaced: true,
    enableLiveStreaming: true,
    recordSessions: true,
    aiTutorEnabled: true,
    progressTracking: true
  });

  // Mock REPs data - in real app, this would come from API
  const availableReps: Rep[] = [
    {
      id: '1',
      name: 'Sarah Johnson',
      email: 'sarah@company.com',
      role: 'Customer Success Rep',
      department: 'Customer Success',
      enrolledJourneys: [],
      progress: []
    },
    {
      id: '2',
      name: 'Mike Chen',
      email: 'mike@company.com',
      role: 'Sales Rep',
      department: 'Sales',
      enrolledJourneys: [],
      progress: []
    },
    {
      id: '3',
      name: 'Lisa Rodriguez',
      email: 'lisa@company.com',
      role: 'Support Agent',
      department: 'Support',
      enrolledJourneys: [],
      progress: []
    },
    {
      id: '4',
      name: 'David Park',
      email: 'david@company.com',
      role: 'Account Manager',
      department: 'Sales',
      enrolledJourneys: [],
      progress: []
    },
    {
      id: '5',
      name: 'Emma Wilson',
      email: 'emma@company.com',
      role: 'Product Specialist',
      department: 'Product',
      enrolledJourneys: [],
      progress: []
    },
    {
      id: '6',
      name: 'James Brown',
      email: 'james@company.com',
      role: 'Agent',
      department: 'Customer Success',
      enrolledJourneys: [],
      progress: []
    }
  ];

  const handleRepToggle = (repId: string) => {
    setSelectedReps(prev => 
      prev.includes(repId) 
        ? prev.filter(id => id !== repId)
        : [...prev, repId]
    );
  };

  const handleSelectAll = () => {
    if (selectedReps.length === availableReps.length) {
      setSelectedReps([]);
    } else {
      setSelectedReps(availableReps.map(rep => rep.id));
    }
  };

  const handleLaunch = () => {
    const enrolledReps = availableReps.filter(rep => selectedReps.includes(rep.id));
    const updatedJourney: TrainingJourney = {
      ...journey,
      status: 'active',
      steps: journey.steps.map(step => ({ ...step, status: 'completed' }))
    };
    
    onLaunch(updatedJourney, enrolledReps);
  };

  const totalDuration = modules.reduce((sum, module) => sum + module.duration, 0);
  const totalAssessments = modules.reduce((sum, module) => sum + module.assessments.length, 0);
  const totalInteractiveElements = modules.reduce((sum, module) => 
    sum + module.content.filter(c => c.type === 'interactive').length, 0
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200 mb-4">
              <Rocket className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-gray-700">Step 3: Launch Your Training Journey</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Ready for Launch! 🚀</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Your AI-enhanced training program is ready to deploy. Review the details and enroll your team members.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Training Overview */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
                <h3 className="text-2xl font-semibold text-gray-900 mb-6">Training Program Overview</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                  <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl">
                    <Video className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                    <div className="text-2xl font-bold text-blue-600 mb-1">{modules.length}</div>
                    <div className="text-sm text-gray-600">Enhanced Modules</div>
                  </div>
                  <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl">
                    <Zap className="h-8 w-8 text-purple-600 mx-auto mb-3" />
                    <div className="text-2xl font-bold text-purple-600 mb-1">{totalInteractiveElements}</div>
                    <div className="text-sm text-gray-600">Interactive Elements</div>
                  </div>
                  <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
                    <BarChart3 className="h-8 w-8 text-green-600 mx-auto mb-3" />
                    <div className="text-2xl font-bold text-green-600 mb-1">{totalAssessments}</div>
                    <div className="text-sm text-gray-600">Assessments</div>
                  </div>
                  <div className="text-center p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl">
                    <Calendar className="h-8 w-8 text-amber-600 mx-auto mb-3" />
                    <div className="text-2xl font-bold text-amber-600 mb-1">{Math.round(totalDuration / 60)}h</div>
                    <div className="text-sm text-gray-600">Total Duration</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Enhanced Training Modules:</h4>
                  {modules.map((module, index) => (
                    <div key={module.id} className="flex items-center space-x-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{module.title}</div>
                        <div className="text-sm text-gray-600">
                          {module.duration} min • {module.difficulty} • {module.content.length} content items
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Video className="h-4 w-4 text-red-500" />
                        <Zap className="h-4 w-4 text-purple-500" />
                        <BarChart3 className="h-4 w-4 text-blue-500" />
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Team Member Selection */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-semibold text-gray-900">Select Team Members</h3>
                  <button
                    onClick={handleSelectAll}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium px-4 py-2 border border-blue-200 rounded-lg hover:bg-blue-50 transition-all"
                  >
                    {selectedReps.length === availableReps.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableReps.map((rep) => (
                    <label key={rep.id} className="flex items-center p-4 border-2 border-gray-200 rounded-xl hover:border-green-300 hover:bg-green-50 cursor-pointer transition-all">
                      <input
                        type="checkbox"
                        checked={selectedReps.includes(rep.id)}
                        onChange={() => handleRepToggle(rep.id)}
                        className="mr-4 h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      />
                      <div className="flex items-center space-x-3 flex-1">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                          {rep.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{rep.name}</div>
                          <div className="text-sm text-gray-600">{rep.role} • {rep.department}</div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">{rep.email}</div>
                    </label>
                  ))}
                </div>

                {selectedReps.length > 0 && (
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                    <div className="flex items-center space-x-2">
                      <Users className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-900">
                        {selectedReps.length} team member{selectedReps.length !== 1 ? 's' : ''} selected for enrollment
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Settings Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Launch Settings */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Launch Settings</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={launchSettings.startDate}
                      onChange={(e) => setLaunchSettings(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Completion Deadline (Optional)
                    </label>
                    <input
                      type="date"
                      value={launchSettings.deadline}
                      onChange={(e) => setLaunchSettings(prev => ({ ...prev, deadline: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Feature Settings */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Feature Settings</h3>
                
                <div className="space-y-4">
                  <label className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Bell className="h-5 w-5 text-blue-500" />
                      <span className="text-sm text-gray-700">Send enrollment notifications</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={launchSettings.sendNotifications}
                      onChange={(e) => setLaunchSettings(prev => ({ ...prev, sendNotifications: e.target.checked }))}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Play className="h-5 w-5 text-green-500" />
                      <span className="text-sm text-gray-700">Allow self-paced learning</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={launchSettings.allowSelfPaced}
                      onChange={(e) => setLaunchSettings(prev => ({ ...prev, allowSelfPaced: e.target.checked }))}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Video className="h-5 w-5 text-red-500" />
                      <span className="text-sm text-gray-700">Enable live streaming</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={launchSettings.enableLiveStreaming}
                      onChange={(e) => setLaunchSettings(prev => ({ ...prev, enableLiveStreaming: e.target.checked }))}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Settings className="h-5 w-5 text-purple-500" />
                      <span className="text-sm text-gray-700">Record training sessions</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={launchSettings.recordSessions}
                      onChange={(e) => setLaunchSettings(prev => ({ ...prev, recordSessions: e.target.checked }))}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Zap className="h-5 w-5 text-yellow-500" />
                      <span className="text-sm text-gray-700">AI tutor assistance</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={launchSettings.aiTutorEnabled}
                      onChange={(e) => setLaunchSettings(prev => ({ ...prev, aiTutorEnabled: e.target.checked }))}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <BarChart3 className="h-5 w-5 text-indigo-500" />
                      <span className="text-sm text-gray-700">Advanced progress tracking</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={launchSettings.progressTracking}
                      onChange={(e) => setLaunchSettings(prev => ({ ...prev, progressTracking: e.target.checked }))}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                  </label>
                </div>
              </div>

              {/* Launch Ready Status */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6">
                <div className="text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h4 className="font-semibold text-green-900 mb-2">Ready to Launch!</h4>
                  <p className="text-sm text-green-700 mb-4">
                    Your AI-enhanced training program is configured and ready to deploy.
                  </p>
                  
                  <div className="space-y-2 text-xs text-green-600">
                    <div className="flex items-center justify-center space-x-2">
                      <CheckCircle className="h-3 w-3" />
                      <span>Content enhanced with AI</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <CheckCircle className="h-3 w-3" />
                      <span>Interactive elements added</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <CheckCircle className="h-3 w-3" />
                      <span>Assessments configured</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <CheckCircle className="h-3 w-3" />
                      <span>Team members selected</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center mt-8">
            <button
              onClick={onBack}
              className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium"
            >
              Back to Curriculum
            </button>
            
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-2">
                {selectedReps.length} team member{selectedReps.length !== 1 ? 's' : ''} selected
              </div>
              <div className="flex items-center space-x-2">
                <Globe className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-600 font-medium">Ready for Global Deployment</span>
              </div>
            </div>

            <button
              onClick={handleLaunch}
              disabled={selectedReps.length === 0}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-lg flex items-center space-x-2"
            >
              <Rocket className="h-5 w-5" />
              <span>Launch Training Journey</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}