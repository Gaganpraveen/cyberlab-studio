import { FileWarning, Flag, Play, ShieldCheck } from 'lucide-react';
import { useId, useState } from 'react';

import { Markdown } from '@/components/markdown/Markdown';
import { Button } from '@/components/ui/Button';
import { Badge, Callout } from '@/components/ui/primitives';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/radix';
import { cn } from '@/lib/cn';
import { markChallengeSolved } from '@/lib/progress';

import { EvidenceLog, type EvidenceEntry, evidence } from '../components/EvidenceLog';
import { LabLayout, LabSteps } from '../components/LabLayout';
import {
  BASE_DIR,
  type CmdDefenses,
  CMD_NONE,
  type CmdResult,
  type PathDefenses,
  PATH_NONE,
  type PathResult,
  readFile,
  runPing,
} from './engine';
import { commandPathInjectionLab } from './index';

const META = /[;&|$`]/;

export default function CommandPathInjectionLab() {
  const [host, setHost] = useState('localhost; cat /flag');
  const [cmdDef, setCmdDef] = useState<CmdDefenses>(CMD_NONE);
  const [cmd, setCmd] = useState<CmdResult | null>(null);

  const [fileName, setFileName] = useState('welcome.txt');
  const [pathDef, setPathDef] = useState<PathDefenses>(PATH_NONE);
  const [path, setPath] = useState<PathResult | null>(null);

  const hostId = useId();
  const fileId = useId();
  const [log, setLog] = useState<EvidenceEntry[]>([]);
  const add = (e: EvidenceEntry) => setLog((prev) => [...prev, e]);

  const runCmd = () => {
    const r = runPing(host, cmdDef);
    setCmd(r);
    if (r.blocked) {
      add(evidence('success', 'Input rejected by the allowlist', r.reason ?? ''));
    } else if (r.injected) {
      add(
        evidence(
          'danger',
          'Command injection succeeded',
          `${r.executed}\n${r.outputs.join('\n')}${r.flag ? `\nFlag: ${r.flag}` : ''}`,
        ),
      );
    } else {
      if (cmdDef.argArray && META.test(host)) markChallengeSolved('cmd-fix');
      add(
        evidence(
          cmdDef.argArray ? 'success' : 'info',
          cmdDef.argArray ? 'No shell — metacharacters are a literal hostname' : 'Ping ran',
          `${r.executed}\n${r.outputs.join('\n')}`,
        ),
      );
    }
  };

  const runRead = () => {
    const r = readFile(fileName, pathDef);
    setPath(r);
    if (r.blocked) {
      markChallengeSolved('path-fix');
      add(evidence('success', 'Path traversal blocked', r.reason ?? ''));
    } else if (r.escaped) {
      add(
        evidence(
          'danger',
          `Read file outside ${BASE_DIR}`,
          `Resolved: ${r.resolved}\n${r.content ?? ''}${r.flag ? `\nFlag: ${r.flag}` : ''}`,
        ),
      );
    } else {
      add(evidence('info', `Read ${r.resolved}`, r.content ?? r.reason ?? ''));
    }
  };

  const reset = () => {
    setHost('localhost; cat /flag');
    setCmdDef(CMD_NONE);
    setCmd(null);
    setFileName('welcome.txt');
    setPathDef(PATH_NONE);
    setPath(null);
    setLog([]);
  };

  const guide = (
    <div className="space-y-5">
      <p className="text-fg-muted text-sm leading-relaxed">
        Both flaws are the same mistake: user input crosses a boundary it was never meant to
        control. One reaches the <strong className="text-fg">shell</strong>, the other reaches the{' '}
        <strong className="text-fg">filesystem</strong>. You will cross each boundary, then close
        it.
      </p>
      <LabSteps
        steps={[
          {
            title: 'Inject a command',
            body: 'Chain `; cat /flag` onto a hostname through the shell.',
          },
          {
            title: 'Drop the shell',
            body: 'Run with an argument array so metacharacters are inert.',
          },
          { title: 'Traverse the path', body: 'Use ../ to read a file outside the web folder.' },
          {
            title: 'Confine the path',
            body: 'Resolve and require the path stays in the base directory.',
          },
        ]}
      />
      <Callout tone="info" title="A fake shell and filesystem">
        No real command runs and no real file is read. The shell understands four harmless commands
        over a fixed fake filesystem; every path and host is fictional.
      </Callout>
    </div>
  );

  const workspace = (
    <Tabs defaultValue="command" className="flex h-full flex-col">
      <TabsList className="shrink-0 px-4 pt-2">
        <TabsTrigger value="command">Command</TabsTrigger>
        <TabsTrigger value="path">Path</TabsTrigger>
      </TabsList>

      {/* --- Command injection --- */}
      <TabsContent value="command" className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-4 p-5">
          <div>
            <label htmlFor={hostId} className="text-fg-muted mb-1 block text-xs">
              Host to ping
            </label>
            <div className="flex gap-2">
              <input
                id={hostId}
                value={host}
                onChange={(e) => setHost(e.target.value)}
                className="bg-surface-2 border-line text-fg flex-1 rounded-md border px-3 py-2 font-mono text-sm"
              />
              <Button onClick={runCmd} className="gap-1.5">
                <Play className="size-4" aria-hidden /> Run ping
              </Button>
            </div>
          </div>

          <div className="border-line bg-surface/40 rounded-xl border p-4">
            <div className="text-fg-subtle mb-2 text-xs font-semibold tracking-[0.1em] uppercase">
              Defenses
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={cmdDef.argArray ? 'ghost' : 'secondary'}
                aria-pressed={cmdDef.argArray}
                onClick={() => setCmdDef((d) => ({ ...d, argArray: !d.argArray }))}
              >
                {cmdDef.argArray ? '✓ Argument array (no shell)' : 'Run without a shell'}
              </Button>
              <Button
                size="sm"
                variant={cmdDef.allowlist ? 'ghost' : 'secondary'}
                aria-pressed={cmdDef.allowlist}
                onClick={() => setCmdDef((d) => ({ ...d, allowlist: !d.allowlist }))}
              >
                {cmdDef.allowlist ? '✓ Hostname allowlist' : 'Add input allowlist'}
              </Button>
            </div>
          </div>

          {cmd && (
            <div
              className={cn(
                'space-y-2 rounded-xl border p-4',
                cmd.injected
                  ? 'border-danger/40 bg-danger-soft'
                  : 'border-success/40 bg-success-soft',
              )}
            >
              <div className="flex items-center gap-2">
                {cmd.injected ? (
                  <Badge tone="danger">command injected</Badge>
                ) : cmd.blocked ? (
                  <Badge tone="success" className="gap-1">
                    <ShieldCheck className="size-3.5" aria-hidden /> input rejected
                  </Badge>
                ) : (
                  <Badge tone="success" className="gap-1">
                    <ShieldCheck className="size-3.5" aria-hidden /> no injection
                  </Badge>
                )}
              </div>
              {cmd.executed && (
                <pre className="text-fg-muted overflow-x-auto font-mono text-[0.7rem] whitespace-pre-wrap">
                  {cmd.executed}
                </pre>
              )}
              {cmd.outputs.length > 0 && (
                <pre className="bg-surface-2 text-fg overflow-x-auto rounded-md p-2 font-mono text-xs whitespace-pre-wrap">
                  {cmd.outputs.join('\n')}
                </pre>
              )}
              {cmd.flag && (
                <div className="border-accent/40 bg-accent-soft text-fg flex items-center gap-2 rounded-md border p-2 font-mono text-xs">
                  <Flag className="text-accent-text size-4 shrink-0" aria-hidden />
                  {cmd.flag}
                </div>
              )}
            </div>
          )}
        </div>
      </TabsContent>

      {/* --- Path traversal --- */}
      <TabsContent value="path" className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-4 p-5">
          <div>
            <label htmlFor={fileId} className="text-fg-muted mb-1 block text-xs">
              File to view — served from <code className="text-fg">{BASE_DIR}/</code>
            </label>
            <div className="flex gap-2">
              <input
                id={fileId}
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="bg-surface-2 border-line text-fg flex-1 rounded-md border px-3 py-2 font-mono text-sm"
              />
              <Button onClick={runRead} className="gap-1.5">
                <Play className="size-4" aria-hidden /> Read file
              </Button>
            </div>
          </div>

          <div className="border-line bg-surface/40 rounded-xl border p-4">
            <div className="text-fg-subtle mb-2 text-xs font-semibold tracking-[0.1em] uppercase">
              Defense
            </div>
            <Button
              size="sm"
              variant={pathDef.confine ? 'ghost' : 'secondary'}
              aria-pressed={pathDef.confine}
              onClick={() => setPathDef((d) => ({ confine: !d.confine }))}
            >
              {pathDef.confine ? '✓ Canonicalize & confine' : 'Canonicalize & confine to base'}
            </Button>
          </div>

          {path && (
            <div
              className={cn(
                'space-y-2 rounded-xl border p-4',
                path.escaped && !path.blocked
                  ? 'border-danger/40 bg-danger-soft'
                  : 'border-success/40 bg-success-soft',
              )}
            >
              <div className="flex items-center gap-2">
                {path.blocked ? (
                  <Badge tone="success" className="gap-1">
                    <ShieldCheck className="size-3.5" aria-hidden /> traversal blocked
                  </Badge>
                ) : path.escaped ? (
                  <Badge tone="danger" className="gap-1">
                    <FileWarning className="size-3.5" aria-hidden /> escaped the folder
                  </Badge>
                ) : (
                  <Badge tone="success">inside the folder</Badge>
                )}
                <span className="text-fg-muted font-mono text-xs">{path.resolved}</span>
              </div>
              {path.content && (
                <pre className="bg-surface-2 text-fg overflow-x-auto rounded-md p-2 font-mono text-xs whitespace-pre-wrap">
                  {path.content}
                </pre>
              )}
              {path.reason && !path.content && (
                <p className="text-fg-muted text-sm">{path.reason}</p>
              )}
              {path.flag && (
                <div className="border-accent/40 bg-accent-soft text-fg flex items-center gap-2 rounded-md border p-2 font-mono text-xs">
                  <Flag className="text-accent-text size-4 shrink-0" aria-hidden />
                  {path.flag}
                </div>
              )}
            </div>
          )}

          <div className="prose-lesson max-w-none text-sm">
            <Markdown compact>
              {`**Canonicalize, then check.** Join the input to the base directory, resolve \`.\` and \`..\` to an absolute path, and confirm the result is still inside the base before opening it. Checking the raw string first is not enough — \`....//\` and URL-encoded separators slip past naive filters, which is why you resolve to a canonical path and compare that. Where the set of files is known, serving by an allowlist of names is stronger still.`}
            </Markdown>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );

  return (
    <LabLayout
      lab={commandPathInjectionLab}
      guide={guide}
      workspace={workspace}
      evidence={<EvidenceLog entries={log} onClear={() => setLog([])} />}
      onReset={reset}
    />
  );
}
