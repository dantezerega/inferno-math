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
      reset: () => set({ stats: emptyStatistics() }),
    }),
    {
      name: 'inferno.stats',
      version: 1,
    },
  ),
);
