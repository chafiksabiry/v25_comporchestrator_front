import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, X } from 'lucide-react';

const TOUR_STORAGE_KEY = 'harx_product_tour_v1';

export function hasSeenProductTour(): boolean {
  try { return localStorage.getItem(TOUR_STORAGE_KEY) === 'true'; } catch { return false; }
}
export function markProductTourSeen(): void {
  try { localStorage.setItem(TOUR_STORAGE_KEY, 'true'); } catch { /* noop */ }
}

export interface TourStep {
  /** Must match a `data-tour="..."` attribute in the DOM */
  target: string;
  badge: string;
  title: string;
  description: string;
  /** Preferred side for the popover — auto-corrected when near viewport edges */
  prefer?: 'top' | 'bottom' | 'left' | 'right';
}

interface Props {
  steps: TourStep[];
  onDone?: () => void;
}

const SPOTLIGHT_PAD = 10;
const POPOVER_W = 340;
const ARROW_H = 10;
const EDGE_MARGIN = 16;

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

const OnboardingProductTour: React.FC<Props> = ({ steps, onDone }) => {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [visible, setVisible] = useState(true);

  const total = steps.length;
  const current = steps[step];

  const measureTarget = useCallback(() => {
    if (!current) return;
    const el = document.querySelector<HTMLElement>(`[data-tour="${current.target}"]`);
    if (el) {
      setRect(el.getBoundingClientRect());
    } else {
      setRect(null);
    }
  }, [current]);

  useEffect(() => {
    if (!visible) return;
    measureTarget();
    window.addEventListener('resize', measureTarget);
    window.addEventListener('scroll', measureTarget, true);
    return () => {
      window.removeEventListener('resize', measureTarget);
      window.removeEventListener('scroll', measureTarget, true);
    };
  }, [visible, measureTarget]);

  const close = useCallback(() => {
    markProductTourSeen();
    setVisible(false);
    onDone?.();
  }, [onDone]);

  const next = useCallback(() => {
    if (step >= total - 1) {
      close();
    } else {
      setStep(s => s + 1);
    }
  }, [step, total, close]);

  if (!visible || !current) return null;

  /* ── Spotlight geometry ── */
  const spotlight = rect
    ? {
        top: rect.top - SPOTLIGHT_PAD,
        left: rect.left - SPOTLIGHT_PAD,
        width: rect.width + SPOTLIGHT_PAD * 2,
        height: rect.height + SPOTLIGHT_PAD * 2,
      }
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

    const fitsBelow = spBottom + ARROW_H + EDGE_MARGIN < vh - 200;
    const fitsAbove = spotlight.top - ARROW_H - EDGE_MARGIN > 200;

    let useBelow = prefer === 'bottom' ? fitsBelow || !fitsAbove : !fitsAbove;

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
    /* No target found — center the card */
    popoverStyle = {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: POPOVER_W,
    };
  }

  const isLast = step === total - 1;

  return createPortal(
    <>
      {/* ── Overlay + spotlight cutout ── */}
      <div
        className="fixed inset-0 z-[9990] pointer-events-none"
        style={{ background: 'rgba(6,6,20,0.72)', backdropFilter: 'blur(1px)' }}
      />
      {spotlight && (
        <div
          className="fixed z-[9991] pointer-events-none rounded-[14px] ring-2 ring-white/30"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
            boxShadow: '0 0 0 9999px rgba(6,6,20,0.72)',
            borderRadius: 14,
          }}
        />
      )}

      {/* ── Skip button (top-right) ── */}
      <button
        type="button"
        onClick={close}
        className="fixed top-5 right-5 z-[9993] flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-white/70 backdrop-blur-md hover:bg-white/20 hover:text-white transition-all"
      >
        <X size={12} />
        Passer le tour
      </button>

      {/* ── Popover card ── */}
      <div
        className="fixed z-[9992] select-none"
        style={popoverStyle}
      >
        {/* Arrow — points toward target */}
        {arrowSide === 'top' && (
          <div
            className="absolute -top-[9px]"
            style={{ left: arrowLeft }}
          >
            <div className="w-0 h-0 border-x-[9px] border-x-transparent border-b-[9px] border-b-white" />
          </div>
        )}
        {arrowSide === 'bottom' && (
          <div
            className="absolute -bottom-[9px]"
            style={{ left: arrowLeft }}
          >
            <div className="w-0 h-0 border-x-[9px] border-x-transparent border-t-[9px] border-t-white" />
          </div>
        )}

        {/* Card body */}
        <div className="rounded-2xl bg-white shadow-[0_24px_64px_-12px_rgba(0,0,0,0.55)] overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1 w-full bg-gradient-to-r from-[#ff4d4d] via-[#ec4899] to-[#c026d3]" />

          <div className="px-5 pt-4 pb-5">
            {/* Badge */}
            <span className="inline-block rounded-full bg-gradient-to-r from-[#ff4d4d] to-[#c026d3] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-white mb-3">
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
                        ? 'w-5 h-2 bg-gradient-to-r from-[#ff4d4d] to-[#c026d3]'
                        : i < step
                        ? 'w-2 h-2 bg-gray-300'
                        : 'w-2 h-2 bg-gray-200'
                    }`}
                  />
                ))}
              </div>

              {/* Buttons */}
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
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#ff4d4d] to-[#c026d3] px-4 py-1.5 text-xs font-black text-white shadow-md shadow-pink-500/30 hover:shadow-pink-500/50 hover:-translate-y-px transition-all"
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
