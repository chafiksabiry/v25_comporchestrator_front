import React, { useState, useEffect, useRef } from 'react';
import { TrainingModule, ModuleContent } from '../../types';
import { ChevronDown, ChevronUp, Circle, CheckCircle, Book } from 'lucide-react';

interface ContentViewerProps {
  modules: TrainingModule[];
  onComplete: () => void;
}

export default function ContentViewer({ modules, onComplete }: ContentViewerProps) {
  const [expandedModules, setExpandedModules] = useState<number[]>([0]);
  const [currentSectionKey, setCurrentSectionKey] = useState<string>('0-0'); // moduleIdx-sectionIdx
  const contentAreaRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Détecter la section visible lors du scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!contentAreaRef.current) return;

      const scrollPosition = contentAreaRef.current.scrollTop + 200; // Offset pour détecter plus tôt

      // Trouver quelle section est visible
      for (const [key, ref] of Object.entries(sectionRefs.current)) {
        if (ref && ref.offsetTop <= scrollPosition && ref.offsetTop + ref.offsetHeight > scrollPosition) {
          setCurrentSectionKey(key);
          
          // Auto-expand le module correspondant
          const [moduleIdx] = key.split('-').map(Number);
          if (!expandedModules.includes(moduleIdx)) {
            setExpandedModules(prev => [...prev, moduleIdx]);
          }
          break;
        }
      }
    };

    const contentArea = contentAreaRef.current;
    if (contentArea) {
      contentArea.addEventListener('scroll', handleScroll);
      return () => contentArea.removeEventListener('scroll', handleScroll);
    }
  }, [expandedModules]);

  const toggleModule = (moduleIdx: number) => {
    setExpandedModules(prev => 
      prev.includes(moduleIdx) 
        ? prev.filter(idx => idx !== moduleIdx)
        : [...prev, moduleIdx]
    );
  };

  const scrollToSection = (moduleIdx: number, sectionIdx: number) => {
    const key = `${moduleIdx}-${sectionIdx}`;
    const sectionElement = sectionRefs.current[key];
    
    if (sectionElement && contentAreaRef.current) {
      contentAreaRef.current.scrollTo({
        top: sectionElement.offsetTop - 20,
        behavior: 'smooth'
      });
    }
    
    if (!expandedModules.includes(moduleIdx)) {
      setExpandedModules(prev => [...prev, moduleIdx]);
    }
  };

  const [currentModuleIdx, currentSectionIdx] = currentSectionKey.split('-').map(Number);

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar - Cisco NetAcad Style */}
      <div className="w-80 bg-[#f8f8f8] border-r border-gray-300 flex flex-col">
        {/* Search Bar */}
        <div className="p-4 bg-white border-b border-gray-300">
          <input
            type="text"
            placeholder="Rechercher un plan de cours"
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-gray-400"
          />
        </div>

        {/* Modules List */}
        <div className="flex-1 overflow-y-auto">
          {modules.map((module, moduleIdx) => {
            const isExpanded = expandedModules.includes(moduleIdx);

            return (
              <div key={moduleIdx} className="border-b border-gray-300">
                {/* Module Header */}
                <button
                  onClick={() => toggleModule(moduleIdx)}
                  className="w-full text-left px-4 py-4 hover:bg-gray-100 transition-colors flex items-start justify-between bg-white"
                >
                  <div className="flex-1">
                    <div className="font-bold text-gray-800 text-sm mb-1">
                      Module {moduleIdx + 1}: {module.title}
                    </div>
                    <div className="text-xs text-gray-500">
                      {module.content.length} sections
                    </div>
                  </div>
                  <div className="ml-2 mt-1">
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-green-600" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Sections List */}
                {isExpanded && (
                  <div className="bg-[#f8f8f8]">
                    {module.content.map((section, sectionIdx) => {
                      const sectionKey = `${moduleIdx}-${sectionIdx}`;
                      const isActive = sectionKey === currentSectionKey;

                      return (
                        <button
                          key={sectionIdx}
                          onClick={() => scrollToSection(moduleIdx, sectionIdx)}
                          className={`w-full text-left px-8 py-3 hover:bg-gray-100 transition-colors flex items-start space-x-3 ${
                            isActive ? 'bg-green-100' : ''
                          }`}
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            {isActive ? (
                              <Circle className="h-4 w-4 text-green-600 fill-current" />
                            ) : (
                              <Circle className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${isActive ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                              {moduleIdx + 1}.{sectionIdx + 1} {section.title}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Area - Cisco NetAcad Style */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Book className="h-5 w-5 text-gray-600" />
            <span className="text-sm text-gray-600">
              {currentModuleIdx + 1}.{currentSectionIdx + 1} {modules[currentModuleIdx]?.content[currentSectionIdx]?.title || 'Content'}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <button className="p-2 hover:bg-gray-100 rounded">
              <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded">
              EN
            </button>
            <button className="p-2 hover:bg-gray-100 rounded">
              <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content Area - Scrollable Continue */}
        <div ref={contentAreaRef} className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-12 py-12 space-y-16">
            {/* Afficher TOUTES les sections de TOUS les modules */}
            {modules.map((module, moduleIdx) => (
              <div key={moduleIdx}>
                {module.content.map((section, sectionIdx) => {
                  const sectionKey = `${moduleIdx}-${sectionIdx}`;
                  
                  return (
                    <div
                      key={sectionKey}
                      ref={(el) => (sectionRefs.current[sectionKey] = el)}
                      className="mb-16 scroll-mt-20"
                    >
                      {/* Section Title */}
                      <h1 className="text-4xl font-bold text-gray-900 mb-8">
                        {moduleIdx + 1}.{sectionIdx + 1} {section.title}
                      </h1>

                      {/* Content */}
                      <div className="prose prose-lg max-w-none cisco-netacad-content">
                        {typeof section.content === 'string' ? (
                          section.content.split('\n').map((line, idx) => {
                            const trimmed = line.trim();
                            if (!trimmed) return <div key={idx} className="h-4"></div>;

                            // Bullet points
                            if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
                              return (
                                <div key={idx} className="flex items-start space-x-3 my-2">
                                  <span className="text-gray-400 font-bold mt-1">•</span>
                                  <p className="flex-1 m-0 text-gray-700 leading-relaxed">
                                    {trimmed.replace(/^[•\-]\s*/, '')}
                                  </p>
                                </div>
                              );
                            }

                            // Numbered lists
                            const numberedMatch = trimmed.match(/^(\d+)\.\s*(.+)/);
                            if (numberedMatch) {
                              return (
                                <div key={idx} className="flex items-start space-x-3 my-2">
                                  <span className="text-gray-600 font-semibold">{numberedMatch[1]}.</span>
                                  <p className="flex-1 m-0 text-gray-700 leading-relaxed">{numberedMatch[2]}</p>
                                </div>
                              );
                            }

                            // Headers (lines ending with :)
                            if (trimmed.endsWith(':')) {
                              return (
                                <h3 key={idx} className="text-xl font-bold text-gray-900 mt-8 mb-3">
                                  {trimmed}
                                </h3>
                              );
                            }

                            // Bold text detection (simple)
                            if (trimmed.match(/^\*\*.+\*\*$/)) {
                              return (
                                <p key={idx} className="font-bold text-gray-900 my-3">
                                  {trimmed.replace(/\*\*/g, '')}
                                </p>
                              );
                            }

                            // Regular paragraphs
                            return (
                              <p key={idx} className="text-gray-700 leading-relaxed text-base my-3">
                                {trimmed}
                              </p>
                            );
                          })
                        ) : (
                          <p className="text-gray-700">{JSON.stringify(section.content)}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
