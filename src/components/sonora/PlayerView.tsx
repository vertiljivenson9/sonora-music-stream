'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import AudioVisualizer from './AudioVisualizer';
import LyricsDisplay from './LyricsDisplay';
import LiveTranscriber from './LiveTranscriber';
import { formatTime, safeJsonParse } from '@/lib/utils';

export default function PlayerView() {
  const { player, setCurrentView, setVolume } = useAppStore();
  const { currentSong, isPlaying, currentTime, duration, volume } = player;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const audio = document.querySelector('audio');
    if (audio && duration > 0) {
      audio.currentTime = percentage * duration;
    }
  };

  if (!currentSong) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-center">
        <div>
          <svg className="mx-auto mb-4 text-muted-foreground" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
          <p className="text-muted-foreground">No hay canción seleccionada</p>
          <button
            onClick={() => setCurrentView('library')}
            className="mt-4 text-purple-400 hover:text-purple-300 text-sm"
          >
            Ir a la biblioteca →
          </button>
        </div>
      </div>
    );
  }

  const lyrics: { time: number; text: string }[] = safeJsonParse(currentSong.lyricsJson || '[]', []);
  const activeIndex = lyrics.findIndex((line, index) => {
    const nextLine = lyrics[index + 1];
    return currentTime >= line.time && (nextLine ? currentTime < nextLine.time : true);
  });

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto px-4 py-6">
      {/* Left: Song info + visualizer */}
      <div className="flex-1 flex flex-col items-center">
        {/* Album art */}
        <div className="relative mb-6">
          <div className={`w-56 h-56 sm:w-72 sm:h-72 rounded-2xl overflow-hidden shadow-2xl ${
            isPlaying ? 'animate-[spin_20s_linear_infinite]' : ''
          }`} style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}>
            {currentSong.coverUrl ? (
              <img
                src={`/${currentSong.coverUrl}`}
                alt={currentSong.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center">
                <span className="text-6xl text-white/90 font-bold">
                  {currentSong.title.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          {/* Center hole for vinyl effect */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-card border-4 border-border flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-purple-500" />
          </div>
        </div>

        {/* Song details */}
        <div className="text-center mb-4 w-full max-w-sm">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">{currentSong.title}</h1>
          <p className="text-muted-foreground mt-1">{currentSong.artist}</p>
          {currentSong.album && (
            <p className="text-sm text-muted-foreground/70 mt-0.5">{currentSong.album}</p>
          )}
        </div>

        {/* Visualizer */}
        <div className="w-full max-w-sm h-20 mb-4">
          <AudioVisualizer />
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-sm space-y-2">
          <div
            className="h-2 w-full bg-muted rounded-full cursor-pointer group"
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-100 relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mt-2">
          {/* Live transcribe button (visible on mobile) */}
          <div className="lg:hidden">
            <LiveTranscriber />
          </div>
        </div>
      </div>

      {/* Right: Lyrics */}
      <div className="flex-1 max-w-lg w-full">
        <div className="bg-card border border-border rounded-2xl h-[500px] lg:h-[600px] overflow-hidden flex flex-col">
          <LyricsDisplay />
        </div>
      </div>
    </div>
  );
}
