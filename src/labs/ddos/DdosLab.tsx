import { Activity, Play, Server, ShieldCheck, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Markdown } from '@/components/markdown/Markdown';
import { Button } from '@/components/ui/Button';
import { Badge, Callout } from '@/components/ui/primitives';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/radix';
import { cn } from '@/lib/cn';
import { markChallengeSolved } from '@/lib/progress';

import { EvidenceLog, type EvidenceEntry, evidence } from '../components/EvidenceLog';
import { LabLayout, LabSteps } from '../components/LabLayout';
import { type Defense, type SimResult, runScenario } from './engine';
import { ddosLab } from './index';

const COLLAPSE_THRESHOLD = 0.4;
const RECOVER_THRESHOLD = 0.6;

const DEFENSES: { key: Defense; label: string; blurb: string }[] = [
  { key: 'none', label: 'None', blurb: 'No mitigation — the flood hits the service directly.' },
  {
    key: 'ratelimit',
    label: 'Rate limit',
    blurb: 'Cap the requests any one source may send per tick.',
  },
  {
    key: 'scaling',
    label: 'Scale up',
    blurb: 'Add servers to absorb more load (but still serve the bots).',
  },
];

const pct = (v: number) => `${Math.round(v * 100)}%`;

function DefenseToggle({ value, onChange }: { value: Defense; onChange: (d: Defense) => void }) {
  return (
    <div
      className="border-line bg-sunken inline-flex rounded-lg border p-0.5"
      role="group"
      aria-label="Defense"
    >
      {DEFENSES.map((d) => (
        <button
          key={d.key}
          type="button"
          onClick={() => onChange(d.key)}
          aria-pressed={value === d.key}
          className={cn(
            'rounded-md px-3 py-1 text-sm font-medium transition-colors',
            value === d.key ? 'bg-accent text-on-accent' : 'text-fg-muted hover:text-fg',
          )}
        >
          {d.label}
        </button>
      ))}
    </div>
  );
}

/** A small dependency-free SVG chart of legitimate throughput over time. */
function ThroughputChart({ result }: { result: SimResult }) {
  const W = 480;
  const H = 150;
  const padL = 30;
  const padR = 8;
  const padT = 10;
  const padB = 20;
  const s = result.samples;
  const n = s.length;
  const x = (i: number) => padL + (i / Math.max(1, n - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - v) * (H - padT - padB);

  const line = s.map((d, i) => `${x(i).toFixed(1)},${y(d.legitThroughput).toFixed(1)}`).join(' ');
  const area = `${x(0).toFixed(1)},${y(0).toFixed(1)} ${line} ${x(n - 1).toFixed(1)},${y(0).toFixed(1)}`;

  const attackIdx = s.filter((d) => d.attacking).map((d) => d.tick);
  const aStart = attackIdx.length ? Math.min(...attackIdx) : null;
  const aEnd = attackIdx.length ? Math.max(...attackIdx) : null;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="Legitimate traffic served over time"
    >
      {/* gridlines */}
      {[0, 0.5, 1].map((g) => (
        <g key={g} className="text-line">
          <line x1={padL} x2={W - padR} y1={y(g)} y2={y(g)} stroke="currentColor" strokeWidth={1} />
          <text x={2} y={y(g) + 3} className="fill-fg-subtle" fontSize={9}>
            {pct(g)}
          </text>
        </g>
      ))}

      {/* attack window */}
      {aStart !== null && aEnd !== null && (
        <g className="text-danger">
          <rect
            x={x(aStart)}
            y={padT}
            width={x(aEnd) - x(aStart)}
            height={H - padT - padB}
            fill="currentColor"
            fillOpacity={0.1}
          />
          <text
            x={(x(aStart) + x(aEnd)) / 2}
            y={padT + 10}
            textAnchor="middle"
            fontSize={9}
            className="fill-danger"
          >
            flood
          </text>
        </g>
      )}

      {/* throughput */}
      <g className="text-accent-text">
        <polygon points={area} fill="currentColor" fillOpacity={0.15} />
        <polyline points={line} fill="none" stroke="currentColor" strokeWidth={2} />
      </g>
    </svg>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'danger' | 'success';
}) {
  return (
    <div className="border-line bg-surface-2 rounded-xl border p-3">
      <div className="text-fg-subtle text-xs">{label}</div>
      <div
        className={cn(
          'mt-1 text-lg font-semibold tabular-nums',
          tone === 'danger' && 'text-danger',
          tone === 'success' && 'text-success',
          !tone && 'text-fg',
        )}
      >
        {value}
      </div>
    </div>
  );
}

export default function DdosLab() {
  const [defense, setDefense] = useState<Defense>('none');
  const [result, setResult] = useState<SimResult | null>(null);
  const [log, setLog] = useState<EvidenceEntry[]>([]);
  const add = (e: EvidenceEntry) => setLog((prev) => [...prev, e]);

  const comparison = useMemo(
    () =>
      DEFENSES.map((d) => {
        const t = runScenario({ defense: d.key }).totals;
        return { ...d, totals: t };
      }),
    [],
  );

  const run = () => {
    const r = runScenario({ defense });
    setResult(r);
    const avail = r.totals.attackWindowAvailability;
    if (defense === 'none' && avail < COLLAPSE_THRESHOLD) {
      markChallengeSolved('ddos-collapse');
      add(
        evidence(
          'danger',
          `Undefended flood: only ${pct(avail)} of real users got through`,
          `The botnet saturated the queue; ${r.totals.legitDropped} legitimate requests were dropped during the attack.`,
        ),
      );
    } else if (defense === 'ratelimit' && avail >= RECOVER_THRESHOLD) {
      markChallengeSolved('ddos-ratelimit');
      add(
        evidence(
          'success',
          `Rate limiting restored availability to ${pct(avail)}`,
          `Bots were capped to a real user's budget, so only ${r.totals.attackServed} bot requests were served instead of flooding the queue.`,
        ),
      );
    } else {
      add(
        evidence(
          defense === 'scaling' ? 'warning' : 'info',
          `${DEFENSES.find((d) => d.key === defense)?.label}: ${pct(avail)} of real users served during the attack`,
          defense === 'scaling'
            ? `Scaling helped, but it still served ${r.totals.attackServed} bot requests — expensive, and it cannot outrun a big enough flood.`
            : undefined,
        ),
      );
    }
  };

  const reset = () => {
    setDefense('none');
    setResult(null);
    setLog([]);
  };

  const guide = (
    <div className="space-y-5">
      <p className="text-fg-muted text-sm leading-relaxed">
        A small service can only handle so many requests at once. A{' '}
        <strong className="text-fg">denial-of-service</strong> attack weaponizes that limit: it
        floods the service until real users cannot get through. You will run the flood, watch
        availability collapse, then compare mitigations.
      </p>
      <LabSteps
        steps={[
          { title: 'Baseline', body: 'Run with no defense and watch real users get crowded out.' },
          { title: 'Rate limit', body: 'Cap per-source traffic and run the same flood again.' },
          { title: 'Scale up', body: 'Add capacity instead, and see how far that alone gets you.' },
          { title: 'Compare', body: 'Weigh availability, dropped users, and bot traffic served.' },
        ]}
      />
      <Callout tone="info" title="A simulation, not a real attack">
        This is a deterministic queue model of one fictional service. No network traffic is
        generated and nothing is attacked — you are tuning numbers in a model to understand the
        dynamics.
      </Callout>
    </div>
  );

  const workspace = (
    <Tabs defaultValue="simulate" className="flex h-full flex-col">
      <TabsList className="shrink-0 px-4 pt-2">
        <TabsTrigger value="simulate">Simulate</TabsTrigger>
        <TabsTrigger value="compare">Compare</TabsTrigger>
      </TabsList>

      <TabsContent value="simulate" className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-fg-muted text-sm">Choose a defense, then run the flood.</div>
            <DefenseToggle value={defense} onChange={setDefense} />
          </div>
          <p className="text-fg-subtle text-xs">{DEFENSES.find((d) => d.key === defense)?.blurb}</p>
          <Button onClick={run} className="gap-2">
            <Play className="size-4" aria-hidden /> Run simulation
          </Button>

          {result && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat
                  label="Users served (attack)"
                  value={pct(result.totals.attackWindowAvailability)}
                  tone={
                    result.totals.attackWindowAvailability >= RECOVER_THRESHOLD
                      ? 'success'
                      : 'danger'
                  }
                />
                <Stat label="Legit requests dropped" value={String(result.totals.legitDropped)} />
                <Stat label="Bot requests served" value={String(result.totals.attackServed)} />
                <Stat label="Peak queue" value={String(result.totals.peakQueue)} />
              </div>
              <div className="border-line bg-surface rounded-xl border p-3">
                <div className="text-fg-subtle mb-1 flex items-center gap-1.5 text-xs">
                  <Activity className="size-3.5" aria-hidden /> Share of real users served each tick
                </div>
                <ThroughputChart result={result} />
              </div>
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="compare" className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-4 p-5">
          <p className="text-fg-muted text-sm">
            The same flood under each defense. Availability is the share of real users served during
            the attack; bot requests served is the load you paid to handle.
          </p>
          <div className="border-line overflow-hidden rounded-xl border">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-2 text-fg-subtle text-xs">
                <tr>
                  <th className="px-3 py-2 font-medium">Defense</th>
                  <th className="px-3 py-2 font-medium">Users served</th>
                  <th className="px-3 py-2 font-medium">Legit dropped</th>
                  <th className="px-3 py-2 font-medium">Bot requests served</th>
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {comparison.map((c) => {
                  const avail = c.totals.attackWindowAvailability;
                  return (
                    <tr key={c.key}>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1.5">
                          {c.key === 'ratelimit' ? (
                            <ShieldCheck className="text-success size-4" aria-hidden />
                          ) : c.key === 'scaling' ? (
                            <Server className="text-fg-subtle size-4" aria-hidden />
                          ) : (
                            <Zap className="text-danger size-4" aria-hidden />
                          )}
                          {c.label}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <Badge
                          tone={
                            avail >= RECOVER_THRESHOLD
                              ? 'success'
                              : avail >= COLLAPSE_THRESHOLD
                                ? 'warning'
                                : 'danger'
                          }
                        >
                          {pct(avail)}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 tabular-nums">{c.totals.legitDropped}</td>
                      <td className="px-3 py-2 tabular-nums">{c.totals.attackServed}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="prose-lesson max-w-none text-sm">
            <Markdown compact>
              {`**Rate limiting removes the bad load; scaling only absorbs it.** Capping per-source requests shrinks the flood by exploiting that a bot sends far more than any real user, so availability recovers cheaply. Adding servers helps, but you still pay to serve every bot request and cannot outrun a large enough flood. Real defenses layer both, with upstream filtering and a CDN or scrubbing service in front of the origin.`}
            </Markdown>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );

  return (
    <LabLayout
      lab={ddosLab}
      guide={guide}
      workspace={workspace}
      evidence={<EvidenceLog entries={log} onClear={() => setLog([])} />}
      onReset={reset}
    />
  );
}
