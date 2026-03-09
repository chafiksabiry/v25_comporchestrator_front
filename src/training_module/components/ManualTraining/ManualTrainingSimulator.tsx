import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  FileText,
  Video,
  Youtube,
  List,
  Award,
  Clock,
  Target,
  Trophy,
  X,
  ChevronDown,
  ChevronRight,
  Menu,
  ChevronLeft,
  AlertTriangle,
  Maximize,
  XCircle,
  Lock
} from 'lucide-react';
import axios from 'axios';

interface Module {
  id: string;
  title: string;
  description: string;
  orderIndex: number;
  sections?: Section[];
}

interface Section {
  id: string;
  title: string;
  type: 'text' | 'video' | 'document' | 'youtube' | 'interactive' | 'quiz';
  orderIndex: number;
  estimatedDuration?: number;
  content?: {
    text?: string;
    youtubeUrl?: string;
    file?: {
      id?: string;
      name: string;
      type: 'video' | 'pdf' | 'word' | 'image';
      url: string;
      publicId: string;
      thumbnailUrl?: string;
      size: number;
      mimeType: string;
    };
    keyPoints?: string[];
  };
  quiz?: Quiz; // Add quiz data for quiz sections
}

interface Quiz {
  id: string;
  moduleId?: string | null;
  trainingId: string;
  title: string;
  description?: string;
  questions: QuizQuestion[];
  passingScore?: number;
  timeLimit?: number;
}

interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer';
  options?: string[];
  correctAnswer?: number | string;
  explanation?: string;
  points?: number;
}

interface ManualTrainingSimulatorProps {
  trainingId: string;
  trainingTitle: string;
  onClose: () => void;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ||
  (() => {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    return isLocal ? 'http://localhost:5010' : 'https://v25platformtrainingbackend-production.up.railway.app';
  })();

export default function ManualTrainingSimulator({
  trainingId,
  trainingTitle,
  onClose
}: ManualTrainingSimulatorProps) {
  const [modules, setModules] = useState<Module[]>([]);
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  const [completedModules, setCompletedModules] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [quizzes, setQuizzes] = useState<Map<string, Quiz>>(new Map()); // moduleId -> Quiz
  const [quizAnswers, setQuizAnswers] = useState<Map<string, any>>(new Map());
  const [quizSubmitted, setQuizSubmitted] = useState<Map<string, boolean>>(new Map());
  const [quizScores, setQuizScores] = useState<Map<string, number>>(new Map());
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<Map<string, number>>(new Map()); // quizId -> current question index
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [documentViewed, setDocumentViewed] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [useObjectTag, setUseObjectTag] = useState(false);

  // Anti-Cheating System States
  const [violations, setViolations] = useState<Map<string, Set<number>>>(new Map()); // quizId -> Set of question indices with violations
  const [violationFlash, setViolationFlash] = useState(false); // Flash red border
  const [quizStartTime, setQuizStartTime] = useState<Map<string, number>>(new Map()); // quizId -> start timestamp
  const [questionStartTime, setQuestionStartTime] = useState<Map<string, number>>(new Map()); // quizId-questionIdx -> start timestamp
  const [questionResponseTimes, setQuestionResponseTimes] = useState<Map<string, number[]>>(new Map()); // quizId -> array of response times
  const [answeredQuestions, setAnsweredQuestions] = useState<Map<string, Set<number>>>(new Map()); // quizId -> Set of answered question indices (locked)
  const [questionTimer, setQuestionTimer] = useState(0); // Timer for current question in seconds
  const [questionTimeLimit, setQuestionTimeLimit] = useState(45); // 45 seconds per question
  const [questionTimeLeft, setQuestionTimeLeft] = useState(45); // Time left for current question (countdown from 45)
  const [penaltyEndTime, setPenaltyEndTime] = useState<Map<string, number>>(new Map()); // quizId-questionIdx -> timestamp when penalty ends
  const [penaltyTimeLeft, setPenaltyTimeLeft] = useState(0); // Seconds left in penalty
  const [showCertification, setShowCertification] = useState(false);
  const [finalExamCompleted, setFinalExamCompleted] = useState(false);

  // Track violation types per quiz
  const [violationTypes, setViolationTypes] = useState<Map<string, Set<string>>>(new Map()); // quizId -> Set of violation types
  const [violationsByQuestion, setViolationsByQuestion] = useState<Map<string, Map<number, string[]>>>(new Map()); // quizId -> Map<questionIdx, violation types>

  const currentModule = modules[currentModuleIndex];
  const currentSection = currentModule?.sections?.[currentSectionIndex];
  const totalSections = modules.reduce((acc, mod) => acc + (mod.sections?.length || 0), 0);
  const progress = totalSections > 0 ? (completedSections.size / totalSections) * 100 : 0;

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  // Load modules
  useEffect(() => {
    loadModules();
  }, [trainingId]);

  // Auto-expand current module
  useEffect(() => {
    if (currentModule?.id) {
      setExpandedModules(prev => new Set(prev).add(currentModule.id));
    }
  }, [currentModule?.id]);

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  // Function to add violation for current question
  const addViolation = (quizId: string, questionIndex: number, violationType: string) => {
    setViolations(prev => {
      const newMap = new Map(prev);
      const questionSet = newMap.get(quizId) || new Set<number>();
      if (!questionSet.has(questionIndex)) {
        questionSet.add(questionIndex);
        newMap.set(quizId, questionSet);

        // Track violation type globally for this quiz
        setViolationTypes(prev2 => {
          const newMap2 = new Map(prev2);
          const typeSet = newMap2.get(quizId) || new Set<string>();
          typeSet.add(violationType);
          newMap2.set(quizId, typeSet);
          return newMap2;
        });

        // Track violation type for this specific question
        setViolationsByQuestion(prev3 => {
          const newMap3 = new Map(prev3);
          const questionMap = newMap3.get(quizId) || new Map<number, string[]>();
          const violationList = questionMap.get(questionIndex) || [];
          if (!violationList.includes(violationType)) {
            violationList.push(violationType);
            questionMap.set(questionIndex, violationList);
            newMap3.set(quizId, questionMap);
          }
          return newMap3;
        });

        console.log(`🚨 VIOLATION: ${violationType} on question ${questionIndex} in quiz ${quizId}`);

        // Vibration for mobile/tablet devices
        if (navigator.vibrate) {
          // Pattern: vibrate 200ms, pause 100ms, vibrate 200ms (strong warning)
          navigator.vibrate([200, 100, 200]);
        }

        // Flash red border
        setViolationFlash(true);
        setTimeout(() => setViolationFlash(false), 2000);

        // Auto-advance to next question after 2 seconds
        setTimeout(() => {
          // Lock this question (one-way mode)
          setAnsweredQuestions(prev => {
            const newMap = new Map(prev);
            const answeredSet = newMap.get(quizId) || new Set<number>();
            answeredSet.add(questionIndex);
            newMap.set(quizId, answeredSet);
            return newMap;
          });

          // Record response time as 0 (fraud)
          const key = `${quizId}-${questionIndex}`;
          setQuestionStartTime(prev => {
            const startTime = prev.get(key);
            if (startTime) {
              setQuestionResponseTimes(prev2 => {
                const newMap = new Map(prev2);
                const times = newMap.get(quizId) || [];
                times[questionIndex] = 0; // 0 = fraud
                newMap.set(quizId, times);
                return newMap;
              });
            }
            return prev;
          });

          // Move to next question OR trigger auto-submit if last question
          const currentIdx = questionIndex;
          const quiz = currentSection?.quiz;

          if (quiz) {
            if (currentIdx < quiz.questions.length - 1) {
              // Move to next question
              setCurrentQuestionIndex(prev => new Map(prev).set(quizId, currentIdx + 1));
            } else {
              // Last question - auto-submit after 2 seconds delay is done
              // Calculate and submit score
              let correctAnswers = 0;
              quiz.questions.forEach((q: any) => {
                const key = `${quizId}-${q.id}`;
                const answer = quizAnswers.get(key);

                if (q.type === 'multiple-choice' && answer === q.correctAnswer) {
                  correctAnswers++;
                } else if (q.type === 'true-false' && answer === (q.correctAnswer === 'true' || q.correctAnswer === true)) {
                  correctAnswers++;
                }
              });

              const finalScore = Math.round((correctAnswers / quiz.questions.length) * 100);
              setQuizScores(prev => new Map(prev).set(quizId, finalScore));
              setQuizSubmitted(prev => new Map(prev).set(quizId, true));
              setCurrentQuestionIndex(prev => new Map(prev).set(quizId, 0));

              // Mark quiz section as completed
              if (currentSection?.id) {
                setCompletedSections(prev => new Set(prev).add(currentSection.id));
              }
            }
          }
        }, 2000);

        return newMap;
      }
      return prev; // No change if violation already recorded for this question
    });
  };

  // Anti-Cheating: Tab switch detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && currentSection?.type === 'quiz') {
        const quizId = currentSection.quiz?.id;
        const questionIdx = currentQuestionIndex.get(quizId || '') || 0;
        const isSubmitted = quizSubmitted.get(quizId || '');

        if (quizId && !isSubmitted) {
          addViolation(quizId, questionIdx, 'tab_switch');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [currentSection, quizSubmitted, currentQuestionIndex]);

  // Anti-Cheating: Disable right-click and keyboard shortcuts during quiz
  useEffect(() => {
    const isQuiz = currentSection?.type === 'quiz';
    const quizId = currentSection?.quiz?.id;
    const isSubmitted = quizSubmitted.get(quizId || '');

    if (isQuiz && !isSubmitted) {
      const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
        const questionIdx = currentQuestionIndex.get(quizId || '') || 0;
        if (quizId) {
          addViolation(quizId, questionIdx, 'right_click');
        }
        return false;
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        // Detect Fn key press - FRAUD
        // Fn key detection: check for Fn key code, key name, or special key combinations
        const isFnKey = e.key === 'Fn' ||
          e.key === 'Function' ||
          e.code === 'Fn' ||
          e.code === 'Function' ||
          e.keyCode === 0 || // Fn key sometimes has keyCode 0
          (e.location === 3 && e.key.length === 0) || // Some Fn keys have location 3
          (e.key === 'Unidentified' && e.code === '') || // Some systems report Fn as Unidentified
          (e.which === 0 && !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey); // Fn key often has which=0 with no modifiers

        if (isFnKey) {
          e.preventDefault();
          e.stopPropagation();
          const questionIdx = currentQuestionIndex.get(quizId || '') || 0;
          if (quizId) {
            addViolation(quizId, questionIdx, 'fn_key_fraud');
            console.log('🚨 Fn KEY DETECTED - FRAUD!', { key: e.key, code: e.code, keyCode: e.keyCode, which: e.which, location: e.location });
          }
          return false;
        }

        // Block ALL keyboard keys during quiz (except Tab for navigation)
        // Allow only: Tab (for accessibility), Enter/Space (for clicking buttons/options)
        const allowedKeys = ['Tab', 'Enter', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

        if (!allowedKeys.includes(e.key)) {
          e.preventDefault();
          e.stopPropagation();

          // Record violation for any blocked key press
          const questionIdx = currentQuestionIndex.get(quizId || '') || 0;
          if (quizId) {
            addViolation(quizId, questionIdx, 'keyboard_blocked');
          }
          return false;
        }

        // Also block any Ctrl/Alt/Meta combinations even with allowed keys
        if (e.ctrlKey || e.metaKey || e.altKey) {
          e.preventDefault();
          e.stopPropagation();
          const questionIdx = currentQuestionIndex.get(quizId || '') || 0;
          if (quizId) {
            addViolation(quizId, questionIdx, 'keyboard_shortcut');
          }
          return false;
        }
      };

      document.addEventListener('contextmenu', handleContextMenu);
      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.removeEventListener('contextmenu', handleContextMenu);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [currentSection, quizSubmitted, currentQuestionIndex]);

  // Anti-Cheating: Track quiz start time
  useEffect(() => {
    if (currentSection?.type === 'quiz') {
      const quizId = currentSection.quiz?.id;
      if (quizId && !quizSubmitted.get(quizId) && !quizStartTime.has(quizId)) {
        setQuizStartTime(prev => new Map(prev).set(quizId, Date.now()));
      }
    }
  }, [currentSection, quizSubmitted, quizStartTime]);

  // Anti-Cheating: Track question start time and analyze behavior
  useEffect(() => {
    if (currentSection?.type === 'quiz') {
      const quizId = currentSection.quiz?.id;
      const questionIdx = currentQuestionIndex.get(quizId || '') || 0;
      const key = `${quizId}-${questionIdx}`;

      if (quizId && !quizSubmitted.get(quizId)) {
        // Start timer for this question
        setQuestionStartTime(prev => new Map(prev).set(key, Date.now()));
      }
    }
  }, [currentSection, currentQuestionIndex, quizSubmitted]);

  // Anti-Cheating: Update question timer every second
  useEffect(() => {
    if (currentSection?.type === 'quiz') {
      const quizId = currentSection.quiz?.id;
      const questionIdx = currentQuestionIndex.get(quizId || '') || 0;
      const key = `${quizId}-${questionIdx}`;
      const startTime = questionStartTime.get(key);
      const isSubmitted = quizSubmitted.get(quizId || '');

      if (startTime && !isSubmitted) {
        const interval = setInterval(() => {
          setQuestionTimer(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);
        return () => clearInterval(interval);
      } else {
        setQuestionTimer(0);
      }
    }
  }, [currentSection, currentQuestionIndex, questionStartTime, quizSubmitted]);

  // 45-second countdown timer per question
  useEffect(() => {
    if (currentSection?.type === 'quiz') {
      const quizId = currentSection.quiz?.id;
      const questionIdx = currentQuestionIndex.get(quizId || '') || 0;
      const isSubmitted = quizSubmitted.get(quizId || '');

      if (!isSubmitted && quizId) {
        // Reset timer to 45 seconds when question changes
        setQuestionTimeLeft(45);

        const interval = setInterval(() => {
          setQuestionTimeLeft(prev => {
            if (prev <= 1) {
              // Time's up - auto-advance to next question
              const currentQuiz = currentSection.quiz;
              if (currentQuiz && questionIdx < currentQuiz.questions.length - 1) {
                // Move to next question
                setCurrentQuestionIndex(prev => new Map(prev).set(quizId, questionIdx + 1));
                // Lock current question
                setAnsweredQuestions(prev => {
                  const newMap = new Map(prev);
                  const answeredSet = newMap.get(quizId) || new Set<number>();
                  answeredSet.add(questionIdx);
                  newMap.set(quizId, answeredSet);
                  return newMap;
                });
              } else {
                // Last question - lock it and trigger auto-submit
                setAnsweredQuestions(prev => {
                  const newMap = new Map(prev);
                  const answeredSet = newMap.get(quizId) || new Set<number>();
                  answeredSet.add(questionIdx);
                  newMap.set(quizId, answeredSet);
                  return newMap;
                });
                // Auto-submit after a short delay to allow state update
                setTimeout(() => {
                  const submitButton = document.querySelector('[data-auto-submit="true"]') as HTMLButtonElement;
                  if (submitButton) {
                    submitButton.click();
                  }
                }, 500);
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        return () => clearInterval(interval);
      } else {
        setQuestionTimeLeft(45);
      }
    } else {
      setQuestionTimeLeft(45);
    }
  }, [currentSection, currentQuestionIndex, quizSubmitted]);

  // Anti-Cheating: Update penalty countdown every second
  useEffect(() => {
    if (currentSection?.type === 'quiz') {
      const quizId = currentSection.quiz?.id;
      const questionIdx = currentQuestionIndex.get(quizId || '') || 0;
      const key = `${quizId}-${questionIdx}`;
      const endTime = penaltyEndTime.get(key);

      if (endTime) {
        const interval = setInterval(() => {
          const timeLeft = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
          setPenaltyTimeLeft(timeLeft);

          if (timeLeft === 0) {
            // Penalty ended, remove it
            setPenaltyEndTime(prev => {
              const newMap = new Map(prev);
              newMap.delete(key);
              return newMap;
            });
          }
        }, 1000);
        return () => clearInterval(interval);
      } else {
        setPenaltyTimeLeft(0);
      }
    }
  }, [currentSection, currentQuestionIndex, penaltyEndTime]);

  const goToSection = (moduleIndex: number, sectionIndex: number) => {
    // Check if user can access this module
    if (!canAccessModule(moduleIndex)) {
      alert('❌ You must pass previous modules before accessing this one.');
      return;
    }

    setCurrentModuleIndex(moduleIndex);
    setCurrentSectionIndex(sectionIndex);
    setDocumentViewed(false);
    setIframeLoaded(false);
    setIframeError(false);
    setIframeKey(prev => prev + 1); // Force iframe reload
  };

  // Check if user can access a specific module
  const canAccessModule = (moduleIndex: number): boolean => {
    // Always allow access to first module
    if (moduleIndex === 0) return true;

    // Check all previous modules
    for (let i = 0; i < moduleIndex; i++) {
      const module = modules[i];
      if (!module) continue;

      // Find quiz for this module
      const quiz = quizzes.get(module.id);
      if (!quiz) {
        // No quiz = can't proceed
        return false;
      }

      // Check if quiz is submitted
      const isSubmitted = quizSubmitted.get(quiz.id);
      if (!isSubmitted) {
        // Quiz not taken yet
        return false;
      }

      // Check if quiz passed
      const score = quizScores.get(quiz.id) || 0;
      const passingScore = quiz.passingScore || 70;
      if (score < passingScore) {
        // Quiz failed
        return false;
      }
    }

    return true;
  };

  // Reset document viewed when section changes
  useEffect(() => {
    setDocumentViewed(false);
    setIframeLoaded(false);
    setIframeError(false);
    setUseObjectTag(false);
    setIframeKey(prev => prev + 1); // Force iframe reload with new key

    // Auto-mark as viewed for non-document sections after 3 seconds
    if (currentSection?.type !== 'document') {
      const timer = setTimeout(() => {
        setDocumentViewed(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentSection?.id]);

  // For documents, don't auto-mark as viewed - user must manually confirm
  // For other content types, auto-mark after 3 seconds
  useEffect(() => {
    if (currentSection?.type === 'document') {
      // Documents require manual confirmation (no auto-timer)
      console.log('📄 Document section - waiting for user confirmation');
    }
  }, [currentSection?.id, currentSection?.type]);

  // Check if user can complete the section
  const canComplete = () => {
    if (!currentSection) return false;

    // For documents, require viewing
    if (currentSection.type === 'document') {
      return documentViewed || completedSections.has(currentSection.id);
    }

    // For other types, auto-enable after 3 seconds
    return documentViewed || completedSections.has(currentSection.id);
  };

  const getSectionIcon = (type: string) => {
    switch (type) {
      case 'text':
        return <FileText className="w-4 h-4" />;
      case 'video':
        return <Video className="w-4 h-4" />;
      case 'youtube':
        return <Youtube className="w-4 h-4" />;
      case 'document':
        return <FileText className="w-4 h-4" />;
      case 'quiz':
        return <Target className="w-4 h-4" />;
      default:
        return <BookOpen className="w-4 h-4" />;
    }
  };

  const loadModules = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/manual-trainings/${trainingId}/modules`);
      if (response.data.success) {
        const sortedModules = response.data.data.sort((a: Module, b: Module) => a.orderIndex - b.orderIndex);

        // Load quizzes and add them as sections
        for (const module of sortedModules) {
          // Sort sections
          if (module.sections) {
            module.sections.sort((a, b) => a.orderIndex - b.orderIndex);
          } else {
            module.sections = [];
          }

          // Load quiz for this module
          try {
            const quizResponse = await axios.get(`${API_BASE}/manual-trainings/modules/${module.id}/quizzes`);
            if (quizResponse.data.success && quizResponse.data.data.length > 0) {
              const quiz = quizResponse.data.data[0];

              // Add quiz as a section at the end
              const quizSection: Section = {
                id: `quiz-${module.id}`,
                title: quiz.title || `${module.title} - Quiz`,
                type: 'quiz',
                orderIndex: (module.sections?.length || 0) + 1,
                estimatedDuration: quiz.timeLimit || 15,
                quiz: quiz
              };

              module.sections.push(quizSection);
              setQuizzes(prev => new Map(prev).set(module.id, quiz));
            }
          } catch (error) {
            console.log(`No quiz found for module ${module.id}`);
          }
        }

        // Load Final Exam
        try {
          const finalExamResponse = await axios.get(`${API_BASE}/manual-trainings/${trainingId}/quizzes`);
          if (finalExamResponse.data.success && finalExamResponse.data.data.length > 0) {
            // Find final exam (quiz without moduleId or with trainingId)
            const finalExam = finalExamResponse.data.data.find((q: Quiz) => !q.moduleId && q.trainingId === trainingId);
            console.log('🔍 Looking for final exam. All quizzes:', finalExamResponse.data.data);
            console.log('📝 Found final exam:', finalExam);
            if (finalExam) {
              // Create a special "Final Exam" module
              const finalExamModule: Module = {
                id: 'final-exam',
                title: finalExam.title || 'Final Exam',
                description: finalExam.description || 'Comprehensive final examination',
                orderIndex: sortedModules.length + 1,
                trainingId: trainingId,
                sections: [
                  {
                    id: 'final-exam-section',
                    title: finalExam.title || 'Final Exam',
                    type: 'quiz',
                    orderIndex: 1,
                    estimatedDuration: finalExam.timeLimit || 30,
                    quiz: finalExam
                  }
                ]
              };

              sortedModules.push(finalExamModule);
              setQuizzes(prev => new Map(prev).set('final-exam', finalExam));
            }
          }
        } catch (error) {
          console.log('No final exam found');
        }

        setModules(sortedModules);
      }
    } catch (error) {
      console.error('Error loading modules:', error);
    } finally {
      setLoading(false);
    }
  };


  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSectionComplete = () => {
    if (currentSection) {
      setCompletedSections(prev => new Set(prev).add(currentSection.id));
    }

    if (!currentModule) return;

    const totalSections = currentModule.sections?.length || 0;

    // Check if there's a next section in the current module
    if (currentSectionIndex < totalSections - 1) {
      // Check if the next section is a quiz
      const nextSection = currentModule.sections?.[currentSectionIndex + 1];
      if (nextSection && nextSection.type === 'quiz') {
        // Automatically move to quiz section
        console.log('✅ Section completed, automatically redirecting to quiz');
        setCurrentSectionIndex(prev => prev + 1);
        // Scroll to quiz section
        setTimeout(() => {
          const quizSection = document.getElementById('quiz-section');
          if (quizSection) {
            quizSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      } else {
        // Move to next regular section
        setCurrentSectionIndex(prev => prev + 1);
      }
    } else {
      // Last section of module - check if there's a quiz for this module
      const moduleQuiz = quizzes.get(currentModule.id);
      if (moduleQuiz) {
        // Check if quiz section exists but wasn't reached yet
        const quizSection = currentModule.sections?.find(s => s.type === 'quiz' && s.id === `quiz-${currentModule.id}`);
        if (quizSection) {
          // Find quiz section index and navigate to it
          const quizIndex = currentModule.sections?.findIndex(s => s.id === quizSection.id);
          if (quizIndex !== undefined && quizIndex !== -1) {
            console.log('✅ Module completed, automatically redirecting to quiz');
            setCurrentSectionIndex(quizIndex);
            setTimeout(() => {
              const quizElement = document.getElementById('quiz-section');
              if (quizElement) {
                quizElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }, 100);
            return;
          }
        }
      }

      // No quiz found, move to next module
      handleModuleComplete();
    }
  };

  const checkAndShowCertification = () => {
    // Check if all modules (except final exam) are completed
    const regularModules = modules.filter(m => m.id !== 'final-exam');
    const allModulesCompleted = regularModules.every(module => completedModules.has(module.id));

    // Check if final exam is completed and passed
    const finalExamModule = modules.find(m => m.id === 'final-exam');
    const finalExamQuiz = finalExamModule ? quizzes.get('final-exam') : null;
    const finalExamPassed = finalExamQuiz && finalExamCompleted &&
      (quizScores.get(finalExamQuiz.id) || 0) >= (finalExamQuiz.passingScore || 80);

    if (allModulesCompleted && finalExamPassed) {
      setShowCertification(true);
    }
  };

  const handleModuleComplete = () => {
    if (currentModule) {
      setCompletedModules(prev => new Set(prev).add(currentModule.id));
    }

    // Move to next module
    if (currentModuleIndex < modules.length - 1) {
      setCurrentModuleIndex(prev => prev + 1);
      setCurrentSectionIndex(0);
    } else {
      // All modules completed - check for certification
      checkAndShowCertification();
      if (!showCertification) {
        // If no certification yet, just show completion message
        alert('🎉 Congratulations! You have completed all modules!');
      }
    }
  };

  // Check if user can proceed to next module
  const canProceedToNextModule = (): boolean => {
    if (!currentModule || currentModule.id === 'final-exam') return true;

    const quiz = quizzes.get(currentModule.id);
    if (!quiz) return false;

    const isSubmitted = quizSubmitted.get(quiz.id);
    if (!isSubmitted) return false;

    const score = quizScores.get(quiz.id) || 0;
    const passingScore = quiz.passingScore || 70;

    return score >= passingScore;
  };


  const renderSectionContent = () => {
    // Show completion message if training is finished
    if (showCertification) {
      return renderCompletionMessage();
    }

    if (!currentSection) return null;

    const { content } = currentSection;

    switch (currentSection.type) {
      case 'text':
        return (
          <div className="prose max-w-none">
            <div className="bg-white rounded-lg p-8 shadow-sm">
              <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                {content?.text || 'No content available'}
              </div>
              {content?.keyPoints && content.keyPoints.length > 0 && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Key Points:</h4>
                  <ul className="list-disc list-inside space-y-1 text-blue-800">
                    {content.keyPoints.map((point, idx) => (
                      <li key={idx}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        );

      case 'youtube':
        return (
          <div className="bg-white rounded-lg p-8 shadow-sm">
            <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
              {content?.youtubeUrl ? (
                <iframe
                  className="w-full h-full"
                  src={content.youtubeUrl.replace('watch?v=', 'embed/')}
                  title={currentSection.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <Youtube className="w-16 h-16" />
                </div>
              )}
            </div>
          </div>
        );

      case 'video':
        return (
          <div className="bg-white rounded-lg p-8 shadow-sm">
            {content?.file?.name && (
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{content.file.name}</h3>
            )}
            <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
              {content?.file?.url ? (
                <video
                  className="w-full h-full"
                  src={content.file.url}
                  controls
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <Video className="w-16 h-16" />
                  <p className="ml-3 text-sm">No video available</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'document':
        return (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden h-full flex flex-col">
            {content?.file?.name && (
              <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white px-4 py-2 flex items-center justify-between flex-shrink-0 shadow-lg">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <div>
                    <h3 className="text-sm font-semibold">{content.file.name}</h3>
                    <p className="text-xs text-indigo-100">Document Viewer</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {!documentViewed ? (
                    <button
                      onClick={() => {
                        console.log('✅ User confirmed reading document');
                        setDocumentViewed(true);
                      }}
                      className="flex items-center space-x-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg transform hover:scale-105"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm">I have finished reading</span>
                    </button>
                  ) : (
                    <div className="flex items-center space-x-2 px-3 py-1 bg-emerald-500 bg-opacity-30 rounded-lg backdrop-blur-sm">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-xs">Ready to continue</span>
                    </div>
                  )}
                  {content?.file?.url && (
                    <a
                      href={content.file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg text-sm font-medium transition-all inline-flex items-center space-x-2 backdrop-blur-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      <span className="text-xs">New Tab</span>
                    </a>
                  )}
                </div>
              </div>
            )}
            {content?.file?.url ? (
              <div className="flex-1 w-full relative bg-gray-100" style={{ height: '400px' }}>
                <iframe
                  key={`iframe-${currentSection?.id}-${iframeKey}`}
                  src={`https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(content.file.url)}`}
                  className="w-full h-full border-0"
                  title={content.file.name || 'Document'}
                  allow="autoplay"
                  onLoad={() => {
                    console.log('✅ PDF loaded successfully via PDF.js');
                    setIframeLoaded(true);
                    setIframeError(false);
                  }}
                  onError={(e) => {
                    console.error('❌ PDF load error:', e);
                    setIframeError(true);
                  }}
                />
                {iframeError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                    <div className="text-center max-w-md p-6">
                      <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-700 font-medium mb-2">Unable to load document preview</p>
                      <p className="text-gray-500 text-sm mb-4">The document cannot be displayed in the browser.</p>
                      <a
                        href={content.file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium transition-all"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        <span>Open Document in New Tab</span>
                      </a>
                      <button
                        onClick={() => {
                          setIframeError(false);
                          setIframeKey(prev => prev + 1);
                        }}
                        className="mt-3 text-sm text-purple-600 hover:text-purple-700 underline"
                      >
                        Try again
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20">
                <FileText className="w-20 h-20 text-gray-400 mb-4" />
                <p className="text-gray-500 text-lg">No document available</p>
              </div>
            )}
          </div>
        );

      case 'quiz':
        return renderQuizContent();

      default:
        return (
          <div className="bg-white rounded-lg p-8 shadow-sm text-center text-gray-500">
            Content type not supported: {currentSection.type}
          </div>
        );
    }
  };

  const renderQuizContent = () => {
    const quiz = currentSection?.quiz;
    if (!quiz) return <div>No quiz available</div>;

    const quizId = quiz.id;
    const isSubmitted = quizSubmitted.get(quizId) || false;
    const score = quizScores.get(quizId) || 0;
    const questionIdx = currentQuestionIndex.get(quizId) || 0;
    const currentQuestion = quiz.questions[questionIdx];

    const handleAnswerChange = (questionId: string, answer: any) => {
      const key = `${quizId}-${questionId}`;
      setQuizAnswers(prev => {
        const newMap = new Map(prev);
        newMap.set(key, answer);
        return newMap;
      });
    };

    const handleNextQuestion = () => {
      // Record response time for behavior analysis
      const key = `${quizId}-${questionIdx}`;
      const startTime = questionStartTime.get(key);
      if (startTime) {
        const responseTime = Date.now() - startTime;
        setQuestionResponseTimes(prev => {
          const newMap = new Map(prev);
          const times = newMap.get(quizId) || [];
          times[questionIdx] = responseTime;
          newMap.set(quizId, times);
          return newMap;
        });

        // Behavior Analysis: Flag suspicious timing
        if (responseTime < 2000) { // Less than 2 seconds = too fast (suspicious)
          console.warn(`⚠️ Suspicious: Question ${questionIdx + 1} answered in ${responseTime}ms`);
        } else if (responseTime > 30000) { // More than 5 minutes = too slow (suspicious)
          console.warn(`⚠️ Suspicious: Question ${questionIdx + 1} took ${responseTime}ms`);
        }
      }

      // Lock this question (one-way mode)
      setAnsweredQuestions(prev => {
        const newMap = new Map(prev);
        const answeredSet = newMap.get(quizId) || new Set<number>();
        answeredSet.add(questionIdx);
        newMap.set(quizId, answeredSet);
        return newMap;
      });

      if (questionIdx < quiz.questions.length - 1) {
        setCurrentQuestionIndex(prev => new Map(prev).set(quizId, questionIdx + 1));
      }
    };

    const handlePreviousQuestion = () => {
      // Check if question is locked (one-way mode)
      const answeredSet = answeredQuestions.get(quizId) || new Set<number>();
      const targetIdx = questionIdx - 1;

      // Don't allow going back to locked questions (no alert, just block)
      if (answeredSet.has(targetIdx)) {
        return;
      }

      if (questionIdx > 0) {
        setCurrentQuestionIndex(prev => new Map(prev).set(quizId, questionIdx - 1));
      }
    };

    const handleSubmitQuiz = async () => {
      // Prepare answers
      const answersObj: Record<string, any> = {};
      quiz.questions.forEach((q: any) => {
        const key = `${quizId}-${q.id}`;
        const userAnswer = quizAnswers.get(key);
        answersObj[q.id] = userAnswer !== undefined ? userAnswer : null;
      });

      // Prepare security metadata
      const violationTypeSet = violationTypes.get(quizId) || new Set<string>();
      const violationsByQuestionMap = violationsByQuestion.get(quizId) || new Map<number, string[]>();

      // Convert Map to plain object for JSON serialization
      const violationsByQuestionObj: Record<string, string[]> = {};
      violationsByQuestionMap.forEach((violationList, questionIndex) => {
        const questionId = quiz.questions[questionIndex]?.id;
        if (questionId) {
          violationsByQuestionObj[questionId] = violationList;
        }
      });

      // Convert question response times (array index to questionId)
      const responseTimes = questionResponseTimes.get(quizId) || [];
      const responseTimesObj: Record<string, number> = {};
      quiz.questions.forEach((q: any, index: number) => {
        if (responseTimes[index] !== undefined) {
          responseTimesObj[q.id] = responseTimes[index];
        }
      });

      const metadata = {
        startTime: quizStartTime.get(quizId) || Date.now(),
        endTime: Date.now(),
        violationCount: violationSet.size,
        questionResponseTimes: responseTimesObj,
        violationTypes: Array.from(violationTypeSet),
        violationsByQuestion: violationsByQuestionObj,
        ipAddress: '', // Could be fetched via external service
        userAgent: navigator.userAgent,
        sessionToken: sessionStorage.getItem('sessionToken') || 'no-token',
        lockedQuestions: Array.from(answeredSet).map(idx => quiz.questions[idx]?.id).filter(Boolean),
        tabSwitchCount: violationTypeSet.has('tab_switch') ? 1 : 0,
        keyboardShortcutAttempted: violationTypeSet.has('keyboard_shortcut') || violationTypeSet.has('keyboard_blocked'),
        copyPasteAttempted: violationTypeSet.has('copy_attempt') || violationTypeSet.has('paste_attempt') || violationTypeSet.has('cut_attempt'),
        rightClickAttempted: violationTypeSet.has('right_click')
      };

      try {
        // Send to backend
        console.log('📤 Submitting quiz with security metadata:', metadata);
        const response = await axios.post(
          `${API_BASE}/manual-trainings/quizzes/${quizId}/submit`,
          {
            userId: 'current-user-id', // TODO: Replace with actual user ID
            answers: answersObj,
            metadata: metadata
          }
        );

        console.log('✅ Quiz submission response:', response.data);

        // Use server-calculated score if available
        const finalScore = response.data.data?.score ||
          Math.round((Object.values(answersObj).filter((a, i) => a === quiz.questions[i]?.correctAnswer).length / quiz.questions.length) * 100);

        // Check for security violations
        if (response.data.data?.securityViolation) {
          alert(`🚨 SECURITY VIOLATION: ${response.data.data.securityMessage}\n\nYour quiz has been rejected.`);
          onClose(); // Close simulator
          return;
        }

        // Check for penalties
        if (response.data.data?.penaltyApplied) {
          console.warn(`⚠️ Penalty applied: ${response.data.data.penaltyPercentage}% reduction due to violations`);
        }

        setQuizScores(prev => new Map(prev).set(quizId, finalScore));
        setQuizSubmitted(prev => new Map(prev).set(quizId, true));
        setCurrentQuestionIndex(prev => new Map(prev).set(quizId, 0)); // Reset to first question for review

        // Mark quiz section as completed
        if (currentSection?.id) {
          setCompletedSections(prev => new Set(prev).add(currentSection.id));
        }

        // Check if final exam is completed and passed
        if (currentModule?.id === 'final-exam') {
          const passingScore = quiz.passingScore || 80;
          if (finalScore >= passingScore) {
            setFinalExamCompleted(true);
            // Check if all modules are completed to show certification
            setTimeout(() => checkAndShowCertification(), 1000);
          }
        }
      } catch (error) {
        console.error('❌ Error submitting quiz:', error);
        alert('Error submitting quiz. Please try again.');
      }
    };

    const currentKey = `${quizId}-${currentQuestion?.id}`;
    const currentAnswer = quizAnswers.get(currentKey);

    // Count answered questions (always recalculate with current state)
    const answeredCount = quiz.questions.filter((q: any) => {
      const key = `${quizId}-${q.id}`;
      return quizAnswers.has(key);
    }).length;

    // Anti-cheating metrics
    const violationSet = violations.get(quizId) || new Set<number>();
    const violationCount = violationSet.size;
    const hasViolationOnCurrentQuestion = violationSet.has(questionIdx);
    const answeredSet = answeredQuestions.get(quizId) || new Set<number>();
    const isQuestionLocked = answeredSet.has(questionIdx);

    // Check if current question has penalty
    const penaltyKey = `${quizId}-${questionIdx}`;
    const hasPenalty = penaltyEndTime.has(penaltyKey);

    // Format timer
    const formatQuestionTimer = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Format penalty timer (MM:SS)
    const formatPenaltyTimer = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Timer warning (over 3 minutes)
    const isTimerWarning = questionTimer > 180;

    return (
      <div
        className={`bg-white rounded-lg shadow-sm h-full flex flex-col transition-all select-none ${violationFlash ? 'ring-4 ring-red-500 animate-pulse' : ''
          }`}
        style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}
        onCopy={(e) => {
          e.preventDefault();
          const quizId = currentSection.quiz?.id;
          const questionIdx = currentQuestionIndex.get(quizId || '') || 0;
          if (quizId && !isSubmitted) {
            addViolation(quizId, questionIdx, 'copy_attempt');
          }
          return false;
        }}
        onCut={(e) => {
          e.preventDefault();
          const quizId = currentSection.quiz?.id;
          const questionIdx = currentQuestionIndex.get(quizId || '') || 0;
          if (quizId && !isSubmitted) {
            addViolation(quizId, questionIdx, 'cut_attempt');
          }
          return false;
        }}
        onPaste={(e) => {
          e.preventDefault();
          const quizId = currentSection.quiz?.id;
          const questionIdx = currentQuestionIndex.get(quizId || '') || 0;
          if (quizId && !isSubmitted) {
            addViolation(quizId, questionIdx, 'paste_attempt');
          }
          return false;
        }}
        onDragStart={(e) => {
          e.preventDefault();
          return false;
        }}
      >
        {/* Quiz Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white px-4 py-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5" />
              <div>
                <h3 className="text-base font-bold">{quiz.title}</h3>
                <p className="text-xs text-indigo-100">{quiz.description}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <div className="flex items-center space-x-1">
                <List className="w-3 h-3" />
                <span>{quiz.questions.length} questions</span>
              </div>
              {quiz.timeLimit && (
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{quiz.timeLimit} min</span>
                </div>
              )}
              <div className="flex items-center space-x-1">
                <Award className="w-3 h-3" />
                <span>Pass: {quiz.passingScore}%</span>
              </div>
              {!isSubmitted && violationCount > 0 && (
                <div className="flex items-center space-x-1 bg-red-500 px-2 py-1 rounded text-white font-bold animate-pulse">
                  <AlertTriangle className="w-3 h-3" />
                  <span>⚠️ {violationCount} violations</span>
                </div>
              )}
              {!isSubmitted && (
                <>
                  {/* 45-second countdown timer per question */}
                  <div className={`flex items-center space-x-1 px-2 py-1 rounded font-mono font-bold ${questionTimeLeft <= 10
                    ? 'bg-red-500 text-white animate-pulse'
                    : questionTimeLeft <= 20
                      ? 'bg-orange-500 text-white'
                      : 'bg-blue-500 text-white'
                    }`}>
                    <Clock className="w-3 h-3" />
                    <span>{questionTimeLeft}s</span>
                  </div>
                  {/* Elapsed time timer */}
                  <div className={`flex items-center space-x-1 px-2 py-1 rounded font-mono font-bold ${isTimerWarning ? 'bg-orange-500 text-white animate-pulse' : 'bg-gray-100 text-gray-800'
                    }`}>
                    <Clock className="w-3 h-3" />
                    <span>{formatQuestionTimer(questionTimer)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quiz Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-3">
          {!isSubmitted ? (
            <div className="space-y-3 h-full flex flex-col">
              {/* Progress bar */}
              <div className="flex-shrink-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700">
                    Question {questionIdx + 1} of {quiz.questions.length}
                  </span>
                  <span className="text-xs text-gray-600">
                    {answeredCount} / {quiz.questions.length} answered
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${((questionIdx + 1) / quiz.questions.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Fraud Warning Banner */}
              {hasViolationOnCurrentQuestion && (
                <div className="bg-red-600 text-white p-4 rounded-lg shadow-lg animate-pulse flex-shrink-0">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="w-8 h-8" />
                    <div className="flex-1">
                      <h4 className="font-bold text-lg">🚨 FRAUD DETECTED</h4>
                      <p className="text-sm mt-1">
                        This question is locked. Auto-advancing to next question in 2 seconds...
                      </p>
                      <p className="text-xs mt-1 opacity-90">
                        ⚠️ This cheating attempt has been recorded in your report.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Current Question */}
              <div className={`rounded-lg p-4 border-2 flex-1 flex flex-col transition-all ${hasViolationOnCurrentQuestion
                ? 'bg-red-50 border-red-300'
                : 'bg-gray-50 border-gray-200'
                }`}>
                <div className="flex items-start space-x-3 mb-3 flex-shrink-0">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-base ${hasViolationOnCurrentQuestion
                    ? 'bg-red-600 text-white'
                    : 'bg-indigo-600 text-white'
                    }`}>
                    {questionIdx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="text-base font-medium text-gray-900 mb-1">{currentQuestion.question}</p>
                      {hasViolationOnCurrentQuestion && (
                        <span className="flex-shrink-0 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-bold">
                          ⚠️ Violation
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{currentQuestion.points} points</p>
                  </div>
                </div>

                <div className="space-y-2 ml-13 flex-1">
                  {currentQuestion.type === 'multiple-choice' && currentQuestion.options?.map((option: string, optIndex: number) => (
                    <label
                      key={optIndex}
                      className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all ${hasViolationOnCurrentQuestion
                        ? 'cursor-not-allowed opacity-50 bg-gray-100 border-gray-300'
                        : currentAnswer === optIndex
                          ? 'cursor-pointer border-indigo-600 bg-indigo-50 shadow-md'
                          : 'cursor-pointer border-gray-300 hover:border-indigo-400 hover:bg-gray-100'
                        }`}
                    >
                      <input
                        type="radio"
                        name={`question-${currentKey}`}
                        checked={currentAnswer === optIndex}
                        onChange={() => !hasViolationOnCurrentQuestion && handleAnswerChange(currentQuestion.id, optIndex)}
                        disabled={hasViolationOnCurrentQuestion}
                        className="w-5 h-5"
                      />
                      <span className="text-sm text-gray-800">{option}</span>
                    </label>
                  ))}

                  {currentQuestion.type === 'true-false' && (
                    <div className="space-y-2">
                      {['True', 'False'].map((option) => (
                        <label
                          key={option}
                          className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all ${hasViolationOnCurrentQuestion
                            ? 'cursor-not-allowed opacity-50 bg-gray-100 border-gray-300'
                            : currentAnswer === (option === 'True')
                              ? 'cursor-pointer border-indigo-600 bg-indigo-50 shadow-md'
                              : 'cursor-pointer border-gray-300 hover:border-indigo-400 hover:bg-gray-100'
                            }`}
                        >
                          <input
                            type="radio"
                            name={`question-${currentKey}`}
                            checked={currentAnswer === (option === 'True')}
                            onChange={() => !hasViolationOnCurrentQuestion && handleAnswerChange(currentQuestion.id, option === 'True')}
                            disabled={hasViolationOnCurrentQuestion}
                            className="w-5 h-5"
                          />
                          <span className="text-sm text-gray-800">{option}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 h-full flex flex-col">
              {/* Quiz Result */}
              <div className={`p-3 rounded-lg text-center flex-shrink-0 ${score >= (quiz.passingScore || 80)
                ? 'bg-emerald-50 border-2 border-emerald-500'
                : 'bg-red-50 border-2 border-red-500'
                }`}>
                <div className="flex items-center justify-center mb-2">
                  {score >= (quiz.passingScore || 80) ? (
                    <Trophy className="w-10 h-10 text-emerald-600" />
                  ) : (
                    <Target className="w-10 h-10 text-red-600" />
                  )}
                </div>
                <h3 className={`text-base font-bold mb-1 ${score >= (quiz.passingScore || 80) ? 'text-emerald-800' : 'text-red-800'
                  }`}>
                  {score >= (quiz.passingScore || 80) ? 'Congratulations! 🎉' : 'Keep Learning! 💪'}
                </h3>
                <p className={`text-xl font-semibold mb-1 ${score >= (quiz.passingScore || 80) ? 'text-emerald-700' : 'text-red-700'
                  }`}>
                  {score}%
                </p>
                <p className="text-xs text-gray-600">
                  {score >= (quiz.passingScore || 80)
                    ? `You passed! Required: ${quiz.passingScore}%`
                    : `Required: ${quiz.passingScore}% to pass`
                  }
                </p>
              </div>

              {/* Violations Summary */}
              {violationCount > 0 && (
                <div className="flex-shrink-0 p-3 bg-orange-50 border-2 border-orange-300 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    <div>
                      <p className="text-sm font-semibold text-orange-900">
                        ⚠️ {violationCount} violation{violationCount > 1 ? 's' : ''} detected
                      </p>
                      <p className="text-xs text-orange-700">
                        Cheating attempt recorded in your report
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quiz Footer */}
        {isSubmitted && (
          <div className="border-t border-gray-200 p-3 flex-shrink-0 bg-gray-50">
            <div className="flex items-center justify-center gap-3">
              {!canProceedToNextModule() && (
                <button
                  onClick={() => {
                    // Go back to the first section of the current module
                    setCurrentSectionIndex(0);

                    // Reset quiz state
                    setQuizSubmitted(prev => {
                      const newMap = new Map(prev);
                      newMap.delete(quizId);
                      return newMap;
                    });
                    setQuizAnswers(prev => {
                      const newMap = new Map(prev);
                      // Clear all answers for this quiz
                      quiz.questions.forEach((q: any) => {
                        newMap.delete(`${quizId}-${q.id}`);
                      });
                      return newMap;
                    });
                    setQuizScores(prev => {
                      const newMap = new Map(prev);
                      newMap.delete(quizId);
                      return newMap;
                    });
                    setCurrentQuestionIndex(prev => new Map(prev).set(quizId, 0));

                    // Clear violations for this quiz
                    setViolations(prev => {
                      const newMap = new Map(prev);
                      newMap.delete(quizId);
                      return newMap;
                    });

                    // Clear completed sections for this module (so user can review)
                    if (currentModule) {
                      setCompletedSections(prev => {
                        const newSet = new Set(prev);
                        currentModule.sections?.forEach(section => {
                          newSet.delete(section.id);
                        });
                        return newSet;
                      });
                    }
                  }}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg text-sm font-medium shadow-lg transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="font-semibold">Back to Module Start</span>
                </button>
              )}
              <button
                onClick={handleSectionComplete}
                disabled={!canProceedToNextModule()}
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg text-sm font-medium shadow-lg transition-all ${canProceedToNextModule()
                  ? 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white cursor-pointer'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
                  }`}
              >
                <span className="font-semibold">
                  {canProceedToNextModule() ? 'Continue to next module' : `❌ Minimum score required: ${quiz.passingScore || 70}%`}
                </span>
                {canProceedToNextModule() && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
        {!isSubmitted && !hasViolationOnCurrentQuestion && (
          <div className="border-t border-gray-200 p-2 flex-shrink-0 bg-gray-50">
            <div className="flex items-center justify-between">
              <button
                onClick={handlePreviousQuestion}
                disabled={questionIdx === 0 || (answeredSet.has(questionIdx - 1))}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${questionIdx === 0 || (answeredSet.has(questionIdx - 1))
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Previous</span>
              </button>

              <div className="text-center">
                <p className="text-xs text-gray-600">
                  {answeredCount} / {quiz.questions.length} answered
                </p>
                {answeredCount < quiz.questions.length && (
                  <p className="text-xs text-orange-600 italic">
                    Unanswered = 0 points
                  </p>
                )}
              </div>

              {questionIdx < quiz.questions.length - 1 ? (
                <button
                  onClick={handleNextQuestion}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <span>Next</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              ) : (
                <button
                  onClick={handleSubmitQuiz}
                  data-auto-submit="true"
                  className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg"
                >
                  Submit Quiz
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };


  // Render completion message function
  const renderCompletionMessage = () => {
    const finalExamModule = modules.find(m => m.id === 'final-exam');
    const finalExamQuiz = finalExamModule ? quizzes.get('final-exam') : null;
    const finalExamScore = finalExamQuiz ? (quizScores.get(finalExamQuiz.id) || 0) : 0;
    const completionDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const regularModules = modules.filter(m => m.id !== 'final-exam');
    const totalCompletedSections = regularModules.reduce((total, module) => {
      return total + (module.sections?.filter(s => completedSections.has(s.id)).length || 0);
    }, 0);

    return (
      <div className="bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 rounded-xl border-4 border-amber-400 shadow-2xl overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 p-6 text-center">
          <div className="flex justify-center mb-3">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg">
              <Trophy className="w-16 h-16 text-amber-600" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">🎉 Félicitations !</h1>
          <p className="text-lg text-amber-900 font-semibold">Formation Terminée avec Succès</p>
        </div>

        {/* Certificate Content */}
        <div className="p-8 text-center">
          <p className="text-base text-gray-700 mb-4">
            Vous avez terminé avec succès la formation
          </p>
          <h3 className="text-2xl font-bold text-indigo-700 mb-6">
            {trainingTitle}
          </h3>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 my-6">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border-2 border-blue-200">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {regularModules.length}
              </div>
              <div className="text-xs text-gray-600">Modules Complétés</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border-2 border-green-200">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {totalCompletedSections}
              </div>
              <div className="text-xs text-gray-600">Sections Complétées</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-lg border-2 border-purple-200">
              <div className="text-2xl font-bold text-purple-600 mb-1">
                {finalExamScore}%
              </div>
              <div className="text-xs text-gray-600">Score Examen Final</div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t-2 border-gray-200">
            <p className="text-gray-600 mb-1 text-sm">Date de Complétion</p>
            <p className="text-lg font-semibold text-gray-800">{completionDate}</p>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex justify-center space-x-3">
            <button
              onClick={() => window.print()}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold shadow-lg flex items-center space-x-2 text-sm"
            >
              <FileText className="w-4 h-4" />
              <span>Imprimer le Certificat</span>
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-semibold text-sm"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading training...</p>
        </div>
      </div>
    );
  }

  if (modules.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Modules Found</h2>
          <p className="text-gray-600 mb-4">Add modules to your training first.</p>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Back to Editor
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-gray-100 overflow-hidden">
      {/* Sidebar - Curriculum */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-0'} bg-white border-r border-gray-200 flex flex-col transition-all duration-300 overflow-hidden shadow-xl`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
          <div className="flex items-center justify-between text-white mb-2">
            <h2 className="font-bold text-lg">Course Content</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center justify-between text-sm text-indigo-100">
            <span>{modules.length} modules</span>
            <span>{totalSections} sections</span>
          </div>
        </div>

        {/* Modules List */}
        <div className="flex-1 overflow-y-auto">
          {modules.map((module, moduleIndex) => {
            const isExpanded = expandedModules.has(module.id);
            const isCurrentModule = moduleIndex === currentModuleIndex;
            const moduleCompleted = completedModules.has(module.id);
            const isLocked = !canAccessModule(moduleIndex);

            return (
              <div key={module.id} className="border-b border-gray-200">
                {/* Module Header */}
                <button
                  onClick={() => toggleModule(module.id)}
                  disabled={isLocked}
                  className={`w-full p-4 flex items-center justify-between transition-all ${isLocked
                    ? 'opacity-50 cursor-not-allowed bg-gray-100'
                    : 'hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50'
                    } ${isCurrentModule ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-l-4 border-indigo-600' : ''
                    }`}
                >
                  <div className="flex items-center space-x-3 flex-1 text-left">
                    {isLocked ? (
                      <Lock className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    ) : module.id === 'final-exam' ? (
                      <Award className={`w-5 h-5 flex-shrink-0 ${isCurrentModule ? 'text-orange-600' : 'text-orange-500'}`} />
                    ) : isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-600 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs mb-1 ${isLocked
                        ? 'text-gray-400'
                        : module.id === 'final-exam'
                          ? 'text-orange-600 font-semibold'
                          : 'text-gray-500'
                        }`}>
                        {isLocked && '🔒 '}
                        {module.id === 'final-exam' ? '🏆 Final Exam' : `Module ${moduleIndex + 1}`}
                      </p>
                      <p className={`font-semibold text-sm ${isLocked
                        ? 'text-gray-400'
                        : isCurrentModule
                          ? (module.id === 'final-exam' ? 'text-orange-700' : 'text-indigo-700')
                          : 'text-gray-900'
                        } truncate`}>
                        {module.title}
                      </p>
                    </div>
                    {moduleCompleted && !isLocked && (
                      <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    )}
                    {isLocked && (
                      <span className="text-xs text-gray-400 font-medium">Locked</span>
                    )}
                  </div>
                </button>

                {/* Sections List */}
                {isExpanded && module.sections && (
                  <div className="bg-gray-50">
                    {module.sections.map((section, sectionIndex) => {
                      const isCurrentSection = isCurrentModule && sectionIndex === currentSectionIndex;
                      const sectionCompleted = completedSections.has(section.id);

                      return (
                        <button
                          key={section.id}
                          onClick={() => {
                            // Don't allow navigation to completed sections
                            if (!sectionCompleted) {
                              goToSection(moduleIndex, sectionIndex);
                            }
                          }}
                          disabled={sectionCompleted}
                          className={`w-full p-3 pl-12 flex items-center space-x-3 transition-all border-l-4 ${sectionCompleted
                            ? 'opacity-50 cursor-not-allowed bg-gray-100 border-transparent'
                            : isCurrentSection
                              ? 'border-indigo-600 bg-gradient-to-r from-indigo-50 to-purple-50 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50'
                              : 'border-transparent hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50'
                            }`}
                        >
                          <div className={`${sectionCompleted ? 'text-gray-400' : isCurrentSection ? 'text-indigo-600' : 'text-gray-500'}`}>
                            {getSectionIcon(section.type)}
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className={`text-sm ${sectionCompleted
                              ? 'text-gray-400'
                              : isCurrentSection
                                ? 'text-indigo-900 font-medium'
                                : 'text-gray-700'
                              } truncate`}>
                              {section.title}
                            </p>
                            {section.estimatedDuration && (
                              <p className={`text-xs ${sectionCompleted ? 'text-gray-400' : 'text-gray-500'}`}>
                                {section.estimatedDuration} min
                              </p>
                            )}
                          </div>
                          {sectionCompleted && (
                            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Menu className="w-6 h-6 text-gray-600" />
                </button>
              )}
              <button
                onClick={onClose}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Exit</span>
              </button>
              <div className="h-8 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">{currentSection?.title || trainingTitle}</h1>
                <p className="text-xs text-gray-600">{trainingTitle}</p>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 text-gray-600">
                <Clock className="w-5 h-5" />
                <span className="font-mono text-sm">{formatTime(elapsedTime)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-32 bg-gray-200 rounded-full h-2 shadow-inner">
                  <div
                    className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 h-2 rounded-full transition-all duration-300 shadow-sm"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700">{Math.round(progress)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-3">
          <div className="h-full flex flex-col space-y-3">
            {/* Section Content */}
            <div className="flex-1">
              {renderSectionContent()}
            </div>

            {/* Navigation Buttons - Hide for quiz sections and completion message */}
            {!showCertification && currentSection?.type !== 'quiz' && (
              <div className="bg-white rounded-lg shadow-sm p-3">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      if (currentSectionIndex > 0) {
                        setCurrentSectionIndex(prev => prev - 1);
                      } else if (currentModuleIndex > 0) {
                        setCurrentModuleIndex(prev => prev - 1);
                        const prevModule = modules[currentModuleIndex - 1];
                        setCurrentSectionIndex((prevModule?.sections?.length || 1) - 1);
                      }
                    }}
                    disabled={currentModuleIndex === 0 && currentSectionIndex === 0}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 text-gray-700 rounded-lg font-medium transition-colors text-sm"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>

                  <button
                    onClick={handleSectionComplete}
                    disabled={!canComplete()}
                    className={`flex items-center space-x-2 px-6 py-2 rounded-lg font-medium shadow-lg transition-all text-sm transform hover:scale-105 ${canComplete()
                      ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white cursor-pointer'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                  >
                    <span>{completedSections.has(currentSection?.id || '') ? 'Next' : 'Complete & Continue'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

