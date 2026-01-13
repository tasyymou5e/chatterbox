import { useEffect, useState } from 'react';

interface CelebrationEffectProps {
  isActive: boolean;
  type?: 'confetti' | 'stars' | 'hearts';
  onComplete?: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  color: string;
  delay: number;
}

const COLORS = {
  confetti: ['#FFD700', '#FF6B6B', '#4ECDC4', '#A78BFA', '#F472B6', '#34D399'],
  stars: ['#FFD700', '#FFA500', '#FFE135'],
  hearts: ['#FF6B6B', '#F472B6', '#EC4899'],
};

export function CelebrationEffect({ 
  isActive, 
  type = 'confetti',
  onComplete 
}: CelebrationEffectProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (isActive) {
      const colors = COLORS[type];
      const newParticles: Particle[] = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 20 - 10,
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.3,
      }));
      setParticles(newParticles);

      const timer = setTimeout(() => {
        setParticles([]);
        onComplete?.();
      }, 2000);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isActive, type, onComplete]);

  if (!isActive || particles.length === 0) return null;

  const renderParticle = (particle: Particle): React.ReactNode => {
    const baseStyle = {
      left: `${particle.x}%`,
      top: `${particle.y}%`,
      transform: `rotate(${particle.rotation}deg) scale(${particle.scale})`,
      animationDelay: `${particle.delay}s`,
      color: particle.color,
    };

    if (type === 'stars') {
      return (
        <span
          key={particle.id}
          className="absolute animate-celebration-fall text-2xl"
          style={baseStyle}
        >
          ⭐
        </span>
      );
    }

    if (type === 'hearts') {
      return (
        <span
          key={particle.id}
          className="absolute animate-celebration-fall text-2xl"
          style={baseStyle}
        >
          ❤️
        </span>
      );
    }

    // Confetti squares
    return (
      <div
        key={particle.id}
        className="absolute w-3 h-3 animate-celebration-fall"
        style={{
          ...baseStyle,
          backgroundColor: particle.color,
          borderRadius: Math.random() > 0.5 ? '50%' : '0',
        }}
      />
    );
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map(renderParticle)}
    </div>
  );
}
