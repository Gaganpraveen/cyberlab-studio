import { Flag, Play, Search, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

import { Markdown } from '@/components/markdown/Markdown';
import { Button } from '@/components/ui/Button';
import { Badge, Callout } from '@/components/ui/primitives';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/radix';
import { cn } from '@/lib/cn';
import { markChallengeSolved } from '@/lib/progress';

import { EvidenceLog, type EvidenceEntry, evidence } from '../components/EvidenceLog';
import { LabLayout, LabSteps } from '../components/LabLayout';
import {
  type AttackReport,
  type Defenses,
  NO_DEFENSES,
  type ProbeResult,
  TARGET_USER,
  WORDLIST,
  probeUser,
  runAttack,
} from './engine';
import { loginSecurityLab } from './index';

const TASK_FOR: Record<string, string> = {
  'rate limiting': 'login-ratelimit',
  'account lockout': 'login-lockout',
  'multi-factor authentication': 'login-mfa',
};

function DefenseToggle({
  label,
  on,
  onToggle,
}: {
  label: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <Button size="sm" variant={on ? 'ghost' : 'secondary'} aria-pressed={on} onClick={onToggle}>
      {on ? `✓ ${label}` : `Enable ${label}`}
    </Button>
  );
}

export default function LoginSecurityLab() {
  const [defenses, setDefenses] = useState<Defenses>(NO_DEFENSES);
  const [report, setReport] = useState<AttackReport | null>(null);
  const [probeName, setProbeName] = useState(TARGET_USER);
  const [probe, setProbe] = useState<ProbeResult | null>(null);
  const [log, setLog] = useState<EvidenceEntry[]>([]);
  const add = (e: EvidenceEntry) => setLog((prev) => [...prev, e]);

  const toggle = (key: keyof Defenses, label: string) => {
    const willBeOn = !defenses[key];
    setDefenses((d) => ({ ...d, [key]: !d[key] }));
    add(
      evidence(
        'info',
        `${willBeOn ? 'Enabled' : 'Disabled'} ${label}`,
        willBeOn ? `The next attack run will face ${label}.` : `${label} is off again.`,
      ),
    );
  };

  const launch = () => {
    const r = runAttack(defenses);
    setReport(r);
    if (r.authenticated) {
      add(
        evidence(
          'danger',
          `Session obtained for ${TARGET_USER} after ${r.attempts} guesses`,
          `The password was found in the wordlist with no throttling.\nFlag: ${r.flag}`,
        ),
      );
    } else if (r.blockedBy) {
      const task = TASK_FOR[r.blockedBy];
      if (task) markChallengeSolved(task);
      add(
        evidence(
          'success',
          `Attack blocked by ${r.blockedBy} after ${r.attempts} guesses`,
          r.found
            ? 'The password was guessed, but the second factor stopped the login.'
            : 'The account was protected before the password was reached.',
        ),
      );
    }
  };

  const runProbe = (name: string) => {
    const r = probeUser(name, defenses.genericErrors);
    setProbe(r);
    add(
      evidence(
        r.leaks ? 'warning' : 'success',
        `Probed "${name}" → ${r.message}`,
        r.leaks
          ? `The response reveals the account ${r.exists ? 'exists' : 'does not exist'}.`
          : 'The response is generic; existence is not revealed.',
      ),
    );
  };

  const reset = () => {
    setDefenses(NO_DEFENSES);
    setReport(null);
    setProbe(null);
    setProbeName(TARGET_USER);
    setLog([]);
  };

  const guide = (
    <div className="space-y-5">
      <p className="text-fg-muted text-sm leading-relaxed">
        Offline cracking needs a stolen hash; an <strong className="text-fg">online</strong> attack
        just talks to the login form. You will walk into a weak account with a wordlist, then add
        the controls that stop the very same run.
      </p>
      <LabSteps
        steps={[
          { title: 'Guess the password', body: 'Run the wordlist against a reused weak password.' },
          { title: 'Rate limit', body: 'Cap the guesses per window and cut the attack off.' },
          { title: 'Lock out', body: 'Disable the account after repeated failures.' },
          { title: 'Require MFA', body: 'Make a correct password insufficient on its own.' },
          { title: 'Close the leak', body: 'Stop login errors from revealing valid usernames.' },
        ]}
      />
      <Callout tone="info" title="A model, not a real service">
        No password is hashed and nothing is sent anywhere. The attack is a bounded walk through a
        wordlist of {WORDLIST.length} common passwords; the account is fictional. Toggle each
        defense on its own to see its individual effect.
      </Callout>
    </div>
  );

  const workspace = (
    <Tabs defaultValue="attack" className="flex h-full flex-col">
      <TabsList className="shrink-0 px-4 pt-2">
        <TabsTrigger value="attack">Attack</TabsTrigger>
        <TabsTrigger value="enumeration">Enumeration</TabsTrigger>
      </TabsList>

      {/* --- Attack --- */}
      <TabsContent value="attack" className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-4 p-5">
          <div className="border-line bg-surface/40 rounded-xl border p-4">
            <h3 className="text-fg mb-1 text-sm font-semibold">Target</h3>
            <p className="text-fg-muted text-xs">
              Account <code className="text-fg">{TARGET_USER}</code> reused a common password. The
              attacker runs a wordlist of {WORDLIST.length} passwords against the login form.
            </p>
          </div>

          <div className="border-line bg-surface/40 rounded-xl border p-4">
            <div className="text-fg-subtle mb-2 text-xs font-semibold tracking-[0.1em] uppercase">
              Defenses
            </div>
            <div className="flex flex-wrap gap-2">
              <DefenseToggle
                label="rate limiting"
                on={defenses.rateLimit}
                onToggle={() => toggle('rateLimit', 'rate limiting')}
              />
              <DefenseToggle
                label="account lockout"
                on={defenses.lockout}
                onToggle={() => toggle('lockout', 'account lockout')}
              />
              <DefenseToggle
                label="MFA"
                on={defenses.mfa}
                onToggle={() => toggle('mfa', 'multi-factor authentication')}
              />
            </div>
          </div>

          <Button onClick={launch} className="gap-1.5">
            <Play className="size-4" aria-hidden /> Launch dictionary attack
          </Button>

          {report && (
            <div
              className={cn(
                'space-y-2 rounded-xl border p-4',
                report.authenticated
                  ? 'border-danger/40 bg-danger-soft'
                  : 'border-success/40 bg-success-soft',
              )}
            >
              <div className="flex items-center gap-2">
                {report.authenticated ? (
                  <Badge tone="danger">account compromised</Badge>
                ) : (
                  <Badge tone="success" className="gap-1">
                    <ShieldCheck className="size-3.5" aria-hidden /> attack stopped
                  </Badge>
                )}
                <span className="text-fg-muted text-xs">{report.attempts} guesses made</span>
              </div>
              {report.authenticated ? (
                <div className="border-accent/40 bg-accent-soft text-fg flex items-center gap-2 rounded-md border p-2 font-mono text-xs">
                  <Flag className="text-accent-text size-4 shrink-0" aria-hidden />
                  {report.flag}
                </div>
              ) : (
                <>
                  <p className="text-fg text-sm">
                    Blocked by <strong>{report.blockedBy}</strong>
                    {report.found
                      ? ' — the password was guessed, but the second factor refused the session.'
                      : ' before the password was reached.'}
                  </p>
                  {report.legitimateUserLockedOut && (
                    <div className="border-warning/40 bg-warning-soft text-fg rounded-md border p-2 text-xs">
                      The real {TARGET_USER} is now locked out too — that collateral denial of
                      service is the cost of hard lockout.
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </TabsContent>

      {/* --- Enumeration --- */}
      <TabsContent value="enumeration" className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-fg-muted max-w-md text-sm">
              Probe usernames and watch the login error. If existing and missing accounts answer
              differently, an attacker can map valid accounts.
            </p>
            <DefenseToggle
              label="generic errors"
              on={defenses.genericErrors}
              onToggle={() => toggle('genericErrors', 'generic errors')}
            />
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <label className="text-fg-muted text-xs">
              <div className="mb-1">Username</div>
              <input
                value={probeName}
                onChange={(e) => setProbeName(e.target.value)}
                className="bg-surface-2 border-line text-fg rounded-md border px-2 py-1.5 font-mono text-sm"
              />
            </label>
            <Button size="sm" onClick={() => runProbe(probeName)} className="gap-1.5">
              <Search className="size-3.5" aria-hidden /> Probe
            </Button>
            <Button size="sm" variant="ghost" onClick={() => runProbe('nobody_here')}>
              Probe a fake name
            </Button>
          </div>

          {probe && (
            <div
              className={cn(
                'rounded-lg border p-3 text-sm',
                probe.leaks
                  ? 'border-warning/40 bg-warning-soft'
                  : 'border-success/40 bg-success-soft',
              )}
            >
              <div className="text-fg font-mono text-xs">{probe.message}</div>
              <div className="text-fg-muted mt-1 text-xs">
                {probe.leaks
                  ? `This response leaks that the account ${probe.exists ? 'exists' : 'does not exist'}.`
                  : 'Generic response — existence is hidden.'}
              </div>
            </div>
          )}

          <div className="prose-lesson max-w-none text-sm">
            <Markdown compact>
              {`Login, signup, and password-reset flows should answer the **same way** whether or not an account exists — same message, same status code, and ideally the same response time. Any difference lets an attacker enumerate valid accounts to target with credential stuffing or phishing. Generic errors (&ldquo;incorrect username or password&rdquo;) and constant-time handling close the leak.`}
            </Markdown>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );

  return (
    <LabLayout
      lab={loginSecurityLab}
      guide={guide}
      workspace={workspace}
      evidence={<EvidenceLog entries={log} onClear={() => setLog([])} />}
      onReset={reset}
    />
  );
}
