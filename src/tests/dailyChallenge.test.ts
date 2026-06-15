import { describe, expect, it } from 'vitest';
import { dailyConfig, dailySeed } from '@/game/dailyChallenge';
import { generateProblem } from '@/game/problemGenerator';
import { DIFFICULTY_ORDER } from '@/game/difficulty';
import { mulberry32 } from '@/utils/random';

describe('daily challenge', () => {
  it('produces a stable seed for a given date', () => {
    expect(dailySeed('2026-06-15')).toBe(dailySeed('2026-06-15'));
  });

  it('differs across dates', () => {
    expect(dailySeed('2026-06-15')).not.toBe(dailySeed('2026-06-16'));
  });

  it('config is identical for the same date (same for every user)', () => {
    expect(dailyConfig('2026-06-15')).toEqual(dailyConfig('2026-06-15'));
  });

  it('config has a 60s duration, a valid difficulty, and operations', () => {
    const cfg = dailyConfig('2026-06-15');
    expect(cfg.durationSeconds).toBe(60);
    expect(DIFFICULTY_ORDER).toContain(cfg.difficulty);
    expect(cfg.operations.length).toBeGreaterThan(0);
  });

  it('the problem sequence is reproducible from the daily seed', () => {
    const cfg = dailyConfig('2026-06-15');

    const sequence = (seed: number) => {
      const rng = mulberry32(seed);
      return Array.from(
        { length: 10 },
        () =>
          generateProblem({
            difficulty: cfg.difficulty,
            enabledOperations: cfg.operations,
            rng,
          }).question,
      );
    };

    expect(sequence(dailySeed('2026-06-15'))).toEqual(
      sequence(dailySeed('2026-06-15')),
    );
  });
});
