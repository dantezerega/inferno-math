import { describe, expect, it } from 'vitest';
import {
  dateKey,
  formatClock,
  formatDuration,
  fromDateKey,
} from '@/utils/date';

describe('dateKey / fromDateKey', () => {
  it('formats a local date as YYYY-MM-DD', () => {
    expect(dateKey(new Date(2026, 5, 15))).toBe('2026-06-15');
    expect(dateKey(new Date(2026, 0, 3))).toBe('2026-01-03');
  });

  it('round-trips', () => {
    const d = fromDateKey('2026-06-15');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(5);
    expect(d.getDate()).toBe(15);
  });
});

describe('formatClock', () => {
  it('renders M:SS, rounding up partial seconds', () => {
    expect(formatClock(65)).toBe('1:05');
    expect(formatClock(60)).toBe('1:00');
    expect(formatClock(9.2)).toBe('0:10');
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(-5)).toBe('0:00');
  });
});

describe('formatDuration', () => {
  it('renders compact human durations', () => {
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(90)).toBe('1m 30s');
    expect(formatDuration(3700)).toBe('1h 1m');
  });
});
