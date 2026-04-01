'use client';

import { useAppStore } from '@/store/useAppStore';
import { formatTime } from '@/lib/utils';

interface SongCardProps {
  song: {
    id: string;
    title: string;
    artist: string;
    album: string;
    duration: number;
    genre: string;
    filePath: string;
    coverUrl: string;
    lyricsLrc: string;
    lyricsJson: string;
    playCount: number;
    createdAt: string;
  };
  index: number;
}

export default function SongCard({ song, index }: SongCardProps) {
  const {
    setCurrentSong,
    setIsPlaying,
    setCurrentTime,
    setCurrentView,
    setQueue,
    setQueueIndex,
    songs,
    player,
  } = useAppStore();

  const isCurrentSong = player.currentSong?.id === song.id;

  const handlePlay = () => {
    if (isCurrentSong) {
      setIsPlaying(!player.isPlaying);
      return;
    }

    setCurrentSong(song);
    setCurrentTime(0);
    setIsPlaying(true);
    setCurrentView('player');

    // Set queue if not already set
    const songIndex = songs.findIndex((s) => s.id === song.id);
    if (songIndex !== -1) {
      setQueue(songs);
      setQueueIndex(songIndex);
    }
  };

  const hasLyrics = song.lyricsLrc && song.lyricsLrc.trim().length > 0;

  return (
    <div
      className={`group flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all duration-200 hover:bg-accent ${
        isCurrentSong ? 'bg-accent border border-purple-500/30' : ''
      }`}
      onClick={handlePlay}
    >
      {/* Number / Play button */}
      <div className="w-8 text-center flex-shrink-0">
        {isCurrentSong && player.isPlaying ? (
          <div className="flex items-center justify-center gap-0.5">
            <div className="w-0.5 h-4 bg-purple-500 rounded-full animate-pulse" />
            <div className="w-0.5 h-3 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
            <div className="w-0.5 h-5 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
        ) : (
          <span className={`text-sm group-hover:hidden ${isCurrentSong ? 'text-purple-500 font-semibold' : 'text-muted-foreground'}`}>
            {index + 1}
          </span>
        )}
        {!isCurrentSong && (
          <button
            className="hidden group-hover:flex items-center justify-center w-full text-foreground"
            aria-label="Play"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </button>
        )}
      </div>

      {/* Cover */}
      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {song.coverUrl ? (
          <img
            src={`/${song.coverUrl}`}
            alt={song.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-purple-400 text-sm font-bold">
            {song.title.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isCurrentSong ? 'text-purple-400' : 'text-foreground'}`}>
          {song.title}
        </p>
        <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
      </div>

      {/* Badges */}
      <div className="hidden sm:flex items-center gap-2">
        {song.genre && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400">
            {song.genre}
          </span>
        )}
        {hasLyrics && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            Lyrics
          </span>
        )}
      </div>

      {/* Duration */}
      <span className="text-xs text-muted-foreground hidden sm:block w-12 text-right">
        {formatTime(song.duration)}
      </span>

      {/* Play count */}
      <span className="text-xs text-muted-foreground hidden md:flex items-center gap-1 w-16">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        {song.playCount}
      </span>
    </div>
  );
}
