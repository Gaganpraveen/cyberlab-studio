import { Flag, ShieldCheck } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { Markdown } from '@/components/markdown/Markdown';
import { Badge, Callout } from '@/components/ui/primitives';
import { cn } from '@/lib/cn';
import { markChallengeSolved } from '@/lib/progress';

import { EvidenceLog, type EvidenceEntry, evidence } from '../components/EvidenceLog';
import { LabLayout, LabSteps } from '../components/LabLayout';
import { CLAUSES, type ClauseId, DETECTION_FLAG, type EventVerdict, evaluateRule } from './engine';
import { detectionRuleBuilderLab } from './index';

const OUTCOME_LABEL: Record<EventVerdict['outcome'], string> = {
  tp: 'true positive',
  fp: 'false positive',
  fn: 'false negative',
  tn: 'true negative',
};

const OUTCOME_TONE: Record<EventVerdict['outcome'], string> = {
  tp: 'bg-success-soft/50',
  fp: 'bg-danger-soft/50',
  fn: 'bg-warning-soft/50',
  tn: '',
};

function Metric({ label, value, good }: { label: string; value: string; good?: boolean | null }) {
  return (
    <div className="border-line bg-surface-2 rounded-lg border p-3 text-center">
      <div
        className={cn(
          'font-mono text-2xl font-semibold',
          good === true ? 'text-success' : good === false ? 'text-warning' : 'text-fg',
        )}
      >
        {value}
      </div>
      <div className="text-fg-subtle mt-0.5 text-xs">{label}</div>
    </div>
  );
}

export default function DetectionRuleLab() {
  const [enabled, setEnabled] = useState<ClauseId[]>([]);
  const [log, setLog] = useState<EvidenceEntry[]>([]);
  const baseId = useId();
  const add = (e: EvidenceEntry) => setLog((prev) => [...prev, e]);

  const report = useMemo(() => evaluateRule(enabled), [enabled]);

  // Track milestones so we only log each transition once.
  const hitRecall = useRef(false);
  const hitPerfect = useRef(false);

  useEffect(() => {
    if (report.recall === 100 && !hitRecall.current) {
      hitRecall.current = true;
      markChallengeSolved('detect-catch');
      add(
        evidence(
          'success',
          'Recall 100%: every attack event is flagged',
          report.fp > 0
            ? `Caught all ${report.tp} attacks, but ${report.fp} benign event(s) also alerted. Tune for precision next.`
            : 'Caught all attacks with no false positives.',
        ),
      );
    }
    if (report.recall < 100) hitRecall.current = false;

    if (report.perfect && !hitPerfect.current) {
      hitPerfect.current = true;
      markChallengeSolved('detect-precision');
      add(
        evidence(
          'danger',
          'High-fidelity detection: precision and recall both 100%',
          `Flag revealed: ${DETECTION_FLAG}`,
        ),
      );
    }
    if (!report.perfect) hitPerfect.current = false;
  }, [report]);

  const toggle = (id: ClauseId) =>
    setEnabled((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));

  const reset = () => {
    setEnabled([]);
    setLog([]);
    hitRecall.current = false;
    hitPerfect.current = false;
  };

  const precisionText = report.precision === null ? '—' : `${report.precision}%`;

  const guide = (
    <div className="space-y-5">
      <p className="text-fg-muted text-sm leading-relaxed">
        A compromised service account is quietly stealing data. Your job on the blue team is to
        write a detection rule that catches it — and <em>only</em> it. Turn clauses on and off; the
        rule is the <strong className="text-fg">AND</strong> of everything you enable, and the
        scoreboard updates against the ground truth.
      </p>
      <LabSteps
        steps={[
          {
            title: 'Read the logs',
            body: 'Nine events, three of them the attack. The rest are noise.',
          },
          {
            title: 'Catch everything',
            body: 'Enable clauses until recall hits 100% — no attack slips past.',
          },
          {
            title: 'Cut the noise',
            body: 'Narrow the rule until precision is 100% too — zero false alarms.',
          },
          {
            title: 'Ship it',
            body: 'A perfect rule reveals the flag. Submit it in the challenges.',
          },
        ]}
      />
      <Callout tone="info" title="Precision vs. recall">
        Recall is how many real attacks you catch; precision is how few false alarms you raise. A
        broad rule has high recall but low precision — and an analyst who stops trusting it.
      </Callout>
    </div>
  );

  const workspace = (
    <div className="space-y-5 p-5">
      {/* Clause builder */}
      <div className="border-line rounded-xl border p-4">
        <div className="text-fg-subtle mb-3 text-xs font-medium tracking-wide uppercase">
          Rule clauses (combined with AND)
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {CLAUSES.map((clause) => {
            const id = `${baseId}-${clause.id}`;
            const on = enabled.includes(clause.id);
            return (
              <label
                key={clause.id}
                htmlFor={id}
                className={cn(
                  'flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors',
                  on
                    ? 'border-accent/50 bg-accent-soft text-fg'
                    : 'border-line bg-surface-2 text-fg-muted hover:border-line-strong',
                )}
              >
                <input
                  id={id}
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(clause.id)}
                  className="accent-accent size-4"
                />
                <span>{clause.label}</span>
              </label>
            );
          })}
        </div>
        {enabled.length === 0 && (
          <p className="text-fg-subtle mt-3 text-xs">
            No clauses selected — the rule matches nothing and fires no alerts.
          </p>
        )}
      </div>

      {/* Scoreboard */}
      <div className="grid grid-cols-3 gap-3">
        <Metric
          label="Precision"
          value={precisionText}
          good={report.precision === null ? null : report.precision === 100}
        />
        <Metric label="Recall" value={`${report.recall}%`} good={report.recall === 100} />
        <Metric label="Alerts" value={String(report.alertCount)} />
      </div>

      {/* Confusion matrix */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="border-success/40 bg-success-soft/40 rounded-lg border p-3">
          <div className="text-fg font-mono text-xl font-semibold">{report.tp}</div>
          <div className="text-fg-subtle text-xs">true positives · attacks caught</div>
        </div>
        <div className="border-danger/40 bg-danger-soft/40 rounded-lg border p-3">
          <div className="text-fg font-mono text-xl font-semibold">{report.fp}</div>
          <div className="text-fg-subtle text-xs">false positives · benign alerted</div>
        </div>
        <div className="border-warning/40 bg-warning-soft/40 rounded-lg border p-3">
          <div className="text-fg font-mono text-xl font-semibold">{report.fn}</div>
          <div className="text-fg-subtle text-xs">false negatives · attacks missed</div>
        </div>
        <div className="border-line bg-surface-2 rounded-lg border p-3">
          <div className="text-fg font-mono text-xl font-semibold">{report.tn}</div>
          <div className="text-fg-subtle text-xs">true negatives · benign ignored</div>
        </div>
      </div>

      {report.perfect && (
        <div className="border-accent/40 bg-accent-soft text-fg flex items-center gap-2 rounded-xl border p-3">
          <ShieldCheck className="text-accent-text size-5 shrink-0" aria-hidden />
          <div>
            <div className="text-sm font-medium">High-fidelity detection shipped.</div>
            <div className="mt-1 flex items-center gap-2 font-mono text-xs">
              <Flag className="text-accent-text size-3.5 shrink-0" aria-hidden />
              {DETECTION_FLAG}
            </div>
          </div>
        </div>
      )}

      {/* Event log with verdicts */}
      <div className="border-line overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="bg-surface-2 text-fg-subtle text-xs">
            <tr>
              <th className="px-3 py-2 font-medium">User</th>
              <th className="px-3 py-2 font-medium">Action</th>
              <th className="px-3 py-2 font-medium">Bytes</th>
              <th className="px-3 py-2 font-medium">Hour</th>
              <th className="px-3 py-2 font-medium">Fails</th>
              <th className="px-3 py-2 font-medium">Foreign</th>
              <th className="px-3 py-2 font-medium">Truth</th>
              <th className="px-3 py-2 font-medium">Verdict</th>
            </tr>
          </thead>
          <tbody className="divide-line divide-y">
            {report.verdicts.map(({ event, alert, outcome }) => (
              <tr key={event.id} className={cn(OUTCOME_TONE[outcome])}>
                <td className="px-3 py-2 font-mono text-xs">{event.user}</td>
                <td className="px-3 py-2 text-xs">{event.action}</td>
                <td className="px-3 py-2 font-mono text-xs">{event.bytesMB} MB</td>
                <td className="px-3 py-2 font-mono text-xs">
                  {String(event.hour).padStart(2, '0')}:00
                </td>
                <td className="px-3 py-2 font-mono text-xs">{event.failedLogins}</td>
                <td className="px-3 py-2 text-xs">{event.foreign ? 'yes' : 'no'}</td>
                <td className="px-3 py-2">
                  {event.malicious ? (
                    <Badge tone="danger">attack</Badge>
                  ) : (
                    <Badge tone="neutral">benign</Badge>
                  )}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      'text-xs font-medium',
                      outcome === 'tp' && 'text-success',
                      outcome === 'fp' && 'text-danger',
                      outcome === 'fn' && 'text-warning',
                      outcome === 'tn' && 'text-fg-subtle',
                    )}
                  >
                    {alert ? 'ALERT · ' : 'quiet · '}
                    {OUTCOME_LABEL[outcome]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="prose-lesson max-w-none text-sm">
        <Markdown compact>
          {`Detection engineering is this loop: write a rule, score it against known-good and known-bad data, and tune. **Recall** first (miss no attacks), then **precision** (raise no false alarms) — because an alert the analyst can't trust is worse than no alert at all. Real detections add context (baselines, allow-lists, enrichment) so the rule is specific to the *behavior*, not just a noisy threshold like "big download".`}
        </Markdown>
      </div>
    </div>
  );

  return (
    <LabLayout
      lab={detectionRuleBuilderLab}
      guide={guide}
      workspace={workspace}
      evidence={<EvidenceLog entries={log} onClear={() => setLog([])} />}
      onReset={reset}
    />
  );
}
