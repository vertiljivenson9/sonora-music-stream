import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { db } from '@/lib/db';

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
      if (text) {
        lyrics.push({ time, text });
      }
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

    // Ensure songs directory exists
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

    // Parse lyrics
    const lyricsJson = lyricsLrc ? JSON.stringify(parseLrc(lyricsLrc)) : '[]';

    // Get audio duration (rough estimate from file size, will be updated client-side)
    const duration = 0;

    // Create song in database
    const song = await db.song.create({
      data: {
        title,
        artist,
        album,
        duration,
        genre,
        filePath: audioPath,
        coverUrl,
        lyricsLrc,
        lyricsJson,
      },
    });

    return NextResponse.json(song, { status: 201 });
  } catch (error) {
    console.error('Error uploading song:', error);
    return NextResponse.json({ error: 'Failed to upload song' }, { status: 500 });
  }
}
