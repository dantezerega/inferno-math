import type { Difficulty, GameConfig, Operation } from '@/types';
import { dateKey } from '@/utils/date';
import { hashSeed, mulberry32 } from '@/utils/random';

/**
 * The daily challenge is fully determined by the calendar date, so every user
 * gets the same config and the same problem sequence on a given day.
 */
const DAILY_DURATION = 60;

const ALL_OPS: Operation[] = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
];

// Pool excludes grandmaster to keep the shared daily run broadly fair.
const DAILY_DIFFICULTIES: Difficulty[] = [
  'easy',
  'medium',
  'hard',
  'expert',
  'master',
];

export function dailySeed(key: string = dateKey()): number {
  return hashSeed(`inferno-daily::${key}`);
}

/** Deterministic config for the day's challenge. */
export function dailyConfig(key: string = dateKey()): GameConfig {
  const rng = mulberry32(dailySeed(key));

  // Rotate operation sets deterministically.
  const opSets: Operation[][] = [
    ['addition', 'subtraction'],
    ['multiplication', 'division'],
    ALL_OPS,
    ['addition', 'multiplication'],
  ];
  const operations = opSets[rng.int(0, opSets.length - 1)] ?? ALL_OPS;
  const difficulty =
    DAILY_DIFFICULTIES[rng.int(0, DAILY_DIFFICULTIES.length - 1)] ?? 'medium';

  return {
    operations,
    difficulty,
    durationSeconds: DAILY_DURATION,
  };
}
