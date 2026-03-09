import React, { useState, useEffect, useCallback } from 'react';
import { Plus, ArrowLeft, ArrowRight, Edit2, Trash2, Save, X, FileText, Video, Image, Youtube, Type, Play, ChevronDown, ChevronUp, GripVertical, Move, Award, Sparkles, Eye, Loader2 } from 'lucide-react';
import { ManualTraining, ManualTrainingModule, TrainingSection, SectionContent, ContentFile } from '../../types/manualTraining';
import { CloudinaryUploadResult } from '../../lib/cloudinaryService';
import { FileUploader } from './FileUploader';
import { QuizBuilder } from './QuizBuilder';
import { QuizTaker } from './QuizTaker';
import { FinalExamGenerator } from './FinalExamGenerator';
import ManualTrainingSimulator from './ManualTrainingSimulator';
import { TrainingSettingsModal } from './TrainingSettingsModal';
import { ModuleSettingsModal } from './ModuleSettingsModal';
import axios from 'axios';

// Détection automatique de l'environnement
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  return isLocal ? 'http://localhost:5010' : 'https://v25platformtrainingbackend-production.up.railway.app';
};

const API_BASE = getApiBaseUrl();

interface ModuleEditorProps {
  training: ManualTraining;
  onBack: () => void;
}

export const ModuleEditor: React.FC<ModuleEditorProps> = ({ training, onBack }) => {
  const [modules, setModules] = useState<ManualTrainingModule[]>([]);
  const [selectedModule, setSelectedModule] = useState<ManualTrainingModule | null>(null);
  const [editingModule, setEditingModule] = useState(false);
  const [editingSection, setEditingSection] = useState<TrainingSection | null>(null);
  const [showQuizBuilder, setShowQuizBuilder] = useState(false);
  const [showFinalExamGenerator, setShowFinalExamGenerator] = useState(false);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [quizzesCount, setQuizzesCount] = useState<Map<string, number>>(new Map());
  const [finalExamExists, setFinalExamExists] = useState(false);
  const [sectionCreationStep, setSectionCreationStep] = useState(0); // 0: button only, 1: title only, 2: full form
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [draggedSection, setDraggedSection] = useState<{ section: TrainingSection; fromModuleId: string; sectionIndex: number } | null>(null);
  const [editingSectionInList, setEditingSectionInList] = useState<{ section: TrainingSection; moduleId: string } | null>(null);
  const [sectionEditForm, setSectionEditForm] = useState({ title: '', description: '' });
  const [dragOverSectionIndex, setDragOverSectionIndex] = useState<number | null>(null);

  // ✨ Track which modules are currently generating quizzes to avoid duplicate requests
  const [generatingQuizzes, setGeneratingQuizzes] = useState<Set<string>>(new Set());

  // ✨ Simulator state
  const [showSimulator, setShowSimulator] = useState(false);

  // ✨ Current View: 'sections', 'quiz', or 'finalExam'
  // Always start with sections, quiz comes after, final exam after last module
  const [currentView, setCurrentView] = useState<'sections' | 'quiz' | 'finalExam'>('sections');

  // ✨ Quiz completion state
  const [isQuizCompleted, setIsQuizCompleted] = useState(false);

  // ✨ Final exam state
  const [finalExam, setFinalExam] = useState<ManualQuiz | null>(null);
  const [isFinalExamCompleted, setIsFinalExamCompleted] = useState(false);

  // Always start with sections view when module is selected
  useEffect(() => {
    setCurrentView('sections');
    setIsQuizCompleted(false); // Reset when switching modules
    setIsFinalExamCompleted(false); // Reset final exam completion
  }, [selectedModule?.id]);

  // Load final exam when component mounts
  useEffect(() => {
    loadFinalExam();
  }, [training.id]);

  // ✨ Training Settings Modal
  const [showTrainingSettings, setShowTrainingSettings] = useState(false);

  // ✨ Module Settings Modal
  const [showModuleSettings, setShowModuleSettings] = useState(false);

  // ✨ Section Edit Mode (in main area)
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);

  // ✨ Sidebar Collapse State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ✨ Sidebar Resize State
  const [sidebarWidth, setSidebarWidth] = useState(320); // 320px = w-80
  const [isResizing, setIsResizing] = useState(false);

  // Module Form
  const [moduleForm, setModuleForm] = useState({
    title: '',
    description: '',
    estimatedDuration: 0,
  });

  // Section Form
  const [sectionForm, setSectionForm] = useState<Partial<TrainingSection>>({
    title: '',
    type: 'video' as any,
    content: {},
  });

  // ✨ Sidebar Resize Handlers (MUST be before any conditional returns)
  const startResize = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResize = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (!sidebarCollapsed) {
      const newWidth = e.clientX - 24; // 24px = left offset (left-6)

      // Min: 200px, Max: 600px
      if (newWidth >= 200 && newWidth <= 600) {
        setSidebarWidth(newWidth);
      }
    }
  }, [sidebarCollapsed]);

  // Add/remove event listeners for resize
  useEffect(() => {
    if (isResizing) {
      const handleMouseMove = (e: MouseEvent) => resize(e);
      const handleMouseUp = () => stopResize();

      document.addEventListener('mousemove', handleMouseMove as any);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove as any);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  }, [isResizing, resize, stopResize]);

  useEffect(() => {
    if (training.id) {
      loadModules();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [training.id]);

  // ✨ Auto-open module creation form if no modules exist - DISABLED
  // useEffect(() => {
  //   if (modules.length === 0 && !editingModule && !loading) {
  //     setEditingModule(true);
  //   }
  // }, [modules.length, loading]);

  const loadModules = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/manual-trainings/${training.id}/modules`);
      if (response.data.success) {
        setModules(response.data.data);

        // Load quiz counts for each module
        loadQuizCounts(response.data.data);

        // Check if final exam exists
        loadFinalExamStatus();
      }
    } catch (error) {
      console.error('Error loading modules:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadQuizCounts = async (modulesList: ManualTrainingModule[]) => {
    const counts = new Map<string, number>();

    for (const module of modulesList) {
      try {
        const response = await axios.get(`${API_BASE}/manual-trainings/modules/${module.id}/quizzes`);
        if (response.data.success) {
          const quizCount = response.data.data.length;
          counts.set(module.id!, quizCount);

          // ✨ AUTO-GENERATE quiz if module has sections but no quiz yet
          // 🚫 TEMPORARILY DISABLED - OpenAI quota exceeded
          // Uncomment when quota is recharged
          /*
          if (quizCount === 0 && module.sections && module.sections.length > 0 && !generatingQuizzes.has(module.id!)) {
            console.log(`📝 Module "${module.title}" has sections but no quiz - auto-generating...`);
            setGeneratingQuizzes(prev => new Set(prev).add(module.id!));
            generateQuizForModule(module.id!, module.title, module);
          }
          */
        }
      } catch (error) {
        console.error(`Error loading quizzes for module ${module.id}:`, error);
      }
    }

    setQuizzesCount(counts);
  };

  const loadFinalExamStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE}/manual-trainings/${training.id}/quizzes`);
      if (response.data.success) {
        // Check if there's a quiz without moduleId (final exam)
        const hasFinalExam = response.data.data.some((quiz: any) => !quiz.moduleId);
        setFinalExamExists(hasFinalExam);
      }
    } catch (error) {
      console.error('Error checking final exam status:', error);
    }
  };

  // Load final exam quiz
  const loadFinalExam = async () => {
    try {
      const response = await axios.get(`${API_BASE}/manual-trainings/${training.id}/quizzes`);
      if (response.data.success) {
        // Find final exam (quiz without moduleId or with special moduleId)
        const exam = response.data.data.find((quiz: any) =>
          !quiz.moduleId || quiz.moduleId === 'FINAL_EXAM' || quiz.moduleId === 'final-exam'
        );
        if (exam) {
          setFinalExam(exam);
          setFinalExamExists(true);
        } else {
          setFinalExam(null);
          setFinalExamExists(false);
        }
      }
    } catch (error) {
      console.error('Error loading final exam:', error);
      setFinalExam(null);
    }
  };

  const handlePublishTraining = async () => {
    if (training.status === 'published') {
      alert('This training is already published!');
      return;
    }

    if (!confirm('Publish this training? It will be available to learners.')) {
      return;
    }

    setPublishing(true);
    try {
      const response = await axios.post(`${API_BASE}/manual-trainings/${training.id}/publish`);

      if (response.data.success) {
        // Update training status locally
        training.status = 'published';
        alert('✅ Training published successfully! It is now available to learners.');
      } else {
        alert(`Error: ${response.data.message || 'Failed to publish training'}`);
      }
    } catch (error: any) {
      console.error('Error publishing training:', error);
      alert(`Error publishing training: ${error.response?.data?.message || error.message || 'Unknown error'}`);
    } finally {
      setPublishing(false);
    }
  };

  // ✨ Helper function to calculate number of questions for a module (5-15)
  const calculateQuestionsForModule = (module: ManualTrainingModule): number => {
    const baseQuestions = 5; // Minimum
    const maxQuestions = 15; // Maximum
    const sectionCount = module.sections?.length || 0;

    // Calculate: 5 + (sections * 2), capped at 15
    const calculatedQuestions = baseQuestions + (sectionCount * 2);

    // Ensure it's between 5 and 15
    return Math.max(baseQuestions, Math.min(maxQuestions, calculatedQuestions));
  };

  // ✨ Helper function to generate quiz for a single module (background, non-blocking)
  const generateQuizForModule = async (moduleId: string, moduleTitle: string, module?: ManualTrainingModule) => {
    try {
      console.log(`🤖 Auto-generating quiz for module: ${moduleTitle}`);

      // Calculate dynamic number of questions (5-15)
      let numberOfQuestions = 5; // Default
      if (module) {
        numberOfQuestions = calculateQuestionsForModule(module);
      } else {
        // Try to find module in the list
        const foundModule = modules.find(m => m.id === moduleId);
        if (foundModule) {
          numberOfQuestions = calculateQuestionsForModule(foundModule);
        }
      }

      console.log(`📊 Generating ${numberOfQuestions} questions for module: ${moduleTitle}`);

      const response = await axios.post(`${API_BASE}/manual-trainings/ai/generate-quiz`, {
        moduleId: moduleId,
        numberOfQuestions: numberOfQuestions,
        difficulty: 'medium',
        questionTypes: {
          multipleChoice: true,
          trueFalse: true,
          shortAnswer: false,
        },
      });

      if (response.data.success) {
        console.log(`✅ Quiz auto-generated for ${moduleTitle}`);
        // Remove from generating set
        setGeneratingQuizzes(prev => {
          const newSet = new Set(prev);
          newSet.delete(moduleId);
          return newSet;
        });
        // ✨ Update quiz count for this specific module only (no full reload)
        setQuizzesCount(prev => new Map(prev).set(moduleId, 1));
      }
    } catch (error: any) {
      console.error(`❌ Error auto-generating quiz for ${moduleTitle}:`, error);
      // ✨ Log detailed error information
      if (error.response?.data) {
        console.error('📝 Backend error details:', error.response.data);
      }
      // Remove from generating set even on error to allow retry
      setGeneratingQuizzes(prev => {
        const newSet = new Set(prev);
        newSet.delete(moduleId);
        return newSet;
      });
      // Don't show error to user - silent background operation
    }
  };

  const handleCreateModule = async (autoOpenSection: boolean = false) => {
    if (!moduleForm.title) {
      alert('Please enter a module title');
      return;
    }

    try {
      const response = await axios.post(
        `${API_BASE}/manual-trainings/${training.id}/modules`,
        {
          ...moduleForm,
          trainingId: training.id,
          sections: [],
        }
      );

      if (response.data.success) {
        await loadModules();
        setEditingModule(false);
        setModuleForm({ title: '', description: '', estimatedDuration: 0 });

        const newModule = response.data.data;

        // ✨ AUTO-GENERATE QUIZ disabled - quizzes should only be generated via AI organizer options
        // generateQuizForModule(newModule.id, newModule.title, newModule);

        if (autoOpenSection) {
          // ✨ Automatically select the newly created module
          setSelectedModule(newModule);

          // ✨ Auto-open section creation - start at step 1 (title input)
          setSectionForm({
            title: '',
            type: 'video' as any,
            content: {},
          });
          setSectionCreationStep(1); // Start with title input
        }
      }
    } catch (error) {
      console.error('Error creating module:', error);
      alert('Error creating module');
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('Are you sure you want to delete this module?')) {
      return;
    }

    try {
      await axios.delete(`${API_BASE}/manual-trainings/modules/${moduleId}`);
      await loadModules();
      if (selectedModule?.id === moduleId) {
        setSelectedModule(null);
      }
    } catch (error) {
      console.error('Error deleting module:', error);
      alert('Error deleting module');
    }
  };

  const handleAddSection = async (goToQuiz: boolean = false) => {
    if (!selectedModule?.id || !sectionForm.title) {
      alert('Please fill in required fields');
      return;
    }

    try {
      const response = await axios.post(
        `${API_BASE}/manual-trainings/modules/${selectedModule.id}/sections`,
        sectionForm
      );

      if (response.data.success) {
        const updatedModule = response.data.data;
        setSelectedModule(updatedModule);
        await loadModules();

        // ✨ AUTO-REGENERATE QUIZ disabled - quizzes should only be generated via AI organizer options
        // generateQuizForModule(selectedModule.id, selectedModule.title, selectedModule);

        if (goToQuiz) {
          // ✨ Go to quiz builder
          setShowQuizBuilder(true);
          setSectionCreationStep(0);
        } else {
          // ✨ Reset form and go back to button only
          setSectionForm({
            title: '',
            type: 'video',
            content: {},
          });

          setSectionCreationStep(0); // Back to button view
        }
      }
    } catch (error) {
      console.error('Error adding section:', error);
      alert('Error adding section');
    }
  };

  const handleFileUpload = async (result: CloudinaryUploadResult, analysis?: any) => {
    const contentFile: ContentFile = {
      id: crypto.randomUUID(),
      name: result.publicId.split('/').pop() || 'file',
      type: sectionForm.type === 'video' ? 'video' : sectionForm.type === 'document' ? 'pdf' : 'image',
      url: result.secureUrl,
      publicId: result.publicId,
      thumbnailUrl: result.thumbnailUrl,
      size: result.bytes,
      mimeType: result.format,
      metadata: {
        duration: result.duration,
        width: result.width,
        height: result.height,
        format: result.format,
      },
    };

    setSectionForm({
      ...sectionForm,
      content: {
        ...sectionForm.content!,
        file: contentFile,
      },
    });
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!selectedModule?.id || !confirm('Are you sure you want to delete this section?')) {
      return;
    }

    try {
      const response = await axios.delete(
        `${API_BASE}/manual-trainings/modules/${selectedModule.id}/sections/${sectionId}`
      );

      if (response.data.success) {
        setSelectedModule(response.data.data);
        await loadModules();
      }
    } catch (error) {
      console.error('Error deleting section:', error);
      alert('Error deleting section');
    }
  };

  const toggleSectionExpanded = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const extractYouTubeId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const getSectionIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="w-5 h-5 text-purple-600" />;
      case 'image':
        return <Image className="w-5 h-5 text-blue-600" />;
      case 'document':
        return <FileText className="w-5 h-5 text-green-600" />;
      case 'powerpoint':
        return <FileText className="w-5 h-5 text-orange-600" />;
      case 'youtube':
        return <Youtube className="w-5 h-5 text-red-600" />;
      case 'text':
        return <Type className="w-5 h-5 text-gray-600" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  // Drag & Drop handlers
  const handleSectionDragStart = (section: TrainingSection, moduleId: string, sectionIndex: number, e: React.DragEvent) => {
    e.stopPropagation();
    setDraggedSection({ section, fromModuleId: moduleId, sectionIndex });
  };

  const handleModuleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleSectionDragOver = (targetModuleId: string, targetIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedSection) return;

    const { fromModuleId, sectionIndex } = draggedSection;

    // Don't show drop indicator if dropping on itself
    if (fromModuleId === targetModuleId && sectionIndex === targetIndex) {
      setDragOverSectionIndex(null);
      return;
    }

    setDragOverSectionIndex(targetIndex);
  };

  const handleSectionDrop = async (targetModuleId: string, targetIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSectionIndex(null);

    if (!draggedSection) return;

    const { section, fromModuleId, sectionIndex } = draggedSection;

    // If same module and same position, do nothing
    if (fromModuleId === targetModuleId && sectionIndex === targetIndex) {
      setDraggedSection(null);
      return;
    }

    console.log('Dropping section:', {
      sectionId: section.id,
      from: { moduleId: fromModuleId, index: sectionIndex },
      to: { moduleId: targetModuleId, index: targetIndex }
    });

    try {
      if (fromModuleId === targetModuleId) {
        // Reorder within same module
        console.log('Reordering within same module');
        const response = await axios.post(`${API_BASE}/manual-trainings/modules/${targetModuleId}/sections/reorder`, {
          sectionId: section.id,
          newIndex: targetIndex
        });
        console.log('Reorder response:', response.data);
      } else {
        // Move to different module
        console.log('Moving to different module');
        const response = await axios.post(`${API_BASE}/manual-trainings/modules/${targetModuleId}/sections/move`, {
          sectionId: section.id,
          fromModuleId: fromModuleId,
          targetIndex: targetIndex
        });
        console.log('Move response:', response.data);
      }

      await loadModules();

      // ✨ Refresh the selected module to update the right side view
      if (selectedModule) {
        const updatedModuleResponse = await axios.get(`${API_BASE}/manual-trainings/modules/${selectedModule.id}`);
        if (updatedModuleResponse.data.success) {
          setSelectedModule(updatedModuleResponse.data.data);
        }
      }
    } catch (error: any) {
      console.error('Error moving/reordering section:', error);
      console.error('Error details:', error.response?.data);
    } finally {
      setDraggedSection(null);
    }
  };

  const handleModuleDrop = async (targetModuleId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedSection) return;

    const { section, fromModuleId } = draggedSection;

    // If dropping in the same module (not on a specific section), do nothing
    if (fromModuleId === targetModuleId) {
      setDraggedSection(null);
      return;
    }

    try {
      // Move section to new module (at the end)
      await axios.post(`${API_BASE}/manual-trainings/modules/${targetModuleId}/sections/move`, {
        sectionId: section.id,
        fromModuleId: fromModuleId
      });

      await loadModules();

      // ✨ Refresh the selected module to update the right side view
      if (selectedModule) {
        const updatedModuleResponse = await axios.get(`${API_BASE}/manual-trainings/modules/${selectedModule.id}`);
        if (updatedModuleResponse.data.success) {
          setSelectedModule(updatedModuleResponse.data.data);
        }
      }
    } catch (error) {
      console.error('Error moving section:', error);
    } finally {
      setDraggedSection(null);
    }
  };

  // Section editing handlers
  const handleStartEditSection = (section: TrainingSection, moduleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSectionInList({ section, moduleId });
    setSectionEditForm({
      title: section.title,
      description: section.description || ''
    });
  };

  const handleSaveEditSection = async () => {
    if (!editingSectionInList) return;

    try {
      await axios.put(
        `${API_BASE}/manual-trainings/modules/${editingSectionInList.moduleId}/sections/${editingSectionInList.section.id}`,
        {
          title: sectionEditForm.title,
          description: sectionEditForm.description
        }
      );

      await loadModules();
      setEditingSectionInList(null);
    } catch (error) {
      console.error('Error updating section:', error);
      alert('Error updating section');
    }
  };

  const handleCancelEditSection = () => {
    setEditingSectionInList(null);
    setSectionEditForm({ title: '', description: '' });
  };


  if (showQuizBuilder && selectedModule) {
    return (
      <QuizBuilder
        module={selectedModule}
        training={training}
        onBack={() => setShowQuizBuilder(false)}
      />
    );
  }

  // ✨ Simulator Mode
  if (showSimulator) {
    return (
      <ManualTrainingSimulator
        trainingId={training.id!}
        trainingTitle={training.trainingName}
        onClose={() => setShowSimulator(false)}
      />
    );
  }

  // Remove the full-screen quiz view - we'll show it inline instead

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 bg-white shadow-md z-50 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Back button and title */}
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-3">
              <div>
                <h1 className="text-3xl font-bold">{training.title}</h1>
                <p className="text-gray-600">{training.description || 'Manage modules and content'}</p>
              </div>
              <button
                onClick={() => setShowTrainingSettings(true)}
                className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                title="Training settings"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Right: Action buttons */}
          <div className="flex items-center space-x-3">
            {/* View Button */}
            <button
              onClick={() => setShowSimulator(true)}
              className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-md transition-all transform hover:scale-105"
            >
              <Eye className="w-5 h-5 mr-2" />
              View
            </button>

            {/* Simulate as Learner */}
            <button
              onClick={() => setShowSimulator(true)}
              className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium shadow-md transition-all transform hover:scale-105"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Simulate
            </button>

            {/* Publish Button */}
            <button
              onClick={handlePublishTraining}
              disabled={publishing}
              className={`flex items-center px-5 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-bold shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${training.status === 'published' ? 'ring-2 ring-green-400' : ''
                }`}
            >
              {publishing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                  {training.status === 'published' ? 'Published' : 'Publish'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content with padding-top to account for fixed header */}
      <div className="pt-32 pb-6">
        {/* Modules List - Fixed Left Column with Resizable */}
        <div
          className={`fixed left-6 top-32 bottom-6 z-40 ${!isResizing ? 'transition-all duration-300' : ''}`}
          style={{
            width: sidebarCollapsed ? '80px' : `${sidebarWidth}px`
          }}
        >
          <div className="bg-white rounded-xl shadow-xl h-full flex flex-col overflow-hidden relative group border border-gray-100 [&_*::-webkit-scrollbar]:w-2 [&_*::-webkit-scrollbar-track]:bg-transparent [&_*::-webkit-scrollbar-thumb]:bg-gray-300 [&_*::-webkit-scrollbar-thumb]:rounded-full [&_*::-webkit-scrollbar-thumb:hover]:bg-gray-400">
            {/* Toggle Button */}
            <div className={`flex items-center justify-between p-2 flex-shrink-0 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 ${sidebarCollapsed ? 'justify-center' : ''}`}>
              {!sidebarCollapsed && (
                <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Modules
                </h2>
              )}
              <div className="flex items-center space-x-2">
                {!sidebarCollapsed && (
                  <button
                    onClick={() => setEditingModule(true)}
                    className="p-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-xl transform hover:scale-110 active:scale-95"
                    title="Add module"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="relative p-2.5 bg-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 rounded-xl transition-all shadow-md hover:shadow-xl transform hover:scale-110 active:scale-95 border border-gray-200 group"
                  title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  {sidebarCollapsed ? (
                    /* Collapsed: Show "expand" icon (three lines getting wider) */
                    <div className="flex flex-col space-y-1 w-4 h-4 justify-center items-end">
                      <div className="h-0.5 w-2 bg-blue-600 rounded-full transition-all group-hover:bg-blue-700" />
                      <div className="h-0.5 w-3 bg-blue-600 rounded-full transition-all group-hover:bg-blue-700" />
                      <div className="h-0.5 w-4 bg-blue-600 rounded-full transition-all group-hover:bg-blue-700" />
                    </div>
                  ) : (
                    /* Expanded: Show "collapse" icon (three equal lines) */
                    <div className="flex flex-col space-y-1 w-4 h-4 justify-center items-center">
                      <div className="h-0.5 w-4 bg-gray-600 rounded-full transition-all group-hover:bg-blue-600 group-hover:w-2" />
                      <div className="h-0.5 w-4 bg-gray-600 rounded-full transition-all group-hover:bg-blue-600 group-hover:w-3" />
                      <div className="h-0.5 w-4 bg-gray-600 rounded-full transition-all group-hover:bg-blue-600 group-hover:w-4" />
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* Modules List - Scrollable */}
            <div className={`space-y-2 overflow-y-auto flex-1 py-2 ${sidebarCollapsed ? 'px-1' : 'px-2'}`}>
              {modules.map((module, index) => (
                <div
                  key={module.id}
                  onClick={() => {
                    setSelectedModule(module);
                    // View will auto-switch based on quiz availability
                  }}
                  onDragOver={handleModuleDragOver}
                  onDrop={(e) => handleModuleDrop(module.id!, e)}
                  className={`rounded-xl cursor-pointer transition-all duration-300 group/module ${selectedModule?.id === module.id
                      ? 'bg-gradient-to-br from-blue-50 via-purple-50 to-blue-50 border-2 border-blue-400 shadow-lg scale-[1.02]'
                      : 'bg-white hover:bg-gradient-to-br hover:from-gray-50 hover:to-gray-100 border-2 border-gray-200 hover:border-blue-300 hover:shadow-md'
                    } ${draggedSection && draggedSection.fromModuleId !== module.id ? 'ring-2 ring-green-300 ring-offset-2' : ''} ${sidebarCollapsed ? 'p-2' : 'p-2.5'
                    }`}
                  title={sidebarCollapsed ? module.title : ''}
                >
                  {sidebarCollapsed ? (
                    /* Collapsed View - Elegant Number Badge */
                    <div className="flex flex-col items-center justify-center py-1">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-md transition-all duration-300 ${selectedModule?.id === module.id
                          ? 'bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 text-white ring-4 ring-blue-300 ring-opacity-50 scale-110 animate-pulse'
                          : 'bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 text-gray-700 group-hover/module:from-blue-50 group-hover/module:to-purple-50 group-hover/module:text-blue-600 group-hover/module:scale-105 group-hover/module:shadow-xl'
                        }`}>
                        {index + 1}
                      </div>

                      {/* Section Indicators */}
                      {module.sections && module.sections.length > 0 && (
                        <div className="mt-2 flex flex-col items-center space-y-1">
                          {module.sections.slice(0, 4).map((section, idx) => (
                            <div
                              key={section.id || idx}
                              className={`rounded-full transition-all duration-300 ${selectedModule?.id === module.id
                                  ? 'w-2.5 h-2.5 bg-gradient-to-r from-blue-400 to-purple-500 shadow-sm ring-1 ring-blue-200'
                                  : 'w-2 h-2 bg-gray-300 group-hover/module:bg-blue-300 group-hover/module:w-2.5 group-hover/module:h-2.5'
                                }`}
                              title={section.title}
                            />
                          ))}
                          {module.sections.length > 4 && (
                            <div className={`text-xs font-bold mt-0.5 px-1 py-0.5 rounded-full ${selectedModule?.id === module.id
                                ? 'text-blue-600 bg-blue-100'
                                : 'text-gray-500 bg-gray-100 group-hover/module:text-blue-500'
                              }`}>
                              +{module.sections.length - 4}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Quiz Badge */}
                      {quizzesCount.get(module.id!) && (
                        <div className={`mt-2 w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shadow-sm transition-all ${selectedModule?.id === module.id
                            ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white ring-2 ring-purple-300'
                            : 'bg-gradient-to-br from-purple-100 to-purple-200 text-purple-700 group-hover/module:from-purple-200 group-hover/module:to-purple-300'
                          }`}>
                          Q
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Full View - All Details */
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shadow-md transition-all duration-300 flex-shrink-0 ${selectedModule?.id === module.id
                              ? 'bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 text-white ring-2 ring-blue-300 ring-opacity-50'
                              : 'bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 text-gray-700 group-hover/module:from-blue-50 group-hover/module:to-purple-50 group-hover/module:text-blue-600 group-hover/module:shadow-xl'
                            }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className={`font-bold text-sm truncate ${selectedModule?.id === module.id
                                ? 'text-blue-700'
                                : 'text-gray-900 group-hover/module:text-blue-600'
                              }`}>
                              {module.title}
                            </h3>
                          </div>
                        </div>
                        <p className={`text-xs mt-0.5 line-clamp-2 ml-10 ${selectedModule?.id === module.id
                            ? 'text-gray-700'
                            : 'text-gray-600'
                          }`}>
                          {module.description}
                        </p>
                        <div className="flex items-center justify-between mt-2 ml-10">
                          <div className="flex items-center space-x-2 text-xs">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded ${selectedModule?.id === module.id
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-600 group-hover/module:bg-blue-50 group-hover/module:text-blue-600'
                              }`}>
                              <FileText className="w-3 h-3 mr-0.5" />
                              <span className="font-semibold text-xs">{module.sections?.length || 0}</span>
                            </span>
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded ${selectedModule?.id === module.id
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-gray-100 text-gray-600 group-hover/module:bg-purple-50 group-hover/module:text-purple-600'
                              }`}>
                              <svg className="w-3 h-3 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="font-semibold text-xs">{module.estimatedDuration}m</span>
                            </span>
                          </div>
                          {quizzesCount.get(module.id!) ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md">
                              <Award className="w-3 h-3 mr-1" />
                              {quizzesCount.get(module.id!)}
                            </span>
                          ) : null}
                        </div>

                        {/* Section Titles - Draggable & Editable */}
                        {module.sections && module.sections.length > 0 && (
                          <div className={`mt-2 pt-2 space-y-1 ${selectedModule?.id === module.id
                              ? 'border-t-2 border-blue-300'
                              : 'border-t border-gray-200'
                            }`}>
                            {[...module.sections]
                              .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
                              .map((section, idx) => (
                                <div key={section.id || idx}>
                                  {editingSectionInList?.section.id === section.id ? (
                                    // Edit Mode
                                    <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-2 rounded-lg border-2 border-blue-400 shadow-md space-y-1.5" onClick={(e) => e.stopPropagation()}>
                                      <input
                                        type="text"
                                        value={sectionEditForm.title}
                                        onChange={(e) => setSectionEditForm({ ...sectionEditForm, title: e.target.value })}
                                        className="w-full px-2 py-1 border-2 border-blue-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Section title"
                                      />
                                      <textarea
                                        value={sectionEditForm.description}
                                        onChange={(e) => setSectionEditForm({ ...sectionEditForm, description: e.target.value })}
                                        className="w-full px-2 py-1 border-2 border-blue-300 rounded text-xs resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        rows={2}
                                        placeholder="Description (optional)"
                                      />
                                      <div className="flex space-x-1.5">
                                        <button
                                          onClick={handleSaveEditSection}
                                          className="flex-1 px-2 py-1 bg-gradient-to-r from-green-500 to-green-600 text-white rounded text-xs font-medium hover:from-green-600 hover:to-green-700 shadow-sm hover:shadow-md transition-all transform hover:scale-105 active:scale-95"
                                        >
                                          <Save className="w-3 h-3 inline mr-0.5" />
                                          Save
                                        </button>
                                        <button
                                          onClick={handleCancelEditSection}
                                          className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs font-medium hover:bg-gray-300 shadow-sm transition-all transform hover:scale-105 active:scale-95"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    // View Mode - Draggable & Clickable
                                    <div
                                      draggable
                                      onDragStart={(e) => handleSectionDragStart(section, module.id!, idx, e)}
                                      onDragOver={(e) => handleSectionDragOver(module.id!, idx, e)}
                                      onDrop={(e) => handleSectionDrop(module.id!, idx, e)}
                                      onDragLeave={() => setDragOverSectionIndex(null)}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedModule(module);
                                        setCurrentView('sections'); // Force sections view when clicking on section
                                        // Scroll to section in main view
                                        const sectionElement = document.getElementById(`section-${section.id}`);
                                        if (sectionElement) {
                                          sectionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        }
                                      }}
                                      className={`flex items-center text-xs group/section hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 px-2 py-1.5 rounded-lg transition-all cursor-move border-2 ${dragOverSectionIndex === idx
                                          ? 'border-blue-400 bg-blue-50 shadow-md'
                                          : 'border-transparent hover:border-blue-200 hover:shadow-sm'
                                        }`}
                                    >
                                      <GripVertical className="w-3 h-3 text-gray-400 group-hover/section:text-blue-500 mr-1.5 flex-shrink-0 transition-colors" />
                                      <span className={`font-bold mr-1.5 flex-shrink-0 text-xs ${selectedModule?.id === module.id
                                          ? 'text-blue-600'
                                          : 'text-gray-400 group-hover/section:text-blue-500'
                                        }`}>{idx + 1}.</span>
                                      <span className={`line-clamp-1 flex-1 font-medium text-xs ${selectedModule?.id === module.id
                                          ? 'text-gray-800'
                                          : 'text-gray-700 group-hover/section:text-gray-900'
                                        }`}>{section.title}</span>
                                      <button
                                        onClick={(e) => handleStartEditSection(section, module.id!, e)}
                                        className="opacity-0 group-hover/section:opacity-100 p-1 hover:bg-blue-100 rounded ml-1.5 flex-shrink-0 transition-all transform hover:scale-110"
                                      >
                                        <Edit2 className="w-3 h-3 text-blue-600" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteModule(module.id!);
                        }}
                        className="p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-lg transition-all transform hover:scale-110 active:scale-95 opacity-0 group-hover/module:opacity-100 shadow-sm hover:shadow-md"
                        title="Delete module"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {modules.length === 0 && !editingModule && (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mb-4">
                    <FileText className="w-10 h-10 text-gray-400" />
                  </div>
                  <p className="text-center text-gray-500 font-medium">No modules</p>
                  <p className="text-center text-gray-400 text-sm mt-1">Click + to create</p>
                </div>
              )}
            </div>

            {/* Create Module Form - Displayed at bottom */}
            {editingModule && (
              <div className="mt-2 p-2.5 bg-gradient-to-br from-blue-50 via-purple-50 to-blue-50 rounded-xl space-y-2 border-2 border-blue-300 shadow-md">
                <h3 className="font-bold text-gray-900 mb-1 flex items-center text-sm">
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                  New Module
                </h3>
                <input
                  type="text"
                  placeholder="Module title"
                  value={moduleForm.title}
                  onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                  className="w-full px-2.5 py-1.5 border-2 border-blue-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
                />
                <textarea
                  placeholder="Module description"
                  value={moduleForm.description}
                  onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                  rows={2}
                  className="w-full px-2.5 py-1.5 border-2 border-blue-200 rounded-lg text-xs resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
                />
                <input
                  type="number"
                  placeholder="Duration (minutes)"
                  value={moduleForm.estimatedDuration}
                  onChange={(e) => setModuleForm({ ...moduleForm, estimatedDuration: parseInt(e.target.value) || 0 })}
                  className="w-full px-2.5 py-1.5 border-2 border-blue-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
                />
                <div className="flex flex-col space-y-1.5 pt-1">
                  <button
                    onClick={() => handleCreateModule(true)}
                    className="w-full px-2.5 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 text-xs font-semibold flex items-center justify-center shadow-sm hover:shadow-md transition-all transform hover:scale-105 active:scale-95"
                  >
                    Save & Add Sections
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </button>
                  <div className="flex space-x-1.5">
                    <button
                      onClick={() => handleCreateModule(false)}
                      className="flex-1 px-2 py-1.5 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 text-xs font-medium shadow-sm hover:shadow-md transition-all transform hover:scale-105 active:scale-95"
                    >
                      <Save className="w-3.5 h-3.5 inline mr-1" />
                      Save
                    </button>
                    <button
                      onClick={() => setEditingModule(false)}
                      className="px-2 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-xs font-medium shadow-sm hover:shadow-md transition-all transform hover:scale-105 active:scale-95"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Resize Handle - Only visible when not collapsed */}
          {!sidebarCollapsed && (
            <div
              onMouseDown={startResize}
              className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize group/handle"
              style={{
                zIndex: 50,
                right: '-4px' // Extend outside for easier grabbing
              }}
            >
              {/* Visual indicator */}
              <div
                className={`absolute right-1 top-0 bottom-0 w-1 rounded-full transition-all ${isResizing
                    ? 'bg-blue-500 w-1'
                    : 'bg-gray-300 group-hover/handle:bg-blue-400 group-hover/handle:w-1'
                  }`}
              />
              {/* Drag handle pill */}
              <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-3 h-20 bg-blue-500 rounded-l-lg transition-all ${isResizing
                  ? 'opacity-100 shadow-lg'
                  : 'opacity-0 group-hover/handle:opacity-100 group-hover/handle:shadow-md'
                }`}>
                <div className="absolute inset-0 flex flex-col items-center justify-center space-y-1 px-0.5">
                  <div className="w-0.5 h-1 bg-white rounded-full opacity-70" />
                  <div className="w-0.5 h-1 bg-white rounded-full opacity-70" />
                  <div className="w-0.5 h-1 bg-white rounded-full opacity-70" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Module Content - With left margin for fixed sidebar */}
        <div
          className={`px-6 ${!isResizing ? 'transition-all duration-300' : ''}`}
          style={{
            marginLeft: sidebarCollapsed ? '104px' : `${sidebarWidth + 48}px` // +48px for left-6 padding
          }}
        >
          {selectedModule ? (
            <div className="bg-white rounded-lg shadow-md p-6 flex flex-col overflow-hidden" style={{ minHeight: 'calc(100vh - 10rem)' }}>
              {/* Header - Fixed (hidden for final exam) */}
              {currentView !== 'finalExam' && (
                <div className="flex items-center justify-between mb-6 flex-shrink-0">
                  <div className="flex items-center space-x-3">
                    <h2 className="text-2xl font-bold">{selectedModule.title}</h2>
                    <button
                      onClick={() => setShowModuleSettings(true)}
                      className="p-2 hover:bg-purple-50 text-purple-600 rounded-lg transition-colors"
                      title="Edit module"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => {
                        setSectionForm({
                          title: '',
                          type: 'video',
                          content: {},
                        });
                        setSectionCreationStep(1);
                      }}
                      className="p-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all shadow-md hover:shadow-xl transform hover:scale-110 active:scale-95"
                      title="Add a section"
                    >
                      <Plus className="w-5 h-5" />
                    </button>

                    {/* Quiz Button */}
                    <button
                      onClick={() => setShowQuizBuilder(true)}
                      className={`px-4 py-2.5 rounded-xl font-medium transition-all shadow-md hover:shadow-xl transform hover:scale-105 active:scale-95 flex items-center space-x-2 ${quizzesCount.get(selectedModule.id!)
                          ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700'
                          : 'bg-white border-2 border-purple-300 text-purple-600 hover:bg-purple-50'
                        }`}
                      title={quizzesCount.get(selectedModule.id!) ? 'View quizzes' : 'Create a quiz'}
                    >
                      <Award className="w-4 h-4" />
                      <span className="text-sm">
                        {quizzesCount.get(selectedModule.id!)
                          ? `Quiz (${quizzesCount.get(selectedModule.id!)})`
                          : 'Add Quiz'}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto pr-2">
                {/* Only show description when viewing sections, not quiz or final exam */}
                {currentView === 'sections' && (
                  <p className="text-gray-600 mb-6">{selectedModule.description}</p>
                )}

                {/* Add Section Form - Progressive Steps */}
                <div className="mb-6">
                  {/* Step 1: Title Only */}
                  {sectionCreationStep === 1 && (
                    <div className="p-6 bg-blue-50 rounded-lg border-2 border-blue-200">
                      <h3 className="font-medium mb-4 text-blue-900">Step 1: Enter Section Title</h3>
                      <div className="space-y-4">
                        <input
                          type="text"
                          placeholder="Section title"
                          value={sectionForm.title}
                          onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-lg"
                          autoFocus
                        />
                        <div className="flex space-x-3">
                          <button
                            onClick={() => {
                              if (!sectionForm.title) {
                                alert('Please enter a section title');
                                return;
                              }
                              setSectionCreationStep(2);
                            }}
                            disabled={!sectionForm.title}
                            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-semibold"
                          >
                            Next: Choose Type
                            <ArrowRight className="w-5 h-5 ml-2" />
                          </button>
                          <button
                            onClick={() => {
                              setSectionCreationStep(0);
                              setSectionForm({
                                title: '',
                                type: 'video',
                                content: {},
                              });
                            }}
                            className="px-4 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Full Form */}
                  {sectionCreationStep === 2 && (
                    <div className="p-6 bg-gray-50 rounded-lg border-2 border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-gray-900">
                          Step 2: Add Content for "{sectionForm.title}"
                        </h3>
                        <button
                          onClick={() => setSectionCreationStep(1)}
                          className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                        >
                          <ArrowLeft className="w-4 h-4 mr-1" />
                          Back to Title
                        </button>
                      </div>

                      <div className="space-y-4">
                        <select
                          value={sectionForm.type}
                          onChange={(e) => setSectionForm({
                            ...sectionForm,
                            type: e.target.value as any,
                            content: { text: '', keyPoints: [] }
                          })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="video">🎥 Video Upload</option>
                          <option value="image">🖼️ Image Upload</option>
                          <option value="document">📄 Document (PDF/Word/Excel)</option>
                          <option value="powerpoint">📊 PowerPoint Presentation</option>
                          <option value="youtube">▶️ YouTube Video</option>
                        </select>

                        {/* Content based on type */}
                        {sectionForm.type === 'youtube' && (
                          <input
                            type="text"
                            placeholder="YouTube URL"
                            value={sectionForm.content?.youtubeUrl || ''}
                            onChange={(e) => setSectionForm({
                              ...sectionForm,
                              content: { ...sectionForm.content!, youtubeUrl: e.target.value }
                            })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          />
                        )}

                        {(sectionForm.type === 'video' || sectionForm.type === 'document' || sectionForm.type === 'image' || sectionForm.type === 'powerpoint') && (
                          <FileUploader
                            fileType={
                              sectionForm.type === 'video' ? 'video' :
                                sectionForm.type === 'image' ? 'image' :
                                  'document'
                            }
                            onUploadComplete={handleFileUpload}
                          />
                        )}

                        {sectionForm.content?.file && (
                          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm text-green-800">✓ File uploaded: {sectionForm.content.file.name}</p>
                          </div>
                        )}

                        <div className="flex flex-col space-y-2">
                          <button
                            onClick={() => handleAddSection(true)}
                            disabled={!sectionForm.title || (sectionForm.type !== 'youtube' && !sectionForm.content?.file)}
                            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                          >
                            Save & Add Quiz
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </button>
                          <button
                            onClick={() => handleAddSection(false)}
                            disabled={!sectionForm.title || (sectionForm.type !== 'youtube' && !sectionForm.content?.file)}
                            className="w-full px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Save className="w-4 h-4 inline mr-2" />
                            Save & Continue
                          </button>
                          <button
                            onClick={() => {
                              setSectionCreationStep(0);
                              setSectionForm({
                                title: '',
                                type: 'video',
                                content: {},
                              });
                            }}
                            className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sections List - Only show if no quiz or explicitly viewing sections */}
                {currentView === 'sections' && (
                  <div className="space-y-4">
                    <h3 className="font-medium">Sections</h3>

                    {selectedModule.sections && selectedModule.sections.length > 0 ? (
                      [...selectedModule.sections]
                        .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
                        .map((section) => {
                          const isExpanded = expandedSections.has(section.id!);
                          const youtubeId = section.content.youtubeUrl ? extractYouTubeId(section.content.youtubeUrl) : null;

                          return (
                            <div key={section.id} id={`section-${section.id}`} className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden scroll-mt-24">
                              {/* Section Header */}
                              <div className="p-4 flex items-start justify-between">
                                <div className="flex items-start space-x-3 flex-1">
                                  {getSectionIcon(section.type)}
                                  <div className="flex-1">
                                    <h4 className="font-medium text-gray-900">{section.title}</h4>
                                    <p className="text-sm text-gray-600 mt-1">Type: {section.type}</p>

                                    {section.content.text && !isExpanded && (
                                      <p className="text-sm text-gray-700 mt-2">{section.content.text.substring(0, 100)}...</p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                  {/* Play/Expand Button */}
                                  {(section.type === 'video' || section.type === 'youtube' || section.type === 'document' || section.type === 'image' || section.type === 'powerpoint') && (
                                    <button
                                      onClick={() => toggleSectionExpanded(section.id!)}
                                      className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1"
                                    >
                                      {isExpanded ? (
                                        <>
                                          <ChevronUp className="w-4 h-4" />
                                          <span className="text-xs">Hide</span>
                                        </>
                                      ) : (
                                        <>
                                          <Play className="w-4 h-4" />
                                          <span className="text-xs">{section.type === 'image' ? 'View' : 'Play'}</span>
                                        </>
                                      )}
                                    </button>
                                  )}

                                  {/* Delete Button */}
                                  <button
                                    onClick={() => handleDeleteSection(section.id!)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              {/* Expanded Content */}
                              {isExpanded && (
                                <div className="px-4 pb-4 border-t border-gray-200 bg-white">

                                  {/* Video Player */}
                                  {section.type === 'video' && section.content.file && (
                                    <div className="mt-4">
                                      <video
                                        controls
                                        className="w-full rounded-lg shadow-lg"
                                        style={{ maxHeight: '400px' }}
                                      >
                                        <source src={section.content.file.url} type="video/mp4" />
                                        Your browser does not support the video tag.
                                      </video>
                                      <a
                                        href={section.content.file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 hover:underline mt-2 inline-block"
                                      >
                                        Open in new tab →
                                      </a>
                                    </div>
                                  )}

                                  {/* YouTube Player */}
                                  {section.type === 'youtube' && youtubeId && (
                                    <div className="mt-4">
                                      <div className="relative" style={{ paddingBottom: '56.25%' }}>
                                        <iframe
                                          className="absolute top-0 left-0 w-full h-full rounded-lg shadow-lg"
                                          src={`https://www.youtube.com/embed/${youtubeId}`}
                                          title={section.title}
                                          frameBorder="0"
                                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                          allowFullScreen
                                        />
                                      </div>
                                      <a
                                        href={section.content.youtubeUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 hover:underline mt-2 inline-block"
                                      >
                                        Watch on YouTube →
                                      </a>
                                    </div>
                                  )}

                                  {/* Document Viewer */}
                                  {section.type === 'document' && section.content.file && (
                                    <div className="mt-4">
                                      <div className="border border-gray-300 rounded-lg overflow-hidden">
                                        <iframe
                                          src={`https://docs.google.com/viewer?url=${encodeURIComponent(section.content.file.url)}&embedded=true`}
                                          className="w-full"
                                          style={{ height: '300px' }}
                                          title={section.title}
                                        />
                                      </div>
                                      <div className="mt-2 flex items-center space-x-3">
                                        <a
                                          href={section.content.file.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs text-blue-600 hover:underline"
                                        >
                                          Open in new tab →
                                        </a>
                                        <a
                                          href={section.content.file.url}
                                          download
                                          className="text-xs text-green-600 hover:underline"
                                        >
                                          Download →
                                        </a>
                                      </div>
                                    </div>
                                  )}

                                  {/* PowerPoint Viewer via Google Docs */}
                                  {section.type === 'powerpoint' && section.content.file && (
                                    <div className="mt-4">
                                      <div className="border-2 border-orange-300 rounded-xl overflow-hidden bg-gradient-to-br from-orange-50 via-yellow-50 to-orange-50">
                                        {/* Header with Title */}
                                        <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 text-white">
                                          <div className="flex items-center space-x-3">
                                            <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor">
                                              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18.5,9H13V3.5L18.5,9M9.5,11C10.16,11 10.67,11.5 10.67,12.17V17.83C10.67,18.5 10.16,19 9.5,19C8.83,19 8.33,18.5 8.33,17.83V12.17C8.33,11.5 8.83,11 9.5,11M12.83,11H15.17C15.84,11 16.33,11.5 16.33,12.17V17.83C16.33,18.5 15.84,19 15.17,19H12.83C12.17,19 11.67,18.5 11.67,17.83V12.17C11.67,11.5 12.17,11 12.83,11Z" />
                                            </svg>
                                            <div>
                                              <h3 className="font-bold text-lg">{section.content.file.name}</h3>
                                              <p className="text-xs text-orange-100">
                                                PowerPoint Presentation • {(section.content.file.size / (1024 * 1024)).toFixed(2)} MB
                                              </p>
                                            </div>
                                          </div>
                                        </div>

                                        {/* PowerPoint Preview Card */}
                                        <div className="relative bg-gradient-to-br from-white via-orange-50 to-yellow-50 p-6">
                                          {/* Large Preview Icon */}
                                          <div className="flex items-center justify-center mb-6">
                                            <div className="relative">
                                              <div className="absolute inset-0 bg-orange-400 blur-2xl opacity-30 rounded-full"></div>
                                              <svg className="w-32 h-32 relative z-10 text-orange-600" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18.5,9H13V3.5L18.5,9M9.5,11C10.16,11 10.67,11.5 10.67,12.17V17.83C10.67,18.5 10.16,19 9.5,19C8.83,19 8.33,18.5 8.33,17.83V12.17C8.33,11.5 8.83,11 9.5,11M12.83,11H15.17C15.84,11 16.33,11.5 16.33,12.17V17.83C16.33,18.5 15.84,19 15.17,19H12.83C12.17,19 11.67,18.5 11.67,17.83V12.17C11.67,11.5 12.17,11 12.83,11Z" />
                                              </svg>
                                            </div>
                                          </div>

                                          {/* File Info */}
                                          <div className="text-center mb-6">
                                            <h4 className="text-xl font-bold text-gray-800 mb-2">
                                              📊 PowerPoint Presentation
                                            </h4>
                                            <p className="text-sm text-gray-600">
                                              File ready to view • {(section.content.file.size / (1024 * 1024)).toFixed(2)} MB
                                            </p>
                                          </div>

                                          {/* Quick Actions */}
                                          <div className="space-y-3">
                                            <a
                                              href={section.content.file.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex items-center justify-center w-full px-6 py-4 bg-gradient-to-r from-purple-600 via-blue-600 to-blue-700 hover:from-purple-700 hover:via-blue-700 hover:to-blue-800 text-white rounded-xl font-bold shadow-2xl hover:shadow-3xl transition-all transform hover:scale-105 hover:-translate-y-1"
                                            >
                                              <Play className="w-6 h-6 mr-3" />
                                              View Presentation in Browser
                                            </a>

                                            <a
                                              href={section.content.file.url}
                                              download={section.content.file.name}
                                              className="flex items-center justify-center w-full px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white rounded-xl font-bold shadow-2xl hover:shadow-3xl transition-all transform hover:scale-105 hover:-translate-y-1"
                                            >
                                              <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                              </svg>
                                              Download to Your Device
                                            </a>
                                          </div>

                                          {/* Info Box */}
                                          <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                                            <div className="flex items-start space-x-3">
                                              <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                              </svg>
                                              <div className="flex-1">
                                                <p className="text-sm font-bold text-blue-900 mb-2">
                                                  💡 How to view this PowerPoint:
                                                </p>
                                                <ul className="text-xs text-blue-800 space-y-1.5 list-disc list-inside">
                                                  <li><strong>In Browser:</strong> Click "View Presentation" to open it in a new tab</li>
                                                  <li><strong>Download:</strong> Save the file and open with PowerPoint, Google Slides, or LibreOffice</li>
                                                  <li><strong>Best Quality:</strong> For full animations and transitions, download and use PowerPoint</li>
                                                </ul>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Image Display */}
                                  {section.type === 'image' && section.content.file && (
                                    <div className="mt-4">
                                      <img
                                        src={section.content.file.url}
                                        alt={section.title}
                                        className="w-full rounded-lg shadow-lg"
                                        style={{ maxHeight: '600px', objectFit: 'contain' }}
                                      />
                                      <div className="mt-2 flex items-center space-x-3">
                                        <a
                                          href={section.content.file.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs text-blue-600 hover:underline"
                                        >
                                          View full size →
                                        </a>
                                        <a
                                          href={section.content.file.url}
                                          download
                                          className="text-xs text-green-600 hover:underline"
                                        >
                                          Download →
                                        </a>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                    ) : (
                      sectionCreationStep === 0 && (
                        <div className="flex flex-col items-center justify-center py-12">
                          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center mb-4">
                            <FileText className="w-12 h-12 text-green-600" />
                          </div>
                          <p className="text-center text-gray-600 font-medium mb-2">Aucune section</p>
                          <p className="text-center text-gray-400 text-sm">Cliquez sur le bouton <span className="inline-flex items-center px-2 py-0.5 rounded bg-green-100 text-green-700 font-semibold mx-1"><Plus className="w-3 h-3 mr-0.5" />Ajouter</span> en haut</p>
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* Quiz View - Display quiz questions inline */}
                {currentView === 'quiz' && (
                  <QuizTaker
                    moduleId={selectedModule.id!}
                    trainingId={training.id!}
                    onQuizComplete={(completed) => setIsQuizCompleted(completed)}
                  />
                )}

                {/* Final Exam View - Display final exam after last module */}
                {currentView === 'finalExam' && finalExam && (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl p-4 mb-4">
                      <div className="flex items-center space-x-3">
                        <Award className="w-8 h-8 text-amber-600" />
                        <div>
                          <h3 className="text-xl font-bold text-amber-900">Final Exam</h3>
                          <p className="text-sm text-amber-700">{finalExam.description || 'Comprehensive final examination covering all modules'}</p>
                        </div>
                      </div>
                    </div>
                    <QuizTaker
                      moduleId="final-exam"
                      trainingId={training.id!}
                      onQuizComplete={(completed) => setIsFinalExamCompleted(completed)}
                    />
                  </div>
                )}
              </div>
              {/* End of Scrollable Content */}

              {/* Next Button - Fixed at Bottom */}
              <div className="border-t border-gray-200 p-4 bg-gray-50 flex-shrink-0">
                <button
                  onClick={() => {
                    if (currentView === 'sections') {
                      // Check if there are quizzes for this module
                      const hasQuiz = quizzesCount.get(selectedModule.id!) && quizzesCount.get(selectedModule.id!)! > 0;

                      if (hasQuiz) {
                        // Go to quiz view
                        setCurrentView('quiz');
                      } else {
                        // No quiz, check if this is the last module
                        const currentIndex = modules.findIndex(m => m.id === selectedModule.id);
                        if (currentIndex < modules.length - 1) {
                          // Go to next module
                          const nextIndex = currentIndex + 1;
                          setSelectedModule(modules[nextIndex]);
                        } else {
                          // Last module, check if final exam exists
                          if (finalExam) {
                            setCurrentView('finalExam');
                          }
                        }
                      }
                    } else if (currentView === 'quiz') {
                      // Currently in quiz view, check if this is the last module
                      const currentIndex = modules.findIndex(m => m.id === selectedModule.id);
                      if (currentIndex < modules.length - 1) {
                        // Go to next module
                        const nextIndex = currentIndex + 1;
                        setSelectedModule(modules[nextIndex]);
                      } else {
                        // Last module completed, show final exam if exists
                        if (finalExam) {
                          setCurrentView('finalExam');
                        }
                      }
                    } else if (currentView === 'finalExam') {
                      // Final exam completed, nothing more to do
                      // Could show completion message or redirect
                    }
                  }}
                  disabled={
                    (currentView === 'finalExam' && !isFinalExamCompleted)
                  }
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-xl transform hover:scale-105 active:scale-95 flex items-center justify-center space-x-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-md"
                >
                  <span>
                    {currentView === 'finalExam' && isFinalExamCompleted
                      ? 'Training Completed!'
                      : currentView === 'finalExam'
                        ? 'Complete Final Exam'
                        : 'Next'}
                  </span>
                  {currentView !== 'finalExam' || !isFinalExamCompleted ? (
                    <ArrowRight className="w-5 h-5" />
                  ) : null}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-12 text-center flex flex-col items-center justify-center" style={{ minHeight: 'calc(100vh - 10rem)' }}>
              <div className="text-gray-400 mb-4">
                <FileText className="w-16 h-16 mx-auto" />
              </div>
              <p className="text-xl text-gray-600">Select a module to manage its content</p>
            </div>
          )}
        </div>
      </div>

      {/* Final Exam Generator Modal */}
      {showFinalExamGenerator && (
        <FinalExamGenerator
          training={training}
          onExamGenerated={(exam) => {
            setShowFinalExamGenerator(false);
            alert('Examen final créé avec succès! ' + exam.questions?.length + ' questions générées.');
          }}
          onClose={() => setShowFinalExamGenerator(false)}
        />
      )}

      {/* Training Settings Modal */}
      {showTrainingSettings && (
        <TrainingSettingsModal
          training={training}
          onClose={() => setShowTrainingSettings(false)}
          onUpdate={() => {
            // Force re-render to show updated training info
            loadModules();
          }}
        />
      )}

      {/* Module Settings Modal */}
      {showModuleSettings && selectedModule && (
        <ModuleSettingsModal
          module={selectedModule}
          onClose={() => setShowModuleSettings(false)}
          onUpdate={() => {
            // Force re-render to show updated module info
            loadModules();
          }}
        />
      )}
    </div>
  );
};

