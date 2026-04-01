import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { db } from '@/lib/db';

const MAX_AUDIO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_COVER_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/flac', 'audio/webm', 'audio/x-m4a'];
const ALLOWED_COVER_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    const coverFile = formData.get('cover') as File | null;
    const title = formData.get('title') as string;
    const artist = formData.get('artist') as string || 'Unknown';
    const album = formData.get('album') as string || '';
    const genre = formData.get('genre') as string || '';
    const lyricsLrc = formData.get('lyricsLrc') as string || '';

    if (!audioFile) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Validate audio file
    if (audioFile.size > MAX_AUDIO_SIZE) {
      return NextResponse.json({ error: `Audio file too large. Max ${MAX_AUDIO_SIZE / 1024 / 1024}MB` }, { status: 400 });
    }
    if (audioFile.type && !ALLOWED_AUDIO_TYPES.includes(audioFile.type)) {
      return NextResponse.json({ error: `Invalid audio type: ${audioFile.type}. Allowed: MP3, WAV, OGG, M4A, FLAC, WebM` }, { status: 400 });
    }

    // Validate cover file
    if (coverFile) {
      if (coverFile.size > MAX_COVER_SIZE) {
        return NextResponse.json({ error: `Cover image too large. Max ${MAX_COVER_SIZE / 1024 / 1024}MB` }, { status: 400 });
      }
      if (coverFile.type && !ALLOWED_COVER_TYPES.includes(coverFile.type)) {
        return NextResponse.json({ error: `Invalid cover type: ${coverFile.type}. Allowed: JPEG, PNG, WebP, GIF` }, { status: 400 });
      }
    }

    const songsDir = path.join(process.cwd(), 'public', 'songs');
    if (!existsSync(songsDir)) {
      await mkdir(songsDir, { recursive: true });
    }

    // Save audio file
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    const audioExt = audioFile.name.split('.').pop() || 'mp3';
    const audioFileName = `${Date.now()}-${audioFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
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
      const coverExt = coverFile.name.split('.').pop() || 'jpg';
      const coverFileName = `${Date.now()}-cover.${coverExt}`;
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
    return NextResponse.json({ error: 'Failed to upload song' }, { status: 500 });
  }
}
