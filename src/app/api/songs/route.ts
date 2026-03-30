import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const songs = await db.song.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(songs);
  } catch (error) {
    console.error('Error fetching songs:', error);
    return NextResponse.json({ error: 'Failed to fetch songs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, artist, album, duration, genre, filePath, coverUrl, lyricsLrc, lyricsJson } = body;

    if (!title || !filePath) {
      return NextResponse.json({ error: 'Title and filePath are required' }, { status: 400 });
    }

    const song = await db.song.create({
      data: {
        title,
        artist: artist || 'Unknown',
        album: album || '',
        duration: parseFloat(duration) || 0,
        genre: genre || '',
        filePath,
        coverUrl: coverUrl || '',
        lyricsLrc: lyricsLrc || '',
        lyricsJson: lyricsJson || '[]',
      },
    });

    return NextResponse.json(song, { status: 201 });
  } catch (error) {
    console.error('Error creating song:', error);
    return NextResponse.json({ error: 'Failed to create song' }, { status: 500 });
  }
}
