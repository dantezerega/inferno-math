import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BarChart3, CalendarDays, Settings as SettingsIcon } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { Button } from '@/components/Button';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useGame } from '@/store/gameStore';
import { useSettings } from '@/store/settingsStore';
import { useStats } from '@/store/statsStore';
import { dailyConfig } from '@/game/dailyChallenge';
import { dateKey } from '@/utils/date';

const container = {
  enter: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
const item = {
  initial: { opacity: 0, y: 12 },
  enter: { opacity: 1, y: 0, transition: { ease: [0.22, 1, 0.36, 1] } },
};

export default function Home() {
  const navigate = useNavigate();
  const start = useGame((s) => s.start);
  const settings = useSettings();
  const stats = useStats((s) => s.stats);

  const today = dateKey();
  const dailyBest = stats.dailyChallengeBest[today];

  const startQuickPlay = () => {
    start({
      operations: settings.operations,
      difficulty: settings.difficulty,
      durationSeconds: settings.durationSeconds,
    });
    navigate('/play');
  };

  const startDaily = () => {
    start(dailyConfig(), true);
    navigate('/play');
  };

  return (
    <PageShell className="justify-center">
      <div className="mb-8 flex items-center justify-between">
        <Logo />
        <ThemeToggle />
      </div>

      <motion.div
        variants={container}
        initial="initial"
        animate="enter"
        className="flex flex-col items-center text-center"
      >
        <motion.h1
          variants={item}
          className="bg-gradient-to-br from-content to-muted bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-6xl"
        >
          Sharpen your
          <br /> mental math.
        </motion.h1>
        <motion.p
          variants={item}
          className="mt-4 max-w-md text-balance text-muted"
        >
          Solve as many problems as you can before the clock runs out. Fast,
          keyboard-first, and built for daily practice.
        </motion.p>

        <motion.div
          variants={item}
          className="mt-10 flex w-full max-w-sm flex-col gap-3"
        >
          <Button size="lg" onClick={startQuickPlay} autoFocus>
            Start session
            <ArrowRight size={18} aria-hidden />
          </Button>
          <Button size="lg" variant="secondary" onClick={startDaily}>
            <CalendarDays size={18} aria-hidden />
            Daily challenge
            {dailyBest != null && (
              <span className="ml-1 rounded-md bg-accent-soft px-2 py-0.5 text-xs font-bold text-accent">
                best {dailyBest}
              </span>
            )}
          </Button>
          <div className="mt-1 grid grid-cols-2 gap-3">
            <Button variant="ghost" onClick={() => navigate('/settings')}>
              <SettingsIcon size={16} aria-hidden />
              Settings
            </Button>
            <Button variant="ghost" onClick={() => navigate('/stats')}>
              <BarChart3 size={16} aria-hidden />
              Statistics
            </Button>
          </div>
        </motion.div>

        {stats.totalSessions > 0 && (
          <motion.div
            variants={item}
            className="mt-10 flex gap-6 text-sm text-muted"
          >
            <span>
              <strong className="text-content">{stats.bestScore}</strong> best
            </span>
            <span>
              <strong className="text-content">{stats.totalSessions}</strong>{' '}
              sessions
            </span>
            <span>
              <strong className="text-content">{stats.totalCorrect}</strong>{' '}
              solved
            </span>
          </motion.div>
        )}
      </motion.div>
    </PageShell>
  );
}
