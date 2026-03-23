import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SkillMatchGame } from '@/components/games/SkillMatchGame';

// Mock gameUtils audio
vi.mock('./shared/gameUtils', async () => {
  const actual = await vi.importActual('./shared/gameUtils');
  return {
    ...actual,
    playSound: vi.fn(),
    prefersReducedMotion: () => false,
  };
});

describe('SkillMatchGame', () => {
  const onComplete = vi.fn();
  const onClose = vi.fn();

  it('renders with correct domain title for social domain', () => {
    render(
      <SkillMatchGame
        skillDomain="social"
        difficulty="easy"
        onComplete={onComplete}
        onClose={onClose}
      />
    );
    expect(screen.getByText('Emotion Explorer')).toBeInTheDocument();
    expect(screen.getByText('Sort emotions into groups!')).toBeInTheDocument();
    expect(screen.getByText(/Round 1 of/)).toBeInTheDocument();
  });

  it('renders with correct domain title for communication domain', () => {
    render(
      <SkillMatchGame
        skillDomain="communication"
        difficulty="easy"
        onComplete={onComplete}
        onClose={onClose}
      />
    );
    expect(screen.getByText('Communication Quest')).toBeInTheDocument();
  });

  it('renders with correct domain title for executive_function domain', () => {
    render(
      <SkillMatchGame
        skillDomain="executive_function"
        difficulty="easy"
        onComplete={onComplete}
        onClose={onClose}
      />
    );
    expect(screen.getByText('Sequence Builder')).toBeInTheDocument();
    expect(screen.getByText('Put the steps in the right order!')).toBeInTheDocument();
  });

  it('shows game controls (pause, sound, settings, close)', () => {
    render(
      <SkillMatchGame
        skillDomain="daily_living"
        difficulty="easy"
        onComplete={onComplete}
        onClose={onClose}
      />
    );
    expect(screen.getByLabelText('Pause game')).toBeInTheDocument();
    expect(screen.getByLabelText('Mute sounds')).toBeInTheDocument();
    expect(screen.getByLabelText('Game settings')).toBeInTheDocument();
    expect(screen.getByLabelText('Close game')).toBeInTheDocument();
  });

  it('pauses and resumes the game', () => {
    render(
      <SkillMatchGame
        skillDomain="social"
        difficulty="easy"
        onComplete={onComplete}
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByLabelText('Pause game'));
    expect(screen.getByText('Game Paused')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Continue'));
    expect(screen.queryByText('Game Paused')).not.toBeInTheDocument();
  });
});
