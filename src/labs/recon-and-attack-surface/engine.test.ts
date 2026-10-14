// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { challenges } from './challenges';
import {
  HOSTS,
  KILL_CHAIN,
  OSINT_CARDS,
  applyHardening,
  attackSurfaceScore,
  exposedInternalHosts,
  footprintComplete,
  initialState,
  isMinimalExposure,
} from './engine';

function fullyHardened() {
  let s = initialState();
  for (const host of HOSTS) {
    if (host.intent === 'internal')
      s = applyHardening(s, { kind: 'make-internal', hostId: host.id });
  }
  s = applyHardening(s, { kind: 'strip-metadata' });
  return s;
}

describe('attackSurfaceScore', () => {
  it('scores the undefended baseline at 76', () => {
    expect(attackSurfaceScore(initialState())).toBe(76);
  });

  it('drops when an internal host is taken off the internet', () => {
    const before = attackSurfaceScore(initialState());
    const after = attackSurfaceScore(
      applyHardening(initialState(), { kind: 'make-internal', hostId: 'db' }),
    );
    expect(after).toBeLessThan(before);
  });

  it('drops when a risky port is closed', () => {
    const before = attackSurfaceScore(initialState());
    const after = attackSurfaceScore(
      applyHardening(initialState(), { kind: 'close-port', hostId: 'dev-admin', port: 3389 }),
    );
    expect(before - after).toBe(6); // RDP is high risk
  });

  it('reaches 13 once every internal host is internal and metadata is stripped', () => {
    expect(attackSurfaceScore(fullyHardened())).toBe(13);
  });
});

describe('applyHardening', () => {
  it('does not mutate the input state', () => {
    const s = initialState();
    const snapshot = JSON.stringify(s);
    applyHardening(s, { kind: 'make-internal', hostId: 'db' });
    expect(JSON.stringify(s)).toBe(snapshot);
  });
});

describe('isMinimalExposure', () => {
  it('is false at the start (internal hosts exposed, metadata leaking)', () => {
    expect(isMinimalExposure(initialState())).toBe(false);
  });

  it('is true once internal hosts are internal, high-risk ports gone, metadata stripped', () => {
    expect(isMinimalExposure(fullyHardened())).toBe(true);
  });

  it('stays false if metadata is still leaking', () => {
    let s = initialState();
    for (const host of HOSTS) {
      if (host.intent === 'internal')
        s = applyHardening(s, { kind: 'make-internal', hostId: host.id });
    }
    expect(isMinimalExposure(s)).toBe(false);
  });
});

describe('exposedInternalHosts', () => {
  it('flags the three internal hosts that are internet-exposed', () => {
    const ids = exposedInternalHosts(initialState())
      .map((x) => x.id)
      .sort();
    expect(ids).toEqual(['db', 'dev-admin', 'staging']);
  });
});

describe('footprintComplete', () => {
  it('is complete only when every host has been revealed', () => {
    expect(footprintComplete(OSINT_CARDS.map((c) => c.id))).toBe(true);
    expect(footprintComplete(['dns'])).toBe(false);
    expect(footprintComplete([])).toBe(false);
  });
});

describe('kill chain', () => {
  it('starts with reconnaissance and has seven phases', () => {
    expect(KILL_CHAIN[0]).toBe('Reconnaissance');
    expect(KILL_CHAIN).toHaveLength(7);
  });
});

describe('fixtures stay inside reserved ranges', () => {
  it('uses only example.test hosts and reserved IPs', () => {
    for (const host of HOSTS) {
      expect(host.host.endsWith('.example.test')).toBe(true);
      expect(host.ip.startsWith('203.0.113.') || host.ip.startsWith('10.')).toBe(true);
    }
  });
});

describe('challenges', () => {
  it('are well-formed and unique', () => {
    expect(challenges.length).toBeGreaterThan(0);
    const ids = challenges.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of challenges) {
      expect(c.labId).toBe('recon-and-attack-surface');
      expect(c.prompt.length).toBeGreaterThan(0);
      expect(c.solution.length).toBeGreaterThan(0);
      if (c.kind === 'answer') expect(c.acceptedHashes && c.acceptedHashes.length).toBeTruthy();
      if (c.kind === 'flag') expect(c.acceptedHashes && c.acceptedHashes.length).toBeTruthy();
    }
  });
});
