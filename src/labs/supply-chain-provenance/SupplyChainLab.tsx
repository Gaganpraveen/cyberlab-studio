import { Boxes, Check, Flag, PackageCheck, ShieldCheck, X } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';

import { Markdown } from '@/components/markdown/Markdown';
import { Button } from '@/components/ui/Button';
import { Badge, Callout } from '@/components/ui/primitives';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/radix';
import { cn } from '@/lib/cn';
import { markChallengeSolved } from '@/lib/progress';

import { EvidenceLog, type EvidenceEntry, evidence } from '../components/EvidenceLog';
import { LabLayout } from '../components/LabLayout';
import {
  type DepDefenses,
  DEFAULT_DEP_DEFENSES,
  type ProvenanceResult,
  RELEASES,
  type ReleaseArtifact,
  runInstall,
  verifyProvenance,
} from './engine';
import { supplyChainProvenanceLab } from './index';

const DEP_CONTROLS: { key: keyof DepDefenses; label: string; detail: string }[] = [
  {
    key: 'verifyHashes',
    label: 'Verify resolved hashes against the lockfile',
    detail: 'Refuse any tarball whose hash does not match the pinned lock hash.',
  },
  {
    key: 'scopeInternalRegistry',
    label: 'Scope internal names to the private registry',
    detail: 'Never resolve an internal package name from the public registry.',
  },
];

export default function SupplyChainLab() {
  const [dep, setDep] = useState<DepDefenses>(DEFAULT_DEP_DEFENSES);
  const [releaseId, setReleaseId] = useState<string>('tampered');
  const [prov, setProv] = useState<(ProvenanceResult & { release: ReleaseArtifact }) | null>(null);
  const [log, setLog] = useState<EvidenceEntry[]>([]);
  const baseId = useId();
  const add = (e: EvidenceEntry) => setLog((prev) => [...prev, e]);

  const report = useMemo(() => runInstall(dep), [dep]);

  useEffect(() => {
    if (report.clean) markChallengeSolved('sc-dep-fix');
  }, [report.clean]);

  const toggle = (key: keyof DepDefenses) => setDep((prev) => ({ ...prev, [key]: !prev[key] }));

  const selectedRelease = RELEASES.find((r) => r.id === releaseId) ?? RELEASES[0]!;

  const runVerify = () => {
    const result = verifyProvenance(selectedRelease);
    setProv({ ...result, release: selectedRelease });
    add(
      evidence(
        result.trusted ? 'success' : 'danger',
        result.trusted
          ? `Provenance verified: ${selectedRelease.name}`
          : `Provenance rejected: ${selectedRelease.name}`,
        `${result.summary}${result.flag ? `\nFlag: ${result.flag}` : ''}`,
      ),
    );
  };

  const reset = () => {
    setDep(DEFAULT_DEP_DEFENSES);
    setReleaseId('tampered');
    setProv(null);
    setLog([]);
  };

  const guide = (
    <div className="space-y-5">
      <p className="text-fg-muted text-sm leading-relaxed">
        Attackers rarely break your code — they poison what it depends on. Two tabs, two classic
        supply-chain attacks: a swapped dependency and a tampered release. Run each, then turn on
        the controls that catch them.
      </p>
      <Callout tone="info" title="Verify, don't trust">
        A lockfile hash turns a silent swap into a loud failure. Provenance ties an artifact to a
        signed statement of how it was built. Everything here is fixture data — nothing is installed
        or run.
      </Callout>
    </div>
  );

  const depTab = (
    <div className="space-y-4 p-5">
      <div className="border-line rounded-xl border p-4">
        <div className="text-fg-subtle mb-3 text-xs font-medium tracking-wide uppercase">
          Install controls
        </div>
        <div className="space-y-2">
          {DEP_CONTROLS.map(({ key, label, detail }) => {
            const id = `${baseId}-${key}`;
            const on = dep[key];
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

      <div className="border-line overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[38rem] text-left text-sm">
          <thead className="bg-surface-2 text-fg-subtle text-xs">
            <tr>
              <th className="px-3 py-2 font-medium">Package</th>
              <th className="px-3 py-2 font-medium">Registry</th>
              <th className="px-3 py-2 font-medium">Lock → resolved</th>
              <th className="px-3 py-2 font-medium">Result</th>
            </tr>
          </thead>
          <tbody className="divide-line divide-y">
            {report.verdicts.map((v) => (
              <tr
                key={v.dep.name}
                className={cn(
                  v.dep.malicious && !v.caught && 'bg-danger-soft/40',
                  v.caught && 'bg-success-soft/30',
                )}
              >
                <td className="px-3 py-2">
                  <div className="font-mono text-xs">
                    {v.dep.name}@{v.dep.version}
                  </div>
                  {v.dep.malicious && <div className="text-danger text-[0.7rem]">{v.dep.note}</div>}
                </td>
                <td className="px-3 py-2">
                  <Badge tone={v.isConfusion ? 'danger' : 'neutral'}>{v.dep.registry}</Badge>
                </td>
                <td className="px-3 py-2 font-mono text-[0.7rem]">
                  <span className="text-fg-subtle">{v.dep.lockHash || '(unpinned)'}</span>
                  <span className={cn(v.isTampered ? 'text-danger' : 'text-fg-muted')}>
                    {' → '}
                    {v.dep.resolvedHash}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 text-xs',
                      v.installed && v.dep.malicious
                        ? 'text-danger'
                        : v.caught
                          ? 'text-success'
                          : 'text-fg-subtle',
                    )}
                  >
                    {v.caught ? (
                      <ShieldCheck className="size-3.5" aria-hidden />
                    ) : v.dep.malicious ? (
                      <X className="size-3.5" aria-hidden />
                    ) : (
                      <Check className="size-3.5" aria-hidden />
                    )}
                    {v.reason}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        className={cn(
          'rounded-xl border p-3 text-sm',
          report.clean ? 'border-success/40 bg-success-soft' : 'border-danger/40 bg-danger-soft',
        )}
      >
        <div className="text-fg flex items-center gap-2">
          <Badge tone={report.clean ? 'success' : 'danger'}>
            {report.maliciousInstalled} of {report.maliciousTotal} malicious installed
          </Badge>
          <span className="text-fg-muted text-xs">
            {report.clean ? 'Clean install.' : 'Malicious packages reached your build.'}
          </span>
        </div>
        {report.flag && (
          <div className="border-accent/40 bg-accent-soft text-fg mt-2 flex items-center gap-2 rounded-md border p-2 font-mono text-xs">
            <Flag className="text-accent-text size-4 shrink-0" aria-hidden />
            {report.flag}
          </div>
        )}
      </div>
    </div>
  );

  const provTab = (
    <div className="space-y-4 p-5">
      <div className="border-line rounded-xl border p-4">
        <label className="text-xs" htmlFor={`${baseId}-release`}>
          <span className="text-fg-subtle mb-1 block font-medium tracking-wide uppercase">
            Release to deploy
          </span>
          <select
            id={`${baseId}-release`}
            value={releaseId}
            onChange={(e) => setReleaseId(e.target.value)}
            className="bg-surface-2 border-line text-fg w-full rounded-md border px-2 py-2 text-sm"
          >
            {RELEASES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} — {r.label}
              </option>
            ))}
          </select>
        </label>

        <dl className="mt-3 grid grid-cols-[7rem_1fr] gap-x-2 gap-y-1 font-mono text-xs">
          <dt className="text-fg-subtle">artifact</dt>
          <dd className="text-fg-muted break-all">{selectedRelease.artifactHash}</dd>
          <dt className="text-fg-subtle">attested</dt>
          <dd className="text-fg-muted break-all">{selectedRelease.attestedHash}</dd>
          <dt className="text-fg-subtle">source</dt>
          <dd className="text-fg-muted break-all">
            {selectedRelease.sourceRepo}@{selectedRelease.sourceCommit}
          </dd>
          <dt className="text-fg-subtle">builder</dt>
          <dd className="text-fg-muted break-all">{selectedRelease.builder}</dd>
        </dl>

        <Button onClick={runVerify} className="mt-3 gap-1.5">
          <PackageCheck className="size-4" aria-hidden /> Verify provenance
        </Button>
      </div>

      {prov && prov.release.id === selectedRelease.id && (
        <div
          className={cn(
            'space-y-2 rounded-xl border p-4',
            prov.trusted ? 'border-success/40 bg-success-soft' : 'border-danger/40 bg-danger-soft',
          )}
        >
          <ul className="space-y-1.5">
            {prov.checks.map((c) => (
              <li key={c.label} className="flex items-center gap-2 text-sm">
                {c.pass ? (
                  <Check className="text-success size-4 shrink-0" aria-hidden />
                ) : (
                  <X className="text-danger size-4 shrink-0" aria-hidden />
                )}
                <span className={cn(c.pass ? 'text-fg-muted' : 'text-fg')}>{c.label}</span>
              </li>
            ))}
          </ul>
          <p className="text-fg text-sm font-medium">{prov.summary}</p>
          {prov.flag && (
            <div className="border-accent/40 bg-accent-soft text-fg flex items-center gap-2 rounded-md border p-2 font-mono text-xs">
              <Flag className="text-accent-text size-4 shrink-0" aria-hidden />
              {prov.flag}
            </div>
          )}
        </div>
      )}

      <div className="prose-lesson max-w-none text-sm">
        <Markdown compact>
          {`Provenance answers &ldquo;was this really built from the source I think, by the builder I trust?&rdquo; Three checks do it: the artifact&rsquo;s hash matches the signed attestation, the signature verifies against the builder&rsquo;s key, and the builder is one you allow. A tampered mirror fails the first; a self-signed fork fails the last two.`}
        </Markdown>
      </div>
    </div>
  );

  const workspace = (
    <Tabs defaultValue="deps" className="flex h-full flex-col">
      <TabsList className="shrink-0 px-4 pt-2">
        <TabsTrigger value="deps" className="gap-1.5">
          <Boxes className="size-4" aria-hidden /> Dependencies
        </TabsTrigger>
        <TabsTrigger value="prov" className="gap-1.5">
          <PackageCheck className="size-4" aria-hidden /> Provenance
        </TabsTrigger>
      </TabsList>
      <TabsContent value="deps" className="min-h-0 flex-1 overflow-y-auto">
        {depTab}
      </TabsContent>
      <TabsContent value="prov" className="min-h-0 flex-1 overflow-y-auto">
        {provTab}
      </TabsContent>
    </Tabs>
  );

  return (
    <LabLayout
      lab={supplyChainProvenanceLab}
      guide={guide}
      workspace={workspace}
      evidence={<EvidenceLog entries={log} onClear={() => setLog([])} />}
      onReset={reset}
    />
  );
}
