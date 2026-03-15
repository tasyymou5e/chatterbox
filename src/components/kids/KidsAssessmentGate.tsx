/**
 * KidsAssessmentGate - Gates kids portal behind 3 assessment completions
 * Shows kid-friendly assessment cards if assessments are incomplete
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, ClipboardCheck, Brain, FileText, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

const REQUIRED_ASSESSMENTS = [
  {
    id: 'atec',
    name: 'Communication Check',
    description: 'Answer questions about how you talk and listen',
    icon: <ClipboardCheck className="h-10 w-10 text-primary" />,
    emoji: '🗣️',
  },
  {
    id: 'dsm5_interview',
    name: 'Social Skills Check',
    description: 'Questions about how you play and make friends',
    icon: <Brain className="h-10 w-10 text-secondary" />,
    emoji: '🤝',
  },
  {
    id: 'dsm5tr_clinician',
    name: 'Daily Activities Check',
    description: 'Questions about your daily routines and activities',
    icon: <FileText className="h-10 w-10 text-accent" />,
    emoji: '📋',
  },
];

interface KidsAssessmentGateProps {
  children: React.ReactNode;
  onAllComplete?: () => void;
}

export function KidsAssessmentGate({ children, onAllComplete }: KidsAssessmentGateProps) {
  const { user } = useAuth();
  const [completedAssessments, setCompletedAssessments] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [hasApprovedPlan, setHasApprovedPlan] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  const checkAssessments = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      // Check which assessments the child has completed (child_id = their own user id)
      const { data: results } = await supabase
        .from('assessment_results')
        .select('assessment_type')
        .or(`user_id.eq.${user.id},child_id.eq.${user.id}`);

      const completed = new Set<string>();
      results?.forEach(r => {
        if (r.assessment_type) completed.add(r.assessment_type);
      });
      setCompletedAssessments(completed);

      // Check for approved/active plans
      const { data: plans } = await supabase
        .from('skill_plan_schedules')
        .select('id')
        .eq('child_id', user.id)
        .in('status', ['approved', 'active'])
        .limit(1);

      setHasApprovedPlan((plans?.length || 0) > 0);
    } catch (err) {
      console.error('Error checking assessments:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    checkAssessments();
  }, [checkAssessments]);

  const allComplete = REQUIRED_ASSESSMENTS.every(a => completedAssessments.has(a.id));
  const completedCount = REQUIRED_ASSESSMENTS.filter(a => completedAssessments.has(a.id)).length;
  const progressPercent = (completedCount / REQUIRED_ASSESSMENTS.length) * 100;

  // Auto-generate plan when all assessments complete
  const handleGeneratePlan = useCallback(async () => {
    if (!user?.id || isGeneratingPlan) return;
    setIsGeneratingPlan(true);
    try {
      const { error } = await supabase.functions.invoke('generate-daily-plan', {
        body: { schedule_type: 'daily', child_id: user.id },
      });
      if (error) throw error;
      toast({ title: '🎉 Your plan is ready!', description: 'Your parent will review it soon.' });
      await checkAssessments();
      onAllComplete?.();
    } catch (err) {
      console.error('Error generating plan:', err);
      toast({ title: 'Plan generation started', description: 'Your parent will set up your learning plan.' });
    } finally {
      setIsGeneratingPlan(false);
    }
  }, [user?.id, isGeneratingPlan, checkAssessments, onAllComplete]);

  const handleStartAssessment = (assessmentId: string) => {
    // Navigate to assessment with child context
    window.location.href = `/assessment?type=${assessmentId}&childId=${user?.id}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Sparkles className="h-12 w-12 mx-auto text-primary animate-pulse" />
          <p className="text-muted-foreground text-lg">Getting things ready...</p>
        </div>
      </div>
    );
  }

  // If all assessments done and has approved plan, show the portal
  if (allComplete && hasApprovedPlan) {
    return <>{children}</>;
  }

  // If all assessments done but no approved plan yet
  if (allComplete && !hasApprovedPlan) {
    return (
      <div className="max-w-lg mx-auto py-12 px-4">
        <Card className="border-2 border-primary/20">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="text-6xl">✅</div>
            <h2 className="text-2xl font-bold text-foreground text-center">All Checks Complete!</h2>
            <p className="text-muted-foreground text-center">
              Great job! Now let's create your learning plan.
            </p>
            <Button
              size="lg"
              onClick={handleGeneratePlan}
              disabled={isGeneratingPlan}
              className="gap-2 mt-2"
            >
              <Sparkles className="h-5 w-5" />
              {isGeneratingPlan ? 'Creating your plan...' : 'Create My Plan!'}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Your parent will review and approve your plan before you start.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show assessment gate
  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div className="text-center space-y-3">
        <div className="text-5xl">🌟</div>
        <h1 className="text-3xl font-bold text-foreground">Welcome!</h1>
        <p className="text-lg text-muted-foreground">
          Let's learn about you so we can create the perfect plan!
        </p>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{completedCount} of {REQUIRED_ASSESSMENTS.length} complete</span>
            <span className="font-medium text-foreground">{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-4" />
        </CardContent>
      </Card>

      {/* Assessment Cards */}
      <div className="grid gap-4">
        {REQUIRED_ASSESSMENTS.map((assessment) => {
          const isComplete = completedAssessments.has(assessment.id);
          return (
            <Card
              key={assessment.id}
              className={`transition-all ${
                isComplete
                  ? 'border-secondary/50 bg-secondary/5'
                  : 'border-border hover:border-primary/50 hover:shadow-md cursor-pointer'
              }`}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <div className="text-4xl flex-shrink-0">{assessment.emoji}</div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-lg font-bold ${isComplete ? 'text-muted-foreground' : 'text-foreground'}`}>
                    {assessment.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">{assessment.description}</p>
                </div>
                <div className="flex-shrink-0">
                  {isComplete ? (
                    <Badge className="bg-secondary text-secondary-foreground gap-1">
                      <CheckCircle className="h-3 w-3" /> Done!
                    </Badge>
                  ) : (
                    <Button onClick={() => handleStartAssessment(assessment.id)} size="lg">
                      Start
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default KidsAssessmentGate;
