/**
 * AudioPlayer - Accessible audio playback component
 * Visual feedback, volume control, and repeat functionality
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { playSynthesizedSound } from './gameUtils';

interface AudioPlayerProps {
  soundId: string;
  label: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showVolumeControl?: boolean;
  autoPlay?: boolean;
  onPlayStart?: () => void;
  onPlayEnd?: () => void;
}

export function AudioPlayer({
  soundId,
  label,
  className,
  size = 'md',
  showVolumeControl = false,
  autoPlay = false,
  onPlayStart,
  onPlayEnd,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Visual waveform animation state
  const [waveformBars, setWaveformBars] = useState<number[]>([0.3, 0.5, 0.7, 0.4, 0.6]);

  const clearTimeoutRef = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const playSound = useCallback(() => {
    if (isMuted) return;
    
    setIsPlaying(true);
    onPlayStart?.();
    
    // Play synthesized sound
    playSynthesizedSound(soundId);
    
    // Animate waveform
    const animateWaveform = () => {
      setWaveformBars(prev => 
        prev.map(() => 0.2 + Math.random() * 0.8)
      );
    };
    
    const waveformInterval = setInterval(animateWaveform, 100);
    
    // Sound duration estimation (based on our synth sounds)
    const duration = 800;
    
    timeoutRef.current = setTimeout(() => {
      clearInterval(waveformInterval);
      setWaveformBars([0.3, 0.5, 0.7, 0.4, 0.6]);
      setIsPlaying(false);
      onPlayEnd?.();
    }, duration);
  }, [soundId, isMuted, onPlayStart, onPlayEnd]);

  const handlePlayClick = useCallback(() => {
    if (isPlaying) {
      clearTimeoutRef();
      setIsPlaying(false);
      setWaveformBars([0.3, 0.5, 0.7, 0.4, 0.6]);
    } else {
      playSound();
    }
  }, [isPlaying, playSound, clearTimeoutRef]);

  const handleReplay = useCallback(() => {
    clearTimeoutRef();
    setIsPlaying(false);
    setTimeout(playSound, 50);
  }, [playSound, clearTimeoutRef]);

  const handleVolumeChange = useCallback((value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  // Auto-play on mount if requested
  useEffect(() => {
    if (autoPlay) {
      const timer = setTimeout(playSound, 300);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [autoPlay, playSound]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimeoutRef();
  }, [clearTimeoutRef]);

  const sizeClasses = {
    sm: 'h-10 gap-2',
    md: 'h-14 gap-3',
    lg: 'h-20 gap-4',
  };

  const buttonSizes = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div 
      className={cn(
        'flex items-center rounded-lg bg-muted/30 px-3',
        sizeClasses[size],
        className
      )}
      role="group"
      aria-label={`Audio player: ${label}`}
    >
      {/* Play/Pause button */}
      <Button
        variant={isPlaying ? 'default' : 'outline'}
        size="icon"
        className={cn(buttonSizes[size], 'rounded-full flex-shrink-0')}
        onClick={handlePlayClick}
        aria-label={isPlaying ? `Pause ${label}` : `Play ${label}`}
      >
        {isPlaying ? (
          <Pause className={iconSizes[size]} />
        ) : (
          <Play className={cn(iconSizes[size], 'ml-0.5')} />
        )}
      </Button>

      {/* Waveform visualization */}
      <div 
        className="flex items-center gap-0.5 flex-1 h-full px-2"
        aria-hidden="true"
      >
        {waveformBars.map((height, i) => (
          <div
            key={i}
            className={cn(
              'w-1 rounded-full transition-all duration-100',
              isPlaying ? 'bg-primary' : 'bg-muted-foreground/30'
            )}
            style={{
              height: `${height * 100}%`,
              minHeight: '20%',
            }}
          />
        ))}
      </div>

      {/* Replay button */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(buttonSizes[size], 'flex-shrink-0')}
        onClick={handleReplay}
        aria-label={`Replay ${label}`}
      >
        <RotateCcw className={iconSizes[size]} />
      </Button>

      {/* Volume control */}
      {showVolumeControl && (
        <div className="flex items-center gap-2 ml-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume]}
            onValueChange={handleVolumeChange}
            max={1}
            step={0.1}
            className="w-20"
            aria-label="Volume"
          />
        </div>
      )}
    </div>
  );
}

export default AudioPlayer;
