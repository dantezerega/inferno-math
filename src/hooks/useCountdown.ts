import { useEffect, useRef, useState } from 'react';

/**
 * High-accuracy countdown driven by requestAnimationFrame against an absolute
 * end timestamp (so it can't drift like a setInterval counter). Returns the
 * remaining seconds as a float for smooth bar/ring animation, and fires
 * `onExpire` exactly once when it reaches zero.
 */
export function useCountdown(
  endTimeMs: number,
  active: boolean,
  onExpire: () => void,
): number {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, (endTimeMs - Date.now()) / 1000),
  );
  const firedRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    firedRef.current = false;
    if (!active) return;

    let raf = 0;
    const tick = () => {
      const left = Math.max(0, (endTimeMs - Date.now()) / 1000);
      setRemaining(left);
      if (left <= 0) {
        if (!firedRef.current) {
          firedRef.current = true;
          onExpireRef.current();
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [endTimeMs, active]);

  return remaining;
}
