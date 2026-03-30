'use client';

import { useState, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import LiveTranscriber from './LiveTranscriber';

export default function AdminPanel() {
  const { songs, setSongs, isAdmin, setIsAdmin } = useAppStore();

  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    artist: '',
    album: '',
    genre: '',
    lyricsLrc: '',
  });
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [editingSong, setEditingSong] = useState<string | null>(null);
  const [editLyrics, setEditLyrics] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'manage'>('upload');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: loginPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsAdmin(true);
        setLoginError('');
      } else {
        setLoginError('Contraseña incorrecta');
      }
    } catch {
      setLoginError('Error de conexión');
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioFile || !uploadForm.title) {
      setUploadError('Audio y título son requeridos');
      return;
    }

    setIsUploading(true);
    setUploadError('');
    setUploadSuccess('');

    try {
      const formData = new FormData();
      formData.append('audio', audioFile);
      if (coverFile) formData.append('cover', coverFile);
      formData.append('title', uploadForm.title);
      formData.append('artist', uploadForm.artist);
      formData.append('album', uploadForm.album);
      formData.append('genre', uploadForm.genre);
      formData.append('lyricsLrc', uploadForm.lyricsLrc);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setUploadSuccess(`"${data.title}" subida exitosamente`);
        setUploadForm({ title: '', artist: '', album: '', genre: '', lyricsLrc: '' });
        setAudioFile(null);
        setCoverFile(null);
        // Refresh songs
        const songsRes = await fetch('/api/songs');
        const songsData = await songsRes.json();
        setSongs(songsData);
      } else {
        setUploadError(data.error || 'Error al subir');
      }
    } catch {
      setUploadError('Error de conexión');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta canción?')) return;
    try {
      const res = await fetch(`/api/songs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const songsRes = await fetch('/api/songs');
        const songsData = await songsRes.json();
        setSongs(songsData);
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleSaveLyrics = async (songId: string) => {
    try {
      const res = await fetch(`/api/songs/${songId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lyricsLrc: editLyrics }),
      });
      if (res.ok) {
        const songsRes = await fetch('/api/songs');
        const songsData = await songsRes.json();
        setSongs(songsData);
        setEditingSong(null);
      }
    } catch (error) {
      console.error('Save lyrics error:', error);
    }
  };

  const lrcTemplate = `[00:00.00]Primera línea de la canción
[00:05.50]Segunda línea
[00:10.00]Tercera línea
[00:15.30]Sigue así con todas las líneas`;

  const inputClass = "w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500";

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-400">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-foreground">Panel de Administración</h2>
            <p className="text-sm text-muted-foreground mt-1">Ingresa la contraseña para continuar</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="Contraseña"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className={inputClass}
            />
            {loginError && (
              <p className="text-sm text-red-400">{loginError}</p>
            )}
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:opacity-90 transition-opacity"
            >
              Ingresar
            </button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Contraseña por defecto: admin123
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Administración</h1>
          <p className="text-sm text-muted-foreground">Gestiona tu biblioteca musical</p>
        </div>
        <div className="flex items-center gap-3">
          <LiveTranscriber />
          <button
            onClick={() => setIsAdmin(false)}
            className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Canciones', value: songs.length, icon: '🎵' },
          { label: 'Con letras', value: songs.filter(s => s.lyricsLrc).length, icon: '📝' },
          { label: 'Reproducciones', value: songs.reduce((a, s) => a + s.playCount, 0), icon: '▶️' },
          { label: 'Géneros', value: new Set(songs.map(s => s.genre).filter(Boolean)).size, icon: '🎸' },
        ].map((stat) => (
          <div key={stat.label} className="p-4 rounded-xl bg-card border border-border">
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-xl font-bold text-foreground">{stat.value}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-muted rounded-lg p-1">
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            activeTab === 'upload' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Subir Canción
        </button>
        <button
          onClick={() => setActiveTab('manage')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            activeTab === 'manage' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Gestionar ({songs.length})
        </button>
      </div>

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Subir nueva canción</h3>

          {uploadSuccess && (
            <div className="mb-4 p-3 rounded-lg bg-green-500/10 text-green-400 text-sm">
              ✓ {uploadSuccess}
            </div>
          )}
          {uploadError && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 text-red-400 text-sm">
              ✗ {uploadError}
            </div>
          )}

          <form onSubmit={handleUpload} className="space-y-4">
            {/* Audio file */}
            <div>
              <label className="block text-sm font-medium mb-1.5 text-foreground">Archivo de audio *</label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-purple-500/50 transition-colors">
                {audioFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm text-foreground">🎵 {audioFile.name}</span>
                    <button
                      type="button"
                      onClick={() => setAudioFile(null)}
                      className="text-muted-foreground hover:text-red-400"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <svg className="mx-auto mb-2 text-muted-foreground" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <p className="text-sm text-muted-foreground">
                      Arrastra o <span className="text-purple-400">selecciona</span> un archivo de audio
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">MP3, WAV, OGG, M4A</p>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Cover file */}
            <div>
              <label className="block text-sm font-medium mb-1.5 text-foreground">Portada (opcional)</label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-purple-500/50 transition-colors">
                {coverFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm text-foreground">🖼️ {coverFile.name}</span>
                    <button type="button" onClick={() => setCoverFile(null)} className="text-muted-foreground hover:text-red-400">✕</button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <p className="text-sm text-muted-foreground">
                      Seleccionar <span className="text-purple-400">imagen de portada</span>
                    </p>
                    <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            {/* Text fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-foreground">Título *</label>
                <input
                  type="text"
                  placeholder="Nombre de la canción"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-foreground">Artista</label>
                <input
                  type="text"
                  placeholder="Nombre del artista"
                  value={uploadForm.artist}
                  onChange={(e) => setUploadForm({ ...uploadForm, artist: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-foreground">Álbum</label>
                <input
                  type="text"
                  placeholder="Nombre del álbum"
                  value={uploadForm.album}
                  onChange={(e) => setUploadForm({ ...uploadForm, album: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-foreground">Género</label>
                <input
                  type="text"
                  placeholder="Pop, Rock, Hip Hop..."
                  value={uploadForm.genre}
                  onChange={(e) => setUploadForm({ ...uploadForm, genre: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            {/* LRC Lyrics */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-foreground">Letras (formato LRC)</label>
                <button
                  type="button"
                  onClick={() => setUploadForm({ ...uploadForm, lyricsLrc: lrcTemplate })}
                  className="text-xs text-purple-400 hover:text-purple-300"
                >
                  Usar plantilla
                </button>
              </div>
              <textarea
                placeholder={`Ejemplo:\n[00:00.00]Primera línea\n[00:05.50]Segunda línea\n[00:10.00]Tercera línea`}
                value={uploadForm.lyricsLrc}
                onChange={(e) => setUploadForm({ ...uploadForm, lyricsLrc: e.target.value })}
                className={`${inputClass} min-h-[120px] font-mono text-xs resize-y`}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Formato LRC: [mm:ss.ms]Letra de la línea
              </p>
            </div>

            <button
              type="submit"
              disabled={isUploading}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Subir Canción
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Manage Tab */}
      {activeTab === 'manage' && (
        <div className="space-y-3">
          {songs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <svg className="mx-auto mb-4" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
              <p>No hay canciones aún</p>
              <p className="text-sm">Sube tu primera canción desde la pestaña &quot;Subir&quot;</p>
            </div>
          ) : (
            songs.map((song) => (
              <div key={song.id} className="bg-card border border-border rounded-xl p-4">
                {editingSong === song.id ? (
                  <div className="space-y-3">
                    <textarea
                      value={editLyrics}
                      onChange={(e) => setEditLyrics(e.target.value)}
                      className={`${inputClass} min-h-[150px] font-mono text-xs resize-y`}
                      placeholder="Letras en formato LRC..."
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveLyrics(song.id)}
                        className="px-4 py-1.5 rounded-lg bg-purple-500 text-white text-sm hover:bg-purple-600"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => setEditingSong(null)}
                        className="px-4 py-1.5 rounded-lg bg-muted text-foreground text-sm hover:bg-accent"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {song.coverUrl ? (
                        <img src={`/${song.coverUrl}`} alt={song.title} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-purple-400 font-bold">{song.title.charAt(0)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{song.title}</p>
                      <p className="text-xs text-muted-foreground">{song.artist}</p>
                      <div className="flex gap-2 mt-1">
                        {song.genre && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400">{song.genre}</span>
                        )}
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">▶ {song.playCount}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditingSong(song.id); setEditLyrics(song.lyricsLrc); }}
                        className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        title="Editar letras"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(song.id)}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                        title="Eliminar"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
