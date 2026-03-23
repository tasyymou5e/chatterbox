/**
 * SkillGamesBrowser - Browse and play skill domain games freely
 * Shows 40 SkillQuest variants + 8 bonus standalone games across 8 skill domains.
 * Includes adaptive difficulty that auto-adjusts based on accuracy history.
 */
import { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gamepad2, Star, Trophy, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import {
  GAME_VARIANTS,
  STANDALONE_GAMES,
  getAllGamesByDomain,
  variantToConfig,
  DOMAIN_GAME_CONFIGS,
  type GameVariant,
  type StandaloneGameEntry,
} from '@/components/games/shared/skillGameData';
import { SkillMatchGame } from '@/components/games/SkillMatchGame';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useChildProfile } from '@/hooks/useChildProfile';
import { useAdaptiveDifficulty, type Difficulty } from '@/hooks/useAdaptiveDifficulty';

// Lazy-load standalone game components
const MemoryMatchGame = lazy(() =>
  import('@/components/games/MemoryMatchGame').then(m => ({ default: m.MemoryMatchGame }))
);
const PatternMatchGame = lazy(() =>
  import('@/components/games/PatternMatchGame').then(m => ({ default: m.PatternMatchGame }))
);
const SoundsMatchGame = lazy(() =>
  import('@/components/games/SoundsMatchGame').then(m => ({ default: m.SoundsMatchGame }))
);

interface GameScore {
  lastScore: number;
  lastTotal: number;
  gamesPlayed: number;
}

type ActiveGame =
  | { type: 'variant'; variantId: string; domain: string; difficulty: Difficulty }
  | { type: 'standalone'; entry: StandaloneGameEntry; difficulty: Difficulty };

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; emoji: string }[] = [
  { value: 'easy', label: 'Easy', emoji: '🟢' },
  { value: 'medium', label: 'Medium', emoji: '🟡' },
  { value: 'hard', label: 'Hard', emoji: '🔴' },
];

const SKILL_LEVEL_MAP: Record<Difficulty, 'beginner' | 'intermediate' | 'advanced'> = {
  easy: 'beginner',
  medium: 'intermediate',
  hard: 'advanced',
};

const DOMAIN_LABELS: Record<string, { label: string; emoji: string }> = {
  communication: { label: 'Communication & AAC', emoji: '💬' },
  social: { label: 'Social Skills', emoji: '🤝' },
  sensory: { label: 'Sensory Regulation', emoji: '🌈' },
  executive_function: { label: 'Executive Function', emoji: '🧩' },
  daily_living: { label: 'Daily Routines', emoji: '🏠' },
  emotional_regulation: { label: 'Emotional Regulation', emoji: '💖' },
  motor_skills: { label: 'Motor Skills', emoji: '🏃' },
  academic: { label: 'Academic Readiness', emoji: '📚' },
  speech_therapy: { label: 'Speech Therapy', emoji: '🗣️' },
  storytelling: { label: 'Storytelling', emoji: '📖' },
  educational_learning: { label: 'Educational Learning', emoji: '🎓' },
  cognitive_development: { label: 'Cognitive Development', emoji: '🧠' },
};

export function SkillGamesBrowser() {
  const { user } = useAuth();
  useChildProfile(user?.id); // keep profile loaded
  const [activeGame, setActiveGame] = useState<ActiveGame | null>(null);
  const [scores, setScores] = useState<Record<string, GameScore>>({});
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const adaptive = useAdaptiveDifficulty();

  const gamesByDomain = useMemo(() => getAllGamesByDomain(), []);
  const domainOrder = useMemo(() => Object.keys(DOMAIN_GAME_CONFIGS), []);
  const totalGames = GAME_VARIANTS.length + STANDALONE_GAMES.length;

  const toggleDomain = useCallback((domain: string) => {
    setExpandedDomains(prev => {
      const next = new Set(prev);
      if (next.has(domain)) next.delete(domain);
      else next.add(domain);
      return next;
    });
  }, []);

  const handlePlayVariant = useCallback((variant: GameVariant) => {
    setActiveGame({
      type: 'variant',
      variantId: variant.id,
      domain: variant.domain,
      difficulty: adaptive.getDifficulty(variant.id),
    });
  }, [adaptive]);

  const handlePlayStandalone = useCallback((entry: StandaloneGameEntry) => {
    setActiveGame({
      type: 'standalone',
      entry,
      difficulty: adaptive.getDifficulty(entry.id),
    });
  }, [adaptive]);

  const recordScore = useCallback(async (gameId: string, domain: string, score: number, total: number) => {
    adaptive.recordResult(gameId, score, total);
    setScores(prev => ({
      ...prev,
      [gameId]: {
        lastScore: score,
        lastTotal: total,
        gamesPlayed: (prev[gameId]?.gamesPlayed || 0) + 1,
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
            game_id: gameId,
            total_questions: total,
            adaptive_difficulty: adaptive.getDifficulty(gameId),
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

  // ── Full-screen game view ──
  if (activeGame) {
    if (activeGame.type === 'variant') {
      const variant = GAME_VARIANTS.find(v => v.id === activeGame.variantId);
      const config = variant ? variantToConfig(variant) : undefined;
      return (
        <SkillMatchGame
          skillDomain={activeGame.domain}
          difficulty={activeGame.difficulty}
          gameConfig={config}
          onComplete={(score, total) =>
            recordScore(activeGame.variantId, activeGame.domain, score, total)
          }
          onClose={handleGameClose}
        />
      );
    }

    // Standalone game
    const { entry, difficulty } = activeGame;
    const skillLevel = SKILL_LEVEL_MAP[difficulty];

    const handleStandaloneComplete = (stats: { correct: number; incorrect?: number; total?: number; time?: number }) => {
      const total = stats.total || (stats.correct + (stats.incorrect || 0));
      recordScore(entry.id, entry.domain, stats.correct, total);
    };

    return (
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-4xl animate-pulse">🎮</div>
        </div>
      }>
        {entry.gameType === 'memory' && (
          <MemoryMatchGame
            skillLevel={skillLevel}
            onComplete={handleStandaloneComplete}
            onClose={handleGameClose}
          />
        )}
        {entry.gameType === 'pattern' && (
          <PatternMatchGame
            skillLevel={skillLevel}
            onComplete={handleStandaloneComplete}
            onClose={handleGameClose}
          />
        )}
        {entry.gameType === 'sounds' && (
          <SoundsMatchGame
            skillLevel={skillLevel}
            onComplete={handleStandaloneComplete}
            onClose={handleGameClose}
          />
        )}
      </Suspense>
    );
  }

  // ── Browse view ──
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Gamepad2 className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Skill Games</h2>
        <span className="text-sm text-muted-foreground">
          {totalGames} games · Play anytime!
        </span>
      </div>

      {domainOrder.map(domain => {
        const { variants, standalone } = gamesByDomain[domain] || { variants: [], standalone: [] };
        const totalInDomain = variants.length + standalone.length;
        if (totalInDomain === 0) return null;

        const domainInfo = DOMAIN_LABELS[domain] || { label: domain, emoji: '🎮' };
        const isExpanded = expandedDomains.has(domain);
        const visibleVariants = isExpanded ? variants : variants.slice(0, 1);
        const visibleStandalone = isExpanded ? standalone : [];

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
                ({totalInDomain} games)
              </span>
              <span className="ml-auto text-muted-foreground">
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </span>
            </button>

            {/* Game cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {visibleVariants.map(variant => (
                <GameCard
                  key={variant.id}
                  id={variant.id}
                  label={variant.label}
                  description={variant.description}
                  emoji={variant.emoji}
                  bgClass={variant.bgClass}
                  accentClass={variant.accentClass}
                  difficulty={adaptive.getDifficulty(variant.id)}
                  suggestion={adaptive.getSuggestion(variant.id)}
                  onDifficultyChange={d => adaptive.setManualDifficulty(variant.id, d)}
                  onPlay={() => handlePlayVariant(variant)}
                  score={scores[variant.id]}
                />
              ))}
              {visibleStandalone.map(entry => (
                <GameCard
                  key={entry.id}
                  id={entry.id}
                  label={entry.label}
                  description={entry.description}
                  emoji={entry.emoji}
                  bgClass={entry.bgClass}
                  accentClass={entry.accentClass}
                  difficulty={adaptive.getDifficulty(entry.id)}
                  suggestion={adaptive.getSuggestion(entry.id)}
                  onDifficultyChange={d => adaptive.setManualDifficulty(entry.id, d)}
                  onPlay={() => handlePlayStandalone(entry)}
                  score={scores[entry.id]}
                  badge="Bonus"
                />
              ))}
            </div>

            {/* Show more toggle */}
            {totalInDomain > 1 && !isExpanded && (
              <button
                onClick={() => toggleDomain(domain)}
                className="text-xs text-primary hover:underline ml-1"
              >
                + {totalInDomain - 1} more games
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Unified Game Card ──
function GameCard({
  id: _id,
  label,
  description,
  emoji,
  bgClass,
  accentClass,
  difficulty,
  suggestion,
  onDifficultyChange,
  onPlay,
  score,
  badge,
}: {
  id: string;
  label: string;
  description: string;
  emoji: string;
  bgClass: string;
  accentClass: string;
  difficulty: Difficulty;
  suggestion: 'promote' | 'demote' | 'stay';
  onDifficultyChange: (d: Difficulty) => void;
  onPlay: () => void;
  score?: GameScore;
  badge?: string;
}) {
  const accuracy = score ? Math.round((score.lastScore / score.lastTotal) * 100) : null;

  return (
    <Card className={`${bgClass} border-0 transition-shadow duration-200 motion-reduce:transition-none hover:shadow-md`}>
      <CardContent className="p-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start gap-2">
          <span className="text-2xl" role="img" aria-label={label}>{emoji}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h4 className={`font-bold text-sm ${accentClass} truncate`}>{label}</h4>
              {badge && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold shrink-0">
                  <Sparkles className="h-2.5 w-2.5" />
                  {badge}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
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
              <span className="flex items-center gap-0.5 text-primary font-medium">
                <TrendingUp className="h-3 w-3" /> Level up!
              </span>
            )}
            {suggestion === 'demote' && (
              <span className="flex items-center gap-0.5 text-accent-foreground font-medium">
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
