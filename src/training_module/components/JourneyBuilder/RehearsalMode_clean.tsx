import React, { useState, useEffect } from 'react';
import { Play, Pause, CheckCircle, AlertTriangle, MessageSquare, Star, ArrowLeft, Users, Rocket, BarChart3 } from 'lucide-react';
import { TrainingJourney, TrainingModule, RehearsalFeedback } from '../../types';
import { TrainingMethodology } from '../../types/methodology';
import SlideViewer from '../Training/SlideViewer';
import QuizGenerator from '../Assessment/QuizGenerator';

interface RehearsalModeProps {
  journey: TrainingJourney;
  modules: TrainingModule[];
  methodology?: TrainingMethodology;
  onComplete: (feedback: RehearsalFeedback[], rating: number) => void;
  onBack: () => void;
}

export default function RehearsalMode({ journey, modules, methodology, onComplete, onBack }: RehearsalModeProps) {
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [completedModules, setCompletedModules] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<RehearsalFeedback[]>([]);
  const [overallRating, setOverallRating] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [rehearsalTime, setRehearsalTime] = useState(0);
  const [activeTab, setActiveTab] = useState<'content' | 'quiz'>('content');

  const currentModule = modules[currentModuleIndex];
  const progress = (completedModules.length / modules.length) * 100;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setRehearsalTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleContentComplete = () => {
    alert('🎉 All content completed! Great job!');
    onComplete(feedback, overallRating);
  };

  const handleModuleComplete = () => {
    if (currentModule && !completedModules.includes(currentModule.id)) {
      setCompletedModules(prev => [...prev, currentModule.id]);
    }
    
    if (currentModuleIndex < modules.length - 1) {
      setCurrentModuleIndex(prev => prev + 1);
    }
  };

  const handlePreviousModule = () => {
    if (currentModuleIndex > 0) {
      setCurrentModuleIndex(prev => prev - 1);
    }
  };

  const handleNextModule = () => {
    if (currentModuleIndex < modules.length - 1) {
      setCurrentModuleIndex(prev => prev + 1);
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-500 text-white';
      case 'intermediate':
        return 'bg-yellow-500 text-gray-900';
      case 'advanced':
        return 'bg-red-500 text-white';
      default:
        return 'bg-blue-500 text-white';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center space-x-4 mb-2">
                  <button
                    onClick={onBack}
                    className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5" />
                    <span>Back</span>
                  </button>
                  <h1 className="text-3xl font-bold text-gray-900">{journey.name}</h1>
                </div>
                <p className="text-gray-600 ml-24">Review and refine your training content</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-sm text-gray-600">Rehearsal Time</div>
                  <div className="text-2xl font-bold text-indigo-600">{formatTime(rehearsalTime)}</div>
                </div>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                    isPlaying
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="h-5 w-5" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5" />
                      <span>Start</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Overall Progress</span>
                <span className="font-semibold">{Math.round(progress)}% Complete</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Content Area */}
            <div className="lg:col-span-3 space-y-8">
              {/* Current Module Content */}
              {currentModule && (
                <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">{currentModule.title}</h2>
                      <p className="text-gray-600">{currentModule.description}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-bold uppercase ${getDifficultyColor(currentModule.difficulty)}`}>
                        {currentModule.difficulty || 'intermediate'}
                      </span>
                    </div>
                  </div>

                  {/* Tab Navigation */}
                  <div className="mb-6">
                    <div className="flex gap-2 border-b border-gray-200">
                      <button
                        onClick={() => setActiveTab('content')}
                        className={`px-6 py-3 font-medium transition-colors ${
                          activeTab === 'content'
                            ? 'text-indigo-600 border-b-2 border-indigo-600'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        📖 Content
                      </button>
                      <button
                        onClick={() => setActiveTab('quiz')}
                        className={`px-6 py-3 font-medium transition-colors ${
                          activeTab === 'quiz'
                            ? 'text-indigo-600 border-b-2 border-indigo-600'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        ❓ Quiz
                      </button>
                    </div>
                  </div>

                  {/* Content based on active tab */}
                  <div className="mb-6">
                    {activeTab === 'quiz' ? (
                      <QuizGenerator
                        moduleTitle={currentModule.title}
                        moduleDescription={currentModule.description}
                        moduleContent={currentModule.content.map(c => c.title).join('. ')}
                      />
                    ) : (
                      <SlideViewer 
                        modules={modules}
                        onComplete={handleContentComplete}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Module List */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-indigo-600" />
                  Training Modules
                </h3>
                <div className="space-y-2">
                  {modules.map((module, index) => (
                    <button
                      key={module.id}
                      onClick={() => setCurrentModuleIndex(index)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                        currentModuleIndex === index
                          ? 'bg-indigo-100 text-indigo-900 font-medium'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex-1">{module.title}</span>
                        {completedModules.includes(module.id) && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{module.duration} min</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Stats</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Modules</span>
                    <span className="font-bold text-gray-900">{modules.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Completed</span>
                    <span className="font-bold text-green-600">{completedModules.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Duration</span>
                    <span className="font-bold text-gray-900">
                      {modules.reduce((sum, m) => sum + m.duration, 0)} min
                    </span>
                  </div>
                </div>
              </div>

              {/* Launch Button */}
              <button
                onClick={() => onComplete(feedback, overallRating || 5)}
                className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg font-bold text-lg transition-all shadow-xl hover:shadow-2xl"
              >
                <Rocket className="h-6 w-6" />
                <span>Launch Training</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

