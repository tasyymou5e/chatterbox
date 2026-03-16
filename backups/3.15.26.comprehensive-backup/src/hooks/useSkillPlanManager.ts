import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { SkillPlanSchedule, CatalogItem } from '@/types/skillPlan';

export function useSkillPlanManager(familyId: string | null) {
  const [plans, setPlans] = useState<SkillPlanSchedule[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPlans = useCallback(async (childId?: string, status?: string) => {
    if (!familyId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-skill-plan', {
        body: { action: 'list', family_id: familyId, child_id: childId, status },
      });
      if (error) throw error;
      setPlans(data?.plans || []);
    } catch (err) {
      toast({ title: 'Error loading plans', description: String(err), variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [familyId]);

  const fetchCatalog = useCallback(async (filters?: { skill_domain?: string; item_type?: string; age_group?: string }) => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-skill-plan', {
        body: { action: 'get_catalog', ...filters },
      });
      if (error) throw error;
      setCatalog(data?.items || []);
    } catch (err) {
      toast({ title: 'Error loading catalog', description: String(err), variant: 'destructive' });
    }
  }, []);

  const createPlan = useCallback(async (planData: {
    child_id: string;
    schedule_type: string;
    plan_name: string;
    plan_items: unknown[];
    start_date: string;
    end_date?: string;
    assessment_basis_id?: string;
  }) => {
    if (!familyId) return null;
    try {
      const { data, error } = await supabase.functions.invoke('manage-skill-plan', {
        body: { action: 'create', family_id: familyId, ...planData },
      });
      if (error) throw error;
      toast({ title: 'Plan created', description: 'Skill plan has been created successfully.' });
      return data?.plan;
    } catch (err) {
      toast({ title: 'Error creating plan', description: String(err), variant: 'destructive' });
      return null;
    }
  }, [familyId]);

  const updatePlan = useCallback(async (planId: string, updates: Record<string, unknown>) => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-skill-plan', {
        body: { action: 'update', plan_id: planId, ...updates },
      });
      if (error) throw error;
      setPlans(prev => prev.map(p => p.id === planId ? { ...p, ...data?.plan } : p));
      toast({ title: 'Plan updated' });
      return data?.plan;
    } catch (err) {
      toast({ title: 'Error updating plan', description: String(err), variant: 'destructive' });
      return null;
    }
  }, []);

  const approvePlan = useCallback(async (planId: string, notes?: string) => {
    return updatePlan(planId, { status: 'approved', approval_notes: notes });
  }, [updatePlan]);

  const rejectPlan = useCallback(async (planId: string, notes?: string) => {
    return updatePlan(planId, { status: 'draft', approval_notes: notes });
  }, [updatePlan]);

  const activatePlan = useCallback(async (planId: string) => {
    return updatePlan(planId, { status: 'active' });
  }, [updatePlan]);

  const generateAIPlan = useCallback(async (scheduleType: string = 'daily', childId?: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-daily-plan', {
        body: { schedule_type: scheduleType, child_id: childId },
      });
      if (error) throw error;
      toast({ title: 'AI plan generated', description: data?.summary || 'Plan ready for review.' });
      return data;
    } catch (err) {
      toast({ title: 'Error generating plan', description: String(err), variant: 'destructive' });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    plans, catalog, isLoading,
    fetchPlans, fetchCatalog, createPlan, updatePlan,
    approvePlan, rejectPlan, activatePlan, generateAIPlan,
  };
}
