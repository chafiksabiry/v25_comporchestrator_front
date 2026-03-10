import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, MessageSquare, Star, Users, Rocket, ArrowLeft, Clock, BarChart3, Eye, Play, Zap, Video, ChevronDown, ChevronUp, FileQuestion, Loader2, FileText, Edit3, Save, X as XIcon } from 'lucide-react';
import { TrainingJourney, TrainingModule, RehearsalFeedback, Rep, Assessment, Question } from '../../types';
import DocumentViewer from '../DocumentViewer/DocumentViewer';
import { JourneyService } from '../../infrastructure/services/JourneyService';
import { DraftService } from '../../infrastructure/services/DraftService';
import { AIService } from '../../infrastructure/services/AIService';
import axios from 'axios';
import Cookies from 'js-cookie';

interface LaunchApprovalProps {
  journey: TrainingJourney;
  modules: TrainingModule[];
  rehearsalFeedback: RehearsalFeedback[];
  rehearsalRating: number;
  onLaunch: (journey: TrainingJourney, modules: TrainingModule[], enrolledReps: Rep[]) => void;
  onBackToRehearsal: () => void;
  onBack: () => void;
  gigId?: string | null;
  company?: { industry?: string } | null;
}

export default function LaunchApproval({
  journey,
  modules,
  rehearsalFeedback,
  rehearsalRating,
  onLaunch,
  onBackToRehearsal,
  onBack,
  gigId,
  company
}: LaunchApprovalProps) {
  const [selectedReps, setSelectedReps] = useState<string[]>([]);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [showModulePreviews, setShowModulePreviews] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchSettings, setLaunchSettings] = useState({
    startDate: new Date().toISOString().split('T')[0],
    sendNotifications: true,
    allowSelfPaced: true,
    enableLiveStreaming: true,
    recordSessions: true,
    aiTutorEnabled: true
  });
  const [updatedModules, setUpdatedModules] = useState<TrainingModule[]>(modules);
  const [generatingQuizForModule, setGeneratingQuizForModule] = useState<string | null>(null);
  const [generatingFinalExam, setGeneratingFinalExam] = useState(false);
  const [expandedQuizId, setExpandedQuizId] = useState<string | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editedQuestions, setEditedQuestions] = useState<Record<string, Question>>({});
  // Quiz configuration is now automatic - no modal needed

  // CRITICAL: Load modules from localStorage on mount to get quizzes generated in RehearsalMode
  useEffect(() => {
    const draft = DraftService.getDraft();
    if (draft.modules && draft.modules.length > 0) {
      console.log('[LaunchApproval] Loading modules from localStorage (with quizzes):', draft.modules.length);
      // Check if modules have quizzes
      const modulesWithQuizzes = draft.modules.filter(m => m.assessments && m.assessments.length > 0);
      console.log('[LaunchApproval] Modules with quizzes:', modulesWithQuizzes.length);
      setUpdatedModules(draft.modules);
    } else {
      console.log('[LaunchApproval] No modules found in localStorage, using props');
      setUpdatedModules(modules);
    }
  }, []); // Only run on mount

  // Save edited question
  const saveQuestionEdit = (moduleId: string, assessmentId: string, questionIndex: number, editedQuestion: Question) => {
    const updatedModulesList = updatedModules.map(m => {
      if (m.id === moduleId) {
        const updatedAssessments = (m.assessments || []).map(a => {
          if (a.id === assessmentId && a.questions) {
            const updatedQuestions = [...a.questions];
            updatedQuestions[questionIndex] = editedQuestion;
            return { ...a, questions: updatedQuestions };
          }
          return a;
        });
        return { ...m, assessments: updatedAssessments };
      }
      return m;
    });
    setUpdatedModules(updatedModulesList);
    setEditingQuestionId(null);
    setEditedQuestions({});
  };

  // Get API base URL
  const getApiBaseUrl = () => {
    if (import.meta.env.VITE_API_TRAINING_URL) {
      return import.meta.env.VITE_API_TRAINING_URL;
    }
    return 'https://v25platformtrainingbackend-production.up.railway.app';
  };
  const API_BASE = getApiBaseUrl();

  // Generate quiz automatically with predefined configuration
  const showQuizConfig = (module: TrainingModule, isFinalExam: boolean = false) => {
    // Automatically generate quiz with predefined configuration
    // Module: 10 questions (4 QCM, 3 True/False, 3 Multiple Correct Answers)
    // Final Exam: 30 questions (12 QCM, 9 True/False, 9 Multiple Correct Answers)
    const config = isFinalExam
      ? { totalQuestions: 30, passingScore: 70, multipleChoice: 12, trueFalse: 9, multipleCorrect: 9 }
      : { totalQuestions: 10, passingScore: 70, multipleChoice: 4, trueFalse: 3, multipleCorrect: 3 };

    generateModuleQuiz(module, isFinalExam, config);
  };

  // Generate quiz for a module with automatic configuration
  const generateModuleQuiz = async (module: TrainingModule, isFinalExam: boolean = false, config?: {
    totalQuestions: number;
    passingScore: number;
    multipleChoice: number;
    trueFalse: number;
    multipleCorrect: number;
  }) => {
    const moduleId = module.id;

    // Only set generatingQuizForModule if it's NOT a final exam
    if (!isFinalExam) {
      setGeneratingQuizForModule(moduleId);
    } else {
      setGeneratingFinalExam(true);
    }

    // Default configuration if not provided
    // Final Exam: 30 questions (12 QCM, 9 True/False, 9 Multiple Correct Answers)
    // Module Quiz: 10 questions (4 QCM, 3 True/False, 3 Multiple Correct Answers)
    const finalConfig = config || (isFinalExam
      ? { totalQuestions: 30, passingScore: 70, multipleChoice: 12, trueFalse: 9, multipleCorrect: 9 }
      : { totalQuestions: 10, passingScore: 70, multipleChoice: 4, trueFalse: 3, multipleCorrect: 3 });

    console.log(`📊 ${isFinalExam ? 'Final Exam' : 'Quiz'} Configuration: ${finalConfig.totalQuestions} questions (${finalConfig.multipleChoice} QCM, ${finalConfig.trueFalse} True/False, ${finalConfig.multipleCorrect} Multiple Correct Answers)`);

    try {
      // Prepare module content in the format expected by the backend
      // For final exam, use minimal content to avoid token limits
      // Only include titles and learning objectives, NO section content text
      const moduleContent = {
        title: module.title,
        description: isFinalExam ? (module.description || '').substring(0, 100) : (module.description || ''),
        learningObjectives: isFinalExam
          ? (module.learningObjectives || []).slice(0, 5) // Limit to 5 objectives for final exam
          : (module.learningObjectives || []),
        sections: (module as any).sections?.map((section: any) => {
          // For final exam, only include title, NO content text to save tokens
          return {
            title: section.title || '',
            content: {
              text: isFinalExam ? '' : (section.content?.text || section.description || section.aiDescription || '')
            }
          };
        }) || []
      };

      // Log only for final exam to track the issue
      if (isFinalExam) {
        console.log(`[Final Exam] Requesting ${finalConfig.totalQuestions} questions (${finalConfig.multipleChoice} QCM, ${finalConfig.trueFalse} True/False, ${finalConfig.multipleCorrect} Multiple Correct)`);
      }

      // Generate quiz using AI service with question type distribution
      const questions = await AIService.generateQuiz(
        moduleContent,
        finalConfig.totalQuestions,
        {
          multipleChoice: finalConfig.multipleChoice,
          trueFalse: finalConfig.trueFalse,
          multipleCorrect: finalConfig.multipleCorrect
        }
      );

      // Verify we received the expected number of questions
      if (questions.length < finalConfig.totalQuestions) {
        console.error(`[Final Exam] ⚠️ Received only ${questions.length} questions out of ${finalConfig.totalQuestions} requested`);
        if (isFinalExam) {
          // For final exam, this is critical - alert the user
          alert(`Warning: Only ${questions.length} questions were generated instead of ${finalConfig.totalQuestions}. The AI may have hit token limits. Please try regenerating.`);
        }
      }

      // Convert to Assessment format, preserving question types
      const assessmentQuestions: Question[] = questions.map((q: any, index: number) => {
        // Determine question type from the question data
        let questionType: 'multiple-choice' | 'true-false' | 'multiple-correct' = 'multiple-choice';

        // Check if it's a true/false question (usually has 2 options: True/False)
        if (q.type === 'true-false' || (q.options && q.options.length === 2 &&
          (q.options[0]?.toLowerCase().includes('true') || q.options[0]?.toLowerCase().includes('vrai') ||
            q.options[1]?.toLowerCase().includes('false') || q.options[1]?.toLowerCase().includes('faux')))) {
          questionType = 'true-false';
        }
        // Check if it's a multiple correct answers question
        else if (q.type === 'multiple-correct' || Array.isArray(q.correctAnswer)) {
          questionType = 'multiple-correct';
        }

        // Ensure True/False questions always have ['True', 'False'] options
        let finalOptions = q.options || [];
        if (questionType === 'true-false' && (!finalOptions || finalOptions.length === 0)) {
          finalOptions = ['True', 'False'];
        }

        return {
          id: `q${index + 1}`,
          text: q.text || q.question,
          type: questionType,
          options: finalOptions,
          correctAnswer: Array.isArray(q.correctAnswer) ? q.correctAnswer : q.correctAnswer,
          explanation: q.explanation || '',
          points: q.points || 10
        };
      });

      // IMPORTANT: Get draftId first to use MongoDB ObjectId instead of journey.id (which might be a timestamp)
      const isValidMongoId = (id: string | undefined) => id && /^[0-9a-fA-F]{24}$/.test(id);
      const currentDraft = DraftService.getDraft();
      const existingDraftId = currentDraft.draftId; // Never use journey.id as it might be a timestamp

      // Validate that it's a MongoDB ObjectId
      if (existingDraftId && !isValidMongoId(existingDraftId)) {
        console.warn('[LaunchApproval] Invalid draftId format (not MongoDB ObjectId):', existingDraftId, '- will use fallback');
      }

      // Use existingDraftId if valid, otherwise use journey._id, never journey.id (timestamp)
      const journeyIdForUse = (existingDraftId && isValidMongoId(existingDraftId))
        ? existingDraftId
        : ((journey as any)._id && isValidMongoId((journey as any)._id))
          ? (journey as any)._id
          : undefined;

      // Calculate passing score (always 70% - percentage, not points)
      const totalPoints = assessmentQuestions.reduce((sum, q) => sum + (q.points || 10), 0);
      const passingScore = 70; // Always 70% (percentage)

      // Create assessment
      const assessment: Assessment = {
        id: isFinalExam
          ? `final-exam-${journeyIdForUse || 'new'}`
          : `assessment-${moduleId}-${Date.now()}`,
        title: isFinalExam
          ? `Examen Final - ${journey.name}`
          : `Quiz - ${module.title}`,
        type: 'quiz',
        questions: assessmentQuestions,
        passingScore: passingScore,
        timeLimit: assessmentQuestions.length * 2 // 2 minutes per question
      };

      // Update module with new assessment (replace existing quiz instead of adding)
      const updatedModulesList = updatedModules.map(m => {
        if (m.id === moduleId) {
          // Remove existing quiz for this module (keep only final exam if it exists and this is not final exam)
          const existingAssessments = (m.assessments || []).filter(a => {
            if (isFinalExam) {
              // If generating final exam, remove only existing final exam
              return !a.id?.startsWith('final-exam-');
            } else {
              // If generating regular quiz, remove only regular quizzes (keep final exam)
              return a.id?.startsWith('final-exam-');
            }
          });

          return {
            ...m,
            assessments: [...existingAssessments, assessment] // Replace with new assessment
          };
        }
        return m;
      });

      setUpdatedModules(updatedModulesList);

      // CRITICAL: Only save locally, NOT to backend during quiz generation
      // This prevents deleting and recreating modules unnecessarily
      // The quizzes will be saved to backend when the journey is launched
      try {
        console.log('[LaunchApproval] Saving quiz locally only (not to backend yet)');

        // Save locally to preserve the quiz in localStorage
        DraftService.saveDraftLocally({
          modules: updatedModulesList
        });
        console.log('[LaunchApproval] ✓ Quiz saved locally');
      } catch (draftError) {
        console.warn('[LaunchApproval] Could not save quiz locally:', draftError);
      }

      // NOTE: We do NOT save to backend here because:
      // 1. Modules might still have temporary IDs (module-1, module-2, etc.)
      // 2. Saving to backend would delete and recreate all modules unnecessarily
      // 3. Quizzes will be properly saved when the journey is launched via JourneyService.launchJourney
      console.log('[LaunchApproval] Quiz will be saved to backend when journey is launched');

      if (isFinalExam) {
        console.log(`[Final Exam] Generated ${assessmentQuestions.length} questions (requested: ${finalConfig.totalQuestions})`);
        if (assessmentQuestions.length !== finalConfig.totalQuestions) {
          console.error(`[Final Exam] ❌ ERROR: Expected ${finalConfig.totalQuestions} questions but got ${assessmentQuestions.length}`);
        }
      }
    } catch (error) {
      console.error(`❌ Error generating ${isFinalExam ? 'final exam' : 'quiz'}:`, error);
      alert(`Erreur lors de la génération du ${isFinalExam ? 'examen final' : 'quiz'}. Veuillez réessayer.`);
    } finally {
      if (!isFinalExam) {
        setGeneratingQuizForModule(null);
      } else {
        setGeneratingFinalExam(false);
      }
    }
  };

  // Mock REPs data
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

  const handleLaunch = async () => {
    setIsLaunching(true);
    try {
      const enrolledReps = availableReps.filter(rep => selectedReps.includes(rep.id));
      const updatedJourney: TrainingJourney = {
        ...journey,
        status: 'active',
        steps: journey.steps.map(step => ({ ...step, status: 'completed' }))
      };

      // Get companyId from cookies
      const companyId = Cookies.get('companyId');

      // ✅ Sauvegarder dans MongoDB with companyId and gigId
      // Add industry to journey if available from company
      const journeyWithIndustry = {
        ...updatedJourney,
        industry: company?.industry || (updatedJourney as any).industry || null
      };

      // Get draftId from DraftService to use existing journey
      // IMPORTANT: Only use MongoDB ObjectId format (24 hex characters)
      // Don't use timestamps or other non-MongoDB IDs from journey.id
      const isValidMongoId = (id: string | undefined) => id && /^[0-9a-fA-F]{24}$/.test(id);

      const draft = DraftService.getDraft();
      let existingJourneyId = draft.draftId || (journey as any)._id; // Never use journey.id as it might be a timestamp

      // Validate that it's a MongoDB ObjectId
      if (existingJourneyId && !isValidMongoId(existingJourneyId)) {
        console.warn('[LaunchApproval] Invalid journeyId format (not MongoDB ObjectId):', existingJourneyId, '- will create new journey');
        existingJourneyId = undefined;
      }

      console.log('[LaunchApproval] Launching journey with ID:', existingJourneyId || 'NEW');

      // CRITICAL: Re-load modules from localStorage right before launch to ensure we have the latest quizzes
      const latestDraft = DraftService.getDraft();
      const modulesToLaunch = latestDraft.modules && latestDraft.modules.length > 0 ? latestDraft.modules : updatedModules;

      // Log quiz information for debugging
      const modulesWithQuizzes = modulesToLaunch.filter(m => m.assessments && m.assessments.length > 0);
      console.log('[LaunchApproval] Modules to launch:', modulesToLaunch.length);
      console.log('[LaunchApproval] Modules with quizzes:', modulesWithQuizzes.length);
      modulesToLaunch.forEach((m, idx) => {
        const quizCount = m.assessments ? m.assessments.length : 0;
        console.log(`[LaunchApproval] Module ${idx + 1} (${m.title}): ${quizCount} quiz(es)`);
      });

      const launchResponse = await JourneyService.launchJourney({
        journey: journeyWithIndustry,
        modules: modulesToLaunch, // Use modules from localStorage with quizzes
        enrolledRepIds: enrolledReps.map(r => r.id),
        launchSettings: launchSettings,
        rehearsalData: {
          rating: rehearsalRating,
          modulesCompleted: modulesToLaunch.length,
          feedback: rehearsalFeedback.map(f => f.message)
        },
        companyId: companyId || undefined,
        gigId: gigId || undefined
      }, undefined, existingJourneyId); // Pass existingJourneyId as third parameter

      console.log('✅ Journey saved to MongoDB:', launchResponse);

      // Update onboarding progress for Step 11 (REP Onboarding)
      if (companyId) {
        try {
          const onboardingApiUrl = 'https://v25searchcompanywizardbackend-production.up.railway.app/api';
          const onboardingEndpoint = `${onboardingApiUrl}/onboarding/companies/${companyId}/onboarding/phases/3/steps/9`;
          console.log('[LaunchApproval] Updating onboarding progress:', onboardingEndpoint);

          await axios.put(onboardingEndpoint, { status: "completed" });
          console.log('[LaunchApproval] Onboarding Step 11 marked as completed');
        } catch (onboardingError) {
          console.error('[LaunchApproval] Failed to update onboarding progress:', onboardingError);
          // Don't alert the user here, the journey launch itself was successful
        }
      }

      console.log('📊 Launching with:', {
        journey: updatedJourney.name,
        modules: modulesToLaunch.length,
        enrolledReps: enrolledReps.length,
        assessments: updatedModules.reduce((sum, m) => sum + (m.assessments?.length || 0), 0)
      });

      onLaunch(updatedJourney, modulesToLaunch, enrolledReps);
    } catch (error) {
      console.error('❌ Failed to save journey to MongoDB:', error);
      alert('Erreur lors de la sauvegarde du training. Veuillez réessayer.');
    } finally {
      setIsLaunching(false);
    }
  };

  const toggleModuleExpansion = (moduleId: string) => {
    setExpandedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const highPriorityIssues = rehearsalFeedback.filter(f => f.severity === 'high');
  const mediumPriorityIssues = rehearsalFeedback.filter(f => f.severity === 'medium');
  const suggestions = rehearsalFeedback.filter(f => f.type === 'suggestion');

  const isReadyForLaunch = rehearsalRating >= 3 && highPriorityIssues.length === 0;

  const getFeedbackIcon = (type: RehearsalFeedback['type']) => {
    switch (type) {
      case 'content':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'technical':
        return <Zap className="h-4 w-4 text-red-500" />;
      case 'engagement':
        return <BarChart3 className="h-4 w-4 text-green-500" />;
      case 'suggestion':
        return <MessageSquare className="h-4 w-4 text-purple-500" />;
      default:
        return <MessageSquare className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-green-50 to-emerald-50">
      <div className="container mx-auto px-4 py-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-4">
            <div className="inline-flex items-center space-x-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-200 mb-3">
              <Eye className="h-4 w-4 text-green-500" />
              <span className="text-xs font-medium text-gray-700">Rehearsal Complete - Ready for Launch</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1.5">Launch Approval</h2>
            <p className="text-base text-gray-600 max-w-3xl mx-auto">
              Review your rehearsal results and approve the training journey for deployment to your team.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Rehearsal Summary */}
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Rehearsal Summary</h3>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg">
                    <Play className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <div className="text-xl font-bold text-blue-600 mb-1">{modules.length}</div>
                    <div className="text-xs text-gray-600">Modules Tested</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg">
                    <MessageSquare className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <div className="text-xl font-bold text-purple-600 mb-1">{rehearsalFeedback.length}</div>
                    <div className="text-xs text-gray-600">Feedback Items</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg">
                    <Star className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                    <div className="text-xl font-bold text-yellow-600 mb-1">{rehearsalRating}/5</div>
                    <div className="text-xs text-gray-600">Overall Rating</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
                    <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <div className="text-xl font-bold text-green-600 mb-1">
                      {isReadyForLaunch ? 'Ready' : 'Review'}
                    </div>
                    <div className="text-xs text-gray-600">Launch Status</div>
                  </div>
                </div>

                {/* Launch Readiness */}
                <div className={`p-4 rounded-lg border-2 ${isReadyForLaunch
                  ? 'bg-green-50 border-green-200'
                  : 'bg-yellow-50 border-yellow-200'
                  }`}>
                  <div className="flex items-center space-x-3 mb-3">
                    {isReadyForLaunch ? (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-6 w-6 text-yellow-600" />
                    )}
                    <h4 className={`text-lg font-semibold ${isReadyForLaunch ? 'text-green-900' : 'text-yellow-900'
                      }`}>
                      {isReadyForLaunch ? 'Ready for Launch!' : 'Review Required'}
                    </h4>
                  </div>
                  <p className={`text-sm ${isReadyForLaunch ? 'text-green-700' : 'text-yellow-700'
                    }`}>
                    {isReadyForLaunch
                      ? 'Your training journey has passed rehearsal and is ready for deployment to your team.'
                      : 'Please address high-priority issues or improve the overall rating before launching.'
                    }
                  </p>
                </div>
              </div>

              {/* Feedback Analysis */}
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Feedback Analysis</h3>

                {highPriorityIssues.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-red-900 mb-3 flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2" />
                      High Priority Issues ({highPriorityIssues.length})
                    </h4>
                    <div className="space-y-3">
                      {highPriorityIssues.map((feedback) => (
                        <div key={feedback.id} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-start space-x-3">
                            {getFeedbackIcon(feedback.type)}
                            <div className="flex-1">
                              <div className="font-medium text-red-900 capitalize">{feedback.type}</div>
                              <div className="text-red-700 mt-1">{feedback.message}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {mediumPriorityIssues.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-yellow-900 mb-3">
                      Medium Priority Issues ({mediumPriorityIssues.length})
                    </h4>
                    <div className="space-y-3">
                      {mediumPriorityIssues.map((feedback) => (
                        <div key={feedback.id} className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-start space-x-3">
                            {getFeedbackIcon(feedback.type)}
                            <div className="flex-1">
                              <div className="font-medium text-yellow-900 capitalize">{feedback.type}</div>
                              <div className="text-yellow-700 mt-1">{feedback.message}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {suggestions.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-purple-900 mb-3">
                      Suggestions for Improvement ({suggestions.length})
                    </h4>
                    <div className="space-y-3">
                      {suggestions.map((feedback) => (
                        <div key={feedback.id} className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                          <div className="flex items-start space-x-3">
                            {getFeedbackIcon(feedback.type)}
                            <div className="flex-1">
                              <div className="font-medium text-purple-900 capitalize">{feedback.type}</div>
                              <div className="text-purple-700 mt-1">{feedback.message}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {rehearsalFeedback.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p>No feedback was provided during rehearsal.</p>
                  </div>
                )}
              </div>

              {/* Module Previews with Video Scripts */}
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Video className="h-5 w-5 text-purple-600" />
                    <h3 className="text-xl font-semibold text-gray-900">Training Modules</h3>
                  </div>
                  <button
                    onClick={() => setShowModulePreviews(!showModulePreviews)}
                    className="flex items-center space-x-2 text-sm text-purple-600 hover:text-purple-700 font-medium px-4 py-2 border border-purple-200 rounded-lg hover:bg-purple-50 transition-all"
                  >
                    {showModulePreviews ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        <span>Hide Modules</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        <span>Show Modules ({modules.length})</span>
                      </>
                    )}
                  </button>
                </div>

                {showModulePreviews && (
                  <div className="space-y-4">
                    {updatedModules.map((module, index) => {
                      const isLastModule = index === updatedModules.length - 1;
                      return (
                        <div key={module.id} className="border-2 border-gray-200 rounded-xl overflow-hidden">
                          {/* Module Header */}
                          <button
                            onClick={() => toggleModuleExpansion(module.id)}
                            className="w-full px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-purple-50 hover:to-blue-50 transition-all flex items-center justify-between"
                          >
                            <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg flex items-center justify-center font-bold">
                                {index + 1}
                              </div>
                              <div className="text-left">
                                <h4 className="font-semibold text-gray-800">{module.title}</h4>
                                <p className="text-sm text-gray-500">{module.duration} min • {module.difficulty}</p>
                              </div>
                            </div>
                            {expandedModules.includes(module.id) ? (
                              <ChevronUp className="h-5 w-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            )}
                          </button>

                          {/* Module Content */}
                          {expandedModules.includes(module.id) && (
                            <div className="p-6 bg-white">
                              <div className="mb-4">
                                <h5 className="font-semibold text-gray-700 mb-2">Description</h5>
                                <p className="text-gray-600">{module.description}</p>
                              </div>

                              <div className="mb-6">
                                <h5 className="font-semibold text-gray-700 mb-2">Learning Objectives</h5>
                                <ul className="list-disc list-inside space-y-1 text-gray-600">
                                  {module.learningObjectives.map((obj, i) => (
                                    <li key={i}>{obj}</li>
                                  ))}
                                </ul>
                              </div>

                              {/* Document Display */}
                              {(module as any).sections && (module as any).sections.length > 0 && (
                                <div className="mb-6">
                                  <h5 className="font-semibold text-gray-700 mb-3 flex items-center space-x-2">
                                    <FileText className="h-5 w-5 text-purple-600" />
                                    <span>Module Document</span>
                                  </h5>
                                  {(module as any).sections.map((section: any, sectionIndex: number) => {
                                    if (section.type === 'document' && section.content?.file?.url) {
                                      return (
                                        <div key={sectionIndex} className="mb-4">
                                          <DocumentViewer
                                            fileUrl={section.content.file.url}
                                            fileName={section.content.file.name}
                                            mimeType={section.content.file.mimeType}
                                          />
                                        </div>
                                      );
                                    }
                                    return null;
                                  })}
                                </div>
                              )}

                              {/* Quiz Generation Section */}
                              <div className="border-t border-gray-200 pt-6">
                                <div className="flex items-center justify-between mb-4">
                                  <h5 className="font-semibold text-gray-700 flex items-center space-x-2">
                                    <FileQuestion className="h-5 w-5 text-purple-600" />
                                    <span>Assessments & Quizzes</span>
                                  </h5>
                                  <div className="flex items-center space-x-2">
                                    {(() => {
                                      const hasRegularQuiz = module.assessments?.some(a => !a.id?.startsWith('final-exam-'));
                                      const hasFinalExam = module.assessments?.some(a => a.id?.startsWith('final-exam-'));

                                      return (
                                        <>
                                          <button
                                            onClick={() => showQuizConfig(module, false)}
                                            disabled={generatingQuizForModule === module.id}
                                            className="flex items-center space-x-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                                          >
                                            {generatingQuizForModule === module.id ? (
                                              <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span>Generating...</span>
                                              </>
                                            ) : (
                                              <>
                                                <FileQuestion className="h-4 w-4" />
                                                <span>{hasRegularQuiz ? 'Regenerate Quiz' : 'Generate Quiz'}</span>
                                              </>
                                            )}
                                          </button>
                                          {isLastModule && (
                                            <button
                                              onClick={() => showQuizConfig(module, true)}
                                              disabled={generatingFinalExam}
                                              className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                                            >
                                              {generatingFinalExam ? (
                                                <>
                                                  <Loader2 className="h-4 w-4 animate-spin" />
                                                  <span>Generating...</span>
                                                </>
                                              ) : (
                                                <>
                                                  <FileQuestion className="h-4 w-4" />
                                                  <span>{hasFinalExam ? 'Regenerate Final Exam' : 'Generate Final Exam'}</span>
                                                </>
                                              )}
                                            </button>
                                          )}
                                        </>
                                      );
                                    })()}
                                  </div>
                                </div>

                                {/* Display existing assessments */}
                                {module.assessments && module.assessments.length > 0 ? (
                                  <div className="space-y-3">
                                    {module.assessments.map((assessment, idx) => {
                                      const isExpanded = expandedQuizId === assessment.id;

                                      return (
                                        <div key={idx} className="bg-white rounded-lg border border-purple-200 overflow-hidden">
                                          <div className="p-3 flex items-center justify-between">
                                            <div className="flex-1">
                                              <h6 className="font-medium text-gray-900 text-sm mb-1">{assessment.title}</h6>
                                              <div className="flex items-center space-x-3 text-xs text-gray-600">
                                                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                                                  {assessment.questions?.length || 0} questions
                                                </span>
                                                <span>Type: {assessment.type || 'quiz'}</span>
                                                <span>Passing Score: {(() => {
                                                  const totalPts = assessment.questions?.reduce((sum, q) => sum + (q.points || 10), 0) || 0;
                                                  const minPassing = Math.round(totalPts * 0.7);
                                                  const actualPassing = assessment.passingScore || minPassing;
                                                  // Always display 70% to match requirement
                                                  return `${actualPassing} pts (70%)`;
                                                })()}</span>
                                              </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                              <CheckCircle className="h-4 w-4 text-purple-600" />
                                              <button
                                                onClick={() => setExpandedQuizId(isExpanded ? null : assessment.id)}
                                                className="ml-2 px-3 py-1 text-xs text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                              >
                                                {isExpanded ? 'Hide' : 'View Questions'}
                                              </button>
                                            </div>
                                          </div>

                                          {/* Expanded Quiz Details */}
                                          {isExpanded && assessment.questions && (
                                            <div className="border-t border-purple-200 p-4 bg-gray-50">
                                              <div className="space-y-4 max-h-96 overflow-y-auto">
                                                {assessment.questions.map((question, qIdx) => {
                                                  const questionKey = `${assessment.id}-q${qIdx}`;
                                                  const isEditing = editingQuestionId === questionKey;
                                                  const editedQuestion = editedQuestions[questionKey] || question;

                                                  return (
                                                    <div key={qIdx} className="bg-white rounded-lg p-4 border border-gray-200">
                                                      <div className="flex items-start justify-between mb-2">
                                                        {isEditing ? (
                                                          <div className="flex-1">
                                                            <input
                                                              type="text"
                                                              value={editedQuestion.text}
                                                              onChange={(e) => setEditedQuestions({
                                                                ...editedQuestions,
                                                                [questionKey]: { ...editedQuestion, text: e.target.value }
                                                              })}
                                                              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3"
                                                              placeholder="Question text"
                                                            />
                                                            <div className="space-y-2">
                                                              {editedQuestion.options?.map((option, optIdx) => (
                                                                <div key={optIdx} className="flex items-center space-x-2">
                                                                  <input
                                                                    type="radio"
                                                                    name={`correct-${questionKey}`}
                                                                    checked={option === editedQuestion.correctAnswer}
                                                                    onChange={() => setEditedQuestions({
                                                                      ...editedQuestions,
                                                                      [questionKey]: { ...editedQuestion, correctAnswer: option }
                                                                    })}
                                                                    className="text-green-600"
                                                                  />
                                                                  <input
                                                                    type="text"
                                                                    value={option}
                                                                    onChange={(e) => {
                                                                      const newOptions = [...(editedQuestion.options || [])];
                                                                      newOptions[optIdx] = e.target.value;
                                                                      setEditedQuestions({
                                                                        ...editedQuestions,
                                                                        [questionKey]: { ...editedQuestion, options: newOptions }
                                                                      });
                                                                    }}
                                                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                                                                    placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                                                                  />
                                                                </div>
                                                              ))}
                                                            </div>
                                                            <textarea
                                                              value={editedQuestion.explanation || ''}
                                                              onChange={(e) => setEditedQuestions({
                                                                ...editedQuestions,
                                                                [questionKey]: { ...editedQuestion, explanation: e.target.value }
                                                              })}
                                                              className="w-full mt-3 px-3 py-2 border border-gray-300 rounded-lg"
                                                              placeholder="Explanation (optional)"
                                                              rows={2}
                                                            />
                                                            <div className="flex items-center space-x-2 mt-3">
                                                              <button
                                                                onClick={() => saveQuestionEdit(module.id, assessment.id, qIdx, editedQuestion)}
                                                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                                                              >
                                                                <Save className="h-4 w-4" />
                                                                <span>Save</span>
                                                              </button>
                                                              <button
                                                                onClick={() => {
                                                                  setEditingQuestionId(null);
                                                                  setEditedQuestions({});
                                                                }}
                                                                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors flex items-center space-x-2"
                                                              >
                                                                <XIcon className="h-4 w-4" />
                                                                <span>Cancel</span>
                                                              </button>
                                                            </div>
                                                          </div>
                                                        ) : (
                                                          <>
                                                            <div className="flex-1">
                                                              <h5 className="font-medium text-gray-900 text-sm">
                                                                Question {qIdx + 1}: {question.text}
                                                              </h5>
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                              <span className="text-xs text-gray-500">{question.points || 10} pts</span>
                                                              <button
                                                                onClick={() => {
                                                                  setEditingQuestionId(questionKey);
                                                                  setEditedQuestions({ [questionKey]: { ...question } });
                                                                }}
                                                                className="p-1 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                                                title="Edit question"
                                                              >
                                                                <Edit3 className="h-4 w-4" />
                                                              </button>
                                                            </div>
                                                          </>
                                                        )}
                                                      </div>
                                                      {!isEditing && (
                                                        <>
                                                          <div className="space-y-2 mt-3">
                                                            {(() => {
                                                              // Get options based on question type
                                                              let options: string[] = [];
                                                              const isMultipleCorrect = question.type === 'multiple-correct';
                                                              const isTrueFalse = question.type === 'true-false';

                                                              if (isTrueFalse) {
                                                                // True/False questions always have these options
                                                                options = ['True', 'False'];
                                                              } else if (question.options && question.options.length > 0) {
                                                                options = question.options;
                                                              }

                                                              // Determine if an option is correct
                                                              const isOptionCorrect = (option: string, optIdx: number) => {
                                                                if (isMultipleCorrect) {
                                                                  // For multiple correct, correctAnswer is an array
                                                                  return Array.isArray(question.correctAnswer)
                                                                    ? question.correctAnswer.includes(option) || question.correctAnswer.includes(optIdx)
                                                                    : false;
                                                                } else if (isTrueFalse) {
                                                                  // For True/False, correctAnswer might be boolean, string, or index
                                                                  const correct = question.correctAnswer;
                                                                  if (typeof correct === 'boolean') {
                                                                    return (option === 'True' && correct) || (option === 'False' && !correct);
                                                                  } else if (typeof correct === 'string') {
                                                                    return option.toLowerCase() === correct.toLowerCase();
                                                                  } else {
                                                                    return optIdx === correct;
                                                                  }
                                                                } else {
                                                                  // For single choice, compare directly
                                                                  return option === question.correctAnswer || optIdx === question.correctAnswer;
                                                                }
                                                              };

                                                              return options.length > 0 ? options.map((option, optIdx) => {
                                                                const isCorrect = isOptionCorrect(option, optIdx);
                                                                const inputType = isMultipleCorrect ? 'checkbox' : 'radio';
                                                                const isChecked = isCorrect; // Pre-select correct answers

                                                                return (
                                                                  <div
                                                                    key={optIdx}
                                                                    className={`p-3 rounded-lg transition-all ${isCorrect
                                                                      ? 'bg-green-50 border-2 border-green-500 shadow-sm'
                                                                      : 'bg-gray-50 border border-gray-200'
                                                                      }`}
                                                                  >
                                                                    <div className="flex items-center space-x-3">
                                                                      <input
                                                                        type={inputType}
                                                                        name={`question-${questionKey}`}
                                                                        checked={isChecked}
                                                                        readOnly
                                                                        className={isMultipleCorrect ? 'w-4 h-4 text-green-600' : 'w-4 h-4 text-green-600'}
                                                                      />
                                                                      <span className={`text-xs font-medium ${isCorrect ? 'text-green-800 font-semibold' : 'text-gray-700'
                                                                        }`}>
                                                                        {String.fromCharCode(65 + optIdx)}.
                                                                      </span>
                                                                      <span className={`text-xs flex-1 ${isCorrect ? 'text-green-900 font-medium' : 'text-gray-700'
                                                                        }`}>
                                                                        {option}
                                                                      </span>
                                                                      {isCorrect && (
                                                                        <span className="flex-shrink-0 px-2 py-1 bg-green-500 text-white text-xs font-semibold rounded-full">
                                                                          Correct
                                                                        </span>
                                                                      )}
                                                                    </div>
                                                                  </div>
                                                                );
                                                              }) : (
                                                                <div className="text-xs text-gray-500 italic">
                                                                  {isTrueFalse ? 'True/False question (options not defined)' : 'No options available'}
                                                                </div>
                                                              );
                                                            })()}
                                                          </div>
                                                          {question.explanation && (
                                                            <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                                                              <p className="text-xs text-blue-900">
                                                                <strong>Explanation:</strong> {question.explanation}
                                                              </p>
                                                            </div>
                                                          )}
                                                        </>
                                                      )}
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="text-center py-4 text-gray-500 text-sm">
                                    <FileQuestion className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                    <p>No quiz generated for this module</p>
                                    <p className="text-xs mt-1">Click on "Generate Quiz" to create a quiz with AI</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {!showModulePreviews && (
                  <div className="text-center py-8 text-gray-500">
                    <Video className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="mb-2">Click "Show Modules" to preview video scripts</p>
                    <p className="text-sm text-gray-400">{modules.length} training modules ready</p>
                  </div>
                )}
              </div>

              {/* Team Selection */}
              {isReadyForLaunch && (
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">Select Team Members</h3>
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
              )}
            </div>

            {/* Actions Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Launch Settings */}
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Launch Settings</h3>

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

                  <div className="space-y-3">
                    <label className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Send notifications</span>
                      <input
                        type="checkbox"
                        checked={launchSettings.sendNotifications}
                        onChange={(e) => setLaunchSettings(prev => ({ ...prev, sendNotifications: e.target.checked }))}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      />
                    </label>

                    <label className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Self-paced learning</span>
                      <input
                        type="checkbox"
                        checked={launchSettings.allowSelfPaced}
                        onChange={(e) => setLaunchSettings(prev => ({ ...prev, allowSelfPaced: e.target.checked }))}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      />
                    </label>

                    <label className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Live streaming</span>
                      <input
                        type="checkbox"
                        checked={launchSettings.enableLiveStreaming}
                        onChange={(e) => setLaunchSettings(prev => ({ ...prev, enableLiveStreaming: e.target.checked }))}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      />
                    </label>

                    <label className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">AI tutor</span>
                      <input
                        type="checkbox"
                        checked={launchSettings.aiTutorEnabled}
                        onChange={(e) => setLaunchSettings(prev => ({ ...prev, aiTutorEnabled: e.target.checked }))}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      />
                    </label>
                  </div>

                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">🚀 Ready for Deployment</h4>
                    <div className="text-sm text-blue-700 space-y-1">
                      <div>• 360° methodology components integrated</div>
                      <div>• Regional compliance and contact centre training included</div>
                      <div>• Real-time progress tracking and AI tutor enabled</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Actions</h3>

                <div className="space-y-3">
                  <button
                    onClick={onBackToRehearsal}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
                  >
                    <Eye className="h-4 w-4" />
                    <span>Back to Rehearsal</span>
                  </button>

                  {!isReadyForLaunch ? (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm font-medium text-yellow-900">Review Required</span>
                      </div>
                      <p className="text-xs text-yellow-700">
                        Address high-priority issues or improve rating to enable launch.
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={handleLaunch}
                      disabled={selectedReps.length === 0 || isLaunching}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                    >
                      {isLaunching ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Saving to Database...</span>
                        </>
                      ) : (
                        <>
                          <Rocket className="h-4 w-4" />
                          <span>Launch Training Journey</span>
                        </>
                      )}
                    </button>
                  )}
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
                Rehearsal Rating: {rehearsalRating}/5 stars
              </div>
              <div className="flex items-center space-x-2">
                {isReadyForLaunch ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-600 font-medium">Ready for Launch</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm text-yellow-600 font-medium">Review Required</span>
                  </>
                )}
              </div>
            </div>

            <div className="w-32"></div> {/* Spacer for alignment */}
          </div>
        </div>
      </div>

    </div>
  );
}
