'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import SongCard from './SongCard';
import { useDebounce } from '@/hooks/useDebounce';

export default function MusicLibrary() {
  const { songs, setSongs, searchQuery, setSearchQuery } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  const debouncedQuery = useDebounce(searchQuery, 300);

  const fetchSongs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/songs');
      const data = await res.json();
      if (data.songs) {
        setSongs(data.songs);
      } else if (Array.isArray(data)) {
        setSongs(data);
      }
    } catch (error) {
      console.error('Error fetching songs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSongs();
  }, []);

  const filteredSongs = useMemo(() => {
    if (!searchQuery.trim()) return songs;
    const q = debouncedQuery.toLowerCase();
    return songs.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        s.album.toLowerCase().includes(q) ||
        s.genre.toLowerCase().includes(q)
    );
  }, [songs, debouncedQuery]);

  const totalDuration = useMemo(() => {
    return songs.reduce((acc, s) => acc + (s.duration || 0), 0);
  }, [songs]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins} min`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Sonora
          </span>
        </h1>
        <p className="text-muted-foreground mt-1">
          Tu biblioteca musical • {songs.length} canciones • {formatDuration(totalDuration)}
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Buscar canciones, artistas, géneros..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        )}
      </div>

      {/* Song list */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-xl">
              <div className="w-8 h-4 bg-muted animate-pulse rounded" />
              <div className="w-12 h-12 bg-muted animate-pulse rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted animate-pulse rounded w-1/3" />
                <div className="h-3 bg-muted animate-pulse rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredSongs.length === 0 ? (
        <div className="text-center py-16">
          {songs.length === 0 ? (
            <>
              <svg className="mx-auto mb-4 text-muted-foreground" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
              <h2 className="text-lg font-semibold text-foreground">Tu biblioteca está vacía</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Ve al panel de administración para subir tu primera canción
              </p>
              <button
                onClick={() => useAppStore.getState().setCurrentView('admin')}
                className="mt-4 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Ir a Administración
              </button>
            </>
          ) : (
            <>
              <svg className="mx-auto mb-4 text-muted-foreground" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <p className="text-muted-foreground">No se encontraron resultados para &quot;{searchQuery}&quot;</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          {filteredSongs.map((song, index) => (
            <SongCard key={song.id} song={song} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}
