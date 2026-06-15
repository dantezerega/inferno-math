import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Difficulty, SessionResult, Statistics } from '@/types';
import type { UserStatsRow, DailyProgressRow } from '@/types/db';
import { emptyStatistics } from '@/stats/statistics';
import { accuracy } from '@/game/scoring';
import { xpForSession, levelFromXp } from '@/game/xp';
import { advanceStreak } from '@/game/streak';
import { evaluateAchievements } from '@/game/achievements';
import { dateKey } from '@/utils/date';
import { notify } from '@/store/notificationStore';

/**
 * Cloud persistence. Every export is a safe no-op when Supabase isn't
 * configured, and wraps network calls so a failure never throws into the UI —
 * it surfaces a toast and returns a sentinel instead.
 */

function available(): boolean {
  return isSupabaseConfigured && supabase !== null;
}

/** Fetch the user's cumulative stats row, or null if absent. */
export async function fetchUserStats(
  userId: string,
): Promise<UserStatsRow | null> {
  if (!available()) return null;
  try {
    const { data, error } = await supabase!
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  } catch (err) {
    console.error('fetchUserStats failed', err);
    return null;
  }
}

/** Fetch all of the user's per-day progress rows. */
export async function fetchDailyProgress(
  userId: string,
): Promise<DailyProgressRow[]> {
  if (!available()) return [];
  try {
    const { data, error } = await supabase!
      .from('daily_progress')
      .select('*')
      .eq('user_id', userId);
    if (error) throw error;
    return data ?? [];
  } catch (err) {
    console.error('fetchDailyProgress failed', err);
    return [];
  }
}

/** Ids of achievements the user has already earned. */
export async function fetchEarnedAchievements(
  userId: string,
): Promise<string[]> {
  if (!available()) return [];
  try {
    const { data, error } = await supabase!
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId);
    if (error) throw error;
    return (data ?? []).map((r) => r.achievement_id);
  } catch (err) {
    console.error('fetchEarnedAchievements failed', err);
    return [];
  }
}

/** Reconstruct a local Statistics object from cloud rows (for cross-device display). */
export function statisticsFromCloud(
  row: UserStatsRow | null,
  daily: DailyProgressRow[],
): Statistics {
  const stats = emptyStatistics();
  if (row) {
    stats.totalSessions = row.total_sessions;
    stats.totalCorrect = row.total_correct;
    stats.totalIncorrect = row.total_incorrect;
    stats.bestScore = row.best_score;
    stats.bestStreak = row.best_streak;
    stats.totalPracticeSeconds = row.total_practice_seconds;
    // Average score isn't stored; approximate cumulative score from sessions.
    stats.totalScore = row.best_score; // lower bound; refined locally over time
  }
  for (const d of daily) {
    stats.daily[d.date] = {
      date: d.date,
      sessions: 1,
      bestScore: d.score,
      totalCorrect: d.questions,
    };
  }
  return stats;
}

/** Insert one completed game into game_sessions. */
export async function saveGameSession(
  userId: string,
  result: SessionResult,
  difficulty: Difficulty,
): Promise<void> {
  if (!available()) return;
  try {
    const { error } = await supabase!.from('game_sessions').insert({
      user_id: userId,
      score: result.score,
      accuracy: Number(accuracy(result.correct, result.incorrect).toFixed(2)),
      duration: result.durationSeconds,
      difficulty,
      daily: result.daily,
    });
    if (error) throw error;
  } catch (err) {
    console.error('saveGameSession failed', err);
    notify.error('Could not save your session to the cloud.');
  }
}

/** Increment per-day progress for today (best score + questions answered). */
export async function upsertDailyProgress(
  userId: string,
  result: SessionResult,
  today: string = dateKey(),
): Promise<void> {
  if (!available()) return;
  try {
    const { data, error: selErr } = await supabase!
      .from('daily_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();
    if (selErr) throw selErr;

    const next = {
      user_id: userId,
      date: today,
      score: Math.max(data?.score ?? 0, result.score),
      questions: (data?.questions ?? 0) + result.correct,
    };
    const { error } = await supabase!
      .from('daily_progress')
      .upsert(next, { onConflict: 'user_id,date' });
    if (error) throw error;
  } catch (err) {
    console.error('upsertDailyProgress failed', err);
  }
}

export interface UpdatedStats {
  row: UserStatsRow;
  newlyEarnedAchievements: string[];
}

/**
 * Read-modify-write the user's cumulative stats with one session's results,
 * recomputing XP / level / streak. Returns the new row plus any achievements
 * newly unlocked, so the UI can celebrate them.
 */
export async function updateUserStats(
  userId: string,
  result: SessionResult,
  difficulty: Difficulty,
  today: string = dateKey(),
): Promise<UpdatedStats | null> {
  if (!available()) return null;
  try {
    const current = await fetchUserStats(userId);
    const base: UserStatsRow =
      current ??
      ({
        user_id: userId,
        level: 1,
        xp: 0,
        best_score: 0,
        best_streak: 0,
        current_streak: 0,
        last_played_date: null,
        total_sessions: 0,
        total_questions: 0,
        total_correct: 0,
        total_incorrect: 0,
        total_practice_seconds: 0,
        updated_at: new Date().toISOString(),
      } satisfies UserStatsRow);

    const xp = base.xp + xpForSession(result, difficulty);
    const streak = advanceStreak(
      { currentStreak: base.current_streak, lastPlayedDate: base.last_played_date },
      today,
    );

    const row: UserStatsRow = {
      user_id: userId,
      xp,
      level: levelFromXp(xp),
      best_score: Math.max(base.best_score, result.score),
      best_streak: Math.max(base.best_streak, result.bestStreak),
      current_streak: streak.currentStreak,
      last_played_date: streak.lastPlayedDate,
      total_sessions: base.total_sessions + 1,
      total_questions:
        base.total_questions + result.correct + result.incorrect,
      total_correct: base.total_correct + result.correct,
      total_incorrect: base.total_incorrect + result.incorrect,
      total_practice_seconds: base.total_practice_seconds + result.durationSeconds,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase!
      .from('user_stats')
      .upsert(row, { onConflict: 'user_id' });
    if (error) throw error;

    const newlyEarnedAchievements = await syncAchievements(userId, {
      totalSessions: row.total_sessions,
      totalCorrect: row.total_correct,
      bestScore: row.best_score,
      bestStreak: row.best_streak,
      level: row.level,
      dayStreak: row.current_streak,
    });

    return { row, newlyEarnedAchievements };
  } catch (err) {
    console.error('updateUserStats failed', err);
    notify.error('Could not sync your stats. They are saved locally.');
    return null;
  }
}

interface AchievementInputs {
  totalSessions: number;
  totalCorrect: number;
  bestScore: number;
  bestStreak: number;
  level: number;
  dayStreak: number;
}

/** Insert any newly-earned achievements; returns the new ids. */
async function syncAchievements(
  userId: string,
  inputs: AchievementInputs,
): Promise<string[]> {
  if (!available()) return [];
  try {
    const earnedNow = evaluateAchievements({
      level: inputs.level,
      dayStreak: inputs.dayStreak,
      stats: {
        ...emptyStatistics(),
        totalSessions: inputs.totalSessions,
        totalCorrect: inputs.totalCorrect,
        bestScore: inputs.bestScore,
        bestStreak: inputs.bestStreak,
      },
    });
    if (earnedNow.length === 0) return [];

    const already = new Set(await fetchEarnedAchievements(userId));
    const fresh = earnedNow.filter((id) => !already.has(id));
    if (fresh.length === 0) return [];

    const { error } = await supabase!
      .from('user_achievements')
      .insert(fresh.map((achievement_id) => ({ user_id: userId, achievement_id })));
    if (error) throw error;
    return fresh;
  } catch (err) {
    console.error('syncAchievements failed', err);
    return [];
  }
}

/** Full post-session cloud sync: session row + daily + stats + achievements. */
export async function persistSession(
  userId: string,
  result: SessionResult,
  difficulty: Difficulty,
): Promise<UpdatedStats | null> {
  if (!available()) return null;
  const today = dateKey(new Date(result.endedAt));
  // Run independent writes together; stats update returns the interesting bits.
  const [updated] = await Promise.all([
    updateUserStats(userId, result, difficulty, today),
    saveGameSession(userId, result, difficulty),
    upsertDailyProgress(userId, result, today),
  ]);
  return updated;
}
