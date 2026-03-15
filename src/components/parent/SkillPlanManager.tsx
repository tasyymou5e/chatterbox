/**
 * SkillPlanManager - Parent/Counselor UI for managing autism skill plans
 * Per-child plan review, catalog editing, and approval workflow
 */
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, Sparkles, Play, Users } from 'lucide-react';
import { useSkillPlanManager } from '@/hooks/useSkillPlanManager';
import { getDomainInfo, getItemTypeInfo } from '@/types/skillPlan';
import type { SkillPlanSchedule, PlanItem } from '@/types/skillPlan';

interface FamilyMember {
  user_id: string;
  first_name?: string | null;
  last_name?: string | null;
  role: string;
}

interface SkillPlanManagerProps {
  familyId: string | null;
  childId?: string;
  familyMembers?: FamilyMember[];
}

export function SkillPlanManager({ familyId, childId, familyMembers = [] }: SkillPlanManagerProps) {
  const { plans, isLoading, fetchPlans, approvePlan, rejectPlan, activatePlan, generateAIPlan } = useSkillPlanManager(familyId);
  const [activeTab, setActiveTab] = useState('pending');
  const [approvalNotes, setApprovalNotes] = useState<Record<string, string>>({});
  const [generatingType, setGeneratingType] = useState<string | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string>(childId || '');

  const childMembers = useMemo(() => familyMembers.filter(m => m.role === 'child'), [familyMembers]);

  // Auto-select first child if none selected
  useEffect(() => {
    if (!selectedChildId && childMembers.length > 0) {
      setSelectedChildId(childMembers[0].user_id);
    }
  }, [selectedChildId, childMembers]);

  useEffect(() => {
    if (familyId) {
      fetchPlans(selectedChildId || childId);
    }
  }, [familyId, selectedChildId, childId, fetchPlans]);

  const filteredPlans = plans.filter(p => {
    // Filter by selected child
    if (selectedChildId && p.child_id !== selectedChildId) return false;
    if (activeTab === 'pending') return p.status === 'pending_approval' || p.status === 'draft';
    if (activeTab === 'active') return p.status === 'approved' || p.status === 'active';
    if (activeTab === 'archived') return p.status === 'archived';
    return true;
  });

  const handleGenerate = async (type: string) => {
    if (!selectedChildId) return;
    setGeneratingType(type);
    await generateAIPlan(type, selectedChildId);
    await fetchPlans(selectedChildId);
    setGeneratingType(null);
  };

  const selectedChild = childMembers.find(m => m.user_id === selectedChildId);
  const selectedChildName = selectedChild
    ? `${selectedChild.first_name || ''} ${selectedChild.last_name || ''}`.trim() || 'Child'
    : 'Child';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Skill Plan Manager
        </CardTitle>
        <CardDescription>Review, approve, and manage AI-generated autism skill plans</CardDescription>

        {/* Child selector */}
        {childMembers.length > 0 && (
          <div className="pt-2">
            <Select value={selectedChildId} onValueChange={setSelectedChildId}>
              <SelectTrigger className="w-full">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Select a child" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {childMembers.map(child => (
                  <SelectItem key={child.user_id} value={child.user_id}>
                    {child.first_name || 'Child'} {child.last_name || ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedChildId && (
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
        )}
      </CardHeader>
      <CardContent>
        {!selectedChildId && childMembers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No children found in your family.</p>
            <p className="text-sm mt-1">Create a child account first.</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="pending" className="flex-1">
                Pending ({plans.filter(p => (p.status === 'pending_approval' || p.status === 'draft') && (!selectedChildId || p.child_id === selectedChildId)).length})
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
                    <p>No {activeTab} plans for {selectedChildName}.</p>
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
                        onApprove={() => approvePlan(plan.id, approvalNotes[plan.id]).then(() => fetchPlans(selectedChildId))}
                        onReject={() => rejectPlan(plan.id, approvalNotes[plan.id]).then(() => fetchPlans(selectedChildId))}
                        onActivate={() => activatePlan(plan.id).then(() => fetchPlans(selectedChildId))}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
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
              <Badge className="bg-secondary/20 text-secondary-foreground">{plan.status}</Badge>
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
