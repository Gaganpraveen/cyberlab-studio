/**
 * Seeded pseudo-random numbers for deterministic simulations.
 *
 * Mulberry32: tiny, fast, and good enough for teaching simulations. Never use
 * it for anything security-sensitive; use `crypto.getRandomValues` for that.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash a string seed (e.g. "class-demo") into a 32-bit integer. */
export function seedFromString(text: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Poisson-distributed integer with mean `lambda` (Knuth for small, normal approx for large). */
export function poisson(random: () => number, lambda: number): number {
  if (lambda <= 0) return 0;
  if (lambda > 60) {
    // Normal approximation keeps large simulated populations cheap.
    const u1 = Math.max(random(), Number.EPSILON);
    const u2 = random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * z));
  }
  const limit = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= random();
  } while (p > limit);
  return k - 1;
}
