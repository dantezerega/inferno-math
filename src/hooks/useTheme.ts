import { useEffect } from 'react';
import { useSettings } from '@/store/settingsStore';
import type { Theme } from '@/types';

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const prefersDark =
    window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  const dark = theme === 'dark' || (theme === 'system' && prefersDark);

  // Enable transitions briefly so the swap animates, then remove the helper
  // class so it doesn't affect gameplay animations.
  root.classList.add('theme-transition');
  root.classList.toggle('dark', dark);
  window.setTimeout(() => root.classList.remove('theme-transition'), 450);
}

/** Keeps the <html> `dark` class in sync with the persisted theme setting. */
export function useTheme(): { theme: Theme; setTheme: (t: Theme) => void } {
  const theme = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // React to OS-level changes while in "system" mode.
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  return { theme, setTheme };
}
