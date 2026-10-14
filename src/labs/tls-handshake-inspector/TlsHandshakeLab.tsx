import { CircleCheck, CircleX, Flag, KeyRound, Lock, Play, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Markdown } from '@/components/markdown/Markdown';
import { Button } from '@/components/ui/Button';
import { Badge, Callout } from '@/components/ui/primitives';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/radix';
import { cn } from '@/lib/cn';
import { markChallengeSolved } from '@/lib/progress';

import { EvidenceLog, type EvidenceEntry, evidence } from '../components/EvidenceLog';
import { LabLayout, LabSteps } from '../components/LabLayout';
import {
  CERT_PIN_FLAG,
  type Cert,
  EXPECTED_HOST,
  REFERENCE_NOW,
  SCENARIOS,
  type ScenarioKind,
  type VerifyReport,
  createCa,
  issueCert,
  verifyCert,
} from './engine';
import { tlsHandshakeLab } from './index';

const TRUSTED_CA_NAME = 'Example Trust Root CA';

/** The TLS 1.3 handshake message flow, shown for context. `here` marks the step
 * this lab exercises: the client validating the server's Certificate. */
const HANDSHAKE_FLOW: { dir: string; msg: string; desc: string; here: boolean }[] = [
  {
    dir: '→',
    msg: 'ClientHello',
    desc: 'offers TLS versions, cipher suites, and a key share',
    here: false,
  },
  {
    dir: '←',
    msg: 'ServerHello',
    desc: 'picks the version and cipher, returns its key share',
    here: false,
  },
  { dir: '←', msg: 'Certificate', desc: 'the server sends its certificate chain', here: true },
  {
    dir: '←',
    msg: 'CertificateVerify',
    desc: 'the server proves it holds the matching private key',
    here: false,
  },
  {
    dir: '↔',
    msg: 'Finished',
    desc: 'both sides confirm, then encrypted application data flows',
    here: false,
  },
];

interface Setup {
  trustedCaPublicKey: CryptoKey;
  certs: Record<ScenarioKind, Cert>;
  genuine: Cert;
  rogue: Cert;
}

interface ScenarioResult {
  ok: boolean;
  report?: VerifyReport;
}

function shortFp(fp: string) {
  return `${fp.slice(0, 20)}…`;
}

/** Format an epoch-ms timestamp as a UTC calendar date (YYYY-MM-DD). */
function fmtDate(ms: number) {
  return new Date(ms).toISOString().slice(0, 10);
}

function CheckRow({ label, pass }: { label: string; pass: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {pass ? (
        <CircleCheck className="text-success size-3.5 shrink-0" aria-hidden />
      ) : (
        <CircleX className="text-danger size-3.5 shrink-0" aria-hidden />
      )}
      <span className="sr-only">{pass ? 'pass' : 'fail'}:</span>
      <span className={cn(pass ? 'text-fg-muted' : 'text-fg')}>{label}</span>
    </div>
  );
}

export default function TlsHandshakeLab() {
  const [setup, setSetup] = useState<Setup | null>(null);
  const [enforce, setEnforce] = useState(false);
  const [pinning, setPinning] = useState(false);
  const [hsts, setHsts] = useState(false);
  const [results, setResults] = useState<Partial<Record<ScenarioKind, ScenarioResult>>>({});
  const [pinFlagShown, setPinFlagShown] = useState(false);
  const trustPolicyDone = useRef(false);
  const [log, setLog] = useState<EvidenceEntry[]>([]);
  const add = (e: EvidenceEntry) => setLog((prev) => [...prev, e]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ca = await createCa(TRUSTED_CA_NAME);
      const certs = {} as Record<ScenarioKind, Cert>;
      for (const s of SCENARIOS) {
        certs[s.kind] = await issueCert({
          subject: s.subject,
          notBefore: s.notBefore,
          notAfter: s.notAfter,
          ca: s.selfSigned ? undefined : ca,
          selfSigned: s.selfSigned,
        });
      }
      const valid = SCENARIOS.find((s) => s.kind === 'valid');
      const rogue = await issueCert({
        subject: EXPECTED_HOST,
        notBefore: valid?.notBefore ?? REFERENCE_NOW,
        notAfter: valid?.notAfter ?? REFERENCE_NOW,
        ca,
      });
      if (cancelled) return;
      setSetup({ trustedCaPublicKey: ca.publicKey, certs, genuine: certs.valid, rogue });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Record the trust-policy win once all four certificates have been sorted
  // correctly. Called from the validate handlers rather than an effect, so it
  // runs exactly once per user action (event handlers are never re-invoked by
  // StrictMode the way effects and updaters are) and never triggers a cascading
  // render. The ref guard stops a repeat log if the user keeps validating.
  const recordTrustPolicy = (next: Partial<Record<ScenarioKind, ScenarioResult>>) => {
    if (trustPolicyDone.current) return;
    const all = SCENARIOS.every((s) => next[s.kind]?.report);
    if (!all) return;
    const correct =
      next.valid?.report?.ok === true &&
      next.expired?.report?.ok === false &&
      next['hostname-mismatch']?.report?.ok === false &&
      next['self-signed']?.report?.ok === false;
    if (!correct) return;
    trustPolicyDone.current = true;
    markChallengeSolved('tls-trust-policy');
    add(
      evidence(
        'success',
        'Trust policy sorts all four certificates correctly',
        'Only the valid certificate was accepted; expired, hostname-mismatched, and self-signed were all rejected.',
      ),
    );
  };

  const runValidate = async (s: Setup, kind: ScenarioKind): Promise<ScenarioResult> => {
    const cert = s.certs[kind];
    if (!enforce) {
      const entry: ScenarioResult = { ok: true };
      setResults((prev) => ({ ...prev, [kind]: entry }));
      add(
        evidence(
          'warning',
          `Accepted ${cert.subject} with verification OFF`,
          'The client trusted the certificate without any checks. This is the disabled-verification bug: turn verification on to actually validate.',
        ),
      );
      return entry;
    }
    const report = await verifyCert(cert, {
      trustedCaPublicKey: s.trustedCaPublicKey,
      hostname: EXPECTED_HOST,
      now: REFERENCE_NOW,
    });
    const entry: ScenarioResult = { ok: report.ok, report };
    setResults((prev) => ({ ...prev, [kind]: entry }));
    if (report.ok) {
      add(
        evidence(
          'success',
          `Accepted ${cert.subject}`,
          'Signature from the trusted CA, within validity, and the hostname matches.',
        ),
      );
    } else {
      add(evidence('danger', `Rejected ${cert.subject}`, report.reasons.join('\n')));
    }
    return entry;
  };

  const validate = async (kind: ScenarioKind) => {
    if (!setup) return;
    const entry = await runValidate(setup, kind);
    recordTrustPolicy({ ...results, [kind]: entry });
  };

  const validateAll = async () => {
    if (!setup) return;
    const next: Partial<Record<ScenarioKind, ScenarioResult>> = { ...results };
    for (const s of SCENARIOS) {
      next[s.kind] = await runValidate(setup, s.kind);
    }
    recordTrustPolicy(next);
  };

  const toggleEnforce = () => {
    // Keep the state update pure: compute the next value and run the side effects
    // (clearing results, logging) outside the updater so StrictMode's double
    // invocation of updaters cannot double-log.
    const nextOn = !enforce;
    setEnforce(nextOn);
    setResults({});
    trustPolicyDone.current = false;
    add(
      nextOn
        ? evidence(
            'info',
            'Certificate verification: ON',
            `Policy: trust ${TRUSTED_CA_NAME}, require host ${EXPECTED_HOST}, check validity against the current time.`,
          )
        : evidence(
            'warning',
            'Certificate verification: OFF',
            'The client will accept any certificate it is shown. Nothing is checked.',
          ),
    );
  };

  const validateRogue = async () => {
    if (!setup) return;
    const report = await verifyCert(setup.rogue, {
      trustedCaPublicKey: setup.trustedCaPublicKey,
      hostname: EXPECTED_HOST,
      now: REFERENCE_NOW,
      ...(pinning ? { pinnedFingerprint: setup.genuine.fingerprint } : {}),
    });
    if (report.ok) {
      add(
        evidence(
          'danger',
          'Accepted the rogue certificate',
          'It is signed by the trusted CA for the right host and is in date, so ordinary validation accepts it. Only pinning can tell it apart from the genuine key.',
        ),
      );
    } else {
      markChallengeSolved('tls-pin');
      setPinFlagShown(true);
      add(
        evidence(
          'success',
          'Rejected the rogue certificate (pin mismatch)',
          `Its key fingerprint does not match the pinned one.\nFlag: ${CERT_PIN_FLAG}`,
        ),
      );
    }
  };

  const attemptStrip = () => {
    if (hsts) {
      markChallengeSolved('tls-hsts');
      add(
        evidence(
          'success',
          'HSTS blocked the SSL strip',
          `The browser upgraded the request for ${EXPECTED_HOST} to https and declined to send anything over http. There was no plaintext request to strip.`,
        ),
      );
    } else {
      add(
        evidence(
          'danger',
          'SSL stripping succeeded',
          `The first request to ${EXPECTED_HOST} went out over plain http and an on-path attacker read it. Without HSTS the browser had no reason to insist on https first.`,
        ),
      );
    }
  };

  const reset = () => {
    setEnforce(false);
    setPinning(false);
    setHsts(false);
    setResults({});
    setPinFlagShown(false);
    trustPolicyDone.current = false;
    setLog([]);
  };

  const guide = (
    <div className="space-y-5">
      <p className="text-fg-muted text-sm leading-relaxed">
        A browser will not trust a site on its say-so. You will play the{' '}
        <strong className="text-fg">client</strong>: verify real signatures made with the Web Crypto
        API, reject the certificates a real browser rejects, then add the two protections — HSTS and
        pinning — that close what plain validation leaves open.
      </p>
      <LabSteps
        steps={[
          {
            title: 'Turn verification on',
            body: 'See why a client that accepts anything is no client at all.',
          },
          {
            title: 'Validate four certificates',
            body: 'Accept the valid one; reject expired, mismatched, self-signed.',
          },
          { title: 'Read the rejections', body: 'Each failure names exactly one broken check.' },
          {
            title: 'Stop SSL stripping',
            body: 'Enable HSTS so the first request is never plain http.',
          },
          { title: 'Pin the key', body: 'Refuse even a rogue certificate the trusted CA signed.' },
        ]}
      />
      <Callout tone="info" title="Real crypto, fictional certificates">
        Keys are generated in this tab with ECDSA P-256 and signatures are really produced and
        verified. No TLS connection is ever made; every host and certificate is on the reserved{' '}
        <code>example.test</code> domain.
      </Callout>
    </div>
  );

  if (!setup) {
    return (
      <LabLayout
        lab={tlsHandshakeLab}
        guide={guide}
        workspace={
          <div className="text-fg-muted flex h-full items-center justify-center gap-2 p-8 text-sm">
            <KeyRound className="size-4 animate-pulse" aria-hidden /> Generating the certificate
            authority and certificates…
          </div>
        }
      />
    );
  }

  const workspace = (
    <Tabs defaultValue="handshake" className="flex h-full flex-col">
      <TabsList className="shrink-0 px-4 pt-2">
        <TabsTrigger value="handshake">Handshake</TabsTrigger>
        <TabsTrigger value="hsts">HSTS</TabsTrigger>
        <TabsTrigger value="pinning">Pinning</TabsTrigger>
      </TabsList>

      {/* --- Handshake --- */}
      <TabsContent value="handshake" className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {enforce ? (
                <Badge tone="success" className="gap-1">
                  <ShieldCheck className="size-3.5" aria-hidden /> verification on
                </Badge>
              ) : (
                <Badge tone="danger">verification off</Badge>
              )}
              <span className="text-fg-subtle text-xs">
                reaching <code className="text-fg-muted">{EXPECTED_HOST}</code> · client clock{' '}
                <code className="text-fg-muted">{fmtDate(REFERENCE_NOW)}</code>
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={enforce ? 'secondary' : 'primary'}
                onClick={toggleEnforce}
                className="gap-1.5"
              >
                <ShieldCheck className="size-3.5" aria-hidden />
                {enforce ? 'Disable verification' : 'Enable verification'}
              </Button>
              <Button size="sm" variant="ghost" onClick={validateAll} className="gap-1.5">
                <Play className="size-3.5" aria-hidden /> Validate all
              </Button>
            </div>
          </div>

          <div className="border-line bg-surface/40 rounded-xl border p-4">
            <div className="text-fg-subtle mb-2.5 text-xs font-semibold tracking-[0.1em] uppercase">
              TLS 1.3 handshake
            </div>
            <ol className="space-y-1.5">
              {HANDSHAKE_FLOW.map((m) => (
                <li key={m.msg} className="flex items-baseline gap-2 text-xs">
                  <span className="text-fg-subtle w-3 shrink-0 text-center font-mono">{m.dir}</span>
                  <span
                    className={cn(
                      'shrink-0 font-mono font-medium',
                      m.here ? 'text-accent-text' : 'text-fg',
                    )}
                  >
                    {m.msg}
                  </span>
                  <span className="text-fg-muted">— {m.desc}</span>
                </li>
              ))}
            </ol>
            <p className="text-fg-subtle mt-2.5 text-xs">
              The client validates the{' '}
              <span className="text-accent-text font-mono">Certificate</span> the server presents
              before trusting it. Run that validation on the certificates below.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {SCENARIOS.map((s) => {
              const result = results[s.kind];
              const report = result?.report;
              return (
                <div
                  key={s.kind}
                  className="border-line bg-surface/40 space-y-3 rounded-xl border p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-fg text-sm font-semibold">{s.title}</div>
                      <div className="text-fg-subtle font-mono text-xs">subject: {s.subject}</div>
                      <div className="text-fg-subtle font-mono text-xs">
                        valid: {fmtDate(s.notBefore)} → {fmtDate(s.notAfter)}
                      </div>
                    </div>
                    {result &&
                      (result.ok ? (
                        <Badge tone={report ? 'success' : 'warning'}>
                          {report ? 'accepted' : 'accepted (unverified)'}
                        </Badge>
                      ) : (
                        <Badge tone="danger">rejected</Badge>
                      ))}
                  </div>
                  <p className="text-fg-muted text-xs leading-relaxed">{s.description}</p>
                  {report && (
                    <div className="border-line space-y-1 border-t pt-2">
                      <CheckRow label="Signature from a trusted CA" pass={report.signatureValid} />
                      <CheckRow label="Within its validity period" pass={report.notExpired} />
                      <CheckRow label="Subject matches the host" pass={report.hostnameMatches} />
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => validate(s.kind)}
                    className="w-full"
                  >
                    Validate
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </TabsContent>

      {/* --- HSTS --- */}
      <TabsContent value="hsts" className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {hsts ? (
                <Badge tone="success" className="gap-1">
                  <Lock className="size-3.5" aria-hidden /> HSTS on
                </Badge>
              ) : (
                <Badge tone="danger">HSTS off</Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={hsts ? 'ghost' : 'secondary'}
                disabled={hsts}
                onClick={() => {
                  setHsts(true);
                  add(
                    evidence(
                      'info',
                      'Enabled HSTS for the host',
                      'Strict-Transport-Security tells the browser to use https for this host and refuse http.',
                    ),
                  );
                }}
                className="gap-1.5"
              >
                <Lock className="size-3.5" aria-hidden />
                {hsts ? 'HSTS enabled' : 'Enable HSTS'}
              </Button>
              <Button size="sm" onClick={attemptStrip} className="gap-1.5">
                <Play className="size-3.5" aria-hidden /> Attempt SSL strip
              </Button>
            </div>
          </div>

          <div
            className={cn(
              'flex items-center gap-3 rounded-xl border p-4 font-mono text-sm',
              hsts
                ? 'border-success/40 bg-success-soft text-fg'
                : 'border-danger/40 bg-danger-soft text-fg',
            )}
          >
            {hsts ? (
              <>
                <Lock className="text-success size-4 shrink-0" aria-hidden />
                <span>
                  https://{EXPECTED_HOST}{' '}
                  <span className="text-fg-subtle">(http refused and upgraded)</span>
                </span>
              </>
            ) : (
              <>
                <CircleX className="text-danger size-4 shrink-0" aria-hidden />
                <span>
                  http://{EXPECTED_HOST}{' '}
                  <span className="text-fg-subtle">(downgradable by an on-path attacker)</span>
                </span>
              </>
            )}
          </div>

          <div className="prose-lesson max-w-none text-sm">
            <Markdown compact>
              {`**SSL stripping** attacks the one request that is not yet protected: the first plain-http request a browser makes before any redirect to https. An on-path attacker intercepts it, speaks https to the real server, and relays plaintext to the victim. **HSTS** (HTTP Strict Transport Security) removes that opening — the browser upgrades every request for the host to https and refuses http outright, so there is no plaintext request to strip. Preloading the host hardens even the very first visit.`}
            </Markdown>
          </div>
        </div>
      </TabsContent>

      {/* --- Pinning --- */}
      <TabsContent value="pinning" className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {pinning ? (
                <Badge tone="success" className="gap-1">
                  <KeyRound className="size-3.5" aria-hidden /> pinning on
                </Badge>
              ) : (
                <Badge tone="warning">pinning off</Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={pinning ? 'ghost' : 'secondary'}
                disabled={pinning}
                onClick={() => {
                  setPinning(true);
                  add(
                    evidence(
                      'info',
                      'Pinned the genuine key',
                      `Only a certificate whose leaf key fingerprint is ${shortFp(setup.genuine.fingerprint)} will be accepted.`,
                    ),
                  );
                }}
                className="gap-1.5"
              >
                <KeyRound className="size-3.5" aria-hidden />
                {pinning ? 'Key pinned' : 'Pin the certificate'}
              </Button>
              <Button size="sm" onClick={validateRogue} className="gap-1.5">
                <Play className="size-3.5" aria-hidden /> Present rogue certificate
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="border-line bg-surface/40 space-y-1 rounded-xl border p-4">
              <div className="flex items-center gap-2">
                <Badge tone="success">genuine</Badge>
                {pinning && <Badge tone="info">pinned</Badge>}
              </div>
              <div className="text-fg-subtle pt-1 font-mono text-xs break-all">
                {shortFp(setup.genuine.fingerprint)}
              </div>
              <p className="text-fg-muted text-xs leading-relaxed">
                The key your server actually holds. Signed by {TRUSTED_CA_NAME} for {EXPECTED_HOST}.
              </p>
            </div>
            <div className="border-line bg-surface/40 space-y-1 rounded-xl border p-4">
              <div className="flex items-center gap-2">
                <Badge tone="danger">rogue</Badge>
              </div>
              <div className="text-fg-subtle pt-1 font-mono text-xs break-all">
                {shortFp(setup.rogue.fingerprint)}
              </div>
              <p className="text-fg-muted text-xs leading-relaxed">
                A different key, also signed by {TRUSTED_CA_NAME} for {EXPECTED_HOST} — as a
                mis-issuing or compromised CA would. Valid on paper; wrong key.
              </p>
            </div>
          </div>

          {pinFlagShown && (
            <div className="border-accent/40 bg-accent-soft text-fg flex items-center gap-2 rounded-lg border p-2 font-mono text-xs">
              <Flag className="text-accent-text size-4 shrink-0" aria-hidden />
              {CERT_PIN_FLAG}
            </div>
          )}

          <div className="prose-lesson max-w-none text-sm">
            <Markdown compact>
              {`Ordinary validation trusts **any** certificate a trusted CA signs. If a CA is tricked or compromised into issuing a certificate for your host, that forged certificate passes every normal check. **Pinning** records the one key fingerprint you expect and rejects all others, even validly signed ones. The cost is operational: rotate a pinned key without updating clients and you lock yourself out, which is why pinning is reserved for high-value connections.`}
            </Markdown>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );

  return (
    <LabLayout
      lab={tlsHandshakeLab}
      guide={guide}
      workspace={workspace}
      evidence={<EvidenceLog entries={log} onClear={() => setLog([])} />}
      onReset={reset}
    />
  );
}
