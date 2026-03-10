import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, BookOpen, Clock, Play, Pause, CheckCircle, Maximize2 } from 'lucide-react';
import { TrainingModule } from '../../types/core';

interface SlideViewerProps {
  modules: TrainingModule[];
  onComplete?: () => void;
}

export default function SlideViewer({ modules, onComplete }: SlideViewerProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [completedSlides, setCompletedSlides] = useState<Set<number>>(new Set());

  // Generate slides from modules
  const generateSlides = () => {
    const slides: any[] = [];
    
    // Title slide
    slides.push({
      type: 'title',
      title: 'Training Course',
      subtitle: `${modules.length} Modules • ${modules.reduce((sum, m) => sum + m.duration, 0)} minutes`,
      bgColor: 'from-indigo-600 via-purple-600 to-pink-600'
    });

    modules.forEach((module, moduleIndex) => {
      const colors = [
        'from-blue-500 to-cyan-500',
        'from-purple-500 to-pink-500',
        'from-green-500 to-emerald-500',
        'from-orange-500 to-red-500',
        'from-indigo-500 to-purple-500',
        'from-pink-500 to-rose-500'
      ];
      const bgColor = colors[moduleIndex % colors.length];

      // Module title slide
      slides.push({
        type: 'module-title',
        title: `Module ${moduleIndex + 1}`,
        subtitle: module.title,
        description: module.description,
        duration: module.duration,
        difficulty: module.difficulty,
        bgColor
      });

      // Content slides (limit to first 3 sections per module to avoid too many slides)
      module.content.slice(0, 3).forEach((content) => {
        if (typeof content.content === 'string') {
          const contentText = content.content;
          
          // Only create one slide per content item, no chunking
          slides.push({
            type: 'content',
            title: content.title,
            content: contentText.substring(0, 1200), // Show first 1200 chars max
            bgColor,
            duration: content.duration
          });
        }
      });

      // Learning objectives slide
      if (module.learningObjectives && module.learningObjectives.length > 0) {
        slides.push({
          type: 'objectives',
          title: 'Learning Objectives',
          items: module.learningObjectives,
          bgColor
        });
      }
    });

    // Final slide
    slides.push({
      type: 'final',
      title: 'Congratulations! 🎉',
      subtitle: 'Course Completed',
      bgColor: 'from-green-500 via-emerald-500 to-teal-500'
    });

    return slides;
  };

  const slides = generateSlides();
  const currentSlide = slides[currentSlideIndex];
  const progress = ((currentSlideIndex + 1) / slides.length) * 100;

  const goToNextSlide = () => {
    console.log('🔄 Next slide clicked', currentSlideIndex);
    if (currentSlideIndex < slides.length - 1) {
      setCompletedSlides(prev => new Set([...prev, currentSlideIndex]));
      setCurrentSlideIndex(prev => prev + 1);
    } else if (onComplete) {
      console.log('✅ Course completed!');
      onComplete();
    }
  };

  const goToPreviousSlide = () => {
    console.log('🔄 Previous slide clicked', currentSlideIndex);
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === ' ') {
      goToNextSlide();
    } else if (e.key === 'ArrowLeft') {
      goToPreviousSlide();
    }
  };

  const renderSlideContent = () => {
    switch (currentSlide.type) {
      case 'title':
        return (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
            <div className="mb-8 transform hover:scale-110 transition-transform duration-500">
              <BookOpen className="h-32 w-32 text-white animate-bounce" style={{ animationDuration: '2s' }} />
            </div>
            <h1 className="text-7xl font-black text-white mb-6 animate-slide-in-right">
              {currentSlide.title}
            </h1>
            <p className="text-3xl text-white/90 animate-slide-in-left">
              {currentSlide.subtitle}
            </p>
          </div>
        );

      case 'module-title':
        return (
          <div className="flex flex-col justify-center h-full p-16 animate-fade-in">
            <div className="space-y-6">
              <div className="inline-block px-6 py-3 bg-white/20 backdrop-blur-sm rounded-full text-white text-xl font-bold animate-bounce-in">
                {currentSlide.title}
              </div>
              <h1 className="text-6xl font-black text-white mb-4 animate-slide-in-right">
                {currentSlide.subtitle}
              </h1>
              <p className="text-2xl text-white/90 leading-relaxed animate-slide-in-left" style={{ animationDelay: '0.2s' }}>
                {currentSlide.description}
              </p>
              <div className="flex items-center space-x-6 text-white/80 text-lg pt-4 animate-slide-in-left" style={{ animationDelay: '0.4s' }}>
                <div className="flex items-center space-x-2">
                  <Clock className="h-6 w-6" />
                  <span>{currentSlide.duration} minutes</span>
                </div>
                <div className="px-4 py-2 bg-white/20 rounded-full backdrop-blur-sm">
                  {currentSlide.difficulty}
                </div>
              </div>
            </div>
          </div>
        );

      case 'content':
        const paragraphs = currentSlide.content.split('\n\n');
        return (
          <div className="flex flex-col justify-center h-full p-16 animate-fade-in">
            <h2 className="text-5xl font-bold text-white mb-8 animate-slide-in-right">
              {currentSlide.title}
            </h2>
            <div className="space-y-6 text-white/95 text-2xl leading-relaxed">
              {paragraphs.map((para: string, idx: number) => {
                const lines = para.split('\n');
                
                return (
                  <div key={idx} className="animate-slide-in-left" style={{ animationDelay: `${idx * 0.1}s` }}>
                    {lines.map((line: string, lineIdx: number) => {
                      const trimmed = line.trim();
                      if (!trimmed) return null;

                      // Bullet points
                      if (trimmed.startsWith('•')) {
                        return (
                          <div key={lineIdx} className="flex items-start space-x-4 mb-3 pl-8 group">
                            <span className="text-yellow-300 text-3xl mt-1 group-hover:scale-125 transition-transform">•</span>
                            <span className="flex-1">{trimmed.substring(1).trim()}</span>
                          </div>
                        );
                      }

                      // Numbered lists
                      const numberedMatch = trimmed.match(/^(\d+)\.\s*(.+)/);
                      if (numberedMatch) {
                        return (
                          <div key={lineIdx} className="flex items-start space-x-4 mb-3 pl-8 group">
                            <span className="flex-shrink-0 w-10 h-10 bg-white/20 backdrop-blur-sm text-white font-bold rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                              {numberedMatch[1]}
                            </span>
                            <span className="flex-1 pt-1">{numberedMatch[2]}</span>
                          </div>
                        );
                      }

                      // Headers (ALL CAPS)
                      if (trimmed === trimmed.toUpperCase() && trimmed.length > 3) {
                        return (
                          <h3 key={lineIdx} className="text-3xl font-bold text-yellow-300 mt-6 mb-4 border-l-4 border-yellow-300 pl-4">
                            {trimmed}
                          </h3>
                        );
                      }

                      // Regular text
                      return <p key={lineIdx} className="mb-2">{trimmed}</p>;
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'objectives':
        return (
          <div className="flex flex-col justify-center h-full p-16 animate-fade-in">
            <h2 className="text-5xl font-bold text-white mb-12 animate-slide-in-right flex items-center">
              <span className="mr-4">🎯</span>
              {currentSlide.title}
            </h2>
            <div className="space-y-6">
              {currentSlide.items.map((item: string, idx: number) => (
                <div
                  key={idx}
                  className="flex items-start space-x-6 text-white text-2xl p-6 bg-white/10 backdrop-blur-sm rounded-2xl hover:bg-white/20 transition-all duration-300 transform hover:scale-105 animate-slide-in-left"
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  <CheckCircle className="h-8 w-8 text-green-300 flex-shrink-0 mt-1" />
                  <span className="flex-1">{item}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'final':
        return (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
            <div className="text-8xl mb-8 animate-bounce" style={{ animationDuration: '1s' }}>
              🎉
            </div>
            <h1 className="text-7xl font-black text-white mb-6 animate-bounce-in">
              {currentSlide.title}
            </h1>
            <p className="text-3xl text-white/90 animate-slide-in-up">
              {currentSlide.subtitle}
            </p>
            <div className="mt-12 text-white/80 text-xl">
              <p>{completedSlides.size} / {slides.length} slides viewed</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div 
      className="relative w-full h-screen bg-gray-900 overflow-hidden"
      onKeyDown={handleKeyPress}
      tabIndex={0}
    >
      {/* Slide Container */}
      <div className={`absolute inset-0 bg-gradient-to-br ${currentSlide.bgColor} transition-all duration-700`}>
        {/* Animated Background Elements */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }}></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }}></div>
        </div>

        {/* Slide Content */}
        <div className="relative z-10 h-full pointer-events-none">
          {renderSlideContent()}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-black/20">
        <div
          className="h-full bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 transition-all duration-500 relative overflow-hidden"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-shimmer"></div>
        </div>
      </div>

      {/* Controls Overlay */}
      <div className="absolute bottom-8 left-0 right-0 px-8 z-50 pointer-events-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto">
          {/* Navigation Buttons */}
          <button
            onClick={goToPreviousSlide}
            disabled={currentSlideIndex === 0}
            className="group flex items-center space-x-2 px-6 py-4 bg-white/20 hover:bg-white/30 backdrop-blur-lg text-white rounded-xl font-semibold transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed transform hover:scale-110 shadow-2xl cursor-pointer"
          >
            <ChevronLeft className="h-6 w-6 group-hover:animate-pulse" />
            <span>Previous</span>
          </button>

          {/* Slide Counter */}
          <div className="flex items-center space-x-6 bg-white/20 backdrop-blur-lg px-8 py-4 rounded-xl shadow-2xl">
            <span className="text-white font-bold text-lg">
              {currentSlideIndex + 1} / {slides.length}
            </span>
            <div className="h-8 w-px bg-white/30"></div>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="text-white hover:scale-110 transition-transform cursor-pointer"
            >
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            </button>
          </div>

          {/* Next Button */}
          <button
            onClick={goToNextSlide}
            className="group relative flex items-center space-x-2 px-6 py-4 bg-white hover:bg-white/90 text-gray-900 rounded-xl font-bold transition-all duration-300 transform hover:scale-110 shadow-2xl overflow-hidden cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-200 to-transparent opacity-0 group-hover:opacity-50 group-hover:animate-shimmer"></div>
            <span className="relative z-10">
              {currentSlideIndex === slides.length - 1 ? 'Finish' : 'Next'}
            </span>
            <ChevronRight className="h-6 w-6 relative z-10 group-hover:animate-pulse" />
          </button>
        </div>
      </div>

      {/* Slide Indicator Dots */}
      <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 flex items-center space-x-2 z-50 pointer-events-auto">
        {slides.slice(0, 20).map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentSlideIndex(idx)}
            className={`transition-all duration-300 rounded-full cursor-pointer ${
              idx === currentSlideIndex
                ? 'w-8 h-3 bg-white'
                : completedSlides.has(idx)
                ? 'w-3 h-3 bg-green-400'
                : 'w-3 h-3 bg-white/30 hover:bg-white/50'
            }`}
          />
        ))}
        {slides.length > 20 && (
          <span className="text-white/50 text-xs ml-2">+{slides.length - 20} more</span>
        )}
      </div>
    </div>
  );
}

