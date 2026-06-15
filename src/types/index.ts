export type Operation = 'addition' | 'subtraction' | 'multiplication' | 'division';

export type Difficulty =
  | 'easy'
  | 'medium'
  | 'hard'
  | 'expert'
  | 'master'
  | 'grandmaster';

export type Theme = 'light' | 'dark' | 'system';

export interface Problem {
  /** Stable id, monotonically increasing within a session. */
  id: number;
  /** Pre-rendered prompt, e.g. "17 + 28" or "(25 − 7) × 4". */
  question: string;
  /** Correct integer answer. */
  answer: number;
  difficulty: Difficulty;
}

export interface GameConfig {
  operations: Operation[];
  difficulty: Difficulty;
  durationSeconds: number;
}

export interface Settings extends GameConfig {
  /** When on, difficulty auto-adjusts between sessions based on accuracy. */
  autoDifficulty: boolean;
  soundEnabled: boolean;
  volume: number; // 0..1
  theme: Theme;
}

export type GamePhase = 'idle' | 'running' | 'finished';

export interface SessionResult {
  score: number;
  correct: number;
  incorrect: number;
  bestStreak: number;
  durationSeconds: number;
  /** Epoch ms when the session ended. */
  endedAt: number;
  /** Whether this was a daily-challenge run. */
  daily: boolean;
}

export interface DailyActivity {
  /** ISO date key, e.g. "2026-06-15". */
  date: string;
  sessions: number;
  bestScore: number;
  totalCorrect: number;
}

export interface Statistics {
  totalSessions: number;
  totalCorrect: number;
  totalIncorrect: number;
  bestScore: number;
  totalScore: number; // for computing average score
  bestStreak: number;
  totalPracticeSeconds: number;
  /** Keyed by ISO date. */
  daily: Record<string, DailyActivity>;
  /** Best daily-challenge score keyed by ISO date. */
  dailyChallengeBest: Record<string, number>;
}
