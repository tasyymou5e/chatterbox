import React, { useState, useEffect } from 'react';
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
import { Slider } from '@/components/ui/slider';
import { 
  CheckCircle2, 
  RotateCcw, 
  Clock, 
  Star, 
  MessageSquare,
  ImageIcon,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ChoreVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: {
    id: string;
    chore_id: string;
    family_id: string;
    assigned_to: string;
    completed_at?: string;
    completion_notes?: string;
    chore?: {
      id: string;
      title: string;
      description?: string;
      base_points?: number;
    };
    profiles?: {
      first_name?: string;
      last_name?: string;
    };
  };
  onVerified: () => void;
}

interface CompletionData {
  id: string;
  actual_duration: number | null;
  satisfaction_rating: number | null;
  difficulty_rating: number | null;
  completion_notes: string | null;
  completion_photos: string[] | null;
  points_earned: number | null;
  time_completed: string;
}

const SATISFACTION_EMOJIS = ['😢', '😕', '😐', '🙂', '😄'];
const DIFFICULTY_LABELS = ['Very Easy', 'Easy', 'Medium', 'Hard', 'Very Hard'];

export const ChoreVerificationDialog: React.FC<ChoreVerificationDialogProps> = ({
  open,
  onOpenChange,
  assignment,
  onVerified,
}) => {
  const [feedback, setFeedback] = useState('');
  const [bonusPoints, setBonusPoints] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completionData, setCompletionData] = useState<CompletionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  useEffect(() => {
    if (open && assignment.id) {
      fetchCompletionData();
    }
  }, [open, assignment.id]);

  const fetchCompletionData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('chore_completions')
        .select('*')
        .eq('assignment_id', assignment.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching completion:', error);
      } else {
        setCompletionData(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const handleVerify = async (approved: boolean) => {
    setIsSubmitting(true);
    try {
      const finalPoints = approved 
        ? (completionData?.points_earned || assignment.chore?.base_points || 10) + bonusPoints
        : 0;

      // Update assignment status
      const { error: updateError } = await supabase
        .from('chore_assignments')
        .update({
          status: approved ? 'verified' : 'needs_redo',
          is_verified: approved,
          verified_at: approved ? new Date().toISOString() : null,
          parent_feedback: feedback || null,
          points_earned: finalPoints,
        })
        .eq('id', assignment.id);

      if (updateError) {
        throw updateError;
      }

      // Update completion record points if approved
      if (approved && completionData) {
        await supabase
          .from('chore_completions')
          .update({ points_earned: finalPoints })
          .eq('id', completionData.id);
      }

      toast({
        title: approved ? '✅ Task Verified!' : '🔄 Redo Requested',
        description: approved 
          ? `${assignment.profiles?.first_name || 'Child'} earned ${finalPoints} points!`
          : `${assignment.profiles?.first_name || 'Child'} will see your feedback.`,
      });

      setFeedback('');
      setBonusPoints(0);
      onVerified();
      onOpenChange(false);
    } catch (error) {
      console.error('Error verifying:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const photos = completionData?.completion_photos || [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-orange-500" />
              Verify Task Completion
            </DialogTitle>
            <DialogDescription>
              {assignment.chore?.title || 'Task'}
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Child Info */}
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">
                    {assignment.profiles?.first_name || 'Child'} {assignment.profiles?.last_name || ''}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Completed {assignment.completed_at 
                      ? format(new Date(assignment.completed_at), 'MMM d, h:mm a')
                      : 'recently'}
                  </p>
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 bg-muted rounded-lg">
                  <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {formatDuration(completionData?.actual_duration || null)}
                  </p>
                  <p className="text-xs text-muted-foreground">Duration</p>
                </div>
                <div className="text-center p-2 bg-muted rounded-lg">
                  <span className="text-xl">
                    {completionData?.satisfaction_rating 
                      ? SATISFACTION_EMOJIS[completionData.satisfaction_rating - 1] 
                      : '—'}
                  </span>
                  <p className="text-xs text-muted-foreground">Feeling</p>
                </div>
                <div className="text-center p-2 bg-muted rounded-lg">
                  <p className="text-sm font-medium">
                    {completionData?.difficulty_rating 
                      ? DIFFICULTY_LABELS[completionData.difficulty_rating - 1]?.split(' ').pop() 
                      : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">Difficulty</p>
                </div>
              </div>

              {/* Photos */}
              {photos.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Completion Photos ({photos.length})
                  </Label>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {photos.map((url, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedPhotoIndex(index)}
                        className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border hover:ring-2 hover:ring-primary transition-all"
                      >
                        <img
                          src={url}
                          alt={`Completion photo ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Child's Notes */}
              {(completionData?.completion_notes || assignment.completion_notes) && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Child's Notes
                  </Label>
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    {completionData?.completion_notes || assignment.completion_notes}
                  </div>
                </div>
              )}

              {/* Parent Feedback */}
              <div className="space-y-2">
                <Label htmlFor="feedback">Your Feedback (optional)</Label>
                <Textarea
                  id="feedback"
                  placeholder="Great job! / Please make sure to..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={2}
                  disabled={isSubmitting}
                  maxLength={500}
                />
              </div>

              {/* Bonus Points */}
              <div className="space-y-2">
                <Label className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Bonus Points
                  </span>
                  <Badge variant={bonusPoints > 0 ? "default" : "secondary"}>
                    +{bonusPoints}
                  </Badge>
                </Label>
                <Slider
                  value={[bonusPoints]}
                  onValueChange={([value]) => setBonusPoints(value)}
                  min={0}
                  max={30}
                  step={5}
                  disabled={isSubmitting}
                  className="py-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>+0</span>
                  <span>+15</span>
                  <span>+30</span>
                </div>
              </div>

              {/* Points Summary */}
              <div className="flex items-center justify-center gap-2 p-3 bg-amber-500/10 rounded-lg">
                <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                <span className="font-semibold text-amber-600">
                  Total: {(completionData?.points_earned || assignment.chore?.base_points || 10) + bonusPoints} points
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
            <Button 
              variant="destructive" 
              onClick={() => handleVerify(false)}
              disabled={isSubmitting || isLoading}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" />
              )}
              Request Redo
            </Button>
            <Button
              onClick={() => handleVerify(true)}
              disabled={isSubmitting || isLoading}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photo Lightbox */}
      {selectedPhotoIndex !== null && photos.length > 0 && (
        <Dialog open={true} onOpenChange={() => setSelectedPhotoIndex(null)}>
          <DialogContent className="sm:max-w-3xl p-0 bg-black/90">
            <div className="relative">
              <img
                src={photos[selectedPhotoIndex]}
                alt={`Photo ${selectedPhotoIndex + 1}`}
                className="w-full h-auto max-h-[80vh] object-contain"
              />
              <button
                onClick={() => setSelectedPhotoIndex(null)}
                className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
              >
                <X className="h-5 w-5" />
              </button>
              {photos.length > 1 && (
                <>
                  <button
                    onClick={() => setSelectedPhotoIndex(prev => 
                      prev !== null ? (prev > 0 ? prev - 1 : photos.length - 1) : 0
                    )}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={() => setSelectedPhotoIndex(prev => 
                      prev !== null ? (prev < photos.length - 1 ? prev + 1 : 0) : 0
                    )}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 rounded-full text-white text-sm">
                {selectedPhotoIndex + 1} / {photos.length}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
