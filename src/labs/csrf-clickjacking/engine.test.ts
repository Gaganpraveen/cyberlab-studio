// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { hashAnswer } from '../answers';
import { challenges } from './challenges';
import { CLICKJACK_FLAG, CSRF_FLAG, CSRF_NONE, forgeTransfer, framingAttack } from './engine';

describe('CSRF', () => {
  it('forges a state change by riding the session cookie when undefended', () => {
    const r = forgeTransfer(CSRF_NONE);
    expect(r.carriedCookie).toBe(true);
    expect(r.accepted).toBe(true);
    expect(r.flag).toBe(CSRF_FLAG);
  });

  it('SameSite alone stops the cookie from riding cross-site', () => {
    const r = forgeTransfer({ sameSite: true, csrfToken: false });
    expect(r.carriedCookie).toBe(false);
    expect(r.accepted).toBe(false);
  });

  it('an anti-CSRF token alone rejects the forged request', () => {
    const r = forgeTransfer({ sameSite: false, csrfToken: true });
    expect(r.accepted).toBe(false);
  });
});

describe('clickjacking', () => {
  it('steals a click when the site can be framed', () => {
    const r = framingAttack(false);
    expect(r.framed).toBe(true);
    expect(r.clickStolen).toBe(true);
    expect(r.flag).toBe(CLICKJACK_FLAG);
  });

  it('is blocked when framing is refused', () => {
    const r = framingAttack(true);
    expect(r.framed).toBe(false);
    expect(r.clickStolen).toBe(false);
  });
});

describe('challenges', () => {
  it('are well-formed and answerable', () => {
    const ids = new Set(challenges.map((c) => c.id));
    expect(ids.size).toBe(challenges.length);
    for (const c of challenges) {
      expect(c.labId).toBe('csrf-clickjacking');
      expect(c.hints.length).toBeGreaterThan(0);
      expect(c.solution.length).toBeGreaterThan(20);
      if (c.kind !== 'task') expect(c.acceptedHashes?.length).toBeGreaterThan(0);
    }
    const byId = Object.fromEntries(challenges.map((c) => [c.id, c]));
    const accepts = (id: string, answer: string) =>
      byId[id]?.acceptedHashes?.includes(hashAnswer(answer)) ?? false;
    expect(accepts('csrf-forge', CSRF_FLAG)).toBe(true);
    expect(accepts('csrf-term', 'cross-site request forgery')).toBe(true);
    expect(accepts('clickjack-forge', CLICKJACK_FLAG)).toBe(true);
  });
});
