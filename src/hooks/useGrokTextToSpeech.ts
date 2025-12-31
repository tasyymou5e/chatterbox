import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Grok's 5 default voice personalities
export const GROK_VOICES = ['Ara', 'Rex', 'Sal', 'Eve', 'Leo'] as const;
export type GrokVoice = typeof GROK_VOICES[number];

export interface GrokTTSOptions {
  voice?: GrokVoice;
  speed?: number;
}

interface UseGrokTextToSpeechReturn {
  speak: (text: string, options?: GrokTTSOptions) => Promise<void>;
  stop: () => void;
  isLoading: boolean;
  isSpeaking: boolean;
  error: string | null;
}

// Simple cache to avoid repeated calls for same text/voice/speed
const audioCache = new Map<string, string>();

export function useGrokTextToSpeech(): UseGrokTextToSpeechReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsSpeaking(false);
    setIsLoading(false);
  }, []);

  const speak = useCallback(async (text: string, options: GrokTTSOptions = {}) => {
    const { voice = 'Ara', speed = 1.0 } = options;

    // Stop any current playback
    stop();

    setError(null);
    setIsLoading(true);

    try {
      // Check cache first
      const cacheKey = `${text}|${voice}|${speed}`;
      let audioUrl = audioCache.get(cacheKey);

      if (!audioUrl) {
        // Call the edge function
        const { data, error: fnError } = await supabase.functions.invoke('text-to-speech', {
          body: { text, voice, speed }
        });

        if (fnError) {
          throw new Error(fnError.message || 'Failed to generate speech');
        }

        if (!data?.audioContent) {
          throw new Error('No audio content received');
        }

        // Convert base64 to blob URL
        const binaryString = atob(data.audioContent);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'audio/mp3' });
        audioUrl = URL.createObjectURL(blob);

        // Cache the URL (limit cache size)
        if (audioCache.size > 50) {
          const firstKey = audioCache.keys().next().value;
          if (firstKey) {
            const oldUrl = audioCache.get(firstKey);
            if (oldUrl) URL.revokeObjectURL(oldUrl);
            audioCache.delete(firstKey);
          }
        }
        audioCache.set(cacheKey, audioUrl);
      }

      // Play the audio
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.oncanplaythrough = () => {
        setIsLoading(false);
        setIsSpeaking(true);
        audio.play().catch(err => {
          setError(`Playback failed: ${err.message}`);
          setIsSpeaking(false);
        });
      };

      audio.onended = () => {
        setIsSpeaking(false);
        audioRef.current = null;
      };

      audio.onerror = () => {
        setIsLoading(false);
        setIsSpeaking(false);
        setError('Audio playback error');
        audioRef.current = null;
      };

      audio.load();
    } catch (err) {
      setIsLoading(false);
      setIsSpeaking(false);
      setError(err instanceof Error ? err.message : 'Failed to speak');
    }
  }, [stop]);

  return {
    speak,
    stop,
    isLoading,
    isSpeaking,
    error,
  };
}
