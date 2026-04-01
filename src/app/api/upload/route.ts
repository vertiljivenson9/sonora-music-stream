import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const MAX_AUDIO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_COVER_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg', 'audio/mp3', 'audio/x-mpeg',
  'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac',
  'audio/wav', 'audio/x-wav',
  'audio/ogg', 'audio/flac', 'audio/x-flac',
  'audio/webm', 'audio/x-ms-wma',
];

const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.wma', '.webm', '.opus'];

const ALLOWED_COVER_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];

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

function getFileExtension(filename: string): string {
  const parts = filename.toLowerCase().split('.');
  return parts.length > 1 ? `.${parts.pop()}` : '';
}

// Convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    const coverFile = formData.get('cover') as File | null;
    const title = formData.get('title') as string;
    const artist = formData.get('artist') as string || 'Desconocido';
    const album = formData.get('album') as string || '';
    const genre = formData.get('genre') as string || '';
    const lyricsLrc = formData.get('lyricsLrc') as string || '';

    if (!audioFile) {
      return NextResponse.json({ error: 'Se requiere un archivo de audio' }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ error: 'Se requiere el título' }, { status: 400 });
    }

    // Validate audio file size
    if (audioFile.size > MAX_AUDIO_SIZE) {
      return NextResponse.json({ error: `El archivo es muy grande. Máximo ${MAX_AUDIO_SIZE / 1024 / 1024}MB` }, { status: 400 });
    }

    // Validate audio type
    const ext = getFileExtension(audioFile.name);
    const hasValidMime = audioFile.type && ALLOWED_AUDIO_TYPES.includes(audioFile.type.toLowerCase());
    const hasValidExt = ALLOWED_EXTENSIONS.includes(ext);

    if (!hasValidMime && !hasValidExt) {
      return NextResponse.json({
        error: `Formato no soportado. Usa MP3, WAV, OGG, M4A, FLAC`
      }, { status: 400 });
    }

    // Determine MIME type
    let mimeType = audioFile.type || 'audio/mpeg';
    if (!mimeType || mimeType === '') {
      const mimeMap: Record<string, string> = {
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.ogg': 'audio/ogg',
        '.m4a': 'audio/mp4',
        '.aac': 'audio/aac',
        '.flac': 'audio/flac',
        '.webm': 'audio/webm',
        '.wma': 'audio/x-ms-wma',
      };
      mimeType = mimeMap[ext] || 'audio/mpeg';
    }

    // Validate cover file
    if (coverFile) {
      if (coverFile.size > MAX_COVER_SIZE) {
        return NextResponse.json({ error: `La portada es muy grande. Máximo ${MAX_COVER_SIZE / 1024 / 1024}MB` }, { status: 400 });
      }
    }

    // Convert files to base64 and store in database
    const audioArrayBuffer = await audioFile.arrayBuffer();
    const audioBase64 = arrayBufferToBase64(audioArrayBuffer);

    let coverBase64 = '';
    if (coverFile) {
      const coverArrayBuffer = await coverFile.arrayBuffer();
      coverBase64 = arrayBufferToBase64(coverArrayBuffer);
    }

    const lyricsJson = lyricsLrc ? JSON.stringify(parseLrc(lyricsLrc)) : '[]';

    const song = await db.song.create({
      data: {
        title,
        artist,
        album,
        duration: 0,
        genre,
        filePath: audioFile.name,
        coverUrl: coverFile ? coverFile.name : '',
        lyricsLrc,
        lyricsJson,
        audioBase64,
        coverBase64,
        mimeType,
      },
    });

    return NextResponse.json(song, { status: 201 });
  } catch (error) {
    console.error('Error uploading song:', error);
    return NextResponse.json({ error: 'Error al subir la canción' }, { status: 500 });
  }
}
