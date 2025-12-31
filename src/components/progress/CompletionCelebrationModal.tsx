import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FireworksDisplay } from './FireworksDisplay';
import { CertificateOfCompletion } from './CertificateOfCompletion';
import { Button } from '@/components/ui/button';
import { useCertificateGenerator } from '@/hooks/useCertificateGenerator';
import type { SkillLevel } from '@/types/lessonProgress';

interface CompletionCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  childName: string;
  categoryName: string;
  categoryId: string;
  skillLevel: SkillLevel;
  stats?: {
    accuracy: number;
    moonsEarned: number;
    totalStars: number;
  };
  userId: string;
  familyId: string;
}

export function CompletionCelebrationModal({
  isOpen,
  onClose,
  childName,
  categoryName,
  categoryId,
  skillLevel,
  stats,
  userId,
  familyId,
}: CompletionCelebrationModalProps) {
  const [showFireworks, setShowFireworks] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const { generateAndDownload, saving } = useCertificateGenerator();

  useEffect(() => {
    if (isOpen) {
      setShowFireworks(true);
      setShowCertificate(false);

      // Show certificate after fireworks
      const timer = setTimeout(() => {
        setShowFireworks(false);
        setShowCertificate(true);
      }, 4000);

      return () => clearTimeout(timer);
    } else {
      setShowFireworks(false);
      setShowCertificate(false);
    }
  }, [isOpen]);

  const handleDownload = async () => {
    await generateAndDownload({
      userId,
      familyId,
      categoryId,
      categoryName,
      childName,
      skillLevel,
      stats,
    });
  };

  return (
    <>
      <FireworksDisplay isActive={showFireworks} />
      
      <Dialog open={isOpen && showCertificate} onOpenChange={onClose}>
        <DialogContent className="max-w-xl">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-primary">
              🎉 Amazing job, {childName}! 🎉
            </h2>
            <p className="text-muted-foreground">
              You completed the {skillLevel} level!
            </p>
          </div>

          <CertificateOfCompletion
            childName={childName}
            categoryName={categoryName}
            skillLevel={skillLevel}
            completedAt={new Date()}
            stats={stats}
            onDownload={handleDownload}
          />

          <div className="flex justify-center mt-4">
            <Button variant="outline" onClick={onClose}>
              Continue Learning
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
