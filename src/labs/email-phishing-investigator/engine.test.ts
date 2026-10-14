// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { hashAnswer } from '../answers';
import { challenges } from './challenges';
import { EMAILS, type Verdict, linkIsDeceptive, scoreTriage } from './engine';

const byId = (id: string) => {
  const e = EMAILS.find((x) => x.id === id);
  if (!e) throw new Error(`no email ${id}`);
  return e;
};

describe('email fixtures', () => {
  it('has two phishing messages and one legitimate', () => {
    expect(EMAILS.filter((e) => e.isPhish).length).toBe(2);
    expect(EMAILS.filter((e) => !e.isPhish).length).toBe(1);
  });

  it('the legitimate message has no indicators and passes all auth', () => {
    const e = byId('legit-invoice');
    expect(e.indicators.length).toBe(0);
    expect(e.spf).toBe('pass');
    expect(e.dkim).toBe('pass');
    expect(e.dmarc).toBe('pass');
  });

  it('flags a link whose visible URL host differs from its href host', () => {
    expect(linkIsDeceptive({ text: 'https://acme.com/payroll', href: 'http://evil.test/x' })).toBe(
      true,
    );
    expect(linkIsDeceptive({ text: 'https://acme.com/a', href: 'https://acme.com/a' })).toBe(false);
    // Non-URL display text is not itself deceptive.
    expect(linkIsDeceptive({ text: 'Verify account', href: 'https://evil.test' })).toBe(false);
  });
});

describe('triage scoring', () => {
  const correctAll: Record<string, Verdict> = {
    'payroll-spoof': 'phish',
    'it-reset': 'phish',
    'legit-invoice': 'safe',
  };

  it('reveals the flag only when every verdict is correct', () => {
    const s = scoreTriage(correctAll);
    expect(s.correct).toBe(3);
    expect(s.allCorrect).toBe(true);
    expect(s.flag).toBe('CTF{headers_dont_lie}');
  });

  it('counts a legit-marked-phish as a false positive', () => {
    const s = scoreTriage({ ...correctAll, 'legit-invoice': 'phish' });
    expect(s.falsePositives).toBe(1);
    expect(s.allCorrect).toBe(false);
    expect(s.flag).toBeUndefined();
  });

  it('counts a missed phish as a false negative', () => {
    const s = scoreTriage({ ...correctAll, 'payroll-spoof': 'safe' });
    expect(s.falseNegatives).toBe(1);
    expect(s.allCorrect).toBe(false);
  });

  it('ignores undecided messages', () => {
    const s = scoreTriage({ 'payroll-spoof': 'phish' });
    expect(s.decided).toBe(1);
    expect(s.correct).toBe(1);
    expect(s.allCorrect).toBe(false);
  });
});

describe('challenges', () => {
  it('are well-formed and answerable', () => {
    const ids = new Set(challenges.map((c) => c.id));
    expect(ids.size).toBe(challenges.length);
    for (const c of challenges) {
      expect(c.labId).toBe('email-phishing-investigator');
      expect(c.hints.length).toBeGreaterThan(0);
      expect(c.solution.length).toBeGreaterThan(20);
      if (c.kind !== 'task') expect(c.acceptedHashes?.length).toBeGreaterThan(0);
    }
    const map = Object.fromEntries(challenges.map((c) => [c.id, c]));
    const accepts = (id: string, answer: string) =>
      map[id]?.acceptedHashes?.includes(hashAnswer(answer)) ?? false;
    expect(accepts('phish-flag', 'CTF{headers_dont_lie}')).toBe(true);
    expect(accepts('phish-spf', 'SPF')).toBe(true);
    expect(accepts('phish-dmarc', 'DMARC')).toBe(true);
    expect(accepts('phish-lookalike', 'lookalike')).toBe(true);
    expect(accepts('phish-fp', 'false positive')).toBe(true);
  });
});
