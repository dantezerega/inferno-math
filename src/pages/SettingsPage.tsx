import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronLeft } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useSettings } from '@/store/settingsStore';
import type { Operation } from '@/types';
import { OPERATION_SYMBOL } from '@/game/problemGenerator';
import {
  DIFFICULTY_HINT,
  DIFFICULTY_LABEL,
  DIFFICULTY_ORDER,
} from '@/game/difficulty';
import { playSound } from '@/utils/sound';
import { cn } from '@/utils/cn';

const OPS: Operation[] = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
];
const OP_LABEL: Record<Operation, string> = {
  addition: 'Addition',
  subtraction: 'Subtraction',
  multiplication: 'Multiplication',
  division: 'Division',
};

const DURATIONS = [30, 60, 120, 300];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border px-4 py-3 text-sm font-semibold transition-all',
        active
          ? 'border-accent bg-accent-soft text-accent shadow-sm'
          : 'border-border bg-surface-2/50 text-content hover:border-accent/40',
      )}
    >
      {children}
    </button>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const s = useSettings();

  return (
    <PageShell wide>
      <div className="mb-8 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm font-medium text-muted hover:text-content"
        >
          <ChevronLeft size={16} aria-hidden />
          Back
        </button>
        <h1 className="text-xl font-bold">Settings</h1>
        <div className="w-12" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="space-y-5 p-6">
          <Section title="Problem types">
            <div className="grid grid-cols-2 gap-2">
              {OPS.map((op) => (
                <Chip
                  key={op}
                  active={s.operations.includes(op)}
                  onClick={() => s.toggleOperation(op)}
                >
                  <span className="text-lg">{OPERATION_SYMBOL[op]}</span>
                  {OP_LABEL[op]}
                </Chip>
              ))}
            </div>
            <p className="text-xs text-muted">
              At least one type stays enabled.
            </p>
          </Section>

          <Section title="Difficulty">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {DIFFICULTY_ORDER.map((d) => (
                <Chip
                  key={d}
                  active={s.difficulty === d}
                  onClick={() => s.setDifficulty(d)}
                >
                  {DIFFICULTY_LABEL[d]}
                  <span className="text-center text-[11px] font-normal leading-tight text-muted">
                    {DIFFICULTY_HINT[d]}
                  </span>
                </Chip>
              ))}
            </div>
            <label className="flex items-center justify-between rounded-xl border border-border bg-surface-2/50 px-4 py-3">
              <span className="text-sm font-medium">
                Auto difficulty
                <span className="block text-xs font-normal text-muted">
                  Adjusts after each session by accuracy
                </span>
              </span>
              <button
                role="switch"
                aria-checked={s.autoDifficulty}
                onClick={() => s.setAutoDifficulty(!s.autoDifficulty)}
                className={cn(
                  'relative h-6 w-11 shrink-0 rounded-full transition-colors',
                  s.autoDifficulty ? 'bg-accent' : 'bg-border',
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                    s.autoDifficulty ? 'translate-x-[22px]' : 'translate-x-0.5',
                  )}
                />
              </button>
            </label>
          </Section>
        </Card>

        <Card className="space-y-5 p-6">
          <Section title="Session duration">
            <div className="grid grid-cols-4 gap-2">
              {DURATIONS.map((d) => (
                <Chip
                  key={d}
                  active={s.durationSeconds === d}
                  onClick={() => s.setDuration(d)}
                >
                  {d < 60 ? `${d}s` : `${d / 60}m`}
                </Chip>
              ))}
            </div>
            <label className="mt-1 block text-sm">
              <span className="mb-1 block text-muted">Custom (seconds)</span>
              <input
                type="number"
                value={s.durationSeconds}
                onChange={(e) => s.setDuration(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono outline-none focus:border-accent"
              />
            </label>
          </Section>

          <Section title="Sound">
            <label className="flex items-center justify-between rounded-xl border border-border bg-surface-2/50 px-4 py-3">
              <span className="text-sm font-medium">Sound effects</span>
              <button
                role="switch"
                aria-checked={s.soundEnabled}
                onClick={() => s.setSoundEnabled(!s.soundEnabled)}
                className={cn(
                  'relative h-6 w-11 rounded-full transition-colors',
                  s.soundEnabled ? 'bg-accent' : 'bg-border',
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                    s.soundEnabled ? 'translate-x-[22px]' : 'translate-x-0.5',
                  )}
                />
              </button>
            </label>
            <label className="block px-1 text-sm">
              <span className="mb-2 block text-muted">
                Volume · {Math.round(s.volume * 100)}%
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={s.volume}
                disabled={!s.soundEnabled}
                onChange={(e) => s.setVolume(Number(e.target.value))}
                onMouseUp={() =>
                  s.soundEnabled && playSound('correct', s.volume)
                }
                className="w-full accent-accent disabled:opacity-40"
              />
            </label>
          </Section>

          <Section title="Theme">
            <ThemeToggle />
          </Section>
        </Card>
      </div>

      <div className="mt-8 flex justify-center gap-3">
        <Button variant="secondary" onClick={() => navigate('/')}>
          Home
        </Button>
        <Button onClick={() => navigate('/play')}>
          Start session
          <ArrowRight size={18} aria-hidden />
        </Button>
      </div>
    </PageShell>
  );
}
