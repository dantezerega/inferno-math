import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { UserStatsRow } from '@/types/db';
import {
  fetchDailyProgress,
  fetchUserStats,
  statisticsFromCloud,
} from '@/services/cloudSync';
import { migrateLocalToCloud } from '@/services/migration';
import { useStats } from '@/store/statsStore';
import { notify } from '@/store/notificationStore';

/** Lightweight summary of cloud stats for header/menu display. */
export interface UserSummary {
  level: number;
  xp: number;
  currentStreak: number;
  bestStreak: number;
  bestScore: number;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  /** True only when Supabase env vars are present. */
  configured: boolean;
  summary: UserSummary | null;

  initialize: () => void;
  /**
   * Email a magic sign-in link to the given address. Returns true once the
   * email is sent; the user completes sign-in by clicking the link, which
   * redirects back and establishes the session automatically.
   */
  sendMagicLink: (email: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  refreshSummary: () => Promise<void>;
}

function summaryFromRow(row: UserStatsRow | null): UserSummary | null {
  if (!row) return null;
  return {
    level: row.level,
    xp: row.xp,
    currentStreak: row.current_streak,
    bestStreak: row.best_streak,
    bestScore: row.best_score,
  };
}

let unsubscribe: (() => void) | null = null;
let initialized = false;

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  loading: isSupabaseConfigured,
  isAuthenticated: false,
  configured: isSupabaseConfigured,
  summary: null,

  initialize: () => {
    // Local-only mode: nothing to restore.
    if (!isSupabaseConfigured || !supabase) {
      set({ loading: false });
      return;
    }
    if (initialized) return;
    initialized = true;

    // Restore any existing session on startup.
    supabase.auth
      .getSession()
      .then(({ data }) => {
        applySession(set, get, data.session);
        set({ loading: false });
      })
      .catch((err) => {
        console.error('getSession failed', err);
        set({ loading: false });
      });

    // Keep state in sync with auth changes (login, logout, token refresh).
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(set, get, session);
    });
    unsubscribe = () => data.subscription.unsubscribe();
  },

  sendMagicLink: async (email) => {
    if (!isSupabaseConfigured || !supabase) {
      notify.error('Sign-in is unavailable: cloud sync is not configured.');
      return false;
    }
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // Create the account automatically on first login.
          shouldCreateUser: true,
          // Return the user to the app after clicking the link; the client's
          // detectSessionInUrl then establishes the session.
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      notify.success(`We sent a confirmation link to ${email}.`);
      return true;
    } catch (err) {
      console.error('sendMagicLink failed', err);
      notify.error('Could not send the link. Check the email and retry.');
      return false;
    }
  },

  signOut: async () => {
    if (!supabase) return;
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      console.error('signOut failed', err);
      notify.error('Sign-out failed.');
    } finally {
      set({ user: null, isAuthenticated: false, summary: null });
    }
  },

  refreshSummary: async () => {
    const { user } = get();
    if (!user) return;
    const row = await fetchUserStats(user.id);
    set({ summary: summaryFromRow(row) });
  },
}));

let lastUserId: string | null = null;

/** Update store from a session, and run one-time hydration on a new sign-in. */
function applySession(
  set: (partial: Partial<AuthState>) => void,
  _get: () => AuthState,
  session: Session | null,
): void {
  const user = session?.user ?? null;
  set({ user, isAuthenticated: Boolean(user) });

  if (user && user.id !== lastUserId) {
    lastUserId = user.id;
    void onSignedIn(set, user.id);
  } else if (!user) {
    lastUserId = null;
  }
}

/** First-touch work for a freshly signed-in user: migrate, then hydrate. */
async function onSignedIn(
  set: (partial: Partial<AuthState>) => void,
  userId: string,
): Promise<void> {
  try {
    const local = useStats.getState().stats;
    await migrateLocalToCloud(userId, local);

    const [row, daily] = await Promise.all([
      fetchUserStats(userId),
      fetchDailyProgress(userId),
    ]);

    useStats.getState().hydrateFromCloud(statisticsFromCloud(row, daily));
    set({ summary: summaryFromRow(row) });
  } catch (err) {
    console.error('post-sign-in hydration failed', err);
  }
}

/** Tear down the auth subscription (used in tests / HMR). */
export function disposeAuth(): void {
  unsubscribe?.();
  unsubscribe = null;
  initialized = false;
  lastUserId = null;
}
