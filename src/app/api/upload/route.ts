import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { db } from '@/lib/db';

const MAX_AUDIO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_COVER_SIZE = 10 * 1024 * 1024; // 10MB

// Extended list — many OS report MP3 as different MIME types
const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/x-mpeg',
  'audio/mp4',
  'audio/x-m4a',
  'audio/m4a',
  'audio/aac',
  'audio/x-aac',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/flac',
  'audio/x-flac',
  'audio/webm',
  'audio/x-ms-wma',
];

const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.wma', '.webm', '.opus', '.mp4', '.oga'];

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

    // Validate audio type — check MIME type OR file extension (some OS report wrong MIME)
    const ext = getFileExtension(audioFile.name);
    const hasValidMime = audioFile.type && ALLOWED_AUDIO_TYPES.includes(audioFile.type.toLowerCase());
    const hasValidExt = ALLOWED_EXTENSIONS.includes(ext);

    if (!hasValidMime && !hasValidExt) {
      return NextResponse.json({
        error: `Formato no soportado: ${audioFile.type || 'desconocido'}. Usa MP3, WAV, OGG, M4A, FLAC`
      }, { status: 400 });
    }

    // Validate cover file
    if (coverFile) {
      if (coverFile.size > MAX_COVER_SIZE) {
        return NextResponse.json({ error: `La portada es muy grande. Máximo ${MAX_COVER_SIZE / 1024 / 1024}MB` }, { status: 400 });
      }
      if (coverFile.type && !ALLOWED_COVER_TYPES.includes(coverFile.type.toLowerCase())) {
        return NextResponse.json({ error: `Formato de portada no soportado. Usa JPEG, PNG, WebP o GIF` }, { status: 400 });
      }
    }

    const songsDir = path.join(process.cwd(), 'public', 'songs');
    if (!existsSync(songsDir)) {
      await mkdir(songsDir, { recursive: true });
    }

    // Save audio file
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    const audioFileName = `${Date.now()}-${audioFile.name.replace(/[^a-zA-Z0-9.\-]/g, '_')}`;
    const audioPath = `songs/${audioFileName}`;
    const fullAudioPath = path.join(process.cwd(), 'public', audioPath);
    await writeFile(fullAudioPath, audioBuffer);

    // Save cover file if provided
    let coverUrl = '';
    if (coverFile) {
      const coversDir = path.join(process.cwd(), 'public', 'covers');
      if (!existsSync(coversDir)) {
        await mkdir(coversDir, { recursive: true });
      }
      const coverBuffer = Buffer.from(await coverFile.arrayBuffer());
      const coverExt = getFileExtension(coverFile.name) || '.jpg';
      const coverFileName = `${Date.now()}-cover${coverExt}`;
      coverUrl = `covers/${coverFileName}`;
      const fullCoverPath = path.join(process.cwd(), 'public', coverUrl);
      await writeFile(fullCoverPath, coverBuffer);
    }

    const lyricsJson = lyricsLrc ? JSON.stringify(parseLrc(lyricsLrc)) : '[]';

    const song = await db.song.create({
      data: { title, artist, album, duration: 0, genre, filePath: audioPath, coverUrl, lyricsLrc, lyricsJson },
    });

    return NextResponse.json(song, { status: 201 });
  } catch (error) {
    console.error('Error uploading song:', error);
    return NextResponse.json({ error: 'Error al subir la canción' }, { status: 500 });
  }
}
