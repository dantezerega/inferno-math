import type { Difficulty } from '@/types';

/**
 * Database row shapes. These mirror the Supabase schema in
 * `supabase/schema.sql`. Kept hand-written (rather than generated) so the app
 * has no build-time dependency on a live Supabase project.
 */

export interface ProfileRow {
  id: string;
  email: string | null;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserStatsRow {
  user_id: string;
  level: number;
  xp: number;
  best_score: number;
  best_streak: number;
  current_streak: number;
  last_played_date: string | null;
  total_sessions: number;
  total_questions: number;
  total_correct: number;
  total_incorrect: number;
  total_practice_seconds: number;
  updated_at: string;
}

export interface GameSessionRow {
  id: string;
  user_id: string;
  score: number;
  accuracy: number;
  duration: number;
  difficulty: Difficulty | string;
  daily: boolean;
  created_at: string;
}

export interface AchievementRow {
  id: string;
  name: string;
  description: string;
}

export interface UserAchievementRow {
  user_id: string;
  achievement_id: string;
  earned_at: string;
}

export interface DailyProgressRow {
  user_id: string;
  date: string;
  score: number;
  questions: number;
}

export interface LeaderboardEntry {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  score: number;
}

/**
 * Minimal typed surface for the Supabase client's `.from()` calls. We only type
 * the tables we touch; this keeps queries type-checked without pulling in
 * generated types.
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string };
        Update: Partial<ProfileRow>;
      };
      user_stats: {
        Row: UserStatsRow;
        Insert: Partial<UserStatsRow> & { user_id: string };
        Update: Partial<UserStatsRow>;
      };
      game_sessions: {
        Row: GameSessionRow;
        Insert: Omit<GameSessionRow, 'id' | 'created_at'> &
          Partial<Pick<GameSessionRow, 'id' | 'created_at'>>;
        Update: Partial<GameSessionRow>;
      };
      achievements: {
        Row: AchievementRow;
        Insert: AchievementRow;
        Update: Partial<AchievementRow>;
      };
      user_achievements: {
        Row: UserAchievementRow;
        Insert: Omit<UserAchievementRow, 'earned_at'> &
          Partial<Pick<UserAchievementRow, 'earned_at'>>;
        Update: Partial<UserAchievementRow>;
      };
      daily_progress: {
        Row: DailyProgressRow;
        Insert: DailyProgressRow;
        Update: Partial<DailyProgressRow>;
      };
    };
  };
}
