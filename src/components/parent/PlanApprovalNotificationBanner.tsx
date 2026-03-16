/**
 * PlanApprovalNotificationBanner - Shows a banner when skill plans need parent approval
 */
import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, ChevronRight, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PendingPlan {
  id: string;
  plan_name: string;
  child_id: string;
  schedule_type: string;
  created_at: string;
}

interface PlanApprovalNotificationBannerProps {
  familyId: string | null;
  onNavigateToPlans?: () => void;
}

export function PlanApprovalNotificationBanner({ familyId, onNavigateToPlans }: PlanApprovalNotificationBannerProps) {
  const [pendingPlans, setPendingPlans] = useState<PendingPlan[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!familyId) return;

    const fetchPending = async () => {
      const { data } = await supabase
        .from('skill_plan_schedules')
        .select('id, plan_name, child_id, schedule_type, created_at')
        .eq('family_id', familyId)
        .in('status', ['pending_approval', 'draft'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) setPendingPlans(data);
    };

    fetchPending();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`plan-approvals-${familyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'skill_plan_schedules',
          filter: `family_id=eq.${familyId}`,
        },
        () => {
          fetchPending();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [familyId]);

  if (dismissed || pendingPlans.length === 0) return null;

  return (
    <Alert className="border-primary/30 bg-primary/5 mb-6">
      <Bell className="h-4 w-4 text-primary" />
      <AlertTitle className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          Plans Awaiting Approval
          <Badge className="bg-primary text-primary-foreground">{pendingPlans.length}</Badge>
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setDismissed(true)}
        >
          <X className="h-3 w-3" />
        </Button>
      </AlertTitle>
      <AlertDescription className="mt-1">
        <p className="text-sm text-muted-foreground mb-2">
          {pendingPlans.length === 1
            ? `"${pendingPlans[0].plan_name}" is ready for your review.`
            : `${pendingPlans.length} skill plans need your review and approval.`}
        </p>
        {onNavigateToPlans && (
          <Button size="sm" variant="outline" onClick={onNavigateToPlans} className="gap-1">
            Review Plans <ChevronRight className="h-3 w-3" />
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
