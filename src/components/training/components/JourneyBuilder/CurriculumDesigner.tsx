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
  ArrowRight,
  RotateCcw,
  Wand2,
  ChevronRight,
  FileText
} from 'lucide-react';
import { ContentUpload, TrainingModule, ModuleContent, Assessment, Question } from '../../types/core';
import { TrainingMethodology } from '../../types/methodology';
import { TrainingSection } from '../../types/manualTraining';
import { AIService } from '../../infrastructure/services/AIService';

interface CurriculumDesignerProps {
  uploads: ContentUpload[];
  methodology?: TrainingMethodology;
  gigId?: string | null;
  onComplete: (modules: TrainingModule[]) => void;
  onBack: () => void;
}

export default function CurriculumDesigner({ uploads, methodology, gigId, onComplete, onBack }: CurriculumDesignerProps) {
  const [modules, setModules] = React.useState<TrainingModule[]>([]);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [editingModuleId, setEditingModuleId] = React.useState<string | null>(null);
  const [enhancementProgress, setEnhancementProgress] = React.useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = React.useState('modules');
  const [currentStep, setCurrentStep] = React.useState<'plan' | 'content'>('plan');
  const [isGeneratingContent, setIsGeneratingContent] = React.useState(false);
  const [finalExam, setFinalExam] = React.useState<any>(null);
  const [isGeneratingExam, setIsGeneratingExam] = React.useState(false);

  React.useEffect(() => {
    if (currentStep === 'plan') {
      generateTrainingPlan();
    }
  }, [uploads]);

  // ÉTAPE 1 : Générer le plan de formation (structure seulement)
  const generateTrainingPlan = async () => {
    setIsGenerating(true);
    setEnhancementProgress({ 'plan': 10 });

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
        setEnhancementProgress({ 'generating': 30 } as any);

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
          const fallbackModules = createModulesFromUploads(uploads, combinedAnalysis);
          setModules(fallbackModules);
          setCurrentStep('content');
          setEnhancementProgress({ 'complete': 100 });
          setIsGenerating(false);
          return;
        }

        setEnhancementProgress({ 'transforming': 60 } as any);

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
          const aiModule = modulesToUse[0] || {
            title: upload.aiAnalysis?.keyTopics?.[0] || upload.name.replace(/\.[^/.]+$/, ''),
            description: upload.aiAnalysis
              ? `Training module covering: ${upload.aiAnalysis.keyTopics?.join(', ') || 'core concepts'}`
              : `Training module based on: ${upload.name}`,
            duration: upload.aiAnalysis?.estimatedReadTime || 60,
            difficulty: 'intermediate' as const,
            learningObjectives: upload.aiAnalysis?.learningObjectives || []
          };

          const section = createSectionFromUpload(upload, 0, 0);

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
            if (upload.aiAnalysis?.keyTopics && upload.aiAnalysis.keyTopics.length > 0) {
              let bestModuleIndex = 0;
              let maxSimilarity = 0;

              modulesToUse.forEach((aiModule, moduleIdx) => {
                const moduleTopics = (aiModule.learningObjectives || []).join(' ').toLowerCase();
                const uploadTopics = upload.aiAnalysis.keyTopics.join(' ').toLowerCase();
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

          fullModules = await Promise.all(modulesToUse.map(async (aiModule, moduleIndex) => {
            const moduleUploads = uploads.filter((_, uploadIndex) =>
              documentModuleMapping[uploadIndex] === moduleIndex
            );

            const moduleSections: TrainingSection[] = moduleUploads.map((upload, uploadIdx) => {
              return createSectionFromUpload(upload, moduleIndex, uploadIdx, aiModule);
            });

            let assessments = [];
            try {
              assessments = await generateEnhancedAssessments(
                aiModule.title,
                aiModule.description,
                aiModule.learningObjectives
              );
            } catch (error) {
              assessments = [];
            }

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
              prerequisites: combinedAnalysis.prerequisites,
              learningObjectives: aiModule.learningObjectives,
              topics: combinedAnalysis.keyTopics || [],
              assessments: assessments,
              completionCriteria: {
                minimumScore: 70,
                requiredActivities: ['video', 'quiz'],
                timeRequirement: totalDuration || (aiModule.duration as number)
              }
            };
          }));
        }

        function createSectionFromUpload(upload: ContentUpload, moduleIndex: number, uploadIdx: number, aiModule?: any): TrainingSection {
          let sectionType: TrainingSection['type'] = 'document';
          if (upload.type === 'video') {
            sectionType = 'video';
          } else if (upload.type === 'document' || upload.type === 'presentation') {
            sectionType = 'document';
          }

          let sectionTitle = upload.name.replace(/\.[^/.]+$/, '');
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

        setEnhancementProgress({ 'content-complete': 90 } as any);
        setModules(fullModules);

        try {
          const examData = await AIService.generateFinalExam(
            fullModules.map(m => ({
              title: m.title,
              description: m.description,
              learningObjectives: m.learningObjectives
            }))
          );

          setFinalExam(examData);
        } catch (error) {
          console.warn('⚠️ Using fallback final exam');
        }

        setCurrentStep('content');
        setEnhancementProgress({ 'complete': 100 });
      } else {
        const fallbackModules = createModulesFromUploads(uploads);
        setModules(fallbackModules);
      }
    } catch (error) {
      console.error('Failed to generate curriculum with AI:', error);
      const fallbackModules = createModulesFromUploads(uploads);
      setModules(fallbackModules);
    } finally {
      setIsGenerating(false);
    }
  };

  const createModulesFromUploads = (uploads: ContentUpload[], combinedAnalysis?: any): TrainingModule[] => {
    if (uploads.length === 1) {
      const upload = uploads[0];
      const section = createSectionFromUploadHelper(upload, 0, 0);

      return [{
        id: `module-1`,
        title: upload.aiAnalysis?.keyTopics?.[0] || upload.name.replace(/\.[^/.]+$/, ''),
        description: upload.aiAnalysis
          ? `Training module covering: ${upload.aiAnalysis.keyTopics?.join(', ') || 'core concepts'}`
          : `Training module based on: ${upload.name}`,
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
      const section = createSectionFromUploadHelper(upload, i, 0);

      return {
        id: `module-${i + 1}`,
        title: upload.aiAnalysis?.keyTopics?.[0] || upload.name.replace(/\.[^/.]+$/, ''),
        description: upload.aiAnalysis
          ? `Training module covering: ${upload.aiAnalysis.keyTopics?.join(', ') || 'core concepts'}`
          : `Training module based on uploaded content: ${upload.name}`,
        content: [],
        sections: [section],
        duration: upload.aiAnalysis?.estimatedReadTime || 60,
        difficulty: 'intermediate',
        prerequisites: upload.aiAnalysis?.prerequisites || combinedAnalysis?.prerequisites || [],
        learningObjectives: upload.aiAnalysis?.learningObjectives || combinedAnalysis?.learningObjectives || ['Understand core concepts', 'Apply knowledge in practice'],
        topics: upload.aiAnalysis?.keyTopics || combinedAnalysis?.keyTopics || [],
        assessments: []
      };
    });
  };

  function createSectionFromUploadHelper(upload: ContentUpload, moduleIndex: number, uploadIdx: number): TrainingSection {
    let sectionType: TrainingSection['type'] = 'document';
    if (upload.type === 'video') {
      sectionType = 'video';
    } else if (upload.type === 'document' || upload.type === 'presentation') {
      sectionType = 'document';
    }

    let sectionTitle = upload.name.replace(/\.[^/.]+$/, '');
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

  const generateDetailedContent = async () => {
    if (modules.length === 0) {
      return;
    }

    setIsGeneratingContent(true);

    try {
      const allTranscriptions = uploads
        .filter(u => (u as any).transcription || (u as any).content)
        .map(u => (u as any).transcription || (u as any).content || '')
        .join('\n\n---\n\n');

      const updatedModules = await Promise.all(
        modules.map(async (module) => {
          try {
            const aiSections = await AIService.generateModuleContent(
              module.title,
              module.description,
              allTranscriptions || `Training content for ${module.title}`,
              module.learningObjectives
            );

            const detailedContent: ModuleContent[] = aiSections.map((section: any, idx: number) => ({
              id: section.id || `section-${idx + 1}`,
              type: section.type || 'text',
              title: section.title,
              content: section.content,
              duration: section.duration || 10
            }));

            const assessments = await generateEnhancedAssessments(
              module.title,
              module.description,
              module.learningObjectives
            );

            return {
              ...module,
              content: detailedContent,
              assessments: assessments,
              completionCriteria: {
                ...module.completionCriteria,
                requiredActivities: ['video', 'quiz']
              }
            };
          } catch (error) {
            const detailedContent = generateModuleContentFromAI({
              title: module.title,
              description: module.description,
              duration: module.duration,
              difficulty: module.difficulty,
              learningObjectives: module.learningObjectives
            });

            const assessments = await generateEnhancedAssessments(
              module.title,
              module.description,
              module.learningObjectives
            );

            return {
              ...module,
              content: detailedContent,
              assessments: assessments
            };
          }
        })
      );

      setModules(updatedModules);
      setCurrentStep('content');
    } catch (error) {
      console.error('❌ Error generating detailed content:', error);
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const generateModuleContentFromAI = (aiModule: any): ModuleContent[] => {
    const content: ModuleContent[] = [];
    const hash = aiModule.title.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    const sectionCount = 3 + (hash % 5);

    const titleTemplates = [
      `What is ${aiModule.title.replace('Module', '').replace(/\d+:/g, '')}?`,
      `Understanding ${aiModule.title.split(' ').pop()}`,
      `${aiModule.title.split(' ').pop()} in Practice`,
      `Step-by-Step ${aiModule.title.split(' ').pop()} Guide`,
      `Key Concepts in ${aiModule.title.split(' ').pop()}`,
      `Advanced ${aiModule.title.split(' ').pop()} Techniques`,
      `Implementing ${aiModule.title.split(' ').pop()}`,
      `Troubleshooting ${aiModule.title.split(' ').pop()}`,
      `${aiModule.title.split(' ').pop()} Best Practices`,
      `Real-World ${aiModule.title.split(' ').pop()} Examples`
    ];

    const selectedTitles = titleTemplates
      .sort(() => (hash % 3) - 1)
      .slice(0, sectionCount);

    const baseDurations = [8, 10, 12, 14, 15, 18, 20];

    selectedTitles.forEach((title, index) => {
      content.push({
        id: `section-${index + 1}`,
        type: 'text',
        title: title,
        content: `${aiModule.description}\n\nThis section covers important aspects of the topic.`,
        duration: baseDurations[index % baseDurations.length]
      });
    });

    return content;
  };

  };

  const exportToPowerPoint = async () => {
    if (modules.length === 0) {
      console.warn('⚠️ No modules to export. Generate modules first.');
      return;
    }

    setIsExportingPPT(true);

    try {
      // Préparer le curriculum pour l'API
      const curriculum = {
        title: methodology?.name || 'Formation Professionnelle',
        description: `Formation complète générée avec ${modules.length} modules`,
        totalDuration: modules.reduce((sum, m) => sum + m.duration, 0),
        methodology: methodology?.name || '360° Methodology',
        modules: modules.map(m => ({
          title: m.title,
          description: m.description,
          duration: m.duration,
          difficulty: m.difficulty,
          contentItems: m.content.length,
          assessments: m.assessments.length,
          enhancedElements: ['Video Introduction', 'Interactive Exercises', 'Knowledge Check'],
          learningObjectives: m.learningObjectives
        }))
      };

      console.log('📊 Generating PowerPoint for display:', curriculum);

      // Appeler l'API pour générer le PPT
      const blob = await AIService.exportToPowerPoint(curriculum as any);

      // ✅ AFFICHER LE PPT AU LIEU DE LE TÉLÉCHARGER
      setPptBlob(blob);
      setShowPPTViewer(true);

      console.log('✅ PowerPoint généré avec succès et prêt à être affiché!');

    } catch (error) {
      console.error('❌ Erreur lors de l\'export PowerPoint:', error);
      alert('❌ Erreur lors de la génération du PowerPoint. Vérifiez que le backend est lancé.');
    } finally {
      setIsExportingPPT(false);
    }
  };
  const generateEnhancedModuleContent = (upload: ContentUpload): ModuleContent[] => {
    const baseContent: ModuleContent[] = [
      {
        id: 'welcome',
        type: 'text',
        title: 'Welcome & Overview',
        content: `Welcome to this enhanced learning module based on "${upload.name}". This AI-transformed content includes multimedia elements and interactive components designed to maximize your learning experience.`,
        duration: 3
      },
      {
        id: 'ai-video',
        type: 'video',
        title: 'AI-Generated Explanation Video',
        content: {
          videoUrl: 'ai-generated-video.mp4',
          transcript: 'AI-generated video explaining key concepts with animations and visual aids.',
          aiGenerated: true,
          style: 'animated',
          duration: 8
        },
        duration: 8
      },
      {
        id: 'main-content',
        type: upload.type === 'video' ? 'video' : 'text',
        title: 'Core Learning Content',
        content: upload.type === 'video'
          ? { videoUrl: 'original-content-enhanced.mp4', transcript: 'Enhanced version of original content...' }
          : 'Enhanced and restructured content with improved readability and engagement...',
        duration: upload.aiAnalysis?.estimatedReadTime || 15
      },
      {
        id: 'infographic',
        type: 'interactive',
        title: 'Visual Summary Infographic',
        content: {
          type: 'infographic',
          imageUrl: 'ai-generated-infographic.png',
          interactiveElements: ['clickable-sections', 'hover-details', 'expandable-info'],
          aiGenerated: true
        },
        duration: 5
      },
      {
        id: 'audio-summary',
        type: 'interactive',
        title: 'Audio Summary & Key Takeaways',
        content: {
          type: 'audio',
          audioUrl: 'ai-narrated-summary.mp3',
          transcript: 'Professional AI narration summarizing key points and takeaways.',
          voice: 'professional-female',
          aiGenerated: true
        },
        duration: 4
      },
      {
        id: 'interactive-scenario',
        type: 'interactive',
        title: 'Interactive Learning Scenario',
        content: {
          exerciseType: 'branching-scenario',
          description: 'Apply what you\'ve learned in this realistic, interactive scenario with multiple decision points.',
          branches: 3,
          outcomes: ['excellent', 'good', 'needs-improvement']
        },
        duration: 12
      },
      {
        id: 'knowledge-check',
        type: 'quiz',
        title: 'AI-Powered Knowledge Check',
        content: {
          questions: 5,
          passingScore: 80,
          adaptiveQuestions: true,
          aiGenerated: true,
          difficulty: 'adaptive'
        },
        duration: 8
      }
    ];

    return baseContent;
  };

  // ✅ Générer des QCM professionnels pour chaque module (10-15 questions)
  const generateEnhancedAssessments = async (moduleTitle: string, moduleDescription: string, learningObjectives: string[]): Promise<Assessment[]> => {
    try {
      console.log(`📝 Generating QCM for module: ${moduleTitle}`);

      // Créer un contenu riche pour le module
      const moduleContent = `${moduleTitle}\n\n${moduleDescription}\n\nObjectifs:\n${learningObjectives.join('\n')}`;

      // Appeler l'API pour générer 12 questions de QCM
      const result = await AIService.generateQuiz(moduleContent, 12);
      const questions = Array.isArray(result) ? result : [];

      console.log(`✅ Generated ${questions.length} QCM questions for: ${moduleTitle}`);

      // Convertir en format Assessment
      const assessmentQuestions: Question[] = questions.map((q: any, index: number) => ({
        id: `q${index + 1}`,
        text: q.text || 'Question text missing',
        type: 'multiple-choice',
        options: Array.isArray(q.options) ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
        explanation: q.explanation || '',
        points: q.points || 10
      }));

      // Calculer le score de passage (70%)
      const totalPoints = assessmentQuestions.reduce((sum, q) => sum + (q.points || 10), 0);

      return [{
        id: `assessment-${moduleTitle.replace(/[^a-zA-Z0-9]/g, '-')}`,
        title: `QCM : ${moduleTitle}`,
        type: 'quiz',
        questions: assessmentQuestions,
        passingScore: Math.floor(totalPoints * 0.7),
        timeLimit: assessmentQuestions.length * 2 // 2 minutes per question
      }];
    } catch (error) {
      console.error(`❌ Failed to generate QCM for ${moduleTitle}, using fallback:`, error);

      // Fallback: questions génériques
      const fallbackQuestions: Question[] = learningObjectives.slice(0, 8).map((obj, index) => ({
        id: `q${index + 1}`,
        text: `Concernant "${obj}", quelle est la meilleure approche?`,
        type: 'multiple-choice',
        options: [
          'Appliquer les principes théoriques uniquement',
          'Combiner théorie et pratique de manière adaptée',
          'Suivre strictement une procédure fixe',
          'Improviser selon les situations'
        ],
        correctAnswer: 1,
        explanation: `La meilleure approche combine théorie et pratique, en s'adaptant au contexte pour atteindre: ${obj}`,
        points: 10
      }));

      return [{
        id: `assessment-${moduleTitle}`,
        title: `QCM : ${moduleTitle}`,
        type: 'quiz',
        questions: fallbackQuestions,
        passingScore: 70, // Always 70% (percentage)
        timeLimit: 16
      }];
    }
  };

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
      content: [
        {
          id: 'intro',
          type: 'text',
          title: 'Introduction',
          content: 'Module introduction content...',
          duration: 5
        }
      ],
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
              <span>Adding interactive scenarios and quizzes</span>
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
              AI has transformed your content into engaging, multimedia training modules with interactive elements and assessments
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
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-200">
                                {((module as any).sections && (module as any).sections.length > 0) ? (
                                  (module as any).sections.map((section: any, idx: number) => (
                                    <div key={idx} className="group relative">
                                      {/* Conteneur 16:9 pour simuler une vraie diapo */}
                                      <div className="aspect-[16/9] bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden flex flex-col p-5 hover:shadow-xl transition-all hover:-translate-y-1 relative">
                                        
                                        {/* Header de la slide */}
                                        <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-3">
                                          <h3 className="text-lg font-extrabold text-slate-800 flex items-center leading-tight">
                                            <span className="text-indigo-600 text-xl mr-2">✦</span>
                                            {section.title}
                                          </h3>
                                        </div>

                                        {/* Contenu principal de la slide */}
                                        <div className="flex-1 flex flex-col justify-center">
                                          {(section.content?.keyPoints && section.content.keyPoints.length > 0) ? (
                                            <div className="space-y-3">
                                              {section.content.keyPoints.slice(0, 4).map((kp: string, kpIdx: number) => (
                                                <div key={kpIdx} className="flex items-start text-[13px] text-slate-700 font-medium">
                                                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1.5 mr-3 flex-shrink-0 shadow-sm"></span>
                                                  <span className="leading-snug">{kp}</span>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <p className="text-[13px] text-slate-600 leading-relaxed font-medium italic text-center px-4">
                                              {typeof section.content?.text === 'string' 
                                                ? section.content.text
                                                    .replace(/from\s+[^.]+\.(pdf|txt|docx?)/gi, "from the core resources")
                                                    .replace(/Document:\s+[^.]+\.(pdf|txt|docx?)/gi, "Interactive Module Content")
                                                    .substring(0, 180) + '...'
                                                : 'Contenu interactif généré par l\'IA...'}
                                            </p>
                                          )}
                                        </div>

                                        {/* Footer de la slide */}
                                        <div className="mt-auto pt-3 flex justify-between items-center text-[10px] text-slate-400 font-bold tracking-wider border-t border-slate-50 uppercase">
                                          <span>HARX Platform</span>
                                          <span className="bg-slate-100 px-2 py-1 rounded text-slate-500">Slide {idx + 1}</span>
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  module.content.map((section: any, idx: number) => (
                                    <div key={idx} className="group relative">
                                      {/* Conteneur 16:9 */}
                                      <div className="aspect-[16/9] bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden flex flex-col p-5 hover:shadow-xl transition-all hover:-translate-y-1 relative">
                                        <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-3">
                                          <h3 className="text-lg font-extrabold text-slate-800 flex items-center leading-tight">
                                            <span className="text-indigo-600 text-xl mr-2">✦</span>
                                            {section.title}
                                          </h3>
                                        </div>
                                        <div className="flex-1 flex flex-col justify-center">
                                          <p className="text-[13px] text-slate-600 px-4 text-center leading-relaxed font-medium italic">
                                            {typeof section.content === 'string' 
                                              ? section.content.substring(0, 150) + '...'
                                              : 'Contenu visuel de la présentation...'}
                                          </p>
                                        </div>
                                        <div className="mt-auto pt-3 flex justify-between items-center text-[10px] text-slate-400 font-bold tracking-wider border-t border-slate-50 uppercase">
                                          <span>HARX Platform</span>
                                          <span className="bg-slate-100 px-2 py-1 rounded text-slate-500">Slide {idx + 1}</span>
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                            {/* ✅ QCM / ASSESSMENTS */}
                            {module.assessments && module.assessments.length > 0 && (
                              <div className="mb-4">
                                <h5 className="font-semibold text-gray-900 mb-3 flex items-center">
                                  <CheckSquare className="h-5 w-5 mr-2 text-green-600" />
                                  QCM - Quiz ({module.assessments[0]?.questions?.length || 0} Questions)
                                </h5>
                                {module.assessments.map((assessment, aIdx) => (
                                  <details key={aIdx} className="group bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-200 overflow-hidden">
                                    <summary className="cursor-pointer px-4 py-3 font-medium text-green-900 hover:bg-green-100 transition-colors flex items-center justify-between">
                                      <div className="flex items-center space-x-2">
                                        <CheckSquare className="h-4 w-4 text-green-600" />
                                        <span>{assessment.title}</span>
                                        <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full">
                                          {assessment.questions?.length || 0} Q • {assessment.passingScore || 70}% min
                                        </span>
                                      </div>
                                      <ChevronRight className="h-4 w-4 text-green-600 group-open:rotate-90 transition-transform" />
                                    </summary>
                                    <div className="px-4 py-3 bg-white border-t border-green-200">
                                      <div className="space-y-3">
                                        {assessment.questions?.slice(0, 3).map((q: any, qIdx: number) => (
                                          <div key={qIdx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <p className="font-medium text-gray-900 text-sm mb-2">
                                              <span className="text-green-600">Q{qIdx + 1}.</span> {q.text}
                                            </p>
                                            <div className="text-xs text-gray-600 space-y-1">
                                              {q.options?.map((opt: string, i: number) => (
                                                <div key={i} className={i === q.correctAnswer ? 'text-green-700 font-medium' : ''}>
                                                  {String.fromCharCode(65 + i)}. {opt} {i === q.correctAnswer && '✓'}
                                                </div>
                                              ))}
                                            </div>
                                            <div className="mt-2 text-xs text-gray-500">
                                              Points: {q.points || 10} • {q.difficulty || 'medium'}
                                            </div>
                                          </div>
                                        ))}
                                        {assessment.questions && assessment.questions.length > 3 && (
                                          <p className="text-xs text-center text-gray-600">
                                            ... and {assessment.questions.length - 3} more questions
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </details>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => toggleEditMode(module.id)}
                              className={`px-4 py-2 rounded-lg transition-colors font-medium ${isEditing
                                ? 'bg-green-500 text-white hover:bg-green-600'
                                : 'bg-blue-500 text-white hover:bg-blue-600'
                                }`}
                              title={isEditing ? "Save Changes" : "Edit Module"}
                            >
                              {isEditing ? (
                                <>
                                  <CheckSquare className="h-4 w-4 inline mr-1" />
                                  Save
                                </>
                              ) : (
                                <>
                                  <Edit2 className="h-4 w-4 inline mr-1" />
                                  Edit
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => deleteModule(module.id)}
                              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                              title="Delete Module"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="border-t border-gray-200 pt-4">
                          <h5 className="font-medium text-gray-900 mb-2">Learning Objectives:</h5>
                          <ul className="space-y-1">
                            {Array.isArray(module.learningObjectives) && module.learningObjectives.map((objective, objIndex) => (
                              <li key={objIndex} className="flex items-start space-x-2 text-sm text-gray-600">
                                <CheckSquare className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <span>{objective}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ✅ Final Exam Display */}
          {finalExam && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-md border-2 border-green-500 p-6 mt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-green-900 flex items-center">
                    <CheckSquare className="h-6 w-6 mr-2 text-green-600" />
                    📝 Examen Final de Certification
                  </h3>
                  <p className="text-green-700 mt-2">{finalExam.formationTitle}</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-green-600">{finalExam.questionCount}</div>
                  <div className="text-sm text-green-700">Questions</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">{finalExam.totalPoints}</div>
                  <div className="text-sm text-gray-600">Points Total</div>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{finalExam.passingScore}</div>
                  <div className="text-sm text-gray-600">Score Passage (70%)</div>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{finalExam.duration}</div>
                  <div className="text-sm text-gray-600">Minutes</div>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{modules.length}</div>
                  <div className="text-sm text-gray-600">Modules Couverts</div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 border border-green-200">
                <h4 className="font-semibold text-gray-900 mb-4">Exemples de Questions :</h4>
                {(finalExam.questions || []).slice(0, 3).map((q: any, idx: number) => (
                  <div key={idx} className="mb-4 pb-4 border-b border-gray-200 last:border-0">
                    <p className="font-medium text-gray-900 mb-2">
                      <span className="text-green-600 font-bold">Q{idx + 1}.</span> {q.text}
                    </p>
                    <div className="text-sm text-gray-600 space-y-1">
                      {(q.options || []).map((opt: string, i: number) => (
                        <div key={i} className={i === q.correctAnswer ? 'text-green-700 font-medium' : ''}>
                          {String.fromCharCode(65 + i)}. {opt} {i === q.correctAnswer && '✓'}
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Difficulté: {q.difficulty || 'medium'} • Points: {q.points || 10}
                    </div>
                  </div>
                ))}
                <p className="text-sm text-gray-600 mt-4 text-center">
                  ... and {finalExam.questionCount - 3} more questions
                </p>
              </div>
            </div>
          )}

          {/* Enhancement Summary */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mt-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              AI Enhancement Summary {methodology && `- ${methodology.name}`}
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center p-6 bg-gradient-to-br from-red-50 to-pink-50 rounded-xl">
                <Video className="h-10 w-10 text-red-500 mx-auto mb-3" />
                <div className="text-2xl font-bold text-red-600 mb-1">{modules.length}</div>
                <div className="text-sm text-gray-600">AI Videos Created</div>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
                <Music className="h-10 w-10 text-green-500 mx-auto mb-3" />
                <div className="text-2xl font-bold text-green-600 mb-1">{modules.length}</div>
                <div className="text-sm text-gray-600">Audio Narrations</div>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl">
                <BarChart3 className="h-10 w-10 text-blue-500 mx-auto mb-3" />
                <div className="text-2xl font-bold text-blue-600 mb-1">{modules.length}</div>
                <div className="text-sm text-gray-600">Infographics</div>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl">
                <Zap className="h-10 w-10 text-purple-500 mx-auto mb-3" />
                <div className="text-2xl font-bold text-purple-600 mb-1">{modules.reduce((sum, m) => sum + m.content.filter(c => c.type === 'interactive').length, 0)}</div>
                <div className="text-sm text-gray-600">Interactive Elements</div>
              </div>
            </div>

            {methodology && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Methodology Components Integrated:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {methodology.components.map((component, index) => (
                    <div key={component.id} className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                      <h5 className="font-semibold text-blue-900 mb-1">{component.title}</h5>
                      <div className="text-sm text-blue-700">
                        {component.estimatedDuration}h • {component.weight}% weight • {component.competencyLevel} level
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center mt-8">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium flex items-center space-x-2"
              >
                <ArrowRight className="h-5 w-5 rotate-180" />
                <span>← Back to Upload</span>
              </button>

              <button
                onClick={() => {
                  console.log('🔄 Regenerating training plan...');
                  setModules([]);
                  setCurrentStep('plan');
                  setIsGenerating(true);
                  // Regenerate the training plan
                  setTimeout(() => {
                    window.location.reload();
                  }, 500);
                }}
                disabled={isGenerating}
                className="px-6 py-3 border-2 border-blue-500 text-blue-600 rounded-xl hover:bg-blue-50 transition-all font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Regenerate entire training plan"
              >
                <RotateCcw className="h-5 w-5" />
                <span>🔄 Regenerate</span>
              </button>
            </div>

            <div className="text-center">
              <div className="text-sm text-gray-500 mb-2">
                {modules.length} modules with content and QCM
              </div>
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <span className="text-sm text-purple-600 font-medium">
                  {methodology ? '360° Methodology' : 'AI Enhancement'} Complete
                </span>
              </div>
            </div>

            <div className="flex space-x-4">
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

    </div>
  );
}
