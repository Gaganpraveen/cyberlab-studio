import { KeyRound, Play, ShieldCheck, Unlock, Wand2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Markdown } from '@/components/markdown/Markdown';
import { Button } from '@/components/ui/Button';
import { Badge, Callout, Spinner, inputClasses } from '@/components/ui/primitives';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/radix';
import { cn } from '@/lib/cn';
import { markChallengeSolved, useProgress } from '@/lib/progress';

import { EvidenceLog, type EvidenceEntry, evidence } from '../components/EvidenceLog';
import { LabLayout, LabSteps } from '../components/LabLayout';
import {
  type GradeReport,
  type VerifierMode,
  SERVER_SECRET,
  SESSION_PAYLOAD,
  WEAK_SECRETS,
  crackSecret,
  decodeJwt,
  forgeUnsignedJwt,
  gradeVerifier,
  signJwt,
  verify,
} from './engine';
import { jwtLab } from './index';

type ForgeMethod = 'none' | 'hs256';
type ForgeRole = 'student' | 'admin';

/** Show a token split into its three parts, colored like a JWT usually is. */
function TokenView({ token }: { token: string }) {
  const [h, p, s] = token.split('.');
  return (
    <code className="bg-code-bg block rounded-lg p-3 font-mono text-xs break-all">
      <span className="text-danger">{h}</span>
      <span className="text-fg-subtle">.</span>
      <span className="text-info">{p}</span>
      <span className="text-fg-subtle">.</span>
      <span className="text-success">{s || ''}</span>
    </code>
  );
}

function DecodedView({ token }: { token: string }) {
  const decoded = decodeJwt(token);
  if (!decoded.valid) {
    return <p className="text-danger text-sm">{decoded.error}</p>;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <div className="text-danger mb-1 text-xs font-semibold tracking-wide uppercase">Header</div>
        <pre className="bg-surface-2 border-line overflow-x-auto rounded-lg border p-2 font-mono text-xs">
          {JSON.stringify(decoded.header, null, 2)}
        </pre>
      </div>
      <div>
        <div className="text-info mb-1 text-xs font-semibold tracking-wide uppercase">Payload</div>
        <pre className="bg-surface-2 border-line overflow-x-auto rounded-lg border p-2 font-mono text-xs">
          {JSON.stringify(decoded.payload, null, 2)}
        </pre>
      </div>
    </div>
  );
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: VerifierMode;
  onChange: (m: VerifierMode) => void;
}) {
  return (
    <div
      className="border-line bg-surface-2 inline-flex rounded-lg border p-0.5"
      role="group"
      aria-label="Verifier mode"
    >
      {(['vulnerable', 'strict'] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          aria-pressed={mode === m}
          className={cn(
            'rounded-md px-3 py-1 text-sm font-medium capitalize transition-colors',
            mode === m ? 'bg-accent text-on-accent' : 'text-fg-muted hover:text-fg',
          )}
        >
          {m} verifier
        </button>
      ))}
    </div>
  );
}

export default function JwtLab() {
  const [mode, setMode] = useState<VerifierMode>('vulnerable');
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [role, setRole] = useState<ForgeRole>('admin');
  const [method, setMethod] = useState<ForgeMethod>('none');
  const [secret, setSecret] = useState('');
  const [forged, setForged] = useState<string | null>(null);
  const [forgeNote, setForgeNote] = useState<{ valid: boolean; reason?: string } | null>(null);
  const [cracked, setCracked] = useState<string | null | undefined>(undefined);
  const [grade, setGrade] = useState<GradeReport | null>(null);
  const [log, setLog] = useState<EvidenceEntry[]>([]);
  const progress = useProgress();

  const add = (e: EvidenceEntry) => setLog((prev) => [...prev, e]);

  useEffect(() => {
    let alive = true;
    signJwt(SESSION_PAYLOAD, SERVER_SECRET).then((t) => {
      if (alive) setSessionToken(t);
    });
    return () => {
      alive = false;
    };
  }, []);

  const handleForge = async () => {
    const payload = { ...SESSION_PAYLOAD, role };
    const token = method === 'none' ? forgeUnsignedJwt(payload) : await signJwt(payload, secret);
    setForged(token);
    const result = await verify(mode, token, SERVER_SECRET);
    setForgeNote({ valid: result.valid, reason: result.reason });
    add(
      evidence(
        result.valid ? (mode === 'strict' ? 'danger' : 'warning') : 'info',
        `Forged ${role} token (${method === 'none' ? 'alg: none' : 'HS256'}) — ${result.valid ? 'ACCEPTED' : 'rejected'} by ${mode} verifier`,
        result.reason,
      ),
    );
    if (result.valid && role === 'admin') {
      if (method === 'none' && mode === 'vulnerable') markChallengeSolved('jwt-alg-none');
      if (method === 'hs256' && mode === 'strict' && secret === SERVER_SECRET) {
        markChallengeSolved('jwt-forge-signed');
      }
    }
  };

  const handleCrack = async () => {
    if (!sessionToken) return;
    const found = await crackSecret(sessionToken, WEAK_SECRETS);
    setCracked(found);
    add(
      evidence(
        found ? 'danger' : 'info',
        found
          ? `Secret cracked from the wordlist: "${found}"`
          : 'No secret in the wordlist matched',
        found ? 'The token can now be forged at will.' : undefined,
      ),
    );
  };

  const handleGrade = async () => {
    const report = await gradeVerifier(mode, SERVER_SECRET);
    setGrade(report);
    add(
      evidence(
        report.secure ? 'success' : 'danger',
        `Attack battery: ${report.passed}/${report.total} handled correctly (${mode} verifier)`,
      ),
    );
    if (mode === 'strict' && report.secure) markChallengeSolved('jwt-harden');
  };

  const reset = () => {
    setMode('vulnerable');
    setRole('admin');
    setMethod('none');
    setSecret('');
    setForged(null);
    setForgeNote(null);
    setCracked(undefined);
    setGrade(null);
    setLog([]);
  };

  const guide = (
    <div className="space-y-5">
      <p className="text-fg-muted text-sm leading-relaxed">
        A <strong className="text-fg">JSON Web Token</strong> is a signed note a server gives a
        browser to prove who is signed in. If the server checks it carelessly, an attacker can forge
        one and become anyone. You will read a token, forge an admin token two different ways, then
        fix the verifier.
      </p>
      <LabSteps
        steps={[
          {
            title: 'Decode',
            body: 'See that a JWT is readable by anyone — it is signed, not encrypted.',
          },
          {
            title: 'alg: none',
            body: 'Forge an admin token with no signature and watch the weak verifier accept it.',
          },
          { title: 'Crack', body: 'Guess the weak signing secret from a wordlist.' },
          { title: 'Mint', body: 'Use the secret to sign a token even a strict verifier trusts.' },
          {
            title: 'Harden',
            body: 'Pin the algorithm, require a signature, and re-run the battery.',
          },
        ]}
      />
      <Callout tone="info" title="Fictional and local">
        Tokens are signed with real HMAC-SHA256 in your browser, but the user, the secret, and the
        session are invented. Nothing is sent anywhere.
      </Callout>
    </div>
  );

  if (!sessionToken) {
    return (
      <LabLayout
        lab={jwtLab}
        guide={guide}
        workspace={
          <div className="flex h-full items-center justify-center gap-3 p-10">
            <Spinner /> <span className="text-fg-muted text-sm">Signing the session token…</span>
          </div>
        }
      />
    );
  }

  const workspace = (
    <Tabs defaultValue="decode" className="flex h-full flex-col">
      <div className="border-line flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2">
        <TabsList>
          <TabsTrigger value="decode">Decode</TabsTrigger>
          <TabsTrigger value="forge">Forge</TabsTrigger>
          <TabsTrigger value="crack">Crack</TabsTrigger>
          <TabsTrigger value="harden">Harden</TabsTrigger>
        </TabsList>
        <ModeToggle mode={mode} onChange={setMode} />
      </div>

      <TabsContent value="decode" className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-3 p-5">
          <div className="text-fg-subtle text-xs font-semibold tracking-wide uppercase">
            The student&rsquo;s session token
          </div>
          <TokenView token={sessionToken} />
          <DecodedView token={sessionToken} />
          <Callout tone="warning" title="A signature is not a lock">
            Every part above is just base64url text. The signature proves the token was not changed;
            it does not hide the contents. Anyone can read a JWT.
          </Callout>
        </div>
      </TabsContent>

      <TabsContent value="forge" className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap gap-4">
            <label className="text-sm">
              <span className="text-fg-subtle mb-1 block text-xs font-semibold tracking-wide uppercase">
                Claim role
              </span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as ForgeRole)}
                className={inputClasses}
              >
                <option value="student">student</option>
                <option value="admin">admin</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="text-fg-subtle mb-1 block text-xs font-semibold tracking-wide uppercase">
                Method
              </span>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as ForgeMethod)}
                className={inputClasses}
              >
                <option value="none">alg: none (no signature)</option>
                <option value="hs256">HS256 (sign with a secret)</option>
              </select>
            </label>
            {method === 'hs256' && (
              <label className="text-sm">
                <span className="text-fg-subtle mb-1 block text-xs font-semibold tracking-wide uppercase">
                  Signing secret
                </span>
                <input
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="the secret you cracked"
                  spellCheck={false}
                  className={cn(inputClasses, 'font-mono')}
                />
              </label>
            )}
          </div>
          <Button onClick={handleForge} className="gap-2">
            <Wand2 className="size-4" aria-hidden /> Forge and verify ({mode})
          </Button>
          {forged && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {forgeNote?.valid ? (
                  <Badge tone={mode === 'strict' ? 'danger' : 'warning'}>Accepted as {role}</Badge>
                ) : (
                  <Badge tone="neutral">
                    Rejected{forgeNote?.reason ? `: ${forgeNote.reason}` : ''}
                  </Badge>
                )}
              </div>
              <TokenView token={forged} />
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="crack" className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-4 p-5">
          <p className="text-fg-muted text-sm">
            HS256 signs with a secret key. If the key is a common word, an attacker can try a
            wordlist offline: re-sign the token with each guess until the signature matches.
          </p>
          <Button onClick={handleCrack} className="gap-2">
            <Unlock className="size-4" aria-hidden /> Run the wordlist ({WEAK_SECRETS.length}{' '}
            guesses)
          </Button>
          {cracked !== undefined &&
            (cracked ? (
              <div className="border-danger/40 bg-danger-soft flex items-center gap-3 rounded-xl border p-4">
                <KeyRound className="text-danger size-5 shrink-0" aria-hidden />
                <div className="text-sm">
                  <div className="text-fg font-semibold">Secret found</div>
                  <code className="text-danger font-mono">{cracked}</code>
                </div>
              </div>
            ) : (
              <p className="text-fg-muted text-sm">No match — this token used a strong secret.</p>
            ))}
        </div>
      </TabsContent>

      <TabsContent value="harden" className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-4 p-5">
          <p className="text-fg-muted text-sm">
            The battery sends the real token, an <code>alg: none</code> forgery, a tampered token,
            and a wrong-secret token. A safe verifier accepts only the first.
          </p>
          <Button onClick={handleGrade} className="gap-2">
            <Play className="size-4" aria-hidden /> Run attack battery ({mode})
          </Button>
          {grade && (
            <div className="space-y-3">
              <div
                className={cn(
                  'flex items-center gap-2 rounded-lg border p-3 text-sm',
                  grade.secure
                    ? 'border-success/40 bg-success-soft'
                    : 'border-danger/40 bg-danger-soft',
                )}
              >
                <ShieldCheck
                  className={cn('size-5 shrink-0', grade.secure ? 'text-success' : 'text-danger')}
                  aria-hidden
                />
                {grade.secure
                  ? `Secure: ${grade.passed}/${grade.total} handled correctly.`
                  : `Vulnerable: only ${grade.passed}/${grade.total} handled correctly.`}
              </div>
              <div className="border-line overflow-hidden rounded-xl border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-2 text-fg-subtle text-xs">
                    <tr>
                      <th className="px-3 py-2 font-medium">Token</th>
                      <th className="px-3 py-2 font-medium">Accepted?</th>
                      <th className="px-3 py-2 font-medium">Correct?</th>
                    </tr>
                  </thead>
                  <tbody className="divide-line divide-y">
                    {grade.rows.map((r, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2">{r.description}</td>
                        <td className="px-3 py-2">{r.accepted ? 'yes' : 'no'}</td>
                        <td className="px-3 py-2">
                          <span className={r.correct ? 'text-success' : 'text-danger font-medium'}>
                            {r.correct ? 'correct' : 'WRONG'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div className="prose-lesson max-w-none text-sm">
            <Markdown compact>
              {`**Two defenses, both required.** Pin the algorithm so the verifier ignores the token's own \`alg\` and rejects \`none\`; and use a long, random secret so no wordlist can recover it. Pinning alone still loses to a weak secret, and a strong secret alone still loses to \`alg: none\`.`}
            </Markdown>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );

  const solvedCount = jwtLab.challenges.filter((c) => progress.challenges[c.id]?.solvedAt).length;

  return (
    <LabLayout
      lab={jwtLab}
      guide={guide}
      workspace={workspace}
      evidence={<EvidenceLog entries={log} onClear={() => setLog([])} />}
      onReset={reset}
      toolbar={
        solvedCount > 0 ? (
          <span className="text-fg-subtle text-xs">
            {solvedCount}/{jwtLab.challenges.length} challenges
          </span>
        ) : undefined
      }
    />
  );
}
