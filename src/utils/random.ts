/**
 * Deterministic, seedable PRNG (mulberry32). Used so the daily challenge
 * produces an identical problem sequence for everyone on a given day, while
 * normal play uses a time-seeded instance.
 */
export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  /** Random element of a non-empty array. */
  pick<T>(items: readonly T[]): T;
}

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  const next = (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    pick(items) {
      return items[Math.floor(next() * items.length)] as (typeof items)[number];
    },
  };
}

/** Hash an arbitrary string into a 32-bit seed (xfnv1a). */
export function hashSeed(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Non-deterministic RNG seeded from the clock. */
export function randomRng(): Rng {
  return mulberry32((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0);
}
