import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper';
import { useParams } from 'react-router-dom';
import { User, Sparkles, Zap, Upload, Wand2, Rocket, Eye, BookOpen, Play, CheckCircle } from 'lucide-react';
// import { useAuth } from './hooks/useAuth';
import JourneyBuilder from './components/JourneyBuilder/JourneyBuilder';
import { ManualTrainingSetup, ManualTrainingBuilder } from './components/ManualTraining';
import MethodologyBuilder from './components/Methodology/MethodologyBuilder';
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';
import ProgressOverview from './components/Dashboard/ProgressOverview';
import CurrentGig from './components/Dashboard/CurrentGig';
import OnboardingSteps from './components/Dashboard/OnboardingSteps';
import TrainingModules from './components/Training/TrainingModules';
import JourneyTraining from './components/Training/JourneyTraining';
import InteractiveModule from './components/Training/InteractiveModule';
import AssessmentCenter from './components/Assessment/AssessmentCenter';
import KnowledgeBase from './components/KnowledgeBase/KnowledgeBase';
import LiveSessions from './components/LiveSessions/LiveSessions';
import AITutor from './components/AI/AITutor';
import AIInsights from './components/AI/AIInsights';
import TrainerDashboard from './components/Trainer/TrainerDashboard';
import CompanyAnalytics from './components/Analytics/CompanyAnalytics';
import CurriculumBuilder from './components/CurriculumBuilder/CurriculumBuilder';
import LiveStreamStudio from './components/LiveStreaming/LiveStreamStudio';
import StreamingDashboard from './components/LiveStreaming/StreamingDashboard';
import CourseStreamingStudio from './components/LiveStreaming/CourseStreamingStudio';
import CourseStreamingDashboard from './components/LiveStreaming/CourseStreamingDashboard';
import CourseParticipantView from './components/LiveStreaming/CourseParticipantView';
import DocumentTransformer from './components/DocumentTransformer/DocumentTransformer';
import LaunchedJourneyDashboard from './components/Dashboard/LaunchedJourneyDashboard';
import JourneySuccess from './components/JourneyBuilder/JourneySuccess';
import TraineePortal from './components/Trainee/TraineePortal';
import { TrainingMethodology } from './types/methodology';
import {
  mockGig,
  mockTrainingModules,
  mockKnowledgeBase,
  mockLiveSessions,
  mockAIInsights,
  mockAITutor,
  mockCompanyAnalytics,
  mockCurriculumBuilder,
  mockLiveStreamSessions
} from './data/mockData';
import { useTrainingProgress } from './hooks/useTrainingProgress';
import { TrainingJourney, TrainingModule, Rep, LiveStreamSession, ChatMessage } from './types';
import { getCurrentUserName, getAgentId, getCurrentUserEmail, getUserType } from './utils/userUtils';
import { JourneyService } from './infrastructure/services/JourneyService';
import { TrainingService } from './infrastructure/services/TrainingService';
// TrainingModuleService no longer needed - using embedded structure
import Cookies from 'js-cookie';
import { extractObjectId } from './lib/mongoUtils';

export function AppContent({
  initialJourneyId,
  isEmbedded = false,
  startWithJourneyBuilder = false,
  startWithManualTraining = false,
  onJourneyLaunch
}: {
  initialJourneyId?: string,
  isEmbedded?: boolean,
  startWithJourneyBuilder?: boolean,
  startWithManualTraining?: boolean,
  onJourneyLaunch?: () => void
} = {}) {
  // Get journey ID from route params (inside Router context)
  const { idjourneytraining } = useParams<{ idjourneytraining?: string }>();
  const navigate = useNavigate();
  const journeyIdFromUrl = idjourneytraining;

  // Also try to extract from pathname as fallback
  const pathname = window.location.pathname;
  let journeyIdFromPathname: string | null = null;

  // Try to extract ID from pathname if not in params
  if (!journeyIdFromUrl && pathname) {
    // Pattern: /training/repdashboard/:id or /training/repdashboard/:id
    const match = pathname.match(/\/(?:repdashboard|repdashboard)\/([a-f0-9]{24})/i);
    if (match && match[1]) {
      journeyIdFromPathname = match[1];
    }
  }

  const finalJourneyId = journeyIdFromUrl || journeyIdFromPathname || initialJourneyId;

  console.log('[App] AppContent rendering:', {
    journeyIdFromUrl,
    journeyIdFromPathname,
    finalJourneyId,
    pathname,
    params: { idjourneytraining },
    allParams: useParams()
  });
  // const { user, signOut } = useAuth();
  const user = { name: 'User', email: 'user@example.com' }; // Mock user - no auth required
  const [activeTab, setActiveTab] = useState(isEmbedded ? 'training' : 'dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState<'trainee' | 'trainer' | 'admin'>('trainee');
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [showAITutor, setShowAITutor] = useState(false);
  const [showLiveStream, setShowLiveStream] = useState(false);
  const [selectedStreamSession, setSelectedStreamSession] = useState<string | null>(null);
  const [showCourseStreaming, setShowCourseStreaming] = useState(false);
  const [selectedCourseStream, setSelectedCourseStream] = useState<string | null>(null);
  const [showParticipantView, setShowParticipantView] = useState(false);
  const [showJourneyBuilder, setShowJourneyBuilder] = useState(startWithJourneyBuilder);
  const [showWelcome, setShowWelcome] = useState(!isEmbedded && !startWithJourneyBuilder && !startWithManualTraining);
  const [hasCompletedSetup, setHasCompletedSetup] = useState(isEmbedded || startWithJourneyBuilder || startWithManualTraining);
  const [launchedJourney, setLaunchedJourney] = useState<{
    journey: TrainingJourney;
    modules: TrainingModule[];
    enrolledReps: Rep[];
  } | null>(null);
  const [showJourneySuccess, setShowJourneySuccess] = useState(false);
  const [showLaunchedDashboard, setShowLaunchedDashboard] = useState(false);
  const [showTraineePortal, setShowTraineePortal] = useState(false);
  const [selectedTrainee, setSelectedTrainee] = useState<Rep | null>(null);
  const [showManualTraining, setShowManualTraining] = useState(startWithManualTraining);
  const [manualTrainingSetupComplete, setManualTrainingSetupComplete] = useState(false);
  const [manualTrainingSetupData, setManualTrainingSetupData] = useState<any>(null);
  const [realModules, setRealModules] = useState<TrainingModule[]>([]);
  const [realJourneys, setRealJourneys] = useState<any[]>([]);
  const [selectedJourney, setSelectedJourney] = useState<any | null>(null);
  const [selectedJourneyModules, setSelectedJourneyModules] = useState<TrainingModule[]>([]);
  const [loadingModules, setLoadingModules] = useState(false);

  // Trainee-specific state
  const [agentId, setAgentId] = useState<string | null>(initialJourneyId ? 'default' : null);
  const [traineeJourneys, setTraineeJourneys] = useState<any[]>([]);
  const [selectedTraineeJourney, setSelectedTraineeJourney] = useState<any | null>(null);
  const [loadingTraineeJourneys, setLoadingTraineeJourneys] = useState(false);
  const [userType, setUserType] = useState<'company' | 'rep' | null>(initialJourneyId ? 'rep' : null);
  const [checkingUserType, setCheckingUserType] = useState(initialJourneyId ? false : true);
  const [traineeProgressData, setTraineeProgressData] = useState<Record<string, any>>({});

  // Load specific journey by ID if provided in URL
  useEffect(() => {
    const loadJourneyById = async () => {
      // Use finalJourneyId instead of journeyIdFromUrl
      if (!finalJourneyId || !agentId || userType !== 'rep') {
        return;
      }

      try {
        console.log('[App] Loading journey by ID from URL:', finalJourneyId);

        // Try to get the journey from already loaded journeys first
        const existingJourney = realJourneys.find(j => {
          const jId = j.id || j._id;
          return jId === finalJourneyId || extractObjectId(jId) === extractObjectId(finalJourneyId);
        });

        if (existingJourney) {
          console.log('[App] Found journey in loaded journeys, selecting it');
          setSelectedTraineeJourney(existingJourney);

          // Load progress for this journey
          try {
            const progressData = await TrainingService.getRepProgress(agentId, finalJourneyId);
            if (progressData) {
              const progressArray = Array.isArray(progressData) ? progressData : [progressData];
              const progressMap: Record<string, any> = {};
              progressArray.forEach((p: any) => {
                if (p.moduleId) {
                  progressMap[p.moduleId] = p;
                }
              });
              setTraineeProgressData(prev => ({ ...prev, [finalJourneyId]: progressMap }));
            }
          } catch (error) {
            console.error('[App] Error loading progress:', error);
          }
        } else {
          // Journey not in loaded list, fetch it directly
          try {
            const journey = await JourneyService.getJourneyById(finalJourneyId);
            if (journey) {
              console.log('[App] Loaded journey by ID:', journey.title || journey.name);
              setSelectedTraineeJourney(journey);

              // Load progress
              try {
                const progressData = await TrainingService.getRepProgress(agentId, finalJourneyId);
                if (progressData) {
                  const progressArray = Array.isArray(progressData) ? progressData : [progressData];
                  const progressMap: Record<string, any> = {};
                  progressArray.forEach((p: any) => {
                    if (p.moduleId) {
                      progressMap[p.moduleId] = p;
                    }
                  });
                  setTraineeProgressData(prev => ({ ...prev, [finalJourneyId]: progressMap }));
                }
              } catch (error) {
                console.error('[App] Error loading progress:', error);
              }
            }
          } catch (error) {
            console.error('[App] Error loading journey by ID:', error);
          }
        }
      } catch (error) {
        console.error('[App] Error in loadJourneyById:', error);
      }
    };

    // Load journey if we have the ID, agentId, and userType is rep
    // Don't wait for realJourneys to be loaded - we can fetch the journey directly
    if (finalJourneyId && agentId && userType === 'rep') {
      console.log('[App] Conditions met for loading journey:', {
        finalJourneyId,
        agentId,
        userType,
        realJourneysCount: realJourneys.length
      });
      loadJourneyById();
    } else {
      console.log('[App] Conditions NOT met for loading journey:', {
        finalJourneyId,
        journeyIdFromUrl,
        journeyIdFromPathname,
        agentId,
        userType,
        hasJourneyId: !!finalJourneyId,
        hasAgentId: !!agentId,
        isRep: userType === 'rep'
      });
    }
  }, [finalJourneyId, agentId, userType, realJourneys]);

  // Load real training journeys and convert them to modules
  useEffect(() => {
    const loadTrainingJourneys = async () => {
      try {
        setLoadingModules(true);
        const companyId = Cookies.get('companyId');
        const detectedAgentId = getAgentId();

        let journeys: any[] = [];

        // For trainees, load ALL available journeys from backend using dedicated endpoint
        if (userType === 'rep') {
          try {
            const response = await JourneyService.getAllAvailableJourneysForTrainees();
            console.log('[App] Loaded all available journeys for trainee:', response);

            // Handle response format: {data: [...], success: true, count: N}
            if (Array.isArray(response)) {
              journeys = response;
            } else if (response?.data && Array.isArray(response.data)) {
              journeys = response.data;
            } else if (response?.data?.data && Array.isArray(response.data.data)) {
              journeys = response.data.data;
            } else if (response?.journeys && Array.isArray(response.journeys)) {
              journeys = response.journeys;
            }
            console.log('[App] Loaded all available journeys for trainee:', journeys.length);
          } catch (error) {
            console.error('[App] Error loading available journeys for trainee:', error);
            // Fallback: try to get all journeys
            try {
              const allJourneys: any = await JourneyService.getAllJourneys();
              journeys = Array.isArray(allJourneys) ? allJourneys : (allJourneys?.data || []);
              console.log('[App] Fallback: Loaded all journeys:', journeys.length);
            } catch (fallbackError) {
              console.error('[App] Error loading all journeys:', fallbackError);
            }
          }
        } else if (companyId) {
          // For trainers/companies, load by company
          const response = await JourneyService.getJourneysByCompany(companyId);
          console.log('[App] Raw response from JourneyService:', response);

          // Handle response format: {data: [...], success: true, count: 31}
          if (Array.isArray(response)) {
            journeys = response;
          } else if (response?.data && Array.isArray(response.data)) {
            journeys = response.data;
          } else if (response?.data?.data && Array.isArray(response.data.data)) {
            journeys = response.data.data;
          } else if (response?.journeys && Array.isArray(response.journeys)) {
            journeys = response.journeys;
          }
        } else {
          // Try to get all journeys as fallback
          try {
            const allJourneys: any = await JourneyService.getAllJourneys();
            journeys = Array.isArray(allJourneys) ? allJourneys : (allJourneys?.data || []);
            console.log('[App] Fallback: Loaded all journeys:', journeys.length);
          } catch (error) {
            console.warn('[App] No companyId or agentId found, and failed to load all journeys');
            setRealModules([]);
            setLoadingModules(false);
            return;
          }
        }

        console.log('[App] Extracted journeys:', journeys.length, 'journeys');
        if (journeys.length > 0) {
          console.log('[App] Sample journey:', journeys[0]);
          console.log('[App] Sample journey modules:', journeys[0]?.modules?.length || 0, 'modules');
        }

        // Filter out null journeys and filter by active/completed status
        const filteredJourneys = journeys
          .filter((journey: any) => journey != null)
          .filter((journey: any) => {
            const status = journey.status || journey.journeyStatus;
            return !status || status === 'active' || status === 'completed';
          });

        // Store journeys directly instead of transforming to modules
        setRealJourneys(filteredJourneys);
        console.log('[App] Loaded', filteredJourneys.length, 'journeys');
        if (filteredJourneys.length > 0) {
          console.log('[App] First journey sample:', filteredJourneys[0]);
        } else {
          console.warn('[App] No journeys found!');
        }

        // Also keep modules for backward compatibility (empty for now)
        setRealModules([]);
      } catch (error) {
        console.error('[App] Error loading training journeys:', error);
        setRealModules([]);
      } finally {
        setLoadingModules(false);
      }
    };

    // Reload when userType changes or when component mounts
    if (userType !== null || checkingUserType === false) {
      loadTrainingJourneys();
    }
  }, [userType, checkingUserType]);

  // Auto-redirect based on user type when accessing /training
  useEffect(() => {
    if (!userType || checkingUserType) return;

    const currentPath = window.location.pathname;
    // Only redirect if we're at /training (not already at /training/repdashboard or /training/companydashboard)
    if (currentPath === '/training' || currentPath === '/training/') {
      if (userType === 'rep') {
        console.log('[App] Auto-redirecting rep user to /training/repdashboard');
        window.location.href = '/training/repdashboard';
      } else if (userType === 'company') {
        console.log('[App] Auto-redirecting company user to /training/companydashboard');
        window.location.href = '/training/companydashboard';
      }
    }
  }, [userType, checkingUserType]);

  // Check user type and set appropriate role
  useEffect(() => {
    if (initialJourneyId) {
      setUserType('rep');
      setUserRole('trainee');
      setCheckingUserType(false);

      const detectedAgentId = getAgentId() || Cookies.get('userId') || 'default-trainee';
      setAgentId(detectedAgentId);
      return;
    }

    const checkUserTypeAndSetRole = async () => {
      setCheckingUserType(true);
      try {
        const type = await getUserType();
        setUserType(type);

        if (type === 'rep') {
          // Rep user: set as trainee, load their journeys
          console.log('[App] User type is REP - setting as trainee');
          setUserRole('trainee');

          const detectedAgentId = getAgentId();
          if (detectedAgentId) {
            console.log('[App] Trainee detected with agentId:', detectedAgentId);
            setAgentId(detectedAgentId);
            setLoadingTraineeJourneys(true);

            try {
              // Load journeys where the rep is enrolled
              const journeys = await JourneyService.getJourneysForRep(detectedAgentId);
              console.log('[App] Loaded trainee journeys:', journeys.length);

              // Filter active journeys
              const activeJourneys = journeys
                .filter((journey: any) => journey != null)
                .filter((journey: any) => {
                  const status = journey.status || journey.journeyStatus;
                  return !status || status === 'active' || status === 'completed';
                });

              setTraineeJourneys(activeJourneys);

              // Load progress for all journeys
              if (activeJourneys.length > 0 && detectedAgentId) {
                console.log('[App] Loading progress for all journeys...');
                const progressPromises = activeJourneys.map(async (journey: any) => {
                  const journeyId = journey.id || journey._id;
                  try {
                    const progressData = await TrainingService.getRepProgress(detectedAgentId, journeyId);
                    if (progressData) {
                      const progressArray = Array.isArray(progressData) ? progressData : [progressData];
                      const progressMap: Record<string, any> = {};
                      progressArray.forEach((p: any) => {
                        if (p.moduleId) {
                          progressMap[p.moduleId] = p;
                        }
                      });
                      return { journeyId, progressMap };
                    }
                  } catch (error) {
                    console.warn(`[App] Could not load progress for journey ${journeyId}:`, error);
                  }
                  return null;
                });

                const progressResults = await Promise.all(progressPromises);
                progressResults.forEach((result) => {
                  if (result) {
                    setTraineeProgressData(prev => ({ ...prev, [result.journeyId]: result.progressMap }));
                  }
                });
                console.log('[App] Loaded progress for all journeys');
              }
            } catch (error) {
              console.error('[App] Error loading trainee journeys:', error);
            } finally {
              setLoadingTraineeJourneys(false);
            }
          }
        } else if (type === 'company') {
          // Company user: set as trainer/admin, can create trainings
          console.log('[App] User type is COMPANY - setting as trainer');
          setUserRole('trainer');
        } else {
          // No type or unknown: check fallback (companyId for trainer, agentId for trainee)
          console.log('[App] No user type found, checking fallback');
          const companyId = Cookies.get('companyId');
          const detectedAgentId = getAgentId();

          if (companyId) {
            setUserRole('trainer');
          } else if (detectedAgentId) {
            setUserRole('trainee');
            setAgentId(detectedAgentId);
          }
        }
      } catch (error) {
        console.error('[App] Error checking user type:', error);
        // Fallback logic
        const companyId = Cookies.get('companyId');
        const detectedAgentId = getAgentId();

        if (companyId) {
          setUserRole('trainer');
        } else if (detectedAgentId) {
          setUserRole('trainee');
          setAgentId(detectedAgentId);
        }
      } finally {
        setCheckingUserType(false);
      }
    };

    checkUserTypeAndSetRole();
  }, []); // Run once on mount

  // Use real modules if available, otherwise use empty array (no mock fallback)
  // Only use real data from backend - no mock fallback
  const modulesToUse = realModules.length > 0 ? realModules : [];

  console.log('[App] Using', modulesToUse.length, 'modules (real:', realModules.length, ', mock:', mockTrainingModules.length, ')');
  console.log('[App] modulesToUse array:', modulesToUse.length === 0 ? 'EMPTY' : `has ${modulesToUse.length} modules`);

  // Use empty arrays if no real data - don't use mock data
  const { progress, updateModuleProgress, updateStepProgress, updateAssessmentResult } = useTrainingProgress({
    modules: modulesToUse, // Use only real modules, empty array if none
    steps: [], // Empty steps - no mock data
    assessments: [], // Empty assessments - no mock data
  });

  console.log('[App] Progress modules count:', progress.modules.length, '(should be', modulesToUse.length, ')');
  console.log('[App] Real journeys count:', realJourneys.length);
  console.log('[App] Real modules count:', realModules.length);

  // Calculate progress stats from real journeys data, not mock data
  // For trainees: calculate from their actual progress in realJourneys
  // For trainers: show 0 or calculate from realJourneys if needed
  const calculateRealProgressStats = () => {
    if (userType === 'rep' && agentId && realJourneys.length > 0) {
      // Calculate from trainee's actual progress in journeys
      let totalModules = 0;
      let completedModules = 0;
      let inProgressModules = 0;

      realJourneys.forEach((journey: any) => {
        const journeyId = journey.id || journey._id;
        const journeyProgress = traineeProgressData[journeyId] || {};
        const modules = journey.modules || [];

        modules.forEach((module: any) => {
          const moduleId = module.id || module._id;
          const moduleProgress = journeyProgress[moduleId];
          totalModules++;

          if (moduleProgress?.status === 'completed' || moduleProgress?.progress >= 100) {
            completedModules++;
          } else if (moduleProgress?.progress > 0) {
            inProgressModules++;
          }
        });
      });

      const overallProgress = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

      return {
        completed: completedModules,
        inProgress: inProgressModules,
        pending: totalModules - completedModules - inProgressModules,
        totalModules: totalModules,
        overallProgress: overallProgress,
      };
    }

    // For trainers or when no real data: return zeros
    return {
      completed: 0,
      inProgress: 0,
      pending: 0,
      totalModules: 0,
      overallProgress: 0,
    };
  };

  const progressStats = calculateRealProgressStats();

  const handleModuleProgress = (moduleId: string, progress: number) => {
    updateModuleProgress(moduleId, progress);
  };

  const handleModuleComplete = (moduleId: string) => {
    updateModuleProgress(moduleId, 100);

    // Find current module index in selectedJourneyModules
    if (selectedJourneyModules.length > 0) {
      const currentIndex = selectedJourneyModules.findIndex(m => m.id === moduleId);
      if (currentIndex !== -1 && currentIndex < selectedJourneyModules.length - 1) {
        // Move to next module automatically
        const nextModule = selectedJourneyModules[currentIndex + 1];
        setSelectedModule(nextModule.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        console.log('[App] Module completed, moving to next module:', nextModule.title);
      } else {
        // Last module completed, redirect to journey training list
        console.log('[App] All modules completed, redirecting to journey training');
        setSelectedModule(null);
        setSelectedJourney(null);
        setSelectedJourneyModules([]);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      // No journey modules, just complete and return to list
      setSelectedModule(null);
    }
  };

  const handleAssessmentComplete = (assessmentId: string, result: any) => {
    updateAssessmentResult(assessmentId, result.score, result.status);
  };

  const handleRoleSwitch = (role: 'trainee' | 'trainer' | 'admin') => {
    setUserRole(role);
    setActiveTab('dashboard');
  };

  const handleJourneyComplete = (journey: TrainingJourney, modules: TrainingModule[], enrolledReps: Rep[]) => {
    // Hide welcome screen and journey builder
    setShowWelcome(false);
    setShowJourneyBuilder(false);

    // If embedded and provided with a launch callback, use it instead of showing the success page
    if (onJourneyLaunch) {
      onJourneyLaunch();
      return;
    }

    // Set journey data and show success page - ensure arrays are never undefined
    setLaunchedJourney({
      journey: {
        ...journey,
        targetRoles: journey.targetRoles || []
      },
      modules: modules || [],
      enrolledReps: enrolledReps || []
    });
    setShowJourneySuccess(true);
    // Scroll to top when redirecting
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMethodologyApply = (methodology: TrainingMethodology) => {
    console.log('Methodology applied:', methodology);
    // In a real implementation, this would integrate the methodology into the training system
  };

  const handleViewDashboard = () => {
    setShowJourneySuccess(false);
    setShowLaunchedDashboard(true);
    setHasCompletedSetup(true);
    setShowWelcome(false);
    setActiveTab('dashboard');
  };

  const handleCreateAnotherJourney = () => {
    if (userType === 'rep') {
      alert('You do not have permission to create training journeys. Please contact your administrator.');
      return;
    }
    setShowJourneySuccess(false);
    setLaunchedJourney(null);
    setShowJourneyBuilder(true);
  };

  const handleViewTraineePortal = (trainee: Rep) => {
    setSelectedTrainee(trainee);
    setShowTraineePortal(true);
  };

  const handleBackFromTraineePortal = () => {
    setShowTraineePortal(false);
    setSelectedTrainee(null);
  };

  // Handlers for JourneySuccess action buttons
  const handlePreviewAsLearner = () => {
    if (launchedJourney && launchedJourney.enrolledReps.length > 0) {
      // Preview as the first enrolled rep
      setSelectedTrainee(launchedJourney.enrolledReps[0]);
      setShowTraineePortal(true);
      setShowJourneySuccess(false);
    } else {
      alert('No enrolled participants to preview. Please enroll participants first.');
    }
  };

  const handleExportReport = () => {
    if (!launchedJourney) return;

    // Create a report object
    const report = {
      journey: {
        name: launchedJourney.journey.name,
        description: launchedJourney.journey.description,
        status: launchedJourney.journey.status,
        createdAt: launchedJourney.journey.createdAt
      },
      modules: launchedJourney.modules.map(m => ({
        title: m.title,
        description: m.description,
        duration: m.duration,
        difficulty: m.difficulty,
        learningObjectives: m.learningObjectives,
        assessments: m.assessments?.length || 0
      })),
      participants: launchedJourney.enrolledReps.map(r => ({
        name: r.name,
        email: r.email,
        role: r.role,
        department: r.department
      })),
      summary: {
        totalModules: launchedJourney.modules.length,
        totalParticipants: launchedJourney.enrolledReps.length,
        totalDuration: launchedJourney.modules.reduce((sum, m) => sum + (typeof m.duration === 'number' ? m.duration : Number(m.duration) || 0), 0),
        totalAssessments: launchedJourney.modules.reduce((sum, m) => sum + (m.assessments?.length || 0), 0)
      },
      exportedAt: new Date().toISOString()
    };

    // Convert to JSON and download
    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `training-journey-report-${launchedJourney.journey.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleShareJourney = () => {
    if (!launchedJourney) return;

    const journeyUrl = `${window.location.origin}/training/journey/${launchedJourney.journey.id}`;

    // Try to use Web Share API if available
    if (navigator.share) {
      navigator.share({
        title: `Training Journey: ${launchedJourney.journey.name}`,
        text: `Check out this training journey: ${launchedJourney.journey.description}`,
        url: journeyUrl
      }).catch(err => {
        console.log('Error sharing:', err);
        // Fallback to clipboard
        copyToClipboard(journeyUrl);
      });
    } else {
      // Fallback to clipboard
      copyToClipboard(journeyUrl);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Journey link copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy:', err);
      alert('Failed to copy link. Please copy manually: ' + text);
    });
  };

  const handleJourneySettings = () => {
    alert('Journey Settings feafture coming soon!\n\nYou will be able to:\n- Edit journey details\n- Modify modules\n- Update launch settings\n- Change notification preferences');
  };

  const handleManageParticipants = () => {
    if (!launchedJourney) return;

    const participantList = launchedJourney.enrolledReps.map(r => `- ${r.name} (${r.email})`).join('\n');
    const message = `Current Participants (${launchedJourney.enrolledReps.length}):\n\n${participantList}\n\n\nManage Participants feature coming soon!\n\nYou will be able to:\n- Add new participants\n- Remove participants\n- View participant progress\n- Send individual messages`;
    alert(message);
  };

  const handleSendReminder = () => {
    if (!launchedJourney) return;

    const participantCount = launchedJourney.enrolledReps.length;
    if (participantCount === 0) {
      alert('No participants enrolled in this journey.');
      return;
    }

    if (confirm(`Send reminder to ${participantCount} participant(s)?`)) {
      // Simulate sending reminders
      console.log('Sending reminders to:', launchedJourney.enrolledReps.map(r => r.email));
      alert(`Reminders sent successfully to ${participantCount} participant(s)!`);
    }
  };

  // Scroll to top when welcome screen is shown
  useEffect(() => {
    if (!hasCompletedSetup && showWelcome && !showJourneyBuilder && !showManualTraining && !showJourneySuccess) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [hasCompletedSetup, showWelcome, showJourneyBuilder, showManualTraining, showJourneySuccess]);

  // Show welcome screen for first-time users (but not if showing success page or if user is rep)
  if (!isEmbedded && !initialJourneyId && !hasCompletedSetup && showWelcome && !showJourneyBuilder && !showManualTraining && !showJourneySuccess && userType !== 'rep' && !checkingUserType) {
    console.log('[App] Rendering welcome screen');
    return (
      <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 overflow-y-auto">
        <div className="container mx-auto px-4 py-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-auto p-6 text-center">
            <Sparkles className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Welcome to Your Training Platform
            </h1>
            <p className="text-base text-gray-600 mb-6">
              Transform your boring documents into engaging, interactive training experiences.
              Our AI will help you create professional training programs in minutes, not weeks.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
              <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
                <Upload className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <div className="font-semibold text-sm text-blue-900 mb-1">Upload & Analyze</div>
                <div className="text-xs text-blue-700">AI analyzes your documents</div>
              </div>
              <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                <Wand2 className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                <div className="font-semibold text-sm text-purple-900 mb-1">AI Enhancement</div>
                <div className="text-xs text-purple-700">Creates videos, audio & graphics</div>
              </div>
              <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                <Zap className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <div className="font-semibold text-sm text-green-900 mb-1">Interactive Elements</div>
                <div className="text-xs text-green-700">Quizzes, scenarios & simulations</div>
              </div>
              <div className="p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border border-orange-200">
                <Eye className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                <div className="font-semibold text-sm text-orange-900 mb-1">Rehearsal & Launch</div>
                <div className="text-xs text-orange-700">Test before deploying to team</div>
              </div>
            </div>

            <div className="space-y-4">
              {/* Titre de sélection */}
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Choose Your Creation Method</h2>

              {/* Cards de choix */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* AI Creation */}
                <button
                  onClick={() => {
                    if (userType !== 'company') {
                      alert('You do not have permission to create training journeys. Please contact your administrator.');
                      return;
                    }
                    setShowJourneyBuilder(true);
                  }}
                  disabled={userType !== 'company'}
                  className={`group p-6 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:scale-105 text-left ${userType !== 'company' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Sparkles className="h-8 w-8 mb-3 group-hover:rotate-12 transition-transform" />
                  <h3 className="text-xl font-bold mb-2">🤖 AI-Powered Creation</h3>
                  <p className="text-xs opacity-90 mb-3">
                    Let AI automatically generate modules, quizzes, and interactive content from your documents.
                  </p>
                  <div className="flex items-center text-xs font-semibold">
                    <span>Start with AI</span>
                    <span className="ml-2 group-hover:translate-x-2 transition-transform">→</span>
                  </div>
                </button>

                {/* Manual Creation */}
                <button
                  onClick={() => {
                    if (userType !== 'company') {
                      alert('You do not have permission to create training journeys. Please contact your administrator.');
                      return;
                    }
                    console.log('Manual Training clicked!');
                    setShowManualTraining(true);
                  }}
                  disabled={userType !== 'company'}
                  className={`group p-6 bg-gradient-to-br from-green-500 to-teal-600 text-white rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:scale-105 text-left ${userType !== 'company' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Upload className="h-8 w-8 mb-3 group-hover:-translate-y-1 transition-transform" />
                  <h3 className="text-xl font-bold mb-2">✍️ Manual Creation</h3>
                  <p className="text-xs opacity-90 mb-3">
                    Full control with manual uploads: videos, PDFs, Word docs, YouTube links, and custom quizzes.
                  </p>
                  <div className="flex items-center text-xs font-semibold">
                    <span>Create Manually</span>
                    <span className="ml-2 group-hover:translate-x-2 transition-transform">→</span>
                  </div>
                </button>
              </div>

              {/* Skip button */}
              <button
                onClick={() => { setShowWelcome(false); setHasCompletedSetup(true); }}
                className="text-gray-500 hover:text-gray-700 text-sm transition-colors"
              >
                Skip setup and explore the platform
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ✨ NOUVEAU : Afficher le Setup puis le ManualTrainingBuilder
  // Prevent reps from accessing Manual Training
  if (showManualTraining) {
    if (userType === 'rep') {
      console.warn('[App] Rep users cannot create manual trainings');
      setShowManualTraining(false);
      return null;
    }
    if (!manualTrainingSetupComplete) {
      return (
        <ManualTrainingSetup
          onComplete={(setupData) => {
            console.log('Setup complete:', setupData);
            setManualTrainingSetupData(setupData);
            setManualTrainingSetupComplete(true);
          }}
          onBack={() => setShowManualTraining(false)}
        />
      );
    }

    return (
      <ManualTrainingBuilder
        companyId="company-123"
        setupData={manualTrainingSetupData}
        onBack={() => {
          setShowManualTraining(false);
          setManualTrainingSetupComplete(false);
          setManualTrainingSetupData(null);
        }}
      />
    );
  }

  // Check for JourneySuccess first (after launch)
  if (showJourneySuccess && launchedJourney && launchedJourney.journey) {
    return (
      <JourneySuccess
        journey={launchedJourney.journey}
        modules={Array.isArray(launchedJourney.modules) ? launchedJourney.modules : []}
        enrolledReps={Array.isArray(launchedJourney.enrolledReps) ? launchedJourney.enrolledReps.filter(rep => rep != null) : []}
        onViewDashboard={handleViewDashboard}
        onCreateAnother={handleCreateAnotherJourney}
        onPreviewAsLearner={handlePreviewAsLearner}
        onExportReport={handleExportReport}
        onShareJourney={handleShareJourney}
        onJourneySettings={handleJourneySettings}
        onManageParticipants={handleManageParticipants}
        onSendReminder={handleSendReminder}
      />
    );
  }

  // Prevent reps from accessing Journey Builder
  if (showJourneyBuilder) {
    if (userType === 'rep') {
      console.warn('[App] Rep users cannot create journeys');
      setShowJourneyBuilder(false);
      return null;
    }
    return <JourneyBuilder onComplete={handleJourneyComplete} forceNew={startWithJourneyBuilder} />;
  }

  // Show journey list first for trainees ONLY if they have journeys, otherwise show normal dashboard
  if (userType === 'rep' && agentId && traineeJourneys.length > 0 && !selectedTraineeJourney && !showTraineePortal && !showLaunchedDashboard && !showJourneyBuilder && !showJourneySuccess && !showManualTraining && !checkingUserType) {
    return (
      <div className="min-h-full bg-gray-50">
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isOpen={sidebarOpen}
          userType={userType}
        />
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <div className="flex-1 flex flex-col ml-0 md:ml-64 transition-all duration-300 w-full">
          <div className="bg-white border-b border-gray-200 flex-shrink-0 z-10">
            <Header
              repName={getCurrentUserName()}
              onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
            />
          </div>
          <main className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Mes Formations</h1>
                    <p className="text-gray-600">Sélectionnez une formation pour commencer votre apprentissage</p>
                  </div>
                  {traineeJourneys.length > 0 && (
                    <div className="text-right">
                      <div className="text-sm text-gray-600 mb-1">
                        {traineeJourneys.filter((j: any) => {
                          const journeyId = j.id || j._id;
                          const progress = traineeProgressData[journeyId] || {};
                          const completed = Object.values(progress).filter((p: any) =>
                            p.status === 'completed' || p.progress >= 100
                          ).length;
                          const modulesCount = Array.isArray(j.modules) ? j.modules.length : 0;
                          return modulesCount > 0 && completed >= modulesCount;
                        }).length} sur {traineeJourneys.length} terminées
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Loading State */}
              {loadingTraineeJourneys ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Chargement de vos formations...</span>
                </div>
              ) : traineeJourneys.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                  <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg mb-2">Aucune formation disponible</p>
                  <p className="text-gray-500 text-sm">Contactez votre administrateur pour être inscrit à une formation.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {traineeJourneys.map((journey: any) => {
                    const journeyId = journey.id || journey._id;
                    const modulesCount = Array.isArray(journey.modules) ? journey.modules.length : 0;
                    const journeyProgress = traineeProgressData[journeyId] || {};

                    // Calculate overall progress for this journey
                    const completedModules = Object.values(journeyProgress).filter((p: any) =>
                      p.status === 'completed' || p.progress >= 100
                    ).length;
                    const overallProgress = modulesCount > 0
                      ? Math.round((completedModules / modulesCount) * 100)
                      : 0;

                    const isCompleted = journey.status === 'completed' || overallProgress >= 100;
                    const isActive = journey.status === 'active' && overallProgress < 100;

                    return (
                      <div
                        key={journeyId}
                        className="bg-white rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden hover:shadow-lg hover:border-blue-300 transition-all duration-200 cursor-pointer"
                        onClick={async () => {
                          // Load progress if not already loaded
                          if (agentId && !traineeProgressData[journeyId]) {
                            try {
                              const progressData = await TrainingService.getRepProgress(agentId, journeyId);
                              if (progressData) {
                                const progressArray = Array.isArray(progressData) ? progressData : [progressData];
                                const progressMap: Record<string, any> = {};
                                progressArray.forEach((p: any) => {
                                  if (p.moduleId) {
                                    progressMap[p.moduleId] = p;
                                  }
                                });
                                setTraineeProgressData(prev => ({ ...prev, [journeyId]: progressMap }));
                              }
                            } catch (error) {
                              console.error('[App] Error loading progress:', error);
                            }
                          }
                          // Select the journey
                          setSelectedTraineeJourney(journey);
                        }}
                      >
                        <div className="p-6">
                          {/* Header */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isCompleted
                                ? 'bg-green-100'
                                : isActive
                                  ? 'bg-blue-100'
                                  : 'bg-gray-100'
                                }`}>
                                <BookOpen className={`h-6 w-6 ${isCompleted
                                  ? 'text-green-600'
                                  : isActive
                                    ? 'text-blue-600'
                                    : 'text-gray-600'
                                  }`} />
                              </div>
                              <div>
                                <div className={`text-xs font-semibold px-2 py-1 rounded-full ${isCompleted
                                  ? 'bg-green-100 text-green-700'
                                  : isActive
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-gray-100 text-gray-700'
                                  }`}>
                                  {isCompleted ? 'Terminé' : isActive ? 'En cours' : 'Disponible'}
                                </div>
                              </div>
                            </div>
                            {isCompleted && (
                              <CheckCircle className="h-6 w-6 text-green-500" />
                            )}
                          </div>

                          {/* Title */}
                          <h3 className="text-xl font-bold text-gray-900 mb-2">
                            {journey.title || journey.name || 'Formation sans titre'}
                          </h3>

                          {/* Description */}
                          {journey.description && (
                            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                              {journey.description}
                            </p>
                          )}

                          {/* Stats */}
                          <div className="flex items-center space-x-4 mb-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <BookOpen className="h-4 w-4" />
                              <span>{modulesCount} modules</span>
                            </div>
                            {overallProgress > 0 && (
                              <div className="flex items-center space-x-1">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span>{completedModules}/{modulesCount} complétés</span>
                              </div>
                            )}
                          </div>

                          {/* Progress Bar */}
                          {overallProgress > 0 && (
                            <div className="mb-4">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-gray-700">Progression</span>
                                <span className="text-xs font-bold text-gray-900">{overallProgress}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all duration-300 ${isCompleted ? 'bg-green-500' : 'bg-blue-500'
                                    }`}
                                  style={{ width: `${overallProgress}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Action Button */}
                          <button
                            className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-semibold transition-all ${isCompleted
                              ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                              : overallProgress > 0
                                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                              }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              // For trainees, redirect to URL with journey ID
                              if (userType === 'rep' && agentId) {
                                const journeyIdStr = journey.id || journey._id;
                                console.log('[App] Redirecting trainee to journey URL from Continue button:', journeyIdStr);
                                navigate(`/${journeyIdStr}`);
                              } else {
                                setSelectedTraineeJourney(journey);
                              }
                            }}
                          >
                            <Play className="h-4 w-4" />
                            <span>
                              {isCompleted
                                ? 'Réviser'
                                : overallProgress > 0
                                  ? 'Continuer'
                                  : 'Commencer'}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Auto-show TraineePortal if userType is 'rep' and a journey is selected
  if (userType === 'rep' && agentId && selectedTraineeJourney && !showTraineePortal && !showLaunchedDashboard && !showJourneyBuilder && !showJourneySuccess && !showManualTraining && !checkingUserType) {
    // Create a mock trainee object from agentId
    const autoTrainee: Rep & { enrolledJourneys?: string[] } = {
      id: agentId,
      name: getCurrentUserName(),
      email: getCurrentUserEmail() || '',
      role: 'trainee',
      department: '',
      skills: [],
      learningStyle: 'visual',
      aiPersonalityProfile: {
        strengths: [],
        improvementAreas: [],
        preferredLearningPace: 'medium',
        motivationFactors: []
      },
      joinDate: new Date().toISOString(),
      enrolledJourneys: traineeJourneys.map(j => j.id || j._id)
    };

    // Transform journey modules to TrainingModule format with real progress data
    const journeyId = selectedTraineeJourney.id || selectedTraineeJourney._id;
    const journeyProgress = traineeProgressData[journeyId] || {};

    const journeyModules: TrainingModule[] = (selectedTraineeJourney.modules || []).map((module: any, index: number) => {
      // Modules MUST have a MongoDB ObjectId _id
      const moduleId = extractObjectId(module._id);
      if (!moduleId || !/^[0-9a-fA-F]{24}$/.test(moduleId)) {
        console.error(`[App] Module at index ${index} does not have a valid MongoDB ObjectId _id:`, module);
        throw new Error(`Module at index ${index} must have a valid MongoDB ObjectId _id`);
      }
      const moduleProgress = journeyProgress[moduleId];

      const topics = Array.isArray(module.topics)
        ? module.topics
        : (Array.isArray(module.learningObjectives)
          ? module.learningObjectives.slice(0, 5).map((obj: any) => typeof obj === 'string' ? obj : obj.text || obj.title || '')
          : []);

      let duration = 0;
      if (typeof module.duration === 'number') {
        duration = module.duration;
      } else if (Array.isArray(module.content) && module.content.length > 0) {
        duration = module.content.reduce((sum: number, item: any) => {
          return sum + (item.duration || 0);
        }, 0);
      }
      const durationHours = duration > 0 ? Math.round(duration / 60 * 10) / 10 : 0;

      // Get progress from backend data
      const progress = moduleProgress?.progress || 0;
      const completed = moduleProgress?.status === 'completed' || progress >= 100;

      return {
        id: moduleId,
        title: module.title || 'Untitled Module',
        description: module.description || '',
        duration: durationHours,
        difficulty: (module.difficulty || 'beginner') as 'beginner' | 'intermediate' | 'advanced',
        prerequisites: Array.isArray(module.prerequisites) ? module.prerequisites : [],
        learningObjectives: Array.isArray(module.learningObjectives)
          ? module.learningObjectives.map((obj: any) => typeof obj === 'string' ? obj : obj.text || obj.title || '')
          : [],
        assessments: Array.isArray(module.assessments) ? module.assessments : [],
        content: Array.isArray(module.content) ? module.content : [],
        sections: Array.isArray(module.sections) ? module.sections : [],
        topics: topics,
        progress: progress,
        completed: completed,
        order: index,
        quizIds: Array.isArray(module.quizIds) ? module.quizIds : [],
        quizzes: Array.isArray(module.quizzes) ? module.quizzes : []
      };
    });

    // Transform journey to TrainingJourney format
    const traineeJourney: TrainingJourney = {
      id: selectedTraineeJourney.id || selectedTraineeJourney._id,
      name: selectedTraineeJourney.title || selectedTraineeJourney.name || 'Untitled Journey',
      description: selectedTraineeJourney.description || '',
      status: (selectedTraineeJourney.status || 'active') as 'draft' | 'rehearsal' | 'active' | 'completed' | 'archived',
      companyId: selectedTraineeJourney.companyId || '',
      steps: [],
      createdAt: selectedTraineeJourney.createdAt || new Date().toISOString(),
      estimatedDuration: selectedTraineeJourney.estimatedDuration || '0',
      targetRoles: []
    };

    // Transform available journeys for selector
    const availableJourneysForSelector: TrainingJourney[] = traineeJourneys.map((j: any) => ({
      id: j.id || j._id,
      name: j.title || j.name || 'Untitled Journey',
      description: j.description || '',
      status: (j.status || 'active') as 'draft' | 'rehearsal' | 'active' | 'completed' | 'archived',
      companyId: j.companyId || '',
      steps: [],
      createdAt: j.createdAt || new Date().toISOString(),
      estimatedDuration: j.estimatedDuration || '0',
      targetRoles: []
    }));

    return (
      <TraineePortal
        trainee={autoTrainee}
        journey={traineeJourney}
        modules={journeyModules}
        methodology={undefined}
        availableJourneys={availableJourneysForSelector.length > 1 ? availableJourneysForSelector : undefined}
        autoStart={!!initialJourneyId}
        onJourneyChange={async (newJourneyId) => {
          const newJourney = traineeJourneys.find(j => (j.id || j._id) === newJourneyId);
          if (newJourney && agentId) {
            setSelectedTraineeJourney(newJourney);
            // Load progress for the new journey
            try {
              const progressData = await TrainingService.getRepProgress(agentId, newJourneyId);
              if (progressData) {
                const progressArray = Array.isArray(progressData) ? progressData : [progressData];
                const progressMap: Record<string, any> = {};
                progressArray.forEach((p: any) => {
                  if (p.moduleId) {
                    progressMap[p.moduleId] = p;
                  }
                });
                setTraineeProgressData(prev => ({ ...prev, [newJourneyId]: progressMap }));
              }
            } catch (error) {
              console.error('[App] Error loading progress for new journey:', error);
            }
          }
        }}
        onProgressUpdate={async (moduleId, progress) => {
          updateModuleProgress(moduleId, progress);
          // Save progress to backend
          if (agentId && journeyId) {
            try {
              await TrainingService.updateProgress(agentId, journeyId, moduleId, progress, 85);
            } catch (error) {
              console.error('[App] Error saving progress:', error);
            }
          }
        }}
        onModuleComplete={async (moduleId) => {
          updateModuleProgress(moduleId, 100);
          // Save completion to backend
          if (agentId && journeyId) {
            try {
              await TrainingService.updateProgress(agentId, journeyId, moduleId, 100, 100);
              // Reload progress data
              const progressData = await TrainingService.getRepProgress(agentId, journeyId);
              if (progressData) {
                const progressArray = Array.isArray(progressData) ? progressData : [progressData];
                const progressMap: Record<string, any> = {};
                progressArray.forEach((p: any) => {
                  if (p.moduleId) {
                    progressMap[p.moduleId] = p;
                  }
                });
                setTraineeProgressData(prev => ({ ...prev, [journeyId]: progressMap }));
              }
            } catch (error) {
              console.error('[App] Error saving completion:', error);
            }
          }
        }}
        onAssessmentComplete={(assessmentId, score) => updateAssessmentResult(assessmentId, score, score >= 80 ? 'passed' : 'failed')}
        onBack={() => {
          // Return to journey list and update URL
          setSelectedTraineeJourney(null);
          // Ensure we're on the training tab to show the journey list
          setActiveTab('training');
          // Navigate to /training/repdashboard to update URL
          navigate('/');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    );
  }

  if (showTraineePortal && selectedTrainee && launchedJourney) {
    return (
      <TraineePortal
        trainee={selectedTrainee}
        journey={launchedJourney.journey}
        modules={launchedJourney.modules}
        methodology={undefined} // Would be passed from journey data
        autoStart={!!initialJourneyId}
        onProgressUpdate={(moduleId, progress) => updateModuleProgress(moduleId, progress)}
        onModuleComplete={(moduleId) => updateModuleProgress(moduleId, 100)}
        onAssessmentComplete={(assessmentId, score) => updateAssessmentResult(assessmentId, score, score >= 80 ? 'passed' : 'failed')}
        onBack={handleBackFromTraineePortal}
      />
    );
  }

  if (showLaunchedDashboard && launchedJourney) {
    return (
      <div className="min-h-full bg-gray-50 flex">
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isOpen={sidebarOpen}
          userType={userType}
        />

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className="flex-1 flex flex-col">
          <div className="bg-white border-b border-gray-200">
            <div className="flex items-center justify-between px-6 py-2">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Training Manager View</span>
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                    Journey Active
                  </span>
                </div>
              </div>
              <button
                onClick={handleCreateAnotherJourney}
                className="flex items-center space-x-2 px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
              >
                <Rocket className="h-4 w-4" />
                <span>New Journey</span>
              </button>
            </div>
          </div>

          <Header
            repName={user?.name || 'User'}
            onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          />

          <main className="flex-1 p-6 overflow-y-auto">
            <LaunchedJourneyDashboard
              journey={launchedJourney.journey}
              modules={launchedJourney.modules}
              enrolledReps={launchedJourney.enrolledReps}
              onViewProgress={(repId) => {
                const trainee = launchedJourney.enrolledReps.find(rep => rep.id === repId);
                if (trainee) handleViewTraineePortal(trainee);
              }}
              onViewAnalytics={() => console.log('View analytics')}
            />
          </main>
        </div>
      </div>
    );
  }

  // Helper function to convert mock session to properly typed LiveStreamSession
  const convertSessionToTyped = (session: any): LiveStreamSession => {
    return {
      ...session,
      chatMessages: (session.chatMessages || []).map((msg: any): ChatMessage => ({
        ...msg,
        sender: (msg.sender === 'user' || msg.sender === 'ai' || msg.sender === 'trainer')
          ? msg.sender as 'user' | 'ai' | 'trainer'
          : 'user' as 'user' | 'ai' | 'trainer',
        type: (msg.type === 'text' || msg.type === 'suggestion' || msg.type === 'resource' || msg.type === 'assessment')
          ? msg.type as 'text' | 'suggestion' | 'resource' | 'assessment'
          : 'text' as 'text' | 'suggestion' | 'resource' | 'assessment'
      }))
    } as LiveStreamSession;
  };

  const renderContent = () => {
    if (selectedModule) {
      // Search in selectedJourneyModules first, then fallback to progress.modules
      const module = selectedJourneyModules.find(m => m.id === selectedModule)
        || progress.modules.find(m => m.id === selectedModule);
      if (module) {
        return (
          <div className="flex flex-col h-full" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="flex-1 min-h-0" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <InteractiveModule
                module={module}
                onProgress={(progress) => handleModuleProgress(selectedModule, progress)}
                onComplete={() => handleModuleComplete(selectedModule)}
                onBack={() => {
                  setSelectedModule(null);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </div>
          </div>
        );
      }
    }

    if (userRole === 'trainer') {
      switch (activeTab) {
        case 'dashboard':
          return <TrainerDashboard onTraineeSelect={(trainee) => console.log('Selected trainee:', trainee)} />;
        case 'training':
          return (
            loadingModules ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading training modules...</span>
              </div>
            ) : selectedJourney && selectedJourneyModules.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-4 mb-6">
                  <button
                    onClick={() => {
                      setSelectedJourney(null);
                      setSelectedJourneyModules([]);
                      // Update URL when going back
                      if (userType === 'rep') {
                        navigate('/repdashboard');
                      } else if (userType === 'company') {
                        navigate('/');
                      }
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <span>←</span>
                    <span>Back to Journeys</span>
                  </button>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedJourney.title || selectedJourney.name || 'Untitled Journey'}
                  </h2>
                </div>
                <TrainingModules modules={selectedJourneyModules} onModuleSelect={setSelectedModule} />
              </div>
            ) : realJourneys.length > 0 ? (
              <JourneyTraining
                journeys={realJourneys}
                onJourneySelect={async (journeyId) => {
                  const journey = realJourneys.find(j => (j.id || j._id) === journeyId);
                  if (journey) {
                    console.log('[App] Journey selected:', journeyId, journey);
                    setSelectedJourney(journey);
                    setLoadingModules(true);

                    try {
                      // Load modules from embedded structure (journey.modules)
                      const journeyIdStr = extractObjectId(journey.id || journey._id) || '';
                      const embeddedModules = journey.modules || [];

                      console.log('[App] Loading modules from embedded structure:', {
                        journeyId: journeyIdStr,
                        modulesCount: embeddedModules.length
                      });

                      let modules: TrainingModule[] = [];

                      if (embeddedModules && Array.isArray(embeddedModules) && embeddedModules.length > 0) {
                        // New embedded structure: modules are directly in journey.modules
                        modules = embeddedModules.map((module: any, index: number): TrainingModule => {
                          // Modules MUST have a MongoDB ObjectId _id
                          const moduleId = extractObjectId(module._id);
                          if (!moduleId || !/^[0-9a-fA-F]{24}$/.test(moduleId)) {
                            console.error(`[App] Module at index ${index} does not have a valid MongoDB ObjectId _id:`, module);
                            throw new Error(`Module at index ${index} must have a valid MongoDB ObjectId _id`);
                          }

                          // Extract sections from embedded module
                          const embeddedSections = module.sections || [];
                          const sections = embeddedSections.map((section: any, sectionIndex: number) => ({
                            id: extractObjectId(section._id || section.id) || `section-${moduleId}-${sectionIndex}`,
                            type: section.type || 'document',
                            title: section.title || `Section ${sectionIndex + 1}`,
                            content: section.content || {},
                            duration: section.duration || 0
                          }));

                          // Extract quizzes from embedded module
                          const embeddedQuizzes = module.quizzes || [];
                          const assessments = embeddedQuizzes.map((quiz: any) => ({
                            id: extractObjectId(quiz._id || quiz.id) || `quiz-${moduleId}`,
                            title: quiz.title || 'Quiz',
                            description: quiz.description || '',
                            questions: (quiz.questions || []).map((q: any) => ({
                              id: extractObjectId(q._id || q.id) || `q-${Date.now()}`,
                              text: q.question || '',
                              type: q.type || 'multiple-choice',
                              options: q.options || [],
                              correctAnswer: q.correctAnswer,
                              explanation: q.explanation || '',
                              points: q.points || 10
                            })),
                            passingScore: quiz.passingScore || 70,
                            timeLimit: quiz.timeLimit || 15,
                            maxAttempts: quiz.maxAttempts || 3,
                            settings: quiz.settings || {}
                          }));

                          const topics = Array.isArray(module.topics)
                            ? module.topics
                            : (Array.isArray(module.learningObjectives)
                              ? module.learningObjectives.slice(0, 5).map((obj: any) => typeof obj === 'string' ? obj : obj.text || obj.title || '')
                              : []);

                          const durationHours = module.duration ? Math.round(module.duration / 60 * 10) / 10 : 0;

                          return {
                            id: moduleId,
                            title: module.title || 'Untitled Module',
                            description: module.description || '',
                            duration: String(durationHours),
                            difficulty: (module.difficulty || 'beginner') as 'beginner' | 'intermediate' | 'advanced',
                            prerequisites: Array.isArray(module.prerequisites) ? module.prerequisites : [],
                            learningObjectives: Array.isArray(module.learningObjectives)
                              ? module.learningObjectives.map((obj: any) => typeof obj === 'string' ? obj : obj.text || obj.title || '')
                              : [],
                            assessments: assessments,
                            content: sections,
                            sections: sections,
                            topics: topics,
                            progress: 0,
                            completed: false,
                            type: (module.type || 'reading') as 'video' | 'interactive' | 'simulation' | 'reading' | 'ai-tutor',
                            aiAdaptiveContent: module.aiAdaptiveContent || false,
                            engagementScore: module.engagementScore || 0,
                            comprehensionScore: module.comprehensionScore || 0,
                            practicalExercises: module.practicalExercises || [],
                            aiGeneratedQuizzes: assessments || [],
                            order: module.order !== undefined ? module.order : index,
                            quizIds: assessments.map((a: any) => a.id).filter((id: string) => !!id)
                          } as TrainingModule;
                        });
                      } else {
                        console.warn('[App] Journey has no embedded modules');
                        modules = [];
                      }

                      if (modules.length === 0) {
                        console.error('[App] No modules loaded for journey:', journeyIdStr);
                        alert('No modules found for this journey. Please check the journey configuration.');
                        return;
                      }

                      setSelectedJourneyModules(modules);
                      console.log('[App] Selected journey:', journey.title || journey.name, 'with', modules.length, 'modules');
                      modules.forEach((m, idx) => {
                        const quizIds = (m as any).quizIds;
                        console.log(`[App] Module ${idx + 1} (${m.title}):`, {
                          quizIds: quizIds,
                          hasQuizIds: !!quizIds && Array.isArray(quizIds) && quizIds.length > 0,
                          quizIdsCount: Array.isArray(quizIds) ? quizIds.length : 0,
                          sectionsCount: m.sections?.length || 0,
                          contentCount: m.content?.length || 0
                        });
                      });
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    } catch (error) {
                      console.error('[App] Error loading modules:', error);
                      alert('Error loading modules. Please try again.');
                    } finally {
                      setLoadingModules(false);
                    }
                  } else {
                    console.error('[App] Journey not found:', journeyId);
                  }
                }}
              />
            ) : (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg mb-2">Aucune formation disponible</p>
                <p className="text-gray-500 text-sm">Les formations seront affichées ici une fois créées.</p>
              </div>
            )
          );
        case 'assessments':
          return <AssessmentCenter assessments={progress.assessments} onAssessmentComplete={handleAssessmentComplete} />;
        case 'live-sessions':
          return <LiveSessions sessions={mockLiveSessions} />;
        case 'knowledge-base':
          return <KnowledgeBase items={mockKnowledgeBase} />;
        case 'curriculum-builder':
          return (
            <CurriculumBuilder
              curriculum={mockCurriculumBuilder}
              onSave={(curriculum) => console.log('Save curriculum:', curriculum)}
              onPublish={(curriculum) => console.log('Publish curriculum:', curriculum)}
            />
          );
        case 'streaming':
          if (selectedStreamSession) {
            const session = mockLiveStreamSessions.find(s => s.id === selectedStreamSession);
            if (session) {
              const typedSession = convertSessionToTyped(session);
              return (
                <div className="space-y-4">
                  <button
                    onClick={() => setSelectedStreamSession(null)}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    ← Back to Streaming Dashboard
                  </button>
                  <LiveStreamStudio
                    session={typedSession}
                    isInstructor={true}
                    onSessionUpdate={(updatedSession) => console.log('Session updated:', updatedSession)}
                  />
                </div>
              );
            }
          }
          return (
            <StreamingDashboard
              sessions={mockLiveStreamSessions.map(convertSessionToTyped)}
              onCreateSession={() => console.log('Create new session')}
              onEditSession={(session) => console.log('Edit session:', session)}
              onDeleteSession={(sessionId) => console.log('Delete session:', sessionId)}
              onStartStream={(sessionId) => setSelectedStreamSession(sessionId)}
            />
          );
        case 'course-streaming':
          if (selectedCourseStream) {
            const session = mockLiveStreamSessions.find(s => s.id === selectedCourseStream);
            const course = progress.modules[0]; // Use first module as example course
            if (session && course) {
              const typedSession = convertSessionToTyped(session);
              return (
                <div className="space-y-4">
                  <button
                    onClick={() => setSelectedCourseStream(null)}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    ← Back to Course Streaming
                  </button>
                  {showParticipantView ? (
                    <CourseParticipantView
                      session={typedSession}
                      course={course}
                      participantId="participant-1"
                      onProgress={(progress) => console.log('Participant progress:', progress)}
                      onEngagement={(score) => console.log('Engagement score:', score)}
                    />
                  ) : (
                    <CourseStreamingStudio
                      session={typedSession}
                      course={course}
                      isInstructor={true}
                      onSessionUpdate={(updatedSession) => console.log('Session updated:', updatedSession)}
                      onCourseProgress={(moduleId, progress) => console.log('Course progress:', moduleId, progress)}
                    />
                  )}
                  <div className="flex justify-center">
                    <button
                      onClick={() => setShowParticipantView(!showParticipantView)}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Switch to {showParticipantView ? 'Instructor' : 'Participant'} View
                    </button>
                  </div>
                </div>
              );
            }
          }
          return (
            <CourseStreamingDashboard
              sessions={mockLiveStreamSessions.map(convertSessionToTyped)}
              courses={progress.modules}
              onCreateCourseStream={(courseId) => console.log('Create course stream:', courseId)}
              onEditSession={(session) => console.log('Edit course session:', session)}
              onDeleteSession={(sessionId) => console.log('Delete course session:', sessionId)}
              onStartCourseStream={(sessionId, courseId) => setSelectedCourseStream(sessionId)}
            />
          );
        case 'document-transformer':
          return (
            <DocumentTransformer
              onComplete={(modules) => console.log('Enhanced modules:', modules)}
            />
          );
        case 'methodology':
          return (
            <MethodologyBuilder
              onApplyMethodology={handleMethodologyApply}
              selectedIndustry="health-insurance"
            />
          );
        default:
          return <TrainerDashboard onTraineeSelect={(trainee) => console.log('Selected trainee:', trainee)} />;
      }
    }

    if (userRole === 'admin') {
      switch (activeTab) {
        case 'dashboard':
          return <CompanyAnalytics analytics={mockCompanyAnalytics} />;
        case 'training':
          return (
            loadingModules ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading training modules...</span>
              </div>
            ) : (
              realJourneys.length > 0 ? (
                <JourneyTraining
                  journeys={realJourneys}
                  onJourneySelect={(journeyId) => {
                    console.log('[App] Journey selected:', journeyId);
                  }}
                />
              ) : (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                  <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg mb-2">Aucune formation disponible</p>
                  <p className="text-gray-500 text-sm">Les formations seront affichées ici une fois créées.</p>
                </div>
              )
            )
          );
        case 'assessments':
          return <AssessmentCenter assessments={progress.assessments} onAssessmentComplete={handleAssessmentComplete} />;
        case 'live-sessions':
          return <LiveSessions sessions={mockLiveSessions} />;
        case 'knowledge-base':
          return <KnowledgeBase items={mockKnowledgeBase} />;
        case 'curriculum-builder':
          return (
            <CurriculumBuilder
              curriculum={mockCurriculumBuilder}
              onSave={(curriculum) => console.log('Save curriculum:', curriculum)}
              onPublish={(curriculum) => console.log('Publish curriculum:', curriculum)}
            />
          );
        case 'streaming':
          if (selectedStreamSession) {
            const session = mockLiveStreamSessions.find(s => s.id === selectedStreamSession);
            if (session) {
              const typedSession = convertSessionToTyped(session);
              return (
                <div className="space-y-4">
                  <button
                    onClick={() => setSelectedStreamSession(null)}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    ← Back to Streaming Dashboard
                  </button>
                  <LiveStreamStudio
                    session={typedSession}
                    isInstructor={true}
                    onSessionUpdate={(updatedSession) => console.log('Session updated:', updatedSession)}
                  />
                </div>
              );
            }
          }
          return (
            <StreamingDashboard
              sessions={mockLiveStreamSessions.map(convertSessionToTyped)}
              onCreateSession={() => console.log('Create new session')}
              onEditSession={(session) => console.log('Edit session:', session)}
              onDeleteSession={(sessionId) => console.log('Delete session:', sessionId)}
              onStartStream={(sessionId) => setSelectedStreamSession(sessionId)}
            />
          );
        case 'course-streaming':
          if (selectedCourseStream) {
            const session = mockLiveStreamSessions.find(s => s.id === selectedCourseStream);
            const course = progress.modules[0]; // Use first module as example course
            if (session && course) {
              const typedSession = convertSessionToTyped(session);
              return (
                <div className="space-y-4">
                  <button
                    onClick={() => setSelectedCourseStream(null)}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    ← Back to Course Streaming
                  </button>
                  {showParticipantView ? (
                    <CourseParticipantView
                      session={typedSession}
                      course={course}
                      participantId="participant-1"
                      onProgress={(progress) => console.log('Participant progress:', progress)}
                      onEngagement={(score) => console.log('Engagement score:', score)}
                    />
                  ) : (
                    <CourseStreamingStudio
                      session={typedSession}
                      course={course}
                      isInstructor={true}
                      onSessionUpdate={(updatedSession) => console.log('Session updated:', updatedSession)}
                      onCourseProgress={(moduleId, progress) => console.log('Course progress:', moduleId, progress)}
                    />
                  )}
                  <div className="flex justify-center">
                    <button
                      onClick={() => setShowParticipantView(!showParticipantView)}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Switch to {showParticipantView ? 'Instructor' : 'Participant'} View
                    </button>
                  </div>
                </div>
              );
            }
          }
          return (
            <CourseStreamingDashboard
              sessions={mockLiveStreamSessions.map(convertSessionToTyped)}
              courses={progress.modules}
              onCreateCourseStream={(courseId) => console.log('Create course stream:', courseId)}
              onEditSession={(session) => console.log('Edit course session:', session)}
              onDeleteSession={(sessionId) => console.log('Delete course session:', sessionId)}
              onStartCourseStream={(sessionId, courseId) => setSelectedCourseStream(sessionId)}
            />
          );
        case 'document-transformer':
          return (
            <DocumentTransformer
              onComplete={(modules) => console.log('Enhanced modules:', modules)}
            />
          );
        case 'methodology':
          return (
            <MethodologyBuilder
              onApplyMethodology={handleMethodologyApply}
              selectedIndustry="health-insurance"
            />
          );
        default:
          return <CompanyAnalytics analytics={mockCompanyAnalytics} />;
      }
    }

    // Trainee view - Use same layout as trainer but with trainee-specific data
    // Show ALL journeys for trainees (not filtered by enrollment)
    // They can see all available trainings and their enrollment status will be shown in the card
    const traineeFilteredJourneys = realJourneys;

    switch (activeTab) {
      case 'dashboard':
        // For trainees, show their progress overview instead of trainer dashboard
        if (userType === 'rep') {
          return (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <ProgressOverview stats={progressStats} />
                </div>
                <div>
                  <CurrentGig gig={mockGig} />
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  {progress.steps.length > 0 ? (
                    <OnboardingSteps steps={progress.steps} />
                  ) : (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">Onboarding Checklist</h2>
                      <p className="text-gray-500 text-sm">Aucune étape d'onboarding disponible pour le moment.</p>
                    </div>
                  )}
                </div>
                <div>
                  <AIInsights insights={mockAIInsights} userRole={userRole} />
                </div>
              </div>
            </div>
          );
        }
        return <TrainerDashboard onTraineeSelect={(trainee) => console.log('Selected trainee:', trainee)} />;
      case 'training':
        return (
          <div className="space-y-6">
            {loadingModules ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600 ml-3">Loading journey training...</span>
              </div>
            ) : selectedJourney && selectedJourneyModules.length > 0 ? (
              <>
                {/* Retour aux Formations */}
                <div className="flex items-center space-x-4 mb-6">
                  <button
                    onClick={() => {
                      setSelectedJourney(null);
                      setSelectedJourneyModules([]);
                      // Update URL when going back
                      if (userType === 'rep') {
                        navigate('/repdashboard');
                      } else if (userType === 'company') {
                        navigate('/');
                      }
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <span>←</span>
                    <span>Back to Journeys</span>
                  </button>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedJourney.title || selectedJourney.name || 'Untitled Journey'}
                  </h2>
                </div>
                <TrainingModules modules={selectedJourneyModules} onModuleSelect={setSelectedModule} />
              </>
            ) : traineeFilteredJourneys.length > 0 ? (
              <JourneyTraining
                journeys={traineeFilteredJourneys}
                onJourneySelect={async (journeyId) => {
                  const journey = traineeFilteredJourneys.find(j => (j.id || j._id) === journeyId);
                  if (journey) {
                    // For trainees, redirect to URL with journey ID instead of showing module list
                    if (userType === 'rep' && agentId) {
                      // Navigate to the journey URL with ID
                      const journeyIdStr = journeyId || journey.id || journey._id;
                      console.log('[App] Redirecting trainee to journey URL:', journeyIdStr);
                      navigate(`/${journeyIdStr}`);
                    } else {
                      // For trainers, show module list as before
                      setSelectedJourney(journey);

                      // Transform journey modules to TrainingModule format
                      const modules: TrainingModule[] = (journey.modules || []).map((module: any, index: number) => {
                        // Modules MUST have a MongoDB ObjectId _id
                        const moduleId = extractObjectId(module._id);
                        if (!moduleId || !/^[0-9a-fA-F]{24}$/.test(moduleId)) {
                          console.error(`[App] Module at index ${index} does not have a valid MongoDB ObjectId _id:`, module);
                          throw new Error(`Module at index ${index} must have a valid MongoDB ObjectId _id`);
                        }

                        const topics = Array.isArray(module.topics)
                          ? module.topics
                          : (Array.isArray(module.learningObjectives)
                            ? module.learningObjectives.slice(0, 5).map((obj: any) => typeof obj === 'string' ? obj : obj.text || obj.title || '')
                            : []);

                        let duration = 0;
                        if (typeof module.duration === 'number') {
                          duration = module.duration;
                        } else if (Array.isArray(module.content) && module.content.length > 0) {
                          duration = module.content.reduce((sum: number, item: any) => {
                            return sum + (item.duration || 0);
                          }, 0);
                        }
                        const durationHours = duration > 0 ? Math.round(duration / 60 * 10) / 10 : 0;

                        return {
                          id: moduleId,
                          title: module.title || 'Untitled Module',
                          description: module.description || '',
                          duration: durationHours,
                          difficulty: (module.difficulty || 'beginner') as 'beginner' | 'intermediate' | 'advanced',
                          prerequisites: Array.isArray(module.prerequisites) ? module.prerequisites : [],
                          learningObjectives: Array.isArray(module.learningObjectives)
                            ? module.learningObjectives.map((obj: any) => typeof obj === 'string' ? obj : obj.text || obj.title || '')
                            : [],
                          assessments: Array.isArray(module.assessments) ? module.assessments : [],
                          content: Array.isArray(module.content) ? module.content : [],
                          sections: Array.isArray(module.sections) ? module.sections : [],
                          topics: topics,
                          progress: 0,
                          completed: false,
                          order: index,
                          quizIds: Array.isArray(module.quizIds) ? module.quizIds : []
                        };
                      });
                      setSelectedJourneyModules(modules);
                      console.log('[App] Selected journey:', journey.title || journey.name, 'with', modules.length, 'modules');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }
                }}
              />
            ) : (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg mb-2">Aucune formation disponible</p>
                <p className="text-gray-500 text-sm">Les formations seront affichées ici une fois créées.</p>
              </div>
            )}
          </div>
        );
      case 'assessments':
        return <AssessmentCenter assessments={progress.assessments} onAssessmentComplete={handleAssessmentComplete} />;
      case 'live-sessions':
        return <LiveSessions sessions={mockLiveSessions} />;
      case 'knowledge-base':
        return <KnowledgeBase items={mockKnowledgeBase} />;
      case 'schedule':
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Schedule</h2>
            <p className="text-gray-600">Calendar integration coming soon...</p>
          </div>
        );
      case 'certificates':
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Certificates</h2>
            <p className="text-gray-600">Your earned certificates will appear here...</p>
          </div>
        );
      case 'progress':
        return (
          <div className="space-y-6">
            <ProgressOverview stats={progressStats} />
            <AIInsights insights={mockAIInsights} userRole={userRole} />
          </div>
        );
      case 'document-transformer':
        return (
          <DocumentTransformer
            onComplete={(modules) => console.log('Enhanced modules:', modules)}
          />
        );
      case 'methodology':
        return (
          <MethodologyBuilder
            onApplyMethodology={handleMethodologyApply}
            selectedIndustry="health-insurance"
          />
        );
      default:
        return <div>Page not found</div>;
    }
  };

  console.log('[App] Rendering main app layout, activeTab:', activeTab, 'userType:', userType);
  return (
    <div className={`h-full bg-gray-50 relative min-h-[500px] ${isEmbedded ? '' : ''}`}>
      {/* Sidebar - Always rendered first */}
      {!isEmbedded && (
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isOpen={sidebarOpen}
          userType={userType}
        />
      )}

      {/* Overlay for mobile */}
      {!isEmbedded && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content - Always has margin on md+ screens */}
      <div className={`flex flex-col ml-0 ${!isEmbedded ? 'md:ml-64' : ''} transition-all duration-300 min-h-full`}>
        {/* Fixed Top Bar */}
        <div className="bg-white border-b border-gray-200 flex-shrink-0 z-10">
          <div className="flex items-center justify-between px-6 py-2">
            <div className="flex items-center space-x-4">
              {!isEmbedded && (
                <>
                  <span className="text-sm text-gray-600">View as:</span>
                  <div className="flex items-center space-x-2">
                    {(['trainee', 'trainer', 'admin'] as const).map((role) => (
                      <button
                        key={role}
                        onClick={() => handleRoleSwitch(role)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${userRole === role
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                      >
                        {role ? role.charAt(0).toUpperCase() + role.slice(1) : ''}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {!isEmbedded && (
                <button
                  onClick={() => setShowAITutor(!showAITutor)}
                  className="flex items-center space-x-2 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <User className="h-4 w-4" />
                  <span>AI Tutor</span>
                </button>
              )}
              <button
                onClick={() => {
                  if (userType === 'rep') {
                    alert('You do not have permission to create training journeys. Please contact your administrator.');
                    return;
                  }
                  setShowJourneyBuilder(true);
                }}
                disabled={userType === 'rep'}
                className={`flex items-center space-x-2 px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm ${userType === 'rep' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Sparkles className="h-4 w-4" />
                <span>New Journey (IA)</span>
              </button>
              <button
                onClick={() => setShowManualTraining(true)}
                className="flex items-center space-x-2 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                <Upload className="h-4 w-4" />
                <span>Manual Training</span>
              </button>
            </div>
          </div>
        </div>

        {/* Fixed Header */}
        {!isEmbedded && (
          <div className="flex-shrink-0 z-10">
            <Header
              repName={getCurrentUserName()}
              onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
            />
          </div>
        )}

        <main className={`flex-1 flex gap-6 w-full ${selectedModule ? 'p-6 pb-0' : 'p-0'}`} style={{ display: 'flex', flexDirection: 'row', minHeight: 0, overflow: 'visible' }}>
          <div className="flex-1 w-full h-full overflow-y-auto" style={{ minHeight: 0 }}>
            {renderContent()}
          </div>

          {showAITutor && (
            <div className="w-96 flex-shrink-0 overflow-y-auto">
              <AITutor
                tutor={mockAITutor}
                currentModule={selectedModule || undefined}
                onSuggestion={(suggestion) => console.log('AI Suggestion:', suggestion)}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function App() {
  // Determine basename based on context (same logic as dash_rep)
  // Use pathname to determine basename - if pathname starts with /training, we're in Qiankun
  const pathname = window.location.pathname;
  const isStandaloneMode = import.meta.env.VITE_RUN_MODE === 'standalone' || !pathname.startsWith('/training');

  let basename = '/';
  if (!isStandaloneMode) {
    // When running in Qiankun, determine basename from pathname
    // Use the actual pathname to preserve any typos (like "repdashboard")
    if (pathname.startsWith('/training/companydashboard')) {
      basename = '/training/companydashboard';
    } else if (pathname.startsWith('/training/repdashboard')) {
      // Handle "repdashboard" (typo) - use the actual pathname
      basename = '/training/repdashboard';
    } else if (pathname.startsWith('/training/repdashboard')) {
      // Handle "repdashboard" (correct)
      basename = '/training/repdashboard';
    } else if (pathname.startsWith('/training')) {
      basename = '/training';
    }
  }

  // Extract the relative path after basename for debugging
  const relativePath = pathname.replace(basename, '') || '/';

  console.log('[App] Routing configuration:', {
    pathname,
    basename,
    relativePath,
    isStandaloneMode,
    isQiankun: qiankunWindow.__POWERED_BY_QIANKUN__,
    envMode: import.meta.env.VITE_RUN_MODE
  });

  return (
    <Router basename={basename}>
      <Routes>
        {/* Routes with parameters should come before routes without */}
        <Route path="/repdashboard/:idjourneytraining" element={<AppContent />} />
        <Route path="/:idjourneytraining" element={<AppContent />} />
        {/* Routes without parameters */}
        <Route path="/companydashboard" element={<AppContent />} />
        <Route path="/repdashboard" element={<AppContent />} />
        <Route path="/" element={<AppContent />} />
        {/* Catch-all route should be last */}
        <Route path="/*" element={<AppContent />} />
      </Routes>
    </Router>
  );
}

export default App;
