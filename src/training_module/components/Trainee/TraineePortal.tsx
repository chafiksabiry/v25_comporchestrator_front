import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  BookOpen, 
  Play, 
  CheckCircle, 
  Clock, 
  Award, 
  Target, 
  BarChart3, 
  Brain, 
  Users, 
  Calendar,
  Video,
  Headphones,
  FileText,
  Zap,
  Star,
  TrendingUp,
  AlertTriangle,
  MessageSquare,
  Eye,
  Rocket,
  Shield,
  Globe,
  ArrowLeft
} from 'lucide-react';
import { TrainingJourney, TrainingModule, Rep, OnboardingStep, Assessment } from '../../types';
import { TrainingMethodology } from '../../types/methodology';
import TraineeModulePlayer from './TraineeModulePlayer';
import TraineeAssessmentView from './TraineeAssessmentView';
import TraineeProgressDashboard from './TraineeProgressDashboard';
import TraineeLiveSession from './TraineeLiveSession';
import { ProgressService, RepProgress } from '../../infrastructure/services/ProgressService';
import { getAgentId } from '../../utils/userUtils';
import { extractObjectId } from '../../lib/mongoUtils';

interface TraineePortalProps {
  trainee: Rep;
  journey: TrainingJourney;
  modules: TrainingModule[];
  methodology?: TrainingMethodology;
  onProgressUpdate: (moduleId: string, progress: number) => void;
  onModuleComplete: (moduleId: string) => void;
  onAssessmentComplete: (assessmentId: string, score: number) => void;
  onBack: () => void;
  availableJourneys?: TrainingJourney[];
  onJourneyChange?: (journeyId: string) => void;
}

export default function TraineePortal({ 
  trainee, 
  journey, 
  modules, 
  methodology,
  onProgressUpdate, 
  onModuleComplete, 
  onAssessmentComplete,
  onBack,
  availableJourneys,
  onJourneyChange
}: TraineePortalProps) {
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedModule, setSelectedModule] = useState<TrainingModule | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [repProgressData, setRepProgressData] = useState<RepProgress | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(true);
  
  // Get agentId (repId)
  const agentId = getAgentId();
  const journeyId = journey.id || journey._id;

  // Load progress from backend
  useEffect(() => {
    const loadProgress = async () => {
      if (!agentId || !journeyId) {
        setLoadingProgress(false);
        return;
      }

      try {
        setLoadingProgress(true);
        let progress = await ProgressService.getRepProgress(agentId, journeyId);
        
        // If no progress exists, initialize it
        if (!progress) {
          console.log('[TraineePortal] No progress found, initializing...');
          progress = await ProgressService.initializeRepProgress(agentId, journeyId);
        }
        
        setRepProgressData(progress);
      } catch (error) {
        console.error('Error loading progress:', error);
      } finally {
        setLoadingProgress(false);
      }
    };

    loadProgress();
  }, [agentId, journeyId]);

  // Reload progress when returning to dashboard view
  useEffect(() => {
    if (activeView === 'dashboard' && agentId && journeyId) {
      const reloadProgress = async () => {
        try {
          const progress = await ProgressService.getRepProgress(agentId, journeyId);
          if (progress) {
            console.log('[TraineePortal] Progress reloaded when returning to dashboard:', {
              modules: progress.modules,
              moduleFinished: progress.moduleFinished,
              moduleInProgress: progress.moduleInProgress
            });
            setRepProgressData(progress);
          }
        } catch (error) {
          console.error('Error reloading progress:', error);
        }
      };
      reloadProgress();
    }
  }, [activeView, agentId, journeyId]);

  // Calculate progress from backend data or fallback to modules
  const completedModules = repProgressData 
    ? repProgressData.moduleFinished 
    : modules.filter(m => m.completed).length;
  
  const overallProgress = repProgressData && repProgressData.modules
    ? Math.round(
        Object.values(repProgressData.modules).reduce((sum, mp) => sum + mp.progress, 0) / 
        Object.keys(repProgressData.modules).length
      )
    : modules.length > 0 
      ? Math.round((modules.reduce((sum, m) => sum + m.progress, 0) / modules.length))
      : 0;

  // Calculate average score from modules
  const averageScore = repProgressData && repProgressData.modules
    ? Math.round(
        Object.values(repProgressData.modules)
          .filter(mp => mp.score !== undefined && mp.score !== null)
          .reduce((sum, mp) => sum + (mp.score || 0), 0) /
        Object.values(repProgressData.modules).filter(mp => mp.score !== undefined && mp.score !== null).length
      ) || 0
    : 87; // Default fallback

  const [traineeProgress, setTraineeProgress] = useState({
    overallProgress: overallProgress,
    completedModules: completedModules,
    currentStreak: 5,
    totalTimeSpent: repProgressData?.timeSpent || 0,
    averageScore: averageScore,
    engagementLevel: repProgressData?.engagementScore || 0,
    nextDeadline: '2024-01-28',
    certificationsEarned: completedModules > 0 ? 1 : 0,
    skillsAcquired: ['Customer Service', 'Product Knowledge']
  });

  // Update progress when backend data changes
  useEffect(() => {
    if (repProgressData) {
      const completed = repProgressData.moduleFinished;
      const overall = repProgressData.modules && Object.keys(repProgressData.modules).length > 0
        ? Math.round(
            Object.values(repProgressData.modules).reduce((sum, mp) => sum + mp.progress, 0) / 
            Object.keys(repProgressData.modules).length
          )
        : 0;
      
      const avgScore = repProgressData.modules && Object.keys(repProgressData.modules).length > 0
        ? Math.round(
            Object.values(repProgressData.modules)
              .filter(mp => mp.score !== undefined && mp.score !== null)
              .reduce((sum, mp) => sum + (mp.score || 0), 0) /
            Object.values(repProgressData.modules).filter(mp => mp.score !== undefined && mp.score !== null).length
          ) || 0
        : 0;

      setTraineeProgress(prev => ({
        ...prev,
        overallProgress: overall,
        completedModules: completed,
        totalTimeSpent: repProgressData.timeSpent || 0,
        averageScore: avgScore,
        engagementLevel: repProgressData.engagementScore || 0,
        certificationsEarned: completed > 0 ? 1 : 0
      }));
    }
  }, [repProgressData]);

  // Find current module (in progress or first not started)
  const currentModule = useMemo(() => {
    if (!repProgressData || !repProgressData.modules || Object.keys(repProgressData.modules).length === 0) {
      return modules.find(m => !m.completed && m.progress > 0) || modules.find(m => !m.completed) || null;
    }

    // Find first module that's in progress
    for (let index = 0; index < modules.length; index++) {
      const module = modules[index];
      const moduleId = extractObjectId((module as any)._id) || extractObjectId(module.id);
      if (!moduleId || !/^[0-9a-fA-F]{24}$/.test(moduleId)) continue;
      const moduleProgress = repProgressData.modules[moduleId];
      
      if (moduleProgress && moduleProgress.status === 'in-progress') {
        return { ...module, progress: moduleProgress.progress, completed: false };
      }
    }

    // If no in-progress, find first not-started
    for (let index = 0; index < modules.length; index++) {
      const module = modules[index];
      const moduleId = extractObjectId((module as any)._id) || extractObjectId(module.id);
      if (!moduleId || !/^[0-9a-fA-F]{24}$/.test(moduleId)) continue;
      const moduleProgress = repProgressData.modules[moduleId];
      
      if (!moduleProgress || moduleProgress.status === 'not-started') {
        return { ...module, progress: 0, completed: false };
      }
    }

    return null;
  }, [modules, repProgressData]);

  // Helper function to get quiz questions from module (supports both assessments and quizzes)
  const getModuleQuizQuestions = useCallback((module: TrainingModule): any[] => {
    const moduleAny = module as any;
    // Check quizzes first (new structure)
    if (moduleAny.quizzes && Array.isArray(moduleAny.quizzes) && moduleAny.quizzes.length > 0) {
      const firstQuiz = moduleAny.quizzes[0];
      if (firstQuiz && firstQuiz.questions && Array.isArray(firstQuiz.questions)) {
        return firstQuiz.questions;
      }
    }
    // Fallback to assessments (old structure)
    if (module.assessments && Array.isArray(module.assessments) && module.assessments.length > 0) {
      const firstAssessment = module.assessments[0];
      if (firstAssessment && firstAssessment.questions && Array.isArray(firstAssessment.questions)) {
        return firstAssessment.questions;
      }
    }
    return [];
  }, []);

  // Check if a module can be accessed (previous module quiz passed)
  const canAccessModule = useCallback((moduleIndex: number): boolean => {
    // First module is always accessible
    if (moduleIndex === 0) return true;
    
    // If progress data is not loaded yet, don't block access (will be checked again when data loads)
    if (!repProgressData || !repProgressData.modules) {
      console.log(`[TraineePortal] Progress data not loaded yet for module ${moduleIndex}, allowing access temporarily`);
      return true;
    }
    
    // Check all previous modules
    for (let i = 0; i < moduleIndex; i++) {
      const prevModule = modules[i];
      if (!prevModule) continue;
      
      const prevModuleId = extractObjectId((prevModule as any)._id) || extractObjectId(prevModule.id);
      if (!prevModuleId || !/^[0-9a-fA-F]{24}$/.test(prevModuleId)) continue;
      
      const prevModuleProgress = repProgressData.modules[prevModuleId];
      
      // Debug log
      console.log(`[TraineePortal] Checking module ${i} (${prevModuleId}) for access to module ${moduleIndex}:`, {
        hasProgress: !!prevModuleProgress,
        status: prevModuleProgress?.status,
        progress: prevModuleProgress?.progress,
        quizz: prevModuleProgress?.quizz,
        quizzKeys: prevModuleProgress?.quizz ? Object.keys(prevModuleProgress.quizz) : []
      });
      
      // Check if previous module is completed
      const isCompleted = prevModuleProgress 
        ? (prevModuleProgress.status === 'completed' || prevModuleProgress.status === 'finished')
        : prevModule.completed;
      
      // Check if previous module has quizzes
      const quizQuestions = getModuleQuizQuestions(prevModule);
      const hasQuizzes = quizQuestions.length > 0;
      
      // If module has quizzes, verify that all quizzes are passed in the quizz field
      if (hasQuizzes) {
        if (!isCompleted) {
          console.log(`[TraineePortal] Module ${i} (${prevModuleId}) has quizzes but is not completed (status: ${prevModuleProgress?.status}). Cannot access module ${moduleIndex}.`);
          return false;
        }
        
        // Verify that quizzes are passed in the quizz field
        const moduleQuizz = prevModuleProgress?.quizz || {};
        const moduleQuizzes = (prevModule as any).quizzes || [];
        const moduleAssessments = (prevModule as any).assessments || [];
        
        // Check if all quizzes have passed results
        let allQuizzesPassed = true;
        
        // If module has quizzes array, check each quiz
        if (moduleQuizzes.length > 0) {
          for (const quiz of moduleQuizzes) {
            const quizId = extractObjectId(quiz._id) || extractObjectId(quiz.id);
            if (!quizId) continue;
            
            const quizResult = moduleQuizz[quizId];
            if (!quizResult || !quizResult.passed) {
              console.log(`[TraineePortal] Module ${i} (${prevModuleId}) quiz ${quizId} not passed (result: ${JSON.stringify(quizResult)}). Cannot access module ${moduleIndex}.`);
              allQuizzesPassed = false;
              break;
            }
          }
        } 
        // If module has assessments instead, check if any quiz result exists and is passed
        else if (moduleAssessments.length > 0 || quizQuestions.length > 0) {
          // Quizzes are in assessments or questions, check if quizz field has any passed results
          const quizzKeys = Object.keys(moduleQuizz);
          if (quizzKeys.length === 0) {
            console.log(`[TraineePortal] Module ${i} (${prevModuleId}) has quizzes but no quiz results in quizz field. Cannot access module ${moduleIndex}.`);
            return false;
          }
          // Check if at least one quiz result is passed
          allQuizzesPassed = quizzKeys.some(key => moduleQuizz[key]?.passed === true);
          if (!allQuizzesPassed) {
            console.log(`[TraineePortal] Module ${i} (${prevModuleId}) has quiz results but none are passed. Cannot access module ${moduleIndex}.`, {
              quizzKeys,
              results: quizzKeys.map(key => ({ key, result: moduleQuizz[key] }))
            });
            return false;
          }
        }
        
        if (!allQuizzesPassed) {
          return false;
        }
      } else {
        // If module has no quizzes, it just needs to be completed
        if (!isCompleted) {
          console.log(`[TraineePortal] Module ${i} (${prevModuleId}) is not completed (status: ${prevModuleProgress?.status}). Cannot access module ${moduleIndex}.`);
          return false;
        }
      }
    }
    
    return true;
  }, [modules, repProgressData, getModuleQuizQuestions]);

  const handleModuleSelect = (module: TrainingModule) => {
    // Find module index for ID normalization
    const moduleIndex = modules.findIndex(m => {
      const mId = extractObjectId((m as any)._id) || extractObjectId(m.id);
      const moduleId = extractObjectId((module as any)._id) || extractObjectId(module.id);
      return mId === moduleId || m === module;
    });
    
    // Check if module can be accessed
    if (moduleIndex !== -1 && !canAccessModule(moduleIndex)) {
      alert('⚠️ Vous devez compléter le module précédent et passer son quiz avant d\'accéder à ce module.');
      return;
    }
    
    setSelectedModule({ ...module, moduleIndex: moduleIndex !== -1 ? moduleIndex : undefined } as any);
    setActiveView('module');
  };

  const handleNextModule = () => {
    if (!selectedModule) return;
    
    const currentIndex = modules.findIndex(m => {
      const mId = extractObjectId((m as any)._id) || extractObjectId(m.id);
      const moduleId = extractObjectId((selectedModule as any)._id) || extractObjectId(selectedModule.id);
      return mId === moduleId && mId && /^[0-9a-fA-F]{24}$/.test(mId);
    });
    
    if (currentIndex !== -1 && currentIndex < modules.length - 1) {
      const nextModule = modules[currentIndex + 1];
      if (nextModule && canAccessModule(currentIndex + 1)) {
        handleModuleSelect(nextModule);
      } else {
        alert('⚠️ Le module suivant n\'est pas encore accessible. Vous devez compléter le module actuel et passer son quiz.');
      }
    } else {
      // Last module completed
      handleBackToDashboard();
    }
  };

  const handleAssessmentSelect = (assessment: Assessment) => {
    setSelectedAssessment(assessment);
    setActiveView('assessment');
  };

  const handleBackToDashboard = () => {
    setSelectedModule(null);
    setSelectedAssessment(null);
    setActiveView('dashboard');
  };

  const getModuleStatusIcon = (module: TrainingModule) => {
    if (module.completed) return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (module.progress > 0) return <Play className="h-5 w-5 text-blue-500" />;
    return <Clock className="h-5 w-5 text-gray-400" />;
  };

  const getModuleStatusColor = (module: TrainingModule) => {
    if (module.completed) return 'border-green-200 bg-green-50';
    if (module.progress > 0) return 'border-blue-200 bg-blue-50';
    return 'border-gray-200 bg-white';
  };

  const renderDashboard = () => (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome back, {trainee.name}! 👋</h1>
            <p className="text-blue-100 text-lg mb-4">{journey.name}</p>
            {methodology && (
              <div className="flex items-center space-x-2 bg-white bg-opacity-20 rounded-full px-4 py-2 w-fit">
                <Shield className="h-4 w-4" />
                <span className="text-sm font-medium">{methodology.name} • 360° Methodology</span>
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold mb-1">{traineeProgress.overallProgress}%</div>
            <div className="text-blue-200">Overall Progress</div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">{traineeProgress.completedModules}</div>
          <div className="text-sm text-gray-600">Modules Completed</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Target className="h-6 w-6 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">{traineeProgress.averageScore}%</div>
          <div className="text-sm text-gray-600">Average Score</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <TrendingUp className="h-6 w-6 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">{traineeProgress.currentStreak}</div>
          <div className="text-sm text-gray-600">Day Streak</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Award className="h-6 w-6 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">{traineeProgress.certificationsEarned}</div>
          <div className="text-sm text-gray-600">Certifications</div>
        </div>
      </div>

      {/* Current Module Focus */}
      {currentModule && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Continue Your Learning</h2>
              <p className="text-gray-600">Pick up where you left off</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600 mb-1">{currentModule.progress}%</div>
              <div className="text-sm text-gray-600">Module Progress</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <BookOpen className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{currentModule.title}</h3>
                  <p className="text-gray-600">{currentModule.description}</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Progress</span>
                  <span className="text-sm text-gray-600">{currentModule.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${currentModule.progress}%` }}
                  />
                </div>
              </div>

              <button
                onClick={() => handleModuleSelect(currentModule)}
                className="w-full flex items-center justify-center space-x-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg font-semibold"
              >
                <Play className="h-5 w-5" />
                <span>{currentModule.progress > 0 ? 'Continue Learning' : 'Start Module'}</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-900">Duration</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">{currentModule.duration}</div>
              </div>

              <div className="bg-green-50 rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Target className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-900">Difficulty</span>
                </div>
                <div className="text-lg font-bold text-green-600 capitalize">{currentModule.difficulty}</div>
              </div>

              <div className="bg-purple-50 rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Zap className="h-4 w-4 text-purple-600" />
                  <span className="font-medium text-purple-900">Type</span>
                </div>
                <div className="text-lg font-bold text-purple-600 capitalize">{currentModule.type}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Training Journey Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Your Training Journey</h2>
            
            <div className="space-y-4">
              {modules.map((module, index) => {
                // Modules MUST have a MongoDB ObjectId _id
                const moduleId = extractObjectId((module as any)._id) || extractObjectId(module.id);
                if (!moduleId || !/^[0-9a-fA-F]{24}$/.test(moduleId)) {
                  console.error(`[TraineePortal] Module at index ${index} does not have a valid MongoDB ObjectId _id:`, module);
                  return null; // Skip invalid modules
                }
                const moduleProgress = repProgressData?.modules?.[moduleId];
                const moduleProgressValue = moduleProgress?.progress ?? module.progress ?? 0;
                const moduleCompleted = moduleProgress 
                  ? (moduleProgress.status === 'completed' || moduleProgress.status === 'finished' || moduleProgress.progress >= 100)
                  : module.completed;
                const moduleInProgress = moduleProgress?.status === 'in-progress';
                const canAccess = canAccessModule(index);
                
                return (
                  <div
                    key={module.id}
                    className={`border-2 rounded-xl p-6 transition-all ${
                      canAccess 
                        ? 'hover:shadow-md cursor-pointer' 
                        : 'opacity-50 cursor-not-allowed bg-gray-100'
                    } ${getModuleStatusColor({ ...module, completed: moduleCompleted, progress: moduleProgressValue })}`}
                    onClick={() => {
                      if (canAccess) {
                        handleModuleSelect({ ...module, progress: moduleProgressValue, completed: moduleCompleted });
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            moduleCompleted ? 'bg-green-500 text-white' :
                            moduleProgressValue > 0 ? 'bg-blue-500 text-white' :
                            'bg-gray-200 text-gray-600'
                          }`}>
                            {moduleCompleted ? (
                              <CheckCircle className="h-5 w-5" />
                            ) : (
                              <span className="font-bold">{index + 1}</span>
                            )}
                          </div>
                          {getModuleStatusIcon({ ...module, completed: moduleCompleted, progress: moduleProgressValue })}
                        </div>
                        
                        <div className="flex-1">
                          <h3 className={`text-lg font-semibold ${canAccess ? 'text-gray-900' : 'text-gray-400'}`}>{module.title}</h3>
                          <p className={`text-sm ${canAccess ? 'text-gray-600' : 'text-gray-400'}`}>{module.description}</p>
                          {!canAccess && (
                            <p className="text-xs text-orange-600 mt-1 flex items-center space-x-1">
                              <AlertTriangle className="h-3 w-3" />
                              <span>Complétez le module précédent et passez son quiz pour débloquer</span>
                            </p>
                          )}
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <span className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{module.duration}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Target className="h-3 w-3" />
                              <span className="capitalize">{module.difficulty}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              {module.type === 'video' && <Video className="h-3 w-3" />}
                              {module.type === 'interactive' && <Zap className="h-3 w-3" />}
                              {module.type === 'ai-tutor' && <Brain className="h-3 w-3" />}
                              <span className="capitalize">{module.type}</span>
                            </span>
                            {moduleProgress && (
                              <span className="flex items-center space-x-1">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  moduleCompleted ? 'bg-green-100 text-green-700' :
                                  moduleInProgress ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {moduleProgress.status === 'completed' || moduleProgress.status === 'finished' ? 'Completed' :
                                   moduleProgress.status === 'in-progress' ? 'In Progress' : 'Not Started'}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900 mb-1">{moduleProgressValue}%</div>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              moduleCompleted ? 'bg-green-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${moduleProgressValue}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Alert message if module is in-progress with quizzes */}
                    {moduleInProgress && moduleProgress && (() => {
                      const quizQuestions = getModuleQuizQuestions(module);
                      const hasQuizzes = quizQuestions.length > 0;
                      const moduleQuizz = moduleProgress.quizz || {};
                      
                      // Check if module has quizzes that are not passed
                      let hasUnpassedQuizzes = false;
                      if (hasQuizzes) {
                        const moduleQuizzes = (module as any).quizzes || [];
                        for (const quiz of moduleQuizzes) {
                          const quizId = extractObjectId(quiz._id) || extractObjectId(quiz.id);
                          if (!quizId) continue;
                          const quizResult = moduleQuizz[quizId];
                          if (!quizResult || !quizResult.passed) {
                            hasUnpassedQuizzes = true;
                            break;
                          }
                        }
                      }
                      
                      // Show alert if module has quizzes and they're not all passed
                      if (hasQuizzes && hasUnpassedQuizzes) {
                        const moduleQuizzes = (module as any).quizzes || [];
                        const firstQuiz = moduleQuizzes.length > 0 ? moduleQuizzes[0] : null;
                        const passingScore = firstQuiz?.passingScore || 70;
                        
                        return (
                          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="flex items-start space-x-2">
                              <span className="text-yellow-600 text-lg">⚠️</span>
                              <div className="flex-1">
                                <p className="text-sm text-yellow-800 font-medium">
                                  Module en cours
                                </p>
                                <p className="text-xs text-yellow-700 mt-1">
                                  Vous devez réussir le quiz de ce module avec un score minimum de {passingScore}% pour passer au module suivant.
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Module Topics Preview */}
                    {Array.isArray(module.topics) && module.topics.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex flex-wrap gap-2">
                          {module.topics.slice(0, 4).map((topic, topicIndex) => (
                            <span
                              key={topicIndex}
                              className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                            >
                              {topic}
                            </span>
                          ))}
                          {module.topics.length > 4 && (
                            <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                              +{module.topics.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Next Steps */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Next Steps</h3>
            <div className="space-y-3">
              {modules
                .filter(m => !m.completed)
                .slice(0, 3)
                .map((module, index) => (
                  <div key={module.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 text-sm">{module.title}</div>
                      <div className="text-xs text-gray-600">{module.duration}</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Achievements */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Achievements</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                <Award className="h-6 w-6 text-green-600" />
                <div>
                  <div className="font-medium text-green-900 text-sm">Module Master</div>
                  <div className="text-xs text-green-700">Completed 2 modules</div>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600" />
                <div>
                  <div className="font-medium text-blue-900 text-sm">High Performer</div>
                  <div className="text-xs text-blue-700">87% average score</div>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
                <Brain className="h-6 w-6 text-purple-600" />
                <div>
                  <div className="font-medium text-purple-900 text-sm">AI Learner</div>
                  <div className="text-xs text-purple-700">92% engagement</div>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Deadlines */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Deadlines</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <Calendar className="h-5 w-5 text-amber-600" />
                <div>
                  <div className="font-medium text-amber-900 text-sm">Final Assessment</div>
                  <div className="text-xs text-amber-700">Due: {traineeProgress.nextDeadline}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Methodology Components (if applicable) */}
      {methodology && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">🎯 Your 360° Training Methodology</h2>
            <p className="text-gray-600">{methodology.description}</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {methodology && Array.isArray(methodology.components) && methodology.components.length > 0 ? (
              methodology.components.slice(0, 8).map((component, index) => (
                <div key={component.id} className="bg-white rounded-xl p-4 text-center shadow-sm">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 ${
                  index < traineeProgress.completedModules ? 'bg-green-500 text-white' :
                  index === traineeProgress.completedModules ? 'bg-blue-500 text-white' :
                  'bg-gray-200 text-gray-600'
                }`}>
                  {index < traineeProgress.completedModules ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <span className="text-xs font-bold">{index + 1}</span>
                  )}
                </div>
                <div className="font-medium text-gray-900 text-sm">{component.title}</div>
                <div className="text-xs text-gray-600">{component.estimatedDuration}h</div>
                <div className="text-xs text-gray-500 capitalize">{component.competencyLevel}</div>
              </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 col-span-full text-center">No methodology components available</p>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderModuleView = () => {
    if (!selectedModule) return null;
    
    return (
      <TraineeModulePlayer
        module={selectedModule}
        trainee={trainee}
        journeyId={journeyId}
        moduleIndex={modules.findIndex(m => {
          const mId = extractObjectId((m as any)._id) || extractObjectId(m.id);
          const moduleId = extractObjectId((selectedModule as any)._id) || extractObjectId(selectedModule.id);
          return mId === moduleId && mId && /^[0-9a-fA-F]{24}$/.test(mId);
        })}
        onProgress={(progress) => {
          onProgressUpdate(selectedModule.id, progress);
          // Reload progress from backend after update
          if (agentId && journeyId) {
            ProgressService.getRepProgress(agentId, journeyId).then(setRepProgressData).catch(console.error);
          }
        }}
        onComplete={() => {
          onModuleComplete(selectedModule.id);
          // Reload progress from backend after completion
          if (agentId && journeyId) {
            ProgressService.getRepProgress(agentId, journeyId).then(setRepProgressData).catch(console.error);
          }
          handleBackToDashboard();
        }}
        onQuizComplete={async () => {
          // Reload progress from backend after quiz is saved
          console.log('[TraineePortal] Reloading progress after quiz completion');
          if (agentId && journeyId) {
            try {
              const progress = await ProgressService.getRepProgress(agentId, journeyId);
              if (progress) {
                console.log('[TraineePortal] Progress reloaded after quiz completion:', {
                  modules: progress.modules,
                  moduleFinished: progress.moduleFinished,
                  moduleInProgress: progress.moduleInProgress
                });
                setRepProgressData(progress);
              }
            } catch (error) {
              console.error('[TraineePortal] Error reloading progress after quiz completion:', error);
            }
          }
        }}
        onNextModule={handleNextModule}
        totalModules={modules.length}
        onBack={handleBackToDashboard}
      />
    );
  };

  const renderAssessmentView = () => {
    if (!selectedAssessment) return null;
    
    return (
      <TraineeAssessmentView
        assessment={selectedAssessment}
        trainee={trainee}
        onComplete={(score) => {
          onAssessmentComplete(selectedAssessment.id, score);
          setTraineeProgress(prev => ({ 
            ...prev, 
            averageScore: Math.round((prev.averageScore + score) / 2)
          }));
          handleBackToDashboard();
        }}
        onBack={handleBackToDashboard}
      />
    );
  };

  const renderProgressView = () => (
    <TraineeProgressDashboard
      trainee={trainee}
      journey={journey}
      modules={modules}
      methodology={methodology}
      progress={traineeProgress}
      onBack={handleBackToDashboard}
    />
  );

  const renderLiveSessionView = () => (
    <TraineeLiveSession
      trainee={trainee}
      onBack={handleBackToDashboard}
    />
  );

  // Main render logic
  switch (activeView) {
    case 'module':
      return renderModuleView();
    case 'assessment':
      return renderAssessmentView();
    case 'progress':
      return renderProgressView();
    case 'live-session':
      return renderLiveSessionView();
    default:
  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 to-blue-50 overflow-hidden flex flex-col">
      <div className="container mx-auto px-4 py-8 flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
              {/* Navigation */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-6">
                  {/* Journey Selector - Only show if multiple journeys available */}
                  {availableJourneys && availableJourneys.length > 1 && onJourneyChange && (
                    <select
                      value={journey.id}
                      onChange={(e) => onJourneyChange(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {availableJourneys.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.name}
                        </option>
                      ))}
                    </select>
                  )}
                  
                  <button
                    onClick={() => setActiveView('dashboard')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      activeView === 'dashboard' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <BarChart3 className="h-4 w-4" />
                    <span>Dashboard</span>
                  </button>
                  <button
                    onClick={onBack}
                    className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Retour aux Formations</span>
                  </button>
                  <button
                    onClick={() => setActiveView('progress')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      activeView === 'progress' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <TrendingUp className="h-4 w-4" />
                    <span>Progress</span>
                  </button>
                  <button
                    onClick={() => setActiveView('live-session')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      activeView === 'live-session' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Video className="h-4 w-4" />
                    <span>Live Sessions</span>
                  </button>
                </div>
                
                <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {trainee.name.charAt(0)}
                  </div>
                  <span className="font-medium text-gray-900">{trainee.name}</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-600 text-sm">{trainee.department}</span>
                </div>
              </div>

              {renderDashboard()}
            </div>
          </div>
        </div>
      );
  }
}