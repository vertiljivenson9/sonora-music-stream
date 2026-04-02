import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminBucket } from '@/lib/firebase-admin';

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

function getExtension(filename: string): string {
  const parts = filename.toLowerCase().split('.');
  return parts.length > 1 ? `.${parts.pop()}` : '.mp3';
}

function getMimeType(ext: string): string {
  const map: Record<string, string> = {
    '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.flac': 'audio/flac',
    '.webm': 'audio/webm', '.wma': 'audio/x-ms-wma', '.opus': 'audio/opus',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.webp': 'image/webp', '.gif': 'image/gif',
  };
  return map[ext] || 'application/octet-stream';
}

// POST: Upload a new song
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

    if (!audioFile || !title) {
      return NextResponse.json({ error: 'Audio y título son requeridos' }, { status: 400 });
    }

    if (audioFile.size > 100 * 1024 * 1024) {
      return NextResponse.json({ error: 'El archivo es muy grande. Máximo 100MB' }, { status: 400 });
    }

    const songRef = adminDb.ref(SONGS_PATH).push();
    const songId = songRef.key!;
    const now = Date.now();

    const ext = getExtension(audioFile.name);
    const mimeType = getMimeType(ext);

    // Upload audio using Admin SDK (bypasses security rules)
    const audioPath = `songs/${songId}/audio${ext}`;
    const audioFileRef = adminBucket.file(audioPath);
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    
    await audioFileRef.save(audioBuffer, {
      metadata: {
        contentType: mimeType,
        cacheControl: 'public, max-age=31536000',
      },
    });
    await audioFileRef.makePublic();
    const audioUrl = `https://storage.googleapis.com/${adminBucket.name}/${audioPath}`;

    // Upload cover if provided
    let coverUrl = '';
    if (coverFile && coverFile.size > 0) {
      const coverExt = getExtension(coverFile.name);
      const coverPath = `songs/${songId}/cover${coverExt}`;
      const coverFileRef = adminBucket.file(coverPath);
      const coverBuffer = Buffer.from(await coverFile.arrayBuffer());
      
      await coverFileRef.save(coverBuffer, {
        metadata: {
          contentType: getMimeType(coverExt),
          cacheControl: 'public, max-age=31536000',
        },
      });
      await coverFileRef.makePublic();
      coverUrl = `https://storage.googleapis.com/${adminBucket.name}/${coverPath}`;
    }

    const lyricsJson = lyricsLrc ? JSON.stringify(parseLrc(lyricsLrc)) : '[]';
    
    const songData = {
      title, artist, album, duration: 0, genre,
      audioUrl, coverUrl, lyricsLrc, lyricsJson,
      playCount: 0, createdAt: now, updatedAt: now,
    };

    await songRef.set(songData);

    return NextResponse.json({
      id: songId, ...songData,
      filePath: audioUrl,
    }, { status: 201 });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Error al subir la canción' }, { status: 500 });
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
