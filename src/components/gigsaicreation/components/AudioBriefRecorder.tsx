import React, { useEffect, useRef, useState } from 'react';
import {
  Loader2,
  Mic,
  MicOff,
  Pause,
  Play,
  Square,
  X,
  VolumeX,
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
  /** Max recording length in seconds (default 120 = 2 min). */
  maxSeconds?: number;
  /** Called with Whisper transcript — parent only fills the input (no auto-generate). */
  onTranscript: (text: string) => void;
  /** Called when user cancels recording / transcription (parent can clear input). */
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
 * Mic control for the gig-creation prompt screen.
 * Record / pause / mute / cancel / max duration → Whisper → fill input only.
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const mimeRef = useRef('audio/webm');
  const discardRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const previewUrlRef = useRef<string | null>(null);

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

  const revokePreview = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
    setPreviewPlaying(false);
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
  };

  const resetIdle = () => {
    clearTimer();
    cleanupStream();
    revokePreview();
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
      revokePreview();
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
      const msg = 'Enregistrement audio non supporté sur ce navigateur.';
      setStatus('error');
      onError?.(msg);
      return;
    }

    revokePreview();
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
      const msg =
        err instanceof Error
          ? err.message
          : "Impossible d'accéder au micro. Vérifiez les permissions.";
      setStatus('error');
      onError?.(msg);
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

  /** Cancel at any stage: recording, paused, or transcribing. */
  const cancelAudio = () => {
    discardRef.current = true;
    abortRef.current?.abort();
    abortRef.current = null;
    clearTimer();
    revokePreview();
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

    const url = URL.createObjectURL(blob);
    previewUrlRef.current = url;
    setPreviewUrl(url);

    const abort = new AbortController();
    abortRef.current = abort;
    setStatus('transcribing');

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
      revokePreview();
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
      const msg =
        err instanceof Error ? err.message : 'Échec de la transcription audio.';
      setStatus('error');
      onError?.(msg);
    }
  };

  const togglePreview = () => {
    if (!previewUrl) return;
    if (!previewAudioRef.current) {
      const audio = new Audio(previewUrl);
      audio.onended = () => setPreviewPlaying(false);
      previewAudioRef.current = audio;
    }
    const audio = previewAudioRef.current;
    if (previewPlaying) {
      audio.pause();
      setPreviewPlaying(false);
    } else {
      void audio.play().then(() => setPreviewPlaying(true)).catch(() => {
        onError?.('Lecture audio impossible.');
      });
    }
  };

  const busy = status === 'transcribing' || disabled;
  const active = status === 'recording' || status === 'paused';
  const remaining = Math.max(0, maxSeconds - elapsed);
  const nearMax = remaining <= 10 && active;
  const showBar = active || status === 'transcribing';

  if (!showBar) {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => void startRecording()}
        className="absolute bottom-4 right-20 p-4 bg-white text-harx-600 border border-harx-100 rounded-2xl hover:bg-harx-50 hover:scale-105 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed transition-all duration-300 shadow-lg"
        title={`Enregistrer un brief audio (max ${formatElapsed(maxSeconds)})`}
        aria-label="Enregistrer un brief audio"
      >
        <Mic className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="absolute bottom-3 right-20 left-4 sm:left-auto sm:right-20 flex flex-wrap items-center justify-end gap-1.5 rounded-2xl border border-rose-100 bg-white/95 px-2 py-1.5 shadow-xl backdrop-blur-sm">
      {status === 'transcribing' ? (
        <>
          <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-bold text-harx-700">
            <Loader2 className="h-4 w-4 animate-spin" />
            Transcription…
          </div>
          <button
            type="button"
            onClick={cancelAudio}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-black text-slate-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
            title="Annuler la transcription"
            aria-label="Annuler la transcription"
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
            title={`Maximum ${formatElapsed(maxSeconds)}`}
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
              aria-label="Pause"
            >
              <Pause className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={resumeRecording}
              className="rounded-xl p-2 text-emerald-700 hover:bg-emerald-50"
              title="Reprendre"
              aria-label="Reprendre"
            >
              <Play className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => applyMute(!muted)}
            className={`rounded-xl p-2 hover:bg-slate-100 ${
              muted ? 'text-amber-700 bg-amber-50' : 'text-slate-700'
            }`}
            title={muted ? 'Réactiver le micro' : 'Couper le micro'}
            aria-label={muted ? 'Réactiver le micro' : 'Couper le micro'}
          >
            {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>

          {previewUrl ? (
            <button
              type="button"
              onClick={togglePreview}
              className="rounded-xl p-2 text-slate-700 hover:bg-slate-100"
              title={previewPlaying ? 'Pause lecture' : 'Écouter l’aperçu'}
              aria-label={previewPlaying ? 'Pause lecture' : 'Écouter l’aperçu'}
            >
              {previewPlaying ? <VolumeX className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
          ) : null}

          <button
            type="button"
            onClick={stopRecording}
            className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-2.5 py-2 text-[11px] font-black text-white hover:bg-rose-700"
            title="Terminer et transcrire"
            aria-label="Terminer et transcrire"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
            Stop
          </button>

          <button
            type="button"
            onClick={cancelAudio}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-black text-slate-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
            title="Annuler l’enregistrement"
            aria-label="Annuler l’enregistrement"
          >
            <X className="h-3.5 w-3.5" />
            Annuler
          </button>
        </>
      )}
    </div>
  );
}
