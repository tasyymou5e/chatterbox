import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TTSOptions {
  voice?: string;
  speed?: number;
}

interface UseTextToSpeechReturn {
  speak: (text: string, options?: TTSOptions) => Promise<void>;
  stop: () => void;
  isLoading: boolean;
  isSpeaking: boolean;
  error: string | null;
}

const AVAILABLE_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;
type Voice = typeof AVAILABLE_VOICES[number];

export function useTextToSpeech(): UseTextToSpeechReturn {
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
  }, []);

  const speak = useCallback(async (text: string, options?: TTSOptions) => {
    if (!text || text.trim() === '') {
      setError('No text provided');
      return;
    }

    // Stop any current playback
    stop();

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('text-to-speech', {
        body: {
          text: text.trim(),
          voice: options?.voice || 'nova',
          speed: options?.speed || 1.0,
        },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Failed to generate speech');
      }

      if (!data?.audioContent) {
        throw new Error('No audio content received');
      }

      // Create audio from base64
      const audioBlob = new Blob(
        [Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))],
        { type: 'audio/mp3' }
      );
      const audioUrl = URL.createObjectURL(audioBlob);

      // Play audio
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        setError('Failed to play audio');
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };

      setIsSpeaking(true);
      await audio.play();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate speech';
      setError(message);
      toast.error('Speech generation failed', { description: message });
      console.error('TTS error:', err);
    } finally {
      setIsLoading(false);
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

export { AVAILABLE_VOICES };
export type { Voice, TTSOptions };
