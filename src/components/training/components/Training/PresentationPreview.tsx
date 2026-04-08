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
    <div className="fixed inset-0 bg-black/90 z-[100] flex flex-col md:flex-row border-none animate-in fade-in duration-300 overflow-hidden">
      {/* Sidebar - thumbnails */}
      <div className="w-full md:w-64 lg:w-72 bg-[#ede8da] border-r border-[#d5cfc0] flex flex-col h-1/4 md:h-full overflow-hidden">
        <div className="p-4 border-b border-[#d5cfc0] flex items-center gap-3 bg-[#ede8da] sticky top-0 z-10">
          <div className="w-8 h-8 rounded-lg bg-[#0e0e0e] flex items-center justify-center">
            <Sparkles size={16} className="text-[#f0a832]" />
          </div>
          <span className="font-bold text-[#0e0e0e]">Slides</span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {presentation.slides.map((slide, idx) => (
            <button
              key={idx}
              onClick={() => setActiveSlide(idx)}
              className={`w-full text-left p-3 rounded-lg border-2 transition-all duration-200 ${activeSlide === idx
                ? 'border-[#c8860a] bg-[#fff5e6] shadow-sm'
                : 'border-[#d5cfc0] bg-[#f5f0e8] hover:border-[#7a7060]'
                }`}
            >
              <div className="text-[10px] uppercase tracking-wider text-[#7a7060] mb-1">
                Slide {idx + 1} • {slide.type}
              </div>
              <div className="text-sm font-semibold truncate text-[#0e0e0e]">
                {slide.title}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-[#f5f0e8] overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-[#d5cfc0] flex items-center justify-between px-6 bg-[#ede8da] shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-[#0e0e0e] truncate max-w-md">
              {presentation.title}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPPTX}
              disabled={isExporting}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-sm transition-all ${isExporting
                ? 'bg-[#d5cfc0] text-[#7a7060] cursor-not-allowed'
                : 'bg-[#c8860a] text-white hover:bg-[#b57a09] shadow-sm'
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
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center justify-center bg-[#f5f0e8] relative">
          <div className={`w-full max-w-4xl aspect-[16/9] rounded-2xl shadow-2xl border border-[#d5cfc0] overflow-hidden flex flex-col relative animate-in fade-in slide-in-from-bottom-4 duration-500 ${isDarkType(currentSlide.type) ? 'bg-[#0e0e0e] text-white' : 'bg-[#ede8da] text-[#0e0e0e]'
            }`}>
            {/* Slide Layouts */}
            <div className="flex-1 p-8 md:p-12 flex flex-col justify-center relative z-10">
              <h1 className={`${isDarkType(currentSlide.type) ? 'text-[#f0a832]' : 'text-[#0e0e0e]'} text-3xl md:text-5xl font-bold mb-8 leading-tight`}>
                {currentSlide.title}
              </h1>

              {currentSlide.content && (
                <div className="mb-6 opacity-90 text-lg md:text-xl leading-relaxed">
                  {Array.isArray(currentSlide.content) ? (
                    <ul className="space-y-4">
                      {currentSlide.content.map((bullet, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="text-[#c8860a] mt-1.5 shrink-0">›</span>
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>{currentSlide.content}</p>
                  )}
                </div>
              )}

              {/* Support for bullets if provided in a separate field by the AI */}
              {Array.isArray((currentSlide as any).bullets) && (currentSlide as any).bullets.length > 0 && (
                <ul className="space-y-4">
                  {(currentSlide as any).bullets.map((bullet: string, i: number) => (
                    <li key={i} className="flex items-start gap-3 text-lg md:text-xl">
                      <span className="text-[#c8860a] mt-1.5 shrink-0">›</span>
                      <span className="opacity-90">{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Accent gradients for cover styles */}
            {isDarkType(currentSlide.type) && (
              <div className="absolute top-0 right-0 bottom-0 w-1/3 bg-gradient-to-l from-[#c8860a1a] to-transparent pointer-events-none" />
            )}
          </div>

          {/* Presenter Notes */}
          {currentSlide.notes && (
            <div className="w-full max-w-4xl mt-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
              <div className="bg-[#fffbf0] border border-[#f0dca0] rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-3 text-[#8b5e07]">
                  <Key size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">Notes du présentateur</span>
                </div>
                <p className="text-[#7a7060] text-sm leading-relaxed italic">
                  {currentSlide.notes}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation / Save Footer */}
        <footer className="h-20 bg-[#ede8da] border-t border-[#d5cfc0] flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveSlide(prev => Math.max(0, prev - 1))}
              disabled={activeSlide === 0}
              className="p-2 rounded-full hover:bg-[#d5cfc0] disabled:opacity-30 transition-all text-[#0e0e0e]"
            >
              <ChevronLeft size={24} />
            </button>
            <span className="text-sm font-bold text-[#0e0e0e]">
              {activeSlide + 1} / {presentation.slides.length}
            </span>
            <button
              onClick={() => setActiveSlide(prev => Math.min(presentation.slides.length - 1, prev + 1))}
              disabled={activeSlide === presentation.slides.length - 1}
              className="p-2 rounded-full hover:bg-[#d5cfc0] disabled:opacity-30 transition-all text-[#0e0e0e]"
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {onSave && (
            <button
              onClick={onSave}
              disabled={isSaving}
              className="px-6 py-3 bg-[#0e0e0e] text-white rounded-xl font-bold flex items-center gap-2 hover:bg-[#222] transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50"
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
