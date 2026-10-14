import { Eye, EyeOff, Flag, Frame, Play, ShieldCheck } from 'lucide-react';
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
  ATTACKER_ORIGIN,
  BANK_ORIGIN,
  type ClickjackResult,
  type CsrfDefenses,
  type CsrfResult,
  CSRF_NONE,
  forgeTransfer,
  framingAttack,
} from './engine';
import { csrfClickjackingLab } from './index';

export default function CsrfClickjackingLab() {
  const [defenses, setDefenses] = useState<CsrfDefenses>(CSRF_NONE);
  const [csrf, setCsrf] = useState<CsrfResult | null>(null);
  const [protect, setProtect] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [clickjack, setClickjack] = useState<ClickjackResult | null>(null);
  const [log, setLog] = useState<EvidenceEntry[]>([]);
  const add = (e: EvidenceEntry) => setLog((prev) => [...prev, e]);

  const fireCsrf = () => {
    const r = forgeTransfer(defenses);
    setCsrf(r);
    if (r.accepted) {
      add(evidence('danger', 'Forged transfer accepted', `${r.reason}\nFlag: ${r.flag}`));
    } else {
      if (defenses.sameSite) markChallengeSolved('csrf-samesite');
      if (defenses.csrfToken) markChallengeSolved('csrf-token');
      add(evidence('success', 'Forged transfer rejected', r.reason));
    }
  };

  const loadAttackerPage = () => {
    const r = framingAttack(protect);
    setClickjack(r);
    if (r.clickStolen) {
      add(evidence('danger', 'Click hijacked through the frame', `${r.reason}\nFlag: ${r.flag}`));
    } else {
      markChallengeSolved('clickjack-defense');
      add(evidence('success', 'Framing refused by the browser', r.reason));
    }
  };

  const reset = () => {
    setDefenses(CSRF_NONE);
    setCsrf(null);
    setProtect(false);
    setReveal(false);
    setClickjack(null);
    setLog([]);
  };

  const guide = (
    <div className="space-y-5">
      <p className="text-fg-muted text-sm leading-relaxed">
        Both attacks abuse the fact that a victim is already{' '}
        <strong className="text-fg">logged in</strong>. CSRF rides the session cookie the browser
        attaches for you; clickjacking frames the real page and steals the click. You will fire
        each, then switch on the header or cookie flag that stops it.
      </p>
      <LabSteps
        steps={[
          {
            title: 'Forge a request',
            body: 'Make the victim’s browser POST a transfer to the bank.',
          },
          {
            title: 'Withhold the cookie',
            body: 'Use SameSite so the cookie is not sent cross-site.',
          },
          { title: 'Add a token', body: 'Require a value the attacker origin cannot read.' },
          { title: 'Hijack a click', body: 'Frame the bank under a decoy and steal the click.' },
          { title: 'Refuse the frame', body: "Send frame-ancestors 'none' and break the overlay." },
        ]}
      />
      <Callout tone="info" title="A model of the browser, not a live site">
        No cross-origin request is actually sent. The functions model what a browser and server
        would do with these defenses on or off; both sites are fictional.
      </Callout>
    </div>
  );

  const workspace = (
    <Tabs defaultValue="csrf" className="flex h-full flex-col">
      <TabsList className="shrink-0 px-4 pt-2">
        <TabsTrigger value="csrf">CSRF</TabsTrigger>
        <TabsTrigger value="clickjacking">Clickjacking</TabsTrigger>
      </TabsList>

      {/* --- CSRF --- */}
      <TabsContent value="csrf" className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-4 p-5">
          <div className="border-line bg-surface/40 rounded-xl border p-4 text-xs">
            <div className="text-fg-muted">
              The victim is logged into <code className="text-fg">{BANK_ORIGIN}</code>. They open{' '}
              <code className="text-danger">{ATTACKER_ORIGIN}</code>, which auto-submits a hidden
              form:
            </div>
            <pre className="text-fg-muted mt-2 overflow-x-auto font-mono text-[0.7rem] whitespace-pre-wrap">
              {`POST ${BANK_ORIGIN}/transfer
Cookie: session=…         ${defenses.sameSite ? '← withheld (SameSite)' : '← attached by the browser'}
csrf_token: ${defenses.csrfToken ? '(required, but absent)' : '(not required)'}
amount=5000&to=attacker`}
            </pre>
          </div>

          <div className="border-line bg-surface/40 rounded-xl border p-4">
            <div className="text-fg-subtle mb-2 text-xs font-semibold tracking-[0.1em] uppercase">
              Server defenses
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={defenses.sameSite ? 'ghost' : 'secondary'}
                disabled={defenses.sameSite}
                onClick={() => setDefenses((d) => ({ ...d, sameSite: true }))}
              >
                {defenses.sameSite ? '✓ SameSite cookies' : 'Enable SameSite cookies'}
              </Button>
              <Button
                size="sm"
                variant={defenses.csrfToken ? 'ghost' : 'secondary'}
                disabled={defenses.csrfToken}
                onClick={() => setDefenses((d) => ({ ...d, csrfToken: true }))}
              >
                {defenses.csrfToken ? '✓ Anti-CSRF token' : 'Require anti-CSRF token'}
              </Button>
            </div>
          </div>

          <Button onClick={fireCsrf} className="gap-1.5">
            <Play className="size-4" aria-hidden /> Fire the hidden form
          </Button>

          {csrf && (
            <div
              className={cn(
                'space-y-2 rounded-xl border p-4',
                csrf.accepted
                  ? 'border-danger/40 bg-danger-soft'
                  : 'border-success/40 bg-success-soft',
              )}
            >
              <div className="flex items-center gap-2">
                {csrf.accepted ? (
                  <Badge tone="danger">transfer executed</Badge>
                ) : (
                  <Badge tone="success" className="gap-1">
                    <ShieldCheck className="size-3.5" aria-hidden /> forgery blocked
                  </Badge>
                )}
              </div>
              <p className="text-fg text-sm">{csrf.reason}</p>
              {csrf.accepted && csrf.flag && (
                <div className="border-accent/40 bg-accent-soft text-fg flex items-center gap-2 rounded-md border p-2 font-mono text-xs">
                  <Flag className="text-accent-text size-4 shrink-0" aria-hidden />
                  {csrf.flag}
                </div>
              )}
            </div>
          )}
        </div>
      </TabsContent>

      {/* --- Clickjacking --- */}
      <TabsContent value="clickjacking" className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-fg-muted max-w-sm text-sm">
              The attacker page stacks the bank&rsquo;s real Transfer button, invisible, on top of a
              tempting decoy.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setReveal((r) => !r)}
                className="gap-1.5"
              >
                {reveal ? (
                  <EyeOff className="size-3.5" aria-hidden />
                ) : (
                  <Eye className="size-3.5" aria-hidden />
                )}
                {reveal ? 'Hide overlay' : 'Reveal overlay'}
              </Button>
              <Button
                size="sm"
                variant={protect ? 'ghost' : 'secondary'}
                disabled={protect}
                onClick={() => setProtect(true)}
                className="gap-1.5"
              >
                <ShieldCheck className="size-3.5" aria-hidden />
                {protect ? '✓ Frame protection' : 'Enable frame protection'}
              </Button>
            </div>
          </div>

          {/* Visual stack */}
          <div className="border-line bg-surface-2 relative flex h-56 items-center justify-center overflow-hidden rounded-xl border">
            {protect ? (
              <div className="text-fg-subtle flex flex-col items-center gap-2 text-sm">
                <Frame className="size-8 opacity-40" aria-hidden />
                This content cannot be displayed in a frame.
                <span className="text-xs">frame-ancestors &apos;none&apos;</span>
              </div>
            ) : (
              <>
                {/* Decoy */}
                <button
                  type="button"
                  className="bg-accent text-on-accent rounded-lg px-6 py-3 text-lg font-bold shadow-lg"
                >
                  🎁 Claim your free prize
                </button>
                {/* Hidden framed bank control, overlaid */}
                <div
                  className={cn(
                    'absolute inset-0 flex items-center justify-center transition-opacity',
                    reveal ? 'opacity-70' : 'opacity-0',
                  )}
                  aria-hidden={!reveal}
                >
                  <div className="border-danger/50 bg-danger-soft rounded-lg border-2 border-dashed p-3">
                    <div className="text-fg-subtle mb-1 text-center text-[0.6rem]">
                      {BANK_ORIGIN} (framed)
                    </div>
                    <div className="bg-danger/80 rounded-md px-6 py-3 text-center font-bold text-white">
                      Transfer $5,000 →
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <Button onClick={loadAttackerPage} className="gap-1.5">
            <Play className="size-4" aria-hidden /> Load attacker page and click
          </Button>

          {clickjack && (
            <div
              className={cn(
                'space-y-2 rounded-xl border p-4',
                clickjack.clickStolen
                  ? 'border-danger/40 bg-danger-soft'
                  : 'border-success/40 bg-success-soft',
              )}
            >
              <Badge tone={clickjack.clickStolen ? 'danger' : 'success'}>
                {clickjack.clickStolen ? 'click hijacked' : 'framing refused'}
              </Badge>
              <p className="text-fg text-sm">{clickjack.reason}</p>
              {clickjack.clickStolen && clickjack.flag && (
                <div className="border-accent/40 bg-accent-soft text-fg flex items-center gap-2 rounded-md border p-2 font-mono text-xs">
                  <Flag className="text-accent-text size-4 shrink-0" aria-hidden />
                  {clickjack.flag}
                </div>
              )}
            </div>
          )}

          <div className="prose-lesson max-w-none text-sm">
            <Markdown compact>
              {`**Clickjacking** (UI redressing) loads a target page in a transparent iframe over bait, so a click meant for the bait is delivered to a hidden control on the real page. The defense is to forbid framing: send **Content-Security-Policy: frame-ancestors 'none'** (or the older **X-Frame-Options: DENY**) on sensitive pages. Pair it with SameSite cookies so a framed page has no ambient authority either.`}
            </Markdown>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );

  return (
    <LabLayout
      lab={csrfClickjackingLab}
      guide={guide}
      workspace={workspace}
      evidence={<EvidenceLog entries={log} onClear={() => setLog([])} />}
      onReset={reset}
    />
  );
}
