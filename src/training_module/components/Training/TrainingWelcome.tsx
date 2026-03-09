import React from 'react';
import { Sparkles, Upload, Wand2, Zap, Eye, ArrowRight } from 'lucide-react';

interface TrainingWelcomeProps {
  onStartJourney: () => void;
  onExplore?: () => void;
}

export const TrainingWelcome: React.FC<TrainingWelcomeProps> = ({
  onStartJourney,
  onExplore,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-6">
      <div className="max-w-5xl w-full">
        {/* Logo/Icon */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <Sparkles className="w-20 h-20 text-blue-600 animate-pulse" />
            <div className="absolute -top-2 -right-2">
              <Sparkles className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-center text-gray-900 mb-6">
          Welcome to Your Training Platform
        </h1>

        {/* Description */}
        <p className="text-xl md:text-2xl text-center text-gray-600 max-w-3xl mx-auto mb-12 leading-relaxed">
          Transform your boring documents into engaging, interactive training experiences. 
          Our AI will help you create professional training programs in minutes, not weeks.
        </p>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Card 1 - Upload & Analyze */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 text-center transform hover:scale-105 transition-all duration-300 shadow-md hover:shadow-xl">
            <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Upload & Analyze
            </h3>
            <p className="text-sm text-gray-600">
              AI analyzes your documents
            </p>
          </div>

          {/* Card 2 - AI Enhancement */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 text-center transform hover:scale-105 transition-all duration-300 shadow-md hover:shadow-xl">
            <div className="w-16 h-16 bg-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Wand2 className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              AI Enhancement
            </h3>
            <p className="text-sm text-gray-600">
              Creates videos, audio & graphics
            </p>
          </div>

          {/* Card 3 - Interactive Elements */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 text-center transform hover:scale-105 transition-all duration-300 shadow-md hover:shadow-xl">
            <div className="w-16 h-16 bg-green-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Interactive Elements
            </h3>
            <p className="text-sm text-gray-600">
              Quizzes, scenarios & simulations
            </p>
          </div>

          {/* Card 4 - Rehearsal & Launch */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 text-center transform hover:scale-105 transition-all duration-300 shadow-md hover:shadow-xl">
            <div className="w-16 h-16 bg-orange-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Eye className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Rehearsal & Launch
            </h3>
            <p className="text-sm text-gray-600">
              Test before deploying to team
            </p>
          </div>
        </div>

        {/* CTA Button */}
        <div className="flex flex-col items-center space-y-4">
          <button
            onClick={onStartJourney}
            className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg font-semibold rounded-2xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 flex items-center space-x-3"
          >
            <Sparkles className="w-6 h-6" />
            <span>Start Building Your Training Journey</span>
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Skip Link */}
          {onExplore && (
            <button
              onClick={onExplore}
              className="text-gray-500 hover:text-gray-700 transition-colors text-sm underline"
            >
              Skip setup and explore the platform
            </button>
          )}
        </div>

        {/* Stats or Trust Indicators */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold text-blue-600 mb-2">10x</div>
            <div className="text-gray-600">Faster Creation</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-purple-600 mb-2">95%</div>
            <div className="text-gray-600">User Satisfaction</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-green-600 mb-2">1000+</div>
            <div className="text-gray-600">Trainings Created</div>
          </div>
        </div>
      </div>
    </div>
  );
};

