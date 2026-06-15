import { create } from 'zustand';
import type {
  GameConfig,
  GamePhase,
  Problem,
  SessionResult,
} from '@/types';
import {
  applyCorrect,
  applyIncorrect,
  initialScoreState,
  isCorrect,
  type ScoreState,
} from '@/game/scoring';
import { generateProblem } from '@/game/problemGenerator';
import { dailySeed } from '@/game/dailyChallenge';
import { mulberry32, randomRng, type Rng } from '@/utils/random';

export type SubmitOutcome = 'correct' | 'incorrect' | 'empty';

/**
 * Produce the next problem for the session, attaching a stable id and avoiding
 * an exact repeat of the previous prompt.
 */
function nextProblem(
  config: GameConfig,
  rng: Rng,
  id: number,
  previous: Problem | null,
): Problem {
  let gen = generateProblem({
    difficulty: config.difficulty,
    enabledOperations: config.operations,
    rng,
  });
  let attempts = 0;
  while (previous && gen.question === previous.question && attempts < 8) {
    gen = generateProblem({
      difficulty: config.difficulty,
      enabledOperations: config.operations,
      rng,
    });
    attempts++;
  }
  return { id, question: gen.question, answer: gen.answer, difficulty: gen.difficulty };
}

interface GameStore {
  phase: GamePhase;
  config: GameConfig | null;
  daily: boolean;
  problem: Problem | null;
  input: string;
  score: ScoreState;
  /** Epoch ms when the timer expires. */
  endTimeMs: number;
  startTimeMs: number;
  lastResult: SessionResult | null;

  start: (config: GameConfig, daily?: boolean) => void;
  setInput: (value: string) => void;
  submit: () => SubmitOutcome;
  finish: () => SessionResult | null;
  reset: () => void;
}

// RNG + id counter live outside React state — they never need to trigger
// re-renders and must not be serialized.
let rng: Rng = randomRng();
let nextId = 1;

export const useGame = create<GameStore>((set, get) => ({
  phase: 'idle',
  config: null,
  daily: false,
  problem: null,
  input: '',
  score: initialScoreState,
  endTimeMs: 0,
  startTimeMs: 0,
  lastResult: null,

  start: (config, daily = false) => {
    rng = daily ? mulberry32(dailySeed()) : randomRng();
    nextId = 1;
    const problem = nextProblem(config, rng, nextId++, null);
    const now = Date.now();
    set({
      phase: 'running',
      config,
      daily,
      problem,
      input: '',
      score: initialScoreState,
      startTimeMs: now,
      endTimeMs: now + config.durationSeconds * 1000,
      lastResult: null,
    });
  },

  setInput: (value) => set({ input: value }),

  submit: () => {
    const { phase, problem, input, config, score } = get();
    if (phase !== 'running' || !problem || !config) return 'empty';
    if (input.trim() === '') return 'empty';

    if (isCorrect(problem, input)) {
      const next = nextProblem(config, rng, nextId++, problem);
      set({ score: applyCorrect(score), problem: next, input: '' });
      return 'correct';
    }

    // Incorrect: keep the problem, reset streak, clear the wrong input.
    set({ score: applyIncorrect(score), input: '' });
    return 'incorrect';
  },

  finish: () => {
    const { phase, score, config, daily, startTimeMs } = get();
    // Already finished — return null so callers don't double-record stats.
    if (phase !== 'running') return null;
    if (!config) return null;
    const result: SessionResult = {
      score: score.score,
      correct: score.correct,
      incorrect: score.incorrect,
      bestStreak: score.bestStreak,
      durationSeconds: config.durationSeconds,
      endedAt: Date.now(),
      daily,
    };
    void startTimeMs;
    set({ phase: 'finished', lastResult: result });
    return result;
  },

  reset: () =>
    set({
      phase: 'idle',
      config: null,
      daily: false,
      problem: null,
      input: '',
      score: initialScoreState,
      endTimeMs: 0,
      startTimeMs: 0,
      lastResult: null,
    }),
}));
