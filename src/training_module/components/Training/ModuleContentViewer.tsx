import React, { useState } from 'react';
import { BookOpen, Clock, ChevronLeft, ChevronRight, CheckCircle, FileText, List, Download } from 'lucide-react';
import DocumentViewer from '../DocumentViewer/DocumentViewer';
import { TrainingModule, ModuleContent } from '../../types/core';
import { TrainingSection } from '../../types/manualTraining';

interface ModuleContentViewerProps {
  modules: TrainingModule[];
  onComplete?: () => void;
}

export default function ModuleContentViewer({ modules, onComplete }: ModuleContentViewerProps) {
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  const [showOutline, setShowOutline] = useState(false);

  const currentModule = modules[currentModuleIndex];
  // Utiliser les sections réelles si disponibles, sinon fallback sur content
  const moduleSections = (currentModule as any)?.sections || currentModule?.content || [];
  const currentSection = moduleSections[currentSectionIndex];
  const totalSections = moduleSections.length || 0;

  const progress = Math.round(
    ((completedSections.size) / modules.reduce((sum, m) => {
      const sections = (m as any)?.sections || m.content || [];
      return sum + sections.length;
    }, 0)) * 100
  );

  const goToNextSection = () => {
    // Mark current section as complete
    if (currentSection) {
      const sectionId = `${currentModule.id}-${currentSection.id}`;
      setCompletedSections(prev => new Set([...prev, sectionId]));
    }

    if (currentSectionIndex < totalSections - 1) {
      setCurrentSectionIndex(prev => prev + 1);
    } else if (currentModuleIndex < modules.length - 1) {
      // Move to next module
      setCurrentModuleIndex(prev => prev + 1);
      setCurrentSectionIndex(0);
    } else {
      // Completed all modules
      if (onComplete) onComplete();
    }
  };

  const goToPreviousSection = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(prev => prev - 1);
    } else if (currentModuleIndex > 0) {
      // Move to previous module
      const prevModule = modules[currentModuleIndex - 1];
      const prevModuleSections = (prevModule as any)?.sections || prevModule.content || [];
      setCurrentModuleIndex(prev => prev - 1);
      setCurrentSectionIndex(prevModuleSections.length - 1);
    }
  };

  const jumpToSection = (moduleIndex: number, sectionIndex: number) => {
    setCurrentModuleIndex(moduleIndex);
    setCurrentSectionIndex(sectionIndex);
    setShowOutline(false);
  };

  const isSectionCompleted = (moduleId: string, sectionId: string) => {
    return completedSections.has(`${moduleId}-${sectionId}`);
  };

  if (!currentModule || !currentSection) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No content available</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-500 hover:shadow-3xl">
      {/* Header with Progress */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white p-6 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDuration: '3s' }}></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s', animationDelay: '1s' }}></div>
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3 animate-fade-in">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <BookOpen className="h-8 w-8 animate-bounce" style={{ animationDuration: '2s' }} />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{currentModule.title}</h2>
                <p className="text-indigo-200 text-sm">Module {currentModuleIndex + 1} of {modules.length}</p>
              </div>
            </div>
            <button
              onClick={() => setShowOutline(!showOutline)}
              className="flex items-center space-x-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all duration-300 backdrop-blur-sm hover:scale-105 transform"
            >
              <List className="h-5 w-5" />
              <span>Outline</span>
            </button>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span className="font-semibold">{progress}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden backdrop-blur-sm">
              <div
                className="bg-gradient-to-r from-white via-yellow-200 to-white h-full transition-all duration-700 rounded-full relative overflow-hidden"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-shimmer"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Outline Sidebar (Collapsible) */}
      {showOutline && (
        <div className="bg-gradient-to-r from-gray-50 to-indigo-50 border-b border-gray-200 p-6 max-h-96 overflow-y-auto animate-slide-down">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center">
            <List className="h-5 w-5 mr-2 text-indigo-600" />
            Course Outline
          </h3>
          <div className="space-y-4">
            {modules.map((module, mIdx) => (
              <div key={module.id} className="space-y-2">
                <div className="font-semibold text-gray-800 flex items-center">
                  <span className="w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs mr-2">
                    {mIdx + 1}
                  </span>
                  {module.title}
                </div>
                <div className="ml-8 space-y-1">
                  {((module as any)?.sections || module.content || []).map((section: any, sIdx: number) => {
                    const sectionId = section.id || `${module.id}-${sIdx}`;
                    const isCompleted = isSectionCompleted(module.id, sectionId);
                    const isCurrent = mIdx === currentModuleIndex && sIdx === currentSectionIndex;
                    const sectionDuration = section.estimatedDuration || section.duration || 0;
                    return (
                      <button
                        key={sectionId}
                        onClick={() => jumpToSection(mIdx, sIdx)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-300 flex items-center justify-between transform hover:scale-102 hover:shadow-sm ${
                          isCurrent
                            ? 'bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-900 font-medium shadow-sm'
                            : isCompleted
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 hover:from-green-100 hover:to-emerald-100'
                            : 'text-gray-600 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100'
                        }`}
                      >
                        <span className="flex-1">{section.title}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs opacity-70">{sectionDuration} min</span>
                          {isCompleted && <CheckCircle className="h-4 w-4 text-green-600" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="p-8 md:p-12 animate-fade-in">
        {/* Section Header */}
        <div className="mb-8 pb-6 border-b-2 border-gradient-to-r from-indigo-200 via-purple-200 to-pink-200">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2 animate-slide-in-left">
                <span className="px-3 py-1 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 rounded-full text-sm font-semibold shadow-sm transform hover:scale-105 transition-transform">
                  Section {currentSectionIndex + 1} of {totalSections}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold shadow-sm transform hover:scale-105 transition-transform ${
                  currentModule.difficulty === 'beginner' ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700' :
                  currentModule.difficulty === 'advanced' ? 'bg-gradient-to-r from-red-100 to-pink-100 text-red-700' :
                  'bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-700'
                }`}>
                  {currentModule.difficulty}
                </span>
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-3 animate-slide-in-right">{currentSection.title}</h1>
              {/* Afficher la description du module */}
              {currentModule.description && (
                <p className="text-gray-600 mb-4 text-lg">{currentModule.description}</p>
              )}
              {/* Afficher la description de la section si disponible */}
              {currentSection.content?.text && typeof currentSection.content.text === 'string' && (
                <p className="text-gray-700 mb-4">{currentSection.content.text.split('\n')[0]}</p>
              )}
              <div className="flex items-center space-x-4 text-gray-600">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span className="text-sm font-medium">{currentSection.estimatedDuration || currentSection.duration || 0} minutes</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span className="text-sm font-medium">
                    {currentSection.type === 'document' ? 'Document' :
                     currentSection.type === 'video' ? 'Video' :
                     'Content'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="prose prose-lg max-w-none mb-12">
          <div className="text-gray-800 leading-relaxed space-y-6 animate-fade-in">
            {/* Afficher le contenu réel de la section */}
            {currentSection.content?.text && typeof currentSection.content.text === 'string' ? (
              currentSection.content.text.split('\n\n').map((paragraph, idx) => {
                // Check if it's a bullet list
                if (paragraph.includes('•') || paragraph.match(/^\d+\./)) {
                  return (
                    <div key={idx} className="space-y-2 my-6">
                      {paragraph.split('\n').map((line, lineIdx) => {
                        const trimmedLine = line.trim();
                        if (!trimmedLine) return null;
                        
                        // Bullet point
                        if (trimmedLine.startsWith('•')) {
                          return (
                            <div key={lineIdx} className="flex items-start space-x-3 ml-4 p-2 rounded-lg hover:bg-indigo-50 transition-colors duration-200 group">
                              <span className="text-indigo-600 text-xl leading-none mt-1 group-hover:scale-125 transition-transform">•</span>
                              <span className="flex-1">{trimmedLine.substring(1).trim()}</span>
                            </div>
                          );
                        }
                        
                        // Numbered list
                        const numberedMatch = trimmedLine.match(/^(\d+)\.\s*(.+)/);
                        if (numberedMatch) {
                          return (
                            <div key={lineIdx} className="flex items-start space-x-3 ml-4 p-2 rounded-lg hover:bg-purple-50 transition-colors duration-200 group">
                              <span className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-bold text-sm rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                {numberedMatch[1]}
                              </span>
                              <span className="flex-1">{numberedMatch[2]}</span>
                            </div>
                          );
                        }
                        
                        // Section heading (ALL CAPS or starts with letter A-Z followed by period)
                        if (trimmedLine === trimmedLine.toUpperCase() || /^[A-Z]\.\s/.test(trimmedLine)) {
                          return (
                            <h3 key={lineIdx} className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mt-8 mb-4 border-l-4 border-indigo-500 pl-4 animate-slide-in-left">
                              {trimmedLine}
                            </h3>
                          );
                        }
                        
                        // Regular line
                        return (
                          <p key={lineIdx} className="text-gray-700 leading-relaxed">
                            {trimmedLine}
                          </p>
                        );
                      })}
                    </div>
                  );
                }
                
                // Regular paragraph
                return (
                  <p key={idx} className="text-gray-700 text-lg leading-relaxed p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border-l-2 border-indigo-200 hover:border-indigo-400 transition-all duration-300 hover:shadow-sm">
                    {paragraph}
                  </p>
                );
              })
            ) : currentSection.content?.file ? (
              <div className="space-y-6">
                {/* Document Info */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 shadow-md">
                  <p className="text-blue-900 font-bold text-lg flex items-center mb-2">
                    <FileText className="h-5 w-5 mr-2" />
                    Document: {currentSection.content.file.name}
                  </p>
                  {currentSection.content.file.url && (
                    <div className="mt-4" style={{ minHeight: '400px' }}>
                      <DocumentViewer
                        fileUrl={currentSection.content.file.url}
                        fileName={currentSection.content.file.name}
                        mimeType={currentSection.content.file.mimeType}
                      />
                    </div>
                  )}
                  {!currentSection.content.file.url && (
                    <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg">
                      <FileText className="w-16 h-16 text-gray-400 mb-4" />
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">{currentSection.content.file.name}</h4>
                      <p className="text-gray-500 text-center">Document file not available</p>
                    </div>
                  )}
                </div>
              </div>
            ) : typeof currentSection.content === 'string' ? (
              <div className="text-gray-700 leading-relaxed">
                {currentSection.content}
              </div>
            ) : (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300">
                <p className="text-blue-900 font-bold text-lg flex items-center mb-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
                  Interactive Content
                </p>
                <pre className="text-sm text-gray-700 mt-2 overflow-x-auto bg-white p-4 rounded-lg">
                  {JSON.stringify(currentSection.content, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="flex items-center justify-between pt-8 border-t-2 border-gray-200">
          <button
            onClick={goToPreviousSection}
            disabled={currentModuleIndex === 0 && currentSectionIndex === 0}
            className="group flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 rounded-lg font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:-translate-x-1"
          >
            <ChevronLeft className="h-5 w-5 group-hover:animate-pulse" />
            <span>Previous</span>
          </button>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600 font-semibold">
              Section {currentSectionIndex + 1} of {totalSections}
            </span>
            {isSectionCompleted(currentModule.id, currentSection.id) && (
              <div className="flex items-center space-x-2 text-green-600 text-sm font-medium animate-bounce-in">
                <CheckCircle className="h-5 w-5 animate-pulse" />
                <span>Completed</span>
              </div>
            )}
          </div>

          <button
            onClick={goToNextSection}
            className="group relative flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white rounded-lg font-medium transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:translate-x-1 hover:scale-105 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 group-hover:animate-shimmer"></div>
            <span className="relative z-10">
              {currentSectionIndex === totalSections - 1 && currentModuleIndex === modules.length - 1
                ? '🎉 Complete Course'
                : 'Next Section'
              }
            </span>
            <ChevronRight className="h-5 w-5 relative z-10 group-hover:animate-pulse" />
          </button>
        </div>
      </div>

      {/* Module Info Footer */}
      <div className="bg-gradient-to-r from-gray-50 via-indigo-50 to-purple-50 px-8 py-4 border-t-2 border-indigo-200">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-6">
            <span className="flex items-center space-x-2">
              <BookOpen className="h-4 w-4 text-indigo-600" />
              <span><strong className="text-gray-900">Module:</strong> <span className="text-indigo-600 font-medium">{currentModule.title}</span></span>
            </span>
            <span className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-purple-600" />
              <span><strong className="text-gray-900">Duration:</strong> <span className="text-purple-600 font-medium">{currentModule.duration} min</span></span>
            </span>
          </div>
          <span className="flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-sm">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="font-semibold text-gray-700">
              {completedSections.size} / {modules.reduce((sum, m) => {
                const sections = (m as any)?.sections || m.content || [];
                return sum + sections.length;
              }, 0)} completed
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

