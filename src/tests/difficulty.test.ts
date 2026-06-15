import { describe, expect, it } from 'vitest';
import {
  adjustDifficulty,
  clampLevel,
  DIFFICULTY_ORDER,
  isMultiStep,
} from '@/game/difficulty';

describe('difficulty metadata', () => {
  it('orders levels from easiest to hardest', () => {
    expect(DIFFICULTY_ORDER).toEqual([
      'easy',
      'medium',
      'hard',
      'expert',
      'master',
      'grandmaster',
    ]);
  });

  it('flags only master and grandmaster as multi-step', () => {
    expect(isMultiStep('easy')).toBe(false);
    expect(isMultiStep('expert')).toBe(false);
    expect(isMultiStep('master')).toBe(true);
    expect(isMultiStep('grandmaster')).toBe(true);
  });

  it('clampLevel stays within bounds', () => {
    expect(clampLevel(-5)).toBe('easy');
    expect(clampLevel(0)).toBe('easy');
    expect(clampLevel(99)).toBe('grandmaster');
  });
});

describe('adaptive difficulty', () => {
  it('increases a level when accuracy is above 90%', () => {
    expect(adjustDifficulty('easy', 95)).toBe('medium');
    expect(adjustDifficulty('hard', 100)).toBe('expert');
  });

  it('decreases a level when accuracy is below 60%', () => {
    expect(adjustDifficulty('medium', 50)).toBe('easy');
    expect(adjustDifficulty('expert', 0)).toBe('hard');
  });

  it('holds steady in the neutral band', () => {
    expect(adjustDifficulty('medium', 75)).toBe('medium');
    expect(adjustDifficulty('hard', 90)).toBe('hard'); // boundary, not > 90
    expect(adjustDifficulty('hard', 60)).toBe('hard'); // boundary, not < 60
  });

  it('cannot move past the ends of the scale', () => {
    expect(adjustDifficulty('grandmaster', 100)).toBe('grandmaster');
    expect(adjustDifficulty('easy', 0)).toBe('easy');
  });
});
