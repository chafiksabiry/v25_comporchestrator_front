import React, { useEffect, useRef, useState } from 'react';
import {
  Loader2,
  Mic,
  MicOff,
  Pause,
  Play,
  Square,
  X,
} from 'lucide-react';
import { transcribeGigAudio } from '../lib/ai';

type RecorderStatus =
  | 'idle'
  | 'recording'
  | 'paused'
  | 'transcribing'
  | 'error';

interface AudioBriefRecorderProps {
  disabled?: boolean;
  language?: string;
  maxSeconds?: number;
  onTranscript: (text: string) => void;
  onCancel?: () => void;
  onError?: (message: string) => void;
}

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t));
}

function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Mic control for the original PrompAI composer layout
 * (absolute next to the send button). Adds pause / mute / cancel / max.
 */
export function AudioBriefRecorder({
  disabled,
  language = 'fr',
  maxSeconds = 120,
  onTranscript,
  onCancel,
  onError,
}: AudioBriefRecorderProps) {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);
  const mimeRef = useRef('audio/webm');
  const discardRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const clearTimer = () => {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const resetIdle = () => {
    clearTimer();
    cleanupStream();
    chunksRef.current = [];
    mediaRecorderRef.current = null;
    abortRef.current = null;
    elapsedRef.current = 0;
    setElapsed(0);
    setMuted(false);
    setStatus('idle');
  };

  useEffect(() => {
    return () => {
      discardRef.current = true;
      abortRef.current?.abort();
      clearTimer();
      cleanupStream();
      try {
        mediaRecorderRef.current?.stop();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const applyMute = (next: boolean) => {
    setMuted(next);
    streamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
  };

  const startTimer = () => {
    clearTimer();
    timerRef.current = window.setInterval(() => {
      elapsedRef.current += 1;
      const next = elapsedRef.current;
      setElapsed(next);
      if (next >= maxSeconds) stopRecording();
    }, 1000);
  };

  const startRecording = async () => {
    if (disabled || status === 'recording' || status === 'paused' || status === 'transcribing') {
      return;
    }
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      onError?.('Enregistrement audio non supporté sur ce navigateur.');
      setStatus('error');
      return;
    }

    discardRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mimeRef.current = recorder.mimeType || mimeType || 'audio/webm';
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        void handleRecorderStopped();
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      elapsedRef.current = 0;
      setElapsed(0);
      setMuted(false);
      setStatus('recording');
      startTimer();
    } catch (err) {
      cleanupStream();
      onError?.(
        err instanceof Error
          ? err.message
          : "Impossible d'accéder au micro. Vérifiez les permissions."
      );
      setStatus('error');
    }
  };

  const pauseRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== 'recording') return;
    try {
      recorder.pause();
      clearTimer();
      setStatus('paused');
    } catch {
      onError?.('Pause non supportée sur ce navigateur.');
    }
  };

  const resumeRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== 'paused') return;
    if (elapsedRef.current >= maxSeconds) {
      stopRecording();
      return;
    }
    try {
      recorder.resume();
      setStatus('recording');
      startTimer();
    } catch {
      onError?.('Impossible de reprendre l’enregistrement.');
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    discardRef.current = false;
    clearTimer();
    try {
      recorder.stop();
    } catch {
      cleanupStream();
      setStatus('idle');
    }
  };

  const cancelAudio = () => {
    discardRef.current = true;
    abortRef.current?.abort();
    abortRef.current = null;
    clearTimer();
    chunksRef.current = [];

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        resetIdle();
        onCancel?.();
      }
    } else {
      resetIdle();
      onCancel?.();
    }
  };

  const handleRecorderStopped = async () => {
    clearTimer();
    cleanupStream();
    mediaRecorderRef.current = null;

    if (discardRef.current) {
      resetIdle();
      onCancel?.();
      return;
    }

    const blob = new Blob(chunksRef.current, { type: mimeRef.current });
    chunksRef.current = [];
    if (!blob.size) {
      setStatus('error');
      onError?.('Enregistrement vide — réessayez.');
      return;
    }

    const abort = new AbortController();
    abortRef.current = abort;
    setStatus('transcribing');

    try {
      const text = await transcribeGigAudio(blob, { language, signal: abort.signal });
      if (discardRef.current || abort.signal.aborted) {
        resetIdle();
        onCancel?.();
        return;
      }
      abortRef.current = null;
      setStatus('idle');
      setElapsed(0);
      elapsedRef.current = 0;
      setMuted(false);
      onTranscript(text);
    } catch (err) {
      if (discardRef.current || (err instanceof DOMException && err.name === 'AbortError')) {
        resetIdle();
        onCancel?.();
        return;
      }
      setStatus('error');
      onError?.(err instanceof Error ? err.message : 'Échec de la transcription audio.');
    }
  };

  const busy = status === 'transcribing' || disabled;
  const active = status === 'recording' || status === 'paused';
  const remaining = Math.max(0, maxSeconds - elapsed);
  const nearMax = remaining <= 10 && active;

  if (!active && status !== 'transcribing') {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => void startRecording()}
        className="absolute bottom-4 right-20 p-4 bg-white text-harx-600 border border-harx-100 rounded-2xl hover:bg-harx-50 hover:scale-105 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed transition-all duration-300 shadow-lg"
        title={`Enregistrer (max ${formatElapsed(maxSeconds)})`}
        aria-label="Enregistrer un brief audio"
      >
        <Mic className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="absolute bottom-3 left-3 right-20 flex flex-wrap items-center gap-1.5 rounded-2xl border border-harx-100 bg-white/95 px-2 py-1.5 shadow-lg backdrop-blur-sm">
      {status === 'transcribing' ? (
        <>
          <span className="inline-flex items-center gap-2 px-2 py-1.5 text-xs font-bold text-harx-700">
            <Loader2 className="h-4 w-4 animate-spin" />
            Transcription…
          </span>
          <button
            type="button"
            onClick={cancelAudio}
            className="ml-auto inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-black text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
          >
            <X className="h-3.5 w-3.5" />
            Annuler
          </button>
        </>
      ) : (
        <>
          <span
            className={`inline-flex items-center gap-1.5 rounded-xl px-2 py-1 text-[11px] font-black tabular-nums ${
              nearMax ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-700'
            }`}
          >
            {status === 'recording' && (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
              </span>
            )}
            {formatElapsed(elapsed)}
            <span className="font-semibold text-slate-400">/ {formatElapsed(maxSeconds)}</span>
          </span>

          {status === 'recording' ? (
            <button
              type="button"
              onClick={pauseRecording}
              className="rounded-xl p-2 text-slate-700 hover:bg-slate-100"
              title="Pause"
            >
              <Pause className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={resumeRecording}
              className="rounded-xl p-2 text-emerald-700 hover:bg-emerald-50"
              title="Reprendre"
            >
              <Play className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => applyMute(!muted)}
            className={`rounded-xl p-2 ${
              muted ? 'bg-amber-50 text-amber-700' : 'text-slate-700 hover:bg-slate-100'
            }`}
            title={muted ? 'Réactiver le micro' : 'Couper le micro'}
          >
            {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={stopRecording}
            className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-2.5 py-2 text-[11px] font-black text-white hover:bg-rose-700"
            title="Terminer et transcrire"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
            Stop
          </button>

          <button
            type="button"
            onClick={cancelAudio}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-black text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
            title="Annuler"
          >
            <X className="h-3.5 w-3.5" />
            Annuler
          </button>
        </>
      )}
    </div>
  );
}
