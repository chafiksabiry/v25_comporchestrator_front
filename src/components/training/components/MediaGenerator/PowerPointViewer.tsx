import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Download, Maximize2, Minimize2, FileDown, Loader } from 'lucide-react';
import { AIService } from '../../infrastructure/services/AIService';

interface PowerPointViewerProps {
  curriculum: {
    title: string;
    description: string;
    totalDuration: number;
    methodology: string;
    modules: any[];
  };
  onDownload?: () => void;
}

interface Slide {
  id: number;
  title: string;
  content: string[];
  type: 'title' | 'overview' | 'module' | 'objectives' | 'content' | 'conclusion';
  moduleIndex?: number;
}

/**
 * PowerPoint Viewer - Affiche les slides générées visuellement
 * Alternative à Canvas Video Generator
 */
export default function PowerPointViewer({ curriculum, onDownload }: PowerPointViewerProps) {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(true);

  useEffect(() => {
    generateSlides();
  }, [curriculum]);

  const generateSlides = () => {
    setIsGenerating(true);
    
    const generatedSlides: Slide[] = [];
    let slideId = 0;

    // 1. SLIDE DE TITRE
    generatedSlides.push({
      id: slideId++,
      title: curriculum.title,
      content: [
        curriculum.description,
        '',
        `Méthodologie: ${curriculum.methodology}`,
        `Durée totale: ${Math.floor(curriculum.totalDuration / 60)}h ${curriculum.totalDuration % 60}min`
      ],
      type: 'title'
    });

    // 2. SLIDE OVERVIEW
    generatedSlides.push({
      id: slideId++,
      title: 'Vue d\'Ensemble de la Formation',
      content: [
        `📚 ${curriculum.modules.length} Modules`,
        `⏱️ ${curriculum.totalDuration} minutes`,
        `🎯 Formation complète et structurée`,
        '',
        '📋 Modules:',
        ...curriculum.modules.map((m, i) => `  ${i + 1}. ${m.title}`)
      ],
      type: 'overview'
    });

    // 3. SLIDES PAR MODULE (3 slides par module)
    curriculum.modules.forEach((module, index) => {
      // Slide 1: Introduction du module
      generatedSlides.push({
        id: slideId++,
        title: `Module ${index + 1}`,
        content: [
          module.title,
          '',
          module.description,
          '',
          `⏱️ ${module.duration} minutes`,
          `📊 Niveau: ${module.difficulty}`,
        ],
        type: 'module',
        moduleIndex: index
      });

      // Slide 2: Objectifs d'apprentissage
      generatedSlides.push({
        id: slideId++,
        title: 'Objectifs d\'Apprentissage',
        content: [
          `Module ${index + 1}: ${module.title}`,
          '',
          ...module.learningObjectives.map((obj: string) => `✓ ${obj}`)
        ],
        type: 'objectives',
        moduleIndex: index
      });

      // Slide 3: Contenu du module
      generatedSlides.push({
        id: slideId++,
        title: 'Contenu du Module',
        content: [
          `Module ${index + 1}: ${module.title}`,
          '',
          `📹 ${module.contentItems} éléments de contenu`,
          `📝 ${module.assessments} évaluation(s)`,
          '',
          'Éléments enrichis:',
          ...module.enhancedElements.map((elem: string) => `  • ${elem}`)
        ],
        type: 'content',
        moduleIndex: index
      });
    });

    // 4. SLIDE DE CONCLUSION
    generatedSlides.push({
      id: slideId++,
      title: 'Conclusion & Prochaines Étapes',
      content: [
        `✅ ${curriculum.modules.length} modules complétés`,
        '📊 Évaluations continues',
        '🏆 Certification à la fin',
        '',
        'Support et accompagnement:',
        '📧 Email: support@formation.com',
        '💬 Chat en direct disponible',
        '🤖 AI Tutor 24/7'
      ],
      type: 'conclusion'
    });

    setSlides(generatedSlides);
    setIsGenerating(false);
  };

  const handleDownloadPPT = async () => {
    try {
      const blob = await AIService.exportToPowerPoint(curriculum as any);
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${curriculum.title.replace(/\s+/g, '_')}_${Date.now()}.pptx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      if (onDownload) onDownload();
    } catch (error) {
      console.error('Download failed:', error);
      alert('Erreur lors du téléchargement du PowerPoint');
    }
  };

  const getSlideBackground = (type: string) => {
    switch (type) {
      case 'title': return 'from-blue-900 to-purple-900';
      case 'overview': return 'from-blue-700 to-indigo-700';
      case 'module': return 'from-purple-700 to-pink-700';
      case 'objectives': return 'from-green-700 to-teal-700';
      case 'content': return 'from-orange-700 to-red-700';
      case 'conclusion': return 'from-gray-700 to-gray-900';
      default: return 'from-blue-700 to-purple-700';
    }
  };

  if (isGenerating) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
        <div className="text-center">
          <Loader className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
          <div className="text-lg font-semibold text-gray-900">Génération des slides...</div>
          <div className="text-sm text-gray-600">Création de {(curriculum.modules.length * 3) + 3} slides</div>
        </div>
      </div>
    );
  }

  const currentSlideData = slides[currentSlide];

  return (
    <div className={`space-y-4 ${isFullscreen ? 'fixed inset-0 z-50 bg-black p-8' : ''}`}>
      {/* Header Controls */}
      <div className={`flex items-center justify-between ${isFullscreen ? 'text-white' : ''}`}>
        <div>
          <h3 className="text-xl font-bold">
            📊 Aperçu PowerPoint
          </h3>
          <p className="text-sm opacity-75">
            {slides.length} slides générées
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            title={isFullscreen ? 'Quitter plein écran' : 'Plein écran'}
          >
            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </button>
          
          <button
            onClick={handleDownloadPPT}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all shadow-lg"
          >
            <FileDown className="h-5 w-5" />
            <span>Télécharger PPT</span>
          </button>
        </div>
      </div>

      {/* Slide Display */}
      <div className={`relative ${isFullscreen ? 'h-[calc(100vh-200px)]' : 'h-96'} bg-white rounded-2xl shadow-2xl overflow-hidden border-4 border-gray-200`}>
        {/* Slide Content */}
        <div className={`w-full h-full bg-gradient-to-br ${getSlideBackground(currentSlideData.type)} text-white p-12 flex flex-col justify-center`}>
          {/* Slide Title */}
          <div className={`${currentSlideData.type === 'title' ? 'text-center' : ''}`}>
            <h2 className={`font-bold mb-6 ${currentSlideData.type === 'title' ? 'text-5xl' : 'text-4xl'}`}>
              {currentSlideData.title}
            </h2>
            
            {/* Slide Content */}
            <div className={`space-y-3 ${currentSlideData.type === 'title' ? 'text-center text-xl' : 'text-2xl'}`}>
              {currentSlideData.content.map((line, index) => (
                <div key={index} className="leading-relaxed">
                  {line || '\u00A0'}
                </div>
              ))}
            </div>
          </div>

          {/* Slide Number */}
          <div className="absolute bottom-6 right-6 text-sm opacity-75">
            Slide {currentSlide + 1} / {slides.length}
          </div>

          {/* Module Badge */}
          {currentSlideData.moduleIndex !== undefined && (
            <div className="absolute top-6 right-6 px-4 py-2 bg-white bg-opacity-20 rounded-full text-sm font-semibold">
              Module {currentSlideData.moduleIndex + 1}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
          disabled={currentSlide === 0}
          className="flex items-center space-x-2 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-5 w-5" />
          <span>Précédent</span>
        </button>

        {/* Slide Thumbnails */}
        <div className="flex items-center space-x-2 overflow-x-auto max-w-2xl">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              onClick={() => setCurrentSlide(index)}
              className={`flex-shrink-0 w-16 h-12 rounded-lg border-2 transition-all ${
                index === currentSlide
                  ? 'border-blue-500 bg-blue-100'
                  : 'border-gray-300 bg-gray-100 hover:border-blue-300'
              }`}
              title={slide.title}
            >
              <div className={`w-full h-full rounded bg-gradient-to-br ${getSlideBackground(slide.type)} opacity-75`} />
            </button>
          ))}
        </div>

        <button
          onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
          disabled={currentSlide === slides.length - 1}
          className="flex items-center space-x-2 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>Suivant</span>
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Slide Counter */}
      <div className="text-center text-sm text-gray-600">
        Slide <span className="font-bold text-blue-600">{currentSlide + 1}</span> sur {slides.length}
      </div>
    </div>
  );
}

