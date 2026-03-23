/**
 * SkillMatchGame - Domain-adaptive interactive game
 * Renders match, sort, sequence, odd-one-out, or fill-blank challenges based on skill domain
 */
import { useState, useCallback, useMemo, type DragEvent } from 'react';
import { Button } from '@/components/ui/button';
import { GameWrapper } from './shared/GameWrapper';
import { playSound, prefersReducedMotion } from './shared/gameUtils';
import {
  getDomainGameConfig,
  getRoundCount,
  type GameChallenge,
  type GameSymbol,
} from './shared/skillGameData';

interface SkillMatchGameProps {
  skillDomain: string;
  difficulty?: string;
  onComplete?: (score: number, total: number) => void;
  onClose?: () => void;
}

export function SkillMatchGame({
  skillDomain,
  difficulty = 'easy',
  onComplete,
  onClose,
}: SkillMatchGameProps) {
  const config = useMemo(() => getDomainGameConfig(skillDomain), [skillDomain]);
  const totalRounds = useMemo(() => getRoundCount(difficulty), [difficulty]);
  const difficultyLevel = difficulty === 'hard' ? 2 : difficulty === 'medium' ? 1 : 0;

  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [stars, setStars] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion());
  const [challenge, setChallenge] = useState<GameChallenge>(() =>
    config.generateChallenge(difficultyLevel)
  );
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [isFinished, setIsFinished] = useState(false);

  // Match state
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());

  // Sort state
  const [sortBuckets, setSortBuckets] = useState<Record<string, string[]>>({});
  const [dragItem, setDragItem] = useState<string | null>(null);

  // Sequence state
  const [sequenceOrder, setSequenceOrder] = useState<string[]>([]);

  const progress = totalRounds > 0 ? ((round) / totalRounds) * 100 : 0;

  const nextRound = useCallback(() => {
    const nextIdx = round + 1;
    if (nextIdx >= totalRounds) {
      setIsFinished(true);
      if (soundEnabled) playSound('complete');
      onComplete?.(score, totalRounds);
      return;
    }
    setRound(nextIdx);
    setChallenge(config.generateChallenge(difficultyLevel));
    setSelectedSymbol(null);
    setMatchedPairs(new Set());
    setSortBuckets({});
    setSequenceOrder([]);
    setFeedback(null);
  }, [round, totalRounds, config, difficultyLevel, score, soundEnabled, onComplete]);

  const showFeedback = useCallback((correct: boolean) => {
    setFeedback(correct ? 'correct' : 'incorrect');
    if (soundEnabled) playSound(correct ? 'correct' : 'incorrect');
    if (correct) {
      setScore(s => s + 1);
      setStars(s => s + 1);
    }
    setTimeout(() => {
      setFeedback(null);
      nextRound();
    }, 1200);
  }, [soundEnabled, nextRound]);

  // ── Match mode ──
  const handleMatchSelect = useCallback((symbolId: string) => {
    if (feedback) return;
    if (!selectedSymbol) {
      setSelectedSymbol(symbolId);
      if (soundEnabled) playSound('click');
      return;
    }
    if (selectedSymbol === symbolId) {
      setSelectedSymbol(null);
      return;
    }
    const matched = selectedSymbol === symbolId;
    if (matched) {
      setMatchedPairs(prev => new Set(prev).add(symbolId));
    }
    setSelectedSymbol(null);
  }, [selectedSymbol, feedback, soundEnabled]);

  // ── Sort mode ──
  const handleSortDrop = useCallback((itemId: string, group: string) => {
    if (feedback) return;
    setSortBuckets(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(g => {
        updated[g] = (updated[g] || []).filter(id => id !== itemId);
      });
      if (group) {
        updated[group] = [...(updated[group] || []), itemId];
      }
      return updated;
    });
    if (soundEnabled) playSound('click');
  }, [feedback, soundEnabled]);

  const handleSortSubmit = useCallback(() => {
    if (feedback) return;
    let allCorrect = true;
    challenge.items.forEach(item => {
      const placedIn = Object.entries(sortBuckets).find(([, ids]) => ids.includes(item.id));
      if (!placedIn || placedIn[0] !== item.group) {
        allCorrect = false;
      }
    });
    showFeedback(allCorrect);
  }, [feedback, challenge, sortBuckets, showFeedback]);

  // ── Sequence mode ──
  const handleSequenceTap = useCallback((symbolId: string) => {
    if (feedback) return;
    if (sequenceOrder.includes(symbolId)) {
      setSequenceOrder(prev => prev.filter(id => id !== symbolId));
      return;
    }
    const newOrder = [...sequenceOrder, symbolId];
    setSequenceOrder(newOrder);
    if (soundEnabled) playSound('click');

    if (newOrder.length === challenge.correctAnswer.length) {
      const isCorrect = newOrder.every((id, i) => id === challenge.correctAnswer[i]);
      showFeedback(isCorrect);
    }
  }, [feedback, sequenceOrder, challenge, soundEnabled, showFeedback]);

  // ── Odd-one-out mode ──
  const handleOddOneOutPick = useCallback((symbolId: string) => {
    if (feedback) return;
    showFeedback(challenge.correctAnswer.includes(symbolId));
  }, [feedback, challenge, showFeedback]);

  // ── Fill-blank mode ──
  const handleFillBlankPick = useCallback((symbolId: string) => {
    if (feedback) return;
    showFeedback(challenge.correctAnswer.includes(symbolId));
  }, [feedback, challenge, showFeedback]);

  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  const handleRestart = useCallback(() => {
    setRound(0);
    setScore(0);
    setStars(0);
    setIsFinished(false);
    setChallenge(config.generateChallenge(difficultyLevel));
    setSelectedSymbol(null);
    setMatchedPairs(new Set());
    setSortBuckets({});
    setSequenceOrder([]);
    setFeedback(null);
  }, [config, difficultyLevel]);

  // ── Finished screen ──
  if (isFinished) {
    const pct = Math.round((score / totalRounds) * 100);
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 p-8">
        <div className={`text-7xl ${reducedMotion ? '' : 'animate-bounce'}`}>
          {pct >= 80 ? '🏆' : pct >= 50 ? '⭐' : '💪'}
        </div>
        <h2 className="text-3xl font-bold text-foreground">
          {pct >= 80 ? 'Amazing!' : pct >= 50 ? 'Good Job!' : 'Keep Trying!'}
        </h2>
        <p className="text-xl text-muted-foreground">
          You got <span className="font-bold text-primary">{score}</span> out of{' '}
          <span className="font-bold">{totalRounds}</span> correct
        </p>
        <div className="flex gap-4">
          <Button onClick={handleRestart} variant="outline" size="lg">
            Play Again
          </Button>
          <Button onClick={handleClose} size="lg">
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <GameWrapper
      title={config.label}
      categoryName={config.description}
      isPaused={isPaused}
      onPause={() => setIsPaused(true)}
      onResume={() => setIsPaused(false)}
      onClose={handleClose}
      onRestart={handleRestart}
      starsEarned={stars}
      progress={progress}
      soundEnabled={soundEnabled}
      onSoundToggle={() => setSoundEnabled(s => !s)}
      reducedMotion={reducedMotion}
      onReducedMotionToggle={() => setReducedMotion(r => !r)}
    >
      <div className={`h-full flex flex-col p-4 md:p-6 ${config.bgClass}`}>
        {/* Round indicator */}
        <div className="text-center mb-4">
          <p className={`text-lg font-semibold ${config.accentClass}`}>
            Round {round + 1} of {totalRounds}
          </p>
          <p className="text-muted-foreground">{challenge.prompt}</p>
        </div>

        {/* Feedback overlay */}
        {feedback && (
          <div
            className={`fixed inset-0 z-40 flex items-center justify-center pointer-events-none ${
              reducedMotion ? '' : 'animate-pulse'
            }`}
          >
            <div className={`text-8xl ${
              feedback === 'correct' ? 'text-green-500' : 'text-red-500'
            }`}>
              {feedback === 'correct' ? '✅' : '❌'}
            </div>
          </div>
        )}

        {/* Game area */}
        <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto">
          {challenge.type === 'match' && (
            <MatchMode
              items={challenge.items}
              selectedSymbol={selectedSymbol}
              matchedPairs={matchedPairs}
              onSelect={handleMatchSelect}
              onCheck={showFeedback}
              feedback={feedback}
            />
          )}
          {challenge.type === 'sort' && (
            <SortMode
              items={challenge.items}
              groups={challenge.correctAnswer}
              buckets={sortBuckets}
              dragItem={dragItem}
              onDragStart={setDragItem}
              onDrop={handleSortDrop}
              onSubmit={handleSortSubmit}
              feedback={feedback}
            />
          )}
          {challenge.type === 'sequence' && (
            <SequenceMode
              items={challenge.items}
              sequenceOrder={sequenceOrder}
              onTap={handleSequenceTap}
              feedback={feedback}
            />
          )}
          {challenge.type === 'odd_one_out' && (
            <OddOneOutMode
              items={challenge.items}
              onPick={handleOddOneOutPick}
              feedback={feedback}
            />
          )}
          {challenge.type === 'fill_blank' && (
            <FillBlankMode
              challenge={challenge}
              onPick={handleFillBlankPick}
              feedback={feedback}
            />
          )}
        </div>
      </div>
    </GameWrapper>
  );
}

// ── Match Sub-component ──
function MatchMode({
  items,
  onCheck,
  feedback,
}: {
  items: GameSymbol[];
  selectedSymbol: string | null;
  matchedPairs: Set<string>;
  onSelect: (id: string) => void;
  onCheck: (correct: boolean) => void;
  feedback: 'correct' | 'incorrect' | null;
}) {
  const [selected1, setSelected1] = useState<string | null>(null);
  const [selected2, setSelected2] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const shuffledLabels = useMemo(() => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map(i => i.id).join()]);

  const handleLeft = (id: string) => {
    if (feedback || matched.has(id)) return;
    setSelected1(id);
    if (selected2) checkPair(id, selected2);
  };

  const handleRight = (id: string) => {
    if (feedback || matched.has(id)) return;
    setSelected2(id);
    if (selected1) checkPair(selected1, id);
  };

  const checkPair = (leftId: string, rightId: string) => {
    if (leftId === rightId) {
      setMatched(prev => new Set(prev).add(leftId));
      setSelected1(null);
      setSelected2(null);
      if (matched.size + 1 >= items.length) {
        onCheck(true);
      }
    } else {
      setTimeout(() => {
        setSelected1(null);
        setSelected2(null);
      }, 600);
    }
  };

  return (
    <div className="flex gap-6 md:gap-10 w-full max-w-lg mx-auto">
      <div className="flex-1 flex flex-col gap-3">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => handleLeft(item.id)}
            disabled={matched.has(item.id)}
            className={`flex items-center justify-center h-16 rounded-2xl border-2 text-3xl transition-colors ${
              matched.has(item.id)
                ? 'bg-green-100 dark:bg-green-900/30 border-green-300 opacity-60'
                : selected1 === item.id
                ? 'bg-primary/20 border-primary ring-2 ring-primary/30'
                : 'bg-card border-border hover:border-primary/50'
            }`}
            aria-label={item.label}
          >
            {item.emoji}
          </button>
        ))}
      </div>
      <div className="flex-1 flex flex-col gap-3">
        {shuffledLabels.map(item => (
          <button
            key={`label-${item.id}`}
            onClick={() => handleRight(item.id)}
            disabled={matched.has(item.id)}
            className={`flex items-center justify-center h-16 rounded-2xl border-2 text-base font-semibold transition-colors ${
              matched.has(item.id)
                ? 'bg-green-100 dark:bg-green-900/30 border-green-300 opacity-60'
                : selected2 === item.id
                ? 'bg-primary/20 border-primary ring-2 ring-primary/30'
                : 'bg-card border-border hover:border-primary/50'
            }`}
            aria-label={`Match ${item.label}`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Sort Sub-component with HTML5 Drag & Drop + Touch fallback ──
function SortMode({
  items,
  groups,
  buckets,
  dragItem,
  onDragStart,
  onDrop,
  onSubmit,
  feedback,
}: {
  items: GameSymbol[];
  groups: string[];
  buckets: Record<string, string[]>;
  dragItem: string | null;
  onDragStart: (id: string | null) => void;
  onDrop: (itemId: string, group: string) => void;
  onSubmit: () => void;
  feedback: 'correct' | 'incorrect' | null;
}) {
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null);

  const allPlaced = items.every(item =>
    Object.values(buckets).some(ids => ids.includes(item.id))
  );

  const unplacedItems = items.filter(
    item => !Object.values(buckets).some(ids => ids.includes(item.id))
  );

  // HTML5 Drag handlers
  const handleDragStart = (e: DragEvent<HTMLButtonElement>, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    onDragStart(id);
  };

  const handleDragEnd = () => {
    onDragStart(null);
    setDragOverGroup(null);
  };

  const handleDragOver = (e: DragEvent<HTMLButtonElement>, group: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverGroup(group);
  };

  const handleDragLeave = () => {
    setDragOverGroup(null);
  };

  const handleDropOnGroup = (e: DragEvent<HTMLButtonElement>, group: string) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('text/plain');
    if (itemId) {
      onDrop(itemId, group);
    }
    onDragStart(null);
    setDragOverGroup(null);
  };

  // Touch drag fallback — tap to select, tap bucket to place
  const handleTouchItem = (id: string) => {
    onDragStart(dragItem === id ? null : id);
  };

  const handleTouchBucket = (group: string) => {
    if (dragItem) {
      onDrop(dragItem, group);
      onDragStart(null);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Unplaced items — draggable */}
      <div className="flex flex-wrap gap-2 justify-center min-h-[60px] p-3 rounded-xl bg-muted/50 border border-dashed border-border">
        {unplacedItems.length === 0 ? (
          <p className="text-sm text-muted-foreground self-center">All items sorted!</p>
        ) : (
          unplacedItems.map(item => (
            <button
              key={item.id}
              draggable
              onDragStart={(e) => handleDragStart(e, item.id)}
              onDragEnd={handleDragEnd}
              onClick={() => handleTouchItem(item.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-base cursor-grab active:cursor-grabbing transition-transform ${
                dragItem === item.id
                  ? 'bg-primary/20 border-primary shadow-lg scale-105 ring-2 ring-primary/30'
                  : 'bg-card border-border hover:border-primary/50 hover:shadow-md'
              }`}
              aria-label={`Drag ${item.label}`}
            >
              <span className="text-2xl">{item.emoji}</span>
              <span className="font-medium">{item.label}</span>
            </button>
          ))
        )}
      </div>

      {/* Instruction hint */}
      {unplacedItems.length > 0 && (
        <p className="text-xs text-center text-muted-foreground">
          Drag items below or tap an item then tap a group
        </p>
      )}

      {/* Group buckets — drop targets */}
      <div className="grid grid-cols-2 gap-3">
        {groups.map(group => {
          const groupItems = items.filter(
            i => (buckets[group] || []).includes(i.id)
          );
          const isOver = dragOverGroup === group;
          return (
            <button
              key={group}
              onDragOver={(e) => handleDragOver(e, group)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDropOnGroup(e, group)}
              onClick={() => handleTouchBucket(group)}
              className={`p-4 rounded-xl border-2 min-h-[100px] text-left transition-colors ${
                isOver
                  ? 'border-primary bg-primary/15 scale-[1.02] shadow-lg'
                  : dragItem
                  ? 'border-primary/50 bg-primary/5 cursor-pointer hover:bg-primary/10'
                  : 'border-border bg-card'
              }`}
              aria-label={`${group} category drop zone`}
            >
              <p className="font-bold text-sm uppercase tracking-wide text-muted-foreground mb-2 capitalize">
                {group}
              </p>
              <div className="flex flex-wrap gap-1">
                {groupItems.map(item => (
                  <span
                    key={item.id}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-muted text-sm cursor-pointer hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDragStart(item.id);
                      onDrop(item.id, '');
                    }}
                    role="button"
                    aria-label={`Remove ${item.label} from ${group}`}
                  >
                    {item.emoji} {item.label} ✕
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {allPlaced && !feedback && (
        <div className="text-center">
          <Button onClick={onSubmit} size="lg" className="min-w-[200px]">
            Check Answers ✓
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Sequence Sub-component ──
function SequenceMode({
  items,
  sequenceOrder,
  onTap,
  feedback,
}: {
  items: GameSymbol[];
  sequenceOrder: string[];
  onTap: (id: string) => void;
  feedback: 'correct' | 'incorrect' | null;
}) {
  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      {/* Selected order display */}
      <div className="flex gap-2 justify-center min-h-[60px] p-3 rounded-xl bg-muted/50 border border-dashed border-border flex-wrap">
        {sequenceOrder.length === 0 ? (
          <p className="text-sm text-muted-foreground self-center">
            Tap items in the correct order
          </p>
        ) : (
          sequenceOrder.map((id, idx) => {
            const item = items.find(i => i.id === id);
            return (
              <div
                key={`seq-${idx}`}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-primary/10 border border-primary/30"
              >
                <span className="text-xs font-bold text-primary">{idx + 1}.</span>
                <span className="text-xl">{item?.emoji}</span>
              </div>
            );
          })
        )}
      </div>

      {/* Items to order */}
      <div className="flex flex-col gap-3">
        {items.map(item => {
          const isSelected = sequenceOrder.includes(item.id);
          const orderIdx = sequenceOrder.indexOf(item.id);
          return (
            <button
              key={item.id}
              onClick={() => onTap(item.id)}
              disabled={!!feedback}
              className={`flex items-center gap-4 px-5 py-4 rounded-2xl border-2 text-left transition-colors ${
                isSelected
                  ? 'bg-primary/10 border-primary/40 opacity-60'
                  : 'bg-card border-border hover:border-primary/50'
              }`}
              aria-label={`${item.label}${isSelected ? `, selected as position ${orderIdx + 1}` : ''}`}
            >
              <span className="text-3xl">{item.emoji}</span>
              <span className="font-medium text-lg">{item.label}</span>
              {isSelected && (
                <span className="ml-auto bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                  {orderIdx + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Odd-One-Out Sub-component ──
function OddOneOutMode({
  items,
  onPick,
  feedback,
}: {
  items: GameSymbol[];
  onPick: (id: string) => void;
  feedback: 'correct' | 'incorrect' | null;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  const handlePick = (id: string) => {
    if (feedback) return;
    setSelected(id);
    onPick(id);
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-4">
      <div className="text-center mb-2">
        <p className="text-sm text-muted-foreground">
          One of these doesn't belong with the others. Tap it!
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => handlePick(item.id)}
            disabled={!!feedback}
            className={`flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border-2 min-h-[120px] transition-colors ${
              selected === item.id && feedback === 'correct'
                ? 'bg-green-100 dark:bg-green-900/30 border-green-400 ring-2 ring-green-300'
                : selected === item.id && feedback === 'incorrect'
                ? 'bg-red-100 dark:bg-red-900/30 border-red-400 ring-2 ring-red-300'
                : selected === item.id
                ? 'bg-primary/20 border-primary ring-2 ring-primary/30'
                : 'bg-card border-border hover:border-primary/50 hover:shadow-md'
            }`}
            aria-label={item.label}
          >
            <span className="text-5xl">{item.emoji}</span>
            <span className="font-semibold text-base">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Fill-in-the-Blank Sub-component ──
function FillBlankMode({
  challenge,
  onPick,
  feedback,
}: {
  challenge: GameChallenge;
  onPick: (id: string) => void;
  feedback: 'correct' | 'incorrect' | null;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  // Items before the blankIndex are the visible sequence; the rest are choices
  const blankIdx = challenge.blankIndex ?? 1;
  // The sequence items are all items except the choice options (last N items that are choices)
  // From the generator: items = [...displayed (sequence without blank), ...choices]
  // displayed.length = original sequence length - 1
  // choices.length = 3 (1 correct + 2 distractors)
  const choiceCount = 3;
  const sequenceItems = challenge.items.slice(0, challenge.items.length - choiceCount);
  const choices = challenge.items.slice(challenge.items.length - choiceCount);

  const handlePick = (id: string) => {
    if (feedback) return;
    setSelected(id);
    onPick(id);
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      {/* Sequence with blank */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {sequenceItems.map((item, idx) => (
          <div key={item.id} className="flex items-center gap-2">
            {idx === blankIdx && (
              <>
                <div className="flex flex-col items-center justify-center w-16 h-16 rounded-2xl border-2 border-dashed border-primary bg-primary/5">
                  <span className="text-2xl text-primary">?</span>
                </div>
                <span className="text-muted-foreground text-lg">→</span>
              </>
            )}
            <div className="flex flex-col items-center justify-center w-16 h-16 rounded-2xl border-2 border-border bg-card">
              <span className="text-2xl">{item.emoji}</span>
            </div>
            {idx < sequenceItems.length - 1 && idx !== blankIdx - 1 && (
              <span className="text-muted-foreground text-lg">→</span>
            )}
          </div>
        ))}
        {/* If blank is at the end */}
        {blankIdx >= sequenceItems.length && (
          <>
            <span className="text-muted-foreground text-lg">→</span>
            <div className="flex flex-col items-center justify-center w-16 h-16 rounded-2xl border-2 border-dashed border-primary bg-primary/5">
              <span className="text-2xl text-primary">?</span>
            </div>
          </>
        )}
      </div>

      {/* Choices */}
      <div className="text-center mb-1">
        <p className="text-sm text-muted-foreground font-medium">Pick the missing piece:</p>
      </div>
      <div className="flex gap-4 justify-center">
        {choices.map(item => (
          <button
            key={item.id}
            onClick={() => handlePick(item.id)}
            disabled={!!feedback}
            className={`flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border-2 min-w-[100px] transition-colors ${
              selected === item.id && feedback === 'correct'
                ? 'bg-green-100 dark:bg-green-900/30 border-green-400 ring-2 ring-green-300'
                : selected === item.id && feedback === 'incorrect'
                ? 'bg-red-100 dark:bg-red-900/30 border-red-400 ring-2 ring-red-300'
                : selected === item.id
                ? 'bg-primary/20 border-primary ring-2 ring-primary/30'
                : 'bg-card border-border hover:border-primary/50 hover:shadow-md'
            }`}
            aria-label={item.label}
          >
            <span className="text-4xl">{item.emoji}</span>
            <span className="font-semibold text-sm">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default SkillMatchGame;
