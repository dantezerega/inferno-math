import { describe, expect, it } from 'vitest';
import { statisticsFromCloud } from '@/services/cloudSync';
import type { DailyProgressRow, UserStatsRow } from '@/types/db';

const statsRow: UserStatsRow = {
  user_id: 'u1',
  level: 3,
  xp: 420,
  best_score: 48,
  best_streak: 12,
  current_streak: 4,
  last_played_date: '2026-06-15',
  total_sessions: 20,
  total_questions: 500,
  total_correct: 460,
  total_incorrect: 40,
  total_practice_seconds: 1200,
  updated_at: '2026-06-15T00:00:00Z',
};

describe('statisticsFromCloud', () => {
  it('maps cumulative totals from the stats row', () => {
    const stats = statisticsFromCloud(statsRow, []);
    expect(stats.totalSessions).toBe(20);
    expect(stats.totalCorrect).toBe(460);
    expect(stats.totalIncorrect).toBe(40);
    expect(stats.bestScore).toBe(48);
    expect(stats.bestStreak).toBe(12);
    expect(stats.totalPracticeSeconds).toBe(1200);
  });

  it('reconstructs the daily activity map for the heatmap', () => {
    const daily: DailyProgressRow[] = [
      { user_id: 'u1', date: '2026-06-14', score: 30, questions: 40 },
      { user_id: 'u1', date: '2026-06-15', score: 48, questions: 55 },
    ];
    const stats = statisticsFromCloud(statsRow, daily);
    expect(Object.keys(stats.daily)).toHaveLength(2);
    expect(stats.daily['2026-06-15']).toEqual({
      date: '2026-06-15',
      sessions: 1,
      bestScore: 48,
      totalCorrect: 55,
    });
  });

  it('returns empty stats when there is no cloud row', () => {
    const stats = statisticsFromCloud(null, []);
    expect(stats.totalSessions).toBe(0);
    expect(Object.keys(stats.daily)).toHaveLength(0);
  });
});
