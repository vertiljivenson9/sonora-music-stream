import { NextRequest, NextResponse } from 'next/server';
import { adminBucket } from '@/lib/firebase-admin';
import { v4 as uuidv4 } from 'uuid';

// Generate signed upload URLs for direct client-to-GCS upload
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { audioFileName, audioContentType, coverFileName, coverContentType } = body;

    if (!audioFileName) {
      return NextResponse.json({ error: 'audioFileName is required' }, { status: 400 });
    }

    const songId = uuidv4();
    const audioExt = getExtension(audioFileName);

    // Generate signed URL for audio upload (valid for 15 minutes)
    const audioPath = `songs/${songId}/audio${audioExt}`;
    const audioFile = adminBucket.file(audioPath);
    
    const [audioUploadUrl] = await audioFile.getSignedUrl({
      version: 'v4',
      action: 'write',
      contentType: audioContentType || getMimeType(audioExt),
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    });

    // Generate signed URL for audio download (public read)
    const [audioDownloadUrl] = await audioFile.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
    });

    // Generate signed URL for cover upload if provided
    let coverUploadUrl = '';
    let coverDownloadUrl = '';
    if (coverFileName) {
      const coverExt = getExtension(coverFileName);
      const coverPath = `songs/${songId}/cover${coverExt}`;
      const coverFile = adminBucket.file(coverPath);
      
      const [cUploadUrl] = await coverFile.getSignedUrl({
        version: 'v4',
        action: 'write',
        contentType: coverContentType || getMimeType(coverExt),
        expires: Date.now() + 15 * 60 * 1000,
      });

      const [cDownloadUrl] = await coverFile.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
      });

      coverUploadUrl = cUploadUrl;
      coverDownloadUrl = cDownloadUrl;
    }

    return NextResponse.json({
      songId,
      audioUploadUrl,
      audioDownloadUrl,
      coverUploadUrl,
      coverDownloadUrl,
    });
  } catch (error) {
    console.error('Generate upload URL error:', error);
    return NextResponse.json({ error: 'Error al generar URLs de subida' }, { status: 500 });
  }
}

function getExtension(filename: string): string {
  const parts = filename.toLowerCase().split('.');
  return parts.length > 1 ? `.${parts.pop()}` : '.mp3';
}

function getMimeType(ext: string): string {
  const map: Record<string, string> = {
    '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.flac': 'audio/flac',
    '.webm': 'audio/webm', '.opus': 'audio/opus',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.webp': 'image/webp',
  };
  return map[ext] || 'application/octet-stream';
}
