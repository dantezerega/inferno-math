import { useMemo } from 'react';
import { buildHeatmap, intensity, type HeatmapCell } from '@/stats/statistics';
import type { Statistics } from '@/types';
import { shortLabel } from '@/utils/date';
import { cn } from '@/utils/cn';

const LEVEL_CLASS: Record<number, string> = {
  0: 'bg-surface-2 border-border',
  1: 'bg-accent/25 border-accent/20',
  2: 'bg-accent/45 border-accent/30',
  3: 'bg-accent/70 border-accent/40',
  4: 'bg-accent border-accent',
};

/** GitHub-style contribution grid: 7 rows (weekdays) × N week columns. */
export function Heatmap({ stats }: { stats: Statistics }) {
  const cells = useMemo(() => buildHeatmap(stats, 119), [stats]);

  // Chunk into weeks of 7 for a column-per-week layout.
  const weeks = useMemo(() => {
    const out: HeatmapCell[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      out.push(cells.slice(i, i + 7));
    }
    return out;
  }, [cells]);

  return (
    <div className="space-y-3">
      <div className="flex gap-1 overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((cell) => {
              const level = intensity(cell.totalCorrect);
              return (
                <div
                  key={cell.date}
                  title={
                    cell.sessions > 0
                      ? `${shortLabel(cell.date)} · ${cell.totalCorrect} solved · best ${cell.bestScore}`
                      : `${shortLabel(cell.date)} · no practice`
                  }
                  className={cn(
                    'h-3.5 w-3.5 rounded-[3px] border transition-transform hover:scale-125',
                    LEVEL_CLASS[level],
                  )}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end gap-1.5 text-xs text-muted">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <div
            key={l}
            className={cn('h-3 w-3 rounded-[3px] border', LEVEL_CLASS[l])}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
