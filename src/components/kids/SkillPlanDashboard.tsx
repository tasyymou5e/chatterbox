/**
 * SkillPlanDashboard - Kids view of today's approved plan with activity cards
 * Loads from skill_plan_schedules (approved/active plans) instead of user_daily_plans
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Star, Play, CheckCircle, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ActivityExecutor } from './ActivityExecutor';
import { getDomainInfo, getItemTypeInfo } from '@/types/skillPlan';
import type { CatalogItem, PlanItem } from '@/types/skillPlan';

interface PlanItemWithStatus extends PlanItem {
  isCompleted: boolean;
  sessionId?: string;
}

export function SkillPlanDashboard() {
  const { user } = useAuth();
  const [planItems, setPlanItems] = useState<PlanItemWithStatus[]>([]);
  const [planName, setPlanName] = useState('');
  const [activeItem, setActiveItem] = useState<CatalogItem | null>(null);
  const [activePlanItemId, setActivePlanItemId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadApprovedPlan = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      // Fetch approved/active plan from skill_plan_schedules
      const { data: schedules } = await supabase
        .from('skill_plan_schedules')
        .select('id, plan_name, plan_items, status')
        .eq('child_id', user.id)
        .in('status', ['approved', 'active'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (!schedules || schedules.length === 0) {
        setPlanItems([]);
        setPlanName('');
        setIsLoading(false);
        return;
      }

      const schedule = schedules[0];
      setPlanName(schedule.plan_name || "Today's Plan");
      const items: PlanItem[] = Array.isArray(schedule.plan_items) ? schedule.plan_items : [];

      // Fetch session logs to determine completion status
      const { data: sessions } = await supabase
        .from('plan_session_logs')
        .select('catalog_item_id, completion_status, id')
        .eq('child_id', user.id)
        .eq('completion_status', 'completed');

      const completedSet = new Set<string>();
      sessions?.forEach(s => {
        if (s.catalog_item_id) completedSet.add(s.catalog_item_id);
      });

      const enriched: PlanItemWithStatus[] = items.map(item => ({
        ...item,
        isCompleted: completedSet.has(item.catalog_item_id),
      }));

      setPlanItems(enriched);
    } catch (err) {
      console.error('Error loading approved plan:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadApprovedPlan();
  }, [loadApprovedPlan]);

  const handleStartActivity = async (item: PlanItemWithStatus) => {
    if (!item.catalog_item_id) return;
    try {
      const { data } = await supabase.functions.invoke('manage-skill-plan', {
        body: { action: 'get_catalog' },
      });
      const catalogItem = (data?.items || []).find((c: CatalogItem) => c.id === item.catalog_item_id);
      if (catalogItem) {
        setActiveItem(catalogItem);
        setActivePlanItemId(item.catalog_item_id);
      }
    } catch (err) {
      console.error('Error loading catalog item:', err);
    }
  };

  const handleComplete = () => {
    setActiveItem(null);
    setActivePlanItemId(null);
    loadApprovedPlan();
  };

  const completedCount = planItems.filter(i => i.isCompleted).length;
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
          {planName || "Today's Plan"}
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
            Loading your plan...
          </div>
        ) : planItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
            <div className="text-4xl">📋</div>
            <p>No plan ready yet!</p>
            <p className="text-sm">Your parent is reviewing your learning plan.</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3 pr-4">
              {planItems.map((item, idx) => {
                const domain = getDomainInfo(item.skill_domain);
                const itemType = getItemTypeInfo(item.item_type);
                return (
                  <div
                    key={`${item.catalog_item_id}-${idx}`}
                    className={`flex items-center gap-3 p-4 rounded-xl border transition-colors ${
                      item.isCompleted
                        ? 'bg-secondary/10 border-secondary/20'
                        : 'bg-card border-border hover:border-primary/30'
                    }`}
                  >
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                      item.isCompleted ? 'bg-secondary text-secondary-foreground' : 'bg-muted'
                    }`}>
                      {item.isCompleted ? <CheckCircle className="h-5 w-5" /> : <span>{itemType.icon}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${item.isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {item.title}
                      </p>
                      {item.description && (
                        <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                      )}
                      <Badge variant="outline" className={`mt-1 text-xs ${domain.color}`}>
                        {domain.label}
                      </Badge>
                    </div>
                    {!item.isCompleted && item.catalog_item_id && (
                      <Button
                        size="sm"
                        onClick={() => handleStartActivity(item)}
                        className="gap-1 flex-shrink-0"
                      >
                        <Play className="h-4 w-4" /> Start
                      </Button>
                    )}
                    {item.isCompleted && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleStartActivity(item)}
                        className="gap-1 flex-shrink-0 text-muted-foreground"
                      >
                        <RotateCcw className="h-4 w-4" /> Redo
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
