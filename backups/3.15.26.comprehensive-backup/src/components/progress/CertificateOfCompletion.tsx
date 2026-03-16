import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Star, Award } from 'lucide-react';
import { SKILL_LEVEL_LABELS, type SkillLevel } from '@/types/lessonProgress';
import { Button } from '@/components/ui/button';

interface CertificateOfCompletionProps {
  childName: string;
  categoryName: string;
  skillLevel: SkillLevel;
  completedAt: Date;
  stats?: {
    accuracy: number;
    moonsEarned: number;
    totalStars: number;
  };
  onDownload?: () => void;
  className?: string;
}

export const CertificateOfCompletion = forwardRef<HTMLDivElement, CertificateOfCompletionProps>(({
  childName,
  categoryName,
  skillLevel,
  completedAt,
  stats,
  onDownload,
  className,
}, ref) => {
  const formattedDate = completedAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      {/* Certificate */}
      <div
        ref={ref}
        className="relative bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 p-8 rounded-lg border-4 border-double border-amber-400 shadow-xl max-w-lg w-full"
      >
        {/* Corner decorations */}
        <div className="absolute top-2 left-2">
          <Star className="h-6 w-6 text-amber-400 fill-amber-400" />
        </div>
        <div className="absolute top-2 right-2">
          <Star className="h-6 w-6 text-amber-400 fill-amber-400" />
        </div>
        <div className="absolute bottom-2 left-2">
          <Star className="h-6 w-6 text-amber-400 fill-amber-400" />
        </div>
        <div className="absolute bottom-2 right-2">
          <Star className="h-6 w-6 text-amber-400 fill-amber-400" />
        </div>

        {/* Content */}
        <div className="text-center space-y-4">
          {/* Award icon */}
          <div className="flex justify-center">
            <Award className="h-16 w-16 text-amber-500" />
          </div>

          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-amber-800 dark:text-amber-200">
            Certificate of Achievement
          </h1>

          <p className="text-muted-foreground">This certifies that</p>

          {/* Child name */}
          <p className="text-3xl md:text-4xl font-script font-bold text-primary">
            {childName}
          </p>

          <p className="text-muted-foreground">has successfully completed</p>

          {/* Category and level */}
          <div className="space-y-1">
            <p className="text-xl font-semibold text-foreground">{categoryName}</p>
            <p className="text-lg text-amber-600 dark:text-amber-400">
              at the {SKILL_LEVEL_LABELS[skillLevel]} Level
            </p>
          </div>

          {/* Stats */}
          {stats && (
            <div className="flex justify-center gap-6 py-2">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{Math.round(stats.accuracy)}%</p>
                <p className="text-xs text-muted-foreground">Accuracy</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-500">{stats.moonsEarned}</p>
                <p className="text-xs text-muted-foreground">Moons</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-500">{stats.totalStars}</p>
                <p className="text-xs text-muted-foreground">Stars</p>
              </div>
            </div>
          )}

          {/* Date */}
          <p className="text-sm text-muted-foreground pt-4">{formattedDate}</p>
        </div>
      </div>

      {/* Download button */}
      {onDownload && (
        <Button onClick={onDownload} className="gap-2">
          <Award className="h-4 w-4" />
          Download Certificate
        </Button>
      )}
    </div>
  );
});

CertificateOfCompletion.displayName = 'CertificateOfCompletion';
