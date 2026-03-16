import { useState, useRef, useCallback, useEffect } from 'react';

export const AVAILABLE_VOICES = ['male', 'female'] as const;
export type Voice = typeof AVAILABLE_VOICES[number];

export interface TTSOptions {
  voice?: Voice;
  speed?: number;
}

interface UseTextToSpeechReturn {
  speak: (text: string, options?: TTSOptions) => Promise<void>;
  stop: () => void;
  isLoading: boolean;
  isSpeaking: boolean;
  error: string | null;
  isSupported: boolean;
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Check for Web Speech API support and load voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);
      
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
      };
      
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
      
      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
    return undefined;
  }, []);

  const getVoice = useCallback((voiceType: Voice): SpeechSynthesisVoice | null => {
    if (voices.length === 0) return null;
    
    // Try to find English voices
    const englishVoices = voices.filter(v => v.lang.startsWith('en'));
    
    if (voiceType === 'male') {
      // Look for male-sounding voice names
      const maleVoice = englishVoices.find(v => 
        v.name.toLowerCase().includes('male') || 
        v.name.toLowerCase().includes('david') ||
        v.name.toLowerCase().includes('james') ||
        v.name.toLowerCase().includes('daniel') ||
        v.name.toLowerCase().includes('guy')
      );
      return maleVoice || englishVoices[0] || voices[0];
    }
    
    if (voiceType === 'female') {
      // Look for female-sounding voice names
      const femaleVoice = englishVoices.find(v => 
        v.name.toLowerCase().includes('female') || 
        v.name.toLowerCase().includes('samantha') ||
        v.name.toLowerCase().includes('victoria') ||
        v.name.toLowerCase().includes('karen') ||
        v.name.toLowerCase().includes('zira')
      );
      return femaleVoice || englishVoices[1] || englishVoices[0] || voices[0];
    }
    
    // Default voice
    return englishVoices[0] || voices[0] || null;
  }, [voices]);

  const speak = useCallback(async (text: string, options: TTSOptions = {}) => {
    const { voice = 'female', speed = 1.0 } = options;

    if (!isSupported) {
      setError('Text-to-speech is not supported in this browser');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    setError(null);
    setIsLoading(true);

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;
      
      // Set voice
      const selectedVoice = getVoice(voice);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      
      // Set speech rate (0.1 to 10, default 1)
      utterance.rate = Math.max(0.5, Math.min(2, speed));
      
      // Set pitch (0 to 2, default 1)
      utterance.pitch = 1;
      
      // Set volume (0 to 1, default 1)
      utterance.volume = 1;

      utterance.onstart = () => {
        setIsLoading(false);
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        utteranceRef.current = null;
      };

      utterance.onerror = (event) => {
        setIsLoading(false);
        setIsSpeaking(false);
        if (event.error !== 'canceled') {
          setError(`Speech error: ${event.error}`);
        }
        utteranceRef.current = null;
      };

      // Small delay to ensure loading state shows
      await new Promise(resolve => setTimeout(resolve, 100));
      
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      setIsLoading(false);
      setIsSpeaking(false);
      setError(err instanceof Error ? err.message : 'Failed to speak');
    }
  }, [isSupported, getVoice]);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsLoading(false);
    utteranceRef.current = null;
  }, []);

  return {
    speak,
    stop,
    isLoading,
    isSpeaking,
    error,
    isSupported,
  };
}
