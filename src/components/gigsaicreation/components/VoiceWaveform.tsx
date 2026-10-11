import React, { useEffect, useRef } from 'react';

type VoiceWaveformProps = {
  stream: MediaStream | null;
  /** Animate from mic levels when true; idle pulse when false (paused). */
  active: boolean;
  muted?: boolean;
  className?: string;
  barCount?: number;
};

/**
 * Live mic waveform (AnalyserNode) for the gig dictation UI.
 */
export function VoiceWaveform({
  stream,
  active,
  muted = false,
  className = '',
  barCount = 40,
}: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const levelsRef = useRef<number[]>(Array.from({ length: barCount }, () => 0.08));
  const activeRef = useRef(active);
  const mutedRef = useRef(muted);

  activeRef.current = active;
  mutedRef.current = muted;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !stream) return;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const audioCtx = new AudioCtx();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.72;

    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);
    // Do not connect to destination — avoid feedback/echo.

    void audioCtx.resume().catch(() => undefined);

    const data = new Uint8Array(analyser.frequencyBinCount);

    const draw = () => {
      const c = canvasRef.current;
      if (!c) return;

      const isActive = activeRef.current;
      const isMuted = mutedRef.current;

      const dpr = window.devicePixelRatio || 1;
      const cssW = c.clientWidth || 280;
      const cssH = c.clientHeight || 48;
      if (c.width !== Math.floor(cssW * dpr) || c.height !== Math.floor(cssH * dpr)) {
        c.width = Math.floor(cssW * dpr);
        c.height = Math.floor(cssH * dpr);
      }
      const g = c.getContext('2d');
      if (!g) return;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, cssW, cssH);

      analyser.getByteFrequencyData(data);

      const bars = barCount;
      const gap = 2;
      const barW = Math.max(2, (cssW - gap * (bars - 1)) / bars);
      const step = Math.max(1, Math.floor(data.length / bars));
      const mid = cssH / 2;

      for (let i = 0; i < bars; i++) {
        let sum = 0;
        const from = i * step;
        for (let j = 0; j < step && from + j < data.length; j++) {
          sum += data[from + j] || 0;
        }
        const raw = sum / (step * 255);
        const boosted = Math.min(1, Math.pow(raw, 0.75) * 1.35);

        let target = 0.06;
        if (isActive && !isMuted) {
          target = 0.08 + boosted * 0.92;
        } else if (isActive && isMuted) {
          target = 0.05;
        } else {
          target = 0.1 + 0.04 * Math.sin(Date.now() / 400 + i * 0.35);
        }

        const prev = levelsRef.current[i] ?? 0.08;
        const next = prev * 0.55 + target * 0.45;
        levelsRef.current[i] = next;

        const h = Math.max(3, next * (cssH - 4));
        const x = i * (barW + gap);
        const y = mid - h / 2;

        const grad = g.createLinearGradient(0, y, 0, y + h);
        if (isMuted) {
          grad.addColorStop(0, '#94a3b8');
          grad.addColorStop(1, '#cbd5e1');
        } else if (!isActive) {
          grad.addColorStop(0, '#fb7185');
          grad.addColorStop(1, '#fda4af');
        } else {
          grad.addColorStop(0, '#e11d48');
          grad.addColorStop(0.55, '#f43f5e');
          grad.addColorStop(1, '#fb7185');
        }

        g.fillStyle = grad;
        const radius = Math.min(barW / 2, 3);
        roundRect(g, x, y, barW, h, radius);
        g.fill();
      }

      rafRef.current = window.requestAnimationFrame(draw);
    };

    rafRef.current = window.requestAnimationFrame(draw);

    return () => {
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      try {
        source.disconnect();
      } catch {
        /* ignore */
      }
      try {
        analyser.disconnect();
      } catch {
        /* ignore */
      }
      void audioCtx.close().catch(() => undefined);
    };
  }, [stream, barCount]);

  if (!stream) return null;

  return (
    <canvas
      ref={canvasRef}
      className={`h-12 w-full rounded-xl bg-gradient-to-b from-rose-50 to-white ${className}`}
      aria-hidden
    />
  );
}

function roundRect(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + radius, y);
  g.arcTo(x + w, y, x + w, y + h, radius);
  g.arcTo(x + w, y + h, x, y + h, radius);
  g.arcTo(x, y + h, x, y, radius);
  g.arcTo(x, y, x + w, y, radius);
  g.closePath();
}
