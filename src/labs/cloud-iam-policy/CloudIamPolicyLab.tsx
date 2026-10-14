import { Flag, KeyRound, Play, ShieldCheck } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';

import { Markdown } from '@/components/markdown/Markdown';
import { Button } from '@/components/ui/Button';
import { Badge, Callout } from '@/components/ui/primitives';
import { cn } from '@/lib/cn';
import { markChallengeSolved } from '@/lib/progress';

import { EvidenceLog, type EvidenceEntry, evidence } from '../components/EvidenceLog';
import { LabLayout, LabSteps } from '../components/LabLayout';
import {
  type AttackResult,
  type Defenses,
  DEFAULT_DEFENSES,
  DEVELOPER,
  SECRET_OBJECT,
  type Statement,
  buildPolicy,
  evaluate,
  tryEscalate,
  tryReadBucket,
} from './engine';
import { cloudIamPolicyLab } from './index';

const DEFENSE_LABELS: { key: keyof Defenses; label: string; detail: string }[] = [
  {
    key: 'scopeActions',
    label: 'Scope the developer role to only the actions it needs',
    detail: 'Replaces iam:* and s3:* with s3:GetObject and logs:*.',
  },
  {
    key: 'denyEscalation',
    label: 'Add an explicit Deny on IAM self-escalation',
    detail: 'Deny iam:AttachUserPolicy / PutUserPolicy / CreatePolicyVersion.',
  },
  {
    key: 'removePublicPrincipal',
    label: 'Remove the public principal from the bucket',
    detail: 'Replaces principal * with role/developers.',
  },
];

const WILDCARD = /^(\*|[a-z0-9]+:\*)$/;

function isRisky(effect: Statement['effect'], values: string[]): boolean {
  return effect === 'Allow' && values.some((v) => WILDCARD.test(v));
}

function PolicyView({ statements }: { statements: Statement[] }) {
  return (
    <div className="space-y-2">
      {statements.map((s) => (
        <div key={s.sid} className="border-line bg-surface-2 rounded-lg border p-3 text-xs">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-fg font-mono font-medium">{s.sid}</span>
            <Badge tone={s.effect === 'Allow' ? 'success' : 'danger'}>{s.effect}</Badge>
          </div>
          <dl className="grid grid-cols-[5rem_1fr] gap-x-2 gap-y-1 font-mono">
            <dt className="text-fg-subtle">Principal</dt>
            <dd className={cn(s.principals.includes('*') ? 'text-danger' : 'text-fg-muted')}>
              {s.principals.join(', ')}
            </dd>
            <dt className="text-fg-subtle">Action</dt>
            <dd className={cn(isRisky(s.effect, s.actions) ? 'text-danger' : 'text-fg-muted')}>
              {s.actions.join(', ')}
            </dd>
            <dt className="text-fg-subtle">Resource</dt>
            <dd className="text-fg-muted">{s.resources.join(', ')}</dd>
          </dl>
        </div>
      ))}
    </div>
  );
}

const ACTIONS = ['iam:AttachUserPolicy', 's3:GetObject', 's3:PutObject', 'logs:CreateLogStream'];
const PRINCIPALS = [DEVELOPER, '*', 'role/auditor'];

export default function CloudIamPolicyLab() {
  const [defenses, setDefenses] = useState<Defenses>(DEFAULT_DEFENSES);
  const [results, setResults] = useState<{ escalate?: AttackResult; bucket?: AttackResult }>({});
  const [log, setLog] = useState<EvidenceEntry[]>([]);
  const baseId = useId();
  const add = (e: EvidenceEntry) => setLog((prev) => [...prev, e]);

  // Request simulator state.
  const [principal, setPrincipal] = useState(DEVELOPER);
  const [action, setAction] = useState('iam:AttachUserPolicy');
  const [resource, setResource] = useState('*');

  const policy = useMemo(() => buildPolicy(defenses), [defenses]);
  const simDecision = useMemo(
    () => evaluate(policy, { principal, action, resource }),
    [policy, principal, action, resource],
  );

  useEffect(() => {
    if (!tryEscalate(defenses).success) markChallengeSolved('iam-fix-escalation');
    if (!tryReadBucket(defenses).success) markChallengeSolved('iam-fix-bucket');
  }, [defenses]);

  const toggle = (key: keyof Defenses) => setDefenses((prev) => ({ ...prev, [key]: !prev[key] }));

  const runEscalate = () => {
    const r = tryEscalate(defenses);
    setResults((prev) => ({ ...prev, escalate: r }));
    add(
      evidence(
        r.success ? 'danger' : 'success',
        r.success ? 'Privilege escalation to admin' : 'Escalation blocked',
        `${r.decision.reason}\n${r.reason}${r.flag ? `\nFlag: ${r.flag}` : ''}`,
      ),
    );
  };

  const runRead = () => {
    const r = tryReadBucket(defenses);
    setResults((prev) => ({ ...prev, bucket: r }));
    add(
      evidence(
        r.success ? 'danger' : 'success',
        r.success ? 'Anonymous read of private object' : 'Anonymous read blocked',
        `${r.decision.reason}\n${r.reason}${r.flag ? `\nFlag: ${r.flag}` : ''}`,
      ),
    );
  };

  const reset = () => {
    setDefenses(DEFAULT_DEFENSES);
    setResults({});
    setLog([]);
    setPrincipal(DEVELOPER);
    setAction('iam:AttachUserPolicy');
    setResource('*');
  };

  const guide = (
    <div className="space-y-5">
      <p className="text-fg-muted text-sm leading-relaxed">
        An AWS-style account policy has two classic mistakes. The developers role holds{' '}
        <code className="text-danger">iam:*</code> on <code className="text-danger">*</code>, and a
        reports bucket is readable by principal <code className="text-danger">*</code>. Exploit
        both, then tighten the policy and watch each attack turn into a Deny.
      </p>
      <LabSteps
        steps={[
          {
            title: 'Read the policy',
            body: 'Spot the wildcard action grant and the public principal.',
          },
          { title: 'Escalate', body: 'Use iam:* to attach admin to your own role.' },
          { title: 'Exfiltrate', body: 'Read the private object as an anonymous caller.' },
          {
            title: 'Tighten',
            body: 'Scope actions, add an explicit Deny, drop the public principal.',
          },
        ]}
      />
      <Callout tone="info" title="How IAM decides">
        Default deny. An explicit Deny beats any Allow. Otherwise a matching Allow grants the
        request. Everything here is fictional — no cloud account is touched.
      </Callout>
    </div>
  );

  const workspace = (
    <div className="space-y-5 p-5">
      {/* Defenses */}
      <div className="border-line rounded-xl border p-4">
        <div className="text-fg-subtle mb-3 text-xs font-medium tracking-wide uppercase">
          Policy hardening
        </div>
        <div className="space-y-2">
          {DEFENSE_LABELS.map(({ key, label, detail }) => {
            const id = `${baseId}-${key}`;
            const on = defenses[key];
            return (
              <label
                key={key}
                htmlFor={id}
                className={cn(
                  'flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors',
                  on
                    ? 'border-accent/50 bg-accent-soft text-fg'
                    : 'border-line bg-surface-2 text-fg-muted hover:border-line-strong',
                )}
              >
                <input
                  id={id}
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(key)}
                  className="accent-accent mt-0.5 size-4"
                />
                <span>
                  {label}
                  <span className="text-fg-subtle block text-xs">{detail}</span>
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Live policy + attacks */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <div className="text-fg-subtle mb-2 text-xs font-medium tracking-wide uppercase">
            Effective policy
          </div>
          <PolicyView statements={policy} />
        </div>
        <div className="space-y-3">
          <div className="text-fg-subtle text-xs font-medium tracking-wide uppercase">Attacks</div>
          <div className="flex flex-col gap-2">
            <Button onClick={runEscalate} className="justify-start gap-1.5">
              <Play className="size-4" aria-hidden /> Escalate to admin (iam:AttachUserPolicy)
            </Button>
            <Button onClick={runRead} variant="secondary" className="justify-start gap-1.5">
              <KeyRound className="size-4" aria-hidden /> Read secret object (anonymous)
            </Button>
          </div>
          {(['escalate', 'bucket'] as const).map((k) => {
            const r = results[k];
            if (!r) return null;
            return (
              <div
                key={k}
                className={cn(
                  'space-y-1.5 rounded-lg border p-3 text-sm',
                  r.success
                    ? 'border-danger/40 bg-danger-soft'
                    : 'border-success/40 bg-success-soft',
                )}
              >
                <Badge tone={r.success ? 'danger' : 'success'} className="gap-1">
                  {!r.success && <ShieldCheck className="size-3.5" aria-hidden />}
                  {r.decision.effect}
                </Badge>
                <p className="text-fg text-xs">{r.reason}</p>
                {r.loot && <p className="text-danger font-mono text-xs">Stolen: {r.loot}</p>}
                {r.flag && (
                  <div className="border-accent/40 bg-accent-soft text-fg flex items-center gap-2 rounded-md border p-2 font-mono text-xs">
                    <Flag className="text-accent-text size-4 shrink-0" aria-hidden />
                    {r.flag}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Request simulator */}
      <div className="border-line rounded-xl border p-4">
        <div className="text-fg-subtle mb-3 text-xs font-medium tracking-wide uppercase">
          Test any request
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="text-xs">
            <span className="text-fg-subtle mb-1 block">Principal</span>
            <select
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
              className="bg-surface-2 border-line text-fg w-full rounded-md border px-2 py-1.5 font-mono text-xs"
            >
              {PRINCIPALS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            <span className="text-fg-subtle mb-1 block">Action</span>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="bg-surface-2 border-line text-fg w-full rounded-md border px-2 py-1.5 font-mono text-xs"
            >
              {ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            <span className="text-fg-subtle mb-1 block">Resource</span>
            <select
              value={resource}
              onChange={(e) => setResource(e.target.value)}
              className="bg-surface-2 border-line text-fg w-full rounded-md border px-2 py-1.5 font-mono text-xs"
            >
              <option value="*">*</option>
              <option value={SECRET_OBJECT}>{SECRET_OBJECT}</option>
              <option value="arn:aws:iam::111122223333:user/intern">
                arn:aws:iam::…:user/intern
              </option>
            </select>
          </label>
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <Badge tone={simDecision.effect === 'Allow' ? 'danger' : 'success'}>
            {simDecision.effect}
          </Badge>
          <span className="text-fg-muted text-xs">{simDecision.reason}</span>
        </div>
      </div>

      <div className="prose-lesson max-w-none text-sm">
        <Markdown compact>
          {`Cloud breaches rarely need an exploit — they need a policy that says yes when it should say no. Two habits prevent most of them: never write \`*\` where you can name the exact actions, resources, and principals; and add explicit Denies around the few actions that grant power over the account itself (IAM writes, key policies, logging changes), because a Deny holds even when an Allow drifts too wide.`}
        </Markdown>
      </div>
    </div>
  );

  return (
    <LabLayout
      lab={cloudIamPolicyLab}
      guide={guide}
      workspace={workspace}
      evidence={<EvidenceLog entries={log} onClear={() => setLog([])} />}
      onReset={reset}
    />
  );
}
