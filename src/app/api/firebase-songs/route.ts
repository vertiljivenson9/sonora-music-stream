import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

const SONGS_PATH = 'songs';

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

// POST: Save song metadata only (files already uploaded via signed URLs)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { songId, title, artist, album, genre, lyricsLrc, audioUrl, coverUrl } = body;

    if (!songId || !title || !audioUrl) {
      return NextResponse.json({ error: 'songId, title y audioUrl son requeridos' }, { status: 400 });
    }

    const now = Date.now();
    const lyricsJson = lyricsLrc ? JSON.stringify(parseLrc(lyricsLrc)) : '[]';

    const songData = {
      title,
      artist: artist || 'Desconocido',
      album: album || '',
      duration: 0,
      genre: genre || '',
      audioUrl,
      coverUrl: coverUrl || '',
      lyricsLrc: lyricsLrc || '',
      lyricsJson,
      playCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    await adminDb.ref(`${SONGS_PATH}/${songId}`).set(songData);

    return NextResponse.json({ id: songId, ...songData, filePath: audioUrl }, { status: 201 });
  } catch (error) {
    console.error('Save song error:', error);
    return NextResponse.json({ error: 'Error al guardar la canción' }, { status: 500 });
  }
}

// GET: List all songs
export async function GET() {
  try {
    const snapshot = await adminDb.ref(SONGS_PATH).once('value');
    if (!snapshot.exists()) {
      return NextResponse.json([]);
    }

    const songs: unknown[] = [];
    snapshot.forEach((child) => {
      const data = child.val();
      songs.push({
        id: child.key,
        ...data,
        filePath: data.audioUrl || '',
        coverUrl: data.coverUrl || '',
        createdAt: data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: data.updatedAt ? new Date(data.updatedAt).toISOString() : new Date().toISOString(),
      });
    });

    songs.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return NextResponse.json(songs);
  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json({ error: 'Error al obtener canciones' }, { status: 500 });
  }
}
