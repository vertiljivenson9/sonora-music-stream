import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams;
    const page = parseInt(url.get('page') || '1');
    const limit = parseInt(url.get('limit') || '50');

    const skip = (page - 1) * limit;

    const [songs, total] = await Promise.all([
      db.song.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.song.count(),
    ]);

    return NextResponse.json({ songs, total, page, limit, totalPages: Math.ceil(total / limit) });
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

    // Sanitize filePath to prevent path traversal
    if (filePath.includes('..') || filePath.startsWith('/') || filePath.includes('\\')) {
      return NextResponse.json({ error: 'Invalid filePath' }, { status: 400 });
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
