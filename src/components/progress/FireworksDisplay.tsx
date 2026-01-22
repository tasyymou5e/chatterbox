import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { cLog } from '@/utils/conditionalLogger';

interface FireworksDisplayProps {
  isActive: boolean;
  duration?: number;
  onComplete?: () => void;
  className?: string;
}

interface Rocket {
  id: number;
  startX: number;
  endY: number;
  color: string;
  delay: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  angle: number;
  distance: number;
  color: string;
  delay: number;
  size: number;
}

interface Explosion {
  id: number;
  x: number;
  y: number;
  particles: Particle[];
  color: string;
}

const FIREWORK_COLORS = [
  '#FF0000', // Red
  '#FFD700', // Gold
  '#0066FF', // Blue
  '#00FF00', // Green
  '#FF00FF', // Magenta
  '#FF6600', // Orange
  '#00FFFF', // Cyan
];

export function FireworksDisplay({
  isActive,
  duration = 4000,
  onComplete,
  className,
}: FireworksDisplayProps) {
  const [rockets, setRockets] = useState<Rocket[]>([]);
  const [explosions, setExplosions] = useState<Explosion[]>([]);

  const createExplosion = useCallback((rocketId: number, x: number, y: number) => {
    const color = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
    const particleCount = 40 + Math.floor(Math.random() * 20);
    
    const particles: Particle[] = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: 0,
      y: 0,
      angle: (i / particleCount) * 360 + Math.random() * 15,
      distance: 50 + Math.random() * 100,
      color: Math.random() > 0.3 ? color : '#FFFFFF',
      delay: Math.random() * 0.1,
      size: 2 + Math.random() * 4,
    }));

    const newExplosion: Explosion = {
      id: rocketId,
      x,
      y,
      particles,
      color,
    };

    setExplosions(prev => [...prev, newExplosion]);

    // Remove explosion after animation
    setTimeout(() => {
      setExplosions(prev => prev.filter(e => e.id !== rocketId));
    }, 1500);
  }, []);

  useEffect(() => {
    if (!isActive) {
      setRockets([]);
      setExplosions([]);
      return;
    }

    // Play fanfare sound
    playFanfareSound();

    // Launch rockets in sequence
    const rocketCount = 8;
    const newRockets: Rocket[] = [];

    for (let i = 0; i < rocketCount; i++) {
      const rocket: Rocket = {
        id: i,
        startX: 10 + Math.random() * 80,
        endY: 15 + Math.random() * 25,
        color: FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)],
        delay: i * 400 + Math.random() * 200,
      };
      newRockets.push(rocket);

      // Schedule explosion
      setTimeout(() => {
        createExplosion(rocket.id, rocket.startX, rocket.endY);
      }, rocket.delay + 600);
    }

    setRockets(newRockets);

    // Cleanup
    const timer = setTimeout(() => {
      setRockets([]);
      onComplete?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [isActive, duration, onComplete, createExplosion]);

  if (!isActive && rockets.length === 0 && explosions.length === 0) return null;

  return (
    <div className={cn(
      'fixed inset-0 pointer-events-none z-50 overflow-hidden bg-black/20',
      className
    )}>
      {/* Rockets */}
      {rockets.map((rocket) => (
        <div
          key={rocket.id}
          className="absolute bottom-0 w-1 animate-firework-launch"
          style={{
            left: `${rocket.startX}%`,
            height: `${100 - rocket.endY}%`,
            animationDelay: `${rocket.delay}ms`,
            background: `linear-gradient(to top, ${rocket.color}, transparent)`,
          }}
        >
          {/* Rocket head */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: rocket.color, boxShadow: `0 0 10px ${rocket.color}` }}
          />
        </div>
      ))}

      {/* Explosions */}
      {explosions.map((explosion) => (
        <div
          key={explosion.id}
          className="absolute"
          style={{
            left: `${explosion.x}%`,
            top: `${explosion.y}%`,
          }}
        >
          {explosion.particles.map((particle) => (
            <div
              key={particle.id}
              className="absolute animate-firework-explode"
              style={{
                '--angle': `${particle.angle}deg`,
                '--distance': `${particle.distance}px`,
                animationDelay: `${particle.delay}s`,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                backgroundColor: particle.color,
                borderRadius: '50%',
                boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
              } as React.CSSProperties}
            />
          ))}
          
          {/* Center flash */}
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full animate-ping"
            style={{
              backgroundColor: explosion.color,
              boxShadow: `0 0 40px ${explosion.color}`,
            }}
          />
        </div>
      ))}
    </div>
  );
}

function playFanfareSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const audioContext = new AudioContextClass();
    
    // Triumphant fanfare notes
    const notes = [
      { freq: 523.25, start: 0, dur: 0.15 },      // C5
      { freq: 659.25, start: 0.1, dur: 0.15 },    // E5
      { freq: 783.99, start: 0.2, dur: 0.15 },    // G5
      { freq: 1046.50, start: 0.3, dur: 0.3 },    // C6
      { freq: 783.99, start: 0.5, dur: 0.15 },    // G5
      { freq: 1046.50, start: 0.6, dur: 0.4 },    // C6 (hold)
    ];

    notes.forEach(({ freq, start, dur }) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = freq;
      oscillator.type = 'sine';

      const now = audioContext.currentTime;
      gainNode.gain.setValueAtTime(0.2, now + start);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + start + dur);

      oscillator.start(now + start);
      oscillator.stop(now + start + dur);
    });
  } catch {
    cLog('Audio not supported');
  }
}
