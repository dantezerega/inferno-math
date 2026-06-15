import type { Problem } from '@/types';

export interface ScoreState {
  score: number;
  correct: number;
  incorrect: number;
  streak: number;
  bestStreak: number;
}

export const initialScoreState: ScoreState = {
  score: 0,
  correct: 0,
  incorrect: 0,
  streak: 0,
  bestStreak: 0,
};

/** Parse raw input into an integer answer, or null if not a valid number. */
export function parseAnswer(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed === '-') return null;
  // Allow only integers (optionally negative). Reject decimals/garbage.
  if (!/^-?\d+$/.test(trimmed)) return null;
  return Number(trimmed);
}

export function isCorrect(problem: Problem, raw: string): boolean {
  const value = parseAnswer(raw);
  return value !== null && value === problem.answer;
}

/** Apply a correct answer to the score state (pure). */
export function applyCorrect(state: ScoreState): ScoreState {
  const streak = state.streak + 1;
  return {
    ...state,
    score: state.score + 1,
    correct: state.correct + 1,
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
  };
}

/** Apply an incorrect answer: streak resets, incorrect increments. */
export function applyIncorrect(state: ScoreState): ScoreState {
  return {
    ...state,
    incorrect: state.incorrect + 1,
    streak: 0,
  };
}

export function accuracy(correct: number, incorrect: number): number {
  const total = correct + incorrect;
  if (total === 0) return 0;
  return (correct / total) * 100;
}

/** Answers per minute given correct count and elapsed seconds. */
export function answersPerMinute(correct: number, seconds: number): number {
  if (seconds <= 0) return 0;
  return (correct / seconds) * 60;
}

/** Streak milestones worth celebrating in the UI. */
export function isStreakMilestone(streak: number): boolean {
  return streak > 0 && streak % 5 === 0;
}
