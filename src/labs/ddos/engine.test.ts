// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { challenges } from './challenges';
import { DEFAULT_CONFIG, type Defense, runScenario } from './engine';

const windowAvail = (defense: Defense) => runScenario({ defense }).totals.attackWindowAvailability;

describe('simulate', () => {
  it('is deterministic for a given seed', () => {
    const a = runScenario({ seed: 7 });
    const b = runScenario({ seed: 7 });
    expect(a).toEqual(b);
  });

  it('produces one sample per tick', () => {
    const r = runScenario();
    expect(r.samples).toHaveLength(DEFAULT_CONFIG.ticks);
    expect(r.samples[0]?.tick).toBe(0);
    expect(r.samples.at(-1)?.tick).toBe(DEFAULT_CONFIG.ticks - 1);
  });

  it('serves every legitimate request before the flood starts', () => {
    const r = runScenario({ defense: 'none' });
    for (const s of r.samples) {
      if (s.tick < DEFAULT_CONFIG.attackStart) {
        expect(s.offeredAttack).toBe(0);
        expect(s.legitThroughput).toBe(1);
      }
    }
  });

  it('collapses legitimate availability during an undefended flood', () => {
    const r = runScenario({ defense: 'none' });
    expect(r.totals.attackWindowAvailability).toBeLessThan(0.3);
    expect(r.totals.legitDropped).toBeGreaterThan(0);
  });

  it('never queues past the queue limit or serves past capacity', () => {
    for (const defense of ['none', 'ratelimit', 'scaling'] as const) {
      const r = runScenario({ defense });
      const cap =
        defense === 'scaling'
          ? DEFAULT_CONFIG.capacity * DEFAULT_CONFIG.scaleFactor
          : DEFAULT_CONFIG.capacity;
      for (const s of r.samples) {
        expect(s.queueDepth).toBeLessThanOrEqual(DEFAULT_CONFIG.queueLimit);
        expect(s.servedLegit + s.servedAttack).toBeLessThanOrEqual(cap);
        expect(s.servedLegit).toBeLessThanOrEqual(s.offeredLegit + DEFAULT_CONFIG.queueLimit);
      }
      expect(r.totals.legitServed).toBeLessThanOrEqual(r.totals.legitOffered);
    }
  });
});

describe('defenses', () => {
  it('rate limiting restores legitimate availability', () => {
    expect(windowAvail('ratelimit')).toBeGreaterThan(0.6);
    expect(windowAvail('ratelimit')).toBeGreaterThan(windowAvail('none'));
  });

  it('scaling helps but less than rate limiting against a big flood', () => {
    const none = windowAvail('none');
    const scaling = windowAvail('scaling');
    const ratelimit = windowAvail('ratelimit');
    expect(scaling).toBeGreaterThan(none);
    expect(scaling).toBeLessThan(ratelimit);
  });

  it('scaling absorbs the flood by serving far more bot traffic than rate limiting', () => {
    expect(runScenario({ defense: 'scaling' }).totals.attackServed).toBeGreaterThan(
      runScenario({ defense: 'ratelimit' }).totals.attackServed,
    );
  });

  it('rate limiting drops far fewer legitimate requests than no defense', () => {
    expect(runScenario({ defense: 'ratelimit' }).totals.legitDropped).toBeLessThan(
      runScenario({ defense: 'none' }).totals.legitDropped,
    );
  });
});

describe('challenges', () => {
  it('are well-formed and unique', () => {
    expect(challenges.length).toBeGreaterThan(0);
    const ids = challenges.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of challenges) {
      expect(c.labId).toBe('ddos');
      expect(c.prompt.length).toBeGreaterThan(0);
      expect(c.solution.length).toBeGreaterThan(0);
      if (c.kind === 'answer') {
        expect(c.acceptedHashes && c.acceptedHashes.length).toBeTruthy();
      }
    }
  });
});
