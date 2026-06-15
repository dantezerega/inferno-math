import { describe, expect, it } from 'vitest';
import {
  averageAccuracy,
  averageScore,
  buildHeatmap,
  emptyStatistics,
  intensity,
  isNewBest,
  recordSession,
  scoreTrend,
} from '@/stats/statistics';
import type { SessionResult } from '@/types';
import { dateKey } from '@/utils/date';

const at = (endedAt: number, over: Partial<SessionResult> = {}): SessionResult => ({
  score: 20,
  correct: 22,
  incorrect: 3,
  bestStreak: 8,
  durationSeconds: 60,
  endedAt,
  daily: false,
  ...over,
});

describe('recordSession', () => {
  it('accumulates totals across sessions', () => {
    const now = Date.now();
    let stats = emptyStatistics();
    stats = recordSession(stats, at(now, { score: 10, correct: 12, incorrect: 2 }));
    stats = recordSession(stats, at(now, { score: 30, correct: 33, incorrect: 4 }));

    expect(stats.totalSessions).toBe(2);
    expect(stats.totalCorrect).toBe(45);
    expect(stats.totalIncorrect).toBe(6);
    expect(stats.bestScore).toBe(30);
    expect(stats.totalScore).toBe(40);
    expect(stats.totalPracticeSeconds).toBe(120);
  });

  it('does not mutate the input', () => {
    const stats = emptyStatistics();
    const copy = JSON.parse(JSON.stringify(stats));
    recordSession(stats, at(Date.now()));
    expect(stats).toEqual(copy);
  });

  it('aggregates daily activity by date key', () => {
    const day = new Date('2026-06-15T10:00:00').getTime();
    let stats = emptyStatistics();
    stats = recordSession(stats, at(day, { score: 10, correct: 5 }));
    stats = recordSession(stats, at(day, { score: 25, correct: 9 }));
    const key = dateKey(new Date(day));
    expect(stats.daily[key]?.sessions).toBe(2);
    expect(stats.daily[key]?.bestScore).toBe(25);
    expect(stats.daily[key]?.totalCorrect).toBe(14);
  });

  it('records daily-challenge best separately', () => {
    const day = new Date('2026-06-15T10:00:00').getTime();
    let stats = emptyStatistics();
    stats = recordSession(stats, at(day, { score: 15, daily: true }));
    stats = recordSession(stats, at(day, { score: 9, daily: true }));
    const key = dateKey(new Date(day));
    expect(stats.dailyChallengeBest[key]).toBe(15);
  });
});

describe('averages', () => {
  it('handle empty stats', () => {
    const stats = emptyStatistics();
    expect(averageScore(stats)).toBe(0);
    expect(averageAccuracy(stats)).toBe(0);
  });

  it('compute mean score and accuracy', () => {
    let stats = emptyStatistics();
    stats = recordSession(stats, at(Date.now(), { score: 10, correct: 10, incorrect: 0 }));
    stats = recordSession(stats, at(Date.now(), { score: 20, correct: 10, incorrect: 10 }));
    expect(averageScore(stats)).toBe(15);
    expect(averageAccuracy(stats)).toBeCloseTo(66.666, 2);
  });
});

describe('isNewBest', () => {
  it('detects a higher score', () => {
    let stats = emptyStatistics();
    stats = recordSession(stats, at(Date.now(), { score: 10 }));
    expect(isNewBest(stats, at(Date.now(), { score: 11 }))).toBe(true);
    expect(isNewBest(stats, at(Date.now(), { score: 10 }))).toBe(false);
  });
});

describe('heatmap & intensity', () => {
  it('builds a contiguous window of the requested length', () => {
    const cells = buildHeatmap(emptyStatistics(), 30, new Date('2026-06-15T12:00:00'));
    expect(cells).toHaveLength(30);
    expect(cells[cells.length - 1]?.date).toBe('2026-06-15');
  });

  it('maps correct counts to buckets', () => {
    expect(intensity(0)).toBe(0);
    expect(intensity(5)).toBe(1);
    expect(intensity(30)).toBe(2);
    expect(intensity(70)).toBe(3);
    expect(intensity(200)).toBe(4);
  });

  it('reflects recorded activity in the window', () => {
    const today = new Date('2026-06-15T12:00:00');
    let stats = emptyStatistics();
    stats = recordSession(stats, at(today.getTime(), { correct: 40 }));
    const cells = buildHeatmap(stats, 7, today);
    const last = cells[cells.length - 1];
    expect(last?.totalCorrect).toBe(40);
    expect(intensity(last!.totalCorrect)).toBe(2);
  });
});

describe('scoreTrend', () => {
  it('returns one point per day, oldest first', () => {
    const today = new Date('2026-06-15T12:00:00');
    let stats = emptyStatistics();
    stats = recordSession(stats, at(today.getTime(), { score: 42 }));
    const trend = scoreTrend(stats, 5, today);
    expect(trend).toHaveLength(5);
    expect(trend[trend.length - 1]).toEqual({ date: '2026-06-15', score: 42 });
    expect(trend[0]?.score).toBe(0);
  });
});
