import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENTS,
  achievementById,
  evaluateAchievements,
  newlyEarned,
  type AchievementContext,
} from '@/game/achievements';
import { emptyStatistics } from '@/stats/statistics';

const ctx = (over: Partial<AchievementContext>): AchievementContext => ({
  level: 1,
  dayStreak: 0,
  stats: emptyStatistics(),
  ...over,
});

describe('achievement catalog', () => {
  it('exposes a non-empty, uniquely-keyed catalog', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThan(0);
    const ids = new Set(ACHIEVEMENTS.map((a) => a.id));
    expect(ids.size).toBe(ACHIEVEMENTS.length);
  });

  it('looks up by id', () => {
    expect(achievementById('first_session')?.name).toBe('First Steps');
    expect(achievementById('nope')).toBeUndefined();
  });
});

describe('evaluateAchievements', () => {
  it('awards nothing for an empty profile', () => {
    expect(evaluateAchievements(ctx({}))).toEqual([]);
  });

  it('awards first_session after one session', () => {
    const stats = { ...emptyStatistics(), totalSessions: 1 };
    expect(evaluateAchievements(ctx({ stats }))).toContain('first_session');
  });

  it('awards score milestones from best score', () => {
    const stats = { ...emptyStatistics(), totalSessions: 1, bestScore: 55 };
    const earned = evaluateAchievements(ctx({ stats }));
    expect(earned).toContain('score_25');
    expect(earned).toContain('score_50');
    expect(earned).not.toContain('score_100');
  });

  it('awards streak and day-streak achievements', () => {
    const stats = { ...emptyStatistics(), totalSessions: 1, bestStreak: 25 };
    const earned = evaluateAchievements(ctx({ stats, dayStreak: 7 }));
    expect(earned).toContain('streak_10');
    expect(earned).toContain('streak_25');
    expect(earned).toContain('daily_3');
    expect(earned).toContain('daily_7');
  });

  it('awards level milestone', () => {
    expect(evaluateAchievements(ctx({ level: 5 }))).toContain('level_5');
    expect(evaluateAchievements(ctx({ level: 4 }))).not.toContain('level_5');
  });
});

describe('newlyEarned', () => {
  it('returns only achievements not already held', () => {
    const stats = { ...emptyStatistics(), totalSessions: 10, bestScore: 30 };
    const all = evaluateAchievements(ctx({ stats }));
    expect(all).toContain('first_session');
    expect(all).toContain('sessions_10');

    const fresh = newlyEarned(['first_session'], ctx({ stats }));
    expect(fresh).not.toContain('first_session');
    expect(fresh).toContain('sessions_10');
  });
});
