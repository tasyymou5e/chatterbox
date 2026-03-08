import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, RefreshCw, CheckCircle2, Circle, SkipForward, Play, Sparkles } from 'lucide-react';
import { useDailyPlan, type DailyPlanItem } from '@/hooks/useDailyPlan';
import { toast } from '@/hooks/use-toast';

const categoryColors: Record<string, string> = {
  social: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  motor: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  communication: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'daily-living': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  cognitive: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  emotional: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Circle className="w-5 h-5 text-muted-foreground" />,
  in_progress: <Play className="w-5 h-5 text-primary" />,
  completed: <CheckCircle2 className="w-5 h-5 text-green-500" />,
  skipped: <SkipForward className="w-5 h-5 text-muted-foreground" />,
};

function PlanItem({
  item,
  onStatusChange,
}: {
  item: DailyPlanItem;
  onStatusChange: (id: string, status: string) => void;
}) {
  const isCompleted = item.status === 'completed';
  const isSkipped = item.status === 'skipped';

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border transition-all ${
        isCompleted
          ? 'bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
          : isSkipped
          ? 'bg-muted/30 border-border opacity-60'
          : 'bg-card border-border hover:border-primary/30'
      }`}
    >
      <button
        onClick={() =>
          onStatusChange(
            item.id,
            isCompleted ? 'pending' : 'completed'
          )
        }
        className="mt-0.5 shrink-0"
        aria-label={isCompleted ? 'Mark as pending' : 'Mark as completed'}
      >
        {statusIcons[item.status] || statusIcons.pending}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`font-medium text-sm ${
              isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'
            }`}
          >
            {item.title}
          </span>
          <Badge variant="outline" className={`text-xs ${categoryColors[item.category] || ''}`}>
            {item.category}
          </Badge>
        </div>
        {item.description && (
          <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
        )}
        {item.ai_reasoning && (
          <p className="text-xs text-primary/70 mt-1 italic flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            {item.ai_reasoning}
          </p>
        )}
      </div>

      {!isCompleted && !isSkipped && (
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 text-xs"
          onClick={() => onStatusChange(item.id, 'skipped')}
        >
          Skip
        </Button>
      )}
    </div>
  );
}

export function DailyPlanWidget() {
  const { plan, loading, error, generatePlan, updateItemStatus } = useDailyPlan();

  const handleStatusChange = async (itemId: string, status: string) => {
    const { error: updateError } = await updateItemStatus(itemId, status);
    if (updateError) {
      toast({
        title: 'Error',
        description: 'Failed to update item status.',
        variant: 'destructive',
      });
    } else if (status === 'completed') {
      toast({ title: 'Great job! 🎉', description: 'Activity marked as completed.' });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Generating your personalized daily plan...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 space-y-3">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={generatePlan}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!plan || plan.items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 space-y-3">
          <Sparkles className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No daily plan available yet.</p>
          <Button variant="outline" size="sm" onClick={generatePlan}>
            Generate Plan
          </Button>
        </CardContent>
      </Card>
    );
  }

  const completedCount = plan.items.filter(i => i.status === 'completed').length;
  const totalActive = plan.items.filter(i => i.status !== 'skipped').length;
  const progress = totalActive > 0 ? (completedCount / totalActive) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Your Daily Plan
            </CardTitle>
            <CardDescription className="mt-1">
              {plan.summary || 'Personalized activities for today'}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={generatePlan} title="Refresh plan">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{completedCount} of {totalActive} completed</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {plan.items
          .sort((a, b) => a.priority - b.priority)
          .map(item => (
            <PlanItem key={item.id} item={item} onStatusChange={handleStatusChange} />
          ))}
      </CardContent>
    </Card>
  );
}
