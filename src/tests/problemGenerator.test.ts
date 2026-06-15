import { describe, expect, it } from 'vitest';
import {
  evaluateInteger,
  generateProblem,
} from '@/game/problemGenerator';
import { isMultiStep } from '@/game/difficulty';
import type { Difficulty, Operation } from '@/types';
import { mulberry32 } from '@/utils/random';

const ALL_OPS: Operation[] = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
];

/** Extract integer literals from a (display) question string. */
const numbersIn = (q: string): number[] =>
  (q.match(/\d+/g) ?? []).map(Number);

const gen = (
  difficulty: Difficulty,
  enabledOperations: Operation[],
  seed: number,
) =>
  generateProblem({
    difficulty,
    enabledOperations,
    rng: mulberry32(seed),
  });

describe('evaluateInteger', () => {
  it('respects order of operations', () => {
    expect(evaluateInteger('12 + 8 * 3')).toBe(36);
    expect(evaluateInteger('150 - 20 * 3')).toBe(90);
    expect(evaluateInteger('80 / 5 + 17')).toBe(33);
  });

  it('respects parentheses', () => {
    expect(evaluateInteger('(25 - 7) * 4')).toBe(72);
    expect(evaluateInteger('(120 / 6 + 15) * 3')).toBe(105);
    expect(evaluateInteger('(84 + 36) / 4 * 5')).toBe(150);
    expect(evaluateInteger('2500 - (75 * 12) + 64')).toBe(1664);
  });

  it('returns null for non-integer division', () => {
    expect(evaluateInteger('7 / 2')).toBeNull();
    expect(evaluateInteger('10 / 3 + 1')).toBeNull();
  });

  it('returns null for divide-by-zero', () => {
    expect(evaluateInteger('5 / 0')).toBeNull();
  });

  it('returns null for unbalanced parentheses', () => {
    expect(evaluateInteger('(1 + 2')).toBeNull();
    expect(evaluateInteger('1 + 2)')).toBeNull();
  });
});

describe('generateProblem — return shape', () => {
  it('returns question, integer answer, and the difficulty', () => {
    const p = gen('easy', ALL_OPS, 1);
    expect(typeof p.question).toBe('string');
    expect(p.question.length).toBeGreaterThan(0);
    expect(Number.isInteger(p.answer)).toBe(true);
    expect(p.difficulty).toBe('easy');
  });

  it('the stated answer always matches evaluating the question', () => {
    const levels: Difficulty[] = [
      'easy',
      'medium',
      'hard',
      'expert',
      'master',
      'grandmaster',
    ];
    for (const d of levels) {
      for (let s = 0; s < 150; s++) {
        const p = gen(d, ALL_OPS, s * 13 + 1);
        // Re-encode display glyphs to ASCII for evaluation.
        const ascii = p.question
          .replace(/×/g, '*')
          .replace(/÷/g, '/')
          .replace(/−/g, '-');
        expect(evaluateInteger(ascii)).toBe(p.answer);
      }
    }
  });
});

describe('single-operation difficulties — ranges', () => {
  const within = (q: string, lo: number, hi: number) => {
    for (const n of numbersIn(q)) {
      expect(n).toBeGreaterThanOrEqual(lo);
      expect(n).toBeLessThanOrEqual(hi);
    }
  };

  it('easy keeps every operand in 1–10 (division by construction excepted)', () => {
    for (let s = 0; s < 200; s++) {
      const p = gen('easy', ['addition', 'subtraction', 'multiplication'], s);
      within(p.question, 1, 10);
    }
  });

  it('easy addition answers are never negative', () => {
    for (let s = 0; s < 200; s++) {
      const p = gen('easy', ['subtraction'], s);
      expect(p.answer).toBeGreaterThanOrEqual(0);
    }
  });

  it('medium addition operands sit in 10–99', () => {
    for (let s = 0; s < 200; s++) {
      const p = gen('medium', ['addition'], s);
      within(p.question, 10, 99);
    }
  });

  it('hard addition operands sit in 100–999', () => {
    for (let s = 0; s < 200; s++) {
      const p = gen('hard', ['addition'], s);
      within(p.question, 100, 999);
    }
  });

  it('expert addition operands sit in 1000–9999', () => {
    for (let s = 0; s < 200; s++) {
      const p = gen('expert', ['addition'], s);
      within(p.question, 1000, 9999);
    }
  });

  it('single-op levels contain exactly one operator', () => {
    for (const d of ['easy', 'medium', 'hard', 'expert'] as Difficulty[]) {
      for (let s = 0; s < 50; s++) {
        const p = gen(d, ALL_OPS, s);
        const operators = p.question.match(/[+−×÷]/g) ?? [];
        expect(operators).toHaveLength(1);
        expect(isMultiStep(d)).toBe(false);
      }
    }
  });
});

describe('division is always integer with no divide-by-zero', () => {
  it('across single-op levels', () => {
    for (const d of ['easy', 'medium', 'hard', 'expert'] as Difficulty[]) {
      for (let s = 0; s < 300; s++) {
        const p = gen(d, ['division'], s);
        const [dividend, divisor] = numbersIn(p.question);
        expect(divisor).not.toBe(0);
        expect(dividend! % divisor!).toBe(0);
        expect(p.answer).toBe(dividend! / divisor!);
      }
    }
  });
});

describe('multi-step difficulties', () => {
  it('master produces 2–3 operators', () => {
    for (let s = 0; s < 300; s++) {
      const p = gen('master', ALL_OPS, s);
      const operators = p.question.match(/[+−×÷]/g) ?? [];
      expect(operators.length).toBeGreaterThanOrEqual(2);
      expect(operators.length).toBeLessThanOrEqual(3);
    }
  });

  it('grandmaster produces 3–5 operators', () => {
    for (let s = 0; s < 300; s++) {
      const p = gen('grandmaster', ALL_OPS, s);
      const operators = p.question.match(/[+−×÷]/g) ?? [];
      expect(operators.length).toBeGreaterThanOrEqual(3);
      expect(operators.length).toBeLessThanOrEqual(5);
    }
  });

  it('multi-step answers are non-negative integers within bounds', () => {
    for (const d of ['master', 'grandmaster'] as Difficulty[]) {
      for (let s = 0; s < 300; s++) {
        const p = gen(d, ALL_OPS, s);
        expect(Number.isInteger(p.answer)).toBe(true);
        expect(p.answer).toBeGreaterThanOrEqual(0);
        expect(p.answer).toBeLessThanOrEqual(100000);
      }
    }
  });

  it('produces balanced parentheses when present', () => {
    for (let s = 0; s < 300; s++) {
      const p = gen('grandmaster', ALL_OPS, s);
      const open = (p.question.match(/\(/g) ?? []).length;
      const close = (p.question.match(/\)/g) ?? []).length;
      expect(open).toBe(close);
    }
  });
});

describe('operation gating', () => {
  it('falls back to addition when nothing is enabled', () => {
    const p = generateProblem({
      difficulty: 'easy',
      enabledOperations: [],
      rng: mulberry32(1),
    });
    expect(p.question).toMatch(/\+/);
  });

  it('single-op levels only use enabled operations', () => {
    const enabled: Operation[] = ['multiplication', 'division'];
    for (let s = 0; s < 200; s++) {
      const p = gen('hard', enabled, s);
      expect(/[+−]/.test(p.question)).toBe(false);
      expect(/[×÷]/.test(p.question)).toBe(true);
    }
  });
});

describe('determinism', () => {
  it('same seed yields the same problem', () => {
    expect(gen('grandmaster', ALL_OPS, 42)).toEqual(
      gen('grandmaster', ALL_OPS, 42),
    );
    expect(gen('hard', ALL_OPS, 7)).toEqual(gen('hard', ALL_OPS, 7));
  });
});
