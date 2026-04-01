import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const song = await db.song.findUnique({
      where: { id },
      select: { id: true, audioBase64: true, mimeType: true, title: true },
    });

    if (!song || !song.audioBase64) {
      return NextResponse.json({ error: 'Audio no encontrado' }, { status: 404 });
    }

    // Convert base64 back to binary
    const buffer = Buffer.from(song.audioBase64, 'base64');

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': song.mimeType || 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (error) {
    console.error('Error streaming audio:', error);
    return NextResponse.json({ error: 'Error al cargar el audio' }, { status: 500 });
  }
}
