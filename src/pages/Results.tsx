import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RotateCcw, Star } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { Card, StatTile } from '@/components/Card';
import { Button } from '@/components/Button';
import { useGame } from '@/store/gameStore';
import { useSettings } from '@/store/settingsStore';
import { accuracy, answersPerMinute } from '@/game/scoring';
import { formatDuration } from '@/utils/date';

const container = {
  enter: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};
const item = {
  initial: { opacity: 0, y: 10 },
  enter: { opacity: 1, y: 0 },
};

export default function Results() {
  const navigate = useNavigate();
  const location = useLocation();
  const result = useGame((s) => s.lastResult);
  const daily = useGame((s) => s.daily);
  const start = useGame((s) => s.start);
  const reset = useGame((s) => s.reset);
  const settings = useSettings();

  const newBest = (location.state as { newBest?: boolean } | null)?.newBest;

  // No result to show (e.g. direct navigation) — bounce home.
  useEffect(() => {
    if (!result) navigate('/', { replace: true });
  }, [result, navigate]);

  if (!result) return null;

  const acc = accuracy(result.correct, result.incorrect);
  const apm = answersPerMinute(result.correct, result.durationSeconds);

  const playAgain = () => {
    start(
      {
        operations: settings.operations,
        difficulty: settings.difficulty,
        durationSeconds: settings.durationSeconds,
      },
      daily,
    );
    navigate('/play');
  };

  return (
    <PageShell>
      <motion.div variants={container} initial="initial" animate="enter">
        <motion.div variants={item} className="text-center">
          {newBest && result.score > 0 && (
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-flame px-4 py-1.5 text-sm font-bold text-white shadow-glow"
            >
              <Star size={15} fill="currentColor" aria-hidden />
              New personal best!
            </motion.div>
          )}
          <p className="text-sm font-medium uppercase tracking-wide text-muted">
            {daily ? 'Daily challenge complete' : 'Session complete'}
          </p>
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="mt-2 font-mono text-7xl font-extrabold tabular-nums text-content"
          >
            {result.score}
          </motion.div>
          <p className="mt-1 text-muted">problems solved</p>
        </motion.div>

        <motion.div variants={item} className="mt-8">
          <Card className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3">
            <StatTile label="Correct" value={result.correct} />
            <StatTile label="Incorrect" value={result.incorrect} />
            <StatTile label="Accuracy" value={`${acc.toFixed(0)}%`} />
            <StatTile label="Per minute" value={apm.toFixed(1)} />
            <StatTile label="Best streak" value={result.bestStreak} />
            <StatTile
              label="Time played"
              value={formatDuration(result.durationSeconds)}
            />
          </Card>
        </motion.div>

        <motion.div
          variants={item}
          className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center"
        >
          <Button size="lg" onClick={playAgain}>
            <RotateCcw size={18} aria-hidden />
            Play again
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => {
              reset();
              navigate('/settings');
            }}
          >
            Change settings
          </Button>
          <Button
            size="lg"
            variant="ghost"
            onClick={() => {
              reset();
              navigate('/');
            }}
          >
            Home
          </Button>
        </motion.div>
      </motion.div>
    </PageShell>
  );
}
