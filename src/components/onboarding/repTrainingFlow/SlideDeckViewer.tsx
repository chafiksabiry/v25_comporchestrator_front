import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function parseMarkdown(text: string): string {
  if (!text) return '';
  let html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^###\s*(.*$)/gim, '<h3 class="text-lg font-bold mt-3 mb-2">$1</h3>')
    .replace(/^##\s*(.*$)/gim, '<h2 class="text-xl font-bold mt-4 mb-2">$1</h2>')
    .replace(/^#\s*(.*$)/gim, '<h1 class="text-2xl font-black mt-4 mb-3">$1</h1>');
  if (html.includes('\n- ') || html.startsWith('- ')) {
    html = html.replace(/^\s*-\s+(.*)/gm, '<li class="ml-4 mb-1 list-disc">$1</li>');
  }
  return html.replace(/\n/g, '<br />');
}

type Slide = Record<string, unknown>;

export default function SlideDeckViewer({
  presentation,
  title,
  onBack
}: {
  presentation: { slides?: Slide[]; title?: string };
  title?: string;
  onBack?: () => void;
}) {
  const slides = presentation.slides ?? [];
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive(0);
  }, [presentation]);

  const slide = slides[active] as Slide | undefined;
  const displayTitle = title || presentation.title || 'Presentation';

  const isDark = (s: Slide | undefined) => {
    const vc = (s?.visualConfig || {}) as Record<string, unknown>;
    const t = s?.type as string;
    return vc.theme === 'dark' || ['cover', 'agenda', 'conclusion'].includes(t || '');
  };

  const renderSlide = (s: Slide | undefined) => {
    if (!s) {
      return <p className="text-gray-500">No slide</p>;
    }
    const vc = (s.visualConfig || {}) as Record<string, unknown>;
    const dark = isDark(s);
    const bg = (vc.backgroundHex as string) || (dark ? '#1a1a2e' : '#ffffff');
    const fg = (vc.textHex as string) || (dark ? '#ffffff' : '#111827');
    const accent = (vc.accentHex as string) || '#db2777';

    const layout = (vc.layout as string) || (s.type === 'cover' ? 'split' : 'content');
    const bulletClass = dark ? 'rounded-xl border border-white/15 bg-white/5 p-3' : 'rounded-xl border border-slate-200 bg-slate-50 p-3';

    return (
      <div
        className="relative flex aspect-[16/9] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200/80 shadow-lg"
        style={{ backgroundColor: bg, color: fg }}
      >
        {layout === 'split' && (
          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            <div
              className="flex w-full shrink-0 flex-col justify-center p-6 md:w-1/3"
              style={{
                background: `linear-gradient(180deg, ${accent}, #7c3aed)`,
                color: '#fff'
              }}
            >
              <h2 className="text-center text-xl font-black leading-tight md:text-2xl">{String(s.title || '')}</h2>
              {s.subtitle && <p className="mt-2 text-center text-sm opacity-90">{String(s.subtitle)}</p>}
            </div>
            <div className="flex flex-1 flex-col justify-center overflow-y-auto p-6">
              {s.content && (
                <div
                  className="prose prose-sm max-w-none opacity-95"
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(String(s.content)) }}
                />
              )}
              {Array.isArray(s.bullets) && (s.bullets as string[]).length > 0 && (
                <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {(s.bullets as string[]).map((b, i) => (
                    <li key={i} className={bulletClass} dangerouslySetInnerHTML={{ __html: parseMarkdown(b) }} />
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
        {layout !== 'split' && (
          <div className="flex flex-1 flex-col justify-center overflow-y-auto p-6 md:p-10">
            <h2 className="mb-4 text-2xl font-black md:text-4xl" style={{ color: accent }}>
              {String(s.title || '')}
            </h2>
            {s.subtitle && <p className="mb-4 text-lg font-semibold opacity-80">{String(s.subtitle)}</p>}
            {s.content && (
              <div
                className="max-w-3xl text-base leading-relaxed opacity-90 md:text-lg"
                dangerouslySetInnerHTML={{ __html: parseMarkdown(String(s.content)) }}
              />
            )}
            {Array.isArray(s.bullets) && (s.bullets as string[]).length > 0 && (
              <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(s.bullets as string[]).map((b, i) => (
                  <li key={i} className={bulletClass} dangerouslySetInnerHTML={{ __html: parseMarkdown(b) }} />
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-100/90">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-rose-100 bg-white px-3 py-2 md:px-4">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="shrink-0 rounded-lg border border-rose-200 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-rose-600 hover:bg-rose-50 md:text-xs"
          >
            Back
          </button>
        )}
        <h2 className="min-w-0 flex-1 truncate text-center text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-purple-700 md:text-base">
          {displayTitle}
        </h2>
        <span className="w-16 shrink-0 text-right text-xs font-semibold text-slate-500">
          {slides.length ? `${active + 1}/${slides.length}` : '—'}
        </span>
      </header>
      <div className="relative flex flex-1 items-center justify-center overflow-y-auto p-4">
        {slides.length === 0 ? (
          <p className="text-slate-500">No slides</p>
        ) : (
          <>
            <button
              type="button"
              aria-label="Previous slide"
              disabled={active === 0}
              onClick={() => setActive((i) => Math.max(0, i - 1))}
              className="absolute left-2 z-10 rounded-full border border-rose-200 bg-white p-2 text-fuchsia-600 shadow-md disabled:opacity-30 md:left-4 md:p-3"
            >
              <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
            </button>
            {renderSlide(slide)}
            <button
              type="button"
              aria-label="Next slide"
              disabled={active >= slides.length - 1}
              onClick={() => setActive((i) => Math.min(slides.length - 1, i + 1))}
              className="absolute right-2 z-10 rounded-full border border-rose-200 bg-white p-2 text-fuchsia-600 shadow-md disabled:opacity-30 md:right-4 md:p-3"
            >
              <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
