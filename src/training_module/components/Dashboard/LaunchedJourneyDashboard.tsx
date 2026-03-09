import React, { useState } from 'react';
import { 
  Users, 
  TrendingUp, 
  Clock, 
  Award, 
  CheckCircle, 
  AlertTriangle, 
  BarChart3, 
  Eye, 
  MessageSquare,
  Calendar,
  Target,
  Brain,
  Video,
  BookOpen,
  Zap,
  Globe,
  Shield
} from 'lucide-react';
import { TrainingJourney, TrainingModule, Rep } from '../../types';

interface LaunchedJourneyDashboardProps {
  journey: TrainingJourney;
  modules: TrainingModule[];
  enrolledReps: Rep[];
  onViewProgress: (repId: string) => void;
  onViewAnalytics: () => void;
}

export default function LaunchedJourneyDashboard({ 
  journey, 
  modules, 
  enrolledReps, 
  onViewProgress, 
  onViewAnalytics 
}: LaunchedJourneyDashboardProps) {
  const [selectedTab, setSelectedTab] = useState('overview');

  // Mock progress data - in real app would come from API
  const progressData = {
    totalEnrolled: enrolledReps.length,
    activeParticipants: Math.floor(enrolledReps.length * 0.8),
    completedTraining: Math.floor(enrolledReps.length * 0.3),
    averageProgress: 65,
    averageEngagement: 78,
    averageScore: 82,
    completionRate: 30,
    dropoutRate: 5,
    averageTimeToComplete: '2.3 weeks',
    topPerformers: Array.isArray(enrolledReps) ? enrolledReps.slice(0, 3) : [],
    strugglingLearners: Array.isArray(enrolledReps) ? enrolledReps.slice(-2) : [],
    moduleCompletionRates: modules.map(module => ({
      moduleId: module.id,
      moduleName: module.title,
      completionRate: Math.floor(Math.random() * 40) + 60,
      averageScore: Math.floor(Math.random() * 20) + 75,
      averageTime: Math.floor(Math.random() * 30) + 20
    }))
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'participants', label: 'Participants', icon: Users },
    { id: 'modules', label: 'Module Performance', icon: BookOpen },
    { id: 'analytics', label: 'Advanced Analytics', icon: Brain }
  ];

  const renderOverviewTab = () => (
    <div className="space-y-8">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Enrolled</p>
              <p className="text-3xl font-bold text-gray-900">{progressData.totalEnrolled}</p>
            </div>
            <Users className="h-10 w-10 text-blue-500" />
          </div>
          <div className="mt-2">
            <span className="text-sm text-green-600">↑ 100% enrollment rate</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Participants</p>
              <p className="text-3xl font-bold text-gray-900">{progressData.activeParticipants}</p>
            </div>
            <TrendingUp className="h-10 w-10 text-green-500" />
          </div>
          <div className="mt-2">
            <span className="text-sm text-green-600">↑ {Math.round((progressData.activeParticipants / progressData.totalEnrolled) * 100)}% active</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completion Rate</p>
              <p className="text-3xl font-bold text-gray-900">{progressData.completionRate}%</p>
            </div>
            <Award className="h-10 w-10 text-purple-500" />
          </div>
          <div className="mt-2">
            <span className="text-sm text-blue-600">↑ Above industry average</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Progress</p>
              <p className="text-3xl font-bold text-gray-900">{progressData.averageProgress}%</p>
            </div>
            <Target className="h-10 w-10 text-amber-500" />
          </div>
          <div className="mt-2">
            <span className="text-sm text-green-600">↑ On track for completion</span>
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Training Progress</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Overall Completion</span>
                <span className="text-sm font-bold text-gray-900">{progressData.averageProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${progressData.averageProgress}%` }}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{progressData.completedTraining}</div>
                <div className="text-xs text-gray-600">Completed</div>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{progressData.activeParticipants - progressData.completedTraining}</div>
                <div className="text-xs text-gray-600">In Progress</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">{progressData.totalEnrolled - progressData.activeParticipants}</div>
                <div className="text-xs text-gray-600">Not Started</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Average Engagement</span>
              <span className="text-sm font-bold text-gray-900">{progressData.averageEngagement}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Average Score</span>
              <span className="text-sm font-bold text-gray-900">{progressData.averageScore}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Dropout Rate</span>
              <span className="text-sm font-bold text-red-600">{progressData.dropoutRate}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Avg Time to Complete</span>
              <span className="text-sm font-bold text-gray-900">{progressData.averageTimeToComplete}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Performers and Struggling Learners */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers</h3>
          <div className="space-y-3">
            {progressData.topPerformers.map((rep, index) => (
              <div key={rep.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{rep.name}</p>
                    <p className="text-sm text-gray-600">{rep.department}</p>
                  </div>
                </div>
                <button
                  onClick={() => onViewProgress(rep.id)}
                  className="text-green-600 hover:text-green-700 text-sm font-medium"
                >
                  View Progress
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Needs Attention</h3>
          <div className="space-y-3">
            {progressData.strugglingLearners.map((rep) => (
              <div key={rep.id} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-6 w-6 text-amber-500" />
                  <div>
                    <p className="font-medium text-gray-900">{rep.name}</p>
                    <p className="text-sm text-gray-600">{rep.department}</p>
                  </div>
                </div>
                <button
                  onClick={() => onViewProgress(rep.id)}
                  className="text-amber-600 hover:text-amber-700 text-sm font-medium"
                >
                  Assist
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderParticipantsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">All Participants</h3>
        <div className="flex items-center space-x-2">
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option>All Departments</option>
            <option>Customer Success</option>
            <option>Sales</option>
            <option>Support</option>
          </select>
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option>All Status</option>
            <option>Completed</option>
            <option>In Progress</option>
            <option>Not Started</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {enrolledReps.map((rep) => {
          const mockProgress = Math.floor(Math.random() * 100);
          const mockEngagement = Math.floor(Math.random() * 40) + 60;
          const mockLastActive = ['2 hours ago', '1 day ago', '3 hours ago', 'Just now'][Math.floor(Math.random() * 4)];
          
          return (
            <div key={rep.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-sm transition-shadow">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                  {rep.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{rep.name}</p>
                  <p className="text-sm text-gray-600">{rep.department}</p>
                </div>
              </div>
              
              <div className="space-y-3 mb-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Progress:</span>
                    <span className="font-medium">{mockProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-green-400 to-green-500 h-2 rounded-full"
                      style={{ width: `${mockProgress}%` }}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Engagement:</span>
                    <div className="font-medium">{mockEngagement}%</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Last Active:</span>
                    <div className="font-medium">{mockLastActive}</div>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => onViewProgress(rep.id)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                View Trainee Portal
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderModulesTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Module Performance Analysis</h3>
      
      <div className="space-y-4">
        {progressData.moduleCompletionRates.map((moduleData, index) => (
          <div key={moduleData.moduleId} className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {index + 1}
                </div>
                <h4 className="text-lg font-semibold text-gray-900">{moduleData.moduleName}</h4>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{moduleData.completionRate}%</div>
                <div className="text-sm text-gray-600">Completion Rate</div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-xl font-bold text-blue-600">{moduleData.averageScore}%</div>
                <div className="text-sm text-gray-600">Average Score</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-xl font-bold text-green-600">{moduleData.averageTime}min</div>
                <div className="text-sm text-gray-600">Average Time</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-xl font-bold text-purple-600">
                  {Math.floor(moduleData.completionRate / 10)}
                </div>
                <div className="text-sm text-gray-600">Engagement Score</div>
              </div>
            </div>
            
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full"
                  style={{ width: `${moduleData.completionRate}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAnalyticsTab = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Learning Effectiveness</h4>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium text-green-900">Knowledge Retention</span>
                <span className="text-2xl font-bold text-green-600">87%</span>
              </div>
              <p className="text-sm text-green-700 mt-1">Above industry benchmark of 75%</p>
            </div>
            
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium text-blue-900">Skill Application</span>
                <span className="text-2xl font-bold text-blue-600">82%</span>
              </div>
              <p className="text-sm text-blue-700 mt-1">Practical application in real scenarios</p>
            </div>
            
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium text-purple-900">Certification Readiness</span>
                <span className="text-2xl font-bold text-purple-600">78%</span>
              </div>
              <p className="text-sm text-purple-700 mt-1">Ready for certification assessment</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">AI Insights</h4>
          <div className="space-y-3">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <Brain className="h-4 w-4 text-amber-600" />
                <span className="font-medium text-amber-900">Optimization Opportunity</span>
              </div>
              <p className="text-sm text-amber-700">Module 3 shows 15% higher dropout rate - consider adding more interactive elements</p>
            </div>
            
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-900">Success Pattern</span>
              </div>
              <p className="text-sm text-green-700">Learners who complete Module 1 have 92% overall completion rate</p>
            </div>
            
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <Target className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-900">Recommendation</span>
              </div>
              <p className="text-sm text-blue-700">Add more practice scenarios to Module 4 for better skill retention</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl p-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="h-6 w-6" />
              <span className="text-green-100 font-medium">LIVE TRAINING JOURNEY</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">{journey.name}</h1>
            <p className="text-green-100 text-lg">{journey.description}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold mb-1">{progressData.totalEnrolled}</div>
            <div className="text-green-200">Enrolled Participants</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                    selectedTab === tab.id
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {selectedTab === 'overview' && renderOverviewTab()}
          {selectedTab === 'participants' && renderParticipantsTab()}
          {selectedTab === 'modules' && renderModulesTab()}
          {selectedTab === 'analytics' && renderAnalyticsTab()}
        </div>
      </div>
    </div>
  );
}