import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Mic, Square } from 'lucide-react';
import { transcribeGigAudio } from '../lib/ai';

type RecorderStatus = 'idle' | 'recording' | 'transcribing' | 'error';

interface AudioBriefRecorderProps {
  disabled?: boolean;
  language?: string;
  /** Called with Whisper transcript; parent fills the prompt and can auto-generate. */
  onTranscript: (text: string) => void;
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
 * Record → stop → Whisper transcription → parent receives text.
 */
export function AudioBriefRecorder({
  disabled,
  language = 'fr',
  onTranscript,
  onError,
}: AudioBriefRecorderProps) {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [elapsed, setElapsed] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

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

  useEffect(() => {
    return () => {
      clearTimer();
      cleanupStream();
      try {
        mediaRecorderRef.current?.stop();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const startRecording = async () => {
    if (disabled || status === 'recording' || status === 'transcribing') return;
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      const msg = 'Enregistrement audio non supporté sur ce navigateur.';
      setStatus('error');
      onError?.(msg);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        void handleStop();
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setElapsed(0);
      setStatus('recording');
      clearTimer();
      timerRef.current = window.setInterval(() => {
        setElapsed((v) => v + 1);
      }, 1000);
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

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    clearTimer();
    try {
      recorder.stop();
    } catch {
      cleanupStream();
      setStatus('idle');
    }
  };

  const handleStop = async () => {
    clearTimer();
    cleanupStream();
    const mime =
      mediaRecorderRef.current?.mimeType ||
      pickMimeType() ||
      'audio/webm';
    mediaRecorderRef.current = null;

    const blob = new Blob(chunksRef.current, { type: mime });
    chunksRef.current = [];

    if (!blob.size) {
      setStatus('error');
      onError?.('Enregistrement vide — réessayez.');
      return;
    }

    setStatus('transcribing');
    try {
      const text = await transcribeGigAudio(blob, { language });
      setStatus('idle');
      onTranscript(text);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Échec de la transcription audio.';
      setStatus('error');
      onError?.(msg);
    }
  };

  const busy = status === 'transcribing' || disabled;

  if (status === 'recording') {
    return (
      <button
        type="button"
        onClick={stopRecording}
        className="absolute bottom-4 right-20 flex items-center gap-2 px-3 py-3 bg-rose-600 text-white rounded-2xl hover:bg-rose-700 transition-all duration-300 shadow-xl shadow-rose-500/25"
        title="Arrêter l'enregistrement"
        aria-label="Arrêter l'enregistrement"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-70" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
        </span>
        <Square className="w-5 h-5 fill-current" />
        <span className="text-xs font-black tabular-nums">{formatElapsed(elapsed)}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void startRecording()}
      className="absolute bottom-4 right-20 p-4 bg-white text-harx-600 border border-harx-100 rounded-2xl hover:bg-harx-50 hover:scale-105 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed transition-all duration-300 shadow-lg"
      title="Enregistrer un brief audio"
      aria-label="Enregistrer un brief audio"
    >
      {status === 'transcribing' ? (
        <Loader2 className="w-6 h-6 animate-spin" />
      ) : (
        <Mic className="w-6 h-6" />
      )}
    </button>
  );
}
