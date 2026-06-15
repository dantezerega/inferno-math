import { create } from 'zustand';

export type NotificationKind = 'info' | 'success' | 'error';

export interface Notification {
  id: number;
  kind: NotificationKind;
  message: string;
}

interface NotificationStore {
  items: Notification[];
  push: (kind: NotificationKind, message: string, ttlMs?: number) => number;
  dismiss: (id: number) => void;
}

let counter = 1;

export const useNotifications = create<NotificationStore>((set, get) => ({
  items: [],
  push: (kind, message, ttlMs = 4000) => {
    const id = counter++;
    set((s) => ({ items: [...s.items, { id, kind, message }] }));
    if (ttlMs > 0 && typeof window !== 'undefined') {
      window.setTimeout(() => get().dismiss(id), ttlMs);
    }
    return id;
  },
  dismiss: (id) =>
    set((s) => ({ items: s.items.filter((n) => n.id !== id) })),
}));

/** Imperative helpers for use outside React (services, stores). */
export const notify = {
  info: (m: string) => useNotifications.getState().push('info', m),
  success: (m: string) => useNotifications.getState().push('success', m),
  error: (m: string) => useNotifications.getState().push('error', m),
};
