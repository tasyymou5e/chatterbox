/**
 * SkillGamesBrowser - Browse and play skill domain games freely
 * No parent-assigned plan required. Scores still tracked.
 * Includes adaptive difficulty that auto-adjusts based on accuracy history.
 */
import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gamepad2, Star, Trophy, TrendingUp, TrendingDown } from 'lucide-react';
import { DOMAIN_GAME_CONFIGS, type DomainGameConfig } from '@/components/games/shared/skillGameData';
import { SkillMatchGame } from '@/components/games/SkillMatchGame';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useChildProfile } from '@/hooks/useChildProfile';
import { useAdaptiveDifficulty, type Difficulty } from '@/hooks/useAdaptiveDifficulty';

interface DomainScore {
  lastScore: number;
  lastTotal: number;
  gamesPlayed: number;
}

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; emoji: string }[] = [
  { value: 'easy', label: 'Easy', emoji: '🟢' },
  { value: 'medium', label: 'Medium', emoji: '🟡' },
  { value: 'hard', label: 'Hard', emoji: '🔴' },
];

const DOMAIN_EMOJIS: Record<string, string> = {
  communication: '💬',
  social: '🤝',
  sensory: '🌈',
  executive_function: '🧩',
  daily_living: '🏠',
  emotional_regulation: '💖',
  motor_skills: '🏃',
  academic: '📚',
};

export function SkillGamesBrowser() {
  const { user } = useAuth();
  const { familyId } = useChildProfile(user?.id);
  const [activeGame, setActiveGame] = useState<{ domain: string; difficulty: Difficulty } | null>(null);
  const [scores, setScores] = useState<Record<string, DomainScore>>({});
  const adaptive = useAdaptiveDifficulty();

  const handlePlay = useCallback((domain: string) => {
    setActiveGame({ domain, difficulty: adaptive.getDifficulty(domain) });
  }, [adaptive]);

  const handleGameComplete = useCallback(async (domain: string, score: number, total: number) => {
    // Record result and let adaptive engine adjust difficulty
    adaptive.recordResult(domain, score, total);

    setScores(prev => ({
      ...prev,
      [domain]: {
        lastScore: score,
        lastTotal: total,
        gamesPlayed: (prev[domain]?.gamesPlayed || 0) + 1,
      },
    }));
    setActiveGame(null);

    // Log to plan_session_logs for tracking (null plan_item_id = free play)
    if (user?.id) {
      try {
        await supabase.from('plan_session_logs').insert({
          child_id: user.id,
          completion_status: 'completed',
          score,
          duration_seconds: 0,
          ai_observations: JSON.stringify({
            free_play: true,
            domain,
            total_questions: total,
            adaptive_difficulty: adaptive.getDifficulty(domain),
          }),
        });
      } catch {
        // Non-critical: don't block UX
      }
    }
  }, [user?.id, familyId, adaptive]);

  const handleGameClose = useCallback(() => {
    setActiveGame(null);
  }, []);

  // Full-screen game view
  if (activeGame) {
    return (
      <SkillMatchGame
        skillDomain={activeGame.domain}
        difficulty={activeGame.difficulty}
        onComplete={(score, total) => handleGameComplete(activeGame.domain, score, total)}
        onClose={handleGameClose}
      />
    );
  }

  const configs = Object.values(DOMAIN_GAME_CONFIGS);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Gamepad2 className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Skill Games</h2>
        <span className="text-sm text-muted-foreground">Play anytime!</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {configs.map((config) => (
          <DomainGameCard
            key={config.domain}
            config={config}
            emoji={DOMAIN_EMOJIS[config.domain] || '🎮'}
            difficulty={adaptive.getDifficulty(config.domain)}
            suggestion={adaptive.getSuggestion(config.domain)}
            onDifficultyChange={(d) => adaptive.setManualDifficulty(config.domain, d)}
            onPlay={() => handlePlay(config.domain)}
            score={scores[config.domain]}
          />
        ))}
      </div>
    </div>
  );
}

function DomainGameCard({
  config,
  emoji,
  difficulty,
  suggestion,
  onDifficultyChange,
  onPlay,
  score,
}: {
  config: DomainGameConfig;
  emoji: string;
  difficulty: Difficulty;
  suggestion: 'promote' | 'demote' | 'stay';
  onDifficultyChange: (d: Difficulty) => void;
  onPlay: () => void;
  score?: DomainScore;
}) {
  const accuracy = score ? Math.round((score.lastScore / score.lastTotal) * 100) : null;

  return (
    <Card className={`${config.bgClass} border-0 transition-shadow duration-200 motion-reduce:transition-none hover:shadow-md`}>
      <CardContent className="p-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl" role="img" aria-label={config.label}>{emoji}</span>
            <div>
              <h3 className={`font-bold text-sm ${config.accentClass}`}>{config.label}</h3>
              <p className="text-xs text-muted-foreground">{config.description}</p>
            </div>
          </div>
        </div>

        {/* Last score badge + adaptive indicator */}
        {score && (
          <div className="flex items-center gap-2 text-xs">
            <Trophy className="h-3.5 w-3.5 text-accent-foreground" />
            <span className="text-muted-foreground">
              Last: <span className="font-semibold text-foreground">{score.lastScore}/{score.lastTotal}</span>
              {accuracy !== null && (
                <span className={`ml-1 font-medium ${accuracy >= 80 ? 'text-primary' : accuracy >= 50 ? 'text-accent-foreground' : 'text-destructive'}`}>
                  ({accuracy}%)
                </span>
              )}
            </span>
            <span className="text-muted-foreground">· {score.gamesPlayed} played</span>
            {suggestion === 'promote' && (
              <span className="flex items-center gap-0.5 text-primary font-medium" title="Great job! Difficulty will increase">
                <TrendingUp className="h-3 w-3" /> Level up!
              </span>
            )}
            {suggestion === 'demote' && (
              <span className="flex items-center gap-0.5 text-accent-foreground font-medium" title="Adjusting to an easier level">
                <TrendingDown className="h-3 w-3" /> Easier
              </span>
            )}
          </div>
        )}

        {/* Difficulty selector */}
        <div className="flex gap-1">
          {DIFFICULTY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onDifficultyChange(opt.value)}
              className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors duration-150 motion-reduce:transition-none min-h-[36px] ${
                difficulty === opt.value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-background/60 text-muted-foreground hover:bg-background/80'
              }`}
              aria-label={`${opt.label} difficulty`}
            >
              {opt.emoji} {opt.label}
            </button>
          ))}
        </div>

        {/* Play button */}
        <Button
          onClick={onPlay}
          size="lg"
          className="w-full min-h-[48px] text-base font-bold gap-2"
        >
          <Star className="h-5 w-5" />
          Play!
        </Button>
      </CardContent>
    </Card>
  );
}
