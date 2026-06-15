import type { Statistics } from '@/types';
import { dateKey } from '@/utils/date';

/**
 * Daily streak logic — pure. A streak counts consecutive calendar days with at
 * least one completed session. Missing a day breaks it.
 */

function dayDiff(a: string, b: string): number {
  // Whole-day difference between two ISO date keys (a - b).
  const da = new Date(`${a}T00:00:00`).getTime();
  const db = new Date(`${b}T00:00:00`).getTime();
  return Math.round((da - db) / 86_400_000);
}

export interface StreakState {
  currentStreak: number;
  lastPlayedDate: string | null;
}

/**
 * Apply a play event on `today` to a prior streak state. Used to advance the
 * cloud-synced streak after a session.
 *
 * - Same day as last play → unchanged.
 * - Exactly the next day → +1.
 * - Any larger gap (or first ever play) → reset to 1.
 */
export function advanceStreak(
  prev: StreakState,
  today: string = dateKey(),
): StreakState {
  if (!prev.lastPlayedDate) {
    return { currentStreak: 1, lastPlayedDate: today };
  }
  const diff = dayDiff(today, prev.lastPlayedDate);
  if (diff <= 0) {
    // Same day (or clock skew) — already counted.
    return { currentStreak: Math.max(1, prev.currentStreak), lastPlayedDate: today };
  }
  if (diff === 1) {
    return { currentStreak: prev.currentStreak + 1, lastPlayedDate: today };
  }
  return { currentStreak: 1, lastPlayedDate: today };
}

/**
 * Compute the *current* streak from a set of active day keys (e.g. the local
 * Statistics.daily map). The streak is the run of consecutive days ending at
 * today or yesterday; if the most recent activity is older, it's 0.
 */
export function currentStreakFromDays(
  activeDays: Iterable<string>,
  today: string = dateKey(),
): number {
  const set = new Set(activeDays);
  if (set.size === 0) return 0;

  // Anchor on today if active, else yesterday, else streak is broken.
  let anchorOffset: number | null = null;
  if (set.has(today)) anchorOffset = 0;
  else {
    const yesterday = shiftDay(today, -1);
    if (set.has(yesterday)) anchorOffset = -1;
  }
  if (anchorOffset === null) return 0;

  let streak = 0;
  let cursor = shiftDay(today, anchorOffset);
  while (set.has(cursor)) {
    streak++;
    cursor = shiftDay(cursor, -1);
  }
  return streak;
}

/** Current streak derived from local Statistics. */
export function currentStreakFromStats(
  stats: Statistics,
  today: string = dateKey(),
): number {
  const days = Object.entries(stats.daily)
    .filter(([, a]) => a.sessions > 0)
    .map(([k]) => k);
  return currentStreakFromDays(days, today);
}

function shiftDay(key: string, delta: number): string {
  const d = new Date(`${key}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return dateKey(d);
}
