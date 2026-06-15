import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronLeft } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageShell } from '@/components/PageShell';
import { Card, StatTile } from '@/components/Card';
import { Button } from '@/components/Button';
import { Heatmap } from '@/components/Heatmap';
import { useStats } from '@/store/statsStore';
import {
  averageAccuracy,
  averageScore,
  scoreTrend,
} from '@/stats/statistics';
import { formatDuration, shortLabel } from '@/utils/date';

export default function StatisticsPage() {
  const navigate = useNavigate();
  const stats = useStats((s) => s.stats);
  const reset = useStats((s) => s.reset);

  const trend = useMemo(
    () =>
      scoreTrend(stats, 14).map((d) => ({
        label: shortLabel(d.date),
        score: d.score,
      })),
    [stats],
  );

  const hasData = stats.totalSessions > 0;

  const handleReset = () => {
    if (window.confirm('Erase all saved statistics? This cannot be undone.')) {
      reset();
    }
  };

  return (
    <PageShell wide>
      <div className="mb-8 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-sm font-medium text-muted hover:text-content"
        >
          <ChevronLeft size={16} aria-hidden />
          Home
        </button>
        <h1 className="text-xl font-bold">Statistics</h1>
        <button
          onClick={handleReset}
          className="text-sm font-medium text-muted hover:text-danger"
        >
          Reset
        </button>
      </div>

      {!hasData ? (
        <Card className="p-10 text-center">
          <p className="text-muted">
            No sessions yet. Play a round to start tracking your progress.
          </p>
          <Button className="mt-5" onClick={() => navigate('/play')}>
            Start your first session
            <ArrowRight size={18} aria-hidden />
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <StatTile label="Sessions" value={stats.totalSessions} />
            <StatTile label="Solved" value={stats.totalCorrect} />
            <StatTile label="Best score" value={stats.bestScore} />
            <StatTile label="Avg score" value={averageScore(stats).toFixed(1)} />
            <StatTile
              label="Avg accuracy"
              value={`${averageAccuracy(stats).toFixed(0)}%`}
            />
            <StatTile label="Best streak" value={stats.bestStreak} />
            <StatTile
              label="Practice time"
              value={formatDuration(stats.totalPracticeSeconds)}
            />
            <StatTile label="Incorrect" value={stats.totalIncorrect} />
          </div>

          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
              Best score · last 14 days
            </h2>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={trend}
                  margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="rgb(var(--accent))"
                        stopOpacity={0.5}
                      />
                      <stop
                        offset="100%"
                        stopColor="rgb(var(--accent))"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgb(var(--border))"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: 'rgb(var(--muted))', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: 'rgb(var(--muted))', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={32}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'rgb(var(--elevated))',
                      border: '1px solid rgb(var(--border))',
                      borderRadius: 12,
                      color: 'rgb(var(--content))',
                      fontSize: 12,
                    }}
                    cursor={{ stroke: 'rgb(var(--accent))', strokeWidth: 1 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="rgb(var(--accent))"
                    strokeWidth={2.5}
                    fill="url(#g)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
              Practice heatmap · last 17 weeks
            </h2>
            <Heatmap stats={stats} />
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
              Personal records
            </h2>
            <ul className="space-y-2 text-sm">
              <Record label="Highest score" value={stats.bestScore} />
              <Record label="Longest streak" value={stats.bestStreak} />
              <Record
                label="Most solved in a day"
                value={Math.max(
                  0,
                  ...Object.values(stats.daily).map((d) => d.totalCorrect),
                )}
              />
              <Record
                label="Best daily challenge"
                value={Math.max(
                  0,
                  ...Object.values(stats.dailyChallengeBest),
                  0,
                )}
              />
            </ul>
          </Card>
        </div>
      )}
    </PageShell>
  );
}

function Record({ label, value }: { label: string; value: number }) {
  return (
    <li className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0">
      <span className="text-muted">{label}</span>
      <span className="font-mono font-bold text-content">{value}</span>
    </li>
  );
}
