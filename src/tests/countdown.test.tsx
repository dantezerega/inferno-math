import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { useCountdown } from '@/hooks/useCountdown';

function Harness({
  end,
  active,
  onExpire,
}: {
  end: number;
  active: boolean;
  onExpire: () => void;
}) {
  const remaining = useCountdown(end, active, onExpire);
  return <span data-testid="left">{remaining.toFixed(2)}</span>;
}

describe('useCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Drive rAF off the fake timer clock.
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
      setTimeout(() => cb(performance.now()), 16) as unknown as number,
    );
    vi.stubGlobal('cancelAnimationFrame', (id: number) =>
      clearTimeout(id as unknown as ReturnType<typeof setTimeout>),
    );
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('fires onExpire exactly once when time runs out', () => {
    const onExpire = vi.fn();
    const end = Date.now() + 1000;
    render(<Harness end={end} active onExpire={onExpire} />);

    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(onExpire).toHaveBeenCalledTimes(1);

    // Keep advancing — it must not fire again.
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('does not run while inactive', () => {
    const onExpire = vi.fn();
    render(<Harness end={Date.now() - 1000} active={false} onExpire={onExpire} />);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onExpire).not.toHaveBeenCalled();
  });
});
