import type { Difficulty, SessionResult } from '@/types';

/**
 * XP & leveling — pure functions, no I/O. XP is awarded per completed session,
 * scaled by difficulty so harder modes progress faster.
 */

const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  easy: 1,
  medium: 1.25,
  hard: 1.6,
  expert: 2,
  master: 2.5,
  grandmaster: 3,
};

/** XP earned for a single completed session. */
export function xpForSession(
  result: Pick<SessionResult, 'score'>,
  difficulty: Difficulty,
): number {
  const multiplier = DIFFICULTY_MULTIPLIER[difficulty] ?? 1;
  const COMPLETION_BONUS = 5;
  return Math.round(result.score * multiplier) + COMPLETION_BONUS;
}

/** Incremental XP needed to advance from `level` to `level + 1`. */
export function xpToAdvance(level: number): number {
  return Math.max(1, level) * 100;
}

/** Total cumulative XP required to *reach* a given level (level 1 = 0 XP). */
export function cumulativeXpForLevel(level: number): number {
  const l = Math.max(1, level);
  // sum_{k=1}^{l-1} k*100 = 100 * (l-1)*l/2
  return (100 * (l - 1) * l) / 2;
}

export interface LevelInfo {
  level: number;
  /** XP accumulated within the current level. */
  xpIntoLevel: number;
  /** XP required to complete the current level. */
  xpForNext: number;
  /** Progress through the current level, 0..1. */
  progress: number;
}

/** Resolve a total XP value into level + progress. */
export function levelInfo(xp: number): LevelInfo {
  const safeXp = Math.max(0, Math.floor(xp));
  let level = 1;
  // XP is bounded in practice; linear scan is plenty and avoids float drift.
  while (safeXp >= cumulativeXpForLevel(level + 1)) {
    level++;
  }
  const base = cumulativeXpForLevel(level);
  const xpForNext = xpToAdvance(level);
  const xpIntoLevel = safeXp - base;
  return {
    level,
    xpIntoLevel,
    xpForNext,
    progress: xpForNext > 0 ? Math.min(1, xpIntoLevel / xpForNext) : 0,
  };
}

/** Convenience: just the level number for a given XP total. */
export function levelFromXp(xp: number): number {
  return levelInfo(xp).level;
}
