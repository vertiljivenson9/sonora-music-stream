'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';

export default function LiveTranscriber() {
  const { player, liveTranscript, setLiveTranscript, isLiveTranscribing, setIsLiveTranscribing } = useAppStore();
  const [isSupported, setIsSupported] = useState(true);

  const startTranscription = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'es-ES';

    let fullTranscript = '';

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = (event as any).resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if ((event.results[i] as any).isFinal) {
          fullTranscript += transcript + ' ';
        } else {
          interim += transcript;
        }
      }
      setLiveTranscript(fullTranscript + interim);
    };

    recognition.onerror = () => {
      setIsLiveTranscribing(false);
    };

    recognition.onend = () => {
      if (isLiveTranscribing) {
        recognition.start();
      }
    };

    recognition.start();
    setIsLiveTranscribing(true);
  };

  const stopTranscription = () => {
    setIsLiveTranscribing(false);
  };

  if (!isSupported) {
    return (
      <div className="text-xs text-muted-foreground text-center">
        Transcripción no soportada en este navegador. Usa Chrome o Edge.
      </div>
    );
  }

  return (
    <button
      onClick={isLiveTranscribing ? stopTranscription : startTranscription}
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
        isLiveTranscribing
          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
          : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
      }`}
    >
      {isLiveTranscribing ? (
        <>
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          Detener transcripción
        </>
      ) : (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
          Transcripción en vivo
        </>
      )}
    </button>
  );
}
