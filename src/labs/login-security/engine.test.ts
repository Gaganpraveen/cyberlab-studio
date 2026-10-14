// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { hashAnswer } from '../answers';
import { challenges } from './challenges';
import { LOGIN_FLAG, NO_DEFENSES, type Defenses, probeUser, runAttack } from './engine';

const only = (patch: Partial<Defenses>): Defenses => ({ ...NO_DEFENSES, ...patch });

describe('the dictionary attack', () => {
  it('cracks the weak password and authenticates with no defenses', () => {
    const r = runAttack(NO_DEFENSES);
    expect(r.found).toBe(true);
    expect(r.authenticated).toBe(true);
    expect(r.flag).toBe(LOGIN_FLAG);
  });
});

describe('each defense stops the same attack on its own', () => {
  it('rate limiting blocks before the password is reached', () => {
    const r = runAttack(only({ rateLimit: true }));
    expect(r.authenticated).toBe(false);
    expect(r.blockedBy).toBe('rate limiting');
  });

  it('account lockout blocks before the password is reached, and locks out the real user', () => {
    const r = runAttack(only({ lockout: true }));
    expect(r.authenticated).toBe(false);
    expect(r.blockedBy).toBe('account lockout');
    expect(r.legitimateUserLockedOut).toBe(true);
  });

  it('MFA lets the guess land but refuses the session', () => {
    const r = runAttack(only({ mfa: true }));
    expect(r.found).toBe(true);
    expect(r.authenticated).toBe(false);
    expect(r.blockedBy).toBe('multi-factor authentication');
  });
});

describe('username enumeration', () => {
  it('verbose errors reveal which usernames exist', () => {
    expect(probeUser('avery', false).leaks).toBe(true);
    expect(probeUser('avery', false).message).not.toBe(probeUser('nobody', false).message);
  });

  it('generic errors give the same response regardless of existence', () => {
    expect(probeUser('avery', true).message).toBe(probeUser('nobody', true).message);
    expect(probeUser('avery', true).leaks).toBe(false);
  });
});

describe('challenges', () => {
  it('are well-formed and answerable', () => {
    const ids = new Set(challenges.map((c) => c.id));
    expect(ids.size).toBe(challenges.length);
    for (const c of challenges) {
      expect(c.labId).toBe('login-security');
      expect(c.hints.length).toBeGreaterThan(0);
      expect(c.solution.length).toBeGreaterThan(20);
      if (c.kind !== 'task') expect(c.acceptedHashes?.length).toBeGreaterThan(0);
    }
    const byId = Object.fromEntries(challenges.map((c) => [c.id, c]));
    const accepts = (id: string, answer: string) =>
      byId[id]?.acceptedHashes?.includes(hashAnswer(answer)) ?? false;
    expect(accepts('login-crack', LOGIN_FLAG)).toBe(true);
    expect(accepts('login-stuffing', 'dictionary attack')).toBe(true);
    expect(accepts('login-enumeration', 'username enumeration')).toBe(true);
  });
});
