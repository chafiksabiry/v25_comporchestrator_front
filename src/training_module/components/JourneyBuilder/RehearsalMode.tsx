import React, { useState, useEffect, useMemo } from 'react';
import { Play, Pause, RotateCcw, CheckCircle, AlertTriangle, MessageSquare, Star, Eye, Users, Rocket, ArrowLeft, ArrowRight, Clock, BarChart3, Zap, Video, BookOpen, Edit3, Save, X as XIcon, Trash2, Plus, Download, FileText, Image as ImageIcon, Youtube, Sparkles, Loader2, FileQuestion } from 'lucide-react';
import DocumentViewer from '../DocumentViewer/DocumentViewer';
import { TrainingJourney, TrainingModule, RehearsalFeedback, ContentUpload, Assessment, Question } from '../../types';
import { TrainingMethodology } from '../../types/methodology';
import ModuleContentViewer from '../Training/ModuleContentViewer';
import { TrainingSection, SectionContent, ContentFile } from '../../types/manualTraining';
import { AIService } from '../../infrastructure/services/AIService';
import { DraftService } from '../../infrastructure/services/DraftService';
import axios from 'axios';

interface SlideData {
  title: string;
  content: string;
  bgColor: string;
  textColor: string;
}

// Extended module interface to support sections
interface ModuleWithSections extends TrainingModule {
  sections?: TrainingSection[];
}

interface RehearsalModeProps {
  journey: TrainingJourney;
  modules: TrainingModule[];
  uploads?: ContentUpload[];
  methodology?: TrainingMethodology;
  onComplete: (feedback: RehearsalFeedback[], rating: number) => void;
  onBack: () => void;
}

export default function RehearsalMode({ journey, modules, uploads = [], methodology, onComplete, onBack }: RehearsalModeProps) {
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [completedModules, setCompletedModules] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<RehearsalFeedback[]>([]);
  const [overallRating, setOverallRating] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState({
    type: 'content' as RehearsalFeedback['type'],
    message: '',
    severity: 'medium' as RehearsalFeedback['severity']
  });
  const [rehearsalTime, setRehearsalTime] = useState(0);
  const [showContentViewer, setShowContentViewer] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  // Removed activeTab state - only sections tab now
  const [slideData, setSlideData] = useState<SlideData[]>([]);
  const [slideImages, setSlideImages] = useState<string[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isGeneratingPPT, setIsGeneratingPPT] = useState(false);
  const [showPPTViewer, setShowPPTViewer] = useState(false);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  const [generatingQuizForModule, setGeneratingQuizForModule] = useState<string | null>(null);
  const [generatingFinalExam, setGeneratingFinalExam] = useState(false);
  const [expandedQuizId, setExpandedQuizId] = useState<string | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editedQuestions, setEditedQuestions] = useState<Record<string, Question>>({});
  const [updatedModules, setUpdatedModules] = useState<TrainingModule[]>(modules);
  // Quiz configuration is now automatic - no modal needed

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

  // Convert uploads to sections if modules don't have sections
  const modulesWithSections = useMemo(() => {
    return updatedModules.map((module, moduleIndex) => {
      const moduleWithSections = module as ModuleWithSections;

      // If module already has sections, use them
      if (moduleWithSections.sections && moduleWithSections.sections.length > 0) {
        // Check if sections have URLs
        moduleWithSections.sections.forEach((section, idx) => {
          const fileUrl = section.content?.file?.url;
          if (!fileUrl) {
            console.warn(`⚠️ Section ${idx} in module ${moduleIndex} has no file URL`);
          }
        });
        return moduleWithSections;
      }

      // Otherwise, create sections from uploads
      // Match uploads to modules based on index or content
      const relevantUploads = uploads.filter((upload, uploadIndex) => {
        // Try to match by module title or use index-based matching
        const moduleTitleLower = module.title.toLowerCase();
        const uploadNameLower = upload.name.toLowerCase();
        return moduleTitleLower.includes(uploadNameLower.replace(/\.[^/.]+$/, '')) ||
          uploadIndex === moduleIndex;
      });

      // If no direct match, use all uploads for first module, or distribute
      const uploadsToUse = relevantUploads.length > 0
        ? relevantUploads
        : (moduleIndex === 0 ? uploads : []);

      const sections: TrainingSection[] = uploadsToUse.map((upload, uploadIdx) => {
        // Determine section type based on upload type
        let sectionType: TrainingSection['type'] = 'document';
        if (upload.type === 'video') {
          sectionType = 'video';
        } else if (upload.type === 'document' || upload.type === 'presentation') {
          sectionType = 'document';
        }

        // Get AI description from upload analysis (formatted nicely)
        const aiDescription = upload.aiAnalysis
          ? `📚 **Key Topics:**\n${upload.aiAnalysis.keyTopics?.map(topic => `• ${topic}`).join('\n') || 'N/A'}\n\n` +
          `🎯 **Learning Objectives:**\n${upload.aiAnalysis.learningObjectives?.map(obj => `• ${obj}`).join('\n') || 'N/A'}\n\n` +
          `⏱️ **Estimated Duration:** ${upload.aiAnalysis.estimatedReadTime || 0} minutes\n\n` +
          `📊 **Difficulty Level:** ${upload.aiAnalysis.difficulty || 'N/A'}/10`
          : `Document: ${upload.name}`;

        // Create content file from upload
        // Use Cloudinary URL if available (persistent), otherwise fallback to blob URL
        let fileUrl = '';
        let filePublicId = upload.id;

        if (upload.cloudinaryUrl) {
          // Use Cloudinary URL (persistent)
          fileUrl = upload.cloudinaryUrl;
          filePublicId = upload.publicId || upload.id;
          console.log(`✅ Using Cloudinary URL for ${upload.name}:`, fileUrl);
        } else if (upload.file) {
          // Fallback to blob URL (temporary, but works for now)
          try {
            fileUrl = URL.createObjectURL(upload.file);
            console.log(`⚠️ Using blob URL for ${upload.name} (Cloudinary URL not available)`);
          } catch (e) {
            console.warn('Could not create object URL for file:', upload.name, e);
          }
        }

        const contentFile: ContentFile = {
          id: upload.id,
          name: upload.name,
          type: upload.type === 'video' ? 'video' :
            upload.type === 'presentation' ? 'pdf' :
              upload.type === 'document' ? 'pdf' : 'pdf',
          url: fileUrl, // Cloudinary URL or blob URL
          publicId: filePublicId, // Cloudinary public ID or upload ID
          size: upload.size || 0,
          mimeType: upload.type === 'video' ? 'video/mp4' :
            upload.type === 'document' ? 'application/pdf' :
              upload.type === 'presentation' ? 'application/pdf' : 'application/pdf'
        };

        const sectionContent: SectionContent = {
          text: aiDescription,
          file: contentFile,
          keyPoints: upload.aiAnalysis?.keyTopics || []
        };

        return {
          id: `section-${moduleIndex}-${uploadIdx}`,
          title: upload.name.replace(/\.[^/.]+$/, ''),
          type: sectionType,
          content: sectionContent,
          orderIndex: uploadIdx + 1,
          estimatedDuration: upload.aiAnalysis?.estimatedReadTime || 10
        };
      });

      const result = {
        ...moduleWithSections,
        sections: sections.length > 0 ? sections : undefined
      };

      console.log(`📦 Module ${moduleIndex} (${module.title}) - Created ${sections.length} sections from uploads`);
      sections.forEach((section, idx) => {
        const fileUrl = section.content?.file?.url;
        console.log(`  📄 Section ${idx} (${section.title}):`, fileUrl || 'NO URL');
      });

      return result;
    });
  }, [updatedModules, uploads]);

  const currentModule = modulesWithSections[currentModuleIndex];
  const isLastModule = currentModuleIndex === updatedModules.length - 1;
  const hasSections = currentModule?.sections && currentModule.sections.length > 0;
  const currentSection = hasSections ? currentModule.sections[currentSectionIndex] : null;

  // Debug logs
  useEffect(() => {
    if (currentSection) {
      console.log('📋 Current Section:', {
        id: currentSection.id,
        title: currentSection.title,
        type: currentSection.type,
        hasContent: !!currentSection.content,
        hasFile: !!currentSection.content?.file,
        fileUrl: currentSection.content?.file?.url,
        fullSection: currentSection
      });
    } else {
      console.warn('⚠️ No current section available');
    }
  }, [currentSection]);
  const progress = (completedModules.length / updatedModules.length) * 100;

  // Calculate section progress
  const sectionProgress = hasSections && currentModule.sections.length > 0
    ? (completedSections.size / currentModule.sections.length) * 100
    : 0;

  // Auto-display content viewer on load
  useEffect(() => {
    setShowContentViewer(true);
  }, []);

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

  const handleModuleComplete = () => {
    // Prevent scrolling when switching modules
    shouldScrollRef.current = false;

    if (currentModule && !completedModules.includes(currentModule.id)) {
      setCompletedModules(prev => [...prev, currentModule.id]);
    }

    // Mark all sections as completed
    if (currentModule && currentModule.sections) {
      const sectionIds = currentModule.sections.map(s => s.id || '');
      setCompletedSections(prev => {
        const newSet = new Set(prev);
        sectionIds.forEach(id => newSet.add(id));
        return newSet;
      });
    }

    // Check if current module has quizzes/assessments
    const hasQuizzes = currentModule?.quizzes && currentModule.quizzes.length > 0;
    const hasAssessments = currentModule?.assessments && currentModule.assessments.length > 0;

    // If module has quizzes/assessments, scroll to them first, then move to next module
    if (hasQuizzes || hasAssessments) {
      // Scroll to quizzes section briefly to show them
      setTimeout(() => {
        const quizSection = document.getElementById('module-quizzes-section');
        if (quizSection) {
          quizSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        // After showing quizzes, move to next module
        setTimeout(() => {
          if (currentModuleIndex < updatedModules.length - 1) {
            setCurrentModuleIndex(prev => prev + 1);
            setCurrentSectionIndex(0);
          }
        }, 500);
      }, 100);
      return;
    }

    // If no quizzes/assessments exist, scroll to quizzes section to show "Generate Quiz" button
    // Then move to next module after a brief delay
    setTimeout(() => {
      const quizSection = document.getElementById('module-quizzes-section');
      if (quizSection) {
        quizSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      // Move to next module after showing the generate button
      setTimeout(() => {
        if (currentModuleIndex < updatedModules.length - 1) {
          setCurrentModuleIndex(prev => prev + 1);
          setCurrentSectionIndex(0);
        }
      }, 500);
    }, 100);
  };

  const handleSectionComplete = () => {
    // Prevent scrolling when switching sections
    shouldScrollRef.current = false;

    if (currentSection?.id) {
      setCompletedSections(prev => new Set(prev).add(currentSection.id!));
    }

    if (hasSections && currentSectionIndex < currentModule.sections!.length - 1) {
      setCurrentSectionIndex(prev => prev + 1);
    } else {
      handleModuleComplete();
    }
  };

  const handleNextSection = () => {
    // Prevent scrolling when clicking Next
    shouldScrollRef.current = false;

    if (hasSections && currentSectionIndex < currentModule.sections!.length - 1) {
      setCurrentSectionIndex(prev => prev + 1);
    } else if (currentModuleIndex < updatedModules.length - 1) {
      setCurrentModuleIndex(prev => prev + 1);
      setCurrentSectionIndex(0);
    }
  };

  const handlePreviousSection = () => {
    // Prevent scrolling when clicking Previous
    shouldScrollRef.current = false;

    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(prev => prev - 1);
    } else if (currentModuleIndex > 0) {
      setCurrentModuleIndex(prev => prev - 1);
      const prevModule = updatedModules[currentModuleIndex - 1];
      setCurrentSectionIndex(prevModule.sections?.length ? prevModule.sections.length - 1 : 0);
    }
  };

  // Track if we should scroll (don't scroll when marking complete)
  const shouldScrollRef = React.useRef(true);
  const savedScrollPositionRef = React.useRef<number>(0);

  // Reset section index when module changes - no scroll if coming from Mark Complete
  useEffect(() => {
    setCurrentSectionIndex(0);
    // Only scroll if it's a manual navigation, not from Mark Complete
    if (shouldScrollRef.current) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    // Reset scroll flag after handling
    shouldScrollRef.current = true;
  }, [currentModuleIndex]);

  // Scroll to top when section changes (only if shouldScroll is true)
  useEffect(() => {
    if (shouldScrollRef.current) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Restore saved scroll position when marking complete
      window.scrollTo({ top: savedScrollPositionRef.current, behavior: 'instant' });
    }
    shouldScrollRef.current = true; // Reset for next time
  }, [currentSectionIndex]);

  const handlePreviousModule = () => {
    if (currentModuleIndex > 0) {
      setCurrentModuleIndex(prev => prev - 1);
    }
  };

  const handleNextModule = () => {
    if (currentModuleIndex < updatedModules.length - 1) {
      setCurrentModuleIndex(prev => prev + 1);
    }
  };

  // Get API base URL
  const getApiBaseUrl = () => {
    if (import.meta.env.VITE_API_BASE_URL) {
      return import.meta.env.VITE_API_BASE_URL;
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

      // Calculate passing score (always 70% - percentage, not points)
      const totalPoints = assessmentQuestions.reduce((sum, q) => sum + (q.points || 10), 0);
      const passingScore = 70; // Always 70% (percentage)

      // IMPORTANT: Get draftId first to use MongoDB ObjectId instead of journey.id (which might be a timestamp)
      const isValidMongoId = (id: string | undefined) => id && /^[0-9a-fA-F]{24}$/.test(id);
      const currentDraft = DraftService.getDraft();
      const existingDraftId = currentDraft.draftId; // Never use journey.id as it might be a timestamp

      // Validate that it's a MongoDB ObjectId
      if (existingDraftId && !isValidMongoId(existingDraftId)) {
        console.warn('[RehearsalMode] Invalid draftId format (not MongoDB ObjectId):', existingDraftId, '- will use fallback');
      }

      // Use existingDraftId if valid, otherwise use journey._id, never journey.id (timestamp)
      const journeyIdForUse = (existingDraftId && isValidMongoId(existingDraftId))
        ? existingDraftId
        : ((journey as any)._id && isValidMongoId((journey as any)._id))
          ? (journey as any)._id
          : undefined;

      // Create assessment
      const assessment: Assessment = {
        id: isFinalExam
          ? `final-exam-${journeyIdForUse || 'new'}`
          : `assessment-${moduleId}-${Date.now()}`,
        title: isFinalExam
          ? `Final Exam - ${journey.name}`
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
        console.log('[RehearsalMode] Saving quiz locally only (not to backend yet)');

        // Save locally to preserve the quiz in localStorage
        DraftService.saveDraftLocally({
          modules: updatedModulesList
        });
        console.log('[RehearsalMode] ✓ Quiz saved locally');
      } catch (draftError) {
        console.warn('[RehearsalMode] Could not save quiz locally:', draftError);
      }

      // NOTE: We do NOT save to backend here because:
      // 1. Modules might still have temporary IDs (module-1, module-2, etc.)
      // 2. Saving to backend would delete and recreate all modules unnecessarily
      // 3. Quizzes will be properly saved when the journey is launched via JourneyService.launchJourney
      console.log('[RehearsalMode] Quiz will be saved to backend when journey is launched');

      if (isFinalExam) {
        console.log(`[Final Exam] Generated ${assessmentQuestions.length} questions (requested: ${finalConfig.totalQuestions})`);
        if (assessmentQuestions.length !== finalConfig.totalQuestions) {
          console.error(`[Final Exam] ❌ ERROR: Expected ${finalConfig.totalQuestions} questions but got ${assessmentQuestions.length}`);
        }
      }
    } catch (error) {
      console.error(`❌ Error generating ${isFinalExam ? 'final exam' : 'quiz'}:`, error);
      alert(`Error generating ${isFinalExam ? 'final exam' : 'quiz'}. Please try again.`);
    } finally {
      if (!isFinalExam) {
        setGeneratingQuizForModule(null);
      } else {
        setGeneratingFinalExam(false);
      }
    }
  };

  const addFeedback = () => {
    if (!currentFeedback.message.trim()) return;

    const newFeedback: RehearsalFeedback = {
      id: Date.now().toString(),
      moduleId: currentModule?.id || 'general',
      type: currentFeedback.type,
      message: currentFeedback.message,
      severity: currentFeedback.severity,
      timestamp: new Date().toISOString(),
      resolved: false
    };

    setFeedback(prev => [...prev, newFeedback]);
    setCurrentFeedback({ type: 'content', message: '', severity: 'medium' });
    setShowFeedbackForm(false);
  };

  const handleFinishRehearsal = () => {
    onComplete(feedback, overallRating);
  };

  const handlePlayContent = () => {
    setShowContentViewer(true);
    setActiveTab('ppt');
    setIsPlaying(true);
    console.log('▶️ Displaying content viewer');
  };

  const handleContentComplete = () => {
    alert('🎉 All content completed! Great job!');
    handleFinishRehearsal();
  };

  // Generate slides from modules
  const generateSlides = (): SlideData[] => {
    const colors = ['#EC4899', '#F59E0B', '#10B981', '#06B6D4', '#3B82F6', '#A855F7'];

    const slides: SlideData[] = [
      {
        title: 'Training Curriculum',
        content: journey.name || 'Professional Training',
        bgColor: '#6366F1',
        textColor: '#FFFFFF'
      },
      {
        title: 'Overview',
        content: `Complete training with ${updatedModules.length} modules • Total: ${updatedModules.reduce((sum, m) => sum + m.duration, 0)} min`,
        bgColor: '#8B5CF6',
        textColor: '#FFFFFF'
      }
    ];

    // Generate detailed slides for each module
    updatedModules.forEach((module, index) => {
      const moduleColor = colors[index % colors.length];

      // Module title slide
      slides.push({
        title: `Module ${index + 1}: ${module.title}`,
        content: `Duration: ${module.duration} min • Level: ${module.difficulty}`,
        bgColor: moduleColor,
        textColor: '#FFFFFF'
      });

      // Module description slide
      slides.push({
        title: 'Introduction',
        content: module.description,
        bgColor: moduleColor,
        textColor: '#FFFFFF'
      });

      // Learning objectives slide
      if (module.learningObjectives && module.learningObjectives.length > 0) {
        slides.push({
          title: 'Learning Objectives',
          content: '• ' + module.learningObjectives.join('\n• '),
          bgColor: moduleColor,
          textColor: '#FFFFFF'
        });
      }

      // Content items - Create a slide for each content item with its full text
      if (module.content && module.content.length > 0) {
        module.content.forEach((contentItem, contentIndex) => {
          // Extract text content from the item
          let contentText = '';

          // Generate descriptive text based on content type
          if (typeof contentItem.content === 'string') {
            contentText = contentItem.content;
          } else if (typeof contentItem.content === 'object' && contentItem.content !== null) {
            // Handle different content types
            if ('text' in contentItem.content) {
              contentText = contentItem.content.text;
            } else if ('description' in contentItem.content) {
              contentText = contentItem.content.description;
            } else if ('questionCount' in contentItem.content) {
              contentText = `This assessment contains ${contentItem.content.questionCount} questions to evaluate your understanding of the module content.\n\nTopics covered:\n• Key concepts and principles\n• Practical applications\n• Best practices\n\nDuration: ${contentItem.duration} minutes`;
            } else if ('modules' in contentItem.content && Array.isArray(contentItem.content.modules)) {
              contentText = `Interactive learning module covering:\n\n• ${contentItem.content.modules.join('\n• ')}\n\nThis hands-on activity helps reinforce your understanding through practical exercises.`;
            } else if ('generatedByAI' in contentItem.content) {
              // Generate descriptive content based on type
              const typeDescriptions: Record<string, string> = {
                'video': `This AI-generated video provides a comprehensive visual explanation of ${contentItem.title}.\n\nKey points covered:\n• Visual demonstrations\n• Step-by-step explanations\n• Real-world examples\n• Best practices\n\nDuration: ${contentItem.duration} minutes`,
                'infographic': `This interactive infographic presents key information about ${contentItem.title} in a visually engaging format.\n\nFeatures:\n• Data visualizations\n• Key statistics\n• Process flows\n• Important concepts\n\nExplore the infographic to discover insights.`,
                'interactive': `This interactive exercise allows you to practice ${contentItem.title} concepts.\n\nActivities include:\n• Scenario-based learning\n• Decision-making exercises\n• Problem-solving tasks\n• Real-world simulations\n\nEstimated time: ${contentItem.duration} minutes`,
                'audio': `Audio content covering ${contentItem.title}.\n\nListen to expert explanations and insights about:\n• Core concepts\n• Practical applications\n• Industry best practices\n• Case studies\n\nDuration: ${contentItem.duration} minutes`
              };

              contentText = typeDescriptions[contentItem.type] || `This ${contentItem.type} content covers important aspects of ${contentItem.title}.\n\nDuration: ${contentItem.duration} minutes\nType: AI-Enhanced ${contentItem.type}\n\nEngage with this content to deepen your understanding of the subject matter.`;
            } else {
              // Default description
              contentText = `This learning content focuses on ${contentItem.title}.\n\nType: ${contentItem.type.toUpperCase()}\nDuration: ${contentItem.duration} minutes\n\nThis material is designed to help you understand and apply key concepts effectively.`;
            }
          } else {
            // Fallback for undefined content
            contentText = `${contentItem.title}\n\nThis ${contentItem.type} element is part of the training module.\n\nDuration: ${contentItem.duration} minutes\n\nEngage with this content to build your knowledge and skills in this area.`;
          }

          // ✅ Create slide with FULL TEXT CONTENT (no truncation for rich content)
          slides.push({
            title: contentItem.title,
            content: contentText.substring(0, 800), // Increased limit for detailed content
            bgColor: moduleColor,
            textColor: '#FFFFFF'
          });
        });
      }

      // Prerequisites slide if any
      if (module.prerequisites && module.prerequisites.length > 0) {
        slides.push({
          title: 'Prerequisites',
          content: '• ' + module.prerequisites.join('\n• '),
          bgColor: moduleColor,
          textColor: '#FFFFFF'
        });
      }
    });

    // Final slide
    slides.push({
      title: 'Thank You!',
      content: `Training complete • ${updatedModules.length} modules covered`,
      bgColor: '#6366F1',
      textColor: '#FFFFFF'
    });

    return slides;
  };

  // Initialize slides when module changes (removed - no longer using PowerPoint viewer)
  // useEffect(() => {
  //   if (currentModule && activeTab === 'ppt') {
  //     const slides = generateSlides();
  //     setSlideData(slides);
  //     setSlideImages(slides.map(() => 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0iIzYzNjZGMSIvPjx0ZXh0IHg9IjQwMCIgeT0iMzAwIiBmb250LXNpemU9IjQ4IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+U2xpZGUgUHJldmlldzwvdGV4dD48L3N2Zz4='));
  //     setCurrentSlideIndex(0);
  //     setShowPPTViewer(true);
  //   }
  // }, [currentModule, activeTab]);

  const updateCurrentSlide = (field: keyof SlideData, value: string) => {
    const newSlideData = [...slideData];
    newSlideData[currentSlideIndex] = {
      ...newSlideData[currentSlideIndex],
      [field]: value
    };
    setSlideData(newSlideData);

    // In a real implementation, regenerate preview using PowerPointService
    // For now, just update the data
  };

  const addNewSlide = () => {
    const newSlide: SlideData = {
      title: 'New Slide',
      content: 'Slide content',
      bgColor: '#6366F1',
      textColor: '#FFFFFF'
    };

    const newSlideData = [...slideData, newSlide];
    setSlideData(newSlideData);

    // Generate preview image (simplified)
    setSlideImages([...slideImages, 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0iIzYzNjZGMSIvPjx0ZXh0IHg9IjQwMCIgeT0iMzAwIiBmb250LXNpemU9IjQ4IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+TmV3IFNsaWRlPC90ZXh0Pjwvc3ZnPg==']);
    setCurrentSlideIndex(slideImages.length);
  };

  const downloadPowerPoint = async () => {
    if (slideData.length === 0) {
      alert('No slides to export!');
      return;
    }

    setIsGeneratingPPT(true);
    try {
      console.log('📥 Generating PowerPoint file...');
      // In a real implementation, use PowerPointService.generatePowerPoint
      // For now, just show an alert
      alert('✅ PowerPoint generation would happen here. Install PowerPointService to enable this feature.');
    } catch (error) {
      console.error('❌ Error generating PowerPoint:', error);
      alert('❌ Error generating PowerPoint.');
    } finally {
      setIsGeneratingPPT(false);
    }
  };

  const deleteCurrentSlide = () => {
    if (slideData.length <= 1) {
      alert('Cannot delete the last slide!');
      return;
    }

    const newSlideData = slideData.filter((_, index) => index !== currentSlideIndex);
    const newSlideImages = slideImages.filter((_, index) => index !== currentSlideIndex);

    setSlideData(newSlideData);
    setSlideImages(newSlideImages);
    setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1));
  };

  const goToPreviousSlide = () => {
    setCurrentSlideIndex(prev => Math.max(0, prev - 1));
  };

  const goToNextSlide = () => {
    setCurrentSlideIndex(prev => Math.min(slideImages.length - 1, prev + 1));
  };

  const handlePlayPPT = () => {
    if (slideData.length === 0) {
      const slides = generateSlides();
      setSlideData(slides);
      setSlideImages(slides.map(() => 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0iIzYzNjZGMSIvPjx0ZXh0IHg9IjQwMCIgeT0iMzAwIiBmb250LXNpemU9IjQ4IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+U2xpZGUgUHJldmlldzwvdGV4dD48L3N2Zz4='));
      setCurrentSlideIndex(0);
      setShowPPTViewer(true);
    }
    setIsPlaying(!isPlaying);
  };

  const generateRehearsalReport = () => {
    const report = {
      journey: journey.name,
      totalTime: formatTime(rehearsalTime),
      modulesCompleted: completedModules.length,
      totalModules: updatedModules.length,
      feedback: feedback.length,
      rating: overallRating,
      readyForLaunch: overallRating >= 3 && feedback.filter(f => f.severity === 'high').length === 0,
      generatedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rehearsal-report.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSectionIcon = (type: string) => {
    switch (type) {
      case 'text':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'video':
        return <Video className="h-5 w-5 text-red-500" />;
      case 'youtube':
        return <Youtube className="h-5 w-5 text-red-500" />;
      case 'document':
        return <FileText className="h-5 w-5 text-purple-500" />;
      case 'interactive':
        return <Zap className="h-5 w-5 text-yellow-500" />;
      default:
        return <BookOpen className="h-5 w-5 text-gray-500" />;
    }
  };

  const renderSectionContent = (section: TrainingSection) => {
    const content = section.content;

    switch (section.type) {
      case 'document':
        if (content?.file && content.file.url) {
          return (
            <div className="w-full" style={{ height: 'calc(100vh - 500px)', minHeight: '400px' }}>
              <DocumentViewer
                fileUrl={content.file.url}
                fileName={content.file.name}
                mimeType={content.file.mimeType}
              />
            </div>
          );
        }
        console.warn('⚠️ Document section has no file or URL:', {
          hasContent: !!content,
          hasFile: !!content?.file,
          fileUrl: content?.file?.url
        });
        return (
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p>No document available for this section</p>
            <p className="text-xs mt-2">Debug: {content?.file ? 'Has file but no URL' : 'No file object'}</p>
          </div>
        );

      case 'text':
        return (
          <div className="prose max-w-none">
            {content?.text ? (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {content.text.split('\n').map((line, idx) => {
                    // Format markdown-like syntax
                    if (line.startsWith('📚') || line.startsWith('🎯') || line.startsWith('⏱️') || line.startsWith('📊')) {
                      return <div key={idx} className="font-semibold text-gray-900 mt-3 mb-2">{line}</div>;
                    } else if (line.startsWith('•')) {
                      return <div key={idx} className="ml-4 text-gray-700">{line}</div>;
                    } else if (line.trim() === '') {
                      return <br key={idx} />;
                    } else {
                      return <div key={idx} className="text-gray-700">{line}</div>;
                    }
                  })}
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No text content available</p>
            )}
            {content?.keyPoints && content.keyPoints.length > 0 && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                  <Zap className="h-4 w-4 mr-2" />
                  Key Points:
                </h4>
                <ul className="list-disc list-inside space-y-2 text-blue-800">
                  {content.keyPoints.map((point, idx) => (
                    <li key={idx} className="text-gray-700">{point}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );

      case 'video':
        const videoUrl = content?.file?.url || content?.url;
        if (videoUrl) {
          return (
            <div className="w-full" style={{ height: 'calc(100vh - 500px)', minHeight: '400px' }}>
              <DocumentViewer
                fileUrl={videoUrl}
                fileName={content?.file?.name}
                mimeType={content?.file?.mimeType || 'video/mp4'}
              />
            </div>
          );
        }
        return (
          <div className="text-center py-12 text-gray-500">
            <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p>No video available</p>
          </div>
        );

      case 'youtube':
        const youtubeUrl = content?.youtubeUrl || content?.url || content?.file?.url;
        if (youtubeUrl) {
          return (
            <div className="w-full" style={{ height: 'calc(100vh - 500px)', minHeight: '400px' }}>
              <DocumentViewer
                fileUrl={youtubeUrl}
                fileName={content?.file?.name}
                mimeType={content?.file?.mimeType}
              />
            </div>
          );
        }
        return (
          <div className="flex items-center justify-center h-full text-gray-400">
            <Youtube className="w-16 h-16" />
          </div>
        );

      case 'interactive':
        return (
          <div className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Interactive Content</h4>
            {content?.embedCode ? (
              <div dangerouslySetInnerHTML={{ __html: content.embedCode }} />
            ) : (
              <p className="text-gray-600">Interactive content will be displayed here</p>
            )}
          </div>
        );

      default:
        return (
          <div className="text-center py-12 text-gray-500">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p>Content type not supported: {section.type}</p>
          </div>
        );
    }
  };

  const getFeedbackIcon = (type: RehearsalFeedback['type']) => {
    switch (type) {
      case 'content':
        return <BookOpen className="h-4 w-4 text-blue-500" />;
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

  const getSeverityColor = (severity: RehearsalFeedback['severity']) => {
    switch (severity) {
      case 'high':
        return 'border-red-200 bg-red-50 text-red-800';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      case 'low':
        return 'border-blue-200 bg-blue-50 text-blue-800';
      default:
        return 'border-gray-200 bg-gray-50 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={onBack}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Eye className="h-5 w-5 text-purple-500" />
                    <span className="text-sm font-medium text-purple-600 bg-purple-100 px-3 py-1 rounded-full">
                      REHEARSAL MODE
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">{journey.name}</h1>
                  <p className="text-gray-600">Test and review your training journey before launch</p>
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm text-gray-500 mb-1">Rehearsal Time</div>
                <div className="text-2xl font-bold text-gray-900">{formatTime(rehearsalTime)}</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                <span className="text-sm text-gray-600">{Math.round(progress)}% Complete</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-purple-500 to-indigo-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          {methodology && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-6 mb-8">
              <h3 className="text-xl font-semibold text-purple-900 mb-4">🎯 360° Methodology in Action</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {methodology.components.slice(0, 8).map((component, index) => (
                  <div key={index} className="text-center p-3 bg-white rounded-lg shadow-sm">
                    <div className="text-sm font-medium text-purple-900">{component.title}</div>
                    <div className="text-xs text-purple-700">{component.estimatedDuration}h • {component.competencyLevel}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center">
                <p className="text-purple-700 text-sm">
                  Complete 360° approach covering foundational knowledge, regulatory compliance,
                  contact centre excellence, and regional requirements
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Sidebar - Section Navigation */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 sticky top-6 max-h-[calc(100vh-2rem)] overflow-y-auto">
                {/* Module Navigation */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Module {currentModuleIndex + 1} of {updatedModules.length}
                    </h3>
                  </div>
                  <div className="flex flex-col gap-2 mb-4">
                    {updatedModules.map((module, index) => (
                      <button
                        key={module.id}
                        onClick={() => {
                          setCurrentModuleIndex(index);
                          setCurrentSectionIndex(0);
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${index === currentModuleIndex
                            ? 'bg-purple-600 text-white'
                            : completedModules.includes(module.id)
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate">{index + 1}. {module.title}</span>
                          {completedModules.includes(module.id) && (
                            <CheckCircle className="h-4 w-4 ml-1 flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handlePreviousModule}
                      disabled={currentModuleIndex === 0}
                      className="flex-1 px-3 py-2 text-xs border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <button
                      onClick={handleNextModule}
                      disabled={currentModuleIndex === modules.length - 1}
                      className="flex-1 px-3 py-2 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>

                {/* Sections Navigation */}
                {hasSections && (
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">
                      Section {currentSectionIndex + 1} of {currentModule.sections!.length}
                    </h3>
                    <div className="flex flex-col gap-2">
                      {currentModule.sections!.map((section, index) => (
                        <button
                          key={section.id || index}
                          onClick={() => setCurrentSectionIndex(index)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${index === currentSectionIndex
                              ? 'bg-purple-600 text-white'
                              : completedSections.has(section.id || '')
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="truncate">{index + 1}. {section.title}</span>
                            {completedSections.has(section.id || '') && (
                              <CheckCircle className="h-4 w-4 ml-1 flex-shrink-0" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Main Content Area - Document Viewer */}
            <div className="lg:col-span-10">
              {currentModule && (
                <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 flex flex-col">
                  {/* Module Header - Compact */}
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <h2 className="text-2xl font-bold text-gray-900">{currentModule.title}</h2>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                          <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {currentModule.duration || 0} min
                          </span>
                          <span className="flex items-center">
                            <BookOpen className="h-4 w-4 mr-1" />
                            {currentModule.sections?.length || 0} sections
                          </span>
                          <span className="flex items-center">
                            <BarChart3 className="h-4 w-4 mr-1" />
                            {currentModule.competencyLevel || 'Beginner'}
                          </span>
                        </div>
                      </div>
                      {completedModules.includes(currentModule.id) && (
                        <div className="flex items-center space-x-2 text-green-600 ml-4">
                          <CheckCircle className="h-5 w-5" />
                          <span className="font-medium text-sm">Completed</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content - Takes full available space */}
                  <div className="flex-1 mb-6">
                    {hasSections && currentSection ? (
                      <div className="w-full">
                        {renderSectionContent(currentSection)}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                        <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">No Sections Available</h3>
                        <p className="text-gray-600">This module doesn't have any sections with documents yet.</p>
                        {uploads.length === 0 && (
                          <p className="text-sm text-gray-500 mt-2">Please upload documents in the previous step.</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Navigation Controls - Bottom */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex items-center space-x-2">
                      {hasSections && (
                        <>
                          <button
                            onClick={handlePreviousSection}
                            disabled={currentSectionIndex === 0 && currentModuleIndex === 0}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                          >
                            Previous
                          </button>
                          <button
                            onClick={handleNextSection}
                            disabled={currentSectionIndex === currentModule.sections!.length - 1 && currentModuleIndex === updatedModules.length - 1}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                          >
                            Next
                          </button>
                        </>
                      )}
                    </div>
                    <button
                      onClick={handleModuleComplete}
                      className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      <CheckCircle className="h-5 w-5" />
                      <span>Mark Complete</span>
                    </button>
                  </div>

                  {/* Module Statistics - Bottom Section */}
                  <div className="mt-8 space-y-6">
                    {/* Summary Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center p-4 bg-blue-50 rounded-xl">
                        <Clock className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                        <div className="text-lg font-bold text-blue-600">{currentModule.duration || 0}</div>
                        <div className="text-sm text-gray-600">Duration (min)</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-xl">
                        <BookOpen className="h-6 w-6 text-green-600 mx-auto mb-2" />
                        <div className="text-lg font-bold text-green-600">{hasSections ? (currentModule.sections?.length || 0) : (currentModule.content?.length || 0)}</div>
                        <div className="text-sm text-gray-600">{hasSections ? 'Sections' : 'Content Items'}</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-xl">
                        <BarChart3 className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                        <div className="text-lg font-bold text-purple-600">{currentModule.assessments?.length || 0}</div>
                        <div className="text-sm text-gray-600">Assessments</div>
                      </div>
                    </div>

                    {/* AI-Generated Assessments */}
                    <div id="module-quizzes-section" className="bg-purple-50 rounded-xl p-6 border border-purple-200">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                          <BarChart3 className="h-5 w-5 mr-2 text-purple-600" />
                          AI-Generated Assessments {currentModule.assessments && currentModule.assessments.length > 0 && `(${currentModule.assessments.length})`}
                        </h3>
                        <div className="flex items-center space-x-2">
                          {(() => {
                            const hasRegularQuiz = currentModule.assessments?.some(a => !a.id?.startsWith('final-exam-'));
                            const hasFinalExam = currentModule.assessments?.some(a => a.id?.startsWith('final-exam-'));

                            return (
                              <>
                                <button
                                  onClick={() => showQuizConfig(currentModule, false)}
                                  disabled={generatingQuizForModule === currentModule.id}
                                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  {generatingQuizForModule === currentModule.id ? (
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
                                    onClick={() => showQuizConfig(currentModule, true)}
                                    disabled={generatingFinalExam}
                                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                      {currentModule.assessments && currentModule.assessments.length > 0 ? (
                        <div className="space-y-3">
                          {currentModule.assessments.map((assessment, idx) => {
                            const isExpanded = expandedQuizId === assessment.id;

                            return (
                              <div key={idx} className="bg-white rounded-lg border border-purple-200 overflow-hidden">
                                <div className="p-4 flex items-center justify-between">
                                  <div className="flex-1">
                                    <h4 className="font-medium text-gray-900 mb-1">{assessment.title}</h4>
                                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                                      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">
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
                                    <CheckCircle className="h-5 w-5 text-purple-600" />
                                    <button
                                      onClick={() => setExpandedQuizId(isExpanded ? null : assessment.id)}
                                      className="ml-2 px-3 py-1 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
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
                                                      onClick={() => saveQuestionEdit(currentModule.id, assessment.id, qIdx, editedQuestion)}
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
                                                    <h5 className="font-medium text-gray-900">
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
                                                            <span className={`text-sm font-medium ${isCorrect ? 'text-green-800 font-semibold' : 'text-gray-700'
                                                              }`}>
                                                              {String.fromCharCode(65 + optIdx)}.
                                                            </span>
                                                            <span className={`text-sm flex-1 ${isCorrect ? 'text-green-900 font-medium' : 'text-gray-700'
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
                                                      <div className="text-sm text-gray-500 italic">
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
                        <div className="text-center py-6 text-gray-500">
                          <FileQuestion className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                          <p className="text-sm">No quiz generated for this module</p>
                          <p className="text-xs mt-1">Click on "Generate Quiz" to create a quiz with AI</p>
                        </div>
                      )}
                    </div>

                    {/* Prerequisites */}
                    {currentModule.prerequisites && currentModule.prerequisites.length > 0 && (
                      <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
                          Prerequisites
                        </h3>
                        <ul className="space-y-2">
                          {currentModule.prerequisites.map((prerequisite, idx) => (
                            <li key={idx} className="flex items-start">
                              <span className="text-orange-600 mr-2">•</span>
                              <span className="text-gray-700">{prerequisite}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Section - Feedback and Rating */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Feedback Section */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Feedback ({feedback.length})</h3>
                {!showFeedbackForm && (
                  <button
                    onClick={() => setShowFeedbackForm(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all text-sm"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Add Feedback</span>
                  </button>
                )}
              </div>

              {showFeedbackForm && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <select
                      value={currentFeedback.type}
                      onChange={(e) => setCurrentFeedback(prev => ({ ...prev, type: e.target.value as RehearsalFeedback['type'] }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="content">Content Issue</option>
                      <option value="technical">Technical Issue</option>
                      <option value="engagement">Engagement</option>
                      <option value="suggestion">Suggestion</option>
                    </select>

                    <select
                      value={currentFeedback.severity}
                      onChange={(e) => setCurrentFeedback(prev => ({ ...prev, severity: e.target.value as RehearsalFeedback['severity'] }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                  </div>

                  <textarea
                    value={currentFeedback.message}
                    onChange={(e) => setCurrentFeedback(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Describe the issue or suggestion..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent mb-4"
                  />

                  <div className="flex space-x-2">
                    <button
                      onClick={addFeedback}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Add Feedback
                    </button>
                    <button
                      onClick={() => setShowFeedbackForm(false)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Feedback List */}
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {feedback.map((item) => (
                  <div key={item.id} className={`p-3 border rounded-lg ${getSeverityColor(item.severity)}`}>
                    <div className="flex items-start space-x-2">
                      {getFeedbackIcon(item.type)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium capitalize">{item.type}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(item.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                        <div className="text-sm mt-1 text-gray-700">{item.message}</div>
                      </div>
                    </div>
                  </div>
                ))}

                {feedback.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm">No feedback yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Overall Rating Section */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Rating</h3>

              <div className="flex justify-center space-x-2 mb-4">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setOverallRating(rating)}
                    className={`p-2 transition-all transform hover:scale-110 ${rating <= overallRating ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-300'
                      }`}
                  >
                    <Star className="h-8 w-8 fill-current" />
                  </button>
                ))}
              </div>

              <div className="text-center text-sm text-gray-600 mb-6">
                {overallRating === 0 && 'Rate the training journey'}
                {overallRating === 1 && 'Needs significant improvement'}
                {overallRating === 2 && 'Below expectations'}
                {overallRating === 3 && 'Meets expectations'}
                {overallRating === 4 && 'Exceeds expectations'}
                {overallRating === 5 && 'Outstanding quality'}
              </div>

              <button
                onClick={handleFinishRehearsal}
                disabled={overallRating === 0}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold shadow-lg"
              >
                <Rocket className="h-5 w-5" />
                <span>Finish Rehearsal</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
