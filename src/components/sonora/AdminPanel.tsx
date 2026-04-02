'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { storage, database } from '@/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { ref as dbRef, push } from 'firebase/database';
import LiveTranscriber from './LiveTranscriber';

const AUDIO_ACCEPT = 'audio/mpeg,.mp3,audio/mp4,.m4a,audio/aac,.aac,audio/wav,.wav,audio/ogg,.ogg,audio/flac,.flac,audio/webm,.webm,.opus';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getExtension(filename: string): string {
  const parts = filename.toLowerCase().split('.');
  return parts.length > 1 ? `.${parts.pop()}` : '.mp3';
}

function parseLrc(lrcText: string): Array<{ time: number; text: string }> {
  const lines = lrcText.split('\n');
  const lyrics: Array<{ time: number; text: string }> = [];
  for (const line of lines) {
    const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
    if (match) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const ms = parseInt(match[3].padEnd(3, '0'));
      const time = minutes * 60 + seconds + ms / 1000;
      const text = match[4].trim();
      if (text) lyrics.push({ time, text });
    }
  }
  return lyrics.sort((a, b) => a.time - b.time);
}

export default function AdminPanel() {
  const { songs, setSongs } = useAppStore();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '', artist: '', album: '', genre: '', lyricsLrc: '',
  });
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [editingSong, setEditingSong] = useState<string | null>(null);
  const [editLyrics, setEditLyrics] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'manage'>('upload');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const fetchSongs = async () => {
    try {
      const res = await fetch('/api/firebase-songs');
      const data = await res.json();
      if (Array.isArray(data)) {
        setSongs(data);
      }
    } catch (error) {
      console.error('Error fetching songs:', error);
    }
  };

  useEffect(() => {
    fetchSongs();
  }, [setSongs]);

  // Drag & drop
  useEffect(() => {
    const dropZone = dropZoneRef.current;
    if (!dropZone) return;

    const handleDragOver = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragLeave = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault(); e.stopPropagation(); setIsDragging(false);
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('audio/') || /\.(mp3|m4a|wav|ogg|flac|aac|wma|webm|opus)$/i.test(file.name)) {
          setAudioFile(file);
          const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
          if (!uploadForm.title) setUploadForm(prev => ({ ...prev, title: nameWithoutExt }));
        }
      }
    };

    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);
    return () => {
      dropZone.removeEventListener('dragover', handleDragOver);
      dropZone.removeEventListener('dragleave', handleDragLeave);
      dropZone.removeEventListener('drop', handleDrop);
    };
  }, [uploadForm.title]);

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setAudioFile(file);
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      if (!uploadForm.title) setUploadForm(prev => ({ ...prev, title: nameWithoutExt }));
    }
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCoverFile(e.target.files?.[0] || null);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioFile || !uploadForm.title) {
      setUploadError('Necesitas seleccionar un audio y poner un título');
      return;
    }

    setIsUploading(true);
    setUploadError('');
    setUploadSuccess('');
    setUploadProgress(0);

    try {
      const songId = push(dbRef(database, 'songs')).key || Date.now().toString();
      const ext = getExtension(audioFile.name);
      const now = Date.now();

      // ===== PASO 1: Subir audio directamente a Firebase Storage =====
      setUploadStage('Subiendo audio...');
      const audioStorageRef = ref(storage, `songs/${songId}/audio${ext}`);
      const audioUploadTask = uploadBytesResumable(audioStorageRef, audioFile, {
        cacheControl: 'public, max-age=31536000',
      });

      await new Promise<void>((resolve, reject) => {
        audioUploadTask.on('state_changed',
          (snapshot) => {
            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 85);
            setUploadProgress(progress);
          },
          (error) => {
            console.error('Audio upload error:', error);
            reject(new Error('Error al subir el audio: ' + getFirebaseErrorMsg(error)));
          },
          () => resolve()
        );
      });

      const audioUrl = await getDownloadURL(audioStorageRef);

      // ===== PASO 2: Subir portada si existe =====
      let coverUrl = '';
      if (coverFile && coverFile.size > 0) {
        setUploadStage('Subiendo portada...');
        setUploadProgress(87);
        const coverExt = getExtension(coverFile.name);
        const coverStorageRef = ref(storage, `songs/${songId}/cover${coverExt}`);
        const coverUploadTask = uploadBytesResumable(coverStorageRef, coverFile, {
          cacheControl: 'public, max-age=31536000',
        });

        await new Promise<void>((resolve) => {
          coverUploadTask.on('state_changed',
            () => {},
            (error) => {
              console.warn('Cover upload error:', error);
              resolve(); // Cover is optional, don't fail
            },
            () => resolve()
          );
        });

        try {
          coverUrl = await getDownloadURL(coverStorageRef);
        } catch {
          // Cover is optional
        }
      }

      // ===== PASO 3: Guardar metadatos en Firebase RTDB via API =====
      setUploadStage('Guardando información...');
      setUploadProgress(92);

      const lyricsLrc = uploadForm.lyricsLrc || '';
      const lyricsJson = lyricsLrc ? JSON.stringify(parseLrc(lyricsLrc)) : '[]';

      const saveResp = await fetch('/api/firebase-songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songId,
          title: uploadForm.title,
          artist: uploadForm.artist,
          album: uploadForm.album,
          genre: uploadForm.genre,
          lyricsLrc,
          audioUrl,
          coverUrl,
        }),
      });

      if (!saveResp.ok) {
        const errData = await saveResp.json().catch(() => ({ error: 'Error del servidor' }));
        throw new Error(errData.error || 'Error al guardar la canción');
      }

      setUploadProgress(100);
      setUploadStage('');

      setUploadSuccess(`"${uploadForm.title}" se subió correctamente`);
      setUploadForm({ title: '', artist: '', album: '', genre: '', lyricsLrc: '' });
      setAudioFile(null);
      setCoverFile(null);
      setTimeout(() => setUploadProgress(0), 2000);
      if (audioInputRef.current) audioInputRef.current.value = '';
      if (coverInputRef.current) coverInputRef.current.value = '';
      fetchSongs();

    } catch (err: unknown) {
      console.error('Upload error:', err);
      setUploadError(err instanceof Error ? err.message : 'Error al subir la canción');
      setUploadProgress(0);
      setUploadStage('');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta canción permanentemente?')) return;
    setIsDeleting(id);
    try {
      await fetch(`/api/firebase-songs/${id}`, { method: 'DELETE' });
      fetchSongs();
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSaveLyrics = async (songId: string) => {
    try {
      await fetch(`/api/firebase-songs/${songId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lyricsLrc: editLyrics }),
      });
      setEditingSong(null);
      fetchSongs();
    } catch (error) {
      console.error('Save lyrics error:', error);
    }
  };

  const lrcTemplate = `[00:00.00]Primera línea de la canción
[00:05.50]Segunda línea
[00:10.00]Tercera línea
[00:15.30]Sigue así con todas las líneas`;

  const inputClass = "w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 placeholder:text-muted-foreground/60";

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Administración</h1>
          <p className="text-sm text-muted-foreground">Gestiona tu biblioteca musical</p>
        </div>
        <div className="flex items-center gap-3"><LiveTranscriber /></div>
      </div>

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

      <div className="flex gap-1 mb-6 bg-muted rounded-lg p-1">
        <button onClick={() => setActiveTab('upload')} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${activeTab === 'upload' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Subir Canción</button>
        <button onClick={() => setActiveTab('manage')} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${activeTab === 'manage' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Gestionar ({songs.length})</button>
      </div>

      {activeTab === 'upload' && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Subir nueva canción</h3>

          {uploadSuccess && <div className="mb-4 p-3 rounded-lg bg-green-500/10 text-green-400 text-sm flex items-center gap-2"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>{uploadSuccess}</div>}
          {uploadError && <div className="mb-4 p-3 rounded-lg bg-red-500/10 text-red-400 text-sm flex items-center gap-2"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>{uploadError}</div>}

          {uploadProgress > 0 && isUploading && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{uploadStage || 'Subiendo...'}</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

          <form onSubmit={handleUpload} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">Archivo de audio <span className="text-purple-400">*</span></label>
              <div ref={dropZoneRef} onClick={() => audioInputRef.current?.click()} className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all active:scale-[0.98] ${isDragging ? 'border-purple-400 bg-purple-500/10' : audioFile ? 'border-green-500/50 bg-green-500/5' : 'border-border hover:border-purple-500/50 hover:bg-purple-500/5'}`}>
                <input ref={audioInputRef} type="file" accept={AUDIO_ACCEPT} onChange={handleAudioSelect} className="hidden" />
                {audioFile ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-400"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground truncate max-w-[250px]">{audioFile.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatFileSize(audioFile.size)}</p>
                    </div>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setAudioFile(null); if (audioInputRef.current) audioInputRef.current.value = ''; }} className="text-xs text-red-400 hover:text-red-300 px-3 py-1 rounded-md hover:bg-red-500/10 transition-colors">Quitar archivo</button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-purple-500/10 flex items-center justify-center">
                      <svg className="text-purple-400" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                    </div>
                    <div><p className="text-sm text-foreground font-medium">Toca para seleccionar audio</p><p className="text-xs text-muted-foreground mt-1">MP3, WAV, OGG, M4A, FLAC, AAC</p></div>
                    <p className="text-[10px] text-muted-foreground/60">Sin límite de tamaño</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">Portada (opcional)</label>
              <div onClick={() => coverInputRef.current?.click()} className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all active:scale-[0.98] ${coverFile ? 'border-green-500/50 bg-green-500/5' : 'border-border hover:border-purple-500/50'}`}>
                <input ref={coverInputRef} type="file" accept="image/jpeg,.jpg,.jpeg,image/png,.png,image/webp,.webp,image/gif,.gif" onChange={handleCoverSelect} className="hidden" />
                {coverFile ? (
                  <div className="flex items-center justify-center gap-3">
                    {coverFile.type.startsWith('image/') && <img src={URL.createObjectURL(coverFile)} alt="Portada" className="w-12 h-12 rounded-lg object-cover" />}
                    <div className="text-left"><p className="text-sm text-foreground">{coverFile.name}</p><p className="text-xs text-muted-foreground">{formatFileSize(coverFile.size)}</p></div>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setCoverFile(null); if (coverInputRef.current) coverInputRef.current.value = ''; }} className="text-xs text-red-400 hover:text-red-300 ml-2">Quitar</button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground"><span className="text-purple-400 font-medium">Toca para seleccionar</span> imagen de portada</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1.5 text-foreground">Título <span className="text-purple-400">*</span></label><input type="text" placeholder="Nombre de la canción" value={uploadForm.title} onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })} className={inputClass} required autoComplete="off" /></div>
              <div><label className="block text-sm font-medium mb-1.5 text-foreground">Artista</label><input type="text" placeholder="Nombre del artista" value={uploadForm.artist} onChange={(e) => setUploadForm({ ...uploadForm, artist: e.target.value })} className={inputClass} autoComplete="off" /></div>
              <div><label className="block text-sm font-medium mb-1.5 text-foreground">Álbum</label><input type="text" placeholder="Nombre del álbum" value={uploadForm.album} onChange={(e) => setUploadForm({ ...uploadForm, album: e.target.value })} className={inputClass} autoComplete="off" /></div>
              <div><label className="block text-sm font-medium mb-1.5 text-foreground">Género</label><input type="text" placeholder="Pop, Rock, Hip Hop..." value={uploadForm.genre} onChange={(e) => setUploadForm({ ...uploadForm, genre: e.target.value })} className={inputClass} autoComplete="off" /></div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-foreground">Letras (formato LRC)</label>
                <button type="button" onClick={() => setUploadForm({ ...uploadForm, lyricsLrc: lrcTemplate })} className="text-xs text-purple-400 hover:text-purple-300">Usar plantilla</button>
              </div>
              <textarea placeholder={`Ejemplo:\n[00:00.00]Primera línea\n[00:05.50]Segunda línea\n[00:10.00]Tercera línea`} value={uploadForm.lyricsLrc} onChange={(e) => setUploadForm({ ...uploadForm, lyricsLrc: e.target.value })} className={`${inputClass} min-h-[120px] font-mono text-xs resize-y`} />
              <p className="text-xs text-muted-foreground mt-1">Formato LRC: [mm:ss.ms]Letra de la línea</p>
            </div>

            <button type="submit" disabled={isUploading || !audioFile || !uploadForm.title} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm">
              {isUploading ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{uploadStage || 'Subiendo...'} {uploadProgress}%</>) : (<><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>Subir Canción</>)}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'manage' && (
        <div className="space-y-3">
          {songs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <svg className="mx-auto mb-4" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
              <p>No hay canciones aún</p>
              <p className="text-sm">Sube tu primera canción desde la pestaña &quot;Subir&quot;</p>
            </div>
          ) : (
            songs.map((song) => (
              <div key={song.id} className="bg-card border border-border rounded-xl p-4">
                {editingSong === song.id ? (
                  <div className="space-y-3">
                    <textarea value={editLyrics} onChange={(e) => setEditLyrics(e.target.value)} className={`${inputClass} min-h-[150px] font-mono text-xs resize-y`} placeholder="Letras en formato LRC..." />
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveLyrics(song.id)} className="px-4 py-1.5 rounded-lg bg-purple-500 text-white text-sm hover:bg-purple-600">Guardar</button>
                      <button onClick={() => setEditingSong(null)} className="px-4 py-1.5 rounded-lg bg-muted text-foreground text-sm hover:bg-accent">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {song.coverUrl ? (<img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" />) : (<span className="text-purple-400 font-bold">{song.title.charAt(0)}</span>)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{song.title}</p>
                      <p className="text-xs text-muted-foreground">{song.artist}</p>
                      <div className="flex gap-2 mt-1">
                        {song.genre && <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400">{song.genre}</span>}
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">▶ {song.playCount}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditingSong(song.id); setEditLyrics(song.lyricsLrc); }} className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Editar letras">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </button>
                      <button onClick={() => handleDelete(song.id)} disabled={isDeleting === song.id} className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-50" title="Eliminar">
                        {isDeleting === song.id ? (<div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />) : (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>)}
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

// Traduce errores de Firebase Storage a mensajes legibles
function getFirebaseErrorMsg(error: unknown): string {
  if (!error || typeof error !== 'object') return 'Error desconocido';
  const code = (error as { code?: string }).code;
  const msg = (error as { message?: string }).message || '';

  if (code === 'storage/unauthorized') return 'Sin permiso para subir. Verifica las reglas de Firebase Storage.';
  if (code === 'storage/canceled') return 'Subida cancelada.';
  if (code === 'storage/quota-exceeded') return 'Espacio de almacenamiento lleno.';
  if (code === 'storage/unauthenticated') return 'Necesitas autenticarte para subir.';
  if (code === 'storage/retry-limit-exceeded') return 'Se excedió el límite de reintentos. Verifica tu conexión.';
  if (code === 'storage/invalid-checksum') return 'Error de verificación del archivo. Intenta de nuevo.';
  if (code === 'storage/server-file-wrong-size') return 'El archivo no coincide con el tamaño del servidor.';

  // Si el mensaje contiene "security rules" o "not allowed"
  if (msg.toLowerCase().includes('not allowed') || msg.toLowerCase().includes('security rules')) {
    return 'Reglas de seguridad bloquean la subida. Verifica las reglas de Firebase Storage.';
  }

  return msg || 'Error desconocido de Firebase Storage';
}
