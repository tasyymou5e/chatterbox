/**
 * SkillPlanManager - Parent/Counselor UI for managing autism skill plans
 * Per-child plan review, catalog editing, and approval workflow
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  CheckCircle, XCircle, Sparkles, Play, Users, Plus, Trash2,
  ArrowUp, ArrowDown, Search, BookOpen, Edit2, Save, ChevronDown,
} from 'lucide-react';
import { useSkillPlanManager } from '@/hooks/useSkillPlanManager';
import { getDomainInfo, getItemTypeInfo, SKILL_DOMAINS, ITEM_TYPES } from '@/types/skillPlan';
import type { SkillPlanSchedule, PlanItem, CatalogItem } from '@/types/skillPlan';
import { supabase } from '@/integrations/supabase/client';

interface FamilyMember {
  user_id: string;
  first_name?: string | null;
  last_name?: string | null;
  role: string;
}

interface AssessmentSummary {
  assessment_type: string;
  overall_grade: string | null;
  created_at: string;
  scores: Record<string, unknown>;
}

interface SkillPlanManagerProps {
  familyId: string | null;
  childId?: string;
  familyMembers?: FamilyMember[];
}

export function SkillPlanManager({ familyId, childId, familyMembers = [] }: SkillPlanManagerProps) {
  const {
    plans, catalog, isLoading,
    fetchPlans, fetchCatalog, updatePlan,
    approvePlan, rejectPlan, activatePlan, generateAIPlan,
  } = useSkillPlanManager(familyId);
  const [activeTab, setActiveTab] = useState('pending');
  const [approvalNotes, setApprovalNotes] = useState<Record<string, string>>({});
  const [generatingType, setGeneratingType] = useState<string | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string>(childId || '');
  const [assessments, setAssessments] = useState<AssessmentSummary[]>([]);

  const childMembers = useMemo(() => familyMembers.filter(m => m.role === 'child'), [familyMembers]);

  useEffect(() => {
    if (!selectedChildId && childMembers.length > 0) {
      setSelectedChildId(childMembers[0].user_id);
    }
  }, [selectedChildId, childMembers]);

  // Fetch assessments for selected child
  useEffect(() => {
    if (!selectedChildId) return;
    supabase
      .from('assessment_results')
      .select('assessment_type, overall_grade, created_at, scores')
      .or(`user_id.eq.${selectedChildId},child_id.eq.${selectedChildId}`)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setAssessments((data as AssessmentSummary[]) || []);
      });
  }, [selectedChildId]);

  useEffect(() => {
    if (familyId) {
      fetchPlans(selectedChildId || childId);
    }
  }, [familyId, selectedChildId, childId, fetchPlans]);

  const filteredPlans = plans.filter(p => {
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

  const handleSavePlanItems = useCallback(async (planId: string, items: PlanItem[]) => {
    await updatePlan(planId, { plan_items: items });
  }, [updatePlan]);

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
      <CardContent className="space-y-4">
        {/* Assessment Summary */}
        {assessments.length > 0 && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
                <span className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  {selectedChildName}'s Assessment Results ({assessments.length})
                </span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="grid gap-2 pt-2">
                {assessments.map((a, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                    <span className="font-medium capitalize">{a.assessment_type.replace(/_/g, ' ')}</span>
                    <div className="flex items-center gap-2">
                      {a.overall_grade && (
                        <Badge variant="outline">{a.overall_grade}</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(a.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

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
                        onSaveItems={handleSavePlanItems}
                        catalog={catalog}
                        onLoadCatalog={fetchCatalog}
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

/** Catalog browser for adding items to a plan */
function CatalogBrowser({
  catalog,
  onLoadCatalog,
  onAddItem,
  existingItemIds,
}: {
  catalog: CatalogItem[];
  onLoadCatalog: (filters?: { skill_domain?: string; item_type?: string }) => void;
  onAddItem: (item: CatalogItem) => void;
  existingItemIds: Set<string>;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [domainFilter, setDomainFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    const filters: { skill_domain?: string; item_type?: string } = {};
    if (domainFilter !== 'all') filters.skill_domain = domainFilter;
    if (typeFilter !== 'all') filters.item_type = typeFilter;
    onLoadCatalog(Object.keys(filters).length > 0 ? filters : undefined);
  }, [domainFilter, typeFilter, onLoadCatalog]);

  const filtered = useMemo(() => {
    if (!searchTerm) return catalog;
    const term = searchTerm.toLowerCase();
    return catalog.filter(c =>
      c.title.toLowerCase().includes(term) ||
      c.description?.toLowerCase().includes(term)
    );
  }, [catalog, searchTerm]);

  return (
    <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search activities..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-8 text-sm"
        />
      </div>
      <div className="flex gap-2">
        <Select value={domainFilter} onValueChange={setDomainFilter}>
          <SelectTrigger className="h-8 text-xs flex-1">
            <SelectValue placeholder="Domain" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All domains</SelectItem>
            {SKILL_DOMAINS.map(d => (
              <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 text-xs flex-1">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {ITEM_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <ScrollArea className="h-[200px]">
        <div className="space-y-1">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No items found</p>
          ) : (
            filtered.map(item => {
              const alreadyAdded = existingItemIds.has(item.id);
              const domain = getDomainInfo(item.skill_domain);
              const itemType = getItemTypeInfo(item.item_type);
              return (
                <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 text-sm">
                  <span>{itemType.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.title}</p>
                    <Badge variant="outline" className={`text-xs ${domain.color}`}>{domain.label}</Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={alreadyAdded}
                    onClick={() => onAddItem(item)}
                    className="h-7 w-7 p-0"
                  >
                    {alreadyAdded ? <CheckCircle className="h-4 w-4 text-muted-foreground" /> : <Plus className="h-4 w-4" />}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function PlanCard({
  plan, notes, onNotesChange, onApprove, onReject, onActivate,
  onSaveItems, catalog, onLoadCatalog,
}: {
  plan: SkillPlanSchedule;
  notes: string;
  onNotesChange: (v: string) => void;
  onApprove: () => void;
  onReject: () => void;
  onActivate: () => void;
  onSaveItems: (planId: string, items: PlanItem[]) => Promise<void>;
  catalog: CatalogItem[];
  onLoadCatalog: (filters?: { skill_domain?: string; item_type?: string }) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editItems, setEditItems] = useState<PlanItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const items: PlanItem[] = Array.isArray(plan.plan_items) ? plan.plan_items : [];
  const displayItems = isEditing ? editItems : items;
  const existingItemIds = useMemo(
    () => new Set(displayItems.map(i => i.catalog_item_id)),
    [displayItems]
  );

  const canEdit = plan.status === 'draft' || plan.status === 'pending_approval';

  const startEditing = () => {
    setEditItems([...items]);
    setIsEditing(true);
  };

  const handleAddCatalogItem = (catalogItem: CatalogItem) => {
    const newItem: PlanItem = {
      catalog_item_id: catalogItem.id,
      title: catalogItem.title,
      description: catalogItem.description || '',
      category: catalogItem.category,
      skill_domain: catalogItem.skill_domain,
      item_type: catalogItem.item_type,
      priority: editItems.length + 1,
    };
    setEditItems(prev => [...prev, newItem]);
  };

  const handleRemoveItem = (idx: number) => {
    setEditItems(prev => {
      const next = prev.filter((_, i) => i !== idx);
      return next.map((item, i) => ({ ...item, priority: i + 1 }));
    });
  };

  const handleMoveItem = (idx: number, direction: 'up' | 'down') => {
    setEditItems(prev => {
      const next = [...prev];
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next.map((item, i) => ({ ...item, priority: i + 1 }));
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onSaveItems(plan.id, editItems);
    setIsEditing(false);
    setIsSaving(false);
  };

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
          {new Date(plan.start_date).toLocaleDateString()} • {displayItems.length} items
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Edit toggle */}
        {canEdit && (
          <div className="flex justify-end">
            {isEditing ? (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1">
                  <Save className="h-3 w-3" /> {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="ghost" onClick={startEditing} className="gap-1 text-xs">
                <Edit2 className="h-3 w-3" /> Edit Items
              </Button>
            )}
          </div>
        )}

        {/* Plan items */}
        <div className="grid gap-2">
          {displayItems.map((item, idx) => {
            const domain = getDomainInfo(item.skill_domain);
            const itemType = getItemTypeInfo(item.item_type);
            return (
              <div key={idx} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/50">
                <span className="w-5 text-center text-xs text-muted-foreground">{idx + 1}</span>
                <span>{itemType.icon}</span>
                <span className="flex-1 font-medium truncate">{item.title}</span>
                <Badge variant="outline" className={`text-xs ${domain.color}`}>
                  {domain.label}
                </Badge>
                {isEditing && (
                  <div className="flex items-center gap-0.5">
                    <Button
                      size="sm" variant="ghost" className="h-6 w-6 p-0"
                      disabled={idx === 0}
                      onClick={() => handleMoveItem(idx, 'up')}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm" variant="ghost" className="h-6 w-6 p-0"
                      disabled={idx === displayItems.length - 1}
                      onClick={() => handleMoveItem(idx, 'down')}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive"
                      onClick={() => handleRemoveItem(idx)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
          {displayItems.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">No items in this plan</p>
          )}
        </div>

        {/* Catalog browser when editing */}
        {isEditing && (
          <CatalogBrowser
            catalog={catalog}
            onLoadCatalog={onLoadCatalog}
            onAddItem={handleAddCatalogItem}
            existingItemIds={existingItemIds}
          />
        )}

        {/* AI reasoning */}
        {items.some(i => i.ai_reasoning) && !isEditing && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground w-full justify-between">
                <span>AI Reasoning</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-1 pt-1">
                {items.filter(i => i.ai_reasoning).map((item, idx) => (
                  <p key={idx} className="text-xs text-muted-foreground p-1">
                    <strong>{item.title}:</strong> {item.ai_reasoning}
                  </p>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Approval controls */}
        {(plan.status === 'draft' || plan.status === 'pending_approval') && !isEditing && (
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
