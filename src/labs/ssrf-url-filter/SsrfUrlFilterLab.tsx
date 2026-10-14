import { Flag, Play, Server, ShieldCheck } from 'lucide-react';
import { useId, useState } from 'react';

import { Markdown } from '@/components/markdown/Markdown';
import { Button } from '@/components/ui/Button';
import { Badge, Callout } from '@/components/ui/primitives';
import { cn } from '@/lib/cn';
import { markChallengeSolved } from '@/lib/progress';

import { EvidenceLog, type EvidenceEntry, evidence } from '../components/EvidenceLog';
import { LabLayout, LabSteps } from '../components/LabLayout';
import {
  ALLOWED_HOSTS,
  type FetchDefenses,
  FETCH_NONE,
  type FetchResult,
  fetchUrl,
} from './engine';
import { ssrfUrlFilterLab } from './index';

const TARGETS: { label: string; url: string; internal: boolean }[] = [
  { label: 'Public image', url: 'http://example.com/logo.png', internal: false },
  { label: 'Cloud metadata', url: 'http://169.254.169.254/latest/meta-data/iam/', internal: true },
  { label: 'Loopback admin', url: 'http://localhost:8080/admin', internal: true },
  { label: 'metadata.evil.example', url: 'http://metadata.evil.example/', internal: true },
];

export default function SsrfUrlFilterLab() {
  const [url, setUrl] = useState('http://169.254.169.254/latest/meta-data/iam/');
  const [defenses, setDefenses] = useState<FetchDefenses>(FETCH_NONE);
  const [result, setResult] = useState<FetchResult | null>(null);
  const [log, setLog] = useState<EvidenceEntry[]>([]);
  const add = (e: EvidenceEntry) => setLog((prev) => [...prev, e]);
  const urlId = useId();

  const fetchNow = () => {
    const r = fetchUrl(url, defenses);
    setResult(r);
    if (r.blocked) {
      if (r.reason?.includes('allowlist')) markChallengeSolved('ssrf-allowlist');
      if (r.internal && defenses.blockInternal) markChallengeSolved('ssrf-block-ip');
      add(evidence('success', 'Fetch refused', r.reason ?? ''));
    } else if (r.internal && r.status === 200) {
      add(
        evidence(
          'danger',
          `SSRF reached internal ${r.resolvedIp}`,
          `${r.host} → ${r.resolvedIp}\n${r.body ?? ''}${r.flag ? `\nFlag: ${r.flag}` : ''}`,
        ),
      );
    } else {
      add(
        evidence(
          'info',
          `Fetched ${r.host}${r.resolvedIp ? ` (${r.resolvedIp})` : ''} → ${r.status}`,
          r.body ?? r.reason ?? '',
        ),
      );
    }
  };

  const reset = () => {
    setUrl('http://169.254.169.254/latest/meta-data/iam/');
    setDefenses(FETCH_NONE);
    setResult(null);
    setLog([]);
  };

  const guide = (
    <div className="space-y-5">
      <p className="text-fg-muted text-sm leading-relaxed">
        The server will fetch any URL you hand it — and it sits{' '}
        <strong className="text-fg">inside</strong> the network, with reach you do not have. You
        will turn that reach against it, then add the filters that take it back.
      </p>
      <LabSteps
        steps={[
          {
            title: 'Hit the metadata',
            body: 'Fetch 169.254.169.254 and read instance credentials.',
          },
          { title: 'Hit loopback', body: 'Reach an admin panel bound to localhost.' },
          {
            title: 'See the DNS trick',
            body: 'A safe-looking name that resolves to an internal IP.',
          },
          { title: 'Block internal IPs', body: 'Resolve the host and refuse private ranges.' },
          { title: 'Allowlist', body: 'Permit only known destinations.' },
        ]}
      />
      <Callout tone="info" title="A model of the network">
        No request leaves your browser. A fixed DNS map and fake services stand in for the metadata
        endpoint, loopback, and private hosts; every address is reserved or fictional.
      </Callout>
    </div>
  );

  const workspace = (
    <div className="space-y-4 p-5">
      <div>
        <label htmlFor={urlId} className="text-fg-muted mb-1 block text-xs">
          URL for the server to fetch
        </label>
        <div className="flex gap-2">
          <input
            id={urlId}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="bg-surface-2 border-line text-fg flex-1 rounded-md border px-3 py-2 font-mono text-sm"
          />
          <Button onClick={fetchNow} className="gap-1.5">
            <Play className="size-4" aria-hidden /> Fetch URL
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {TARGETS.map((t) => (
            <button
              key={t.url}
              type="button"
              onClick={() => setUrl(t.url)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-xs transition-colors',
                t.internal
                  ? 'border-danger/30 text-danger hover:bg-danger-soft'
                  : 'border-line text-fg-muted hover:bg-surface-2',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="border-line bg-surface/40 rounded-xl border p-4">
        <div className="text-fg-subtle mb-2 text-xs font-semibold tracking-[0.1em] uppercase">
          Fetcher defenses
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={defenses.blockInternal ? 'ghost' : 'secondary'}
            disabled={defenses.blockInternal}
            onClick={() => setDefenses((d) => ({ ...d, blockInternal: true }))}
          >
            {defenses.blockInternal ? '✓ Block internal IPs' : 'Block internal IPs'}
          </Button>
          <Button
            size="sm"
            variant={defenses.allowlist ? 'ghost' : 'secondary'}
            disabled={defenses.allowlist}
            onClick={() => setDefenses((d) => ({ ...d, allowlist: true }))}
          >
            {defenses.allowlist ? '✓ Destination allowlist' : 'Destination allowlist'}
          </Button>
        </div>
        {defenses.allowlist && (
          <p className="text-fg-subtle mt-2 text-xs">Allowed: {ALLOWED_HOSTS.join(', ')}</p>
        )}
      </div>

      {result && (
        <div
          className={cn(
            'space-y-2 rounded-xl border p-4',
            result.blocked
              ? 'border-success/40 bg-success-soft'
              : result.internal && result.status === 200
                ? 'border-danger/40 bg-danger-soft'
                : 'border-line bg-surface/40',
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            {result.blocked ? (
              <Badge tone="success" className="gap-1">
                <ShieldCheck className="size-3.5" aria-hidden /> request refused
              </Badge>
            ) : result.internal && result.status === 200 ? (
              <Badge tone="danger" className="gap-1">
                <Server className="size-3.5" aria-hidden /> internal resource reached
              </Badge>
            ) : (
              <Badge tone="neutral">HTTP {result.status}</Badge>
            )}
            {result.resolvedIp && (
              <span className="text-fg-muted font-mono text-xs">
                {result.host} → {result.resolvedIp}
              </span>
            )}
          </div>
          {result.body && (
            <pre className="bg-surface-2 text-fg overflow-x-auto rounded-md p-2 font-mono text-xs whitespace-pre-wrap">
              {result.body}
            </pre>
          )}
          {result.reason && !result.body && (
            <p className="text-fg-muted text-sm">{result.reason}</p>
          )}
          {result.flag && (
            <div className="border-accent/40 bg-accent-soft text-fg flex items-center gap-2 rounded-md border p-2 font-mono text-xs">
              <Flag className="text-accent-text size-4 shrink-0" aria-hidden />
              {result.flag}
            </div>
          )}
        </div>
      )}

      <div className="prose-lesson max-w-none text-sm">
        <Markdown compact>
          {`A fetcher that accepts user URLs must **resolve the host and judge the IP**, not the string. Refuse loopback, link-local (169.254.0.0/16 — the cloud metadata range), and private ranges; follow redirects through the same check; and pin the connection to the validated address so DNS cannot change it between the check and the request (DNS rebinding). Where the destinations are known in advance, an **allowlist** beats any blocklist.`}
        </Markdown>
      </div>
    </div>
  );

  return (
    <LabLayout
      lab={ssrfUrlFilterLab}
      guide={guide}
      workspace={workspace}
      evidence={<EvidenceLog entries={log} onClear={() => setLog([])} />}
      onReset={reset}
    />
  );
}
