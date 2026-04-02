import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminBucket } from '@/lib/firebase-admin';

const SONGS_PATH = 'songs';

// DELETE: Remove a song
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get song data first
    const snapshot = await adminDb.ref(`${SONGS_PATH}/${id}`).once('value');
    if (!snapshot.exists()) {
      return NextResponse.json({ error: 'Canción no encontrada' }, { status: 404 });
    }

    const data = snapshot.val();

    // Delete audio from Storage
    try {
      const files = await adminBucket.getFiles({ prefix: `songs/${id}/` });
      await Promise.all(files[0].map(file => file.delete()));
    } catch (e) {
      console.warn('Could not delete storage files:', e);
    }

    // Delete from database
    await adminDb.ref(`${SONGS_PATH}/${id}`).remove();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}

// PUT: Update song metadata (lyrics, etc.)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = { updatedAt: Date.now() };

    if (body.lyricsLrc !== undefined) {
      updateData.lyricsLrc = body.lyricsLrc;
      // Re-parse lyrics to JSON
      const lines = body.lyricsLrc.split('\n');
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
      updateData.lyricsJson = JSON.stringify(lyrics.sort((a, b) => a.time - b.time));
    }

    if (body.title !== undefined) updateData.title = body.title;
    if (body.artist !== undefined) updateData.artist = body.artist;
    if (body.genre !== undefined) updateData.genre = body.genre;

    await adminDb.ref(`${SONGS_PATH}/${id}`).update(updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}
