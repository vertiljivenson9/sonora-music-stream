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
      select: { id: true, coverBase64: true, title: true },
    });

    if (!song || !song.coverBase64) {
      return NextResponse.json({ error: 'Portada no encontrada' }, { status: 404 });
    }

    const buffer = Buffer.from(song.coverBase64, 'base64');

    // Detect MIME type from base64 header
    let mimeType = 'image/jpeg';
    const header = song.coverBase64.substring(0, 10);
    if (header.startsWith('/9j/')) mimeType = 'image/jpeg';
    else if (header.startsWith('iVBOR')) mimeType = 'image/png';
    else if (header.startsWith('UklGR')) mimeType = 'image/webp';
    else if (header.startsWith('R0lGOD')) mimeType = 'image/gif';

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error loading cover:', error);
    return NextResponse.json({ error: 'Error al cargar la portada' }, { status: 500 });
  }
}
