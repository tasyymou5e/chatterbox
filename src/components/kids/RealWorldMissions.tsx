/**
 * RealWorldMissions - Card-based offline activity suggestions
 * Bridges digital skill games to real-life parent-child interactions
 * ConnectSphere "Real World Missions" feature adaptation
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Circle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Mission {
  id: string;
  title: string;
  description: string;
  emoji: string;
  domain: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

const MISSIONS_POOL: Mission[] = [
  { id: 'm1', title: 'Share a Toy', description: 'Share one of your toys with a sibling or friend for 5 minutes', emoji: '🤝', domain: 'social', difficulty: 'easy' },
  { id: 'm2', title: 'Name 5 Colors', description: 'Walk around the house and name 5 different colors you see', emoji: '🎨', domain: 'educational_learning', difficulty: 'easy' },
  { id: 'm3', title: 'Greet Someone', description: 'Say hello and make eye contact with a family member', emoji: '👋', domain: 'communication', difficulty: 'easy' },
  { id: 'm4', title: 'Help Set the Table', description: 'Help put plates and cups on the table for a meal', emoji: '🍽️', domain: 'daily_living', difficulty: 'easy' },
  { id: 'm5', title: 'Deep Breaths', description: 'Take 5 slow deep breaths when you feel big feelings', emoji: '🌬️', domain: 'emotional_regulation', difficulty: 'easy' },
  { id: 'm6', title: 'Count Steps', description: 'Count your steps from your room to the kitchen', emoji: '🔢', domain: 'academic', difficulty: 'easy' },
  { id: 'm7', title: 'Tell a Story', description: 'Tell someone about your favorite part of today', emoji: '📖', domain: 'storytelling', difficulty: 'medium' },
  { id: 'm8', title: 'Listen to Sounds', description: 'Close your eyes and name 3 sounds you can hear', emoji: '👂', domain: 'sensory', difficulty: 'easy' },
  { id: 'm9', title: 'Ask for Help', description: 'Practice asking for help with something politely', emoji: '🙋', domain: 'communication', difficulty: 'medium' },
  { id: 'm10', title: 'Matching Game', description: 'Find 3 pairs of matching socks in the laundry', emoji: '🧦', domain: 'cognitive_development', difficulty: 'easy' },
  { id: 'm11', title: 'Morning Routine', description: 'Complete your morning routine steps in the right order', emoji: '☀️', domain: 'executive_function', difficulty: 'medium' },
  { id: 'm12', title: 'Dance Break', description: 'Dance to your favorite song for 2 minutes', emoji: '💃', domain: 'motor_skills', difficulty: 'easy' },
];

export function RealWorldMissions() {
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [seed, setSeed] = useState(0);

  // Show 3 random missions
  const dailyMissions = useMemo(() => {
    const shuffled = [...MISSIONS_POOL].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  const toggleComplete = (id: string) => {
    setCompletedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Card className="border-2 border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className="text-2xl">🌍</span>
          Real World Missions
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-7 w-7"
            onClick={() => { setCompletedIds(new Set()); setSeed(s => s + 1); }}
            aria-label="Get new missions"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Try these fun activities in the real world! 🎯
        </p>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {dailyMissions.map((mission) => {
          const isDone = completedIds.has(mission.id);
          return (
            <button
              key={mission.id}
              onClick={() => toggleComplete(mission.id)}
              className={cn(
                'w-full flex items-start gap-3 px-3 py-3 rounded-xl transition-all text-left',
                'border-2',
                'hover:shadow-md active:scale-[0.98] motion-reduce:transition-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                isDone
                  ? 'bg-emerald-100/50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700 opacity-70'
                  : 'bg-white dark:bg-slate-800 border-emerald-200 dark:border-emerald-800'
              )}
              aria-label={`${isDone ? 'Completed' : 'Not completed'}: ${mission.title}`}
            >
              {isDone ? (
                <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-emerald-300 mt-0.5 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg" role="img" aria-hidden="true">{mission.emoji}</span>
                  <span className={cn('font-semibold text-sm', isDone && 'line-through')}>
                    {mission.title}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {mission.description}
                </p>
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
