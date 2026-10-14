import { Database, Play, ShieldCheck, Unlock } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Markdown } from '@/components/markdown/Markdown';
import { Button } from '@/components/ui/Button';
import { Badge, Callout } from '@/components/ui/primitives';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/radix';
import { cn } from '@/lib/cn';
import { markChallengeSolved } from '@/lib/progress';

import { EvidenceLog, type EvidenceEntry, evidence } from '../components/EvidenceLog';
import { LabLayout, LabSteps } from '../components/LabLayout';
import {
  type CrackReport,
  ACCOUNTS,
  LEAKED_SALTED,
  LEAKED_UNSALTED,
  WORDLIST,
  crackSalted,
  crackUnsalted,
  pbkdf2Hex,
  reusedPasswordUsers,
  saltFor,
  slowAttackWork,
} from './engine';
import { passwordCrackingLab } from './index';

const PBKDF2_ITERATIONS = 600_000;

const SCHEMES = [
  {
    key: 'unsalted',
    label: 'Unsalted SHA-256',
    reuseVisible: true,
    cost: WORDLIST.length,
    verdict: 'Cracked instantly; reuse is visible',
    tone: 'danger' as const,
  },
  {
    key: 'salted',
    label: 'Salted SHA-256',
    reuseVisible: false,
    cost: WORDLIST.length * ACCOUNTS.length,
    verdict: 'Still fast, but per-account',
    tone: 'warning' as const,
  },
  {
    key: 'pbkdf2',
    label: `Salted PBKDF2 (${PBKDF2_ITERATIONS.toLocaleString()}x)`,
    reuseVisible: false,
    cost: slowAttackWork(ACCOUNTS.length, WORDLIST.length, PBKDF2_ITERATIONS),
    verdict: 'Computationally impractical',
    tone: 'success' as const,
  },
];

function short(hash: string) {
  return `${hash.slice(0, 20)}…`;
}

function CrackTable({ report }: { report: CrackReport }) {
  return (
    <div className="border-line overflow-hidden rounded-xl border">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-2 text-fg-subtle text-xs">
          <tr>
            <th className="px-3 py-2 font-medium">User</th>
            <th className="px-3 py-2 font-medium">Recovered password</th>
          </tr>
        </thead>
        <tbody className="divide-line divide-y">
          {report.rows.map((r) => (
            <tr key={r.user}>
              <td className="px-3 py-2 font-mono text-xs">{r.user}</td>
              <td className="px-3 py-2">
                {r.password ? (
                  <code className="text-danger font-mono">{r.password}</code>
                ) : (
                  <span className="text-success">not cracked</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PasswordLab() {
  const [unsaltedReport, setUnsaltedReport] = useState<CrackReport | null>(null);
  const [saltedReport, setSaltedReport] = useState<CrackReport | null>(null);
  const [pbkdf2Sample, setPbkdf2Sample] = useState<string | null>(null);
  const [log, setLog] = useState<EvidenceEntry[]>([]);

  const reuseGroups = useMemo(() => reusedPasswordUsers(LEAKED_UNSALTED), []);
  const reusedUsers = useMemo(() => new Set(reuseGroups.flat()), [reuseGroups]);
  const add = (e: EvidenceEntry) => setLog((prev) => [...prev, e]);

  const handleCrack = () => {
    const report = crackUnsalted(LEAKED_UNSALTED, WORDLIST);
    setUnsaltedReport(report);
    add(
      evidence(
        'danger',
        `Cracked ${report.cracked}/${report.total} unsalted hashes`,
        `One pass over ${WORDLIST.length} words cracked the whole table.`,
      ),
    );
  };

  const handleSaltedCrack = () => {
    const report = crackSalted(LEAKED_SALTED, WORDLIST);
    setSaltedReport(report);
    add(
      evidence(
        'warning',
        `Salted fast hash: ${report.cracked}/${report.total} cracked, ${report.work} hash ops`,
        'The salt forced a fresh pass per account — more work, but a fast hash is still fast.',
      ),
    );
  };

  const handlePbkdf2 = async () => {
    const sample = await pbkdf2Hex('password123', saltFor('admin'), PBKDF2_ITERATIONS);
    setPbkdf2Sample(sample);
    markChallengeSolved('pw-harden');
    add(
      evidence(
        'success',
        `Stored one password with PBKDF2 (${PBKDF2_ITERATIONS.toLocaleString()} iterations)`,
        `Every guess now costs ${PBKDF2_ITERATIONS.toLocaleString()} hashes instead of one.`,
      ),
    );
  };

  const reset = () => {
    setUnsaltedReport(null);
    setSaltedReport(null);
    setPbkdf2Sample(null);
    setLog([]);
  };

  const guide = (
    <div className="space-y-5">
      <p className="text-fg-muted text-sm leading-relaxed">
        When a password database leaks, how the passwords were{' '}
        <strong className="text-fg">stored</strong> decides how many get cracked. You will crack a
        table of fast, unsalted hashes, see password reuse jump out, then re-store the passwords so
        the same attack becomes impractical.
      </p>
      <LabSteps
        steps={[
          { title: 'The leak', body: 'Inspect the stolen table of unsalted SHA-256 hashes.' },
          { title: 'Crack', body: 'Run a wordlist attack and recover the weak passwords.' },
          { title: 'Reuse', body: 'Notice two accounts with identical hashes.' },
          {
            title: 'Salt',
            body: 'Add a per-user salt so the same work no longer cracks everyone.',
          },
          { title: 'Slow it down', body: 'Switch to PBKDF2 and watch the attack cost explode.' },
        ]}
      />
      <Callout tone="info" title="Fictional and local">
        Real SHA-256 and PBKDF2 run in your browser, but the accounts, passwords, and leak are
        invented. Nothing is sent anywhere.
      </Callout>
    </div>
  );

  const workspace = (
    <Tabs defaultValue="leak" className="flex h-full flex-col">
      <TabsList className="shrink-0 px-4 pt-2">
        <TabsTrigger value="leak">Leaked table</TabsTrigger>
        <TabsTrigger value="crack">Crack</TabsTrigger>
        <TabsTrigger value="harden">Harden</TabsTrigger>
      </TabsList>

      <TabsContent value="leak" className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-3 p-5">
          <p className="text-fg-muted text-sm">
            This is what an attacker steals: a username and an unsalted SHA-256 hash for each
            account. Two rows share a hash.
          </p>
          <div className="border-line overflow-hidden rounded-xl border">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-2 text-fg-subtle text-xs">
                <tr>
                  <th className="px-3 py-2 font-medium">User</th>
                  <th className="px-3 py-2 font-medium">SHA-256 hash</th>
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {LEAKED_UNSALTED.map((l) => (
                  <tr key={l.user} className={cn(reusedUsers.has(l.user) && 'bg-warning-soft')}>
                    <td className="px-3 py-2 font-mono text-xs">{l.user}</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {short(l.hash)}
                      {reusedUsers.has(l.user) && (
                        <Badge tone="warning" className="ml-2">
                          reused
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="crack" className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-4 p-5">
          <p className="text-fg-muted text-sm">
            The attack hashes each of the {WORDLIST.length} wordlist entries once, then looks up
            every leaked hash in that table.
          </p>
          <Button onClick={handleCrack} className="gap-2">
            <Unlock className="size-4" aria-hidden /> Run wordlist attack
          </Button>
          {unsaltedReport && (
            <div className="space-y-2">
              <div className="border-danger/40 bg-danger-soft flex items-center gap-2 rounded-lg border p-3 text-sm">
                <Unlock className="text-danger size-5 shrink-0" aria-hidden />
                Cracked {unsaltedReport.cracked} of {unsaltedReport.total} in a single pass over the
                wordlist.
              </div>
              <CrackTable report={unsaltedReport} />
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="harden" className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-4 p-5">
          <p className="text-fg-muted text-sm">
            Each storage choice changes the attacker&rsquo;s cost. The cost column counts hash
            operations to try the whole wordlist against all {ACCOUNTS.length} accounts.
          </p>
          <div className="border-line overflow-hidden rounded-xl border">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-2 text-fg-subtle text-xs">
                <tr>
                  <th className="px-3 py-2 font-medium">Storage</th>
                  <th className="px-3 py-2 font-medium">Reuse visible?</th>
                  <th className="px-3 py-2 font-medium">Attack cost (hash ops)</th>
                  <th className="px-3 py-2 font-medium">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {SCHEMES.map((s) => (
                  <tr key={s.key}>
                    <td className="px-3 py-2">{s.label}</td>
                    <td className="px-3 py-2">
                      <span className={s.reuseVisible ? 'text-danger' : 'text-success'}>
                        {s.reuseVisible ? 'yes' : 'no'}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs tabular-nums">
                      {s.cost.toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={s.tone}>{s.verdict}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSaltedCrack} variant="secondary" className="gap-2">
              <Play className="size-4" aria-hidden /> Attack the salted fast hashes
            </Button>
            <Button onClick={handlePbkdf2} className="gap-2">
              <ShieldCheck className="size-4" aria-hidden /> Store with PBKDF2
            </Button>
          </div>
          {saltedReport && (
            <p className="text-fg-muted text-sm">
              Salted fast hash: still cracked {saltedReport.cracked}/{saltedReport.total}, but it
              took {saltedReport.work} hash operations instead of {WORDLIST.length} — the salt
              removed the shared shortcut.
            </p>
          )}
          {pbkdf2Sample && (
            <div className="border-success/40 bg-success-soft space-y-1 rounded-xl border p-4 text-sm">
              <div className="flex items-center gap-2">
                <Database className="text-success size-4" aria-hidden />
                <span className="text-fg font-semibold">Stored with salted PBKDF2</span>
              </div>
              <code className="text-fg-muted block font-mono text-xs break-all">
                {short(pbkdf2Sample)}
              </code>
              <p className="text-fg-muted">
                Each of the attacker&rsquo;s guesses now costs {PBKDF2_ITERATIONS.toLocaleString()}{' '}
                hashes, turning a one-pass breach into an impractical one.
              </p>
            </div>
          )}
          <div className="prose-lesson max-w-none text-sm">
            <Markdown compact>
              {`**Store passwords with a salted, slow hash.** Use a purpose-built password KDF — Argon2id, scrypt, bcrypt, or PBKDF2 — with a unique per-user salt and a high work factor. A general-purpose hash like SHA-256 is fast by design, which is exactly what you do not want for passwords.`}
            </Markdown>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );

  return (
    <LabLayout
      lab={passwordCrackingLab}
      guide={guide}
      workspace={workspace}
      evidence={<EvidenceLog entries={log} onClear={() => setLog([])} />}
      onReset={reset}
    />
  );
}
