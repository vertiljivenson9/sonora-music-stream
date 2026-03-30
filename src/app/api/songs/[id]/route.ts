import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const song = await db.song.findUnique({ where: { id } });
    if (!song) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }
    // Increment play count
    await db.song.update({
      where: { id },
      data: { playCount: { increment: 1 } },
    });
    return NextResponse.json(song);
  } catch (error) {
    console.error('Error fetching song:', error);
    return NextResponse.json({ error: 'Failed to fetch song' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const song = await db.song.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.artist !== undefined && { artist: body.artist }),
        ...(body.album !== undefined && { album: body.album }),
        ...(body.genre !== undefined && { genre: body.genre }),
        ...(body.coverUrl !== undefined && { coverUrl: body.coverUrl }),
        ...(body.lyricsLrc !== undefined && { lyricsLrc: body.lyricsLrc }),
        ...(body.lyricsJson !== undefined && { lyricsJson: body.lyricsJson }),
      },
    });

    return NextResponse.json(song);
  } catch (error) {
    console.error('Error updating song:', error);
    return NextResponse.json({ error: 'Failed to update song' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const song = await db.song.findUnique({ where: { id } });
    if (!song) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    // Delete file from filesystem
    const fs = await import('fs');
    const path = await import('path');
    const fullPath = path.join(process.cwd(), 'public', song.filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
    // Delete cover if exists
    if (song.coverUrl) {
      const coverPath = path.join(process.cwd(), 'public', song.coverUrl);
      if (fs.existsSync(coverPath)) {
        fs.unlinkSync(coverPath);
      }
    }

    await db.song.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting song:', error);
    return NextResponse.json({ error: 'Failed to delete song' }, { status: 500 });
  }
}
