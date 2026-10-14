/**
 * A deterministic discrete-time queue model of a volumetric denial-of-service
 * attack and its mitigations. Nothing here touches the network: it is a
 * teaching simulation of a single fictional service with finite capacity.
 *
 * The arc: a steady crowd of real users shares a small service with a flood of
 * bot traffic. Under a fair queue the service can only serve its capacity each
 * tick, so when the flood arrives the users' share collapses. Rate limiting
 * (capping how much any one source may send) restores it; simply scaling up
 * capacity helps but cannot keep pace with a large enough flood.
 */

/** A small, seeded PRNG so each run is reproducible from its seed. */
function makeRng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

export type Defense = 'none' | 'ratelimit' | 'scaling';

export interface SimConfig {
  /** Total ticks to simulate. */
  ticks: number;
  /** Requests the service can serve per tick (its baseline capacity). */
  capacity: number;
  /** Maximum requests that can wait in the queue; the rest are dropped. */
  queueLimit: number;
  /** Number of legitimate users, each sending one request per tick. */
  legitSources: number;
  /** Number of attacking bots. */
  attackSources: number;
  /** Requests each bot sends per tick while the attack is active. */
  attackRate: number;
  /** Tick the attack starts (inclusive) and ends (exclusive). */
  attackStart: number;
  attackEnd: number;
  /** Which mitigation is applied. */
  defense: Defense;
  /** Per-source request cap per tick when defense is 'ratelimit'. */
  rateLimit: number;
  /** Capacity multiplier when defense is 'scaling'. */
  scaleFactor: number;
  /** Seed for the reproducible per-tick jitter on legitimate traffic. */
  seed: number;
}

export const DEFAULT_CONFIG: SimConfig = {
  ticks: 48,
  capacity: 30,
  queueLimit: 90,
  legitSources: 24,
  attackSources: 6,
  attackRate: 30,
  attackStart: 16,
  attackEnd: 40,
  defense: 'none',
  rateLimit: 2,
  scaleFactor: 3,
  seed: 1,
};

export interface TickSample {
  tick: number;
  attacking: boolean;
  offeredLegit: number;
  offeredAttack: number;
  servedLegit: number;
  servedAttack: number;
  droppedLegit: number;
  queueDepth: number;
  /** Fraction of this tick's legitimate requests that were served. */
  legitThroughput: number;
}

export interface SimTotals {
  legitOffered: number;
  legitServed: number;
  legitDropped: number;
  attackOffered: number;
  attackServed: number;
  /** Served ÷ offered for legitimate traffic across the whole run (0..1). */
  legitAvailability: number;
  /** The same ratio measured only during the attack window (0..1). */
  attackWindowAvailability: number;
  peakQueue: number;
}

export interface SimResult {
  samples: TickSample[];
  totals: SimTotals;
}

function proportion(part: number, whole: number, slots: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * slots);
}

/** Run the queue model and return per-tick samples plus run totals. */
export function simulate(config: SimConfig): SimResult {
  const rng = makeRng(config.seed);
  const effectiveCapacity =
    config.defense === 'scaling' ? config.capacity * config.scaleFactor : config.capacity;
  const botRate =
    config.defense === 'ratelimit'
      ? Math.min(config.attackRate, config.rateLimit)
      : config.attackRate;

  let queueLegit = 0;
  let queueAttack = 0;

  const totals: SimTotals = {
    legitOffered: 0,
    legitServed: 0,
    legitDropped: 0,
    attackOffered: 0,
    attackServed: 0,
    legitAvailability: 0,
    attackWindowAvailability: 0,
    peakQueue: 0,
  };
  let windowOffered = 0;
  let windowServed = 0;

  const samples: TickSample[] = [];

  for (let t = 0; t < config.ticks; t++) {
    const attacking = t >= config.attackStart && t < config.attackEnd;

    // Real users send one request each, with a little reproducible jitter so
    // the traffic is not a flat line. Bots are rate-limited per source.
    const offeredLegit = config.legitSources + Math.floor(rng() * 6);
    const offeredAttack = attacking ? config.attackSources * botRate : 0;

    totals.legitOffered += offeredLegit;
    totals.attackOffered += offeredAttack;

    // Admit arrivals into the queue, dropping overflow proportionally so the
    // flood cannot crowd the queue entirely at the users' expense in the drop.
    const space = Math.max(0, config.queueLimit - (queueLegit + queueAttack));
    const incoming = offeredLegit + offeredAttack;
    let admitLegit = offeredLegit;
    let admitAttack = offeredAttack;
    if (incoming > space) {
      admitLegit = proportion(offeredLegit, incoming, space);
      admitAttack = space - admitLegit;
    }
    const droppedLegit = offeredLegit - admitLegit;
    totals.legitDropped += droppedLegit;
    queueLegit += admitLegit;
    queueAttack += admitAttack;

    const queuedBeforeServe = queueLegit + queueAttack;
    totals.peakQueue = Math.max(totals.peakQueue, queuedBeforeServe);

    // Serve up to capacity, split fairly in proportion to what is waiting.
    const slots = Math.min(effectiveCapacity, queuedBeforeServe);
    let servedLegit = proportion(queueLegit, queuedBeforeServe, slots);
    let servedAttack = slots - servedLegit;
    servedLegit = Math.min(servedLegit, queueLegit);
    servedAttack = Math.min(servedAttack, queueAttack);
    queueLegit -= servedLegit;
    queueAttack -= servedAttack;

    totals.legitServed += servedLegit;
    totals.attackServed += servedAttack;
    if (attacking) {
      windowOffered += offeredLegit;
      windowServed += servedLegit;
    }

    samples.push({
      tick: t,
      attacking,
      offeredLegit,
      offeredAttack,
      servedLegit,
      servedAttack,
      droppedLegit,
      queueDepth: queueLegit + queueAttack,
      legitThroughput: offeredLegit > 0 ? servedLegit / offeredLegit : 1,
    });
  }

  totals.legitAvailability = totals.legitOffered > 0 ? totals.legitServed / totals.legitOffered : 1;
  totals.attackWindowAvailability = windowOffered > 0 ? windowServed / windowOffered : 1;
  return { samples, totals };
}

/** Convenience: run with the defaults, overriding only the fields given. */
export function runScenario(overrides: Partial<SimConfig> = {}): SimResult {
  return simulate({ ...DEFAULT_CONFIG, ...overrides });
}
