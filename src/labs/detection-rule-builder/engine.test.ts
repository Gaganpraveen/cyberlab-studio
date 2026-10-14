// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { hashAnswer } from '../answers';
import { challenges } from './challenges';
import { type ClauseId, EVENTS, evaluateRule } from './engine';

describe('rule evaluation', () => {
  it('no clauses means no alerts', () => {
    const r = evaluateRule([]);
    expect(r.alertCount).toBe(0);
    expect(r.recall).toBe(0);
  });

  it('a broad rule catches everything malicious but with false positives', () => {
    // download AND >500MB flags the night exfil but also big daytime transfers.
    const r = evaluateRule(['is-download', 'bytes-over-500']);
    expect(r.recall).toBe(100);
    expect(r.fp).toBeGreaterThan(0);
    expect(r.precision).toBeLessThan(100);
  });

  it('the tuned rule catches all three with zero false positives', () => {
    const clauses: ClauseId[] = ['is-download', 'bytes-over-500', 'off-hours'];
    const r = evaluateRule(clauses);
    expect(r.tp).toBe(3);
    expect(r.fp).toBe(0);
    expect(r.fn).toBe(0);
    expect(r.precision).toBe(100);
    expect(r.recall).toBe(100);
    expect(r.perfect).toBe(true);
  });

  it('counts cover every event exactly once', () => {
    const r = evaluateRule(['off-hours']);
    expect(r.tp + r.fp + r.fn + r.tn).toBe(EVENTS.length);
  });
});

describe('challenges', () => {
  it('are well-formed and answerable', () => {
    const ids = new Set(challenges.map((c) => c.id));
    expect(ids.size).toBe(challenges.length);
    for (const c of challenges) {
      expect(c.labId).toBe('detection-rule-builder');
      expect(c.hints.length).toBeGreaterThan(0);
      expect(c.solution.length).toBeGreaterThan(20);
      if (c.kind !== 'task') expect(c.acceptedHashes?.length).toBeGreaterThan(0);
    }
    const byId = Object.fromEntries(challenges.map((c) => [c.id, c]));
    const accepts = (id: string, answer: string) =>
      byId[id]?.acceptedHashes?.includes(hashAnswer(answer)) ?? false;
    expect(accepts('detect-flag', 'CTF{high_fidelity_detection}')).toBe(true);
    expect(accepts('detect-fp-term', 'false positive')).toBe(true);
    expect(accepts('detect-precision-term', 'precision')).toBe(true);
    expect(accepts('detect-recall-term', 'recall')).toBe(true);
  });
});
