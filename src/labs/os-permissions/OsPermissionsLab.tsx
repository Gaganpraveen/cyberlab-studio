import { Flag, Play, ShieldCheck, Terminal } from 'lucide-react';
import { useState } from 'react';

import { Markdown } from '@/components/markdown/Markdown';
import { Button } from '@/components/ui/Button';
import { Badge, Callout } from '@/components/ui/primitives';
import { cn } from '@/lib/cn';
import { markChallengeSolved } from '@/lib/progress';

import { EvidenceLog, type EvidenceEntry, evidence } from '../components/EvidenceLog';
import { LabLayout, LabSteps } from '../components/LabLayout';
import {
  ATTACKER,
  type ExploitResult,
  INITIAL_FILES,
  exploitRootScript,
  octalMode,
  otherCanRead,
  otherCanWrite,
  parseOctal,
  readShadow,
  symbolicMode,
} from './engine';
import { osPermissionsLab } from './index';

const SCRIPT = '/opt/backup/run.sh';
const SHADOW = '/etc/shadow';

export default function OsPermissionsLab() {
  const [scriptMode, setScriptMode] = useState(0o777);
  const [shadowMode, setShadowMode] = useState(0o644);
  const [scriptInput, setScriptInput] = useState('777');
  const [shadowInput, setShadowInput] = useState('644');
  const [result, setResult] = useState<(ExploitResult & { title: string }) | null>(null);
  const [log, setLog] = useState<EvidenceEntry[]>([]);
  const add = (e: EvidenceEntry) => setLog((prev) => [...prev, e]);

  const modeFor = (path: string) =>
    path === SCRIPT ? scriptMode : path === SHADOW ? shadowMode : undefined;

  const applyChmod = (path: string, input: string) => {
    const mode = parseOctal(input);
    if (mode === null) {
      add(
        evidence(
          'warning',
          `chmod: invalid mode "${input}"`,
          'Use three or four octal digits, e.g. 640.',
        ),
      );
      return;
    }
    if (path === SCRIPT) {
      setScriptMode(mode);
      if (!otherCanWrite(mode)) markChallengeSolved('perm-fix-script');
    } else {
      setShadowMode(mode);
      if (!otherCanRead(mode)) markChallengeSolved('perm-fix-shadow');
    }
    add(evidence('info', `chmod ${octalMode(mode)} ${path}`, `New mode: ${symbolicMode(mode)}`));
  };

  const runScriptExploit = () => {
    const r = exploitRootScript(scriptMode);
    setResult({ ...r, title: 'Overwrite root-run script' });
    add(
      evidence(
        r.success ? 'danger' : 'success',
        r.success ? 'Privilege escalation to root' : 'Escalation blocked',
        `${r.reason}${r.flag ? `\nFlag: ${r.flag}` : ''}`,
      ),
    );
  };

  const runShadowRead = () => {
    const r = readShadow(shadowMode);
    setResult({ ...r, title: 'Read /etc/shadow' });
    add(
      evidence(
        r.success ? 'danger' : 'success',
        r.success ? 'Read password hashes' : 'Read blocked',
        `${r.reason}${r.content ? `\n${r.content}` : ''}`,
      ),
    );
  };

  const reset = () => {
    setScriptMode(0o777);
    setShadowMode(0o644);
    setScriptInput('777');
    setShadowInput('644');
    setResult(null);
    setLog([]);
  };

  const guide = (
    <div className="space-y-5">
      <p className="text-fg-muted text-sm leading-relaxed">
        You are <code className="text-fg">{ATTACKER}</code>, a normal user — not root, and not in
        the owning groups. Only the <strong className="text-fg">other</strong> permission bits apply
        to you. Two sloppy modes are all you need to become root.
      </p>
      <LabSteps
        steps={[
          { title: 'Read the modes', body: 'Learn the octal and rwx notation in the file list.' },
          {
            title: 'Escalate',
            body: 'Overwrite the world-writable script root runs on a schedule.',
          },
          { title: 'Read the hashes', body: 'Read /etc/shadow while it is world-readable.' },
          { title: 'chmod', body: 'Tighten both modes until the attacks fail.' },
        ]}
      />
      <Callout tone="info" title="Real semantics, fake files">
        The permission logic is the real Unix model, but the filesystem is a fixed list and nothing
        is executed or read for real. Every path and hash is fictional.
      </Callout>
    </div>
  );

  const workspace = (
    <div className="space-y-4 p-5">
      {/* File listing */}
      <div className="border-line overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <thead className="bg-surface-2 text-fg-subtle text-xs">
            <tr>
              <th className="px-3 py-2 font-medium">Mode</th>
              <th className="px-3 py-2 font-medium">Octal</th>
              <th className="px-3 py-2 font-medium">Owner:Group</th>
              <th className="px-3 py-2 font-medium">Path</th>
              <th className="px-3 py-2 font-medium">chmod</th>
            </tr>
          </thead>
          <tbody className="divide-line divide-y">
            {INITIAL_FILES.map((f) => {
              const mode = modeFor(f.path) ?? f.mode;
              const risky =
                (f.path === SCRIPT && otherCanWrite(mode)) ||
                (f.path === SHADOW && otherCanRead(mode));
              return (
                <tr key={f.path} className={cn(risky && 'bg-danger-soft/40')}>
                  <td className="px-3 py-2 font-mono text-xs">{symbolicMode(mode)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{octalMode(mode)}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {f.owner}:{f.group}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-mono text-xs">{f.path}</div>
                    <div className="text-fg-subtle text-[0.7rem]">{f.note}</div>
                  </td>
                  <td className="px-3 py-2">
                    {f.mutable ? (
                      <div className="flex items-center gap-1">
                        <input
                          aria-label={`octal mode for ${f.path}`}
                          value={f.path === SCRIPT ? scriptInput : shadowInput}
                          onChange={(e) =>
                            f.path === SCRIPT
                              ? setScriptInput(e.target.value)
                              : setShadowInput(e.target.value)
                          }
                          className="bg-surface-2 border-line text-fg w-16 rounded-md border px-2 py-1 font-mono text-xs"
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            applyChmod(f.path, f.path === SCRIPT ? scriptInput : shadowInput)
                          }
                        >
                          set
                        </Button>
                      </div>
                    ) : (
                      <span className="text-fg-subtle text-xs">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Attacks */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={runScriptExploit} className="gap-1.5">
          <Play className="size-4" aria-hidden /> Overwrite &amp; trigger root cron
        </Button>
        <Button onClick={runShadowRead} variant="secondary" className="gap-1.5">
          <Terminal className="size-4" aria-hidden /> cat /etc/shadow
        </Button>
      </div>

      {result && (
        <div
          className={cn(
            'space-y-2 rounded-xl border p-4',
            result.success
              ? 'border-danger/40 bg-danger-soft'
              : 'border-success/40 bg-success-soft',
          )}
        >
          <div className="flex items-center gap-2">
            {result.success ? (
              <Badge tone="danger">{result.title} — succeeded</Badge>
            ) : (
              <Badge tone="success" className="gap-1">
                <ShieldCheck className="size-3.5" aria-hidden /> {result.title} — blocked
              </Badge>
            )}
          </div>
          <p className="text-fg text-sm">{result.reason}</p>
          {result.content && (
            <pre className="bg-surface-2 text-fg overflow-x-auto rounded-md p-2 font-mono text-xs whitespace-pre-wrap">
              {result.content}
            </pre>
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
          {`Two rules catch most permission bugs. A file a privileged process **runs** must be writable only by that privileged account — otherwise anyone who can edit it controls the privileged process. A file that holds **secrets** must be readable only by the identities that need them. The habit is least privilege: start from no access and add only what is required, then audit for the classic mistakes — world-writable executables and world-readable secrets.`}
        </Markdown>
      </div>
    </div>
  );

  return (
    <LabLayout
      lab={osPermissionsLab}
      guide={guide}
      workspace={workspace}
      evidence={<EvidenceLog entries={log} onClear={() => setLog([])} />}
      onReset={reset}
    />
  );
}
