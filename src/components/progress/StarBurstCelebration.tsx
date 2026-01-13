import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';

export interface StarBurstCelebrationProps {
  isActive: boolean;
  onComplete?: () => void;
  message?: string | undefined;
  className?: string;
}

interface BurstStar {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  delay: number;
  angle: number;
  distance: number;
}

export function StarBurstCelebration({
  isActive,
  onComplete,
  message = "Great job! ⭐",
  className,
}: StarBurstCelebrationProps) {
  const [stars, setStars] = useState<BurstStar[]>([]);
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    if (isActive) {
      // Generate burst stars
      const newStars: BurstStar[] = Array.from({ length: 12 }, (_, i) => ({
        id: i,
        x: 50,
        y: 50,
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 0.5,
        delay: i * 0.03,
        angle: (i / 12) * 360,
        distance: 30 + Math.random() * 40,
      }));
      setStars(newStars);
      setShowMessage(true);

      const timer = setTimeout(() => {
        setStars([]);
        setShowMessage(false);
        onComplete?.();
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [isActive, onComplete]);

  if (!isActive && stars.length === 0) return null;

  return (
    <div className={cn(
      'fixed inset-0 pointer-events-none z-50 flex items-center justify-center',
      className
    )}>
      {/* Central burst origin */}
      <div className="relative w-64 h-64">
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute left-1/2 top-1/2 animate-star-burst-explode"
            style={{
              '--angle': `${star.angle}deg`,
              '--distance': `${star.distance}px`,
              animationDelay: `${star.delay}s`,
              transform: `translate(-50%, -50%) rotate(${star.rotation}deg) scale(${star.scale})`,
            } as React.CSSProperties}
          >
            <Star
              className="h-6 w-6 text-yellow-400 fill-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]"
            />
          </div>
        ))}

        {/* Center glow */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-16 h-16 rounded-full bg-yellow-400/30 blur-xl animate-ping" />
        </div>
      </div>

      {/* Praise message */}
      {showMessage && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-24">
          <p className="text-2xl font-bold text-primary animate-bounce whitespace-nowrap">
            {message}
          </p>
        </div>
      )}
    </div>
  );
}
