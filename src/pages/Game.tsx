import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, Flame, X } from 'lucide-react';
import { useGame } from '@/store/gameStore';
import { useSettings } from '@/store/settingsStore';
import { useStats } from '@/store/statsStore';
import { useAuth } from '@/store/authStore';
import { useCountdown } from '@/hooks/useCountdown';
import { playSound } from '@/utils/sound';
import { accuracy, isCorrect, isStreakMilestone } from '@/game/scoring';
import { adjustDifficulty, DIFFICULTY_LABEL } from '@/game/difficulty';
import { achievementById } from '@/game/achievements';
import { persistSession } from '@/services/cloudSync';
import { notify } from '@/store/notificationStore';
import { formatClock } from '@/utils/date';
import { cn } from '@/utils/cn';

export default function Game() {
  const navigate = useNavigate();
  const settings = useSettings();
  const recordStats = useStats((s) => s.record);

  const phase = useGame((s) => s.phase);
  const problem = useGame((s) => s.problem);
  const input = useGame((s) => s.input);
  const score = useGame((s) => s.score);
  const endTimeMs = useGame((s) => s.endTimeMs);
  const daily = useGame((s) => s.daily);
  const difficulty = useGame((s) => s.config?.difficulty);
  const setInput = useGame((s) => s.setInput);
  const submit = useGame((s) => s.submit);
  const finish = useGame((s) => s.finish);
  const start = useGame((s) => s.start);

  const inputRef = useRef<HTMLInputElement>(null);
  const [flash, setFlash] = useState<'correct' | 'incorrect' | null>(null);
  const [milestone, setMilestone] = useState(0);

  // If we arrive without a running game (e.g. from Settings "Start"),
  // kick one off with the current settings.
  useEffect(() => {
    if (phase === 'idle') {
      start({
        operations: settings.operations,
        difficulty: settings.difficulty,
        durationSeconds: settings.durationSeconds,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExpire = useCallback(() => {
    const result = finish();
    let newBest = false;
    if (result) {
      newBest = recordStats(result);
      if (settings.soundEnabled) playSound('complete', settings.volume);
      // Adaptive difficulty: nudge the stored level based on this session's
      // accuracy (skipped for the fixed daily challenge).
      if (settings.autoDifficulty && !result.daily) {
        const next = adjustDifficulty(
          settings.difficulty,
          accuracy(result.correct, result.incorrect),
        );
        if (next !== settings.difficulty) settings.setDifficulty(next);
      }

      // Cloud sync (fire-and-forget) when signed in. Never blocks navigation;
      // failures surface as toasts and the local save above still stands.
      const { user, isAuthenticated, refreshSummary } = useAuth.getState();
      if (isAuthenticated && user) {
        const difficulty =
          useGame.getState().config?.difficulty ?? settings.difficulty;
        void persistSession(user.id, result, difficulty).then((updated) => {
          void refreshSummary();
          for (const id of updated?.newlyEarnedAchievements ?? []) {
            const a = achievementById(id);
            if (a) notify.success(`Achievement unlocked: ${a.name}`);
          }
        });
      }
    }
    navigate('/results', { state: { newBest } });
  }, [finish, recordStats, navigate, settings]);

  const remaining = useCountdown(endTimeMs, phase === 'running', handleExpire);

  // Keep focus pinned to the input at all times.
  useEffect(() => {
    const focus = () => inputRef.current?.focus();
    focus();
    window.addEventListener('focus', focus);
    return () => window.removeEventListener('focus', focus);
  }, [phase]);

  // Auto-advance the instant the typed value equals the answer. Wrong input
  // does nothing — no penalty, the problem stays up until it's solved.
  const tryAdvance = useCallback(
    (value: string) => {
      const current = useGame.getState().problem;
      if (!current || !isCorrect(current, value)) return;
      if (submit() !== 'correct') return;
      if (settings.soundEnabled) playSound('correct', settings.volume);
      setFlash('correct');
      const streak = useGame.getState().score.streak;
      if (isStreakMilestone(streak)) setMilestone(streak);
      window.setTimeout(() => setFlash(null), 220);
    },
    [submit, settings.soundEnabled, settings.volume],
  );

  const handleChange = useCallback(
    (value: string) => {
      setInput(value);
      tryAdvance(value);
    },
    [setInput, tryAdvance],
  );

  // Enter no longer submits; nothing happens on a wrong answer.
  const onSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
  }, []);

  const quit = () => {
    handleExpire();
  };

  if (!problem) return null;

  const totalMs = useGame.getState().config
    ? useGame.getState().config!.durationSeconds * 1000
    : 1;
  const pct = Math.max(0, Math.min(1, (remaining * 1000) / totalMs));
  const lowTime = remaining <= 5;

  return (
    <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col px-5 py-6">
      {/* Top HUD */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2.5">
          <button
            onClick={quit}
            className="flex items-center gap-1 font-medium text-muted hover:text-content"
          >
            <X size={15} aria-hidden />
            End
          </button>
          {difficulty && (
            <span className="rounded-md border border-border bg-surface-2/60 px-2 py-1 text-xs font-bold text-content">
              {DIFFICULTY_LABEL[difficulty]}
            </span>
          )}
          {daily && (
            <span className="flex items-center gap-1 rounded-md bg-accent-soft px-2 py-1 text-xs font-bold text-accent">
              <CalendarDays size={13} aria-hidden />
              Daily
            </span>
          )}
        </div>
        <div className="flex items-center gap-5 font-mono tabular-nums">
          <Stat label="Score" value={score.score} />
          <Stat label="Streak" value={score.streak} />
          <Stat label="Best" value={score.bestStreak} />
        </div>
      </div>

      {/* Timer */}
      <div className="mt-5">
        <div className="mb-2 flex items-end justify-center">
          <motion.span
            animate={lowTime ? { scale: [1, 1.06, 1] } : { scale: 1 }}
            transition={{ duration: 0.6, repeat: lowTime ? Infinity : 0 }}
            className={cn(
              'font-mono text-5xl font-bold tabular-nums',
              lowTime ? 'text-danger' : 'text-content',
            )}
          >
            {formatClock(remaining)}
          </motion.span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className={cn(
              'h-full rounded-full',
              lowTime ? 'bg-danger' : 'bg-flame',
            )}
            style={{ width: `${pct * 100}%` }}
          />
        </div>
      </div>

      {/* Problem + input */}
      <form
        onSubmit={onSubmit}
        className="flex flex-1 flex-col items-center justify-center gap-8"
      >
        <div className="relative">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={problem.id}
              initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -16, filter: 'blur(4px)' }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                'select-none text-balance text-center font-mono font-bold tracking-tight',
                // Scale down longer multi-step expressions so they always fit.
                problem.question.length > 18
                  ? 'text-3xl sm:text-4xl'
                  : problem.question.length > 11
                    ? 'text-4xl sm:text-5xl'
                    : 'text-6xl sm:text-7xl',
              )}
            >
              {problem.question}
            </motion.div>
          </AnimatePresence>

          <AnimatePresence>
            {milestone > 0 && (
              <motion.div
                key={milestone}
                initial={{ opacity: 0, y: 0, scale: 0.8 }}
                animate={{ opacity: 1, y: -56, scale: 1 }}
                exit={{ opacity: 0 }}
                onAnimationComplete={() => setMilestone(0)}
                transition={{ duration: 0.7 }}
                className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-center gap-1.5 text-lg font-bold text-accent"
              >
                <Flame size={18} className="animate-flicker" fill="currentColor" aria-hidden />
                {milestone} streak!
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.input
          ref={inputRef}
          value={input}
          onChange={(e) => handleChange(e.target.value)}
          inputMode="numeric"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Answer"
          placeholder="?"
          animate={
            flash === 'incorrect'
              ? { x: [0, -8, 8, -6, 6, 0] }
              : flash === 'correct'
                ? { scale: [1, 1.04, 1] }
                : {}
          }
          transition={{ duration: 0.22 }}
          className={cn(
            'w-56 rounded-2xl border-2 bg-elevated/80 py-4 text-center font-mono text-4xl font-bold outline-none backdrop-blur transition-colors',
            flash === 'correct'
              ? 'border-success text-success'
              : flash === 'incorrect'
                ? 'border-danger text-danger'
                : 'border-border focus:border-accent',
          )}
        />
        <p className="text-sm text-muted">
          Type the answer — it advances automatically
        </p>
      </form>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-base font-bold text-content">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted">
        {label}
      </div>
    </div>
  );
}
