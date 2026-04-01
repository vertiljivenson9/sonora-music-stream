'use client';

import { useEffect, useRef } from 'react';
import { useAppStore, LyricLine } from '@/store/useAppStore';
import { safeJsonParse } from '@/lib/utils';

export default function LyricsDisplay() {
  const { player, liveTranscript, isLiveTranscribing } = useAppStore();
  const { currentSong, currentTime } = player;
  const activeLineRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const lyrics: LyricLine[] = safeJsonParse<LyricLine[]>(currentSong?.lyricsJson || '[]', []);

  // Find active line
  const activeIndex = lyrics.findIndex((line, index) => {
    const nextLine = lyrics[index + 1];
    return currentTime >= line.time && (nextLine ? currentTime < nextLine.time : true);
  });

  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      const container = containerRef.current;
      const line = activeLineRef.current;
      const containerRect = container.getBoundingClientRect();
      const lineRect = line.getBoundingClientRect();

      const scrollPosition = lineRect.top - containerRect.top - containerRect.height / 3;
      container.scrollTo({
        top: container.scrollTop + scrollPosition,
        behavior: 'smooth',
      });
    }
  }, [activeIndex]);

  if (!currentSong) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Letras</h2>
        {isLiveTranscribing && (
          <span className="flex items-center gap-1.5 text-xs text-purple-400">
            <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
            Transcribiendo en vivo
          </span>
        )}
      </div>

      {/* Lyrics content */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-6 py-8 relative">
        {lyrics.length > 0 ? (
          <div className="space-y-6">
            {lyrics.map((line, index) => (
              <div
                key={index}
                ref={index === activeIndex ? activeLineRef : null}
                className={`text-center transition-all duration-500 ease-out ${
                  index === activeIndex
                    ? 'text-2xl font-bold text-foreground scale-105'
                    : index < activeIndex
                    ? 'text-lg text-muted-foreground/50'
                    : 'text-lg text-muted-foreground/70'
                }`}
              >
                {line.text}
              </div>
            ))}
          </div>
        ) : isLiveTranscribing ? (
          <div className="space-y-4">
            <p className="text-center text-muted-foreground text-sm mb-8">
              La transcripción en tiempo real aparecerá aquí...
            </p>
            {liveTranscript ? (
              <p className="text-center text-xl font-medium text-foreground leading-relaxed">
                {liveTranscript}
              </p>
            ) : (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-4">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-30">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            <div>
              <p className="font-medium">Sin letras disponibles</p>
              <p className="text-sm mt-1">
                Sube letras en formato LRC desde el panel de administración,
                o activa la transcripción en vivo.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
