import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import type { Theme } from '@/types';
import { cn } from '@/utils/cn';

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="inline-flex rounded-xl border border-border bg-surface-2/60 p-1">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            aria-pressed={theme === opt.value}
            title={opt.label}
            className={cn(
              'flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm transition-colors',
              theme === opt.value
                ? 'bg-elevated text-content shadow-sm'
                : 'text-muted hover:text-content',
            )}
          >
            <Icon size={15} aria-hidden />
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
