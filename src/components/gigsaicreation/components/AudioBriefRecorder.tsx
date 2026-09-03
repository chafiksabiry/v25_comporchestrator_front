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

export type RecorderStatus =
  | 'idle'
  | 'recording'
  | 'paused'
  | 'transcribing'
  | 'error';

interface AudioBriefRecorderProps {
  disabled?: boolean;
  language?: string;
  maxSeconds?: number;
  /** Hint shown next to the mic when idle (e.g. replace selection vs append). */
  modeHint?: string;
  onTranscript: (text: string) => void;
  onCancel?: () => void;
  onError?: (message: string) => void;
  onStatusChange?: (status: RecorderStatus) => void;
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
 * Professional audio dock for gig brief dictation.
 * Lives under the composer (not floating over the textarea).
 */
export function AudioBriefRecorder({
  disabled,
  language = 'fr',
  maxSeconds = 120,
  modeHint,
  onTranscript,
  onCancel,
  onError,
  onStatusChange,
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

  const setRecorderStatus = (next: RecorderStatus) => {
    setStatus(next);
    onStatusChange?.(next);
  };

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
    setRecorderStatus('idle');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (next >= maxSeconds) {
        stopRecording();
      }
    }, 1000);
  };

  const startRecording = async () => {
    if (disabled || status === 'recording' || status === 'paused' || status === 'transcribing') {
      return;
    }
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      onError?.('Enregistrement audio non supporté sur ce navigateur.');
      setRecorderStatus('error');
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
      setRecorderStatus('recording');
      startTimer();
    } catch (err) {
      cleanupStream();
      onError?.(
        err instanceof Error
          ? err.message
          : "Impossible d'accéder au micro. Vérifiez les permissions."
      );
      setRecorderStatus('error');
    }
  };

  const pauseRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== 'recording') return;
    try {
      recorder.pause();
      clearTimer();
      setRecorderStatus('paused');
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
      setRecorderStatus('recording');
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
      setRecorderStatus('idle');
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
      setRecorderStatus('error');
      onError?.('Enregistrement vide — réessayez.');
      return;
    }

    const abort = new AbortController();
    abortRef.current = abort;
    setRecorderStatus('transcribing');

    try {
      const text = await transcribeGigAudio(blob, {
        language,
        signal: abort.signal,
      });
      if (discardRef.current || abort.signal.aborted) {
        resetIdle();
        onCancel?.();
        return;
      }
      abortRef.current = null;
      setRecorderStatus('idle');
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
      setRecorderStatus('error');
      onError?.(err instanceof Error ? err.message : 'Échec de la transcription audio.');
    }
  };

  const active = status === 'recording' || status === 'paused';
  const remaining = Math.max(0, maxSeconds - elapsed);
  const nearMax = remaining <= 10 && active;
  const progress = Math.min(100, (elapsed / maxSeconds) * 100);

  if (status === 'idle' || status === 'error') {
    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => void startRecording()}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          title={`Dicter (max ${formatElapsed(maxSeconds)})`}
          aria-label="Dicter un brief audio"
        >
          <Mic className="h-5 w-5" />
        </button>
        {modeHint ? (
          <p className="text-[11px] font-medium leading-snug text-slate-500">{modeHint}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
      <div className="mb-2 h-1 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all ${
            nearMax ? 'bg-rose-500' : status === 'paused' ? 'bg-amber-500' : 'bg-slate-800'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto flex min-w-0 items-center gap-2">
          {status === 'transcribing' ? (
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Transcription en cours…
            </span>
          ) : (
            <>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
                  status === 'paused'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {status === 'recording' && (
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-70" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-500" />
                  </span>
                )}
                {status === 'paused' ? 'En pause' : 'Enregistrement'}
              </span>
              <span
                className={`text-xs font-bold tabular-nums ${
                  nearMax ? 'text-rose-700' : 'text-slate-700'
                }`}
              >
                {formatElapsed(elapsed)}
                <span className="font-medium text-slate-400"> / {formatElapsed(maxSeconds)}</span>
              </span>
            </>
          )}
        </div>

        {status !== 'transcribing' ? (
          <>
            {status === 'recording' ? (
              <button
                type="button"
                onClick={pauseRecording}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
              >
                <Pause className="h-3.5 w-3.5" />
                Pause
              </button>
            ) : (
              <button
                type="button"
                onClick={resumeRecording}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100"
              >
                <Play className="h-3.5 w-3.5" />
                Reprendre
              </button>
            )}

            <button
              type="button"
              onClick={() => applyMute(!muted)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-[11px] font-bold ${
                muted
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {muted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
              {muted ? 'Muet' : 'Micro'}
            </button>

            <button
              type="button"
              onClick={stopRecording}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-slate-900 px-3 text-[11px] font-bold text-white hover:bg-slate-800"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              Terminer
            </button>
          </>
        ) : null}

        <button
          type="button"
          onClick={cancelAudio}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
        >
          <X className="h-3.5 w-3.5" />
          Annuler
        </button>
      </div>
    </div>
  );
}
