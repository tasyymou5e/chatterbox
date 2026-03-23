/**
 * SkillGamesBrowser - Browse and play skill domain games freely
 * Shows 24 game variants across 8 skill domains (3 per domain).
 * Includes adaptive difficulty that auto-adjusts based on accuracy history.
 */
import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gamepad2, Star, Trophy, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import {
  GAME_VARIANTS,
  getVariantsByDomain,
  variantToConfig,
  DOMAIN_GAME_CONFIGS,
  type GameVariant,
} from '@/components/games/shared/skillGameData';
import { SkillMatchGame } from '@/components/games/SkillMatchGame';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useChildProfile } from '@/hooks/useChildProfile';
import { useAdaptiveDifficulty, type Difficulty } from '@/hooks/useAdaptiveDifficulty';

interface VariantScore {
  lastScore: number;
  lastTotal: number;
  gamesPlayed: number;
}

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; emoji: string }[] = [
  { value: 'easy', label: 'Easy', emoji: '🟢' },
  { value: 'medium', label: 'Medium', emoji: '🟡' },
  { value: 'hard', label: 'Hard', emoji: '🔴' },
];

const DOMAIN_LABELS: Record<string, { label: string; emoji: string }> = {
  communication: { label: 'Communication', emoji: '💬' },
  social: { label: 'Social Skills', emoji: '🤝' },
  sensory: { label: 'Sensory Regulation', emoji: '🌈' },
  executive_function: { label: 'Executive Function', emoji: '🧩' },
  daily_living: { label: 'Daily Living', emoji: '🏠' },
  emotional_regulation: { label: 'Emotional Regulation', emoji: '💖' },
  motor_skills: { label: 'Motor Skills', emoji: '🏃' },
  academic: { label: 'Academic Readiness', emoji: '📚' },
};

export function SkillGamesBrowser() {
  const { user } = useAuth();
  const { familyId } = useChildProfile(user?.id);
  const [activeGame, setActiveGame] = useState<{ variantId: string; domain: string; difficulty: Difficulty } | null>(null);
  const [scores, setScores] = useState<Record<string, VariantScore>>({});
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const adaptive = useAdaptiveDifficulty();

  const variantsByDomain = useMemo(() => getVariantsByDomain(), []);
  const domainOrder = useMemo(() => Object.keys(DOMAIN_GAME_CONFIGS), []);

  const toggleDomain = useCallback((domain: string) => {
    setExpandedDomains(prev => {
      const next = new Set(prev);
      if (next.has(domain)) next.delete(domain);
      else next.add(domain);
      return next;
    });
  }, []);

  const handlePlay = useCallback((variant: GameVariant) => {
    setActiveGame({
      variantId: variant.id,
      domain: variant.domain,
      difficulty: adaptive.getDifficulty(variant.id),
    });
  }, [adaptive]);

  const handleGameComplete = useCallback(async (variantId: string, domain: string, score: number, total: number) => {
    adaptive.recordResult(variantId, score, total);

    setScores(prev => ({
      ...prev,
      [variantId]: {
        lastScore: score,
        lastTotal: total,
        gamesPlayed: (prev[variantId]?.gamesPlayed || 0) + 1,
      },
    }));
    setActiveGame(null);

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
            variant_id: variantId,
            total_questions: total,
            adaptive_difficulty: adaptive.getDifficulty(variantId),
          }),
        });
      } catch {
        // Non-critical
      }
    }
  }, [user?.id, adaptive]);

  const handleGameClose = useCallback(() => {
    setActiveGame(null);
  }, []);

  // Full-screen game view
  if (activeGame) {
    const variant = GAME_VARIANTS.find(v => v.id === activeGame.variantId);
    const config = variant ? variantToConfig(variant) : undefined;

    return (
      <SkillMatchGame
        skillDomain={activeGame.domain}
        difficulty={activeGame.difficulty}
        gameConfig={config}
        onComplete={(score, total) =>
          handleGameComplete(activeGame.variantId, activeGame.domain, score, total)
        }
        onClose={handleGameClose}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Gamepad2 className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Skill Games</h2>
        <span className="text-sm text-muted-foreground">
          {GAME_VARIANTS.length} games · Play anytime!
        </span>
      </div>

      {domainOrder.map(domain => {
        const variants = variantsByDomain[domain];
        if (!variants?.length) return null;

        const domainInfo = DOMAIN_LABELS[domain] || { label: domain, emoji: '🎮' };
        const isExpanded = expandedDomains.has(domain);
        // Show first variant as preview when collapsed
        const visibleVariants = isExpanded ? variants : variants.slice(0, 1);

        return (
          <div key={domain} className="space-y-2">
            {/* Domain header */}
            <button
              onClick={() => toggleDomain(domain)}
              className="flex items-center gap-2 w-full text-left group"
            >
              <span className="text-xl" role="img" aria-label={domainInfo.label}>
                {domainInfo.emoji}
              </span>
              <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                {domainInfo.label}
              </h3>
              <span className="text-xs text-muted-foreground">
                ({variants.length} games)
              </span>
              <span className="ml-auto text-muted-foreground">
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </span>
            </button>

            {/* Variant cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {visibleVariants.map(variant => (
                <VariantGameCard
                  key={variant.id}
                  variant={variant}
                  difficulty={adaptive.getDifficulty(variant.id)}
                  suggestion={adaptive.getSuggestion(variant.id)}
                  onDifficultyChange={d => adaptive.setManualDifficulty(variant.id, d)}
                  onPlay={() => handlePlay(variant)}
                  score={scores[variant.id]}
                />
              ))}
            </div>

            {/* Show more / less toggle */}
            {variants.length > 1 && !isExpanded && (
              <button
                onClick={() => toggleDomain(domain)}
                className="text-xs text-primary hover:underline ml-1"
              >
                + {variants.length - 1} more games
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function VariantGameCard({
  variant,
  difficulty,
  suggestion,
  onDifficultyChange,
  onPlay,
  score,
}: {
  variant: GameVariant;
  difficulty: Difficulty;
  suggestion: 'promote' | 'demote' | 'stay';
  onDifficultyChange: (d: Difficulty) => void;
  onPlay: () => void;
  score?: VariantScore;
}) {
  const accuracy = score ? Math.round((score.lastScore / score.lastTotal) * 100) : null;

  return (
    <Card className={`${variant.bgClass} border-0 transition-shadow duration-200 motion-reduce:transition-none hover:shadow-md`}>
      <CardContent className="p-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start gap-2">
          <span className="text-2xl" role="img" aria-label={variant.label}>{variant.emoji}</span>
          <div className="min-w-0">
            <h4 className={`font-bold text-sm ${variant.accentClass} truncate`}>{variant.label}</h4>
            <p className="text-xs text-muted-foreground line-clamp-2">{variant.description}</p>
          </div>
        </div>

        {/* Score badge + adaptive indicator */}
        {score && (
          <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs">
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
          {DIFFICULTY_OPTIONS.map(opt => (
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
