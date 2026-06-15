import { describe, expect, it } from 'vitest';
import {
  advanceStreak,
  currentStreakFromDays,
  currentStreakFromStats,
} from '@/game/streak';
import { emptyStatistics } from '@/stats/statistics';

describe('advanceStreak', () => {
  it('starts at 1 on the first ever play', () => {
    expect(advanceStreak({ currentStreak: 0, lastPlayedDate: null }, '2026-06-15')).toEqual(
      { currentStreak: 1, lastPlayedDate: '2026-06-15' },
    );
  });

  it('does not double-count the same day', () => {
    expect(
      advanceStreak({ currentStreak: 4, lastPlayedDate: '2026-06-15' }, '2026-06-15'),
    ).toEqual({ currentStreak: 4, lastPlayedDate: '2026-06-15' });
  });

  it('increments on consecutive days', () => {
    expect(
      advanceStreak({ currentStreak: 4, lastPlayedDate: '2026-06-14' }, '2026-06-15'),
    ).toEqual({ currentStreak: 5, lastPlayedDate: '2026-06-15' });
  });

  it('resets after a missed day', () => {
    expect(
      advanceStreak({ currentStreak: 9, lastPlayedDate: '2026-06-12' }, '2026-06-15'),
    ).toEqual({ currentStreak: 1, lastPlayedDate: '2026-06-15' });
  });

  it('handles month boundaries', () => {
    expect(
      advanceStreak({ currentStreak: 2, lastPlayedDate: '2026-05-31' }, '2026-06-01'),
    ).toEqual({ currentStreak: 3, lastPlayedDate: '2026-06-01' });
  });
});

describe('currentStreakFromDays', () => {
  const today = '2026-06-15';

  it('is zero with no activity', () => {
    expect(currentStreakFromDays([], today)).toBe(0);
  });

  it('counts a run ending today', () => {
    expect(
      currentStreakFromDays(['2026-06-13', '2026-06-14', '2026-06-15'], today),
    ).toBe(3);
  });

  it('still counts a run ending yesterday', () => {
    expect(currentStreakFromDays(['2026-06-13', '2026-06-14'], today)).toBe(2);
  });

  it('is broken when the latest day is older than yesterday', () => {
    expect(currentStreakFromDays(['2026-06-10', '2026-06-11'], today)).toBe(0);
  });

  it('stops at the first gap', () => {
    expect(
      currentStreakFromDays(['2026-06-11', '2026-06-14', '2026-06-15'], today),
    ).toBe(2);
  });
});

describe('currentStreakFromStats', () => {
  it('derives the streak from daily activity', () => {
    const stats = emptyStatistics();
    for (const date of ['2026-06-14', '2026-06-15']) {
      stats.daily[date] = { date, sessions: 1, bestScore: 5, totalCorrect: 5 };
    }
    expect(currentStreakFromStats(stats, '2026-06-15')).toBe(2);
  });

  it('ignores days with no sessions', () => {
    const stats = emptyStatistics();
    stats.daily['2026-06-15'] = {
      date: '2026-06-15',
      sessions: 0,
      bestScore: 0,
      totalCorrect: 0,
    };
    expect(currentStreakFromStats(stats, '2026-06-15')).toBe(0);
  });
});
