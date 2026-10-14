// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { hashAnswer } from '../answers';
import { challenges } from './challenges';
import { CLAUSES, type ClauseId, EVENTS, type LogEvent, evaluateRule } from './engine';

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

  it('reports F1 as the harmonic mean of precision and recall', () => {
    const perfect = evaluateRule(['off-hours', 'foreign']);
    expect(perfect.precision).toBe(100);
    expect(perfect.recall).toBe(100);
    expect(perfect.f1).toBe(100);
    const broad = evaluateRule(['is-download', 'bytes-over-500']); // precision 60, recall 100
    expect(broad.f1).toBe(75);
    expect(evaluateRule([]).f1).toBeNull();
  });

  it('treats the whole 8pm hour (20:00–20:59) as off-hours', () => {
    const offHours = CLAUSES.find((c) => c.id === 'off-hours');
    const at = (hour: number): LogEvent => ({
      id: 't',
      user: 'u',
      action: 'download',
      bytesMB: 0,
      hour,
      failedLogins: 0,
      foreign: false,
      malicious: false,
    });
    expect(offHours?.test(at(20))).toBe(true);
    expect(offHours?.test(at(19))).toBe(false);
    expect(offHours?.test(at(5))).toBe(true);
  });

  it('gives the failed-logins clause a benign decoy that fires a false positive', () => {
    // bob is a daytime user who mistyped his password — benign but flagged by this clause alone.
    const r = evaluateRule(['failed-logins']);
    expect(r.fp).toBeGreaterThan(0);
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
