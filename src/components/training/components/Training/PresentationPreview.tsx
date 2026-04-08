import { useState } from 'react';
import {
  X, ChevronLeft, ChevronRight,
  Download as DownloadIcon, Key, Sparkles,
  CheckCircle, FileDown
} from 'lucide-react';
import { IPresentation } from '../../types/core';
import { AIService } from '../../infrastructure/services/AIService';
import React from 'react';

interface PresentationPreviewProps {
  presentation: IPresentation;
  onClose: () => void;
  onSave?: () => void;
  isSaving?: boolean;
}

export default function PresentationPreview({
  presentation,
  onClose,
  onSave,
  isSaving = false
}: PresentationPreviewProps) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadJSON = () => {
    const blob = new Blob([JSON.stringify(presentation, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${presentation.title || 'presentation'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPPTX = async () => {
    setIsExporting(true);
    try {
      console.log('📦 Exporting to PPTX...');
      await AIService.exportPresentationToPPTX(presentation);
      console.log('✅ PPTX exported successfully');
    } catch (error) {
      console.error('❌ PPTX export failed:', error);
      alert('Erreur lors de l\'exportation PowerPoint.');
    } finally {
      setIsExporting(false);
    }
  };

  const currentSlide = presentation.slides[activeSlide];

  // Helper for slide types that use the dark theme
  const isDarkType = (type: string) => ['cover', 'agenda', 'conclusion'].includes(type);

  return (
    <div className="fixed inset-0 bg-black/90 z-[100] flex flex-col md:flex-row border-none animate-in fade-in duration-300 overflow-hidden text-gray-900">
      {/* Sidebar - thumbnails */}
      <div className="w-full md:w-64 lg:w-72 bg-white border-r border-purple-100 flex flex-col h-1/4 md:h-full overflow-hidden">
        <div className="p-4 border-b border-purple-100 flex items-center gap-3 bg-white sticky top-0 z-10">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-purple-600 flex items-center justify-center shadow-lg transform rotate-3">
            <Sparkles size={16} className="text-white" />
          </div>
          <span className="font-bold text-gray-900 tracking-tight">Slides</span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-purple-200 scrollbar-track-transparent">
          {presentation.slides.map((slide, idx) => (
            <button
              key={idx}
              onClick={() => setActiveSlide(idx)}
              className={`w-full text-left p-3 rounded-xl border-2 transition-all duration-300 transform ${activeSlide === idx
                ? 'border-purple-500 bg-purple-50 shadow-md translate-x-1'
                : 'border-transparent bg-gray-50 hover:bg-white hover:border-purple-200 hover:shadow-sm'
                }`}
            >
              <div className={`text-[10px] uppercase tracking-widest mb-1 font-bold ${activeSlide === idx ? 'text-purple-600' : 'text-gray-400'}`}>
                Slide {idx + 1} • {slide.type}
              </div>
              <div className={`text-sm font-bold truncate ${activeSlide === idx ? 'text-gray-900' : 'text-gray-600'}`}>
                {slide.title}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-purple-100 flex items-center justify-between px-6 bg-white/80 backdrop-blur-md shrink-0 z-20">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-purple-600 truncate max-w-md">
              {presentation.title}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPPTX}
              disabled={isExporting}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all transform hover:scale-105 active:scale-95 ${isExporting
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-rose-500 to-purple-600 text-white shadow-lg hover:shadow-purple-200'
                }`}
              title="Exporter en PowerPoint (.pptx)"
            >
              {isExporting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <FileDown size={18} />
              )}
              <span className="hidden sm:inline">Exporter .pptx</span>
            </button>

            <button
              onClick={handleDownloadJSON}
              className="p-2 text-[#7a7060] hover:text-[#0e0e0e] transition-colors"
              title="Télécharger JSON"
            >
              <DownloadIcon size={20} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#7a7060] hover:text-[#0e0e0e] transition-colors"
              title="Fermer"
            >
              <X size={24} />
            </button>
          </div>
        </header>

        {/* Slide Canvas */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 flex flex-col items-center justify-center bg-slate-100/50 relative">
          {(() => {
            const vc = (currentSlide as any).visualConfig || {};
            const isDark = vc.theme === 'dark' || isDarkType(currentSlide.type);
            const accentGradient = vc.accent === 'rose' ? 'from-rose-500 to-rose-600' : (vc.accent === 'purple' ? 'from-purple-500 to-purple-600' : 'from-rose-500 to-purple-600');
            const layout = vc.layout || 'content';

            return (
              <div 
                key={activeSlide} 
                className={`w-full max-w-5xl aspect-[16/9] rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-white overflow-hidden flex relative animate-in fade-in duration-500 ${isDark ? 'bg-[#1a1a2e] text-white' : 'bg-white text-gray-900'}`}
              >
                {/* Background Accents decided by Claude */}
                {layout === 'gradient' && (
                  <div className={`absolute inset-0 bg-gradient-to-br ${accentGradient} opacity-10 pointer-events-none`} />
                )}
                
                {layout === 'split' && (
                  <div className={`w-1/3 h-full bg-gradient-to-b ${accentGradient} flex flex-col items-center justify-center p-8 text-white relative overflow-hidden shrink-0`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -mr-16 -mt-16" />
                    <h1 className="text-3xl font-black text-center relative z-10 leading-tight">
                      {currentSlide.title}
                    </h1>
                  </div>
                )}

                {/* Content Area */}
                <div className={`flex-1 p-10 md:p-16 flex flex-col justify-center relative z-10 ${layout === 'split' ? '' : 'w-full'}`}>
                  {layout !== 'split' && (
                    <h1 className={`${isDark ? 'text-transparent bg-clip-text bg-gradient-to-r from-rose-300 to-purple-300' : 'text-gray-900'} text-4xl md:text-6xl font-black mb-8 leading-[1.1] tracking-tight`}>
                      {currentSlide.title}
                    </h1>
                  )}

                  {currentSlide.content && (
                    <div className="mb-6 opacity-90 text-lg md:text-xl leading-relaxed max-w-3xl">
                      {Array.isArray(currentSlide.content) ? (
                        <ul className="space-y-4">
                          {currentSlide.content.map((bullet, i) => (
                            <li key={i} className="flex items-start gap-4">
                              <span className={`w-2.5 h-2.5 rounded-full bg-gradient-to-br ${accentGradient} mt-2.5 shrink-0 shadow-sm`} />
                              <span className="font-medium">{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>{currentSlide.content}</p>
                      )}
                    </div>
                  )}

                  {/* Support for bullets field */}
                  {Array.isArray((currentSlide as any).bullets) && (currentSlide as any).bullets.length > 0 && (
                    <ul className="space-y-4 max-w-3xl">
                      {(currentSlide as any).bullets.map((bullet: string, i: number) => (
                        <li key={i} className="flex items-start gap-4 text-lg">
                          <span className={`w-2.5 h-2.5 rounded-full bg-gradient-to-br ${accentGradient} mt-2.5 shrink-0 shadow-sm`} />
                          <span className="opacity-90">{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Ornament for dark mode */}
                {isDark && (
                  <>
                    <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/20 blur-[100px] rounded-full -mr-48 -mt-48 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-rose-500/10 blur-[100px] rounded-full -ml-48 -mb-48 pointer-events-none" />
                  </>
                )}
              </div>
            );
          })()}

          {/* Presenter Notes */}
          {currentSlide.note && (
            <div className="w-full max-w-4xl mt-8 animate-in fade-in duration-700">
              <div className="bg-white/80 backdrop-blur border border-purple-100 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-3 text-purple-600">
                  <Key size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">Notes du présentateur</span>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed italic">
                  {currentSlide.note}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation / Save Footer */}
        <footer className="h-20 bg-white border-t border-purple-100 flex items-center justify-between px-8 shrink-0 z-20">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveSlide(prev => Math.max(0, prev - 1))}
              disabled={activeSlide === 0}
              className="p-3 rounded-full hover:bg-purple-50 disabled:opacity-20 transition-all text-purple-600 border border-purple-100"
            >
              <ChevronLeft size={24} />
            </button>
            <div className="flex flex-col items-center">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Progress</span>
              <span className="text-sm font-black text-gray-900">
                {activeSlide + 1} <span className="text-gray-300 mx-1">/</span> {presentation.slides.length}
              </span>
            </div>
            <button
              onClick={() => setActiveSlide(prev => Math.min(presentation.slides.length - 1, prev + 1))}
              disabled={activeSlide === presentation.slides.length - 1}
              className="p-3 rounded-full hover:bg-purple-50 disabled:opacity-20 transition-all text-purple-600 border border-purple-100"
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {onSave && (
            <button
              onClick={onSave}
              disabled={isSaving}
              className="px-8 py-3 bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-2xl font-black text-sm shadow-xl hover:shadow-purple-200 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-3 uppercase tracking-wider"
            >
              {isSaving ? (
                <>
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse delay-75" />
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse delay-150" />
                  </div>
                  Sauvegarde...
                </>
              ) : (
                <>
                  <CheckCircle size={18} />
                  Valider et Enregistrer
                </>
              )}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
