import React, { useState } from 'react';
import { Sparkles, PenTool, ArrowRight, Book, Zap, Upload, CheckCircle2 } from 'lucide-react';

type CreationMode = 'ai' | 'manual' | null;

interface TrainingCreationSelectorProps {
  onSelectMode: (mode: 'ai' | 'manual') => void;
  companyId: string;
}

export const TrainingCreationSelector: React.FC<TrainingCreationSelectorProps> = ({
  onSelectMode,
  companyId,
}) => {
  const [selectedMode, setSelectedMode] = useState<CreationMode>(null);
  const [hoveredMode, setHoveredMode] = useState<CreationMode>(null);

  const handleSelectMode = (mode: 'ai' | 'manual') => {
    setSelectedMode(mode);
    // Petit délai pour l'animation
    setTimeout(() => {
      onSelectMode(mode);
    }, 300);
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-6">
      <div className="max-w-6xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Créer une Formation
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choisissez votre méthode de création : laissez l'IA vous assister ou créez manuellement
          </p>
        </div>

        {/* Selection Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* AI Creation Card */}
          <div
            onClick={() => handleSelectMode('ai')}
            onMouseEnter={() => setHoveredMode('ai')}
            onMouseLeave={() => setHoveredMode(null)}
            className={`relative bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer transition-all duration-300 ${
              selectedMode === 'ai'
                ? 'ring-4 ring-blue-500 scale-105'
                : hoveredMode === 'ai'
                ? 'shadow-2xl scale-105'
                : 'hover:shadow-xl'
            }`}
          >
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 opacity-5" />
            
            {/* Selected Indicator */}
            {selectedMode === 'ai' && (
              <div className="absolute top-4 right-4 z-10">
                <CheckCircle2 className="w-8 h-8 text-blue-600 animate-pulse" />
              </div>
            )}

            {/* Content */}
            <div className="relative p-8">
              {/* Icon */}
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6">
                <Sparkles className="w-8 h-8 text-white" />
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Création avec IA
              </h2>
              
              {/* Description */}
              <p className="text-gray-600 mb-6">
                Laissez l'intelligence artificielle générer automatiquement le contenu de votre formation
              </p>

              {/* Features */}
              <ul className="space-y-3 mb-6">
                <li className="flex items-start">
                  <Zap className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Génération automatique du contenu</span>
                </li>
                <li className="flex items-start">
                  <Book className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Modules et sections structurés</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Quizzes générés automatiquement</span>
                </li>
                <li className="flex items-start">
                  <Upload className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Upload de documents pour analyse</span>
                </li>
              </ul>

              {/* Badge */}
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                <Sparkles className="w-4 h-4 mr-1" />
                Recommandé
              </div>

              {/* Button */}
              <button
                className={`w-full mt-6 px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center ${
                  selectedMode === 'ai'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                <span>Créer avec l'IA</span>
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>

          {/* Manual Creation Card */}
          <div
            onClick={() => handleSelectMode('manual')}
            onMouseEnter={() => setHoveredMode('manual')}
            onMouseLeave={() => setHoveredMode(null)}
            className={`relative bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer transition-all duration-300 ${
              selectedMode === 'manual'
                ? 'ring-4 ring-green-500 scale-105'
                : hoveredMode === 'manual'
                ? 'shadow-2xl scale-105'
                : 'hover:shadow-xl'
            }`}
          >
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-teal-600 opacity-5" />
            
            {/* Selected Indicator */}
            {selectedMode === 'manual' && (
              <div className="absolute top-4 right-4 z-10">
                <CheckCircle2 className="w-8 h-8 text-green-600 animate-pulse" />
              </div>
            )}

            {/* Content */}
            <div className="relative p-8">
              {/* Icon */}
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl flex items-center justify-center mb-6">
                <PenTool className="w-8 h-8 text-white" />
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Création Manuelle
              </h2>
              
              {/* Description */}
              <p className="text-gray-600 mb-6">
                Créez votre formation de A à Z avec un contrôle total sur le contenu
              </p>

              {/* Features */}
              <ul className="space-y-3 mb-6">
                <li className="flex items-start">
                  <PenTool className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Contrôle total du contenu</span>
                </li>
                <li className="flex items-start">
                  <Upload className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Upload de vidéos et documents</span>
                </li>
                <li className="flex items-start">
                  <Book className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Intégration YouTube</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Quizzes personnalisés</span>
                </li>
              </ul>

              {/* Badge */}
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
                <PenTool className="w-4 h-4 mr-1" />
                Personnalisable
              </div>

              {/* Button */}
              <button
                className={`w-full mt-6 px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center ${
                  selectedMode === 'manual'
                    ? 'bg-green-600 text-white'
                    : 'bg-green-50 text-green-700 hover:bg-green-100'
                }`}
              >
                <span>Créer Manuellement</span>
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>
        </div>

        {/* Comparison Info */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
            Quelle méthode choisir ?
          </h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h4 className="font-medium text-blue-700 flex items-center">
                <Sparkles className="w-5 h-5 mr-2" />
                Création IA - Idéale pour :
              </h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-7">
                <li>• Créer rapidement du contenu</li>
                <li>• Transformer des documents existants</li>
                <li>• Générer des quizzes automatiquement</li>
                <li>• Obtenir une structure optimisée</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-green-700 flex items-center">
                <PenTool className="w-5 h-5 mr-2" />
                Création Manuelle - Idéale pour :
              </h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-7">
                <li>• Contenu très spécifique</li>
                <li>• Contrôle total sur chaque détail</li>
                <li>• Intégrer vos propres médias</li>
                <li>• Formation hautement personnalisée</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            💡 Vous pourrez toujours modifier et personnaliser votre formation après sa création
          </p>
        </div>
      </div>
    </div>
  );
};

