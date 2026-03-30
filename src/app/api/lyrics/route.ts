import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { songId, songTitle } = await request.json();
    
    // Use Web Speech API via a proxy approach - return instructions for client-side
    // Real transcription happens client-side using the browser's built-in SpeechRecognition API
    return NextResponse.json({ 
      message: 'Client-side transcription using Web Speech API',
      instructions: 'Use the browser SpeechRecognition API for real-time transcription'
    });
  } catch (error) {
    console.error('Error in lyrics API:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
