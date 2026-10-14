// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { challenges } from './challenges';
import {
  ATTACKER_MAC,
  DEVICES,
  GATEWAY_IP,
  HONEST_IP,
  PROTECTED_HOST,
  deviceByRole,
  duplicateMacs,
  enableDai,
  enableDnssec,
  initialArp,
  initialDns,
  isOnPath,
  poisonDns,
  resolve,
  spoofArp,
} from './engine';

describe('ARP spoofing', () => {
  it('starts with an honest table and no attacker on the path', () => {
    const arp = initialArp();
    expect(arp.table[GATEWAY_IP]).toBe(deviceByRole('gateway').mac);
    expect(isOnPath(arp)).toBe(false);
  });

  it('puts the attacker on the path when inspection is off', () => {
    const { state, succeeded } = spoofArp(initialArp());
    expect(succeeded).toBe(true);
    expect(isOnPath(state)).toBe(true);
    expect(state.table[GATEWAY_IP]).toBe(ATTACKER_MAC);
  });

  it('is rejected once dynamic ARP inspection is enabled', () => {
    const hardened = enableDai(initialArp());
    expect(hardened.dai).toBe(true);
    const { succeeded, state } = spoofArp(hardened);
    expect(succeeded).toBe(false);
    expect(isOnPath(state)).toBe(false);
  });

  it('does not mutate the input state', () => {
    const arp = initialArp();
    const snapshot = JSON.stringify(arp);
    spoofArp(arp);
    expect(JSON.stringify(arp)).toBe(snapshot);
  });

  it('exposes the duplicate MAC after a spoof (the tell-tale)', () => {
    expect(duplicateMacs(initialArp())).toHaveLength(0);
    const { state } = spoofArp(initialArp());
    expect(duplicateMacs(state)).toContain(ATTACKER_MAC);
  });
});

describe('DNS cache poisoning', () => {
  it('resolves the honest IP before any attack', () => {
    expect(resolve(initialDns(), PROTECTED_HOST)).toBe(HONEST_IP);
  });

  it('caches a forged record when DNSSEC is off', () => {
    const { state, succeeded } = poisonDns(initialDns(), PROTECTED_HOST, '192.0.2.66');
    expect(succeeded).toBe(true);
    expect(resolve(state, PROTECTED_HOST)).toBe('192.0.2.66');
  });

  it('rejects the forged record when DNSSEC is on', () => {
    const hardened = enableDnssec(initialDns());
    const { state, succeeded } = poisonDns(hardened, PROTECTED_HOST, '192.0.2.66');
    expect(succeeded).toBe(false);
    expect(resolve(state, PROTECTED_HOST)).toBe(HONEST_IP);
  });
});

describe('fixtures stay inside reserved ranges', () => {
  it('uses only 192.0.2.0/24 documentation addresses', () => {
    for (const d of DEVICES) expect(d.ip.startsWith('192.0.2.')).toBe(true);
  });
});

describe('challenges', () => {
  it('are well-formed and unique', () => {
    expect(challenges.length).toBeGreaterThan(0);
    const ids = challenges.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of challenges) {
      expect(c.labId).toBe('spoofing-and-mitm');
      expect(c.prompt.length).toBeGreaterThan(0);
      expect(c.solution.length).toBeGreaterThan(0);
      if (c.kind !== 'task') expect(c.acceptedHashes && c.acceptedHashes.length).toBeTruthy();
    }
  });
});
