import type { SessionResult, Statistics } from '@/types';
import { dateKey } from '@/utils/date';

export const emptyStatistics = (): Statistics => ({
  totalSessions: 0,
  totalCorrect: 0,
  totalIncorrect: 0,
  bestScore: 0,
  totalScore: 0,
  bestStreak: 0,
  totalPracticeSeconds: 0,
  daily: {},
  dailyChallengeBest: {},
});

/** Fold a finished session into the cumulative statistics (pure). */
export function recordSession(
  stats: Statistics,
  result: SessionResult,
): Statistics {
  const key = dateKey(new Date(result.endedAt));
  const existing = stats.daily[key] ?? {
    date: key,
    sessions: 0,
    bestScore: 0,
    totalCorrect: 0,
  };

  const next: Statistics = {
    totalSessions: stats.totalSessions + 1,
    totalCorrect: stats.totalCorrect + result.correct,
    totalIncorrect: stats.totalIncorrect + result.incorrect,
    bestScore: Math.max(stats.bestScore, result.score),
    totalScore: stats.totalScore + result.score,
    bestStreak: Math.max(stats.bestStreak, result.bestStreak),
    totalPracticeSeconds: stats.totalPracticeSeconds + result.durationSeconds,
    daily: {
      ...stats.daily,
      [key]: {
        date: key,
        sessions: existing.sessions + 1,
        bestScore: Math.max(existing.bestScore, result.score),
        totalCorrect: existing.totalCorrect + result.correct,
      },
    },
    dailyChallengeBest: { ...stats.dailyChallengeBest },
  };

  if (result.daily) {
    next.dailyChallengeBest[key] = Math.max(
      stats.dailyChallengeBest[key] ?? 0,
      result.score,
    );
  }

  return next;
}

export function averageScore(stats: Statistics): number {
  if (stats.totalSessions === 0) return 0;
  return stats.totalScore / stats.totalSessions;
}

export function averageAccuracy(stats: Statistics): number {
  const total = stats.totalCorrect + stats.totalIncorrect;
  if (total === 0) return 0;
  return (stats.totalCorrect / total) * 100;
}

/** Whether a finished session set a new all-time best score. */
export function isNewBest(stats: Statistics, result: SessionResult): boolean {
  return result.score > stats.bestScore;
}

export interface HeatmapCell {
  date: string;
  sessions: number;
  totalCorrect: number;
  bestScore: number;
}

/**
 * Build a contiguous list of day cells for the trailing `days` window,
 * filling gaps with empty activity. Ordered oldest → newest.
 */
export function buildHeatmap(
  stats: Statistics,
  days = 119,
  today: Date = new Date(),
): HeatmapCell[] {
  const cells: HeatmapCell[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = dateKey(d);
    const a = stats.daily[key];
    cells.push({
      date: key,
      sessions: a?.sessions ?? 0,
      totalCorrect: a?.totalCorrect ?? 0,
      bestScore: a?.bestScore ?? 0,
    });
  }
  return cells;
}

/** Map a day's correct-answer count to a 0..4 intensity bucket. */
export function intensity(totalCorrect: number): 0 | 1 | 2 | 3 | 4 {
  if (totalCorrect <= 0) return 0;
  if (totalCorrect < 20) return 1;
  if (totalCorrect < 50) return 2;
  if (totalCorrect < 100) return 3;
  return 4;
}

/** Last 14 days of best score, oldest → newest, for the trend chart. */
export function scoreTrend(
  stats: Statistics,
  days = 14,
  today: Date = new Date(),
): { date: string; score: number }[] {
  const out: { date: string; score: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = dateKey(d);
    out.push({ date: key, score: stats.daily[key]?.bestScore ?? 0 });
  }
  return out;
}
