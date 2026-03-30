/**
 * DailyRoutineTimeline - Visual step-by-step daily routine display
 * Uses existing chore assignments as routine steps
 * ConnectSphere "What I Do Now!" feature adaptation
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Circle, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface RoutineStep {
  id: string;
  title: string;
  emoji: string;
  isCompleted: boolean;
  subSteps?: { id: string; title: string; emoji: string }[];
  time?: string;
}

const DEFAULT_ROUTINE: RoutineStep[] = [
  {
    id: 'wake-up', title: 'Wake Up', emoji: '☀️', isCompleted: false,
    subSteps: [
      { id: 'stretch', title: 'Stretch', emoji: '🙆' },
      { id: 'make-bed', title: 'Make Bed', emoji: '🛏️' },
    ],
  },
  {
    id: 'bathroom', title: 'Bathroom', emoji: '🚿', isCompleted: false,
    subSteps: [
      { id: 'use-toilet', title: 'Use Toilet', emoji: '🚽' },
      { id: 'wash-hands', title: 'Wash Hands', emoji: '🧼' },
      { id: 'brush-teeth', title: 'Brush Teeth', emoji: '🪥' },
    ],
  },
  {
    id: 'get-dressed', title: 'Get Dressed', emoji: '👕', isCompleted: false,
    subSteps: [
      { id: 'underwear', title: 'Underwear', emoji: '🩲' },
      { id: 'shirt', title: 'Shirt', emoji: '👕' },
      { id: 'pants', title: 'Pants', emoji: '👖' },
      { id: 'socks-shoes', title: 'Socks & Shoes', emoji: '👟' },
    ],
  },
  { id: 'breakfast', title: 'Eat Breakfast', emoji: '🥣', isCompleted: false },
  { id: 'learning', title: 'Learning Time', emoji: '📚', isCompleted: false },
  { id: 'play', title: 'Play Time', emoji: '🎮', isCompleted: false },
  { id: 'lunch', title: 'Lunch', emoji: '🥪', isCompleted: false },
];

export function DailyRoutineTimeline() {
  const { user } = useAuth();
  const [steps, setSteps] = useState<RoutineStep[]>(DEFAULT_ROUTINE);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  // Try to load chore-based routine from DB
  useEffect(() => {
    if (!user?.id) return;
    
    const loadChoreRoutine = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('chore_assignments')
        .select('id, status, chore_id, chores(title)')
        .eq('assigned_to', user.id)
        .gte('due_date', today)
        .lte('due_date', today + 'T23:59:59')
        .order('assigned_at', { ascending: true });

      if (data && data.length > 0) {
        const choreSteps: RoutineStep[] = data.map((a) => ({
          id: a.id,
          title: (a.chores as any)?.title || 'Task',
          emoji: '📋',
          isCompleted: a.status === 'completed' || a.status === 'verified',
        }));
        // Merge with default steps if chores exist
        setSteps([...DEFAULT_ROUTINE.slice(0, 3), ...choreSteps, ...DEFAULT_ROUTINE.slice(5)]);
      }
    };

    loadChoreRoutine();
  }, [user?.id]);

  const toggleStep = useCallback((stepId: string) => {
    setSteps(prev => prev.map(s =>
      s.id === stepId ? { ...s, isCompleted: !s.isCompleted } : s
    ));
  }, []);

  const toggleExpand = useCallback((stepId: string) => {
    setExpandedStep(prev => prev === stepId ? null : stepId);
  }, []);

  const completedCount = steps.filter(s => s.isCompleted).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <Card className="border-2 border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className="text-2xl">📅</span>
          My Daily Routine
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {completedCount}/{steps.length} done
          </span>
        </CardTitle>
        {/* Progress bar */}
        <div className="w-full h-3 bg-amber-200/50 dark:bg-amber-800/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1">
          {steps.map((step, index) => {
            const isExpanded = expandedStep === step.id;
            const hasSubSteps = step.subSteps && step.subSteps.length > 0;

            return (
              <div key={step.id}>
                <button
                  onClick={() => hasSubSteps ? toggleExpand(step.id) : toggleStep(step.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all',
                    'hover:bg-amber-100/50 dark:hover:bg-amber-900/20 active:scale-[0.98]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    step.isCompleted && 'opacity-60'
                  )}
                  aria-label={`${step.isCompleted ? 'Completed' : 'Not completed'}: ${step.title}`}
                >
                  {/* Step indicator */}
                  <div className="relative">
                    {step.isCompleted ? (
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    ) : (
                      <Circle className="h-6 w-6 text-amber-400" />
                    )}
                    {/* Connecting line */}
                    {index < steps.length - 1 && (
                      <div className="absolute left-3 top-7 w-0.5 h-3 bg-amber-200 dark:bg-amber-700" />
                    )}
                  </div>

                  <span className="text-xl" role="img" aria-hidden="true">{step.emoji}</span>
                  <span className={cn(
                    'flex-1 text-left font-medium text-sm',
                    step.isCompleted && 'line-through text-muted-foreground'
                  )}>
                    {step.title}
                  </span>

                  {hasSubSteps && (
                    isExpanded
                      ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                {/* Sub-steps */}
                {hasSubSteps && isExpanded && (
                  <div className="ml-12 space-y-0.5 pb-1">
                    {step.subSteps!.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground"
                      >
                        <span className="text-base" role="img" aria-hidden="true">{sub.emoji}</span>
                        <span>{sub.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
