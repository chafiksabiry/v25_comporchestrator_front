import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, X } from 'lucide-react';

/* ─── Storage helpers ─────────────────────────────────────────────────────── */
const BASE_KEY = 'harx_tour_phase_';

export function hasSeenProductTour(phase: number | string = 'v1'): boolean {
  try { return localStorage.getItem(`${BASE_KEY}${phase}`) === 'true'; } catch { return false; }
}
export function markProductTourSeen(phase: number | string = 'v1'): void {
  try { localStorage.setItem(`${BASE_KEY}${phase}`, 'true'); } catch { /* noop */ }
}

/* ─── Types ───────────────────────────────────────────────────────────────── */
export interface TourStep {
  /** Must match a `data-tour="..."` attribute in the DOM */
  target: string;
  badge: string;
  title: string;
  description: string;
  prefer?: 'top' | 'bottom';
}

interface Props {
  /** Used as the localStorage key suffix — pass the phase number */
  tourKey: number | string;
  steps: TourStep[];
  onDone?: () => void;
}

/* ─── Layout constants ────────────────────────────────────────────────────── */
const SPOTLIGHT_PAD = 10;
const POPOVER_W = 340;
const ARROW_H = 10;
const EDGE_MARGIN = 16;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/* ─── Component ───────────────────────────────────────────────────────────── */
const OnboardingProductTour: React.FC<Props> = ({ tourKey, steps, onDone }) => {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [visible, setVisible] = useState(true);

  const total = steps.length;
  const current = steps[step];

  const measureTarget = useCallback(() => {
    if (!current) return;
    const el = document.querySelector<HTMLElement>(`[data-tour="${current.target}"]`);
    if (el) setRect(el.getBoundingClientRect());
    else setRect(null);
  }, [current]);

  useEffect(() => {
    if (!visible) return;
    // Small delay so the DOM has settled after phase transition
    const t = setTimeout(measureTarget, 80);
    window.addEventListener('resize', measureTarget);
    window.addEventListener('scroll', measureTarget, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', measureTarget);
      window.removeEventListener('scroll', measureTarget, true);
    };
  }, [visible, measureTarget]);

  const close = useCallback(() => {
    markProductTourSeen(tourKey);
    setVisible(false);
    onDone?.();
  }, [tourKey, onDone]);

  const next = useCallback(() => {
    if (step >= total - 1) close();
    else setStep(s => s + 1);
  }, [step, total, close]);

  if (!visible || !current) return null;

  /* ── Spotlight ── */
  const spotlight = rect
    ? { top: rect.top - SPOTLIGHT_PAD, left: rect.left - SPOTLIGHT_PAD, width: rect.width + SPOTLIGHT_PAD * 2, height: rect.height + SPOTLIGHT_PAD * 2 }
    : null;

  /* ── Popover position ── */
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let popoverStyle: React.CSSProperties = {};
  let arrowSide: 'top' | 'bottom' | 'none' = 'none';
  let arrowLeft = 0;

  if (spotlight) {
    const prefer = current.prefer ?? 'bottom';
    const spBottom = spotlight.top + spotlight.height;
    const spMidX = spotlight.left + spotlight.width / 2;
    const fitsBelow = spBottom + ARROW_H + EDGE_MARGIN + 220 < vh;
    const fitsAbove = spotlight.top - ARROW_H - EDGE_MARGIN - 220 > 0;
    // prefer='bottom' → go below if it fits, else above
    // prefer='top'    → go above if it fits, else below
    const useBelow = prefer === 'bottom' ? (fitsBelow || !fitsAbove) : !fitsAbove;
    const left = clamp(spMidX - POPOVER_W / 2, EDGE_MARGIN, vw - POPOVER_W - EDGE_MARGIN);
    arrowLeft = clamp(spMidX - left - 12, 12, POPOVER_W - 36);

    if (useBelow) {
      popoverStyle = { top: spBottom + ARROW_H + 4, left, width: POPOVER_W };
      arrowSide = 'top';
    } else {
      popoverStyle = { bottom: vh - spotlight.top + ARROW_H + 4, left, width: POPOVER_W };
      arrowSide = 'bottom';
    }
  } else {
    popoverStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: POPOVER_W };
  }

  const isLast = step === total - 1;

  /* ── Phase-based accent gradient ── */
  const phaseGradients: Record<string, string> = {
    '1': 'from-[#ff4d4d] via-[#ec4899] to-[#c026d3]',
    '2': 'from-blue-600 via-indigo-600 to-violet-700',
    '3': 'from-emerald-600 via-teal-600 to-cyan-600',
    '4': 'from-amber-500 via-orange-500 to-[#ff4d4d]',
  };
  const gradient = phaseGradients[String(tourKey)] ?? phaseGradients['1'];

  return createPortal(
    <>
      {/* ── Dim overlay (blocked by spotlight hole) ── */}
      <div
        className="fixed inset-0 z-[9990] pointer-events-none"
        style={{ background: 'rgba(6,6,20,0.70)', backdropFilter: 'blur(1px)' }}
      />
      {spotlight && (
        <div
          className="fixed z-[9991] pointer-events-none"
          style={{
            top: spotlight.top, left: spotlight.left,
            width: spotlight.width, height: spotlight.height,
            borderRadius: 14,
            boxShadow: '0 0 0 9999px rgba(6,6,20,0.70)',
            outline: '2px solid rgba(255,255,255,0.25)',
          }}
        />
      )}

      {/* ── Global skip button ── */}
      <button
        type="button"
        onClick={close}
        className="fixed top-5 right-5 z-[9993] flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-white/70 backdrop-blur-md hover:bg-white/20 hover:text-white transition-all"
      >
        <X size={12} />
        Passer le tour
      </button>

      {/* ── Popover ── */}
      <div className="fixed z-[9992]" style={popoverStyle}>
        {/* Arrow pointing toward the spotlight */}
        {arrowSide === 'top' && (
          <div className="absolute -top-[9px]" style={{ left: arrowLeft }}>
            <div className="w-0 h-0 border-x-[9px] border-x-transparent border-b-[9px] border-b-white" />
          </div>
        )}
        {arrowSide === 'bottom' && (
          <div className="absolute -bottom-[9px]" style={{ left: arrowLeft }}>
            <div className="w-0 h-0 border-x-[9px] border-x-transparent border-t-[9px] border-t-white" />
          </div>
        )}

        <div className="rounded-2xl bg-white shadow-[0_24px_64px_-12px_rgba(0,0,0,0.55)] overflow-hidden">
          {/* Phase-coloured accent bar */}
          <div className={`h-1 w-full bg-gradient-to-r ${gradient}`} />

          <div className="px-5 pt-4 pb-5">
            {/* Badge */}
            <span className={`inline-block rounded-full bg-gradient-to-r ${gradient} px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-white mb-3`}>
              {current.badge}
            </span>

            {/* Title */}
            <h3 className="text-base font-black text-gray-900 leading-snug mb-1.5">
              {current.title}
            </h3>

            {/* Description */}
            <p className="text-sm text-gray-500 leading-relaxed">
              {current.description}
            </p>

            {/* Footer */}
            <div className="mt-4 flex items-center justify-between">
              {/* Dot indicators */}
              <div className="flex items-center gap-1.5">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-full transition-all duration-300 ${
                      i === step
                        ? `w-5 h-2 bg-gradient-to-r ${gradient}`
                        : i < step
                        ? 'w-2 h-2 bg-gray-300'
                        : 'w-2 h-2 bg-gray-200'
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={close}
                  className="rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Passer
                </button>
                <button
                  type="button"
                  onClick={next}
                  className={`flex items-center gap-1.5 rounded-xl bg-gradient-to-r ${gradient} px-4 py-1.5 text-xs font-black text-white shadow-md hover:-translate-y-px transition-all`}
                >
                  {isLast ? 'Terminer' : 'Suivant'}
                  {!isLast && <ArrowRight size={12} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default OnboardingProductTour;
