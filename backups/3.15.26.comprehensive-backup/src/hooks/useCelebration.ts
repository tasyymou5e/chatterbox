import { useState, useCallback } from 'react';
import '@/types/navigator'; // Import type extensions for webkitAudioContext
import { cLog } from '@/utils/wideLogger';

type CelebrationType = 'confetti' | 'stars' | 'hearts';

interface UseCelebrationReturn {
  isActive: boolean;
  celebrationType: CelebrationType;
  trigger: (type?: CelebrationType) => void;
  stop: () => void;
  playPraiseSound: () => void;
}

// Praise sounds configuration - kept for future audio file support
// const PRAISE_SOUNDS = {
//   chime: '/audio/chime.mp3',
// };

export function useCelebration(): UseCelebrationReturn {
  const [isActive, setIsActive] = useState(false);
  const [celebrationType, setCelebrationType] = useState<CelebrationType>('confetti');

  const playPraiseSound = useCallback(() => {
    // Create a simple oscillator-based celebration sound
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        cLog('AudioContext not supported');
        return;
      }
      const audioContext = new AudioContextClass();
      // Create a pleasant chime sequence
      const playNote = (frequency: number, startTime: number, duration: number) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };
      
      const now = audioContext.currentTime;
      // Play a happy ascending chime
      playNote(523.25, now, 0.15);        // C5
      playNote(659.25, now + 0.1, 0.15);  // E5
      playNote(783.99, now + 0.2, 0.2);   // G5
      playNote(1046.50, now + 0.3, 0.3);  // C6
    } catch {
      cLog('Audio not supported');
    }
  }, []);

  const trigger = useCallback((type: CelebrationType = 'confetti') => {
    setCelebrationType(type);
    setIsActive(true);
    
    // Trigger celebration haptic pattern
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100, 50, 150]);
    }
    
    // Play praise sound
    playPraiseSound();
    
    // Auto-stop after animation
    setTimeout(() => setIsActive(false), 2000);
  }, [playPraiseSound]);

  const stop = useCallback(() => {
    setIsActive(false);
  }, []);

  return {
    isActive,
    celebrationType,
    trigger,
    stop,
    playPraiseSound,
  };
}
