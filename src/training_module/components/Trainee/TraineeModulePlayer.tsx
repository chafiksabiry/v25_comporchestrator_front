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
import DocumentViewer from '../DocumentViewer/DocumentViewer';
import { ProgressService } from '../../infrastructure/services/ProgressService';
import { extractObjectId } from '../../lib/mongoUtils';

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
  onQuizComplete
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

  // Get sections from module.content or module.sections
  const moduleAny = module as any;
  const sections = (moduleAny.sections && Array.isArray(moduleAny.sections) && moduleAny.sections.length > 0)
    ? moduleAny.sections
    : (moduleAny.content && Array.isArray(moduleAny.content) && moduleAny.content.length > 0)
      ? moduleAny.content
      : [];

  // Get current section data
  const currentSectionData = sections[currentSection] || null;

  // Use topics as fallback if no sections
  const sectionTitles = sections.length > 0 
    ? sections.map((s: any) => s.title || 'Untitled Section')
    : (module.topics || []);

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
      currentQuiz: currentQuiz ? { id: currentQuiz.id, question: currentQuiz.question?.substring(0, 50) } : null,
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
      
      console.log('[TraineeModulePlayer] Module completed, checking for quizzes:', {
        hasAssessments,
        hasQuizzes,
        assessments: module.assessments,
        quizzes: (module as any).quizzes
      });
      
      // If quizzes exist, redirect automatically to quiz
      if (hasAssessments && module.assessments && module.assessments[0] && module.assessments[0].questions) {
        console.log('[TraineeModulePlayer] Module completed, redirecting to quiz automatically');
        const firstQuestion = module.assessments[0].questions[0];
        console.log('[TraineeModulePlayer] First question:', firstQuestion);
        
        if (firstQuestion) {
          const quizData = {
            id: `quiz-0`,
            question: firstQuestion.text || firstQuestion.question || '',
            options: firstQuestion.options || [],
            correctAnswer: firstQuestion.correctAnswer || firstQuestion.correct_answer || 0,
            explanation: firstQuestion.explanation || 'Good job!',
            difficulty: firstQuestion.difficulty === 'easy' ? 3 : firstQuestion.difficulty === 'medium' ? 5 : 8
          };
          console.log('[TraineeModulePlayer] Setting quiz data:', quizData);
          
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
        console.log('[TraineeModulePlayer] Module completed, redirecting to quiz automatically (quizzes array)');
        const questions = getQuizQuestions();
        if (questions.length > 0) {
          const firstQuestion = questions[0];
          console.log('[TraineeModulePlayer] First question from quizzes:', firstQuestion);
          
          if (firstQuestion) {
            const quizData = {
              id: firstQuestion._id ? `quiz-${firstQuestion._id}` : `quiz-0`,
              question: firstQuestion.question || firstQuestion.text || '',
              options: firstQuestion.options || [],
              correctAnswer: Array.isArray(firstQuestion.correctAnswer) 
                ? firstQuestion.correctAnswer[0] 
                : (firstQuestion.correctAnswer !== undefined ? firstQuestion.correctAnswer : 0),
              explanation: firstQuestion.explanation || 'Good job!',
              difficulty: firstQuestion.difficulty === 'easy' ? 3 : firstQuestion.difficulty === 'medium' ? 5 : 8
            };
            console.log('[TraineeModulePlayer] Setting quiz data from quizzes array:', quizData);
            
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
        console.log('[TraineeModulePlayer] Module completed, no quizzes available');
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
                
                console.log('[TraineeModulePlayer] 💾 Saving quiz result in submitQuizAnswer:', {
                  quizId,
                  score: percentage,
                  passed,
                  correctAnswers,
                  totalQuestions: questions.length
                });
                
                // Save quiz results immediately
                ProgressService.updateProgress({
                  repId: trainee.id,
                  journeyId: journeyId,
                  moduleId: moduleId,
                  quizz: quizz
                }).then(() => {
                  console.log('[TraineeModulePlayer] ✅ Quiz results saved successfully in submitQuizAnswer');
                  // Reload progress data after saving quiz
                  if (onQuizComplete) {
                    onQuizComplete();
                  }
                }).catch(err => console.error('Error saving quiz result in submitQuizAnswer:', err));
              }
            }
            
            if (passed) {
              setAllQuizzesPassed(true);
              console.log('[TraineeModulePlayer] ✅ Quiz passed! Score:', score, '/', totalPoints, `(${percentage}%)`);
            } else {
              setAllQuizzesPassed(false);
              console.log('[TraineeModulePlayer] ⚠️ Quiz not passed. Score:', score, '/', totalPoints, `(${percentage}%)`);
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
          difficulty: nextQuestion.difficulty === 'easy' ? 3 : nextQuestion.difficulty === 'medium' ? 5 : 8
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
        
        console.log('[TraineeModulePlayer] Quiz completion check:', {
          allAnswered,
          score,
          totalPoints,
          percentage,
          passingScore,
          passingScoreIsPercentage,
          passed,
          totalQuestions: allQuestions.length,
          answeredCount: Object.keys(quizAnswers).length
        });
        
        if (passed) {
          setAllQuizzesPassed(true);
          console.log('[TraineeModulePlayer] ✅ Quiz passed! Module can be completed.');
          
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
                console.log('[TraineeModulePlayer] ✅ Module marked as completed with quiz results');
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
          console.log('[TraineeModulePlayer] ⚠️ Quiz not passed. Cannot proceed to next module.');
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
              
              console.log('[TraineeModulePlayer] 💾 Saving quiz result (failed):', {
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
                console.log('[TraineeModulePlayer] ✅ Quiz result (failed) saved successfully');
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
              {/* Content Player - Display section content */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden mb-6">
                {/* Section Content Display */}
                {sections.length > 0 && currentSectionData ? (
                  <div className="flex flex-col" style={{ minHeight: '600px' }}>
                    {/* Section Header */}
                    <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-xl font-semibold text-gray-900">
                            Section {currentSection + 1}: {currentSectionData.title || sectionTitles[currentSection] || 'Untitled Section'}
                          </h2>
                          {currentSectionData.description && (
                            <p className="text-sm text-gray-600 mt-1">{currentSectionData.description}</p>
                          )}
                        </div>
                        <button
                          onClick={handleSectionComplete}
                          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <CheckCircle className="h-4 w-4" />
                          <span>Mark Complete</span>
                        </button>
                      </div>
                    </div>

                    {/* Section Content */}
                    <div className="flex-1 min-h-0 overflow-hidden" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                      {currentSectionData.content?.file?.url ? (
                        <DocumentViewer
                          fileUrl={currentSectionData.content.file.url}
                          fileName={currentSectionData.content.file.name || currentSectionData.title}
                          mimeType={currentSectionData.content.file.mimeType}
                        />
                      ) : currentSectionData.content?.text ? (
                        <div className="p-6 flex-1 overflow-y-auto" style={{ overflowY: 'auto', height: '100%' }}>
                          <div className="prose max-w-none">
                            {currentSectionData.content.text.split('\n\n').map((paragraph: string, idx: number) => (
                              <p key={idx} className="text-gray-700 text-base leading-relaxed mb-4">
                                {paragraph}
                              </p>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-center p-12">
                          <div className="text-center">
                            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">No content available for this section</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Fallback: Show video player if no sections */
                <div className="bg-gray-900 aspect-video relative">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    poster="https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop"
                  />
                  
                  {/* Video Overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-300 group">
                    {/* Center Play Button */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          handleInteraction();
                          setIsPlaying(!isPlaying);
                        }}
                        className="w-20 h-20 bg-white bg-opacity-90 rounded-full flex items-center justify-center hover:bg-opacity-100 transition-all shadow-lg"
                      >
                        {isPlaying ? (
                          <Pause className="h-10 w-10 text-gray-900 ml-1" />
                        ) : (
                          <Play className="h-10 w-10 text-gray-900 ml-2" />
                        )}
                      </button>
                    </div>

                    {/* Top Overlay */}
                    <div className="absolute top-4 left-4 right-4 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-black bg-opacity-75 text-white px-4 py-2 rounded-lg">
                          <div className="text-sm">Section {currentSection + 1}: {sectionTitles[currentSection] || 'Untitled Section'}</div>
                      </div>
                      <div className="bg-black bg-opacity-75 text-white px-4 py-2 rounded-lg">
                        <div className="text-sm">{formatTime(currentTime)} / {module.duration}</div>
                      </div>
                    </div>

                    {/* Bottom Controls */}
                    <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-black bg-opacity-75 rounded-lg p-4">
                        {/* Progress Bar */}
                        <div className="w-full bg-gray-600 rounded-full h-2 mb-4">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${sectionProgress}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => {
                                handleInteraction();
                                setIsPlaying(!isPlaying);
                              }}
                              className="p-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-colors"
                            >
                              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                            </button>

                            <button
                              onClick={() => {
                                handleInteraction();
                                setCurrentTime(0);
                                setSectionProgress(0);
                              }}
                              className="p-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-colors"
                            >
                              <RotateCcw className="h-5 w-5" />
                            </button>

                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => setIsMuted(!isMuted)}
                                className="p-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-colors"
                              >
                                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                              </button>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={volume}
                                onChange={(e) => setVolume(parseInt(e.target.value))}
                                className="w-20"
                              />
                            </div>

                            <select
                              value={playbackSpeed}
                              onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                              className="bg-white bg-opacity-20 text-white rounded px-2 py-1 text-sm"
                            >
                              <option value={0.5}>0.5x</option>
                              <option value={0.75}>0.75x</option>
                              <option value={1}>1x</option>
                              <option value={1.25}>1.25x</option>
                              <option value={1.5}>1.5x</option>
                              <option value={2}>2x</option>
                            </select>
                          </div>

                          <div className="flex items-center space-x-3">
                            <button
                              onClick={addBookmark}
                              className="p-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-colors"
                            >
                              <Star className="h-4 w-4" />
                            </button>

                            <button
                              onClick={() => setShowTranscript(!showTranscript)}
                              className="p-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-colors"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </button>

                            <button
                              onClick={() => setShowNotes(!showNotes)}
                              className="p-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-colors"
                            >
                              <BookOpen className="h-4 w-4" />
                            </button>

                            <button className="p-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-colors">
                              <Maximize className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                )}

                {/* Module Content Sections - Only show if no sections */}
                {sections.length === 0 && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">
                        Section {currentSection + 1}: {sectionTitles[currentSection]}
                    </h2>
                    <button
                      onClick={handleSectionComplete}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Mark Complete</span>
                    </button>
                  </div>

                  {/* Interactive Elements */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Practice Exercises */}
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-6">
                      <h3 className="font-semibold text-blue-900 mb-4 flex items-center space-x-2">
                        <Target className="h-5 w-5" />
                        <span>Practice Exercises</span>
                      </h3>
                      <div className="space-y-3">
                        {Array.isArray(module.practicalExercises) && module.practicalExercises.length > 0 ? (
                          module.practicalExercises.slice(0, 2).map((exercise) => (
                          <button
                            key={exercise.id}
                            onClick={() => handleInteraction()}
                            className="w-full text-left p-4 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-gray-900">{exercise.title}</div>
                                <div className="text-sm text-gray-600">{exercise.type} • Difficulty: {exercise.difficulty}/10</div>
                              </div>
                              {exercise.completed && (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              )}
                            </div>
                          </button>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">No exercises available</p>
                        )}
                      </div>
                    </div>

                    {/* Knowledge Checks / QCM */}
                    {module.assessments && 
                     Array.isArray(module.assessments) && 
                     module.assessments.length > 0 && 
                     module.assessments[0] && 
                     Array.isArray(module.assessments[0].questions) && 
                     module.assessments[0].questions.length > 0 && (
                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6">
                        <h3 className="font-semibold text-purple-900 mb-4 flex items-center space-x-2">
                          <Brain className="h-5 w-5" />
                          <span>QCM - Quiz ({module.assessments[0].questions.length} Questions)</span>
                        </h3>
                        <div className="space-y-3">
                          {module.assessments[0].questions.slice(0, 5).map((question: any, index: number) => (
                            <button
                              key={`quiz-${index}`}
                              onClick={() => startQuiz({
                                id: `quiz-${index}`,
                                question: question.text,
                                options: question.options,
                                correctAnswer: question.correctAnswer,
                                explanation: question.explanation || 'Good job!',
                                difficulty: question.difficulty === 'easy' ? 3 : question.difficulty === 'medium' ? 5 : 8
                              })}
                              className="w-full text-left p-4 bg-white border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 pr-4">
                                  <div className="font-medium text-gray-900 mb-1">Question {index + 1}</div>
                                  <div className="text-sm text-gray-600 line-clamp-2">{question.text}</div>
                                  <div className="text-xs text-purple-600 mt-1">
                                    {question.difficulty} • {question.points || 10} points
                                  </div>
                                </div>
                                <Brain className="h-5 w-5 text-purple-500 flex-shrink-0" />
                              </div>
                            </button>
                          ))}
                          {module.assessments[0].questions.length > 5 && (
                            <div className="text-center text-sm text-gray-600 py-2">
                              +{module.assessments[0].questions.length - 5} autres questions disponibles
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                )}
              </div>

              {/* ✅ Section QCM Complète */}
              {module.assessments && module.assessments.length > 0 && module.assessments[0].questions && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-xl border-2 border-green-500 p-8 mb-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-green-900 flex items-center">
                        <Brain className="h-8 w-8 mr-3 text-green-600" />
                        QCM - Évaluation du Module
                      </h2>
                      <p className="text-green-700 mt-2">
                        {module.assessments[0].questions.length} questions • 
                        Score de passage: {module.assessments[0].passingScore || 70}% • 
                        Durée: {module.assessments[0].timeLimit || 30} min
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-green-600">{module.assessments[0].questions.length}</div>
                      <div className="text-sm text-green-700">Questions</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {module.assessments[0].questions.map((question: any, index: number) => (
                      <button
                        key={`full-quiz-${index}`}
                        onClick={() => startQuiz({
                          id: `quiz-${index}`,
                          question: question.text,
                          options: question.options,
                          correctAnswer: question.correctAnswer,
                          explanation: question.explanation || 'Good job!',
                          difficulty: question.difficulty === 'easy' ? 3 : question.difficulty === 'medium' ? 5 : 8
                        })}
                        className="group bg-white border-2 border-green-200 rounded-lg p-5 hover:border-green-400 hover:shadow-lg transition-all text-left"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                              {index + 1}
                            </div>
                            <div>
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                question.difficulty === 'easy' ? 'bg-blue-100 text-blue-800' :
                                question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {question.difficulty}
                              </span>
                            </div>
                          </div>
                          <div className="text-sm font-bold text-green-600">
                            {question.points || 10} pts
                          </div>
                        </div>
                        
                        <p className="text-gray-900 font-medium mb-3 line-clamp-3">
                          {question.text}
                        </p>
                        
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <span>{question.options?.length || 4} options</span>
                          <div className="flex items-center text-green-600 group-hover:text-green-700 font-medium">
                            <span className="mr-1">Commencer</span>
                            <Brain className="h-4 w-4" />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="bg-white rounded-lg p-6 border border-green-200">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-gray-900">{module.assessments[0].questions.length}</div>
                        <div className="text-sm text-gray-600">Questions Totales</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {module.assessments[0].questions.reduce((sum: number, q: any) => sum + (q.points || 10), 0)}
                        </div>
                        <div className="text-sm text-gray-600">Points Totaux</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-blue-600">{module.assessments[0].passingScore || 70}%</div>
                        <div className="text-sm text-gray-600">Score Minimum</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-purple-600">{module.assessments[0].timeLimit || 30}</div>
                        <div className="text-sm text-gray-600">Minutes</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Learning Progress */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Your Progress</h3>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Module Progress</span>
                      <span className="text-sm font-bold text-gray-900">{Math.round(sectionProgress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${sectionProgress}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-green-600 mx-auto mb-1" />
                      <div className="text-lg font-bold text-green-600">{engagementScore}%</div>
                      <div className="text-xs text-gray-600">Engagement</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <Brain className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                      <div className="text-lg font-bold text-blue-600">{comprehensionScore}%</div>
                      <div className="text-xs text-gray-600">Comprehension</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Module Sections */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Module Sections</h3>
                <div className="space-y-2">
                  {sectionTitles.map((title: string, index: number) => (
                    <button
                      key={index}
                      onClick={() => {
                        handleInteraction();
                        setCurrentSection(index);
                        setSectionProgress(0);
                        setCurrentTime(0);
                      }}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        index === currentSection 
                          ? 'bg-blue-100 border border-blue-300 text-blue-900' 
                          : index < currentSection
                          ? 'bg-green-100 border border-green-300 text-green-900'
                          : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index < currentSection ? 'bg-green-500 text-white' :
                          index === currentSection ? 'bg-blue-500 text-white' :
                          'bg-gray-300 text-gray-600'
                        }`}>
                          {index < currentSection ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            index + 1
                          )}
                        </div>
                        <span className="font-medium">{title}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bookmarks */}
              {bookmarks.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Bookmarks</h3>
                  <div className="space-y-2">
                    {bookmarks.map((time, index) => (
                      <button
                        key={index}
                        onClick={() => jumpToBookmark(time)}
                        className="w-full text-left p-3 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm font-medium text-gray-900">
                            Bookmark {index + 1} - {formatTime(time)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Learning Objectives */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Learning Objectives</h3>
                <ul className="space-y-2">
                  {module.learningObjectives?.map((objective, index) => (
                    <li key={index} className="flex items-start space-x-2 text-sm">
                      <Target className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{objective}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
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

          {/* Quiz Section - Show at bottom after module completion */}
          {showModuleQuiz && currentQuiz && (() => {
            const quizQuestions = getQuizQuestions();
            return (
            <div id="quiz-section" className="bg-white rounded-2xl shadow-xl border border-gray-200 mt-6">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Module Quiz - {module.title}</h3>
                    {quizQuestions.length > 0 && (
                      <p className="text-sm text-gray-600 mt-1">
                        Question {currentQuizIndex + 1} of {quizQuestions.length}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    {quizQuestions.length > 0 && (
                      <>
                        <div className="text-2xl font-bold text-green-600">
                          {Math.round(((currentQuizIndex + (showQuizResult ? 1 : 0)) / quizQuestions.length) * 100)}%
                        </div>
                        <div className="text-xs text-gray-600">Progress</div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {currentQuiz && currentQuiz.question && (
                  <>
                    <p className="text-gray-700 mb-4 text-lg font-medium">{currentQuiz.question}</p>
                    
                    <div className="space-y-2 mb-4">
                      {currentQuiz.options && Array.isArray(currentQuiz.options) && currentQuiz.options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        handleInteraction();
                        setQuizAnswer(index);
                      }}
                      disabled={showQuizResult}
                      className={`w-full text-left p-4 border-2 rounded-lg transition-colors ${
                        quizAnswer === index
                          ? showQuizResult && quizAnswer === currentQuiz.correctAnswer
                            ? 'border-green-500 bg-green-50'
                            : showQuizResult && quizAnswer !== currentQuiz.correctAnswer
                            ? 'border-red-500 bg-red-50'
                            : 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      } ${showQuizResult ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{option}</span>
                        {showQuizResult && quizAnswer === index && quizAnswer !== currentQuiz.correctAnswer && (
                          <span className="text-red-600 font-bold">✗ Incorrect</span>
                        )}
                        {showQuizResult && quizAnswer === index && quizAnswer === currentQuiz.correctAnswer && (
                          <span className="text-green-600 font-bold">✓ Correct</span>
                        )}
                      </div>
                    </button>
                      ))}
                    </div>
                  </>
                )}

                {showQuizResult && currentQuiz && (
                  <div className={`p-4 rounded-lg mb-4 ${
                    quizAnswer === currentQuiz.correctAnswer
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  }`}>
                    <p className={`font-medium text-lg ${
                      quizAnswer === currentQuiz.correctAnswer ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {quizAnswer === currentQuiz.correctAnswer ? 'Correct! 🎉' : 'Incorrect 😔'}
                    </p>
                    {currentQuiz.explanation && (
                      <p className="text-sm text-gray-700 mt-2">{currentQuiz.explanation}</p>
                    )}
                  </div>
                )}

                <div className="flex space-x-3">
                  {!showQuizResult ? (
                    <button
                      onClick={submitQuizAnswer}
                      disabled={quizAnswer === null}
                      className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
                    >
                      Submit Answer
                    </button>
                  ) : (() => {
                    const quizQuestions = getQuizQuestions();
                    return (
                    <>
                      {quizQuestions.length > 0 && 
                       currentQuizIndex < (quizQuestions.length - 1) ? (
                        <button
                          onClick={handleNextQuiz}
                          className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center justify-center space-x-2"
                        >
                          <span>Next Question</span>
                          <ArrowRight className="h-5 w-5" />
                        </button>
                      ) : (() => {
                        // Show quiz summary when all questions are answered
                        const quizQuestions = getQuizQuestions();
                        const allAnswered = quizQuestions.every((q: any, idx: number) => quizAnswers[idx] !== undefined);
                        const quizScore = calculateQuizScore();
                        
                        return (
                        <>
                          {/* Quiz Summary - Show when all questions are answered */}
                          {allAnswered && (
                            <div className={`mb-6 p-6 rounded-lg border-2 ${
                              quizScore.passed 
                                ? 'bg-green-50 border-green-300' 
                                : 'bg-red-50 border-red-300'
                            }`}>
                              <div className="flex items-center justify-between mb-4">
                                <h4 className={`text-xl font-bold ${
                                  quizScore.passed ? 'text-green-800' : 'text-red-800'
                                }`}>
                                  {quizScore.passed ? '✅ Quiz Réussi!' : '❌ Quiz Échoué'}
                                </h4>
                                <div className={`text-2xl font-bold ${
                                  quizScore.passed ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {quizScore.percentage}%
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-600">Score obtenu:</span>
                                  <span className="ml-2 font-semibold text-gray-900">
                                    {quizScore.score} / {quizScore.totalPoints} points
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Score de passage:</span>
                                  <span className="ml-2 font-semibold text-gray-900">
                                    {quizScore.passingScoreIsPercentage 
                                      ? `${quizScore.passingScore}%` 
                                      : `${quizScore.passingScore} points`}
                                  </span>
                                </div>
                              </div>
                              {!quizScore.passed && (
                                <p className="mt-4 text-sm text-red-700">
                                  ⚠️ Vous devez obtenir au moins {
                                    quizScore.passingScoreIsPercentage 
                                      ? `${quizScore.passingScore}%` 
                                      : `${quizScore.passingScore} points`
                                  } pour réussir ce quiz.
                                </p>
                              )}
                            </div>
                          )}
                          
                          {allQuizzesPassed && onNextModule && moduleIndex !== undefined && totalModules && moduleIndex < totalModules - 1 ? (
                            <button
                              onClick={() => {
                                // Save progress before moving to next module
                                // Note: Quiz results should already be saved when quiz was passed
                                if (journeyId && trainee.id) {
                                  const moduleId = extractObjectId((module as any)._id) || extractObjectId(module.id);
                                  if (moduleId && /^[0-9a-fA-F]{24}$/.test(moduleId)) {
                                    const timeSpentMinutes = Math.floor(currentTime / 60);
                                    // Ensure module is marked as completed (quiz results already saved)
                                    ProgressService.updateProgress({
                                      repId: trainee.id,
                                      journeyId: journeyId,
                                      moduleId: moduleId,
                                      progress: 100,
                                      status: 'completed',
                                      timeSpent: timeSpentMinutes,
                                      engagementScore: engagementScore
                                    }).catch(err => console.error('Error saving progress:', err));
                                  }
                                }
                                onNextModule();
                              }}
                              className="flex-1 bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 transition-colors font-semibold flex items-center justify-center space-x-2"
                            >
                              <span>Next Module</span>
                              <ArrowRight className="h-5 w-5" />
                            </button>
                          ) : allQuizzesPassed ? (
                            <button
                              onClick={onComplete}
                              className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center justify-center space-x-2"
                            >
                              <span>Complete Module</span>
                              <ArrowRight className="h-5 w-5" />
                            </button>
                          ) : (
                            <div className="flex-1">
                              <p className="text-sm text-red-600 mb-2 text-center">
                                ⚠️ Vous devez répondre correctement à toutes les questions pour passer au module suivant.
                              </p>
                              <button
                                onClick={() => {
                                  // Reset quiz to allow retry
                                  setShowQuizResult(false);
                                  setCurrentQuizIndex(0);
                                  setQuizAnswer(null);
                                  setAllQuizzesPassed(false);
                                  const questions = getQuizQuestions();
                                  if (questions && questions.length > 0 && questions[0]) {
                                    const firstQuestion = questions[0];
                                    setCurrentQuiz({
                                      id: firstQuestion._id ? `quiz-${firstQuestion._id}` : `quiz-0`,
                                      question: firstQuestion.question || firstQuestion.text || '',
                                      options: firstQuestion.options || [],
                                      correctAnswer: Array.isArray(firstQuestion.correctAnswer) 
                                        ? firstQuestion.correctAnswer[0] 
                                        : (firstQuestion.correctAnswer !== undefined ? firstQuestion.correctAnswer : 0),
                                      explanation: firstQuestion.explanation || 'Please retry the quiz.',
                                      difficulty: firstQuestion.difficulty === 'easy' ? 3 : firstQuestion.difficulty === 'medium' ? 5 : 8
                                    });
                                  }
                                  setQuizAnswers({});
                                }}
                                className="w-full bg-orange-600 text-white py-3 px-6 rounded-lg hover:bg-orange-700 transition-colors font-semibold"
                              >
                                Retry Quiz
                              </button>
                            </div>
                          )}
                        </>
                        );
                      })()}
                    </>
                    );
                  })()}
                </div>
              </div>
            </div>
            );
          })()}

          {/* Regular Quiz Modal (for inline quizzes during module) - DISABLED */}
          {false && !showModuleQuiz && currentQuiz && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-md w-full">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Knowledge Check</h3>
                </div>
                
                <div className="p-6">
                  <p className="text-gray-700 mb-4">{currentQuiz.question}</p>
                  
                  <div className="space-y-2 mb-4">
                    {currentQuiz.options.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          handleInteraction();
                          setQuizAnswer(index);
                        }}
                        className={`w-full text-left p-3 border rounded-lg transition-colors ${
                          quizAnswer === index
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>

                  {showQuizResult && (
                    <div className={`p-3 rounded-lg mb-4 ${
                      quizAnswer === currentQuiz.correctAnswer
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-red-50 border border-red-200'
                    }`}>
                      <p className={`font-medium ${
                        quizAnswer === currentQuiz.correctAnswer ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {quizAnswer === currentQuiz.correctAnswer ? 'Correct! 🎉' : 'Incorrect 😔'}
                      </p>
                      <p className="text-sm text-gray-700 mt-1">{currentQuiz.explanation}</p>
                    </div>
                  )}

                  <div className="flex space-x-3">
                    {!showQuizResult ? (
                      <button
                        onClick={submitQuizAnswer}
                        disabled={quizAnswer === null}
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Submit Answer
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setCurrentQuiz(null);
                          setIsPlaying(true);
                        }}
                        className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Continue Learning
                      </button>
                    )}
                    <button
                      onClick={() => setCurrentQuiz(null)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Close
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