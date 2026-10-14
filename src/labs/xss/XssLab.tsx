import { MessageSquare, Play, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Markdown } from '@/components/markdown/Markdown';
import { Button } from '@/components/ui/Button';
import { Badge, Callout } from '@/components/ui/primitives';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/radix';
import { cn } from '@/lib/cn';
import { markChallengeSolved } from '@/lib/progress';

import { EvidenceLog, type EvidenceEntry, evidence } from '../components/EvidenceLog';
import { LabLayout, LabSteps } from '../components/LabLayout';
import {
  type GradeReport,
  type RenderMode,
  PAYLOADS,
  XSS_MARKER,
  buildSandboxDocument,
  gradeMode,
  looksExecutable,
} from './engine';
import { xssLab } from './index';

function ModeToggle({ mode, onChange }: { mode: RenderMode; onChange: (m: RenderMode) => void }) {
  return (
    <div
      className="border-line bg-sunken inline-flex rounded-lg border p-0.5"
      role="group"
      aria-label="Comment rendering"
    >
      {(['vulnerable', 'safe'] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          aria-pressed={mode === m}
          className={cn(
            'rounded-md px-3 py-1 text-sm font-medium transition-colors',
            mode === m ? 'bg-accent text-on-accent' : 'text-fg-muted hover:text-fg',
          )}
        >
          {m === 'vulnerable' ? 'Vulnerable (raw HTML)' : 'Safe (escaped)'}
        </button>
      ))}
    </div>
  );
}

export default function XssLab() {
  const [mode, setMode] = useState<RenderMode>('vulnerable');
  const [draft, setDraft] = useState(PAYLOADS[0]?.value ?? '');
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [executed, setExecuted] = useState(false);
  const [defense, setDefense] = useState<GradeReport | null>(null);
  const [log, setLog] = useState<EvidenceEntry[]>([]);

  const [submissionId, setSubmissionId] = useState(0);
  const submissionRef = useRef(0);
  const firedRef = useRef(-1);

  const add = (e: EvidenceEntry) => setLog((prev) => [...prev, e]);

  // Listen for the harmless marker the sandbox posts when a payload runs. The
  // iframe has no same-origin access to this app; postMessage is all it can do.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data !== XSS_MARKER) return;
      setExecuted(true);
      if (firedRef.current !== submissionRef.current) {
        firedRef.current = submissionRef.current;
        markChallengeSolved('xss-fire');
        setLog((prev) => [
          ...prev,
          evidence(
            'danger',
            'Payload executed inside the sandbox',
            'The injected markup ran as code — this is the XSS firing. It only posted a harmless marker; the sandbox cannot touch this app, your cookies, or the network.',
          ),
        ]);
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const post = () => {
    submissionRef.current += 1;
    setSubmissionId(submissionRef.current);
    setSubmitted(draft);
    setExecuted(false);
    add(
      evidence(
        mode === 'vulnerable' ? 'warning' : 'info',
        `Posted a comment with ${mode} rendering`,
        looksExecutable(draft)
          ? 'The comment carries an execution vector; watch whether it fires below.'
          : 'This comment has no obvious script vector.',
      ),
    );
  };

  const changeMode = (m: RenderMode) => {
    setMode(m);
    // Re-parse the current comment under the new renderer and reset detection.
    submissionRef.current += 1;
    setSubmissionId(submissionRef.current);
    setExecuted(false);
  };

  const checkDefense = () => {
    const report = gradeMode('safe');
    setDefense(report);
    if (report.secure) markChallengeSolved('xss-fix');
    add(
      evidence(
        'success',
        `Safe renderer neutralized all ${report.rows.length} payloads`,
        'Output encoding escaped every payload to text, so none remained live markup.',
      ),
    );
  };

  const reset = () => {
    setMode('vulnerable');
    setDraft(PAYLOADS[0]?.value ?? '');
    setSubmitted(null);
    setExecuted(false);
    setDefense(null);
    setLog([]);
    submissionRef.current += 1;
    firedRef.current = -1;
    setSubmissionId(submissionRef.current);
  };

  const comparison = useMemo(() => {
    const vuln = gradeMode('vulnerable');
    const safe = gradeMode('safe');
    return PAYLOADS.map((p, i) => ({
      label: p.label,
      note: p.note,
      vulnerableInert: vuln.rows[i]?.inert ?? false,
      safeInert: safe.rows[i]?.inert ?? false,
    }));
  }, []);

  const guide = (
    <div className="space-y-5">
      <p className="text-fg-muted text-sm leading-relaxed">
        A comment page echoes whatever you type straight into its HTML. You will inject a script
        that <strong className="text-fg">runs</strong> in the page, watch it fire inside an isolated
        sandbox, then switch the renderer to one that escapes output so the same payload becomes
        harmless text.
      </p>
      <LabSteps
        steps={[
          {
            title: 'Post a payload',
            body: 'Submit a script payload with the vulnerable renderer.',
          },
          { title: 'Watch it fire', body: 'The sandbox reports that the injected code executed.' },
          { title: 'Switch to safe', body: 'Turn on output encoding and post the same payload.' },
          { title: 'Confirm inert', body: 'See the payload shown as text, with nothing running.' },
          { title: 'Add a second layer', body: 'Understand how a CSP backs up output encoding.' },
        ]}
      />
      <Callout tone="info" title="Isolated and local">
        The preview runs in an iframe with <code>sandbox=&quot;allow-scripts&quot;</code> and no
        same-origin access, so a payload cannot reach this app, your cookies, storage, or the
        network. The only thing it can do is post a harmless marker back to the lab.
      </Callout>
    </div>
  );

  const workspace = (
    <Tabs defaultValue="comment" className="flex h-full flex-col">
      <TabsList className="shrink-0 px-4 pt-2">
        <TabsTrigger value="comment">Comment</TabsTrigger>
        <TabsTrigger value="defend">Defend</TabsTrigger>
      </TabsList>

      <TabsContent value="comment" className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-fg-muted text-sm">
              Compose a comment, choose how the page renders it, and post.
            </p>
            <ModeToggle mode={mode} onChange={changeMode} />
          </div>

          <div className="space-y-2">
            <div className="text-fg-subtle text-xs font-semibold tracking-[0.1em] uppercase">
              Preset payloads
            </div>
            <div className="flex flex-wrap gap-2">
              {PAYLOADS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setDraft(p.value)}
                  className={cn(
                    'border-line bg-surface-2 text-fg-muted hover:text-fg hover:border-line-strong rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                    draft === p.value && 'border-accent text-fg',
                  )}
                  title={p.note}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
            className="bg-surface-2 border-line-strong text-fg focus:border-focus h-24 w-full resize-none rounded-lg border p-3 font-mono text-sm leading-relaxed focus:outline-none"
            aria-label="Comment body"
          />

          <Button onClick={post} className="gap-2">
            <MessageSquare className="size-4" aria-hidden /> Post comment
          </Button>

          {submitted !== null && (
            <div className="space-y-2">
              <div className="text-fg-subtle flex items-center justify-between text-xs">
                <span className="font-semibold tracking-[0.1em] uppercase">
                  Rendered comment (sandboxed)
                </span>
                {looksExecutable(submitted) &&
                  (executed ? (
                    <span className="text-danger inline-flex items-center gap-1 font-medium">
                      <ShieldAlert className="size-3.5" aria-hidden /> Payload executed
                    </span>
                  ) : (
                    <span className="text-success inline-flex items-center gap-1 font-medium">
                      <ShieldCheck className="size-3.5" aria-hidden /> Inert — rendered as text
                    </span>
                  ))}
              </div>
              <iframe
                key={submissionId}
                title="Sandboxed comment preview"
                sandbox="allow-scripts"
                srcDoc={buildSandboxDocument(mode, submitted)}
                className="border-line bg-surface-2 h-40 w-full rounded-xl border"
              />
              <p className="text-fg-subtle text-xs">
                {mode === 'vulnerable'
                  ? 'Vulnerable renderer: the comment is inserted as raw HTML.'
                  : 'Safe renderer: the comment is HTML-escaped before it reaches the page.'}
              </p>
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="defend" className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-4 p-5">
          <p className="text-fg-muted text-sm">
            The fix is output encoding: escape untrusted data for the context it lands in, at the
            moment it is written into the page. Here is each payload under both renderers.
          </p>
          <div className="border-line overflow-hidden rounded-xl border">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-2 text-fg-subtle text-xs">
                <tr>
                  <th className="px-3 py-2 font-medium">Payload</th>
                  <th className="px-3 py-2 font-medium">Vulnerable (raw HTML)</th>
                  <th className="px-3 py-2 font-medium">Safe (escaped)</th>
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {comparison.map((r) => (
                  <tr key={r.label}>
                    <td className="px-3 py-2">{r.label}</td>
                    <td className="px-3 py-2">
                      <Badge tone={r.vulnerableInert ? 'success' : 'danger'}>
                        {r.vulnerableInert ? 'inert' : 'runs'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={r.safeInert ? 'success' : 'danger'}>
                        {r.safeInert ? 'inert' : 'runs'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button onClick={checkDefense} className="gap-2">
            <Play className="size-4" aria-hidden /> Check the safe renderer
          </Button>
          {defense && (
            <div className="border-success/40 bg-success-soft flex items-center gap-2 rounded-lg border p-3 text-sm">
              <ShieldCheck className="text-success size-5 shrink-0" aria-hidden />
              Output encoding neutralized all {defense.rows.length} payloads — every one renders as
              text.
            </div>
          )}

          <div className="prose-lesson max-w-none text-sm">
            <Markdown compact>
              {`**Encode on output, for the right context.** The same value is escaped differently in HTML body, an HTML attribute, a URL, or inside JavaScript. Modern frameworks (React, Angular, Vue) escape HTML text automatically — the danger is escape hatches like \`dangerouslySetInnerHTML\`.

**Back it with a Content-Security-Policy.** A strict CSP (a tight \`script-src\`, no \`unsafe-inline\`) can stop an injected script from running even when encoding is missed. It is defense in depth, not a substitute for encoding.`}
            </Markdown>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );

  return (
    <LabLayout
      lab={xssLab}
      guide={guide}
      workspace={workspace}
      evidence={<EvidenceLog entries={log} onClear={() => setLog([])} />}
      onReset={reset}
    />
  );
}
