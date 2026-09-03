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

type LiveTranscriptPayload = {
  finals: string;
  interim: string;
};

type SpeechRec = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: {
    resultIndex: number;
    results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
  }) => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

interface AudioBriefRecorderProps {
  disabled?: boolean;
  language?: string;
  /** Max recording length in seconds (default 120 = 2 min). */
  maxSeconds?: number;
  /** Snippet currently locked for audio replace (UI hint). */
  replaceSnippet?: string | null;
  /** Live partial + final words while recording. */
  onLiveTranscript?: (payload: LiveTranscriptPayload) => void;
  /** Final text after Stop (live speech and/or Whisper). */
  onTranscript: (text: string) => void;
  onCancel?: () => void;
  onBeforeStart?: () => void;
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

function getSpeechRecognitionCtor(): (new () => SpeechRec) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

function speechLang(language: string): string {
  if (language.toLowerCase().startsWith('fr')) return 'fr-FR';
  if (language.toLowerCase().startsWith('en')) return 'en-US';
  return language;
}

function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Mic control for the gig-creation prompt screen.
 * Live browser STT while recording + Whisper fallback on stop.
 */
export function AudioBriefRecorder({
  disabled,
  language = 'fr',
  maxSeconds = 120,
  replaceSnippet = null,
  onLiveTranscript,
  onTranscript,
  onCancel,
  onBeforeStart,
  onError,
}: AudioBriefRecorderProps) {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [liveFinals, setLiveFinals] = useState('');
  const [liveInterim, setLiveInterim] = useState('');
  const [liveSupported, setLiveSupported] = useState(true);

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
  const recognitionRef = useRef<SpeechRec | null>(null);
  const wantLiveRef = useRef(false);
  const statusRef = useRef<RecorderStatus>('idle');
  const mutedRef = useRef(false);
  const liveFinalsRef = useRef('');
  const liveInterimRef = useRef('');

  statusRef.current = status;
  mutedRef.current = muted;

  const publishLive = (finals: string, interim: string) => {
    setLiveFinals(finals);
    setLiveInterim(interim);
    liveFinalsRef.current = finals;
    liveInterimRef.current = interim;
    onLiveTranscript?.({ finals, interim });
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

  const stopSpeech = (abort = false) => {
    wantLiveRef.current = false;
    const rec = recognitionRef.current;
    if (!rec) return;
    try {
      if (abort) rec.abort();
      else rec.stop();
    } catch {
      /* ignore */
    }
  };

  const startSpeech = () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setLiveSupported(false);
      return;
    }
    setLiveSupported(true);

    // Recreate each start — Chrome can get stuck on reused instances.
    try {
      recognitionRef.current?.abort();
    } catch {
      /* ignore */
    }

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = speechLang(language);

    recognition.onresult = (event) => {
      let finals = '';
      let interim = '';
      for (let i = 0; i < event.results.length; i++) {
        const row = event.results[i];
        const piece = row?.[0]?.transcript || '';
        if (row.isFinal) finals += piece;
        else interim += piece;
      }
      finals = finals.replace(/\s+/g, ' ').trim();
      interim = interim.replace(/\s+/g, ' ').trim();
      publishLive(finals, interim);
    };

    recognition.onerror = (ev) => {
      const code = ev.error || '';
      if (code === 'aborted' || code === 'no-speech') return;
      if (code === 'not-allowed') {
        setLiveSupported(false);
        onError?.('Micro refusé pour la transcription live — Whisper sera utilisé à l’arrêt.');
      }
    };

    recognition.onend = () => {
      // Chrome often stops after a pause — restart while still recording.
      if (
        wantLiveRef.current &&
        statusRef.current === 'recording' &&
        !mutedRef.current
      ) {
        try {
          recognition.start();
        } catch {
          /* already started */
        }
      }
    };

    recognitionRef.current = recognition;
    wantLiveRef.current = true;
    try {
      recognition.start();
    } catch {
      setLiveSupported(false);
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
    stopSpeech(true);
    cleanupStream();
    revokePreview();
    chunksRef.current = [];
    mediaRecorderRef.current = null;
    abortRef.current = null;
    elapsedRef.current = 0;
    liveFinalsRef.current = '';
    liveInterimRef.current = '';
    setElapsed(0);
    setMuted(false);
    setLiveFinals('');
    setLiveInterim('');
    setStatus('idle');
  };

  useEffect(() => {
    return () => {
      discardRef.current = true;
      abortRef.current?.abort();
      wantLiveRef.current = false;
      clearTimer();
      stopSpeech(true);
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
    mutedRef.current = next;
    streamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    // Web Speech uses its own capture path — pause/resume recognition.
    if (next) {
      wantLiveRef.current = false;
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
    } else if (statusRef.current === 'recording') {
      wantLiveRef.current = true;
      try {
        recognitionRef.current?.start();
      } catch {
        startSpeech();
      }
    }
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
    publishLive('', '');

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
      startSpeech();
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
      wantLiveRef.current = false;
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
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
      if (!mutedRef.current) {
        wantLiveRef.current = true;
        try {
          recognitionRef.current?.start();
        } catch {
          startSpeech();
        }
      }
    } catch {
      onError?.('Impossible de reprendre l’enregistrement.');
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    discardRef.current = false;
    clearTimer();
    wantLiveRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
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
    stopSpeech(true);
    revokePreview();
    chunksRef.current = [];
    publishLive('', '');

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
    stopSpeech(true);
    cleanupStream();
    mediaRecorderRef.current = null;

    if (discardRef.current) {
      resetIdle();
      onCancel?.();
      return;
    }

    const liveText = `${liveFinalsRef.current} ${liveInterimRef.current}`
      .replace(/\s+/g, ' ')
      .trim();

    // Prefer live transcript when available (already streaming in the field).
    if (liveText) {
      setLiveInterim('');
      liveInterimRef.current = '';
      setStatus('idle');
      setElapsed(0);
      elapsedRef.current = 0;
      setMuted(false);
      chunksRef.current = [];
      onTranscript(liveText);
      publishLive('', '');
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
      publishLive('', '');
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
  const livePreview = `${liveFinals}${liveInterim ? ` ${liveInterim}` : ''}`.trim();

  if (!showBar) {
    return (
      <button
        type="button"
        disabled={busy}
        onMouseDown={(e) => {
          e.preventDefault();
          onBeforeStart?.();
        }}
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
    <div className="absolute bottom-3 left-4 right-20 flex flex-col items-stretch gap-1.5">
      {active && livePreview ? (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/90 px-3 py-2 text-[12px] text-emerald-900 shadow-sm backdrop-blur-sm">
          <span className="font-black uppercase tracking-wider text-[10px] text-emerald-700">
            Live
          </span>
          <p className="mt-0.5 leading-snug">
            <span className="font-semibold">{liveFinals}</span>
            {liveInterim ? (
              <span className="italic text-emerald-700/80"> {liveInterim}</span>
            ) : null}
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-1.5 rounded-2xl border border-rose-100 bg-white/95 px-2 py-1.5 shadow-xl backdrop-blur-sm">
        {status === 'transcribing' ? (
          <>
            <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-bold text-harx-700">
              <Loader2 className="h-4 w-4 animate-spin" />
              {replaceSnippet ? 'Remplacement…' : 'Transcription Whisper…'}
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
            {!liveSupported ? (
              <span className="rounded-xl bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500">
                Live indisponible → Whisper à l’arrêt
              </span>
            ) : null}

            {replaceSnippet ? (
              <span
                className="max-w-[140px] truncate rounded-xl bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800"
                title={`Remplacera : ${replaceSnippet}`}
              >
                Remplace «{' '}
                {replaceSnippet.length > 24
                  ? `${replaceSnippet.slice(0, 24)}…`
                  : replaceSnippet}{' '}
                »
              </span>
            ) : null}

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
              title="Terminer"
              aria-label="Terminer"
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
    </div>
  );
}
