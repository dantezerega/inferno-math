import type { Statistics } from '@/types';

/**
 * Achievement catalog + evaluation — pure. The `id`s and copy here must stay in
 * sync with the seed block in `supabase/schema.sql`.
 */

export interface Achievement {
  id: string;
  name: string;
  description: string;
}

export interface AchievementContext {
  stats: Statistics;
  /** Current level derived from XP. */
  level: number;
  /** Current consecutive-day streak. */
  dayStreak: number;
}

interface AchievementDef extends Achievement {
  earned: (ctx: AchievementContext) => boolean;
}

const DEFS: AchievementDef[] = [
  {
    id: 'first_session',
    name: 'First Steps',
    description: 'Complete your first session.',
    earned: (c) => c.stats.totalSessions >= 1,
  },
  {
    id: 'sessions_10',
    name: 'Warming Up',
    description: 'Complete 10 sessions.',
    earned: (c) => c.stats.totalSessions >= 10,
  },
  {
    id: 'sessions_50',
    name: 'Dedicated',
    description: 'Complete 50 sessions.',
    earned: (c) => c.stats.totalSessions >= 50,
  },
  {
    id: 'score_25',
    name: 'Quick Thinker',
    description: 'Score 25 in a single session.',
    earned: (c) => c.stats.bestScore >= 25,
  },
  {
    id: 'score_50',
    name: 'Sharp Mind',
    description: 'Score 50 in a single session.',
    earned: (c) => c.stats.bestScore >= 50,
  },
  {
    id: 'score_100',
    name: 'Calculator',
    description: 'Score 100 in a single session.',
    earned: (c) => c.stats.bestScore >= 100,
  },
  {
    id: 'streak_10',
    name: 'On Fire',
    description: 'Reach a 10-answer streak.',
    earned: (c) => c.stats.bestStreak >= 10,
  },
  {
    id: 'streak_25',
    name: 'Inferno',
    description: 'Reach a 25-answer streak.',
    earned: (c) => c.stats.bestStreak >= 25,
  },
  {
    id: 'daily_3',
    name: 'Habit Forming',
    description: 'Practice 3 days in a row.',
    earned: (c) => c.dayStreak >= 3,
  },
  {
    id: 'daily_7',
    name: 'Week Warrior',
    description: 'Practice 7 days in a row.',
    earned: (c) => c.dayStreak >= 7,
  },
  {
    id: 'questions_1000',
    name: 'Marathoner',
    description: 'Answer 1000 questions total.',
    earned: (c) => c.stats.totalCorrect >= 1000,
  },
  {
    id: 'level_5',
    name: 'Ascending',
    description: 'Reach level 5.',
    earned: (c) => c.level >= 5,
  },
];

export const ACHIEVEMENTS: Achievement[] = DEFS.map(
  ({ id, name, description }) => ({ id, name, description }),
);

const BY_ID: Record<string, Achievement> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
);

export function achievementById(id: string): Achievement | undefined {
  return BY_ID[id];
}

/** All achievement ids currently satisfied by the given context. */
export function evaluateAchievements(ctx: AchievementContext): string[] {
  return DEFS.filter((d) => d.earned(ctx)).map((d) => d.id);
}

/**
 * Ids newly earned since `alreadyEarned` — used to fire notifications and to
 * insert into `user_achievements`.
 */
export function newlyEarned(
  alreadyEarned: Iterable<string>,
  ctx: AchievementContext,
): string[] {
  const have = new Set(alreadyEarned);
  return evaluateAchievements(ctx).filter((id) => !have.has(id));
}
