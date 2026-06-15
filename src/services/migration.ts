import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Statistics } from '@/types';
import type { UserStatsRow } from '@/types/db';
import { fetchUserStats } from '@/services/cloudSync';
import { levelFromXp } from '@/game/xp';
import { currentStreakFromStats } from '@/game/streak';
import { notify } from '@/store/notificationStore';

const flagKey = (userId: string) => `inferno.migrated.${userId}`;

function alreadyMigrated(userId: string): boolean {
  try {
    return localStorage.getItem(flagKey(userId)) === '1';
  } catch {
    return false;
  }
}

function markMigrated(userId: string): void {
  try {
    localStorage.setItem(flagKey(userId), '1');
  } catch {
    /* ignore storage errors */
  }
}

/** True when the local Statistics actually contain something worth uploading. */
function hasLocalData(stats: Statistics): boolean {
  return stats.totalSessions > 0;
}

/** True when the cloud profile has no recorded activity yet. */
function cloudIsEmpty(row: UserStatsRow | null): boolean {
  return !row || row.total_sessions === 0;
}

/**
 * One-time migration of localStorage stats into the cloud on first login.
 *
 * - Runs at most once per user (guarded by a local flag).
 * - Uploads local stats ONLY when the cloud profile is empty.
 * - Never overwrites existing cloud data.
 *
 * Returns true if data was uploaded.
 */
export async function migrateLocalToCloud(
  userId: string,
  local: Statistics,
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  if (alreadyMigrated(userId)) return false;

  try {
    if (!hasLocalData(local)) {
      markMigrated(userId);
      return false;
    }

    const cloud = await fetchUserStats(userId);
    if (!cloudIsEmpty(cloud)) {
      // Cloud already has data — keep it, do not overwrite.
      markMigrated(userId);
      return false;
    }

    // Approximate XP from the cumulative session score sum.
    const xp = Math.max(0, Math.round(local.totalScore));
    const streak = currentStreakFromStats(local);

    const activeDates = Object.entries(local.daily)
      .filter(([, a]) => a.sessions > 0)
      .map(([date]) => date)
      .sort();
    const lastPlayed = activeDates[activeDates.length - 1] ?? null;

    const row: UserStatsRow = {
      user_id: userId,
      xp,
      level: levelFromXp(xp),
      best_score: local.bestScore,
      best_streak: local.bestStreak,
      current_streak: streak,
      last_played_date: lastPlayed,
      total_sessions: local.totalSessions,
      total_questions: local.totalCorrect + local.totalIncorrect,
      total_correct: local.totalCorrect,
      total_incorrect: local.totalIncorrect,
      total_practice_seconds: local.totalPracticeSeconds,
      updated_at: new Date().toISOString(),
    };

    const { error: statsErr } = await supabase
      .from('user_stats')
      .upsert(row, { onConflict: 'user_id' });
    if (statsErr) throw statsErr;

    const dailyRows = Object.values(local.daily)
      .filter((a) => a.sessions > 0)
      .map((a) => ({
        user_id: userId,
        date: a.date,
        score: a.bestScore,
        questions: a.totalCorrect,
      }));
    if (dailyRows.length > 0) {
      const { error: dailyErr } = await supabase
        .from('daily_progress')
        .upsert(dailyRows, { onConflict: 'user_id,date' });
      if (dailyErr) throw dailyErr;
    }

    markMigrated(userId);
    notify.success('Your local progress has been synced to your account.');
    return true;
  } catch (err) {
    console.error('migrateLocalToCloud failed', err);
    notify.error('Could not migrate local progress. Will retry next login.');
    return false;
  }
}
