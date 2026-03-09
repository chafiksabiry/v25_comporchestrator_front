import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Award, 
  Target, 
  Brain, 
  CheckCircle, 
  Star,
  Calendar,
  Eye,
  ArrowLeft,
  Zap,
  BookOpen,
  Users,
  Globe,
  Shield,
  AlertTriangle,
  Lightbulb,
  MessageSquare
} from 'lucide-react';
import { TrainingJourney, TrainingModule, Rep } from '../../types';
import { TrainingMethodology } from '../../types/methodology';

interface TraineeProgressDashboardProps {
  trainee: Rep;
  journey: TrainingJourney;
  modules: TrainingModule[];
  methodology?: TrainingMethodology;
  progress: {
    overallProgress: number;
    completedModules: number;
    currentStreak: number;
    totalTimeSpent: number;
    averageScore: number;
    engagementLevel: number;
    nextDeadline: string;
    certificationsEarned: number;
    skillsAcquired: string[];
  };
  onBack: () => void;
}

export default function TraineeProgressDashboard({ 
  trainee, 
  journey, 
  modules, 
  methodology, 
  progress, 
  onBack 
}: TraineeProgressDashboardProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState('week');

  const timeframes = [
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'all', label: 'All Time' }
  ];

  const completedModules = modules.filter(m => m.completed);
  const inProgressModules = modules.filter(m => m.progress > 0 && !m.completed);
  const upcomingModules = modules.filter(m => m.progress === 0);

  const weeklyProgress = [
    { day: 'Mon', progress: 15, engagement: 85 },
    { day: 'Tue', progress: 25, engagement: 92 },
    { day: 'Wed', progress: 10, engagement: 78 },
    { day: 'Thu', progress: 30, engagement: 95 },
    { day: 'Fri', progress: 20, engagement: 88 },
    { day: 'Sat', progress: 5, engagement: 70 },
    { day: 'Sun', progress: 0, engagement: 0 }
  ];

  const skillProgress = [
    { skill: 'Customer Service', current: 85, target: 90, improvement: '+15%' },
    { skill: 'Product Knowledge', current: 78, target: 85, improvement: '+22%' },
    { skill: 'Communication', current: 92, target: 95, improvement: '+8%' },
    { skill: 'Problem Solving', current: 70, target: 80, improvement: '+25%' }
  ];

  const achievements = [
    { 
      id: 1, 
      title: 'Fast Learner', 
      description: 'Completed first module in record time', 
      icon: Zap, 
      color: 'text-yellow-600 bg-yellow-100',
      earned: true,
      date: '2024-01-20'
    },
    { 
      id: 2, 
      title: 'Perfect Score', 
      description: 'Scored 100% on an assessment', 
      icon: Award, 
      color: 'text-purple-600 bg-purple-100',
      earned: true,
      date: '2024-01-22'
    },
    { 
      id: 3, 
      title: 'Engagement Master', 
      description: 'Maintained 90%+ engagement for a week', 
      icon: TrendingUp, 
      color: 'text-green-600 bg-green-100',
      earned: false,
      progress: 85
    },
    { 
      id: 4, 
      title: 'Knowledge Expert', 
      description: 'Complete all modules with 85%+ scores', 
      icon: Brain, 
      color: 'text-blue-600 bg-blue-100',
      earned: false,
      progress: 60
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Your Learning Analytics</h1>
                <p className="text-gray-600">Track your progress and achievements</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {timeframes.map((timeframe) => (
                <button
                  key={timeframe.value}
                  onClick={() => setSelectedTimeframe(timeframe.value)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    selectedTimeframe === timeframe.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200'
                  }`}
                >
                  {timeframe.label}
                </button>
              ))}
            </div>
          </div>

          {/* Progress Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{progress.overallProgress}%</div>
              <div className="text-sm text-gray-600">Overall Progress</div>
              <div className="text-xs text-green-600 mt-1">↑ +12% this week</div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{progress.completedModules}</div>
              <div className="text-sm text-gray-600">Modules Completed</div>
              <div className="text-xs text-blue-600 mt-1">{modules.length - progress.completedModules} remaining</div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Award className="h-6 w-6 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{progress.averageScore}%</div>
              <div className="text-sm text-gray-600">Average Score</div>
              <div className="text-xs text-green-600 mt-1">Above target (80%)</div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{Math.round(progress.totalTimeSpent / 60)}h</div>
              <div className="text-sm text-gray-600">Time Invested</div>
              <div className="text-xs text-blue-600 mt-1">{progress.totalTimeSpent % 60}m this session</div>
            </div>
          </div>

          {/* Weekly Progress Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Weekly Learning Activity</h3>
              <div className="space-y-4">
                {weeklyProgress.map((day) => (
                  <div key={day.day} className="flex items-center space-x-4">
                    <div className="w-12 text-sm font-medium text-gray-600">{day.day}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-600">Progress</span>
                        <span className="text-sm font-medium">{day.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${day.progress}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-16 text-right">
                      <div className="text-sm font-medium text-gray-900">{day.engagement}%</div>
                      <div className="text-xs text-gray-500">Engagement</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Skill Development</h3>
              <div className="space-y-4">
                {skillProgress.map((skill) => (
                  <div key={skill.skill}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{skill.skill}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-green-600 font-medium">{skill.improvement}</span>
                        <span className="text-sm text-gray-600">{skill.current}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-green-400 to-green-500 h-3 rounded-full relative"
                        style={{ width: `${(skill.current / skill.target) * 100}%` }}
                      >
                        <div className="absolute right-0 top-0 h-3 w-1 bg-green-600 rounded-r-full"></div>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Current: {skill.current}%</span>
                      <span>Target: {skill.target}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Achievements & Methodology Progress */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Achievements & Badges</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {achievements.map((achievement) => {
                  const Icon = achievement.icon;
                  return (
                    <div
                      key={achievement.id}
                      className={`p-4 rounded-xl border-2 ${
                        achievement.earned 
                          ? 'border-green-200 bg-green-50' 
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3 mb-2">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          achievement.earned ? achievement.color : 'bg-gray-200 text-gray-400'
                        }`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className={`font-semibold ${
                            achievement.earned ? 'text-gray-900' : 'text-gray-500'
                          }`}>
                            {achievement.title}
                          </div>
                          {achievement.earned && (
                            <div className="text-xs text-green-600">
                              Earned {achievement.date}
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{achievement.description}</p>
                      
                      {!achievement.earned && achievement.progress && (
                        <div>
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Progress</span>
                            <span>{achievement.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${achievement.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Methodology Progress */}
            {methodology && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">360° Methodology Progress</h3>
                <div className="mb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Shield className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-gray-900">{methodology.name}</span>
                  </div>
                  <p className="text-sm text-gray-600">{methodology.description}</p>
                </div>

                <div className="space-y-3">
                  {methodology.components.slice(0, 6).map((component, index) => {
                    const isCompleted = index < progress.completedModules;
                    const isCurrent = index === progress.completedModules;
                    
                    return (
                      <div
                        key={component.id}
                        className={`p-3 rounded-lg border ${
                          isCompleted ? 'border-green-200 bg-green-50' :
                          isCurrent ? 'border-blue-200 bg-blue-50' :
                          'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isCompleted ? 'bg-green-500 text-white' :
                            isCurrent ? 'bg-blue-500 text-white' :
                            'bg-gray-300 text-gray-600'
                          }`}>
                            {isCompleted ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <span className="text-xs font-bold">{index + 1}</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 text-sm">{component.title}</div>
                            <div className="text-xs text-gray-600">
                              {component.estimatedDuration}h • {component.competencyLevel} level
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">
                            {component.weight}% weight
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {methodology.components.length > 6 && (
                    <div className="text-center text-sm text-gray-500">
                      +{methodology.components.length - 6} more components
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Learning Insights */}
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">AI Learning Insights</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-center space-x-3 mb-3">
                  <Lightbulb className="h-6 w-6 text-blue-600" />
                  <h4 className="font-semibold text-blue-900">Recommendation</h4>
                </div>
                <p className="text-blue-800 text-sm mb-3">
                  Your learning style shows strong visual preference. Consider using more infographics and video content.
                </p>
                <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  Apply Suggestion →
                </button>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <div className="flex items-center space-x-3 mb-3">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                  <h4 className="font-semibold text-green-900">Strength</h4>
                </div>
                <p className="text-green-800 text-sm mb-3">
                  Excellent performance in interactive modules. You learn best through hands-on practice.
                </p>
                <button className="text-green-600 hover:text-green-700 text-sm font-medium">
                  View Details →
                </button>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                <div className="flex items-center space-x-3 mb-3">
                  <Target className="h-6 w-6 text-amber-600" />
                  <h4 className="font-semibold text-amber-900">Focus Area</h4>
                </div>
                <p className="text-amber-800 text-sm mb-3">
                  Consider spending more time on theoretical concepts to balance practical skills.
                </p>
                <button className="text-amber-600 hover:text-amber-700 text-sm font-medium">
                  Get Resources →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}