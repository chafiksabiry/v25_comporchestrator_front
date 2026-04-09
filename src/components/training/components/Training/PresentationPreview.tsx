import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle,
  FileDown,
  RefreshCw,
  ArrowLeft,
  Wand2,
  Send,
  Loader2
} from 'lucide-react';
import { IPresentation } from '../../types/core';
import { AIService } from '../../infrastructure/services/AIService';

interface PresentationPreviewProps {
  presentation: IPresentation;
  onClose: () => void;
  onSave?: () => void;
  isSaving?: boolean;
  fileTrainingUrl?: string; // Optional PPTX URL
  isEmbedded?: boolean;     // Whether to render as a modal or inline
  showPagination?: boolean; // Whether to show the slide list sidebar
  /** Hide Export .pptx in header (and in slide sidebar when visible) */
  hideExportPptx?: boolean;
  /** Use a light slide canvas instead of dark gradient (better readability when embedded) */
  embedLightCanvas?: boolean;
  /** Optional label for the back control (default: Back to trainings) */
  backLabel?: string;
}

const parseMarkdown = (text: string) => {
  if (!text) return '';

  // Basic Markdown replacement
  let html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-slate-100 text-rose-600 px-1.5 py-0.5 rounded-md text-[0.9em] font-mono border border-slate-200">$1</code>')
    // Add heading support
    .replace(/^###\s*(.*$)/gim, '<h3 class="text-xl font-bold mt-4 mb-2">$1</h3>')
    .replace(/^##\s*(.*$)/gim, '<h2 class="text-2xl font-bold mt-5 mb-3 text-inherit">$1</h2>')
    .replace(/^#\s*(.*$)/gim, '<h1 class="text-3xl font-black mt-6 mb-4 text-inherit">$1</h1>');

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
  isSaving = false,
  fileTrainingUrl,
  isEmbedded = false,
  showPagination = false,
  hideExportPptx = false,
  embedLightCanvas = false,
  backLabel
}: PresentationPreviewProps) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [localPresentation, setLocalPresentation] = useState(presentation);
  const [editPrompt, setEditPrompt] = useState('');
  const [isAiEditing, setIsAiEditing] = useState(false);
  const [showFloatingPrompt, setShowFloatingPrompt] = useState(false);

  // Sync with prop if it changes (e.g. initial generation)
  React.useEffect(() => {
    setLocalPresentation(presentation);
    setActiveSlide(0);
  }, [presentation]);

  const slides = localPresentation.slides ?? [];

  const handleAiEdit = async (promptText: string) => {
    if (!promptText.trim()) return;
    const target = slides[activeSlide];
    if (!target) return;
    setIsAiEditing(true);
    try {
      const updatedSlide = await AIService.editSlide(target, promptText);
      const newSlides = [...slides];
      newSlides[activeSlide] = updatedSlide;
      setLocalPresentation({ ...localPresentation, slides: newSlides });
      setEditPrompt('');
      setShowFloatingPrompt(false);
    } catch (error) {
      console.error('AI Edit failed:', error);
      alert('The slide could not be updated by AI. Please try again.');
    } finally {
      setIsAiEditing(false);
    }
  };

  // Normalize PPT URL to handle multiple field variations (lowercase, camelCase, etc.)
  const actualUrl = fileTrainingUrl || (presentation as any).filetraining || (presentation as any).fileTrainingUrl || (presentation as any).presentationUrl;

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
      const blob = await AIService.exportToPowerPoint(presentation);

      // Create Object URL and trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${presentation.title || 'Training'}.pptx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('✅ PPTX exported successfully');
    } catch (error) {
      console.error('❌ PPTX export failed:', error);
      alert('PowerPoint export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const currentSlide = slides[activeSlide];

  // Helper for slide types that use the dark theme
  const isDarkType = (type: string) => ['cover', 'agenda', 'conclusion'].includes(type);

  const handleDownloadPDF = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const renderSlideContent = (slide: any) => {
    if (!slide) return null;
    const vc = slide.visualConfig || {};
    const themeParams = (localPresentation as any).visualTheme || {};

    // Use generated colors or smart fallbacks
    const isDarkFallback = vc.theme === 'dark' || isDarkType(slide.type);

    const bgColor = vc.backgroundHex || (isDarkFallback ? '#1a1a2e' : '#ffffff');
    const textColor = vc.textHex || (isDarkFallback ? '#ffffff' : '#111827');
    const accentColor = vc.accentHex || themeParams.primaryColor || '#F43F5E';
    // If AI explicitly chose an accent color, don't force a purple gradient fallback
    const secondaryColor = (vc.accentHex && vc.accentHex.length > 0) ? vc.accentHex : (themeParams.secondaryColor || '#6D28D9');

    const layout = vc.layout || (slide.type === 'cover' ? 'split' : 'content');
    const bulletTileClass = isDarkFallback
      ? 'rounded-2xl border border-white/15 bg-white/5'
      : 'rounded-2xl border border-slate-200/90 bg-slate-50/90';

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
          <div className="flex h-full min-h-0 w-1/3 shrink-0 flex-col items-center justify-start overflow-y-auto p-8 pt-10 text-white relative" style={{ background: `linear-gradient(180deg, ${accentColor}, ${secondaryColor})`, color: '#ffffff' }}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -mr-16 -mt-16 print:hidden" />
            <h1 className="text-3xl font-black text-center relative z-10 leading-tight drop-shadow-md">
              {slide.title}
            </h1>
          </div>
        )}

        {/* Content Area */}
        <div className={`relative z-10 flex min-h-0 flex-1 flex-col justify-start overflow-y-auto p-8 md:p-12 lg:p-14 custom-scrollbar ${layout === 'split' ? '' : 'w-full'}`}>
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
            <div className="mb-4 opacity-90 text-base md:text-lg leading-relaxed max-w-5xl" style={{ color: 'inherit' }}>
              {Array.isArray(slide.content) ? (
                <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-x-8 md:gap-y-3">
                  {slide.content.map((bullet: string, i: number) => (
                    <li key={i} className={`flex items-start gap-3 p-3 md:p-4 ${bulletTileClass}`}>
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full shadow-sm" style={{ background: accentColor }} />
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
            <ul className={`grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-x-8 md:gap-y-3 max-w-5xl ${slide.content ? 'border-t border-current/10 pt-5 mt-5' : ''}`}>
              {slide.bullets.map((bullet: string, i: number) => (
                <li key={i} className={`flex items-start gap-3 p-3 text-base md:text-lg ${bulletTileClass}`}>
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full shadow-sm" style={{ background: accentColor }} />
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
    <div className={`${isEmbedded ? `relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-rose-100/80 bg-slate-50 shadow-sm ${embedLightCanvas ? '' : 'min-h-[560px]'}` : 'fixed inset-0 z-[9999] flex flex-col overflow-y-auto overflow-hidden border border-rose-100/80 bg-white md:flex-row'} animate-in fade-in duration-300 text-gray-900 print:bg-white print:static print:h-auto print:overflow-visible print:block`}>

      {/* Premium Print Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
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
        {slides.map((s, idx) => (
          <div key={`print-${idx}`} className="print-slide">
            {renderSlideContent(s)}
          </div>
        ))}
      </div>
      {/* Sidebar removed as requested */}

      {/* Main Content */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50 print:hidden">
        {/* Header — shown in modal and when embedded (e.g. company REP onboarding) */}
        {(!isEmbedded || onClose) && (
          <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-rose-100 bg-white/95 px-4 backdrop-blur-md z-20 md:h-16 md:px-6">
            <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-4">
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="group flex shrink-0 items-center gap-2 rounded-xl border-2 border-rose-500 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-rose-600 transition-colors hover:bg-rose-50 md:text-[11px]"
                >
                  <ArrowLeft size={16} strokeWidth={2.5} className="text-rose-600 transition-transform group-hover:-translate-x-0.5" />
                  <span className="hidden sm:inline">{backLabel || 'Back to trainings'}</span>
                  <span className="sm:hidden">Back</span>
                </button>
              )}
              <div className="hidden h-6 w-px bg-gray-200 sm:block" />
              <h2 className="min-w-0 truncate text-base font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-rose-600 via-fuchsia-600 to-purple-700 md:text-lg md:max-w-md">
                {localPresentation.title}
              </h2>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {!hideExportPptx && (
                <button
                  type="button"
                  onClick={handleExportPPTX}
                  disabled={isExporting}
                  className={`flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 via-fuchsia-500 to-purple-600 px-3 py-2 text-xs font-bold text-white shadow-md md:px-4 md:text-sm ${isExporting ? 'opacity-50' : 'hover:shadow-lg'}`}
                >
                  {isExporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileDown size={18} />}
                  <span className="hidden sm:inline">Export .pptx</span>
                </button>
              )}

              {!isEmbedded && onClose && (
                <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600" aria-label="Close">
                  <X size={24} />
                </button>
              )}
            </div>
          </header>
        )}

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Slide Pagination Sidebar (Inline mode) */}
          {showPagination && (
            <div className="w-64 border-r border-purple-100 bg-white overflow-y-auto custom-scrollbar flex flex-col shrink-0">
              <div className="p-4 border-b border-purple-50 bg-slate-50/50">
                <h3 className="text-xs font-black text-purple-900 uppercase tracking-widest flex items-center gap-2">
                  <Sparkles size={14} className="text-rose-500" />
                  Slide outline
                </h3>
              </div>
              <div className="flex-1 p-2 space-y-1">
                {slides.map((slide, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveSlide(idx)}
                    className={`w-full text-left p-3 rounded-xl transition-all group relative overflow-hidden ${
                      activeSlide === idx
                        ? 'bg-gradient-to-r from-rose-50 to-purple-50 border border-purple-200 shadow-sm'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    {activeSlide === idx && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-rose-500 to-purple-600" />
                    )}
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-bold ${activeSlide === idx ? 'text-rose-600' : 'text-slate-400'}`}>
                        SLIDE {String(idx + 1).padStart(2, '0')}
                      </span>
                      {slide.type === 'cover' && <Sparkles size={10} className="text-amber-400" />}
                    </div>
                    <div className={`text-xs font-bold truncate ${activeSlide === idx ? 'text-purple-900' : 'text-slate-600'}`}>
                      {slide.title}
                    </div>
                  </button>
                ))}
              </div>

              {/* Sidebar AI Prompt Area */}
              <div className="p-4 border-t border-purple-50 bg-slate-50/30">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Wand2 size={12} className="text-purple-500" />
                  Refine this slide
                </p>
                <div className="relative">
                  <textarea
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    placeholder="e.g. Add more depth on…"
                    className="w-full h-20 p-2.5 text-xs bg-white border border-purple-100 rounded-xl focus:ring-2 focus:ring-purple-200 focus:border-purple-300 outline-none resize-none transition-all placeholder:text-slate-400 custom-scrollbar"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAiEdit(editPrompt);
                      }
                    }}
                  />
                  <button
                    onClick={() => handleAiEdit(editPrompt)}
                    disabled={isAiEditing || !editPrompt.trim()}
                    className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-30 transition-colors shadow-sm"
                  >
                    {isAiEditing ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                  </button>
                </div>
              </div>

              {!hideExportPptx && (
                <div className="p-4 border-t border-purple-50">
                  <button
                    onClick={handleExportPPTX}
                    disabled={isExporting}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200"
                  >
                    {isExporting ? <RefreshCw className="h-3 w-3 animate-spin" /> : <FileDown size={14} />}
                    Export PPTX
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Slide Canvas or PPTX Viewer */}
          <div className={`group/canvas relative flex min-h-0 flex-1 flex-col items-center overflow-y-auto overscroll-contain px-4 pb-10 pt-4 md:px-8 md:pb-12 md:pt-6 ${isEmbedded ? (embedLightCanvas ? 'bg-slate-100/80' : 'bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950') : 'bg-slate-100/50'}`}>
            {/* Quick Navigation Buttons (Floating) */}
            {!actualUrl && (
              <>
                <button
                  onClick={() => setActiveSlide(Math.max(0, activeSlide - 1))}
                  disabled={slides.length === 0 || activeSlide === 0}
                  className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full border border-rose-200/80 bg-white/95 p-4 text-fuchsia-600 shadow-xl shadow-fuchsia-500/10 transition-all hover:bg-white disabled:opacity-0 opacity-0 group-hover/canvas:opacity-100"
                >
                  <ChevronLeft size={24} strokeWidth={3} />
                </button>
                <button
                  onClick={() => setActiveSlide(Math.min(slides.length - 1, activeSlide + 1))}
                  disabled={slides.length === 0 || activeSlide === slides.length - 1}
                  className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full border border-rose-200/80 bg-white/95 p-4 text-fuchsia-600 shadow-xl shadow-fuchsia-500/10 transition-all hover:bg-white disabled:opacity-0 opacity-0 group-hover/canvas:opacity-100"
                >
                  <ChevronRight size={24} strokeWidth={3} />
                </button>
                
                {/* Slide Counter (Floating) */}
                <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-full border border-rose-100 bg-white/95 px-4 py-2 text-xs font-bold text-slate-600 shadow-lg backdrop-blur">
                  {slides.length ? `${activeSlide + 1} / ${slides.length}` : '0 / 0'}
                </div>

                {/* Floating AI Bubble entry point */}
                <div className={`absolute z-20 ${isEmbedded ? 'bottom-24 right-4 top-auto md:right-6' : 'right-6 top-6'}`}>
                  {!showFloatingPrompt ? (
                    <button
                      onClick={() => setShowFloatingPrompt(true)}
                      className="flex animate-in slide-in-from-right items-center gap-2 rounded-full bg-gradient-to-r from-rose-500 via-fuchsia-500 to-purple-600 px-4 py-2 text-sm font-bold text-white shadow-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
                    >
                      <Wand2 size={16} />
                      <span>Edit with Claude</span>
                    </button>
                  ) : (
                    <div className="w-80 bg-white rounded-2xl shadow-2xl border border-purple-100 p-4 animate-in zoom-in-95 duration-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Sparkles size={16} className="text-purple-600" />
                          <h4 className="text-sm font-black text-gray-900">Ask Claude</h4>
                        </div>
                        <button onClick={() => setShowFloatingPrompt(false)} className="text-gray-400 hover:text-gray-600 p-1">
                          <X size={16} />
                        </button>
                      </div>
                      <textarea
                        autoFocus
                        value={editPrompt}
                        onChange={(e) => setEditPrompt(e.target.value)}
                        placeholder="e.g. Switch to a darker style and make the title more impactful"
                        className="w-full h-24 p-3 text-sm bg-slate-50 border border-purple-100 rounded-xl focus:ring-2 focus:ring-purple-200 focus:border-purple-300 outline-none resize-none transition-all mb-3 text-gray-700 custom-scrollbar"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAiEdit(editPrompt);
                          }
                        }}
                      />
                      <button
                        onClick={() => handleAiEdit(editPrompt)}
                        disabled={isAiEditing || !editPrompt.trim()}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-purple-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:shadow-lg disabled:opacity-50 transition-all"
                      >
                        {isAiEditing ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>Updating…</span>
                          </>
                        ) : (
                          <>
                            <Send size={16} />
                            <span>Apply changes</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {actualUrl ? (
            <div className="w-full h-full max-w-6xl bg-white rounded-3xl shadow-2xl border border-purple-200 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-purple-100 bg-purple-50 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <FileDown className="h-5 w-5 text-red-600" />
                  </div>
                  <h3 className="font-bold text-gray-900">Generated PowerPoint preview</h3>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-purple-600 bg-white px-3 py-1 rounded-full border border-purple-100">
                    Embedded viewer
                  </span>
                </div>
              </div>
              <div className="flex-1 bg-gray-50 relative">
                <iframe
                  src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(actualUrl)}`}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  className="absolute inset-0 w-full h-full"
                  title="PPTX Preview"
                >
                  Your browser cannot display this file.
                </iframe>
              </div>
            </div>
          ) : slides.length === 0 ? (
            <div className={`mx-auto max-w-md px-6 text-center ${embedLightCanvas ? 'text-slate-600' : 'text-slate-300'}`}>
              <p className={`mb-2 text-lg font-bold ${embedLightCanvas ? 'text-slate-800' : 'text-slate-200'}`}>No slides to display</p>
              <p className={`text-sm ${embedLightCanvas ? 'text-slate-500' : 'text-slate-400'}`}>
                The API returned a program but no slide deck. Use &quot;Regenerate presentation&quot; in the panel on the left, or generate the curriculum again.
              </p>
            </div>
          ) : (
            renderSlideContent(currentSlide)
          )}
        </div>
      </div>

      {onSave && (
        <footer className="flex h-20 shrink-0 items-center justify-end border-t border-rose-100 bg-white px-4 md:px-8">
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-rose-500 via-fuchsia-500 to-purple-600 px-6 py-3 text-sm font-black text-white shadow-md hover:shadow-lg md:px-8"
          >
            {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle size={18} />}
            Complete training
          </button>
        </footer>
      )}
      </div>
    </div>
  );

  if (isEmbedded) {
    return content;
  }

  return createPortal(content, document.body);
}

