import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Volume2,
  VolumeX,
  Maximize,
  Settings,
  BookOpen,
  Video,
  Headphones,
  Zap,
  Target,
  Clock,
  Award,
  Brain,
  MessageSquare,
  ThumbsUp,
  Heart,
  Lightbulb,
  HelpCircle,
  BarChart3,
  TrendingUp,
  Eye,
  Star,
  FileText
} from 'lucide-react';
import { TrainingModule, Rep, Exercise, Quiz } from '../../types';
import { ProgressService } from '../../infrastructure/services/ProgressService';
import { extractObjectId } from '../../lib/mongoUtils';
import { SectionContent } from './SectionContent';
import { ModuleSidebar } from './ModuleSidebar';
import { ModuleQuiz } from './ModuleQuiz';

interface TraineeModulePlayerProps {
  module: TrainingModule;
  trainee: Rep;
  journeyId?: string; // ID of the training journey
  moduleIndex?: number; // Index of module in the journey (for ID normalization)
  onProgress: (progress: number) => void;
  onComplete: () => void;
  onBack: () => void;
  onNextModule?: () => void; // Callback to navigate to next module
  totalModules?: number; // Total number of modules in the journey
  onQuizComplete?: () => void; // Callback to reload progress after quiz is saved
  visualTheme?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    fontFamily?: string;
    layoutStyle?: 'modern' | 'corporate' | 'creative';
  };
  fileTrainingUrl?: string; // URL of the generated PPTX presentation
}

export default function TraineeModulePlayer({
  module,
  trainee,
  journeyId,
  moduleIndex,
  onProgress,
  onComplete,
  onBack,
  onNextModule,
  totalModules,
  onQuizComplete,
  visualTheme,
  fileTrainingUrl
}: TraineeModulePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [sectionProgress, setSectionProgress] = useState(0);
  const [engagementScore, setEngagementScore] = useState(85);
  const [comprehensionScore, setComprehensionScore] = useState(78);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [showQuizResult, setShowQuizResult] = useState(false);
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [moduleCompleted, setModuleCompleted] = useState(false);
  const [showModuleQuiz, setShowModuleQuiz] = useState(false);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [allQuizzesPassed, setAllQuizzesPassed] = useState(false);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [showPresentation, setShowPresentation] = useState(!!fileTrainingUrl);

  // Apply visual theme via CSS variables
  useEffect(() => {
    if (visualTheme) {
      const root = document.documentElement;
      if (visualTheme.primaryColor) root.style.setProperty('--primary-color', visualTheme.primaryColor);
      if (visualTheme.secondaryColor) root.style.setProperty('--secondary-color', visualTheme.secondaryColor);
      if (visualTheme.accentColor) root.style.setProperty('--accent-color', visualTheme.accentColor);
      if (visualTheme.fontFamily) root.style.setProperty('--font-family', visualTheme.fontFamily);

      return () => {
        // Reset to defaults on unmount
        root.style.removeProperty('--primary-color');
        root.style.removeProperty('--secondary-color');
        root.style.removeProperty('--accent-color');
        root.style.removeProperty('--font-family');
      };
    }
  }, [visualTheme]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const lastSavedProgress = useRef<number>(0);

  // Save progress to backend periodically
  const saveProgressToBackend = async (progressPercent: number, timeSpentSeconds: number) => {
    if (!journeyId || !trainee.id) return;

    // Module MUST have a MongoDB ObjectId _id
    const moduleId = extractObjectId((module as any)._id) || extractObjectId(module.id);
    if (!moduleId || !/^[0-9a-fA-F]{24}$/.test(moduleId)) {
      console.error('[TraineeModulePlayer] Module must have a valid MongoDB ObjectId _id:', module);
      return;
    }

    // Only save if progress changed significantly (more than 5%) or every 2 minutes
    const progressDiff = Math.abs(progressPercent - lastSavedProgress.current);
    if (progressDiff < 5 && timeSpentSeconds % 120 !== 0) return;

    const timeSpentMinutes = Math.floor(timeSpentSeconds / 60);
    const status = ProgressService.getStatusFromProgress(progressPercent);

    try {
      await ProgressService.updateProgress({
        repId: trainee.id,
        journeyId: journeyId,
        moduleId: moduleId,
        progress: Math.round(progressPercent),
        status: status,
        timeSpent: timeSpentMinutes,
        engagementScore: engagementScore
      });
      lastSavedProgress.current = progressPercent;
    } catch (error) {
      console.error('Error saving progress to backend:', error);
    }
  };

  // Helper function to get quiz questions from module (supports both assessments and quizzes)
  const getQuizQuestions = (): any[] => {
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
  };

  // Helper function to get quiz metadata (passingScore, totalPoints)
  // passingScore is always a percentage (70% by default)
  const getQuizMetadata = (): { passingScore: number; totalPoints: number; passingScoreIsPercentage: boolean } => {
    const moduleAny = module as any;
    let passingScore = 70; // Default is always 70% (percentage)
    let totalPoints = 0;
    const passingScoreIsPercentage = true; // Always percentage

    // Check quizzes first (new structure)
    if (moduleAny.quizzes && Array.isArray(moduleAny.quizzes) && moduleAny.quizzes.length > 0) {
      const firstQuiz = moduleAny.quizzes[0];
      if (firstQuiz) {
        // passingScore is always a percentage (70% by default)
        passingScore = firstQuiz.passingScore || 70;
        const questions = getQuizQuestions();
        totalPoints = questions.reduce((sum: number, q: any) => sum + (q.points || 10), 0);
      }
    } else if (module.assessments && Array.isArray(module.assessments) && module.assessments.length > 0) {
      const firstAssessment = module.assessments[0];
      if (firstAssessment) {
        // passingScore is always a percentage (70% by default)
        passingScore = firstAssessment.passingScore || 70;
        const questions = getQuizQuestions();
        totalPoints = questions.reduce((sum: number, q: any) => sum + (q.points || 10), 0);
      }
    } else {
      const questions = getQuizQuestions();
      totalPoints = questions.reduce((sum: number, q: any) => sum + (q.points || 10), 0);
    }

    return { passingScore, totalPoints, passingScoreIsPercentage };
  };

  // Calculate quiz score
  const calculateQuizScore = (): { score: number; totalPoints: number; percentage: number; passed: boolean; passingScore: number; passingScoreIsPercentage: boolean } => {
    const questions = getQuizQuestions();
    const { passingScore, totalPoints, passingScoreIsPercentage } = getQuizMetadata();

    let score = 0;
    questions.forEach((q: any, idx: number) => {
      const answer = quizAnswers[idx];
      if (answer !== undefined) {
        const correctAnswer = Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer;
        if (answer === correctAnswer) {
          score += q.points || 10;
        }
      }
    });

    const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;

    // Determine if passed: if passingScore is percentage, compare percentage; otherwise compare points
    const passed = passingScoreIsPercentage
      ? percentage >= passingScore
      : score >= passingScore;

    return { score, totalPoints, percentage, passed, passingScore, passingScoreIsPercentage };
  };

  // Progress calculation
  const moduleAny = module as any;
  const sections = (moduleAny.sections && Array.isArray(moduleAny.sections) && moduleAny.sections.length > 0)
    ? moduleAny.sections
    : (moduleAny.content && Array.isArray(moduleAny.content) && moduleAny.content.length > 0)
      ? moduleAny.content
      : [];

  const sectionTitles = sections.length > 0
    ? sections.map((s: any) => s.title || 'Untitled Section')
    : (module.topics || []);

  const currentSectionData = sections[currentSection] || null;
  const sectionProgressVal = sections.length > 0 ? ((currentSection + 1) / sections.length) * 100 : 0;

  useEffect(() => {
    if (sectionProgressVal > 0) {
      onProgress(sectionProgressVal);
    }
  }, [sectionProgressVal, onProgress]);

  useEffect(() => {
    if (isPlaying) {
      progressInterval.current = setInterval(() => {
        setCurrentTime(prev => {
          const newTime = prev + 1;
          const totalDuration = parseInt(module.duration) * 60; // Convert to seconds
          const progress = Math.min((newTime / totalDuration) * 100, 100);

          onProgress(progress);
          setSectionProgress(progress);

          // Save progress to backend every 30 seconds or when progress changes significantly
          if (newTime % 30 === 0 || Math.abs(progress - lastSavedProgress.current) >= 5) {
            saveProgressToBackend(progress, newTime);
          }

          // Update engagement based on interaction
          if (newTime % 30 === 0) { // Every 30 seconds
            setEngagementScore(prev => Math.max(prev - 1, 0));
          }

          return newTime;
        });
      }, 1000 / playbackSpeed);
    } else {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    }

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
      // Save progress when component unmounts or stops playing
      if (currentTime > 0 && journeyId && trainee.id) {
        const moduleId = extractObjectId((module as any)._id) || extractObjectId(module.id);
        if (!moduleId || !/^[0-9a-fA-F]{24}$/.test(moduleId)) {
          console.error('[TraineeModulePlayer] Module must have a valid MongoDB ObjectId _id:', module);
          return;
        }
        if (moduleId) {
          const timeSpentMinutes = Math.floor(currentTime / 60);
          const progress = Math.min((currentTime / (parseInt(module.duration) * 60)) * 100, 100);
          ProgressService.updateProgress({
            repId: trainee.id,
            journeyId: journeyId,
            moduleId: moduleId,
            progress: Math.round(progress),
            status: ProgressService.getStatusFromProgress(progress),
            timeSpent: timeSpentMinutes,
            engagementScore: engagementScore
          }).catch(err => console.error('Error saving progress on unmount:', err));
        }
      }
    };
  }, [isPlaying, module.duration, onProgress, playbackSpeed, currentTime, journeyId, trainee.id, engagementScore]);

  // Debug quiz state
  useEffect(() => {
    console.log('[TraineeModulePlayer] Quiz state:', {
      showModuleQuiz,
      currentQuiz: currentQuiz ? { id: currentQuiz.id, type: currentQuiz.type } : null,
      currentQuizIndex,
      hasAssessments: module.assessments && module.assessments.length > 0,
      assessments: module.assessments
    });
  }, [showModuleQuiz, currentQuiz, currentQuizIndex, module.assessments]);

  const handleInteraction = () => {
    setEngagementScore(prev => Math.min(prev + 2, 100));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSectionComplete = () => {
    handleInteraction();
    const maxSection = Math.max(sections.length, sectionTitles.length) - 1;
    if (currentSection < maxSection) {
      setCurrentSection(prev => prev + 1);
      setSectionProgress(0);
      setCurrentTime(0);
    } else {
      // Module sections completed - check for quizzes before marking as completed
      setModuleCompleted(true);

      // Check for quizzes in assessments
      const hasAssessments = module.assessments &&
        module.assessments.length > 0 &&
        module.assessments[0] &&
        module.assessments[0].questions &&
        Array.isArray(module.assessments[0].questions) &&
        module.assessments[0].questions.length > 0;

      // Check for quizzes in module.quizzes
      const hasQuizzes = (module as any).quizzes && Array.isArray((module as any).quizzes) &&
        (module as any).quizzes.length > 0;

      // Save progress but DON'T mark as completed if there are quizzes
      // The module will only be marked as completed after quizzes are passed
      if (journeyId && trainee.id) {
        const moduleId = extractObjectId((module as any)._id) || extractObjectId(module.id);
        if (!moduleId || !/^[0-9a-fA-F]{24}$/.test(moduleId)) {
          console.error('[TraineeModulePlayer] Module must have a valid MongoDB ObjectId _id:', module);
          return;
        }
        if (moduleId) {
          const timeSpentMinutes = Math.floor(currentTime / 60);
          // Only mark as completed if there are no quizzes
          // If there are quizzes, keep status as "in-progress" until quizzes are passed
          const moduleStatus = (hasAssessments || hasQuizzes) ? 'in-progress' : 'completed';

          // Show alert if module has quizzes and is being marked as in-progress
          if ((hasAssessments || hasQuizzes) && moduleStatus === 'in-progress') {
            // Get passing score from quiz metadata
            const { passingScore, passingScoreIsPercentage } = getQuizMetadata();
            const passingScoreText = passingScoreIsPercentage
              ? `${passingScore}%`
              : `${passingScore} points`;

            setTimeout(() => {
              alert(`⚠️ Module en cours\n\nVous devez réussir le quiz de ce module avec un score minimum de ${passingScoreText} pour passer au module suivant.\n\nVeuillez compléter le quiz ci-dessous.`);
            }, 500);
          }

          ProgressService.updateProgress({
            repId: trainee.id,
            journeyId: journeyId,
            moduleId: moduleId,
            progress: 100,
            status: moduleStatus,
            timeSpent: timeSpentMinutes,
            engagementScore: engagementScore
          }).catch(err => console.error('Error saving completed progress:', err));
        }
      }

      // If quizzes exist, redirect automatically to quiz
      if (hasAssessments && module.assessments && module.assessments[0] && module.assessments[0].questions) {
        
        const firstQuestion = module.assessments[0].questions[0];
        

        if (firstQuestion) {
          const quizData = {
            id: `quiz-0`,
            question: firstQuestion.text || firstQuestion.question || '',
            options: firstQuestion.options || [],
            correctAnswer: firstQuestion.correctAnswer || firstQuestion.correct_answer || 0,
            explanation: firstQuestion.explanation || 'Good job!',
            difficulty: firstQuestion.difficulty === 'easy' ? 3 : firstQuestion.difficulty === 'medium' ? 5 : 8,
            aiGenerated: true
          };
          

          setCurrentQuiz(quizData);
          setShowModuleQuiz(true);
          setCurrentQuizIndex(0);

          // Scroll to quiz section after state update
          setTimeout(() => {
            const quizSection = document.querySelector('.bg-white.rounded-2xl.shadow-xl.border.border-gray-200.mt-6');
            if (quizSection) {
              quizSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 300);
        } else {
          console.warn('[TraineeModulePlayer] No first question found in assessments');
        }
      } else if (hasQuizzes) {
        // If module has quizzes array, redirect to first quiz
        
        const questions = getQuizQuestions();
        if (questions.length > 0) {
          const firstQuestion = questions[0];
          

          if (firstQuestion) {
            const quizData = {
              id: firstQuestion._id ? `quiz-${firstQuestion._id}` : `quiz-0`,
              question: firstQuestion.question || firstQuestion.text || '',
              options: firstQuestion.options || [],
              correctAnswer: Array.isArray(firstQuestion.correctAnswer)
                ? firstQuestion.correctAnswer[0]
                : (firstQuestion.correctAnswer !== undefined ? firstQuestion.correctAnswer : 0),
              explanation: firstQuestion.explanation || 'Good job!',
              difficulty: firstQuestion.difficulty === 'easy' ? 3 : firstQuestion.difficulty === 'medium' ? 5 : 8,
              aiGenerated: true
            };
            

            setCurrentQuiz(quizData);
            setShowModuleQuiz(true);
            setCurrentQuizIndex(0);

            // Scroll to quiz section after state update
            setTimeout(() => {
              const quizSection = document.querySelector('.bg-white.rounded-2xl.shadow-xl.border.border-gray-200.mt-6');
              if (quizSection) {
                quizSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }, 300);
          } else {
            console.warn('[TraineeModulePlayer] No first question found in quizzes');
          }
        } else {
          console.warn('[TraineeModulePlayer] No questions found in quizzes array');
        }
      } else {
        // No quizzes, complete immediately
        
        onComplete();
      }
    }
  };

  const startQuiz = (quiz: Quiz) => {
    handleInteraction();
    setCurrentQuiz(quiz);
    setQuizAnswer(null);
    setShowQuizResult(false);
    setIsPlaying(false);
  };

  const submitQuizAnswer = () => {
    handleInteraction();
    if (quizAnswer !== null && currentQuiz && currentQuiz.correctAnswer !== undefined) {
      setShowQuizResult(true);
      const isCorrect = quizAnswer === currentQuiz.correctAnswer;
      if (isCorrect) {
        setComprehensionScore(prev => Math.min(prev + 10, 100));
        setEngagementScore(prev => Math.min(prev + 5, 100));
      }
      // Save answer
      setQuizAnswers(prev => {
        const newAnswers = { ...prev, [currentQuizIndex]: quizAnswer };

        // Check if quiz is passed based on score
        const questions = getQuizQuestions();
        if (questions && questions.length > 0) {
          const allAnswered = questions.every((q: any, idx: number) => newAnswers[idx] !== undefined);

          if (allAnswered) {
            // Calculate score
            let score = 0;
            const totalPoints = questions.reduce((sum: number, q: any) => sum + (q.points || 10), 0);
            questions.forEach((q: any, idx: number) => {
              const answer = newAnswers[idx];
              if (answer !== undefined) {
                const correctAnswer = Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer;
                if (answer === correctAnswer) {
                  score += q.points || 10;
                }
              }
            });

            const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
            const { passingScore, passingScoreIsPercentage } = getQuizMetadata();

            // Check if passed: if passingScore is percentage, compare percentage; otherwise compare points
            const passed = passingScoreIsPercentage
              ? percentage >= passingScore
              : score >= passingScore;

            // ALWAYS save quiz results when all questions are answered
            if (journeyId && trainee.id) {
              const moduleId = extractObjectId((module as any)._id) || extractObjectId(module.id);
              if (moduleId && /^[0-9a-fA-F]{24}$/.test(moduleId)) {
                // Get quiz ID - check assessments first, then quizzes
                let quizId = moduleId; // Default to moduleId
                const moduleAny = module as any;

                if (moduleAny.assessments && Array.isArray(moduleAny.assessments) && moduleAny.assessments.length > 0) {
                  const firstAssessment = moduleAny.assessments[0];
                  quizId = extractObjectId(firstAssessment._id) || extractObjectId(firstAssessment.id) || moduleId;
                } else if (moduleAny.quizzes && Array.isArray(moduleAny.quizzes) && moduleAny.quizzes.length > 0) {
                  const firstQuiz = moduleAny.quizzes[0];
                  quizId = extractObjectId(firstQuiz._id) || extractObjectId(firstQuiz.id) || moduleId;
                }

                const correctAnswers = questions.filter((q: any, idx: number) => {
                  const answer = newAnswers[idx];
                  if (answer === undefined) return false;
                  const correctAnswer = Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer;
                  return answer === correctAnswer;
                }).length;

                const quizz: Record<string, any> = {};
                quizz[quizId] = {
                  quizId: quizId,
                  score: percentage,
                  passed: passed,
                  totalQuestions: questions.length,
                  correctAnswers: correctAnswers,
                  completedAt: new Date().toISOString(),
                  attempts: 1
                };

                

                // Save quiz results immediately
                ProgressService.updateProgress({
                  repId: trainee.id,
                  journeyId: journeyId,
                  moduleId: moduleId,
                  quizz: quizz
                }).then(() => {
                  
                  // Reload progress data after saving quiz
                  if (onQuizComplete) {
                    onQuizComplete();
                  }
                }).catch(err => console.error('Error saving quiz result in submitQuizAnswer:', err));
              }
            }

            if (passed) {
              setAllQuizzesPassed(true);
              
            } else {
              setAllQuizzesPassed(false);
              
            }
          } else {
            setAllQuizzesPassed(false);
          }
        }

        return newAnswers;
      });
    }
  };

  const handleNextQuiz = () => {
    const questions = getQuizQuestions();

    if (!questions || questions.length === 0) {
      // No more quizzes, complete module
      // Save completed progress
      if (journeyId && trainee.id) {
        const moduleId = extractObjectId((module as any)._id) || extractObjectId(module.id);
        if (!moduleId || !/^[0-9a-fA-F]{24}$/.test(moduleId)) {
          console.error('[TraineeModulePlayer] Module must have a valid MongoDB ObjectId _id:', module);
          return;
        }
        if (moduleId) {
          const timeSpentMinutes = Math.floor(currentTime / 60);
          ProgressService.updateProgress({
            repId: trainee.id,
            journeyId: journeyId,
            moduleId: moduleId,
            progress: 100,
            status: 'completed',
            timeSpent: timeSpentMinutes,
            engagementScore: engagementScore
          }).catch(err => console.error('Error saving completed progress:', err));
        }
      }
      onComplete();
      return;
    }
    if (currentQuizIndex < questions.length - 1) {
      // Move to next question
      const nextIndex = currentQuizIndex + 1;
      setCurrentQuizIndex(nextIndex);
      setQuizAnswer(null);
      setShowQuizResult(false);
      // Reset allQuizzesPassed when moving to next question (will be recalculated when all are done)
      setAllQuizzesPassed(false);
      const nextQuestion = questions[nextIndex];
      if (nextQuestion) {
        setCurrentQuiz({
          id: nextQuestion._id ? `quiz-${nextQuestion._id}` : `quiz-${nextIndex}`,
          question: nextQuestion.question || nextQuestion.text || '',
          options: nextQuestion.options || [],
          correctAnswer: Array.isArray(nextQuestion.correctAnswer)
            ? nextQuestion.correctAnswer[0]
            : (nextQuestion.correctAnswer !== undefined ? nextQuestion.correctAnswer : 0),
          explanation: nextQuestion.explanation || 'Good job!',
          difficulty: nextQuestion.difficulty === 'easy' ? 3 : nextQuestion.difficulty === 'medium' ? 5 : 8,
          aiGenerated: true
        });
      }
    } else {
      // Last question answered, check if quiz is passed based on score
      const allQuestions = getQuizQuestions();
      if (!allQuestions || allQuestions.length === 0) {
        console.error('[TraineeModulePlayer] Cannot check quiz completion: no questions found');
        return;
      }

      const allAnswered = allQuestions.every((q: any, idx: number) => quizAnswers[idx] !== undefined);

      if (allAnswered) {
        // Calculate score
        let score = 0;
        const totalPoints = allQuestions.reduce((sum: number, q: any) => sum + (q.points || 10), 0);
        allQuestions.forEach((q: any, idx: number) => {
          const answer = quizAnswers[idx];
          if (answer !== undefined) {
            const correctAnswer = Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer;
            if (answer === correctAnswer) {
              score += q.points || 10;
            }
          }
        });

        const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
        const { passingScore, passingScoreIsPercentage } = getQuizMetadata();

        // Check if passed: if passingScore is percentage, compare percentage; otherwise compare points
        const passed = passingScoreIsPercentage
          ? percentage >= passingScore
          : score >= passingScore;

        if (passed) {
          setAllQuizzesPassed(true);
          

          // Save final progress before completing
          if (journeyId && trainee.id) {
            const moduleId = extractObjectId((module as any)._id) || extractObjectId(module.id);
            if (!moduleId || !/^[0-9a-fA-F]{24}$/.test(moduleId)) {
              console.error('[TraineeModulePlayer] Module must have a valid MongoDB ObjectId _id:', module);
              return;
            }
            if (moduleId) {
              const timeSpentMinutes = Math.floor(currentTime / 60);

              // Get quiz ID - check assessments first, then quizzes
              const moduleAny = module as any;
              let quizId = moduleId; // Default to moduleId

              if (moduleAny.assessments && Array.isArray(moduleAny.assessments) && moduleAny.assessments.length > 0) {
                const firstAssessment = moduleAny.assessments[0];
                quizId = extractObjectId(firstAssessment._id) || extractObjectId(firstAssessment.id) || moduleId;
              } else if (moduleAny.quizzes && Array.isArray(moduleAny.quizzes) && moduleAny.quizzes.length > 0) {
                const firstQuiz = moduleAny.quizzes[0];
                quizId = extractObjectId(firstQuiz._id) || extractObjectId(firstQuiz.id) || moduleId;
              }

              // Count correct answers
              const correctAnswers = allQuestions.filter((q: any, idx: number) => {
                const answer = quizAnswers[idx];
                if (answer === undefined) return false;
                const correctAnswer = Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer;
                return answer === correctAnswer;
              }).length;

              // Prepare quiz results to save in quizz field
              const quizz: Record<string, any> = {};
              quizz[quizId] = {
                quizId: quizId,
                score: percentage,
                passed: true,
                totalQuestions: allQuestions.length,
                correctAnswers: correctAnswers,
                completedAt: new Date().toISOString(),
                attempts: 1
              };

              // Now mark module as completed since quiz is passed
              ProgressService.updateProgress({
                repId: trainee.id,
                journeyId: journeyId,
                moduleId: moduleId,
                progress: 100,
                status: 'completed',
                timeSpent: timeSpentMinutes,
                engagementScore: engagementScore,
                quizz: quizz
              }).then(() => {
                
                // Reload progress data after saving quiz and completing module
                if (onQuizComplete) {
                  onQuizComplete();
                }
              }).catch(err => console.error('Error saving final progress:', err));
            }
          }

          // Don't auto-navigate, let user click "Next Module" button
          // The button will appear after all quizzes are passed
        } else {
          
          setAllQuizzesPassed(false);

          // ALWAYS save quiz result even if not passed (to track attempts)
          if (journeyId && trainee.id) {
            const moduleId = extractObjectId((module as any)._id) || extractObjectId(module.id);
            if (moduleId && /^[0-9a-fA-F]{24}$/.test(moduleId)) {
              // Get quiz ID - check assessments first, then quizzes
              const moduleAny = module as any;
              let quizId = moduleId; // Default to moduleId

              if (moduleAny.assessments && Array.isArray(moduleAny.assessments) && moduleAny.assessments.length > 0) {
                const firstAssessment = moduleAny.assessments[0];
                quizId = extractObjectId(firstAssessment._id) || extractObjectId(firstAssessment.id) || moduleId;
              } else if (moduleAny.quizzes && Array.isArray(moduleAny.quizzes) && moduleAny.quizzes.length > 0) {
                const firstQuiz = moduleAny.quizzes[0];
                quizId = extractObjectId(firstQuiz._id) || extractObjectId(firstQuiz.id) || moduleId;
              }

              const correctAnswers = allQuestions.filter((q: any, idx: number) => {
                const answer = quizAnswers[idx];
                if (answer === undefined) return false;
                const correctAnswer = Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer;
                return answer === correctAnswer;
              }).length;

              const quizz: Record<string, any> = {};
              quizz[quizId] = {
                quizId: quizId,
                score: percentage,
                passed: false,
                totalQuestions: allQuestions.length,
                correctAnswers: correctAnswers,
                completedAt: new Date().toISOString(),
                attempts: 1
              };

              console.warn('[TraineeModulePlayer] Quiz failed, saving in-progress state:', {
                quizId,
                score: percentage,
                passed: false,
                correctAnswers,
                totalQuestions: allQuestions.length
              });

              // Keep module status as "in-progress" since quiz is not passed
              ProgressService.updateProgress({
                repId: trainee.id,
                journeyId: journeyId,
                moduleId: moduleId,
                status: 'in-progress',
                quizz: quizz
              }).then(() => {
                
                // Reload progress data after saving quiz result
                if (onQuizComplete) {
                  onQuizComplete();
                }
              }).catch(err => console.error('Error saving quiz result:', err));
            }
          }
        }
      } else {
        setAllQuizzesPassed(false);
      }
    }
  };

  const addBookmark = () => {
    handleInteraction();
    if (!bookmarks.includes(currentTime)) {
      setBookmarks(prev => [...prev, currentTime]);
    }
  };

  const jumpToBookmark = (time: number) => {
    setCurrentTime(time);
    setIsPlaying(true);
  };

  const getModuleTypeIcon = () => {
    switch (module.type) {
      case 'video':
        return <Video className="h-6 w-6 text-red-500" />;
      case 'interactive':
        return <Zap className="h-6 w-6 text-purple-500" />;
      case 'ai-tutor':
        return <Brain className="h-6 w-6 text-blue-500" />;
      case 'simulation':
        return <Target className="h-6 w-6 text-green-500" />;
      default:
        return <BookOpen className="h-6 w-6 text-gray-500" />;
    }
  };

  return (
    <div 
      className="min-h-screen bg-gray-50 pb-12 transition-colors duration-500"
      style={{
        '--primary-color': visualTheme?.primaryColor || '#2563eb',
        '--secondary-color': visualTheme?.secondaryColor || '#6d28d9',
        '--accent-color': visualTheme?.accentColor || '#f43f5e',
        '--primary-color-light': `${visualTheme?.primaryColor || '#2563eb'}15`,
        '--font-family': visualTheme?.fontFamily || 'Inter, system-ui, sans-serif',
        fontFamily: 'var(--font-family)'
      } as React.CSSProperties}
    >
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
              <div className="flex items-center space-x-3">
                {getModuleTypeIcon()}
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{module.title}</h1>
                  <p className="text-gray-600">{module.description}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">{Math.round(sectionProgress)}%</div>
                <div className="text-sm text-gray-600">Progress</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">{engagementScore}%</div>
                <div className="text-sm text-gray-600">Engagement</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Content Area */}
            <div className="lg:col-span-3">
              <SectionContent
                module={module}
                currentSection={currentSection}
                currentSectionData={currentSectionData}
                sections={sections}
                sectionTitles={sectionTitles}
                fileTrainingUrl={fileTrainingUrl}
                onComplete={onComplete}
                handleSectionComplete={handleSectionComplete}
              />

              {/* Quiz Trigger */}
              {moduleCompleted && !showModuleQuiz && (
                <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200 text-center animate-in zoom-in-95 duration-500">
                  <div className="inline-flex items-center justify-center p-4 bg-blue-100 rounded-full mb-6">
                    <CheckCircle className="h-12 w-12 text-blue-600" />
                  </div>
                  <h2 className="text-3xl font-extrabold text-gray-900 mb-4">Module Complete!</h2>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    You've successfully completed all sections of this module. Now, let's test your knowledge with a final quiz.
                  </p>
                  <button
                    onClick={() => {
                      handleInteraction();
                      // Check for quizzes
                      const questions = getQuizQuestions();
                      if (questions.length > 0) {
                        setShowModuleQuiz(true);
                        setCurrentQuizIndex(0);
                        const q = questions[0];
                        setCurrentQuiz({
                          id: q._id ? `quiz-${q._id}` : `quiz-0`,
                          question: q.question || q.text || '',
                          options: q.options || [],
                          correctAnswer: Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : (q.correctAnswer !== undefined ? q.correctAnswer : 0),
                          explanation: q.explanation || 'Good job!',
                          difficulty: q.difficulty === 'easy' ? 3 : q.difficulty === 'medium' ? 5 : 8,
                          aiGenerated: true
                        });
                      } else {
                        onComplete();
                      }
                    }}
                    className="px-10 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center mx-auto space-x-3"
                  >
                    <Star className="h-6 w-6 text-yellow-300 fill-yellow-300" />
                    <span>Start Module Quiz</span>
                  </button>
                </div>
              )}

              {/* Module Quiz Section */}
              {showModuleQuiz && (
                <ModuleQuiz
                  module={module}
                  getQuizQuestions={getQuizQuestions}
                  currentQuizIndex={currentQuizIndex}
                  showQuizResult={showQuizResult}
                  currentQuiz={currentQuiz}
                  handleInteraction={handleInteraction}
                  setQuizAnswer={setQuizAnswer}
                  quizAnswer={quizAnswer}
                  submitQuizAnswer={submitQuizAnswer}
                  handleNextQuiz={handleNextQuiz}
                  calculateQuizScore={calculateQuizScore}
                  quizAnswers={quizAnswers}
                  allQuizzesPassed={allQuizzesPassed}
                  onNextModule={onNextModule}
                  moduleIndex={moduleIndex}
                  totalModules={totalModules}
                  onComplete={onComplete}
                  journeyId={journeyId}
                  trainee={trainee}
                  extractObjectId={extractObjectId}
                  ProgressService={ProgressService}
                  currentTime={currentTime}
                  engagementScore={engagementScore}
                  setShowQuizResult={setShowQuizResult}
                  setCurrentQuizIndex={setCurrentQuizIndex}
                  setAllQuizzesPassed={setAllQuizzesPassed}
                  setCurrentQuiz={setCurrentQuiz}
                  setQuizAnswers={setQuizAnswers}
                />
              )}
            </div>

            <ModuleSidebar
              sectionProgress={sectionProgressVal}
              engagementScore={engagementScore}
              comprehensionScore={comprehensionScore}
              sectionTitles={sectionTitles}
              currentSection={currentSection}
              handleInteraction={handleInteraction}
              setCurrentSection={setCurrentSection}
              setSectionProgress={setSectionProgress}
              setCurrentTime={setCurrentTime}
              bookmarks={bookmarks}
              jumpToBookmark={jumpToBookmark}
              formatTime={formatTime}
              module={module}
            />
          </div>

          {/* Notes Panel */}
          {showNotes && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Module Notes</h3>
                    <button
                      onClick={() => setShowNotes(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  <textarea
                    value={notes}
                    onChange={(e) => {
                      setNotes(e.target.value);
                      handleInteraction();
                    }}
                    placeholder="Take notes about this module..."
                    rows={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />

                  <div className="flex justify-end space-x-3 mt-4">
                    <button
                      onClick={() => setShowNotes(false)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        handleInteraction();
                        setShowNotes(false);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Save Notes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
