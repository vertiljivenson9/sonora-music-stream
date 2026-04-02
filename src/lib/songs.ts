import { ref as dbRef, push, set, remove, get, onValue, update } from 'firebase/database';
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage, database } from './firebase';
import type { Song } from '@/store/useAppStore';

const SONGS_PATH = 'songs';

// ---- Realtime Database: Songs CRUD ----

export interface SongData {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  genre: string;
  audioUrl: string;
  coverUrl: string;
  lyricsLrc: string;
  lyricsJson: string;
  playCount: number;
  createdAt: number;
  updatedAt: number;
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

function songDataToSong(data: SongData): Song {
  return {
    id: data.id,
    title: data.title || '',
    artist: data.artist || 'Desconocido',
    album: data.album || '',
    duration: data.duration || 0,
    genre: data.genre || '',
    filePath: data.audioUrl || '',
    coverUrl: data.coverUrl || '',
    lyricsLrc: data.lyricsLrc || '',
    lyricsJson: data.lyricsJson || '[]',
    playCount: data.playCount || 0,
    createdAt: data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: data.updatedAt ? new Date(data.updatedAt).toISOString() : new Date().toISOString(),
  };
}

// Get all songs once
export async function fetchAllSongs(): Promise<Song[]> {
  const snapshot = await get(dbRef(database, SONGS_PATH));
  if (!snapshot.exists()) return [];
  
  const songs: Song[] = [];
  snapshot.forEach((child) => {
    const data = child.val() as SongData;
    songs.push(songDataToSong({ ...data, id: child.key! }));
  });
  return songs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// Listen to songs in real-time
export function onSongsChange(callback: (songs: Song[]) => void) {
  const songsRef = dbRef(database, SONGS_PATH);
  return onValue(songsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const songs: Song[] = [];
    snapshot.forEach((child) => {
      const data = child.val() as SongData;
      songs.push(songDataToSong({ ...data, id: child.key! }));
    });
    callback(songs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  });
}

// Upload a song (audio + cover + metadata) with progress
export async function uploadSong(
  audioFile: File,
  metadata: { title: string; artist: string; album: string; genre: string; lyricsLrc: string },
  coverFile: File | null,
  onProgress: (progress: number) => void
): Promise<Song> {
  const songId = push(dbRef(database, SONGS_PATH)).key!;
  const now = Date.now();
  const lyricsJson = metadata.lyricsLrc ? JSON.stringify(parseLrc(metadata.lyricsLrc)) : '[]';

  // 1. Upload audio to Firebase Storage
  onProgress(5);
  const audioStoragePath = `songs/${songId}/audio${getExtension(audioFile.name)}`;
  const audioRef = storageRef(storage, audioStoragePath);
  
  await new Promise<void>((resolve, reject) => {
    const uploadTask = uploadBytesResumable(audioRef, audioFile);
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        onProgress(Math.round(pct * 0.5)); // Audio is 50% of total
      },
      (error) => reject(error),
      () => resolve()
    );
  });

  const audioUrl = await getDownloadURL(audioRef);
  onProgress(50);

  // 2. Upload cover if provided
  let coverUrl = '';
  if (coverFile) {
    const coverStoragePath = `songs/${songId}/cover${getExtension(coverFile.name)}`;
    const coverRef = storageRef(storage, coverStoragePath);
    
    await new Promise<void>((resolve, reject) => {
      const uploadTask = uploadBytesResumable(coverRef, coverFile);
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress(50 + Math.round(pct * 0.3)); // Cover is 30% of total
        },
        (error) => reject(error),
        () => resolve()
      );
    });

    coverUrl = await getDownloadURL(coverRef);
  }
  onProgress(85);

  // 3. Save metadata to Realtime Database
  const songData: Omit<SongData, 'id'> = {
    title: metadata.title,
    artist: metadata.artist || 'Desconocido',
    album: metadata.album || '',
    duration: 0,
    genre: metadata.genre || '',
    audioUrl,
    coverUrl,
    lyricsLrc: metadata.lyricsLrc || '',
    lyricsJson,
    playCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  await set(dbRef(database, `${SONGS_PATH}/${songId}`), songData);
  onProgress(100);

  return songDataToSong({ ...songData, id: songId });
}

// Delete a song (audio + cover + metadata)
export async function deleteSong(songId: string) {
  // Get song data to find storage paths
  const snapshot = await get(dbRef(database, `${SONGS_PATH}/${songId}`));
  if (!snapshot.exists()) return;

  const data = snapshot.val() as SongData;

  // Delete audio from Storage
  try {
    if (data.audioUrl) {
      const audioRef = storageRef(storage, `songs/${songId}/audio`);
      await deleteObject(audioRef);
    }
  } catch (e) {
    console.warn('Could not delete audio file:', e);
  }

  // Delete cover from Storage
  try {
    if (data.coverUrl) {
      const coverRef = storageRef(storage, `songs/${songId}/cover`);
      await deleteObject(coverRef);
    }
  } catch (e) {
    console.warn('Could not delete cover file:', e);
  }

  // Delete from Realtime Database
  await remove(dbRef(database, `${SONGS_PATH}/${songId}`));
}

// Update song metadata (e.g., lyrics)
export async function updateSong(songId: string, updates: Partial<SongData>) {
  const updateData: Record<string, unknown> = { ...updates, updatedAt: Date.now() };
  
  // If lyricsLrc changed, also update lyricsJson
  if (updates.lyricsLrc !== undefined) {
    updateData.lyricsJson = updates.lyricsLrc ? JSON.stringify(parseLrc(updates.lyricsLrc)) : '[]';
  }
  
  await update(dbRef(database, `${SONGS_PATH}/${songId}`), updateData);
}

// Increment play count
export async function incrementPlayCount(songId: string) {
  const snapshot = await get(dbRef(database, `${SONGS_PATH}/${songId}/playCount`));
  const current = snapshot.val() || 0;
  await update(dbRef(database, `${SONGS_PATH}/${songId}`), {
    playCount: current + 1,
    updatedAt: Date.now(),
  });
}

// Get download URL for a song's audio
export async function getAudioUrl(songId: string): Promise<string> {
  const audioRef = storageRef(storage, `songs/${songId}/audio`);
  return getDownloadURL(audioRef);
}

// Get download URL for a song's cover
export async function getCoverUrl(songId: string): Promise<string | null> {
  try {
    const coverRef = storageRef(storage, `songs/${songId}/cover`);
    return await getDownloadURL(coverRef);
  } catch {
    return null;
  }
}

function getExtension(filename: string): string {
  const parts = filename.toLowerCase().split('.');
  return parts.length > 1 ? `.${parts.pop()}` : '.mp3';
}
