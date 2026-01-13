import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  Upload, 
  X, 
  Clock, 
  Star,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { useChorePhotoUpload } from '@/hooks/useChorePhotoUpload';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ChoreCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: {
    id: string;
    chore_id: string;
    family_id: string;
    chore?: {
      id: string;
      title: string;
      description?: string | undefined;
      base_points?: number | undefined;
    };
  };
  userId: string;
  timerSeconds: number;
  onComplete: () => void;
}

const SATISFACTION_EMOJIS = ['😢', '😕', '😐', '🙂', '😄'];
const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Easy', emoji: '😊' },
  { value: 'medium', label: 'Medium', emoji: '😅' },
  { value: 'hard', label: 'Hard', emoji: '😓' },
];

export const ChoreCompletionDialog: React.FC<ChoreCompletionDialogProps> = ({
  open,
  onOpenChange,
  assignment,
  userId,
  timerSeconds,
  onComplete,
}) => {
  const [notes, setNotes] = useState('');
  const [satisfaction, setSatisfaction] = useState<number>(3);
  const [difficulty, setDifficulty] = useState<string>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    photos,
    isUploading,
    removePhoto,
    uploadPhotos,
    clearPhotos,
    handleFileSelect,
    canAddMore,
  } = useChorePhotoUpload({ maxPhotos: 3 });

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    if (!assignment.family_id) {
      toast({
        title: 'Error',
        description: 'Family ID is missing',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload photos first
      const photoUrls = await uploadPhotos(userId, assignment.family_id, assignment.id);

      // Create chore completion record
      const { error: completionError } = await supabase
        .from('chore_completions')
        .insert({
          assignment_id: assignment.id,
          chore_id: assignment.chore_id,
          family_id: assignment.family_id,
          user_id: userId,
          completion_date: new Date().toISOString().split('T')[0],
          time_completed: new Date().toISOString(),
          actual_duration: timerSeconds,
          completion_notes: notes || null,
          satisfaction_rating: satisfaction,
          difficulty_rating: DIFFICULTY_OPTIONS.findIndex(d => d.value === difficulty) + 1,
          completion_photos: photoUrls.length > 0 ? photoUrls : null,
          points_earned: assignment.chore?.base_points || 10,
        });

      if (completionError) {
        console.error('Completion error:', completionError);
        throw completionError;
      }

      // Update assignment status to 'completed' (pending verification)
      const { error: updateError } = await supabase
        .from('chore_assignments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completion_notes: notes || null,
        })
        .eq('id', assignment.id);

      if (updateError) {
        console.error('Assignment update error:', updateError);
        throw updateError;
      }

      toast({
        title: '🎉 Great job!',
        description: 'Task completed! Waiting for parent verification.',
      });

      // Reset form
      setNotes('');
      setSatisfaction(3);
      setDifficulty('medium');
      clearPhotos();
      
      onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('Error completing chore:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit completion. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Complete Task
          </DialogTitle>
          <DialogDescription>
            {assignment.chore?.title || 'Task'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Timer Display */}
          <div className="flex items-center justify-center gap-2 p-3 bg-muted rounded-lg">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <span className="text-lg font-mono font-semibold">
              {formatTime(timerSeconds)}
            </span>
            <span className="text-sm text-muted-foreground">time spent</span>
          </div>

          {/* Photo Upload */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Add Photos (optional)
            </Label>
            
            <div className="flex flex-wrap gap-2">
              {photos.map((photo) => (
                <div 
                  key={photo.id} 
                  className="relative w-20 h-20 rounded-lg overflow-hidden border"
                >
                  <img
                    src={photo.preview}
                    alt="Completion photo"
                    className="w-full h-full object-cover"
                  />
                  {photo.uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                    </div>
                  )}
                  {photo.uploaded && (
                    <div className="absolute top-1 right-1">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </div>
                  )}
                  <button
                    onClick={() => removePhoto(photo.id)}
                    className="absolute top-1 left-1 p-0.5 bg-destructive text-destructive-foreground rounded-full"
                    disabled={isSubmitting}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              
              {canAddMore && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center gap-1 hover:border-primary/50 hover:bg-muted/50 transition-colors"
                  disabled={isSubmitting}
                >
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Add</span>
                </button>
              )}
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <p className="text-xs text-muted-foreground">
              {photos.length}/3 photos • Max 5MB each
            </p>
          </div>

          {/* Satisfaction Rating */}
          <div className="space-y-2">
            <Label>How do you feel?</Label>
            <div className="flex justify-center gap-2">
              {SATISFACTION_EMOJIS.map((emoji, index) => (
                <button
                  key={index}
                  onClick={() => setSatisfaction(index + 1)}
                  className={cn(
                    "text-2xl p-2 rounded-lg transition-all",
                    satisfaction === index + 1 
                      ? "bg-primary/20 scale-110" 
                      : "hover:bg-muted"
                  )}
                  disabled={isSubmitting}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty Rating */}
          <div className="space-y-2">
            <Label>How hard was it?</Label>
            <div className="flex justify-center gap-2">
              {DIFFICULTY_OPTIONS.map((option) => (
                <Badge
                  key={option.value}
                  variant={difficulty === option.value ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer px-3 py-1.5 text-sm",
                    difficulty === option.value && "ring-2 ring-primary/50"
                  )}
                  onClick={() => setDifficulty(option.value)}
                >
                  {option.emoji} {option.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any comments about the task..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              disabled={isSubmitting}
              maxLength={500}
            />
          </div>

          {/* Points Preview */}
          <div className="flex items-center justify-center gap-2 p-2 bg-amber-500/10 rounded-lg">
            <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
            <span className="font-semibold text-amber-600">
              +{assignment.chore?.base_points || 10} points
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || isUploading}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Complete Task
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
