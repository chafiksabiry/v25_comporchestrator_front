import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, ChevronLeft, ChevronRight,
  Sparkles,
  CheckCircle, FileDown, Printer
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

const parseMarkdown = (text: string) => {
  if (!text) return '';
  
  // Basic Markdown replacement
  let html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-slate-100 text-rose-600 px-1.5 py-0.5 rounded-md text-[0.9em] font-mono border border-slate-200">$1</code>');

  // Handle multi-line lists if the input is a single string
  if (html.includes('\n- ') || html.startsWith('- ')) {
    html = html.replace(/^\s*-\s+(.*)/gm, '<li class="ml-4 mb-2 flex items-start gap-2"><span class="mt-2 w-1.5 h-1.5 rounded-full bg-current shrink-0 opacity-50"></span><span>$1</span></li>');
  }

  return html.replace(/\n/g, '<br />');
};

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
      console.log('📦 Exporting to PPTX (Python Method)...');
      // We will update AIService for this later
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

  const handleDownloadPDF = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const renderSlideContent = (slide: any) => {
    const vc = slide.visualConfig || {};
    const themeParams = (presentation as any).visualTheme || {};
    
    // Use generated colors or smart fallbacks
    const isDarkFallback = vc.theme === 'dark' || isDarkType(slide.type);
    
    const bgColor = vc.backgroundHex || (isDarkFallback ? '#1a1a2e' : '#ffffff');
    const textColor = vc.textHex || (isDarkFallback ? '#ffffff' : '#111827');
    const accentColor = vc.accentHex || themeParams.primaryColor || '#F43F5E';
    // If AI explicitly chose an accent color, don't force a purple gradient fallback
    const secondaryColor = (vc.accentHex && vc.accentHex.length > 0) ? vc.accentHex : (themeParams.secondaryColor || '#6D28D9');
    
    const layout = vc.layout || (slide.type === 'cover' ? 'split' : 'content');

    return (
      <div 
        className={`w-full max-w-5xl aspect-[16/9] rounded-[2.5rem] print:rounded-none print:shadow-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-white/10 overflow-hidden flex relative animate-in fade-in duration-500 page-break-inside-avoid print:w-full print:h-full print:max-w-none print:border-none print:m-0 print:flex print:items-center print:justify-center`}
        style={{ 
          pageBreakAfter: 'always',
          backgroundColor: bgColor,
          color: textColor
        }}
      >
        {/* Background Accents */}
        {layout === 'gradient' && (
          <div className="absolute inset-0 opacity-10 print:opacity-20 pointer-events-none" style={{ background: `linear-gradient(135deg, ${accentColor}, ${secondaryColor})` }} />
        )}
        
        {layout === 'split' && (
          <div className="w-1/3 h-full flex flex-col items-center justify-center p-8 text-white relative overflow-hidden shrink-0" style={{ background: `linear-gradient(180deg, ${accentColor}, ${secondaryColor})`, color: '#ffffff' }}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -mr-16 -mt-16 print:hidden" />
            <h1 className="text-3xl font-black text-center relative z-10 leading-tight drop-shadow-md">
              {slide.title}
            </h1>
          </div>
        )}

        {/* Content Area */}
        <div className={`flex-1 p-8 md:p-12 lg:p-14 flex flex-col justify-center relative z-10 overflow-y-auto custom-scrollbar ${layout === 'split' ? '' : 'w-full'}`}>
          {layout !== 'split' && (
            <h1 className="text-3xl md:text-5xl font-black mb-6 leading-[1.2] tracking-tight"
                style={{ 
                   background: `linear-gradient(90deg, ${accentColor}, ${secondaryColor})`,
                   WebkitBackgroundClip: 'text',
                   WebkitTextFillColor: 'transparent',
                   color: accentColor
                }}>
              {slide.title}
            </h1>
          )}

          {slide.subtitle && (
            <h2 className="text-lg md:text-xl font-bold mb-6 opacity-90" style={{ color: accentColor }}>
              {slide.subtitle}
            </h2>
          )}

          {slide.content && (
            <div className="mb-4 opacity-90 text-base md:text-lg leading-relaxed max-w-3xl" style={{ color: 'inherit' }}>
              {Array.isArray(slide.content) ? (
                <ul className="space-y-4">
                  {slide.content.map((bullet: string, i: number) => (
                    <li key={i} className="flex items-start gap-4">
                      <span className="w-2.5 h-2.5 rounded-full mt-2.5 shrink-0 shadow-sm" style={{ background: accentColor }} />
                      <span className="font-medium" dangerouslySetInnerHTML={{ __html: parseMarkdown(bullet) }} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p dangerouslySetInnerHTML={{ __html: parseMarkdown(slide.content) }} />
              )}
            </div>
          )}

          {/* Support for bullets field */}
          {Array.isArray(slide.bullets) && slide.bullets.length > 0 && (
            <ul className={`space-y-3 max-w-3xl ${slide.content ? 'border-t border-current/10 pt-5 mt-5' : ''}`}>
              {slide.bullets.map((bullet: string, i: number) => (
                <li key={i} className="flex items-start gap-4 text-base md:text-lg">
                  <span className="w-2.5 h-2.5 rounded-full mt-2 shrink-0 shadow-sm" style={{ background: accentColor }} />
                  <span className="opacity-90" dangerouslySetInnerHTML={{ __html: parseMarkdown(bullet) }} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Dynamic Ornaments for dark themes based on background brightness */}
        {vc.theme === 'dark' && (
          <>
            <div className="absolute top-0 right-0 w-96 h-96 blur-[100px] rounded-full -mr-48 -mt-48 pointer-events-none print:hidden" style={{ background: secondaryColor, opacity: 0.15 }} />
            <div className="absolute bottom-0 left-0 w-96 h-96 blur-[100px] rounded-full -ml-48 -mb-48 pointer-events-none print:hidden" style={{ background: accentColor, opacity: 0.15 }} />
          </>
        )}
      </div>
    );
  };

  const content = (
    <div className="fixed top-0 left-0 w-screen h-[100dvh] bg-black/90 z-[99999] flex flex-col md:flex-row border-none animate-in fade-in duration-300 overflow-hidden text-gray-900 print:bg-white print:static print:h-auto print:overflow-visible print:block">
      
      {/* Premium Print Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: landscape; margin: 0; }
          body { margin: 0; padding: 0; background: white !important; -webkit-print-color-adjust: exact !important; }
          .print-slide { height: 100vh; width: 100vw; display: flex; align-items: center; justify-content: center; page-break-after: always; overflow: hidden; background: white !important; }
          * { -webkit-print-color-adjust: exact !important; }
          .no-print { display: none !important; }
        }
      `}} />

      {/* Hidden Print Container */}
      <div className="hidden print:block w-full">
        {presentation.slides.map((s, idx) => (
          <div key={`print-${idx}`} className="print-slide">
            {renderSlideContent(s)}
          </div>
        ))}
      </div>

      {/* Sidebar */}
      <div className="w-full md:w-64 lg:w-72 bg-white border-r border-purple-100 flex flex-col h-1/4 md:h-full overflow-hidden print:hidden">
        <div className="p-4 border-b border-purple-100 flex items-center gap-3 bg-white sticky top-0 z-10">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-purple-600 flex items-center justify-center shadow-lg transform rotate-3">
            <Sparkles size={16} className="text-white" />
          </div>
          <span className="font-bold text-gray-900 tracking-tight">Slides</span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {presentation.slides.map((slide, idx) => (
            <button
              key={idx}
              onClick={() => setActiveSlide(idx)}
              className={`w-full text-left p-3 rounded-xl border-2 transition-all transform ${activeSlide === idx
                ? 'border-purple-500 bg-purple-50 shadow-md translate-x-1'
                : 'border-transparent bg-gray-50 hover:bg-white hover:border-purple-200'
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
      <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden print:hidden">
        {/* Header */}
        <header className="h-16 border-b border-purple-100 flex items-center justify-between px-6 bg-white/80 backdrop-blur-md shrink-0 z-20">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-purple-600 truncate max-w-md">
              {presentation.title}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2 rounded-xl font-bold text-sm bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <Printer size={18} className="text-rose-500" />
              <span className="hidden sm:inline">Télécharger PDF</span>
            </button>

            <button
              onClick={handleExportPPTX}
              disabled={isExporting}
              className={`px-4 py-2 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-rose-500 to-purple-600 flex items-center gap-2 ${isExporting ? 'opacity-50' : ''}`}
            >
              {isExporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileDown size={18} />}
              <span className="hidden sm:inline">Exporter .pptx</span>
            </button>

            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>
        </header>

        {/* Slide Canvas */}
        <div className="flex-1 overflow-y-auto p-4 md:p-12 flex flex-col items-center justify-center bg-slate-100/50">
           {renderSlideContent(currentSlide)}
        </div>

        {/* Footer */}
        <footer className="h-20 bg-white border-t border-purple-100 flex items-center justify-between px-8">
          <div className="flex items-center gap-6">
            <button onClick={() => setActiveSlide(prev => Math.max(0, prev - 1))} disabled={activeSlide === 0} className="p-3 rounded-full hover:bg-purple-50 disabled:opacity-20 text-purple-600 border border-purple-100">
              <ChevronLeft size={24} />
            </button>
            <div className="flex flex-col items-center">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Progress</span>
              <span className="text-sm font-black text-gray-900">{activeSlide + 1} / {presentation.slides.length}</span>
            </div>
            <button onClick={() => setActiveSlide(prev => Math.min(presentation.slides.length - 1, prev + 1))} disabled={activeSlide === presentation.slides.length - 1} className="p-3 rounded-full hover:bg-purple-50 disabled:opacity-20 text-purple-600 border border-purple-100">
              <ChevronRight size={24} />
            </button>
          </div>

          {onSave && (
            <button onClick={onSave} disabled={isSaving} className="px-8 py-3 bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-2xl font-black text-sm flex items-center gap-3">
              {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle size={18} />}
              Terminer la Formation
            </button>
          )}
        </footer>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }

  return content;
}

import { RefreshCw } from 'lucide-react';
