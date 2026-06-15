import type { Difficulty, Operation } from '@/types';
import { isMultiStep } from '@/game/difficulty';
import { randomRng, type Rng } from '@/utils/random';

export const OPERATION_SYMBOL: Record<Operation, string> = {
  addition: '+',
  subtraction: '−',
  multiplication: '×',
  division: '÷',
};

/** ASCII operators used for evaluation. */
const ASCII: Record<Operation, string> = {
  addition: '+',
  subtraction: '-',
  multiplication: '*',
  division: '/',
};

/** Map an ASCII operator back to its display glyph. */
const DISPLAY: Record<string, string> = {
  '+': '+',
  '-': '−',
  '*': '×',
  '/': '÷',
};

export interface GeneratedProblem {
  question: string;
  answer: number;
  difficulty: Difficulty;
}

interface Pair {
  min: number;
  max: number;
}

interface SingleRanges {
  addition: [Pair, Pair];
  subtraction: [Pair, Pair];
  multiplication: [Pair, Pair];
  /** Division is built from divisor × quotient so the answer is integer. */
  division: { divisor: Pair; quotient: Pair };
}

// Per-difficulty operand ranges for the single-operation levels. Tuned so each
// step up feels meaningfully harder while staying mentally solvable.
const SINGLE: Record<
  Extract<Difficulty, 'easy' | 'medium' | 'hard' | 'expert'>,
  SingleRanges
> = {
  easy: {
    addition: [{ min: 1, max: 10 }, { min: 1, max: 10 }],
    subtraction: [{ min: 1, max: 10 }, { min: 1, max: 10 }],
    multiplication: [{ min: 1, max: 10 }, { min: 1, max: 10 }],
    division: { divisor: { min: 1, max: 10 }, quotient: { min: 1, max: 10 } },
  },
  medium: {
    addition: [{ min: 10, max: 99 }, { min: 10, max: 99 }],
    subtraction: [{ min: 10, max: 99 }, { min: 10, max: 99 }],
    multiplication: [{ min: 10, max: 30 }, { min: 2, max: 12 }],
    division: { divisor: { min: 2, max: 15 }, quotient: { min: 2, max: 30 } },
  },
  hard: {
    addition: [{ min: 100, max: 999 }, { min: 100, max: 999 }],
    subtraction: [{ min: 100, max: 999 }, { min: 100, max: 999 }],
    multiplication: [{ min: 12, max: 99 }, { min: 12, max: 99 }],
    division: { divisor: { min: 11, max: 50 }, quotient: { min: 11, max: 99 } },
  },
  expert: {
    addition: [{ min: 1000, max: 9999 }, { min: 1000, max: 9999 }],
    subtraction: [{ min: 1000, max: 9999 }, { min: 1000, max: 9999 }],
    multiplication: [{ min: 100, max: 999 }, { min: 11, max: 99 }],
    division: { divisor: { min: 11, max: 99 }, quotient: { min: 25, max: 500 } },
  },
};

function single(
  op: Operation,
  difficulty: keyof typeof SINGLE,
  rng: Rng,
): { question: string; answer: number } {
  const r = SINGLE[difficulty];
  const sym = OPERATION_SYMBOL[op];

  switch (op) {
    case 'addition': {
      const a = rng.int(r.addition[0].min, r.addition[0].max);
      const b = rng.int(r.addition[1].min, r.addition[1].max);
      return { question: `${a} ${sym} ${b}`, answer: a + b };
    }
    case 'subtraction': {
      const a = rng.int(r.subtraction[0].min, r.subtraction[0].max);
      const b = rng.int(r.subtraction[1].min, r.subtraction[1].max);
      const hi = Math.max(a, b);
      const lo = Math.min(a, b);
      return { question: `${hi} ${sym} ${lo}`, answer: hi - lo };
    }
    case 'multiplication': {
      const a = rng.int(r.multiplication[0].min, r.multiplication[0].max);
      const b = rng.int(r.multiplication[1].min, r.multiplication[1].max);
      return { question: `${a} ${sym} ${b}`, answer: a * b };
    }
    case 'division': {
      const divisor = rng.int(r.division.divisor.min, r.division.divisor.max);
      const quotient = rng.int(
        r.division.quotient.min,
        r.division.quotient.max,
      );
      const dividend = divisor * quotient;
      return { question: `${dividend} ${sym} ${divisor}`, answer: quotient };
    }
  }
}

/**
 * Evaluate an ASCII arithmetic expression (+ - * / and parentheses) with
 * standard precedence. Returns the integer result, or null if the expression
 * is malformed, divides by zero, or any division is non-integer.
 */
export function evaluateInteger(expr: string): number | null {
  const tokens = expr.match(/\d+|[()+\-*/]/g);
  if (!tokens) return null;

  const prec: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 };
  const output: string[] = [];
  const stack: string[] = [];

  for (const t of tokens) {
    if (/^\d+$/.test(t)) {
      output.push(t);
    } else if (t === '(') {
      stack.push(t);
    } else if (t === ')') {
      while (stack.length && stack[stack.length - 1] !== '(') {
        output.push(stack.pop() as string);
      }
      if (!stack.length) return null; // unbalanced
      stack.pop();
    } else {
      while (
        stack.length &&
        stack[stack.length - 1] !== '(' &&
        (prec[stack[stack.length - 1] as string] ?? 0) >= (prec[t] ?? 0)
      ) {
        output.push(stack.pop() as string);
      }
      stack.push(t);
    }
  }
  while (stack.length) {
    const op = stack.pop() as string;
    if (op === '(') return null; // unbalanced
    output.push(op);
  }

  const eval_: number[] = [];
  for (const t of output) {
    if (/^\d+$/.test(t)) {
      eval_.push(Number(t));
      continue;
    }
    const b = eval_.pop();
    const a = eval_.pop();
    if (a === undefined || b === undefined) return null;
    switch (t) {
      case '+':
        eval_.push(a + b);
        break;
      case '-':
        eval_.push(a - b);
        break;
      case '*':
        eval_.push(a * b);
        break;
      case '/':
        if (b === 0 || a % b !== 0) return null; // no div-by-zero / fractions
        eval_.push(a / b);
        break;
      default:
        return null;
    }
  }
  return eval_.length === 1 ? (eval_[0] as number) : null;
}

// Known-good fallbacks guarantee the multi-step generator always terminates.
const FALLBACK: Record<'master' | 'grandmaster', GeneratedProblem[]> = {
  master: [
    { question: '12 + 8 × 3', answer: 36, difficulty: 'master' },
    { question: '(25 − 7) × 4', answer: 72, difficulty: 'master' },
    { question: '80 ÷ 5 + 17', answer: 33, difficulty: 'master' },
    { question: '150 − 20 × 3', answer: 90, difficulty: 'master' },
  ],
  grandmaster: [
    { question: '(120 ÷ 6 + 15) × 3', answer: 105, difficulty: 'grandmaster' },
    { question: '450 − 12 × 8 + 17', answer: 371, difficulty: 'grandmaster' },
    { question: '(84 + 36) ÷ 4 × 5', answer: 150, difficulty: 'grandmaster' },
    {
      question: '2500 − (75 × 12) + 64',
      answer: 1664,
      difficulty: 'grandmaster',
    },
  ],
};

function multiStep(
  difficulty: 'master' | 'grandmaster',
  ops: Operation[],
  rng: Rng,
): { question: string; answer: number } {
  const gm = difficulty === 'grandmaster';
  const minOps = gm ? 3 : 2;
  const maxOps = gm ? 5 : 3;
  const cap = gm ? 100000 : 20000;

  for (let attempt = 0; attempt < 400; attempt++) {
    const n = rng.int(minOps, maxOps);
    const opSeq = Array.from({ length: n }, () => ASCII[rng.pick(ops)]);

    const operands: number[] = [];
    for (let i = 0; i <= n; i++) {
      const leftOp = i > 0 ? opSeq[i - 1] : null;
      const rightOp = i < n ? opSeq[i] : null;
      // Operands next to × or ÷ stay small so products/quotients stay sane.
      const nearMulDiv =
        leftOp === '*' || leftOp === '/' || rightOp === '*' || rightOp === '/';
      let max: number;
      if (nearMulDiv) max = gm ? 12 : 9;
      else if (gm && rng.next() < 0.35) max = 300; // occasional large term
      else max = gm ? 40 : 20;
      operands.push(rng.int(2, max));
    }

    let tk: string[] = [];
    for (let i = 0; i <= n; i++) {
      tk.push(String(operands[i]));
      if (i < n) tk.push(opSeq[i] as string);
    }

    // Optionally wrap a contiguous sub-expression in parentheses.
    const wantParen = (gm ? 0.7 : 0.45) > rng.next();
    if (wantParen && n >= 2) {
      let s = rng.int(0, n - 1);
      let e = rng.int(s + 1, n);
      if (s === 0 && e === n) {
        if (rng.next() < 0.5) s = 1;
        else e = n - 1;
      }
      if (s < e) {
        const start = 2 * s;
        const end = 2 * e;
        tk = [
          ...tk.slice(0, start),
          '(',
          ...tk.slice(start, end + 1),
          ')',
          ...tk.slice(end + 1),
        ];
      }
    }

    const ascii = tk.join(' ');
    const value = evaluateInteger(ascii);
    if (value === null || value < 0 || value > cap) continue;

    const display = tk.map((t) => DISPLAY[t] ?? t).join(' ');
    return { question: display, answer: value };
  }

  const pool = FALLBACK[difficulty];
  const fb = pool[rng.int(0, pool.length - 1)] as GeneratedProblem;
  return { question: fb.question, answer: fb.answer };
}

export interface GenerateInput {
  difficulty: Difficulty;
  enabledOperations: Operation[];
  /** Optional RNG for deterministic generation (e.g. daily challenge). */
  rng?: Rng;
}

/**
 * Generate a single problem for the given difficulty and enabled operations.
 * All generation logic lives here, isolated from UI and state.
 */
export function generateProblem(input: GenerateInput): GeneratedProblem {
  const rng = input.rng ?? randomRng();
  const ops: Operation[] =
    input.enabledOperations.length > 0
      ? input.enabledOperations
      : ['addition'];

  if (isMultiStep(input.difficulty)) {
    const { question, answer } = multiStep(
      input.difficulty as 'master' | 'grandmaster',
      ops,
      rng,
    );
    return { question, answer, difficulty: input.difficulty };
  }

  const op = rng.pick(ops);
  const { question, answer } = single(
    op,
    input.difficulty as keyof typeof SINGLE,
    rng,
  );
  return { question, answer, difficulty: input.difficulty };
}
