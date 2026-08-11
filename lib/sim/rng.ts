/**
 * Deterministic PRNG (mulberry32). The whole simulation is seeded so a given
 * seed reproduces the same city, the same agents, and the same decisions —
 * which is what makes the headless selftest and the reduced-motion static
 * frames reproducible.
 */
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random float in [min, max). */
export function range(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** Random integer in [0, n). */
export function int(rng: Rng, n: number): number {
  return Math.min(n - 1, Math.floor(rng() * n));
}
