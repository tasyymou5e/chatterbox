/**
 * SkillPlanManager - Parent/Counselor UI for managing autism skill plans
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, Sparkles, Play } from 'lucide-react';
import { useSkillPlanManager } from '@/hooks/useSkillPlanManager';
import { getDomainInfo, getItemTypeInfo } from '@/types/skillPlan';
import type { SkillPlanSchedule, PlanItem } from '@/types/skillPlan';

interface SkillPlanManagerProps {
  familyId: string | null;
  childId?: string;
}

export function SkillPlanManager({ familyId, childId }: SkillPlanManagerProps) {
  const { plans, isLoading, fetchPlans, approvePlan, rejectPlan, activatePlan, generateAIPlan } = useSkillPlanManager(familyId);
  const [activeTab, setActiveTab] = useState('pending');
  const [approvalNotes, setApprovalNotes] = useState<Record<string, string>>({});
  const [generatingType, setGeneratingType] = useState<string | null>(null);

  useEffect(() => {
    if (familyId) {
      fetchPlans(childId);
    }
  }, [familyId, childId, fetchPlans]);

  const filteredPlans = plans.filter(p => {
    if (activeTab === 'pending') return p.status === 'pending_approval' || p.status === 'draft';
    if (activeTab === 'active') return p.status === 'approved' || p.status === 'active';
    if (activeTab === 'archived') return p.status === 'archived';
    return true;
  });

  const handleGenerate = async (type: string) => {
    setGeneratingType(type);
    await generateAIPlan(type, childId);
    await fetchPlans(childId);
    setGeneratingType(null);
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Skill Plan Manager
        </CardTitle>
        <CardDescription>Review, approve, and manage AI-generated autism skill plans</CardDescription>
        <div className="flex gap-2 pt-2">
          {['daily', 'weekly', 'monthly'].map(type => (
            <Button
              key={type}
              size="sm"
              variant="outline"
              disabled={!!generatingType}
              onClick={() => handleGenerate(type)}
            >
              {generatingType === type ? 'Generating...' : `Generate ${type}`}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="pending" className="flex-1">
              Pending ({plans.filter(p => p.status === 'pending_approval' || p.status === 'draft').length})
            </TabsTrigger>
            <TabsTrigger value="active" className="flex-1">Active</TabsTrigger>
            <TabsTrigger value="archived" className="flex-1">Archived</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            <ScrollArea className="h-[500px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">Loading plans...</div>
              ) : filteredPlans.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                  <p>No {activeTab} plans found.</p>
                  <p className="text-sm">Generate an AI plan to get started.</p>
                </div>
              ) : (
                <div className="space-y-4 pr-4">
                  {filteredPlans.map(plan => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      notes={approvalNotes[plan.id] || ''}
                      onNotesChange={(v) => setApprovalNotes(prev => ({ ...prev, [plan.id]: v }))}
                      onApprove={() => approvePlan(plan.id, approvalNotes[plan.id]).then(() => fetchPlans(childId))}
                      onReject={() => rejectPlan(plan.id, approvalNotes[plan.id]).then(() => fetchPlans(childId))}
                      onActivate={() => activatePlan(plan.id).then(() => fetchPlans(childId))}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function PlanCard({
  plan, notes, onNotesChange, onApprove, onReject, onActivate,
}: {
  plan: SkillPlanSchedule;
  notes: string;
  onNotesChange: (v: string) => void;
  onApprove: () => void;
  onReject: () => void;
  onActivate: () => void;
}) {
  const items: PlanItem[] = Array.isArray(plan.plan_items) ? plan.plan_items : [];

  return (
    <Card className="border border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{plan.plan_name}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{plan.schedule_type}</Badge>
            {plan.status === 'draft' || plan.status === 'pending_approval' ? (
              <Badge className="bg-yellow-100 text-yellow-800">{plan.status.replace('_', ' ')}</Badge>
            ) : (
              <Badge className="bg-green-100 text-green-800">{plan.status}</Badge>
            )}
          </div>
        </div>
        <CardDescription>
          {new Date(plan.start_date).toLocaleDateString()} • {items.length} items
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Plan items preview */}
        <div className="grid gap-2">
          {items.slice(0, 5).map((item, idx) => {
            const domain = getDomainInfo(item.skill_domain);
            const itemType = getItemTypeInfo(item.item_type);
            return (
              <div key={idx} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/50">
                <span>{itemType.icon}</span>
                <span className="flex-1 font-medium">{item.title}</span>
                <Badge variant="outline" className={`text-xs ${domain.color}`}>
                  {domain.label}
                </Badge>
              </div>
            );
          })}
          {items.length > 5 && (
            <p className="text-xs text-muted-foreground pl-2">+{items.length - 5} more items</p>
          )}
        </div>

        {/* Approval controls */}
        {(plan.status === 'draft' || plan.status === 'pending_approval') && (
          <div className="space-y-2 pt-2 border-t">
            <Textarea
              placeholder="Approval notes (optional)..."
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              className="h-16 text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={onApprove} className="flex-1 gap-1">
                <CheckCircle className="h-4 w-4" /> Approve
              </Button>
              <Button size="sm" variant="outline" onClick={onReject} className="flex-1 gap-1">
                <XCircle className="h-4 w-4" /> Return to Draft
              </Button>
            </div>
          </div>
        )}

        {plan.status === 'approved' && (
          <Button size="sm" onClick={onActivate} className="w-full gap-1">
            <Play className="h-4 w-4" /> Activate Plan
          </Button>
        )}

        {plan.approval_notes && (
          <p className="text-xs text-muted-foreground italic">Notes: {plan.approval_notes}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default SkillPlanManager;
