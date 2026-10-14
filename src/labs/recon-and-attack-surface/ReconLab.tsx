import { EyeOff, Flag, Globe, Lock, Search, ShieldCheck } from 'lucide-react';
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
  type HardeningAction,
  type SurfaceState,
  HOSTS,
  LEAKED_SUBDOMAIN_FLAG,
  OSINT_CARDS,
  ORG_NAME,
  applyHardening,
  attackSurfaceScore,
  footprintComplete,
  initialState,
  isMinimalExposure,
} from './engine';
import { reconAttackSurfaceLab } from './index';

const REDUCE_TARGET = 25;

const riskTone = { low: 'neutral', medium: 'warning', high: 'danger' } as const;

function scoreTone(score: number) {
  if (score < REDUCE_TARGET) return 'text-success';
  if (score < 50) return 'text-warning';
  return 'text-danger';
}

export default function ReconLab() {
  const [opened, setOpened] = useState<string[]>([]);
  const [state, setState] = useState<SurfaceState>(() => initialState());
  const [log, setLog] = useState<EvidenceEntry[]>([]);
  const add = (e: EvidenceEntry) => setLog((prev) => [...prev, e]);

  const discovered = useMemo(() => {
    const set = new Set<string>();
    for (const card of OSINT_CARDS) {
      if (opened.includes(card.id)) card.reveals.forEach((r) => set.add(r));
    }
    return set;
  }, [opened]);

  const score = attackSurfaceScore(state);
  const minimal = isMinimalExposure(state);

  const openCard = (id: string) => {
    if (opened.includes(id)) return;
    const next = [...opened, id];
    setOpened(next);
    const card = OSINT_CARDS.find((c) => c.id === id);
    add(
      evidence(
        'info',
        `Investigated: ${card?.title}`,
        card?.reveals.length
          ? `Revealed ${card.reveals.length} host(s) in the footprint.`
          : 'Revealed a verbose metadata leak.',
      ),
    );
    if (id === 'ct-log') {
      add(
        evidence(
          'warning',
          'Leaked internal host found in a certificate-transparency log',
          `dev-admin.northwind.example.test is internal but internet-exposed. Flag: ${LEAKED_SUBDOMAIN_FLAG}`,
        ),
      );
    }
    if (footprintComplete(next)) {
      markChallengeSolved('recon-footprint');
      add(
        evidence(
          'success',
          'Footprint complete',
          'Every host the organization exposes has been discovered through OSINT.',
        ),
      );
    }
  };

  const harden = (action: HardeningAction, desc: string) => {
    const next = applyHardening(state, action);
    setState(next);
    const s = attackSurfaceScore(next);
    add(evidence('info', desc, `Attack-surface score is now ${s}.`));
    if (s < REDUCE_TARGET) markChallengeSolved('recon-reduce');
    if (isMinimalExposure(next)) {
      markChallengeSolved('recon-minimal');
      add(
        evidence(
          'success',
          'Minimal exposure reached',
          'Only intended public hosts remain exposed, with no high-risk ports and no metadata leak.',
        ),
      );
    }
  };

  const reset = () => {
    setOpened([]);
    setState(initialState());
    setLog([]);
  };

  const guide = (
    <div className="space-y-5">
      <p className="text-fg-muted text-sm leading-relaxed">
        Before any attack comes <strong className="text-fg">reconnaissance</strong>. You will map{' '}
        {ORG_NAME} from open-source intelligence, measure the{' '}
        <strong className="text-fg">attack surface</strong> that exposes it, then shrink that
        surface the way a defender would.
      </p>
      <LabSteps
        steps={[
          { title: 'Gather OSINT', body: 'Open every intelligence source to reveal all hosts.' },
          { title: 'Spot the leak', body: 'Find the internal host exposed via a certificate log.' },
          { title: 'Measure', body: 'Read the attack-surface score and what drives it.' },
          { title: 'Reduce', body: 'Move internal hosts off the internet and close risky ports.' },
          { title: 'Minimize', body: 'Reach a posture of only intended public hosts and ports.' },
        ]}
      />
      <Callout tone="info" title="Fictional fixtures only">
        Every host, record, and port is a static fixture for the reserved <code>example.test</code>{' '}
        domain and reserved IP ranges. Nothing is scanned, resolved, or connected to.
      </Callout>
    </div>
  );

  const workspace = (
    <Tabs defaultValue="osint" className="flex h-full flex-col">
      <TabsList className="shrink-0 px-4 pt-2">
        <TabsTrigger value="osint">OSINT</TabsTrigger>
        <TabsTrigger value="surface">Surface</TabsTrigger>
      </TabsList>

      <TabsContent value="osint" className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <p className="text-fg-muted text-sm">Investigate each source to build the footprint.</p>
            <Badge tone={discovered.size === HOSTS.length ? 'success' : 'neutral'}>
              {discovered.size}/{HOSTS.length} hosts
            </Badge>
          </div>
          {OSINT_CARDS.map((card) => {
            const isOpen = opened.includes(card.id);
            return (
              <div key={card.id} className="border-line bg-surface-2 rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-fg text-sm font-semibold">{card.title}</div>
                    <div className="text-fg-subtle text-xs">{card.source}</div>
                  </div>
                  {!isOpen && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openCard(card.id)}
                      className="gap-1.5 shrink-0"
                    >
                      <Search className="size-3.5" aria-hidden /> Investigate
                    </Button>
                  )}
                </div>
                {isOpen && (
                  <div className="mt-2 space-y-2">
                    <p className="text-fg-muted text-sm">{card.summary}</p>
                    {card.reveals.length > 0 && (
                      <ul className="space-y-1">
                        {card.reveals.map((id) => {
                          const host = HOSTS.find((x) => x.id === id);
                          if (!host) return null;
                          return (
                            <li key={id} className="flex items-center gap-2 font-mono text-xs">
                              <span className="text-accent-text">{host.host}</span>
                              <span className="text-fg-subtle">{host.ip}</span>
                              {host.sensitive && (
                                <Badge tone="danger" className="ml-1">
                                  sensitive
                                </Badge>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {card.id === 'ct-log' && (
                      <div className="border-danger/40 bg-danger-soft text-fg flex items-center gap-2 rounded-lg border p-2 font-mono text-xs">
                        <Flag className="text-danger size-4 shrink-0" aria-hidden />
                        {LEAKED_SUBDOMAIN_FLAG}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </TabsContent>

      <TabsContent value="surface" className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-fg-subtle text-xs">Attack-surface score (lower is better)</div>
              <div className={cn('text-2xl font-semibold tabular-nums', scoreTone(score))}>
                {score}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {minimal && (
                <Badge tone="success" className="gap-1">
                  <ShieldCheck className="size-3.5" aria-hidden /> Minimal exposure
                </Badge>
              )}
              <Button
                size="sm"
                variant={state.metadataLeaked ? 'secondary' : 'ghost'}
                disabled={!state.metadataLeaked}
                onClick={() =>
                  harden({ kind: 'strip-metadata' }, 'Stripped the leaking document metadata')
                }
                className="gap-1.5"
              >
                <EyeOff className="size-3.5" aria-hidden />
                {state.metadataLeaked ? 'Strip metadata' : 'Metadata stripped'}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {HOSTS.map((host) => {
              const exposed = state.exposed[host.id];
              const openPorts = state.openPorts[host.id] ?? [];
              return (
                <div
                  key={host.id}
                  className={cn(
                    'border-line rounded-xl border p-3',
                    exposed && host.intent === 'internal' ? 'bg-danger-soft' : 'bg-surface-2',
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {host.intent === 'public' ? (
                        <Globe className="text-fg-subtle size-4" aria-hidden />
                      ) : (
                        <Lock className="text-fg-subtle size-4" aria-hidden />
                      )}
                      <span className="font-mono text-xs">{host.host}</span>
                      <Badge tone={host.intent === 'public' ? 'info' : 'neutral'}>
                        {host.intent}
                      </Badge>
                      {exposed ? (
                        <Badge tone="danger">internet-exposed</Badge>
                      ) : (
                        <Badge tone="success">internal only</Badge>
                      )}
                    </div>
                    {exposed && host.intent === 'internal' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          harden(
                            { kind: 'make-internal', hostId: host.id },
                            `Took ${host.host} off the internet`,
                          )
                        }
                      >
                        Make internal
                      </Button>
                    )}
                  </div>
                  {exposed && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {host.ports.map((p) => {
                        const isOpen = openPorts.includes(p.port);
                        if (!isOpen) return null;
                        return (
                          <button
                            key={p.port}
                            type="button"
                            onClick={() =>
                              harden(
                                { kind: 'close-port', hostId: host.id, port: p.port },
                                `Closed port ${p.port} (${p.service}) on ${host.host}`,
                              )
                            }
                            className="group inline-flex items-center gap-1"
                            title={`Close ${p.service}`}
                          >
                            <Badge tone={riskTone[p.risk]}>
                              {p.port} {p.service}
                              <span className="text-fg-subtle group-hover:text-fg ml-1">×</span>
                            </Badge>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="prose-lesson max-w-none text-sm">
            <Markdown compact>
              {`**Reduce exposure, don't just patch it.** The biggest wins are structural: an internal admin panel or database on the public internet is a far larger risk than any single open port. Move those behind the VPN, close high-risk services (SSH, RDP, databases), and stop leaking metadata that helps an attacker map you. What should remain is only what you intend to publish.`}
            </Markdown>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );

  return (
    <LabLayout
      lab={reconAttackSurfaceLab}
      guide={guide}
      workspace={workspace}
      evidence={<EvidenceLog entries={log} onClear={() => setLog([])} />}
      onReset={reset}
    />
  );
}
