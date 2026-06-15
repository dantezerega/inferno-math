import { describe, expect, it } from 'vitest';
import {
  accuracy,
  answersPerMinute,
  applyCorrect,
  applyIncorrect,
  initialScoreState,
  isCorrect,
  isStreakMilestone,
  parseAnswer,
} from '@/game/scoring';
import type { Problem } from '@/types';

const problem: Problem = {
  id: 1,
  question: '12 + 30',
  answer: 42,
  difficulty: 'easy',
};

describe('parseAnswer', () => {
  it('parses valid integers including negatives', () => {
    expect(parseAnswer('42')).toBe(42);
    expect(parseAnswer('  7 ')).toBe(7);
    expect(parseAnswer('-5')).toBe(-5);
    expect(parseAnswer('0')).toBe(0);
  });

  it('rejects empty, partial, and non-integer input', () => {
    expect(parseAnswer('')).toBeNull();
    expect(parseAnswer('   ')).toBeNull();
    expect(parseAnswer('-')).toBeNull();
    expect(parseAnswer('3.5')).toBeNull();
    expect(parseAnswer('12a')).toBeNull();
    expect(parseAnswer('abc')).toBeNull();
  });
});

describe('isCorrect', () => {
  it('matches the exact answer', () => {
    expect(isCorrect(problem, '42')).toBe(true);
    expect(isCorrect(problem, ' 42 ')).toBe(true);
  });
  it('rejects wrong or invalid answers', () => {
    expect(isCorrect(problem, '41')).toBe(false);
    expect(isCorrect(problem, '')).toBe(false);
    expect(isCorrect(problem, 'x')).toBe(false);
  });
});

describe('streak & score transitions', () => {
  it('applyCorrect increments score, correct, and streak', () => {
    const s = applyCorrect(initialScoreState);
    expect(s.score).toBe(1);
    expect(s.correct).toBe(1);
    expect(s.streak).toBe(1);
    expect(s.bestStreak).toBe(1);
  });

  it('tracks best streak across a run', () => {
    let s = initialScoreState;
    s = applyCorrect(s); // 1
    s = applyCorrect(s); // 2
    s = applyCorrect(s); // 3
    expect(s.bestStreak).toBe(3);
    s = applyIncorrect(s); // streak resets, bestStreak retained
    expect(s.streak).toBe(0);
    expect(s.bestStreak).toBe(3);
    expect(s.incorrect).toBe(1);
    s = applyCorrect(s); // 1 again
    expect(s.streak).toBe(1);
    expect(s.bestStreak).toBe(3);
  });

  it('applyIncorrect resets streak and bumps incorrect only', () => {
    let s = applyCorrect(applyCorrect(initialScoreState));
    s = applyIncorrect(s);
    expect(s.score).toBe(2);
    expect(s.streak).toBe(0);
    expect(s.incorrect).toBe(1);
  });
});

describe('derived metrics', () => {
  it('accuracy handles the zero-attempt case', () => {
    expect(accuracy(0, 0)).toBe(0);
    expect(accuracy(8, 2)).toBeCloseTo(80);
    expect(accuracy(3, 0)).toBe(100);
  });

  it('answersPerMinute scales correct count to 60s', () => {
    expect(answersPerMinute(30, 60)).toBe(30);
    expect(answersPerMinute(30, 30)).toBe(60);
    expect(answersPerMinute(5, 0)).toBe(0);
  });

  it('isStreakMilestone fires every 5', () => {
    expect(isStreakMilestone(0)).toBe(false);
    expect(isStreakMilestone(5)).toBe(true);
    expect(isStreakMilestone(7)).toBe(false);
    expect(isStreakMilestone(10)).toBe(true);
  });
});
