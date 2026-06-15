import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Difficulty, Operation, Settings, Theme } from '@/types';

interface SettingsStore extends Settings {
  setOperations: (ops: Operation[]) => void;
  toggleOperation: (op: Operation) => void;
  setDifficulty: (d: Difficulty) => void;
  setAutoDifficulty: (on: boolean) => void;
  setDuration: (seconds: number) => void;
  setSoundEnabled: (on: boolean) => void;
  setVolume: (v: number) => void;
  setTheme: (t: Theme) => void;
}

const DEFAULTS: Settings = {
  operations: ['addition', 'subtraction', 'multiplication', 'division'],
  difficulty: 'medium',
  autoDifficulty: false,
  durationSeconds: 60,
  soundEnabled: true,
  volume: 0.6,
  theme: 'system',
};

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setOperations: (operations) =>
        set({ operations: operations.length ? operations : ['addition'] }),
      toggleOperation: (op) =>
        set((s) => {
          const has = s.operations.includes(op);
          const next = has
            ? s.operations.filter((o) => o !== op)
            : [...s.operations, op];
          // Never allow zero operations enabled.
          return { operations: next.length ? next : s.operations };
        }),
      setDifficulty: (difficulty) => set({ difficulty }),
      setAutoDifficulty: (autoDifficulty) => set({ autoDifficulty }),
      setDuration: (durationSeconds) =>
        set({ durationSeconds: Math.max(5, Math.round(durationSeconds)) }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setVolume: (volume) => set({ volume: Math.min(1, Math.max(0, volume)) }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'inferno.settings',
      version: 2,
    },
  ),
);
