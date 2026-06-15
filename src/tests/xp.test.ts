import { describe, expect, it } from 'vitest';
import {
  cumulativeXpForLevel,
  levelFromXp,
  levelInfo,
  xpForSession,
  xpToAdvance,
} from '@/game/xp';

describe('xpForSession', () => {
  it('scales with difficulty and adds a completion bonus', () => {
    expect(xpForSession({ score: 0 }, 'easy')).toBe(5);
    expect(xpForSession({ score: 20 }, 'easy')).toBe(25);
    // grandmaster ×3
    expect(xpForSession({ score: 20 }, 'grandmaster')).toBe(65);
  });

  it('is monotonic across difficulty for equal scores', () => {
    const order = ['easy', 'medium', 'hard', 'expert', 'master', 'grandmaster'] as const;
    const xps = order.map((d) => xpForSession({ score: 10 }, d));
    for (let i = 1; i < xps.length; i++) {
      expect(xps[i]!).toBeGreaterThanOrEqual(xps[i - 1]!);
    }
  });
});

describe('level thresholds', () => {
  it('cumulative XP follows the triangular formula', () => {
    expect(cumulativeXpForLevel(1)).toBe(0);
    expect(cumulativeXpForLevel(2)).toBe(100);
    expect(cumulativeXpForLevel(3)).toBe(300);
    expect(cumulativeXpForLevel(4)).toBe(600);
  });

  it('xpToAdvance grows per level', () => {
    expect(xpToAdvance(1)).toBe(100);
    expect(xpToAdvance(2)).toBe(200);
  });
});

describe('levelInfo / levelFromXp', () => {
  it('starts at level 1 with zero XP', () => {
    const info = levelInfo(0);
    expect(info.level).toBe(1);
    expect(info.xpIntoLevel).toBe(0);
    expect(info.xpForNext).toBe(100);
    expect(info.progress).toBe(0);
  });

  it('crosses level boundaries exactly', () => {
    expect(levelFromXp(99)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(299)).toBe(2);
    expect(levelFromXp(300)).toBe(3);
  });

  it('reports mid-level progress', () => {
    const info = levelInfo(150); // level 2, 50 into a 200 band
    expect(info.level).toBe(2);
    expect(info.xpIntoLevel).toBe(50);
    expect(info.xpForNext).toBe(200);
    expect(info.progress).toBeCloseTo(0.25);
  });

  it('never produces a level below 1 or negative progress', () => {
    const info = levelInfo(-50);
    expect(info.level).toBe(1);
    expect(info.progress).toBeGreaterThanOrEqual(0);
  });

  it('is non-decreasing as XP increases', () => {
    let prev = 1;
    for (let xp = 0; xp < 5000; xp += 37) {
      const lvl = levelFromXp(xp);
      expect(lvl).toBeGreaterThanOrEqual(prev);
      prev = lvl;
    }
  });
});
