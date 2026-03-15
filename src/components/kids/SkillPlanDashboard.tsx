/**
 * SkillPlanDashboard - Kids view of today's plan with activity cards
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Star, Play, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ActivityExecutor } from './ActivityExecutor';
import type { CatalogItem } from '@/types/skillPlan';

interface DailyPlanItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  priority: number;
  status: string;
  catalog_item_id: string | null;
  ai_reasoning: string | null;
}

export function SkillPlanDashboard() {
  const { user } = useAuth();
  const [planItems, setPlanItems] = useState<DailyPlanItem[]>([]);
  const [activeItem, setActiveItem] = useState<CatalogItem | null>(null);
  const [activePlanItemId, setActivePlanItemId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadTodaysPlan = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: plans } = await supabase
        .from('user_daily_plans')
        .select('id')
        .eq('user_id', user.id)
        .eq('plan_date', today)
        .limit(1);

      if (plans && plans.length > 0) {
        const { data: items } = await supabase
          .from('user_daily_plan_items')
          .select('*')
          .eq('plan_id', plans[0].id)
          .order('priority');
        setPlanItems((items as DailyPlanItem[]) || []);
      }
    } catch (err) {
      console.error('Error loading plan:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadTodaysPlan();
  }, [loadTodaysPlan]);

  const handleStartActivity = async (item: DailyPlanItem) => {
    if (!item.catalog_item_id) return;
    try {
      const { data } = await supabase.functions.invoke('manage-skill-plan', {
        body: { action: 'get_catalog' },
      });
      const catalogItem = (data?.items || []).find((c: CatalogItem) => c.id === item.catalog_item_id);
      if (catalogItem) {
        setActiveItem(catalogItem);
        setActivePlanItemId(item.id);
      }
    } catch (err) {
      console.error('Error loading catalog item:', err);
    }
  };

  const handleComplete = () => {
    setActiveItem(null);
    setActivePlanItemId(null);
    loadTodaysPlan();
  };

  const completedCount = planItems.filter(i => i.status === 'completed').length;
  const progressPercent = planItems.length > 0 ? (completedCount / planItems.length) * 100 : 0;

  if (activeItem) {
    return (
      <ActivityExecutor
        catalogItem={activeItem}
        planItemId={activePlanItemId || undefined}
        onComplete={handleComplete}
        onClose={handleComplete}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Star className="h-6 w-6 text-accent" />
          Today's Plan
        </CardTitle>
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{completedCount} of {planItems.length} completed</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-3" />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            Loading today's plan...
          </div>
        ) : planItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
            <div className="text-4xl">📋</div>
            <p>No plan for today yet!</p>
            <p className="text-sm">Ask your parent to generate one.</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3 pr-4">
              {planItems.map((item) => {
                const isCompleted = item.status === 'completed';
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-4 rounded-xl border transition-colors ${
                      isCompleted
                        ? 'bg-secondary/10 border-secondary/20'
                        : 'bg-card border-border hover:border-primary/30'
                    }`}
                  >
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                      isCompleted ? 'bg-secondary text-secondary-foreground' : 'bg-muted'
                    }`}>
                      {isCompleted ? <CheckCircle className="h-5 w-5" /> : item.priority}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {item.title}
                      </p>
                      {item.description && (
                        <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                      )}
                      <Badge variant="outline" className="mt-1 text-xs">{item.category}</Badge>
                    </div>
                    {!isCompleted && item.catalog_item_id && (
                      <Button
                        size="sm"
                        onClick={() => handleStartActivity(item)}
                        className="gap-1 flex-shrink-0"
                      >
                        <Play className="h-4 w-4" /> Start
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

export default SkillPlanDashboard;
