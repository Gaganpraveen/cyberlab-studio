import { AlertTriangle, Flag, Mail, MailCheck, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Markdown } from '@/components/markdown/Markdown';
import { Button } from '@/components/ui/Button';
import { Badge, Callout } from '@/components/ui/primitives';
import { cn } from '@/lib/cn';
import { markChallengeSolved } from '@/lib/progress';

import { EvidenceLog, type EvidenceEntry, evidence } from '../components/EvidenceLog';
import { LabLayout } from '../components/LabLayout';
import {
  type AuthState,
  EMAILS,
  type Email,
  type Verdict,
  linkIsDeceptive,
  scoreTriage,
} from './engine';
import { emailPhishingInvestigatorLab } from './index';

function AuthBadge({ name, state }: { name: string; state: AuthState }) {
  const tone = state === 'pass' ? 'success' : state === 'fail' ? 'danger' : 'warning';
  return (
    <Badge tone={tone} className="font-mono">
      {name} {state}
    </Badge>
  );
}

function Row({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <>
      <dt className="text-fg-subtle">{label}</dt>
      <dd className={cn('break-all', danger ? 'text-danger' : 'text-fg-muted')}>{value}</dd>
    </>
  );
}

export default function EmailPhishingLab() {
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});
  const [selectedId, setSelectedId] = useState<string>(EMAILS[0]!.id);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [log, setLog] = useState<EvidenceEntry[]>([]);
  const add = (e: EvidenceEntry) => setLog((prev) => [...prev, e]);

  const score = useMemo(() => scoreTriage(verdicts), [verdicts]);
  const selected: Email = EMAILS.find((e) => e.id === selectedId) ?? EMAILS[0]!;

  useEffect(() => {
    if (verdicts['payroll-spoof'] === 'phish') markChallengeSolved('phish-report-spoof');
  }, [verdicts]);

  const classify = (email: Email, verdict: Verdict) => {
    setVerdicts((prev) => ({ ...prev, [email.id]: verdict }));
    const right = verdict === (email.isPhish ? 'phish' : 'safe');
    add(
      evidence(
        right ? 'success' : 'warning',
        `${verdict === 'phish' ? 'Reported as phishing' : 'Marked as safe'}: ${email.subject}`,
        right
          ? 'Correct verdict.'
          : email.isPhish
            ? 'Missed — this message is phishing (a false negative).'
            : 'False alarm — this message is legitimate (a false positive).',
      ),
    );
  };

  const reveal = (email: Email) => {
    setRevealed((prev) => ({ ...prev, [email.id]: true }));
    add(
      evidence(
        email.indicators.length ? 'danger' : 'info',
        email.indicators.length
          ? `${email.indicators.length} red flags in "${email.subject}"`
          : `No red flags in "${email.subject}" — evidence checks out`,
        email.indicators.map((i) => `- ${i.label}: ${i.detail}`).join('\n') ||
          'Legitimate message.',
      ),
    );
  };

  const reset = () => {
    setVerdicts({});
    setSelectedId(EMAILS[0]!.id);
    setRevealed({});
    setLog([]);
  };

  const guide = (
    <div className="space-y-5">
      <p className="text-fg-muted text-sm leading-relaxed">
        Three messages landed in the abuse mailbox. Open each one, read the headers, the
        SPF/DKIM/DMARC results, and the links, then decide: phishing or safe. One is a convincing
        spoof, one hides behind a display name, and one just sounds scary.
      </p>
      <Callout tone="info" title="Evidence, not tone">
        A real message can be urgent; a phish can be polite. Judge on the headers and links. Every
        address, domain, and link here is fictional and inert.
      </Callout>
    </div>
  );

  const workspace = (
    <div className="space-y-4 p-5">
      {/* Message list */}
      <div className="border-line divide-line divide-y overflow-hidden rounded-xl border">
        {EMAILS.map((email) => {
          const v = verdicts[email.id];
          const active = email.id === selectedId;
          return (
            <button
              key={email.id}
              type="button"
              onClick={() => setSelectedId(email.id)}
              className={cn(
                'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                active ? 'bg-accent-soft' : 'hover:bg-surface-2',
              )}
            >
              <Mail className="text-fg-subtle size-4 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="text-fg truncate text-sm font-medium">{email.subject}</div>
                <div className="text-fg-subtle truncate font-mono text-xs">
                  {email.fromDisplay} &lt;{email.fromAddr}&gt;
                </div>
              </div>
              {v && (
                <Badge tone={v === 'phish' ? 'danger' : 'success'}>
                  {v === 'phish' ? 'phishing' : 'safe'}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Evidence card for the selected message */}
      <div className="border-line space-y-4 rounded-xl border p-4">
        <div>
          <div className="text-fg text-sm font-medium">{selected.subject}</div>
          <div className="text-fg-subtle mt-0.5 text-xs">{selected.body}</div>
        </div>

        <div className="flex flex-wrap gap-2">
          <AuthBadge name="SPF" state={selected.spf} />
          <AuthBadge name="DKIM" state={selected.dkim} />
          <AuthBadge name="DMARC" state={selected.dmarc} />
        </div>

        <dl className="grid grid-cols-[6rem_1fr] gap-x-3 gap-y-1 font-mono text-xs">
          <Row label="From name" value={selected.fromDisplay} />
          <Row
            label="From addr"
            value={selected.fromAddr}
            danger={!selected.fromAddr.endsWith('@acme.com') && selected.isPhish}
          />
          <Row
            label="Return-Path"
            value={selected.returnPath}
            danger={selected.returnPath !== selected.fromAddr}
          />
          <Row label="Reply-To" value={selected.replyTo} />
          <Row label="Received" value={selected.received} />
        </dl>

        <div>
          <div className="text-fg-subtle mb-1 text-xs font-medium tracking-wide uppercase">
            Links
          </div>
          {selected.links.map((link) => {
            const deceptive = linkIsDeceptive(link);
            return (
              <div key={link.href} className="font-mono text-xs">
                <span className="text-fg-muted">{link.text}</span>
                <span className="text-fg-subtle"> → </span>
                <span className={cn(deceptive ? 'text-danger' : 'text-fg-muted')}>{link.href}</span>
                {deceptive && (
                  <span className="text-danger ml-1 inline-flex items-center gap-0.5">
                    <AlertTriangle className="size-3" aria-hidden /> mismatch
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Reveal red flags */}
        <div>
          {!revealed[selected.id] ? (
            <Button variant="secondary" size="sm" onClick={() => reveal(selected)}>
              Reveal red flags
            </Button>
          ) : (
            <ul className="space-y-1">
              {selected.indicators.length === 0 ? (
                <li className="text-success flex items-center gap-1.5 text-xs">
                  <ShieldCheck className="size-3.5" aria-hidden /> No red flags — this message is
                  legitimate.
                </li>
              ) : (
                selected.indicators.map((ind) => (
                  <li key={ind.label} className="text-fg flex items-start gap-1.5 text-xs">
                    <ShieldAlert className="text-danger mt-0.5 size-3.5 shrink-0" aria-hidden />
                    <span>
                      <span className="font-medium">{ind.label}.</span>{' '}
                      <span className="text-fg-muted">{ind.detail}</span>
                    </span>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        {/* Verdict */}
        <div className="border-line flex flex-wrap gap-2 border-t pt-3">
          <Button
            variant={verdicts[selected.id] === 'phish' ? 'danger' : 'primary'}
            size="sm"
            onClick={() => classify(selected, 'phish')}
            className="gap-1.5"
          >
            <ShieldAlert className="size-4" aria-hidden /> Report as phishing
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => classify(selected, 'safe')}
            className="gap-1.5"
          >
            <MailCheck className="size-4" aria-hidden /> Mark as safe
          </Button>
        </div>
      </div>

      {/* Scoreboard */}
      <div
        className={cn(
          'rounded-xl border p-3 text-sm',
          score.allCorrect ? 'border-success/40 bg-success-soft' : 'border-line bg-surface-2',
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={score.allCorrect ? 'success' : 'neutral'}>
            {score.correct}/{score.total} correct
          </Badge>
          {score.falsePositives > 0 && (
            <Badge tone="warning">{score.falsePositives} false positive</Badge>
          )}
          {score.falseNegatives > 0 && (
            <Badge tone="danger">{score.falseNegatives} missed phish</Badge>
          )}
        </div>
        {score.flag && (
          <div className="border-accent/40 bg-accent-soft text-fg mt-2 flex items-center gap-2 rounded-md border p-2 font-mono text-xs">
            <Flag className="text-accent-text size-4 shrink-0" aria-hidden />
            {score.flag}
          </div>
        )}
      </div>

      <div className="prose-lesson max-w-none text-sm">
        <Markdown compact>
          {`Headers don&rsquo;t lie, but they need reading. SPF/DKIM/DMARC tell you whether a server was authorized for a domain — not whether the brand is real, which is why a display-name spoof from gmail can pass all three. Compare the From address to the domain you expect, check that links go where their text claims, and treat urgency as a prompt to slow down, not speed up.`}
        </Markdown>
      </div>
    </div>
  );

  return (
    <LabLayout
      lab={emailPhishingInvestigatorLab}
      guide={guide}
      workspace={workspace}
      evidence={<EvidenceLog entries={log} onClear={() => setLog([])} />}
      onReset={reset}
    />
  );
}
