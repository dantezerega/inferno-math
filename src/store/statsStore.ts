import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SessionResult, Statistics } from '@/types';
import {
  emptyStatistics,
  isNewBest,
  recordSession,
} from '@/stats/statistics';

interface StatsStore {
  stats: Statistics;
  /** Records the session and returns whether it set a new best score. */
  record: (result: SessionResult) => boolean;
  /**
   * Merge a cloud snapshot into local stats (used after sign-in). Cloud totals
   * win; per-day activity is merged with cloud taking precedence for shared
   * dates. Local-only data (e.g. daily-challenge bests) is preserved.
   */
  hydrateFromCloud: (cloud: Statistics) => void;
  reset: () => void;
}

export const useStats = create<StatsStore>()(
  persist(
    (set, get) => ({
      stats: emptyStatistics(),
      record: (result) => {
        const newBest = isNewBest(get().stats, result);
        set((s) => ({ stats: recordSession(s.stats, result) }));
        return newBest;
      },
      hydrateFromCloud: (cloud) =>
        set((s) => ({
          stats: {
            ...cloud,
            totalScore: Math.max(cloud.totalScore, s.stats.totalScore),
            daily: { ...s.stats.daily, ...cloud.daily },
            dailyChallengeBest: { ...s.stats.dailyChallengeBest },
          },
        })),
      reset: () => set({ stats: emptyStatistics() }),
    }),
    {
      name: 'inferno.stats',
      version: 1,
    },
  ),
);
