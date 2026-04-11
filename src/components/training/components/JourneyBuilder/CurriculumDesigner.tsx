import React from 'react';
import {
  Brain,
  Video,
  Music,
  BarChart3,
  Zap,
  CheckSquare,
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Rocket,
  Sparkles,
  Presentation
} from 'lucide-react';
import { ContentUpload, TrainingModule, Assessment, IPresentation } from '../../types/core';
import PresentationPreview from '../Training/PresentationPreview';
import { TrainingMethodology } from '../../types/methodology';
import { TrainingSection } from '../../types/manualTraining';
import { AIService } from '../../infrastructure/services/AIService';

interface CurriculumDesignerProps {
  uploads: ContentUpload[];
  methodology?: TrainingMethodology;
  gigId?: string | null;
  onComplete: (modules: TrainingModule[]) => void;
  onBack: () => void;
  fileTrainingUrl?: string;
}

export default function CurriculumDesigner({ uploads, methodology, gigId, onComplete, onBack, fileTrainingUrl }: CurriculumDesignerProps) {
  const [modules, setModules] = React.useState<TrainingModule[]>([]);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [editingModuleId, setEditingModuleId] = React.useState<string | null>(null);
  const [currentStep, setCurrentStep] = React.useState<'plan' | 'content'>('plan');
  const [presentation, setPresentation] = React.useState<IPresentation | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
  const [isGeneratingPresentation, setIsGeneratingPresentation] = React.useState(false);

  React.useEffect(() => {
    if (currentStep === 'plan' && uploads.length > 0) {
      generateTrainingPlan();
    }
  }, [uploads]);

  // ÉTAPE 1 : Générer le plan de formation (structure seulement)
  const generateTrainingPlan = async () => {
    setIsGenerating(true);

    try {
      const analyzedUploads = uploads.filter(u => u.aiAnalysis);

      if (uploads.length > 0) {
        const combinedAnalysis = analyzedUploads.length === 1
          ? analyzedUploads[0].aiAnalysis!
          : {
            keyTopics: [...new Set(analyzedUploads.flatMap(u => u.aiAnalysis?.keyTopics || []))],
            difficulty: Math.round(
              analyzedUploads.reduce((sum, u) => sum + (u.aiAnalysis?.difficulty || 5), 0) / analyzedUploads.length
            ),
            estimatedReadTime: analyzedUploads.reduce((sum, u) => sum + (u.aiAnalysis?.estimatedReadTime || 0), 0),
            learningObjectives: [...new Set(analyzedUploads.flatMap(u => u.aiAnalysis?.learningObjectives || []))],
            prerequisites: [...new Set(analyzedUploads.flatMap(u => u.aiAnalysis?.prerequisites || []))],
            suggestedModules: [
              'Module 1: Introduction and Foundations',
              'Module 2: Core Concepts and Theory',
              'Module 3: Advanced Techniques',
              'Module 4: Practical Applications',
              'Module 5: Mastery and Integration',
              'Module 6: Assessment and Conclusion'
            ]
          };

        const industry = methodology?.name || 'General';

        const uploadContext = uploads.map((upload) => ({
          fileName: upload.name,
          fileType: upload.type,
          keyTopics: upload.aiAnalysis?.keyTopics || [],
          learningObjectives: upload.aiAnalysis?.learningObjectives || []
        }));

        let curriculum;
        try {
          curriculum = await AIService.generateCurriculum(
            combinedAnalysis,
            industry,
            gigId || undefined,
            uploadContext
          );
        } catch (apiError) {
          console.warn('⚠️ API generateCurriculum failed, using fallback modules:', apiError);
          const fallbackModules = createModulesFromUploadsCustom(uploads, combinedAnalysis);
          setModules(fallbackModules);
          setCurrentStep('content');
          setIsGenerating(false);
          return;
        }

        let modulesToUse = (curriculum?.modules || []).slice(0, 6);
        const targetModuleCount = 6;

        if (modulesToUse.length > 6) {
          modulesToUse = modulesToUse.slice(0, 6);
        }

        if ((curriculum?.modules?.length || 0) < targetModuleCount) {
          const availableSuggestions = combinedAnalysis?.suggestedModules || [];
          const missingCount = targetModuleCount - (curriculum?.modules?.length || 0);

          const missingModules = [];
          for (let i = 0; i < missingCount; i++) {
            const moduleIndex = (curriculum?.modules?.length || 0) + i;
            const suggestedTitle = availableSuggestions[moduleIndex] || `Advanced Module ${moduleIndex + 1}`;

            missingModules.push({
              title: suggestedTitle,
              description: `Comprehensive training module covering ${suggestedTitle.toLowerCase()} concepts and practical applications`,
              duration: 60,
              difficulty: 'intermediate' as const,
              contentItems: 7,
              assessments: 3,
              enhancedElements: ['AI-Generated Video', 'Visual Infographic', 'Interactive Scenario', 'Knowledge Check'],
              learningObjectives: (combinedAnalysis?.learningObjectives?.length || 0) > 0
                ? combinedAnalysis.learningObjectives.slice(0, 4)
                : [`Master ${suggestedTitle} fundamentals`, `Apply ${suggestedTitle} in practice`, 'Complete hands-on exercises']
            });
          }

          modulesToUse = [...(curriculum?.modules || []), ...missingModules];
        }

        let fullModules: TrainingModule[] = [];

        if (uploads.length === 1) {
          const upload = uploads[0];
          const aiModule: any = modulesToUse[0] || {
            title: upload.aiAnalysis?.keyTopics?.[0] || (upload.name || 'Untitled').replace(/\.[^/.]+$/, ''),
            description: upload.aiAnalysis
              ? `Training module covering: ${upload.aiAnalysis.keyTopics?.join(', ') || 'core concepts'}`
              : `Training module based on: ${upload.name || 'Untitled'}`,
            duration: upload.aiAnalysis?.estimatedReadTime || 60,
            difficulty: 'intermediate' as const,
            learningObjectives: upload.aiAnalysis?.learningObjectives || []
          };

          const section = createSectionFromUploadInner(upload, 0, 0);

          fullModules = [{
            id: `module-1`,
            title: aiModule.title,
            description: aiModule.description,
            order: 1,
            content: [],
            sections: [section],
            duration: upload.aiAnalysis?.estimatedReadTime || aiModule.duration,
            difficulty: aiModule.difficulty,
            prerequisites: upload.aiAnalysis?.prerequisites || combinedAnalysis.prerequisites,
            learningObjectives: aiModule.learningObjectives,
            topics: upload.aiAnalysis?.keyTopics || combinedAnalysis.keyTopics || [],
            assessments: []
          }];
        } else {
          const documentModuleMapping: number[] = [];
          uploads.forEach((upload, uploadIndex) => {
            if (upload.aiAnalysis?.keyTopics && (upload.aiAnalysis.keyTopics?.length || 0) > 0) {
              let bestModuleIndex = 0;
              let maxSimilarity = 0;

              modulesToUse.forEach((aiModule, moduleIdx) => {
                const moduleTopics = (aiModule.learningObjectives || []).join(' ').toLowerCase();
                const uploadTopics = upload.aiAnalysis?.keyTopics?.join(' ').toLowerCase() || '';
                const moduleWords = new Set(moduleTopics.split(/\s+/));
                const uploadWords = new Set(uploadTopics.split(/\s+/));
                const commonWords = [...moduleWords].filter(w => uploadWords.has(w));
                const similarity = commonWords.length / Math.max(moduleWords.size, uploadWords.size, 1);

                if (similarity > maxSimilarity) {
                  maxSimilarity = similarity;
                  bestModuleIndex = moduleIdx;
                }
              });

              documentModuleMapping[uploadIndex] = bestModuleIndex;
            } else {
              documentModuleMapping[uploadIndex] = uploadIndex % modulesToUse.length;
            }
          });

          fullModules = await Promise.all(modulesToUse.map(async (aiModule: any, moduleIndex) => {
            const moduleUploads = uploads.filter((_, uploadIndex) =>
              documentModuleMapping[uploadIndex] === moduleIndex
            );

            const moduleSections: TrainingSection[] = moduleUploads.map((upload, uploadIdx) => {
              return createSectionFromUploadInner(upload, moduleIndex, uploadIdx, aiModule);
            });

            // Skip assessment generation
            const assessments: Assessment[] = [];

            const totalDuration = moduleSections.reduce((sum, section) => sum + (section.estimatedDuration || 10), 0);

            return {
              id: `ai-module-${moduleIndex + 1}`,
              title: aiModule.title,
              description: aiModule.description,
              order: moduleIndex + 1,
              content: [],
              sections: moduleSections,
              duration: totalDuration || aiModule.duration,
              difficulty: aiModule.difficulty,
              prerequisites: combinedAnalysis.prerequisites || [],
              learningObjectives: aiModule.learningObjectives || [],
              topics: combinedAnalysis.keyTopics || [],
              assessments: assessments,
              completionCriteria: {
                minimumScore: 70,
                requiredActivities: ['video'],
                timeRequirement: totalDuration || (aiModule.duration as number)
              }
            };
          }));
        }

        setModules(fullModules);
        setCurrentStep('content');
      } else {
        const fallbackModules = createModulesFromUploadsCustom(uploads);
        setModules(fallbackModules);
      }
    } catch (error) {
      console.error('Failed to generate curriculum with AI:', error);
      const fallbackModules = createModulesFromUploadsCustom(uploads);
      setModules(fallbackModules);
    } finally {
      setIsGenerating(false);
    }
  };

  const createModulesFromUploadsCustom = (uploads: ContentUpload[], combinedAnalysis?: any): TrainingModule[] => {
    if (uploads.length === 1) {
      const upload = uploads[0];
      const section = createSectionFromUploadHelperInner(upload, 0, 0);

      return [{
        id: `module-1`,
        title: upload.aiAnalysis?.keyTopics?.[0] || (upload.name || 'Untitled').replace(/\.[^/.]+$/, ''),
        description: upload.aiAnalysis
          ? `Training module covering: ${upload.aiAnalysis.keyTopics?.join(', ') || 'core concepts'}`
          : `Training module based on: ${upload.name || 'Untitled'}`,
        content: [],
        sections: [section],
        duration: upload.aiAnalysis?.estimatedReadTime || 60,
        difficulty: 'intermediate',
        prerequisites: upload.aiAnalysis?.prerequisites || combinedAnalysis?.prerequisites || [],
        learningObjectives: upload.aiAnalysis?.learningObjectives || combinedAnalysis?.learningObjectives || ['Understand core concepts', 'Apply knowledge in practice'],
        topics: upload.aiAnalysis?.keyTopics || combinedAnalysis?.keyTopics || [],
        assessments: []
      }];
    }

    return uploads.map((upload, i) => {
      const section = createSectionFromUploadHelperInner(upload, i, 0);

      return {
        id: `module-${i + 1}`,
        title: upload.aiAnalysis?.keyTopics?.[0] || (upload.name || 'Untitled').replace(/\.[^/.]+$/, ''),
        description: upload.aiAnalysis
          ? `Training module covering: ${upload.aiAnalysis.keyTopics?.join(', ') || 'core concepts'}`
          : `Training module based on uploaded content: ${upload.name || 'Untitled'}`,
        content: [],
        sections: [section],
        duration: upload.aiAnalysis?.estimatedReadTime || 60,
        difficulty: 'intermediate' as const,
        prerequisites: upload.aiAnalysis?.prerequisites || combinedAnalysis?.prerequisites || [],
        learningObjectives: upload.aiAnalysis?.learningObjectives || combinedAnalysis?.learningObjectives || ['Understand core concepts', 'Apply knowledge in practice'],
        topics: upload.aiAnalysis?.keyTopics || combinedAnalysis?.keyTopics || [],
        assessments: []
      };
    });
  };

  function createSectionFromUploadInner(upload: ContentUpload, moduleIndex: number, uploadIdx: number, aiModule?: any): TrainingSection {
    let sectionType: TrainingSection['type'] = 'document';
    if (upload.type === 'video') {
      sectionType = 'video';
    } else if (upload.type === 'document' || upload.type === 'presentation') {
      sectionType = 'document';
    }

    let sectionTitle = (upload.name || 'Untitled').replace(/\.[^/.]+$/, '');
    if (upload.aiAnalysis?.keyTopics && upload.aiAnalysis.keyTopics.length > 0) {
      sectionTitle = upload.aiAnalysis.keyTopics[0];
    }

    let fileUrl = '';
    let filePublicId = upload.id;

    if (upload.cloudinaryUrl) {
      fileUrl = upload.cloudinaryUrl;
      filePublicId = upload.publicId || upload.id;
    } else if (upload.file) {
      try {
        fileUrl = URL.createObjectURL(upload.file);
      } catch (e) {
        console.warn('Could not create object URL for file:', upload.name, e);
      }
    }

    return {
      id: `section-${moduleIndex}-${uploadIdx}`,
      type: sectionType,
      title: sectionTitle,
      content: {
        text: upload.aiAnalysis
          ? `This section covers the key concepts and topics from ${upload.name}.\n\nEstimated duration: ${upload.aiAnalysis.estimatedReadTime || 0} minutes.`
          : `Document: ${upload.name}`,
        file: {
          id: upload.id,
          name: upload.name,
          type: upload.type === 'video' ? 'video' :
            upload.type === 'presentation' ? 'pdf' :
              upload.type === 'document' ? 'pdf' : 'pdf',
          url: fileUrl,
          publicId: filePublicId,
          size: upload.size || 0,
          mimeType: upload.type === 'video' ? 'video/mp4' :
            upload.type === 'document' ? 'application/pdf' :
              upload.type === 'presentation' ? 'application/pdf' : 'application/pdf'
        },
        keyPoints: upload.aiAnalysis?.keyTopics || []
      },
      orderIndex: uploadIdx + 1,
      estimatedDuration: upload.aiAnalysis?.estimatedReadTime || 10
    };
  }

  function createSectionFromUploadHelperInner(upload: ContentUpload, moduleIndex: number, uploadIdx: number): TrainingSection {
    return createSectionFromUploadInner(upload, moduleIndex, uploadIdx);
  }

  const updateModule = (moduleId: string, updates: Partial<TrainingModule>) => {
    setModules(prev => prev.map(m =>
      m.id === moduleId ? { ...m, ...updates } : m
    ));
  };

  const deleteModule = (moduleId: string) => {
    setModules(prev => prev.filter(m => m.id !== moduleId));
  };

  const addNewModule = () => {
    const newModule: TrainingModule = {
      id: `module-${modules.length + 1}`,
      title: 'New Enhanced Module',
      description: 'AI-powered training module with multimedia content',
      content: [],
      sections: [{
        id: `section-new-${modules.length}`,
        type: 'document',
        title: 'Introduction',
        content: { text: 'Module introduction content...' },
        orderIndex: 1,
        estimatedDuration: 5
      }],
      duration: 30,
      difficulty: 'intermediate',
      prerequisites: [],
      learningObjectives: ['New learning objective'],
      topics: [],
      assessments: []
    };

    setModules(prev => [...prev, newModule]);
  };

  const getDifficultyColor = (difficulty: TrainingModule['difficulty']) => {
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

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4 text-red-500" />;
      case 'interactive':
        return <Zap className="h-4 w-4 text-purple-500" />;
      case 'quiz':
        return <CheckSquare className="h-4 w-4 text-blue-500" />;
      default:
        return <BookOpen className="h-4 w-4 text-gray-500" />;
    }
  };

  function toggleEditMode(moduleId: string) {
    setEditingModuleId(editingModuleId === moduleId ? null : moduleId);
  }

  const handleGeneratePresentation = async () => {
    setIsGeneratingPresentation(true);
    try {
      // Simplifier le curriculum pour l'IA
      const curriculumSummary = {
        title: methodology?.name || 'Formation Personnalisée',
        description: methodology?.description || 'Formation générée à partir de documents.',
        modules: modules.map(m => ({
          title: m.title,
          description: m.description,
          learningObjectives: m.learningObjectives
        }))
      };

      const generatedPresentation = await AIService.generatePresentation(curriculumSummary);
      setPresentation(generatedPresentation);
      setIsPreviewOpen(true);
    } catch (error) {
      console.error('Failed to generate presentation:', error);
      alert('Erreur lors de la génération de la présentation.');
    } finally {
      setIsGeneratingPresentation(false);
    }
  };

  if (isGenerating) {
    return (
      <div className="min-h-full bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="max-w-2xl mx-auto text-center p-8">
          <div className="relative mb-8">
            <Brain className="h-24 w-24 text-purple-500 mx-auto animate-pulse" />
            <Sparkles className="h-8 w-8 text-pink-500 absolute -top-2 -right-2 animate-bounce" />
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            AI is Creating Your {methodology ? '360° Methodology-Based' : 'Enhanced'} Curriculum
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Transforming your content into engaging, multimedia training modules with interactive elements
            {methodology && ` based on ${methodology.name} methodology`}...
          </p>

          <div className="space-y-4 mb-8">
            <div className="flex items-center justify-center space-x-3 text-purple-700">
              <Video className="h-5 w-5" />
              <span>Generating AI videos and animations</span>
            </div>
            <div className="flex items-center justify-center space-x-3 text-purple-700">
              <Music className="h-5 w-5" />
              <span>Creating professional voice narration</span>
            </div>
            <div className="flex items-center justify-center space-x-3 text-purple-700">
              <BarChart3 className="h-5 w-5" />
              <span>Building interactive infographics</span>
            </div>
            <div className="flex items-center justify-center space-x-3 text-purple-700">
              <Zap className="h-5 w-5" />
              <span>Adding interactive scenarios and elements</span>
            </div>
            {methodology && (
              <div className="flex items-center justify-center space-x-3 text-purple-700">
                <CheckSquare className="h-5 w-5" />
                <span>Integrating {methodology.name} methodology</span>
              </div>
            )}
          </div>

          <div className="w-full max-w-md mx-auto bg-gray-200 rounded-full h-3">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full animate-pulse transition-all duration-1000" style={{ width: '75%' }}></div>
          </div>
          <p className="text-sm text-gray-500 mt-2">This may take a few moments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-4">
            <div className="inline-flex items-center space-x-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-200 mb-3">
              <Brain className="h-4 w-4 text-purple-500" />
              <span className="text-xs font-medium text-gray-700">Step 2: AI-Enhanced Curriculum Design</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1.5">Your Enhanced Training Curriculum</h2>
            <p className="text-base text-gray-600 max-w-3xl mx-auto">
              AI has transformed your content into engaging, multimedia training modules with interactive elements
              {methodology && ` following the ${methodology.name} methodology`}.
            </p>
          </div>

          {/* Methodology Banner */}
          {methodology && (
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold mb-1">🎯 360° Methodology: {methodology.name}</h3>
                  <p className="text-blue-100 mb-2 text-sm">{methodology.description}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div className="text-center">
                      <div className="text-lg font-bold">{methodology.components.filter(c => c.category === 'foundational').length}</div>
                      <div className="text-blue-200">Foundational</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold">{methodology.components.filter(c => c.category === 'regulatory').length}</div>
                      <div className="text-blue-200">Regulatory</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold">{methodology.components.filter(c => c.category === 'contact-centre').length}</div>
                      <div className="text-blue-200">Contact Centre</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold">{methodology.components.filter(c => c.category === 'regional-compliance').length}</div>
                      <div className="text-blue-200">Regional</div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold mb-1">{methodology.components.reduce((sum, c) => sum + c.estimatedDuration, 0)}h</div>
                  <div className="text-blue-200 text-sm">Total Training</div>
                </div>
              </div>
            </div>
          )}

          {/* Success Banner */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-center space-x-3">
              <CheckSquare className="h-6 w-6 text-green-500" />
              <div className="text-center">
                <h3 className="text-lg font-semibold text-green-900">Curriculum Enhanced Successfully!</h3>
                <p className="text-sm text-green-700">
                  Your content has been transformed with AI-generated videos, audio, infographics, and interactive elements
                  {methodology && ` following industry best practices and compliance requirements`}.
                </p>
              </div>
            </div>
          </div>

          <div className="w-full">
            {/* Module List */}
            <div className="w-full">
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">
                    📚 Enhanced Training Modules ({modules.length} modules)
                  </h3>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={addNewModule}
                      className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
                      title="Add Module"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Module</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  {modules.map((module, index) => {
                    const isEditing = editingModuleId === module.id;

                    return (
                      <div key={module.id} className={`border-2 rounded-xl p-4 transition-all ${isEditing ? 'border-indigo-500 shadow-lg bg-indigo-50' : 'border-gray-200 hover:border-purple-300 hover:shadow-md'}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center flex-wrap gap-3 mb-2">
                              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                                {index + 1}
                              </div>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={module.title}
                                  onChange={(e) => updateModule(module.id, { title: e.target.value })}
                                  className="flex-1 text-xl font-semibold text-gray-900 px-3 py-2 border-2 border-indigo-400 rounded-lg focus:outline-none focus:border-indigo-600"
                                  placeholder="Module Title"
                                />
                              ) : (
                                <h4 className="text-xl font-semibold text-gray-900">{module.title}</h4>
                              )}
                              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getDifficultyColor(module.difficulty)}`}>
                                {module.difficulty || 'intermediate'}
                              </span>
                              {module.id.startsWith('methodology-') && (
                                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                                  360° Methodology
                                </span>
                              )}
                            </div>

                            {isEditing ? (
                              <div className="space-y-4 mb-4">
                                <textarea
                                  value={module.description}
                                  onChange={(e) => updateModule(module.id, { description: e.target.value })}
                                  rows={3}
                                  className="w-full text-gray-600 px-3 py-2 border-2 border-indigo-400 rounded-lg focus:outline-none focus:border-indigo-600"
                                  placeholder="Module Description"
                                />

                                <div className="grid grid-cols-3 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                                    <select
                                      value={module.difficulty}
                                      onChange={(e) => updateModule(module.id, { difficulty: e.target.value as TrainingModule['difficulty'] })}
                                      className="w-full px-3 py-2 border-2 border-indigo-400 rounded-lg focus:outline-none focus:border-indigo-600"
                                    >
                                      <option value="beginner">Beginner</option>
                                      <option value="intermediate">Intermediate</option>
                                      <option value="advanced">Advanced</option>
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
                                    <input
                                      type="number"
                                      value={module.duration}
                                      onChange={(e) => updateModule(module.id, { duration: parseInt(e.target.value) || 0 })}
                                      className="w-full px-3 py-2 border-2 border-indigo-400 rounded-lg focus:outline-none focus:border-indigo-600"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                                    <input
                                      type="number"
                                      value={module.order}
                                      onChange={(e) => updateModule(module.id, { order: parseInt(e.target.value) || 0 })}
                                      className="w-full px-3 py-2 border-2 border-indigo-400 rounded-lg focus:outline-none focus:border-indigo-600"
                                    />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <p className="text-gray-600 mb-4">{module.description}</p>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                              <div className="text-center p-3 bg-blue-50 rounded-lg">
                                <BookOpen className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                                <div className="text-sm font-medium text-blue-900">{module.duration} min</div>
                                <div className="text-xs text-gray-600">Duration</div>
                              </div>
                              <div className="text-center p-3 bg-green-50 rounded-lg">
                                <CheckSquare className="h-5 w-5 text-green-600 mx-auto mb-1" />
                                <div className="text-sm font-medium text-green-900">{(module as any).sections?.length || module.content.length}</div>
                                <div className="text-xs text-gray-600">Sections</div>
                              </div>
                              <div className="text-center p-3 bg-purple-50 rounded-lg">
                                <Zap className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                                <div className="text-sm font-medium text-purple-900">{module.assessments.length}</div>
                                <div className="text-xs text-gray-600">Assessments</div>
                              </div>
                              <div className="text-center p-3 bg-orange-50 rounded-lg">
                                <Sparkles className="h-5 w-5 text-orange-600 mx-auto mb-1" />
                                <div className="text-sm font-medium text-orange-900">AI Enhanced</div>
                                <div className="text-xs text-gray-600">Multimedia</div>
                              </div>
                            </div>

                            {/* ✅ SLIDE CONTENT PREVIEW */}
                            <div className="mb-4">
                              <h5 className="font-semibold text-gray-900 mb-4 flex items-center">
                                <Sparkles className="h-5 w-5 mr-2 text-indigo-600" />
                                Aperçu des Slides ({ (module as any).sections?.length || module.content.length })
                              </h5>

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {((module as any).sections || module.content).map((contentItem: any, contentIdx: number) => (
                                  <div key={contentItem.id || contentIdx} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all group">
                                    <div className="h-32 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center relative">
                                      <div className="absolute top-2 left-2 px-2 py-0.5 bg-white/20 backdrop-blur-md rounded text-[10px] text-white font-bold">
                                        SLIDE {contentIdx + 1}
                                      </div>
                                      <div className="bg-white/10 p-3 rounded-full group-hover:scale-110 transition-transform">
                                        {getContentTypeIcon(contentItem.type)}
                                      </div>
                                    </div>
                                    <div className="p-3">
                                      <h6 className="text-xs font-bold text-gray-900 line-clamp-1 mb-1">{contentItem.title}</h6>
                                      <p className="text-[10px] text-gray-600 line-clamp-2">
                                        {typeof contentItem.content === 'string'
                                          ? contentItem.content
                                          : contentItem.content?.text || 'Multimedia learning element enhanced by AI.'}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col space-y-2 ml-4">
                            <button
                              onClick={() => toggleEditMode(module.id)}
                              className={`p-2 rounded-lg transition-all ${isEditing ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600 hover:bg-indigo-100 hover:text-indigo-600'}`}
                              title={isEditing ? 'Save Changes' : 'Edit Module'}
                            >
                              {isEditing ? <CheckSquare className="h-5 w-5" /> : <Edit2 className="h-5 w-5" />}
                            </button>
                            <button
                              onClick={() => deleteModule(module.id)}
                              className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-red-100 hover:text-red-600 transition-all"
                              title="Delete Module"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="mt-8 flex items-center justify-between bg-white rounded-2xl shadow-xl p-6 border-2 border-indigo-100">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Ready to start training?</h3>
              <p className="text-sm text-gray-600">Your curriculum is complete and enhanced with AI content.</p>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={handleGeneratePresentation}
                disabled={modules.length === 0 || isGeneratingPresentation}
                className="px-6 py-3 bg-white border-2 border-indigo-600 text-indigo-600 rounded-xl hover:bg-indigo-50 disabled:opacity-50 transition-all font-bold flex items-center space-x-2"
              >
                {isGeneratingPresentation ? (
                  <div className="w-5 h-5 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
                ) : (
                  <Presentation className="h-5 w-5" />
                )}
                <span>Visualiser la Présentation</span>
              </button>

              <button
                onClick={() => onComplete(modules)}
                disabled={modules.length === 0}
                className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-lg flex items-center space-x-2"
              >
                <Rocket className="h-5 w-5" />
                <span>🚀 LAUNCH TRAINING</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {isPreviewOpen && presentation && (
        <PresentationPreview 
          presentation={presentation} 
          onClose={() => setIsPreviewOpen(false)} 
          fileTrainingUrl={fileTrainingUrl}
        />
      )}
    </div>
  );
}
