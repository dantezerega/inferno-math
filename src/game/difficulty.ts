import type { Difficulty } from '@/types';

/** Difficulty levels in ascending order of challenge. */
export const DIFFICULTY_ORDER: Difficulty[] = [
  'easy',
  'medium',
  'hard',
  'expert',
  'master',
  'grandmaster',
];

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  expert: 'Expert',
  master: 'Master',
  grandmaster: 'Grandmaster',
};

/** Short hint shown next to each difficulty in Settings. */
export const DIFFICULTY_HINT: Record<Difficulty, string> = {
  easy: '1–10 · single op',
  medium: '10–100 · single op',
  hard: '100–1000 · single op',
  expert: '1k–10k · single op',
  master: 'Multi-step · 2–3 ops',
  grandmaster: 'Multi-step · 3–5 ops',
};

/** Levels that produce multi-step expressions rather than a single operation. */
const MULTI_STEP: ReadonlySet<Difficulty> = new Set<Difficulty>([
  'master',
  'grandmaster',
]);

export function isMultiStep(d: Difficulty): boolean {
  return MULTI_STEP.has(d);
}

export function clampLevel(index: number): Difficulty {
  const i = Math.max(0, Math.min(DIFFICULTY_ORDER.length - 1, index));
  return DIFFICULTY_ORDER[i] as Difficulty;
}

/**
 * Adaptive difficulty: bump the level up after strong performance, down after
 * repeated mistakes, otherwise hold. `accuracyPct` is 0..100. Pure.
 */
export function adjustDifficulty(
  current: Difficulty,
  accuracyPct: number,
): Difficulty {
  const idx = DIFFICULTY_ORDER.indexOf(current);
  if (idx < 0) return current;
  if (accuracyPct > 90) return clampLevel(idx + 1);
  if (accuracyPct < 60) return clampLevel(idx - 1);
  return current;
}
