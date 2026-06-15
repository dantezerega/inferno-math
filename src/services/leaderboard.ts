import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { LeaderboardEntry } from '@/types/db';

/**
 * Leaderboard data access. Wired against the schema now so leaderboards can be
 * surfaced in the UI later without refactoring. All functions degrade to an
 * empty list when Supabase isn't configured or a query fails.
 */

function available(): boolean {
  return isSupabaseConfigured && supabase !== null;
}

interface Row {
  user_id: string;
  score: number;
  profiles: { username: string | null; avatar_url: string | null } | null;
}

function toEntries(rows: Row[]): LeaderboardEntry[] {
  // Collapse to the best score per user, then rank.
  const best = new Map<string, LeaderboardEntry>();
  for (const r of rows) {
    const existing = best.get(r.user_id);
    if (!existing || r.score > existing.score) {
      best.set(r.user_id, {
        user_id: r.user_id,
        username: r.profiles?.username ?? null,
        avatar_url: r.profiles?.avatar_url ?? null,
        score: r.score,
      });
    }
  }
  return [...best.values()].sort((a, b) => b.score - a.score);
}

async function topScoresSince(
  since: string | null,
  limit: number,
): Promise<LeaderboardEntry[]> {
  if (!available()) return [];
  try {
    let query = supabase!
      .from('game_sessions')
      .select('user_id, score, profiles(username, avatar_url)')
      .order('score', { ascending: false })
      .limit(limit * 4); // over-fetch; we dedupe per user client-side
    if (since) query = query.gte('created_at', since);

    const { data, error } = await query;
    if (error) throw error;
    return toEntries((data ?? []) as unknown as Row[]).slice(0, limit);
  } catch (err) {
    console.error('leaderboard query failed', err);
    return [];
  }
}

export function getGlobalLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  return topScoresSince(null, limit);
}

export function getWeeklyLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const since = new Date();
  since.setDate(since.getDate() - 7);
  return topScoresSince(since.toISOString(), limit);
}

export function getDailyLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  return topScoresSince(since.toISOString(), limit);
}
