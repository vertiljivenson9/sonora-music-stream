import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

function isPathSafe(filePath: string): boolean {
  // Resolve the full path
  const publicDir = path.resolve(process.cwd(), 'public');
  const fullPath = path.resolve(publicDir, filePath);
  // Ensure the resolved path is within the public directory
  return fullPath.startsWith(publicDir) && !filePath.includes('..');
}

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

    const fs = await import('fs');
    const pathModule = await import('path');

    // Delete audio file with path traversal protection
    if (song.filePath && isPathSafe(song.filePath)) {
      const fullPath = pathModule.join(process.cwd(), 'public', song.filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    // Delete cover if exists with path traversal protection
    if (song.coverUrl && isPathSafe(song.coverUrl)) {
      const coverPath = pathModule.join(process.cwd(), 'public', song.coverUrl);
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
