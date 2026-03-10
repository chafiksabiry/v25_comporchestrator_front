import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Download, X, Loader2, FileDown } from 'lucide-react';

interface PowerPointViewerProps {
  pptBlob: Blob | null;
  onClose: () => void;
}

export default function PowerPointViewer({ pptBlob, onClose }: PowerPointViewerProps) {
  const [slideImages, setSlideImages] = useState<string[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (pptBlob) {
      loadPowerPoint(pptBlob);
    }
  }, [pptBlob]);

  const loadPowerPoint = async (blob: Blob) => {
    setIsLoading(true);
    setError(null);
    setSlideImages([]);
    setCurrentSlideIndex(0);

    try {
      // Dans une application réelle, vous enverriez le blob à un service backend
      // qui convertit PPTX en images (par exemple, en utilisant Apache POI sur Java, 
      // ou une bibliothèque/service dédié).
      // Pour cette simulation, nous générons des images mock avec SVG.
      console.log("🎨 Generating PowerPoint preview slides...");
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate processing time

      // Générer des slides SVG embarquées (pas de dépendances externes)
      const mockImages = generateMockSlides();
      setSlideImages(mockImages);
      console.log("✅ Mock PowerPoint slides generated:", mockImages.length, "slides");

    } catch (err) {
      console.error("❌ Error loading PowerPoint:", err);
      setError("Failed to load PowerPoint. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockSlides = (): string[] => {
    const slides = [
      // Slide 1: Title Slide
      generateSVGSlide('Présentation du Curriculum', 'Formation Professionnelle Générée par IA', '#6366F1', '#FFFFFF'),
      // Slide 2: Overview
      generateSVGSlide('Vue d\'ensemble', 'Curriculum complet avec 6 modules de formation', '#8B5CF6', '#FFFFFF'),
      // Slide 3: Module 1
      generateSVGSlide('Module 1', 'Introduction aux Fondamentaux', '#EC4899', '#FFFFFF'),
      // Slide 4: Module 1 Objectives
      generateSVGSlide('Module 1 - Objectifs', '• Comprendre les bases\n• Maîtriser les concepts clés\n• Appliquer les principes', '#F59E0B', '#000000'),
      // Slide 5: Module 2
      generateSVGSlide('Module 2', 'Concepts Avancés et Pratiques', '#10B981', '#FFFFFF'),
      // Slide 6: Module 2 Content
      generateSVGSlide('Module 2 - Contenu', 'Exploration approfondie des sujets avancés', '#06B6D4', '#FFFFFF'),
      // Slide 7: Module 3
      generateSVGSlide('Module 3', 'Techniques Avancées', '#3B82F6', '#FFFFFF'),
      // Slide 8: Module 4
      generateSVGSlide('Module 4', 'Applications Pratiques', '#A855F7', '#FFFFFF'),
      // Slide 9: Module 5
      generateSVGSlide('Module 5', 'Maîtrise et Intégration', '#EF4444', '#FFFFFF'),
      // Slide 10: Module 6
      generateSVGSlide('Module 6', 'Évaluation et Conclusion', '#14B8A6', '#FFFFFF'),
      // Slide 11: Conclusion
      generateSVGSlide('Merci !', 'Fin de la présentation', '#6366F1', '#FFFFFF'),
    ];
    return slides;
  };

  const generateSVGSlide = (title: string, content: string, bgColor: string, textColor: string): string => {
    const svg = `
      <svg width="1200" height="675" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="675" fill="${bgColor}"/>
        <text x="600" y="250" font-family="Arial, sans-serif" font-size="64" font-weight="bold" fill="${textColor}" text-anchor="middle">
          ${title}
        </text>
        <text x="600" y="350" font-family="Arial, sans-serif" font-size="32" fill="${textColor}" text-anchor="middle" opacity="0.9">
          ${content.split('\n')[0]}
        </text>
        ${content.split('\n').slice(1).map((line, i) => 
          `<text x="600" y="${400 + i * 40}" font-family="Arial, sans-serif" font-size="24" fill="${textColor}" text-anchor="middle" opacity="0.8">${line}</text>`
        ).join('')}
        <rect x="50" y="600" width="1100" height="4" fill="${textColor}" opacity="0.3"/>
        <text x="1150" y="650" font-family="Arial, sans-serif" font-size="18" fill="${textColor}" text-anchor="end" opacity="0.6">
          Powered by AI Training Platform
        </text>
      </svg>
    `;
    
    // Convert SVG to data URL
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
  };

  const handleDownload = () => {
    if (pptBlob) {
      const url = URL.createObjectURL(pptBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Generated_Curriculum_${Date.now()}.pptx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const goToPreviousSlide = () => {
    setCurrentSlideIndex(prev => Math.max(0, prev - 1));
  };

  const goToNextSlide = () => {
    setCurrentSlideIndex(prev => Math.min(slideImages.length - 1, prev + 1));
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
          <span className="ml-3 text-lg text-gray-700">Chargement du PowerPoint...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={onClose} 
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  if (slideImages.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 text-center">
          <p className="text-gray-600 mb-4">Aucune diapositive PowerPoint à afficher.</p>
          <button 
            onClick={onClose} 
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-600">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <FileDown className="mr-2" />
            Présentation PowerPoint - Curriculum Généré
          </h2>
          <button 
            onClick={onClose} 
            className="text-white hover:text-gray-200 transition-colors"
            title="Fermer"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Slide Display */}
        <div className="flex-1 flex items-center justify-center p-8 bg-gray-100 overflow-hidden">
          <img
            src={slideImages[currentSlideIndex]}
            alt={`Slide ${currentSlideIndex + 1}`}
            className="max-w-full max-h-full object-contain shadow-2xl rounded"
          />
        </div>

        {/* Controls */}
        <div className="flex justify-between items-center p-4 border-t border-gray-200 bg-white">
          <button
            onClick={goToPreviousSlide}
            disabled={currentSlideIndex === 0}
            className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
            title="Diapositive précédente"
          >
            <ArrowLeft className="h-5 w-5 mr-1" />
            Précédent
          </button>
          
          <span className="text-lg font-medium text-gray-700">
            Diapositive {currentSlideIndex + 1} / {slideImages.length}
          </span>
          
          <button
            onClick={goToNextSlide}
            disabled={currentSlideIndex === slideImages.length - 1}
            className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
            title="Diapositive suivante"
          >
            Suivant
            <ArrowRight className="h-5 w-5 ml-1" />
          </button>
          
          <button
            onClick={handleDownload}
            className="ml-4 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center transition-colors"
            title="Télécharger le PowerPoint"
          >
            <Download className="h-5 w-5 mr-2" />
            Télécharger PPT
          </button>
        </div>
      </div>
    </div>
  );
}

