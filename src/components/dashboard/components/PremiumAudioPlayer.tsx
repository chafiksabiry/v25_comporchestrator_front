import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, RotateCcw } from 'lucide-react';

interface PremiumAudioPlayerProps {
  url: string;
}

export function PremiumAudioPlayer({ url }: PremiumAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [waveform, setWaveform] = useState<number[]>([]);

  useEffect(() => {
    const segments = 60;
    const data = [];
    const seed = url.length;
    for (let i = 0; i < segments; i++) {
      const val = Math.abs(Math.sin(seed + i * 0.2) * 0.5 + Math.random() * 0.5);
      data.push(Math.max(0.1, val));
    }
    setWaveform(data);
  }, [url]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (audioRef.current && duration) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      audioRef.current.currentTime = percentage * duration;
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-xl rounded-3xl p-4 border border-white/10 shadow-2xl flex items-center gap-6 w-full group">
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      <button
        onClick={togglePlay}
        className="w-12 h-12 rounded-2xl bg-gradient-to-br from-harx-500 to-harx-alt-500 text-white flex items-center justify-center shadow-lg shadow-harx-500/20 hover:scale-110 transition-all shrink-0"
      >
        {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
      </button>

      <div className="flex-1 flex flex-col gap-2">
        <div 
          className="h-12 flex items-end gap-1 cursor-pointer relative"
          onClick={handleSeek}
        >
          {waveform.map((val, i) => {
            const progress = (currentTime / duration) || 0;
            const isPlayed = (i / waveform.length) < progress;
            return (
              <div
                key={i}
                className={`flex-1 rounded-full transition-all duration-300 ${
                  isPlayed ? 'bg-harx-500' : 'bg-slate-700'
                }`}
                style={{ height: `${val * 100}%` }}
              ></div>
            );
          })}
        </div>
        
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
          <span>{formatTime(currentTime)}</span>
          <div className="flex items-center gap-2">
            <Volume2 className="w-3 h-3" />
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      <button 
        onClick={() => { if(audioRef.current) audioRef.current.currentTime = 0 }}
        className="p-2 text-slate-500 hover:text-white transition-colors"
      >
        <RotateCcw className="w-4 h-4" />
      </button>
    </div>
  );
}
