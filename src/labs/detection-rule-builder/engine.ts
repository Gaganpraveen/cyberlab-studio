/**
 * A deterministic detection-engineering model: a fixed set of labeled log
 * events and a rule built by combining clauses with AND. Evaluating the rule
 * against the ground-truth labels yields the confusion matrix and the quality
 * metrics (precision, recall, F1) that decide whether an alert is worth a human
 * analyst's time. Nothing here is live — it is a scoring exercise over a fixed
 * dataset, which is exactly how detections are tuned before deployment.
 *
 * The scenario is data exfiltration by a compromised account. A good rule
 * catches all three malicious events with no false positives; broad rules flood
 * the analyst with benign large daytime transfers.
 */

export const DETECTION_FLAG = 'CTF{high_fidelity_detection}';

export interface LogEvent {
  id: string;
  user: string;
  action: 'login' | 'download' | 'upload';
  bytesMB: number;
  hour: number; // 0–23
  failedLogins: number;
  foreign: boolean;
  /** Ground truth: is this event actually part of the attack? */
  malicious: boolean;
}

export const EVENTS: LogEvent[] = [
  // Malicious: a compromised account exfiltrating at night from abroad.
  {
    id: 'm1',
    user: 'svc-reports',
    action: 'download',
    bytesMB: 800,
    hour: 2,
    failedLogins: 0,
    foreign: true,
    malicious: true,
  },
  {
    id: 'm2',
    user: 'svc-reports',
    action: 'download',
    bytesMB: 650,
    hour: 23,
    failedLogins: 0,
    foreign: true,
    malicious: true,
  },
  {
    id: 'm3',
    user: 'svc-reports',
    action: 'download',
    bytesMB: 900,
    hour: 3,
    failedLogins: 6,
    foreign: true,
    malicious: true,
  },
  // Benign — each is a decoy for a single over-broad clause.
  {
    id: 'b1',
    user: 'alice',
    action: 'download',
    bytesMB: 40,
    hour: 14,
    failedLogins: 0,
    foreign: false,
    malicious: false,
  },
  {
    id: 'b2',
    user: 'backup',
    action: 'download',
    bytesMB: 2000,
    hour: 13,
    failedLogins: 0,
    foreign: false,
    malicious: false,
  }, // big, but daytime
  {
    id: 'b3',
    user: 'bob',
    action: 'login',
    bytesMB: 0,
    hour: 9,
    failedLogins: 2,
    foreign: false,
    malicious: false,
  },
  {
    id: 'b4',
    user: 'carol',
    action: 'download',
    bytesMB: 300,
    hour: 19,
    failedLogins: 0,
    foreign: false,
    malicious: false,
  },
  {
    id: 'b5',
    user: 'dpatel',
    action: 'download',
    bytesMB: 700,
    hour: 11,
    failedLogins: 0,
    foreign: true,
    malicious: false,
  }, // foreign + big, but daytime
  {
    id: 'b6',
    user: 'erin',
    action: 'upload',
    bytesMB: 120,
    hour: 22,
    failedLogins: 0,
    foreign: false,
    malicious: false,
  }, // night, but upload
];

export type ClauseId = 'is-download' | 'bytes-over-500' | 'off-hours' | 'failed-logins' | 'foreign';

export interface Clause {
  id: ClauseId;
  label: string;
  test: (e: LogEvent) => boolean;
}

export const CLAUSES: Clause[] = [
  { id: 'is-download', label: 'action is download', test: (e) => e.action === 'download' },
  { id: 'bytes-over-500', label: 'bytes transferred > 500 MB', test: (e) => e.bytesMB > 500 },
  {
    id: 'off-hours',
    label: 'outside business hours (before 6am or after 8pm)',
    test: (e) => e.hour < 6 || e.hour > 20,
  },
  { id: 'failed-logins', label: 'failed logins ≥ 5', test: (e) => e.failedLogins >= 5 },
  { id: 'foreign', label: 'source is a foreign country', test: (e) => e.foreign },
];

export interface EventVerdict {
  event: LogEvent;
  alert: boolean;
  /** 'tp' | 'fp' | 'fn' | 'tn' */
  outcome: 'tp' | 'fp' | 'fn' | 'tn';
}

export interface RuleReport {
  verdicts: EventVerdict[];
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  /** Percent 0–100, or null when undefined (no alerts fired). */
  precision: number | null;
  /** Percent 0–100. */
  recall: number;
  alertCount: number;
  perfect: boolean;
}

/** Evaluate a rule (the AND of the enabled clauses) against the labeled events. */
export function evaluateRule(enabled: ClauseId[]): RuleReport {
  const active = CLAUSES.filter((c) => enabled.includes(c.id));
  const verdicts: EventVerdict[] = EVENTS.map((event) => {
    // No clauses => no alerts. Otherwise the event must satisfy every clause.
    const alert = active.length > 0 && active.every((c) => c.test(event));
    let outcome: EventVerdict['outcome'];
    if (alert && event.malicious) outcome = 'tp';
    else if (alert && !event.malicious) outcome = 'fp';
    else if (!alert && event.malicious) outcome = 'fn';
    else outcome = 'tn';
    return { event, alert, outcome };
  });

  const tp = verdicts.filter((v) => v.outcome === 'tp').length;
  const fp = verdicts.filter((v) => v.outcome === 'fp').length;
  const fn = verdicts.filter((v) => v.outcome === 'fn').length;
  const tn = verdicts.filter((v) => v.outcome === 'tn').length;
  const maliciousTotal = EVENTS.filter((e) => e.malicious).length;

  const precision = tp + fp > 0 ? Math.round((tp / (tp + fp)) * 100) : null;
  const recall = Math.round((tp / maliciousTotal) * 100);
  const perfect = precision === 100 && recall === 100;

  return { verdicts, tp, fp, fn, tn, precision, recall, alertCount: tp + fp, perfect };
}
