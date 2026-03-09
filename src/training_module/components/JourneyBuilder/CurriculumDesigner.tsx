import React, { useState, useEffect } from 'react';
import { Brain, BookOpen, CheckSquare, Play, Edit, Trash2, Plus, ArrowRight, Sparkles, Video, Music, BarChart3, Zap, Eye, Wand2, FileDown, ChevronRight, FileText, Rocket, RotateCcw } from 'lucide-react';
import { ContentUpload, TrainingModule, ModuleContent, Assessment, Question } from '../../types/core';
import { TrainingMethodology } from '../../types/methodology';
import { TrainingSection } from '../../types/manualTraining';
import { AIService } from '../../infrastructure/services/AIService';
import PowerPointViewer from '../Export/PowerPointViewer';

interface CurriculumDesignerProps {
  uploads: ContentUpload[];
  methodology?: TrainingMethodology;
  onComplete: (modules: TrainingModule[]) => void;
  onBack: () => void;
}

export default function CurriculumDesigner({ uploads, methodology, onComplete, onBack }: CurriculumDesignerProps) {
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [enhancementProgress, setEnhancementProgress] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState('modules');
  const [isExportingPPT, setIsExportingPPT] = useState(false);
  const [pptBlob, setPptBlob] = useState<Blob | null>(null);
  const [showPPTViewer, setShowPPTViewer] = useState(false);
  const [currentStep, setCurrentStep] = useState<'plan' | 'content'>('plan');
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [finalExam, setFinalExam] = useState<any>(null);
  const [isGeneratingExam, setIsGeneratingExam] = useState(false);

  useEffect(() => {
    if (currentStep === 'plan') {
      generateTrainingPlan();
    }
  }, [uploads]);

  // ÉTAPE 1 : Générer le plan de formation (structure seulement)
  const generateTrainingPlan = async () => {
    setIsGenerating(true);
    setEnhancementProgress({ 'plan': 10 });
    
    try {
      // ✅ SUPPORT DE PLUSIEURS FICHIERS : Combiner les analyses de tous les uploads
      const analyzedUploads = uploads.filter(u => u.aiAnalysis);
      
      // Si on a des uploads, créer des modules même si l'API échoue
      if (uploads.length > 0) {
        // Combiner toutes les analyses en une seule
        const combinedAnalysis = analyzedUploads.length === 1 
          ? analyzedUploads[0].aiAnalysis!
          : {
              // Fusionner les key topics de tous les fichiers
              keyTopics: [...new Set(analyzedUploads.flatMap(u => u.aiAnalysis?.keyTopics || []))],
              
              // Prendre la difficulté moyenne
              difficulty: Math.round(
                analyzedUploads.reduce((sum, u) => sum + (u.aiAnalysis?.difficulty || 5), 0) / analyzedUploads.length
              ),
              
              // Additionner les temps de lecture
              estimatedReadTime: analyzedUploads.reduce((sum, u) => sum + (u.aiAnalysis?.estimatedReadTime || 0), 0),
              
              // Combiner tous les objectifs d'apprentissage
              learningObjectives: [...new Set(analyzedUploads.flatMap(u => u.aiAnalysis?.learningObjectives || []))],
              
              // Combiner les prérequis
              prerequisites: [...new Set(analyzedUploads.flatMap(u => u.aiAnalysis?.prerequisites || []))],
              
              // ✅ CORRECTION : Limiter à 6 modules suggérés maximum
              // Ne pas fusionner tous les modules de tous les uploads !
              suggestedModules: [
                'Module 1: Introduction and Foundations',
                'Module 2: Core Concepts and Theory',
                'Module 3: Advanced Techniques',
                'Module 4: Practical Applications',
                'Module 5: Mastery and Integration',
                'Module 6: Assessment and Conclusion'
              ]
            };
        
        console.log('📊 Combined Analysis:', {
          uploads: analyzedUploads.length,
          suggestedModules: combinedAnalysis.suggestedModules,
          keyTopics: combinedAnalysis.keyTopics,
          learningObjectives: combinedAnalysis.learningObjectives
        });
        
        const industry = methodology?.name || 'General';
        
        setEnhancementProgress({ 'generating': 30 });
        
        // ✅ APPEL API RÉEL pour générer le curriculum avec l'analyse combinée
        let curriculum;
        try {
          curriculum = await AIService.generateCurriculum(combinedAnalysis, industry);
        } catch (apiError) {
          console.warn('⚠️ API generateCurriculum failed, using fallback modules:', apiError);
          // Créer des modules fallback basés sur les uploads
          const fallbackModules = createModulesFromUploads(uploads, combinedAnalysis);
          setModules(fallbackModules);
          setCurrentStep('content');
          setEnhancementProgress({ 'complete': 100 });
          setIsGenerating(false);
          return;
        }
        
        console.log('📚 Curriculum API Response:', {
          modulesCount: curriculum.modules.length,
          suggestedCount: combinedAnalysis.suggestedModules.length,
          modules: curriculum.modules
        });
        
        setEnhancementProgress({ 'transforming': 60 });
        
        // ✅ CORRECTION : MAXIMUM 6 modules (pas plus !)
        // Si l'API retourne plus de 6 modules, on garde seulement les 6 premiers
        let modulesToUse = curriculum.modules.slice(0, 6);
        const targetModuleCount = 6; // TOUJOURS 6 modules
        
        if (modulesToUse.length > 6) {
          console.warn(`⚠️ API returned ${curriculum.modules.length} modules. Limiting to 6.`);
          modulesToUse = modulesToUse.slice(0, 6);
        }
        
        if (curriculum.modules.length < targetModuleCount) {
          console.warn(`⚠️ API returned ${curriculum.modules.length} modules, but ${targetModuleCount} were expected. Generating missing modules...`);
          
          // Si on a des suggestions, les utiliser
          const availableSuggestions = combinedAnalysis.suggestedModules;
          const missingCount = targetModuleCount - curriculum.modules.length;
          
          const missingModules = [];
          for (let i = 0; i < missingCount; i++) {
            const moduleIndex = curriculum.modules.length + i;
            const suggestedTitle = availableSuggestions[moduleIndex] || `Advanced Module ${moduleIndex + 1}`;
            
            missingModules.push({
              title: suggestedTitle,
              description: `Comprehensive training module covering ${suggestedTitle.toLowerCase()} concepts and practical applications`,
              duration: 60,
              difficulty: 'intermediate' as const,
              contentItems: 7,
              assessments: 3,
              enhancedElements: ['AI-Generated Video', 'Visual Infographic', 'Interactive Scenario', 'Knowledge Check'],
              learningObjectives: combinedAnalysis.learningObjectives.length > 0 
                ? combinedAnalysis.learningObjectives.slice(0, 4)
                : [`Master ${suggestedTitle} fundamentals`, `Apply ${suggestedTitle} in practice`, 'Complete hands-on exercises']
            });
          }
          
          modulesToUse = [...curriculum.modules, ...missingModules];
          console.log('✅ Generated missing modules:', missingModules.length, 'Total modules:', modulesToUse.length);
        }
        
        // ✅ GÉNÉRER LE PLAN AVEC CONTENU COMPLET ET PERSONNALISÉ
        console.log('🚀 Starting AI-powered content generation for all modules...');
        setEnhancementProgress({ 'ai-content': 40 });
        
        // Récupérer toutes les transcriptions
        const allTranscriptions = uploads
          .filter(u => u.transcription || u.content)
          .map(u => u.transcription || u.content || '')
          .join('\n\n---\n\n');
        
        // ✅ ORGANISER LES DOCUMENTS EN MODULES ET SECTIONS
        // Si 1 document → 1 module avec 1 section
        // Si plusieurs documents → organiser intelligemment par l'IA
        let fullModules: TrainingModule[] = [];
        
        if (uploads.length === 1) {
          // UN SEUL DOCUMENT : 1 module avec 1 section
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
            title: aiModule.title, // ✅ Titre généré par l'IA
            description: aiModule.description,
            order: 1,
            content: [],
            sections: [section], // ✅ 1 section = 1 document
            duration: upload.aiAnalysis?.estimatedReadTime || aiModule.duration,
            difficulty: aiModule.difficulty,
            prerequisites: upload.aiAnalysis?.prerequisites || combinedAnalysis.prerequisites,
            learningObjectives: aiModule.learningObjectives,
            topics: upload.aiAnalysis?.keyTopics || combinedAnalysis.keyTopics || [],
            assessments: []
          }];
        } else {
          // PLUSIEURS DOCUMENTS : Organiser intelligemment par l'IA
          // Analyser les documents pour regrouper ceux qui ont des topics similaires
          console.log('📊 Analyzing documents to organize them intelligently...');
          
          // Créer un mapping des documents vers les modules basé sur la similarité des topics
          const documentModuleMapping: number[] = [];
          const moduleDocumentCounts: number[] = new Array(modulesToUse.length).fill(0);
          
          // Pour chaque document, trouver le module le plus approprié basé sur les key topics
          uploads.forEach((upload, uploadIndex) => {
            if (upload.aiAnalysis?.keyTopics && upload.aiAnalysis.keyTopics.length > 0) {
              // Trouver le module avec les topics les plus similaires
              let bestModuleIndex = 0;
              let maxSimilarity = 0;
              
              modulesToUse.forEach((aiModule, moduleIdx) => {
                // Calculer la similarité basée sur les topics communs
                const moduleTopics = (aiModule.learningObjectives || []).join(' ').toLowerCase();
                const uploadTopics = upload.aiAnalysis.keyTopics.join(' ').toLowerCase();
                
                // Compter les mots communs
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
              moduleDocumentCounts[bestModuleIndex]++;
            } else {
              // Si pas d'analyse, distribuer équitablement
              const moduleIndex = uploadIndex % modulesToUse.length;
              documentModuleMapping[uploadIndex] = moduleIndex;
              moduleDocumentCounts[moduleIndex]++;
            }
          });
              
          console.log('📊 Document organization:', {
            mapping: documentModuleMapping,
            counts: moduleDocumentCounts
          });
          
          // Créer les modules avec leurs documents assignés
          fullModules = modulesToUse.map((aiModule, moduleIndex) => {
            console.log(`📚 Module ${moduleIndex + 1}/${modulesToUse.length}: "${aiModule.title}"`);
            
            // Récupérer les documents assignés à ce module
            const moduleUploads = uploads.filter((_, uploadIndex) => 
              documentModuleMapping[uploadIndex] === moduleIndex
            );
            
            // Créer les sections pour ce module
            const moduleSections: TrainingSection[] = moduleUploads.map((upload, uploadIdx) => {
              return createSectionFromUpload(upload, moduleIndex, uploadIdx, aiModule);
            });
            
            // Générer les QCM
            let assessments = [];
            try {
              assessments = generateEnhancedAssessments(
                aiModule.title,
                aiModule.description,
                aiModule.learningObjectives
              );
            } catch (error) {
              console.warn(`  ⚠️ Using fallback QCM for "${aiModule.title}"`);
              assessments = [];
            }
            
            // Calculer la durée totale du module basée sur les sections
            const totalDuration = moduleSections.reduce((sum, section) => sum + (section.estimatedDuration || 10), 0);
            
            return {
              id: `ai-module-${moduleIndex + 1}`,
              title: aiModule.title, // ✅ Titre généré par l'IA
            description: aiModule.description,
              order: moduleIndex + 1,
              content: [],
              sections: moduleSections, // ✅ Sections basées sur les documents
              duration: totalDuration || aiModule.duration,
            difficulty: aiModule.difficulty,
            prerequisites: combinedAnalysis.prerequisites,
            learningObjectives: aiModule.learningObjectives,
            topics: combinedAnalysis.keyTopics || [],
              assessments: assessments,
              completionCriteria: {
                minimumScore: 70,
                requiredActivities: ['video', 'quiz'],
                timeRequirement: totalDuration || aiModule.duration
              }
            };
          });
        }
        
        // Fonction helper pour créer une section à partir d'un upload
        function createSectionFromUpload(upload: ContentUpload, moduleIndex: number, uploadIdx: number, aiModule?: any): TrainingSection {
          // Déterminer le type de section
          let sectionType: TrainingSection['type'] = 'document';
          if (upload.type === 'video') {
            sectionType = 'video';
          } else if (upload.type === 'document' || upload.type === 'presentation') {
            sectionType = 'document';
          }
          
          // Générer un titre de section intelligent basé uniquement sur l'analyse AI du document
          let sectionTitle = upload.name.replace(/\.[^/.]+$/, '');
          if (upload.aiAnalysis?.keyTopics && upload.aiAnalysis.keyTopics.length > 0) {
            // Utiliser le premier key topic comme titre de section (basé uniquement sur l'analyse du document)
            sectionTitle = upload.aiAnalysis.keyTopics[0];
          }
          // Ne pas ajouter de préfixe du module - utiliser uniquement l'analyse du document
          
          // Créer l'URL du fichier - utiliser Cloudinary URL si disponible, sinon blob URL
          let fileUrl = '';
          let filePublicId = upload.id;
          
          if (upload.cloudinaryUrl) {
            // Use Cloudinary URL (persistent)
            fileUrl = upload.cloudinaryUrl;
            filePublicId = upload.publicId || upload.id;
          } else if (upload.file) {
            // Fallback to blob URL (temporary, but works for now)
            try {
              fileUrl = URL.createObjectURL(upload.file);
            } catch (e) {
              console.warn('Could not create object URL for file:', upload.name, e);
            }
          }
          
          return {
            id: `section-${moduleIndex}-${uploadIdx}`,
            type: sectionType,
            title: sectionTitle, // ✅ Titre intelligent basé sur l'analyse AI
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
                url: fileUrl, // Cloudinary URL or blob URL
                publicId: filePublicId, // Cloudinary public ID or upload ID
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
        
        console.log('✅ Modules created with document-based sections!');
        console.log(`📊 ${fullModules.length} modules created`);
        console.log(`📚 Total sections (one per document): ${fullModules.reduce((sum, m) => sum + (m.sections?.length || 0), 0)}`);
        console.log(`📝 Total QCM: ${fullModules.reduce((sum, m) => sum + (m.assessments[0]?.questions?.length || 0), 0)} questions`);
        
        setEnhancementProgress({ 'content-complete': 90 });
        setModules(fullModules);
        
        // ✅ Générer automatiquement l'examen final
        console.log('🚀 Generating final exam automatically...');
        try {
          const examData = await AIService.generateFinalExam(
            fullModules.map(m => ({
              title: m.title,
              description: m.description,
              learningObjectives: m.learningObjectives
            }))
          );
          
          setFinalExam(examData);
          console.log(`✅ Examen final généré : ${examData.questionCount} questions (${examData.totalPoints} points)`);
          console.log(`⏱️ Temps: ${examData.duration} minutes | Score passage: ${examData.passingScore}%`);
        } catch (error) {
          console.warn('⚠️ Using fallback final exam');
          // Fallback simple si l'API échoue
        }
        
        setCurrentStep('content'); // ✅ Directement à l'étape "content"
        setEnhancementProgress({ 'complete': 100 });
      } else {
        // Fallback: générer des modules basiques avec sections basées sur les documents
        const fallbackModules = createModulesFromUploads(uploads);
        setModules(fallbackModules);
      }
    } catch (error) {
      console.error('Failed to generate curriculum with AI:', error);
      
      // En cas d'erreur, créer des modules fallback avec sections basées sur les documents
      const fallbackModules = createModulesFromUploads(uploads);
      setModules(fallbackModules);
    } finally {
      setIsGenerating(false);
    }
  };

  // Fonction helper pour créer des modules à partir des uploads
  const createModulesFromUploads = (uploads: ContentUpload[], combinedAnalysis?: any): TrainingModule[] => {
    // Si 1 document → 1 module avec 1 section
    if (uploads.length === 1) {
      const upload = uploads[0];
      const section = createSectionFromUploadHelper(upload, 0, 0);
      
      return [{
        id: `module-1`,
        title: upload.aiAnalysis?.keyTopics?.[0] || upload.name.replace(/\.[^/.]+$/, ''), // ✅ Titre basé sur l'analyse AI
        description: upload.aiAnalysis 
          ? `Training module covering: ${upload.aiAnalysis.keyTopics?.join(', ') || 'core concepts'}`
          : `Training module based on: ${upload.name}`,
        content: [],
        sections: [section], // ✅ 1 section = 1 document
        duration: upload.aiAnalysis?.estimatedReadTime || 60,
        difficulty: 'intermediate',
        prerequisites: upload.aiAnalysis?.prerequisites || combinedAnalysis?.prerequisites || [],
        learningObjectives: upload.aiAnalysis?.learningObjectives || combinedAnalysis?.learningObjectives || ['Understand core concepts', 'Apply knowledge in practice'],
        topics: upload.aiAnalysis?.keyTopics || combinedAnalysis?.keyTopics || [],
        assessments: []
      }];
    }
    
    // Plusieurs documents : créer un module par document (ou organiser intelligemment)
    return uploads.map((upload, i) => {
      const section = createSectionFromUploadHelper(upload, i, 0);
      
      return {
        id: `module-${i + 1}`,
        title: upload.aiAnalysis?.keyTopics?.[0] || upload.name.replace(/\.[^/.]+$/, ''), // ✅ Titre basé sur l'analyse AI
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
  
  // Fonction helper pour créer une section à partir d'un upload
  function createSectionFromUploadHelper(upload: ContentUpload, moduleIndex: number, uploadIdx: number): TrainingSection {
    // Déterminer le type de section
    let sectionType: TrainingSection['type'] = 'document';
    if (upload.type === 'video') {
      sectionType = 'video';
    } else if (upload.type === 'document' || upload.type === 'presentation') {
      sectionType = 'document';
    }
    
    // Générer un titre de section intelligent basé sur l'analyse AI
    let sectionTitle = upload.name.replace(/\.[^/.]+$/, '');
    if (upload.aiAnalysis?.keyTopics && upload.aiAnalysis.keyTopics.length > 0) {
      // Utiliser le premier key topic comme titre de section
      sectionTitle = upload.aiAnalysis.keyTopics[0];
    }
    
    // Créer l'URL du fichier - utiliser Cloudinary URL si disponible, sinon blob URL
    let fileUrl = '';
    let filePublicId = upload.id;
    
    if (upload.cloudinaryUrl) {
      // Use Cloudinary URL (persistent)
      fileUrl = upload.cloudinaryUrl;
      filePublicId = upload.publicId || upload.id;
    } else if (upload.file) {
      // Fallback to blob URL (temporary, but works for now)
      try {
        fileUrl = URL.createObjectURL(upload.file);
      } catch (e) {
        console.warn('Could not create object URL for file:', upload.name, e);
      }
    }
    
    return {
      id: `section-${moduleIndex}-${uploadIdx}`,
      type: sectionType,
      title: sectionTitle, // ✅ Titre intelligent basé sur l'analyse AI
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
          url: fileUrl, // Cloudinary URL or blob URL
          publicId: filePublicId, // Cloudinary public ID or upload ID
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

  // ✅ ÉTAPE 2: Générer le contenu détaillé et PERSONNALISÉ pour les modules
  const generateDetailedContent = async () => {
    if (modules.length === 0) {
      console.warn('⚠️ No training plan available. Generate modules first.');
      return;
    }

    setIsGeneratingContent(true);
    console.log('🚀 Generating AI-powered personalized content for', modules.length, 'modules...');

    try {
      // Récupérer toutes les transcriptions des uploads
      const allTranscriptions = uploads
        .filter(u => u.transcription || u.content)
        .map(u => u.transcription || u.content || '')
        .join('\n\n---\n\n');

      const updatedModules = await Promise.all(
        modules.map(async (module, index) => {
          console.log(`📚 Generating AI-personalized content for Module ${index + 1}: ${module.title}`);
          
          try {
            // ✅ APPEL API pour générer des sections PERSONNALISÉES
            const aiSections = await AIService.generateModuleContent(
              module.title,
              module.description,
              allTranscriptions || `Training content for ${module.title}`,
              module.learningObjectives
            );

            console.log(`✅ AI generated ${aiSections.length} personalized sections for "${module.title}"`);

            // Convertir les sections AI en ModuleContent
            const detailedContent: ModuleContent[] = aiSections.map((section: any, idx: number) => ({
              id: section.id || `section-${idx + 1}`,
              type: section.type || 'text',
              title: section.title,
              content: section.content,
              duration: section.duration || 10
            }));

            // ✅ Générer les QCM professionnels de manière asynchrone
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
            console.error(`❌ Failed to generate AI content for "${module.title}", using fallback:`, error);
            
            // Fallback: utiliser le contenu générique
            const detailedContent = generateModuleContentFromAI({
              title: module.title,
              description: module.description,
              duration: module.duration,
              difficulty: module.difficulty,
              learningObjectives: module.learningObjectives
            });

            // Générer les QCM aussi pour le fallback
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

      console.log('✅ AI-powered personalized content generated for all modules!');
      setModules(updatedModules);
      setCurrentStep('content');
      // ✅ Pas de popup - juste les logs console
    } catch (error) {
      console.error('❌ Error generating detailed content:', error);
      alert('Failed to generate content. Please try again.');
    } finally {
      setIsGeneratingContent(false);
    }
  };

  // ✅ Generate structured TEXT CONTENT organized in SECTIONS with AI-powered personalization
  const generateModuleContentFromAI = (aiModule: any): ModuleContent[] => {
    // ✅ FALLBACK : Si on n'a pas de transcription, générer un contenu de base
    // Le contenu personnalisé sera généré de manière asynchrone via generateDetailedContentForModule
    const content: ModuleContent[] = [];
    
    // ✅ NOMBRE VARIABLE de sections (3 à 7)
    const hash = aiModule.title.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    const sectionCount = 3 + (hash % 5); // 3 à 7 sections
    
    // ✅ Pool de titres variés
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
    
    // Mélanger et sélectionner
    const selectedTitles = titleTemplates
      .sort(() => (hash % 3) - 1)
      .slice(0, sectionCount);
    
    const baseDurations = [8, 10, 12, 14, 15, 18, 20];
    
    selectedTitles.forEach((title, index) => {
      content.push({
        id: `section-${index + 1}`,
        type: 'text',
        title: title,
        content: `${aiModule.description}\n\nThis section covers important aspects of the topic. Content will be enhanced with AI-generated, topic-specific information.\n\nLearning Objectives:\n${aiModule.learningObjectives?.slice(0, 3).map((obj: string) => `• ${obj}`).join('\n') || '• Master key concepts\n• Apply knowledge in practice\n• Develop practical skills'}`,
        duration: baseDurations[index % baseDurations.length]
      });
    });
    
    console.log(`✅ Generated ${content.length} varied fallback sections for: ${aiModule.title}`);
    return content;
  };

  const generateMethodologyModuleContent = (component: any): ModuleContent[] => {
    return [
      {
        id: 'methodology-intro',
        type: 'text',
        title: `${component.title} Introduction`,
        content: `Welcome to ${component.title}. This module covers ${component.description.toLowerCase()} and is essential for achieving ${component.competencyLevel} level competency.`,
        duration: 5
      },
      {
        id: 'methodology-content',
        type: 'interactive',
        title: 'Core Learning Content',
        content: {
          modules: component.modules,
          interactiveElements: ['scenario-practice', 'knowledge-checks', 'real-world-applications'],
          assessmentIntegration: true
        },
        duration: Math.floor(component.estimatedDuration * 60 * 0.7) // 70% of total time
      },
      {
        id: 'methodology-assessment',
        type: 'quiz',
        title: 'Competency Assessment',
        content: {
          questions: Math.max(5, Math.floor(component.estimatedDuration * 2)),
          competencyLevel: component.competencyLevel,
          mandatoryForCertification: component.mandatoryForCertification
        },
        duration: Math.floor(component.estimatedDuration * 60 * 0.3) // 30% of total time
      }
    ];
  };

  const generateMethodologyAssessments = (component: any): Assessment[] => {
    return [{
      id: `methodology-assessment-${component.id}`,
      title: `${component.title} Competency Assessment`,
      type: 'quiz',
      questions: component.modules.map((module: string, index: number) => ({
        id: `q${index + 1}`,
        text: `Regarding ${module.toLowerCase()}, what is the most critical factor for success?`,
        type: 'multiple-choice' as const,
        options: [
          'Following established procedures exactly',
          'Understanding underlying principles and adapting to situations',
          'Memorizing all possible scenarios',
          'Relying on supervisor guidance for all decisions'
        ],
        correctAnswer: 1,
        explanation: `Success in ${module.toLowerCase()} requires understanding principles and adapting to unique situations while maintaining compliance.`,
        points: 20
      })),
      passingScore: component.mandatoryForCertification ? 85 : 75,
      timeLimit: Math.max(20, component.estimatedDuration * 10) // 10 minutes per hour of content
    }];
  };

  const generateAIEnhancedContent = async (upload: ContentUpload) => {
    // Simulate AI enhancement process
    const enhancements = [
      'Creating AI-generated videos with animations',
      'Generating professional voice narration',
      'Building interactive infographics',
      'Designing scenario-based exercises',
      'Creating adaptive quizzes',
      'Adding gamification elements'
    ];

    for (let i = 0; i < enhancements.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setEnhancementProgress(prev => ({
        ...prev,
        [upload.id]: {
          step: i + 1,
          total: enhancements.length,
          description: enhancements[i]
        }
      }));
    }
  };

  const toggleEditMode = (moduleId: string) => {
    setEditingModuleId(editingModuleId === moduleId ? null : moduleId);
  };

  const exportCurriculum = () => {
    const curriculumData = {
      modules,
      methodology: methodology?.name,
      totalDuration: modules.reduce((sum, m) => sum + m.duration, 0),
      totalAssessments: modules.reduce((sum, m) => sum + m.assessments.length, 0),
      generatedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(curriculumData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'training-curriculum.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ✅ Générer l'examen final global
  const generateFinalExamGlobal = async () => {
    if (modules.length === 0) {
      console.warn('⚠️ No modules available. Generate modules first.');
      return;
    }

    setIsGeneratingExam(true);
    
    try {
      console.log('📝 Generating FINAL EXAM for entire training...');
      
      const formationTitle = methodology?.name || 'Formation Professionnelle';
      const modulesData = modules.map(m => ({
        title: m.title,
        description: m.description,
        learningObjectives: m.learningObjectives
      }));

      const examData = await AIService.generateFinalExam(modulesData, formationTitle);
      
      setFinalExam(examData);
      
      console.log(`✅ Examen final généré : ${examData.questionCount} questions (${examData.totalPoints} points)`);
      console.log(`⏱️ Temps: ${examData.duration} minutes | Score passage: ${examData.passingScore}%`);
      console.log('✅ Final exam data:', examData);

    } catch (error) {
      console.error('❌ Error generating final exam:', error);
      alert('❌ Erreur lors de la génération de l\'examen final.');
    } finally {
      setIsGeneratingExam(false);
    }
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
      const questions = await AIService.generateQuiz(moduleContent, 12);
      
      console.log(`✅ Generated ${questions.length} QCM questions for: ${moduleTitle}`);
      
      // Convertir en format Assessment
      const assessmentQuestions: Question[] = questions.map((q: any, index: number) => ({
        id: `q${index + 1}`,
        text: q.text,
        type: 'multiple-choice',
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200 mb-4">
              <Brain className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium text-gray-700">Step 2: AI-Enhanced Curriculum Design</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Enhanced Training Curriculum</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              AI has transformed your content into engaging, multimedia training modules with interactive elements and assessments
              {methodology && ` following the ${methodology.name} methodology`}.
            </p>
          </div>

          {/* Methodology Banner */}
          {methodology && (
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl p-6 mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-2">🎯 360° Methodology: {methodology.name}</h3>
                  <p className="text-blue-100 mb-3">{methodology.description}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-center space-x-4">
              <CheckSquare className="h-8 w-8 text-green-500" />
              <div className="text-center">
                <h3 className="text-xl font-semibold text-green-900">Curriculum Enhanced Successfully!</h3>
                <p className="text-green-700">
                  Your content has been transformed with AI-generated videos, audio, infographics, and interactive elements
                  {methodology && ` following industry best practices and compliance requirements`}.
                </p>
              </div>
            </div>
          </div>

          <div className="w-full">
            {/* Module List */}
            <div className="w-full">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-semibold text-gray-900">
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
                    <div key={module.id} className={`border-2 rounded-xl p-6 transition-all ${isEditing ? 'border-indigo-500 shadow-xl bg-indigo-50' : 'border-gray-200 hover:border-purple-300 hover:shadow-lg'}`}>
                      <div className="flex items-start justify-between mb-4">
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

                      {/* ✅ SECTIONS CONTENT STRUCTURE */}
                      <div className="mb-4">
                        <h5 className="font-semibold text-gray-900 mb-3 flex items-center">
                          <FileText className="h-5 w-5 mr-2 text-indigo-600" />
                          Module Content ({(module as any).sections?.length || module.content.length} Sections)
                        </h5>
                        <div className="space-y-3 bg-gray-50 rounded-lg p-4 border border-gray-200">
                          {/* Afficher les sections réelles si disponibles */}
                          {((module as any).sections && (module as any).sections.length > 0) ? (
                            (module as any).sections.map((section: any, idx: number) => (
                              <details key={section.id || idx} className="group bg-white rounded-lg border border-gray-300 overflow-hidden hover:shadow-md transition-shadow">
                                <summary className="cursor-pointer px-4 py-3 font-medium text-gray-900 hover:bg-indigo-50 transition-colors flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <FileText className="h-4 w-4 text-indigo-600" />
                                    <span>{section.title}</span>
                                    <span className="text-xs text-gray-500">({section.estimatedDuration || section.duration || 0} min)</span>
                                  </div>
                                  <ChevronRight className="h-4 w-4 text-gray-400 group-open:rotate-90 transition-transform" />
                                </summary>
                                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                                  {/* Afficher uniquement le document */}
                                  {section.content?.file && (
                                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                      <div className="flex items-center space-x-2">
                                        <FileText className="h-5 w-5 text-blue-600" />
                                        <span className="text-sm font-medium text-blue-900">{section.content.file.name}</span>
                                        {section.estimatedDuration && (
                                          <span className="text-xs text-gray-500 ml-auto">({section.estimatedDuration} min)</span>
                                        )}
                                      </div>
                                      {section.content.file.url && (
                                        <a
                                          href={section.content.file.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs text-blue-600 hover:text-blue-800 underline mt-2 inline-block"
                                        >
                                          Ouvrir le document
                                        </a>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </details>
                            ))
                          ) : (
                            // Fallback sur content si pas de sections
                            module.content.map((section, idx) => (
                            <details key={idx} className="group bg-white rounded-lg border border-gray-300 overflow-hidden hover:shadow-md transition-shadow">
                              <summary className="cursor-pointer px-4 py-3 font-medium text-gray-900 hover:bg-indigo-50 transition-colors flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <BookOpen className="h-4 w-4 text-indigo-600" />
                                  <span>{section.title}</span>
                                  <span className="text-xs text-gray-500">({section.duration} min)</span>
                            </div>
                                <ChevronRight className="h-4 w-4 text-gray-400 group-open:rotate-90 transition-transform" />
                              </summary>
                              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                                <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                                  {typeof section.content === 'string' 
                                    ? section.content.substring(0, 300) + (section.content.length > 300 ? '...' : '')
                                    : JSON.stringify(section.content, null, 2).substring(0, 200)
                                  }
                                </div>
                                {typeof section.content === 'string' && section.content.length > 300 && (
                                  <div className="mt-2 text-xs text-indigo-600 font-medium">
                                    + {section.content.length - 300} more characters
                                  </div>
                                )}
                              </div>
                            </details>
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
                            className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                              isEditing 
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
                                <Edit className="h-4 w-4 inline mr-1" />
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
                          {module.learningObjectives.map((objective, objIndex) => (
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
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-xl border-2 border-green-500 p-8 mt-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-green-900 flex items-center">
                    <CheckSquare className="h-8 w-8 mr-3 text-green-600" />
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
                {finalExam.questions.slice(0, 3).map((q: any, idx: number) => (
                  <div key={idx} className="mb-4 pb-4 border-b border-gray-200 last:border-0">
                    <p className="font-medium text-gray-900 mb-2">
                      <span className="text-green-600 font-bold">Q{idx + 1}.</span> {q.text}
                    </p>
                    <div className="text-sm text-gray-600 space-y-1">
                      {q.options.map((opt: string, i: number) => (
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
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mt-8">
            <h3 className="text-2xl font-semibold text-gray-900 mb-6">
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

      {/* PowerPoint Viewer Modal */}
      {showPPTViewer && pptBlob && (
        <PowerPointViewer
          pptBlob={pptBlob}
          onClose={() => {
            setShowPPTViewer(false);
            setPptBlob(null);
          }}
        />
      )}
    </div>
  );
}