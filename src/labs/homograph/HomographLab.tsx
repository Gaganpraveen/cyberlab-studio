import { ExternalLink, Link2Off, ShieldAlert } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Markdown } from '@/components/markdown/Markdown';
import { Callout } from '@/components/ui/primitives';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/radix';
import { cn } from '@/lib/cn';
import { markChallengeSolved, saveLabState, loadLabState, useProgress } from '@/lib/progress';

import { LabLayout, LabSteps } from '../components/LabLayout';
import { CharDetail, CharRow } from './CharInspector';
import { analyzeHost, type RuleConfig, DEFAULT_RULES, type RuleId, runDataset } from './engine';
import { DEFAULT_MODIFIED, DEFAULT_ORIGINAL, FIXTURES, PROTECTED_NAME } from './fixtures';
import { homographLab } from './index';
import { RuleBuilder } from './RuleBuilder';

const FLAG = 'CTF{skeletons_beat_glyphs}';

interface SavedState {
  original: string;
  modified: string;
  rules: RuleConfig;
}

function HostAnalysis({ host }: { host: string }) {
  const analysis = analyzeHost(host);
  return (
    <div className="border-line bg-surface-2 space-y-2 rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <span className="text-fg-subtle text-xs font-semibold tracking-wide uppercase">
          Host analysis
        </span>
        {analysis.mixedScript && (
          <span className="text-warning inline-flex items-center gap-1 text-xs">
            <ShieldAlert className="size-3.5" aria-hidden /> mixed scripts
          </span>
        )}
      </div>
      {analysis.valid ? (
        <dl className="space-y-1.5 text-sm">
          <Row label="You typed" value={analysis.input} mono />
          <Row label="ASCII form" value={analysis.ascii} mono highlight={analysis.isPunycode} />
          <Row label="Punycode?" value={analysis.isPunycode ? 'yes (xn--)' : 'no'} />
          <Row label="Scripts" value={analysis.scripts.join(', ') || 'none'} />
        </dl>
      ) : (
        <p className="text-danger text-sm">Not a valid hostname: {analysis.error}</p>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-fg-subtle">{label}</dt>
      <dd className={cn('text-fg', mono && 'font-mono', highlight && 'text-accent-text')}>
        {value}
      </dd>
    </div>
  );
}

function Investigation() {
  return (
    <div className="space-y-4 p-5">
      <Callout tone="warning" title="Fictional case file">
        Everything here is invented for training. No real person, message, or website is involved.
      </Callout>
      <div className="border-line bg-surface-2 space-y-3 rounded-xl border p-4 text-sm">
        <div className="text-fg-subtle text-xs">From: IT Helpdesk &lt;help@campus.test&gt;</div>
        <div className="text-fg-subtle text-xs">Subject: Action required: confirm your account</div>
        <p className="text-fg-muted">
          “Your campus account will be suspended. Confirm now at{' '}
          <span className="text-info underline">campus.test</span>.”
        </p>
        <div className="border-line flex items-center gap-2 border-t pt-3">
          <Link2Off className="text-danger size-4 shrink-0" aria-hidden />
          <span className="text-fg-subtle text-xs">
            The link text says campus.test, but it points to:
          </span>
        </div>
        <code className="text-danger bg-code-bg block rounded-lg p-2 font-mono text-xs">
          http://xn--cmpus-4ve.test/login
        </code>
      </div>
      <div className="prose-lesson max-w-none text-sm">
        <Markdown compact>
          {`**Your task.** Use the inspector and the host analysis to decode \`xn--cmpus-4ve.test\`, then build a rule set on the **Rule builder** tab that classifies all twelve dataset names correctly. When precision and recall both reach 100%, the flag appears there.

Think it through:

- The displayed text and the real destination are different. That alone is suspicious.
- Decode the destination. Its ASCII form hides a Cyrillic letter.
- One rule will not catch everything: there is a homograph, a plain typosquat, and a misleading subdomain in the dataset.`}
        </Markdown>
      </div>
    </div>
  );
}

export default function HomographLab() {
  const saved = loadLabState<SavedState>(homographLab.id);
  const [original, setOriginal] = useState(saved?.original ?? DEFAULT_ORIGINAL);
  const [modified, setModified] = useState(saved?.modified ?? DEFAULT_MODIFIED);
  const [selected, setSelected] = useState<number | null>(1);
  const [rules, setRules] = useState<RuleConfig>(
    saved?.rules ?? { ...DEFAULT_RULES, blockNonAscii: true, protectedNames: [PROTECTED_NAME] },
  );
  const progress = useProgress();

  const evaluation = useMemo(() => runDataset(FIXTURES, rules), [rules]);
  const perfect = evaluation.matrix.falsePositive === 0 && evaluation.matrix.falseNegative === 0;
  const ruleSolved = Boolean(progress.challenges['homograph-rule']?.solvedAt);

  useEffect(() => {
    saveLabState(homographLab.id, { original, modified, rules } satisfies SavedState);
  }, [original, modified, rules]);

  // Mark the "fix the rule" and "verdict" challenges when the lab verifies success.
  useEffect(() => {
    if (evaluation.matrix.falsePositive === 0 && evaluation.matrix.truePositive > 0) {
      markChallengeSolved('homograph-rule');
    }
    if (perfect) {
      markChallengeSolved('homograph-verdict');
    }
  }, [evaluation, perfect]);

  const setRule = (id: RuleId, value: boolean) => {
    setRules((prev) => ({ ...prev, [id]: value, protectedNames: [PROTECTED_NAME] }));
  };

  const reset = () => {
    setOriginal(DEFAULT_ORIGINAL);
    setModified(DEFAULT_MODIFIED);
    setRules({ ...DEFAULT_RULES, blockNonAscii: true, protectedNames: [PROTECTED_NAME] });
    setSelected(1);
  };

  const guide = (
    <div className="space-y-5">
      <p className="text-fg-muted text-sm leading-relaxed">
        A <strong className="text-fg">homograph attack</strong> registers a domain that looks
        identical to a real one by swapping letters for look-alikes from another script. You will
        see exactly how the trick works, then build a detector that tells imitations apart from
        genuine international names.
      </p>
      <LabSteps
        steps={[
          {
            title: 'Compare',
            body: 'On the Inspector tab, compare the two names. Find the character that changed.',
          },
          {
            title: 'Inspect',
            body: 'Click characters to see code point, Unicode name, and script.',
          },
          { title: 'Decode', body: 'Read the ASCII (Punycode) form in the host analysis panel.' },
          {
            title: 'Defend',
            body: 'On the Rule builder tab, build a rule that catches imitations without false alarms.',
          },
          {
            title: 'Investigate',
            body: 'Solve the case file and reach 100% precision and recall for the flag.',
          },
        ]}
      />
      <Callout tone="info" title="Why this matters">
        Passing IDNA validation does not mean a name is safe, and not every non-ASCII name is an
        attack. The skill is telling <em>imitation of a protected name</em> apart from legitimate
        internationalized names.
      </Callout>
    </div>
  );

  const workspace = (
    <Tabs defaultValue="inspector" className="flex h-full flex-col">
      <TabsList className="shrink-0 px-4">
        <TabsTrigger value="inspector">Inspector</TabsTrigger>
        <TabsTrigger value="rules">Rule builder</TabsTrigger>
        <TabsTrigger value="case">Investigation</TabsTrigger>
      </TabsList>

      <TabsContent value="inspector" className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-5 p-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <label className="block">
                <span className="text-fg-subtle mb-1 block text-xs font-semibold tracking-wide uppercase">
                  Original (genuine)
                </span>
                <input
                  value={original}
                  onChange={(e) => setOriginal(e.target.value)}
                  spellCheck={false}
                  className="border-line bg-surface-2 text-fg focus:border-focus w-full rounded-lg border px-3 py-2 font-mono focus:outline-none"
                />
              </label>
              <CharRow
                value={original}
                onSelect={setSelected}
                selected={selected}
                label="Original characters"
              />
              <HostAnalysis host={original} />
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="text-fg-subtle mb-1 block text-xs font-semibold tracking-wide uppercase">
                  Modified (suspect)
                </span>
                <input
                  value={modified}
                  onChange={(e) => setModified(e.target.value)}
                  spellCheck={false}
                  className="border-line bg-surface-2 text-fg focus:border-focus w-full rounded-lg border px-3 py-2 font-mono focus:outline-none"
                />
              </label>
              <CharRow
                value={modified}
                compareTo={original}
                onSelect={setSelected}
                selected={selected}
                label="Modified characters (changes ringed)"
              />
              <HostAnalysis host={modified} />
            </div>
          </div>
          <div className="border-line bg-surface rounded-xl border p-4">
            <div className="text-fg-subtle mb-2 text-xs font-semibold tracking-wide uppercase">
              Character detail
            </div>
            <CharDetail value={modified} index={selected} />
          </div>
          <Callout tone="warning" title="Reserved for examples">
            These names use the reserved <code>.test</code> domain (RFC 6761). Nothing here resolves
            or connects to the network.
          </Callout>
        </div>
      </TabsContent>

      <TabsContent value="rules" className="min-h-0 flex-1 overflow-y-auto">
        <RuleBuilder
          rules={rules}
          onToggle={setRule}
          evaluation={evaluation}
          solved={ruleSolved || perfect}
          flag={FLAG}
        />
      </TabsContent>

      <TabsContent value="case" className="min-h-0 flex-1 overflow-y-auto">
        <Investigation />
      </TabsContent>
    </Tabs>
  );

  return (
    <LabLayout
      lab={homographLab}
      guide={guide}
      workspace={workspace}
      onReset={reset}
      toolbar={
        <a
          href="https://www.unicode.org/reports/tr39/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-fg-subtle hover:text-fg inline-flex items-center gap-1 text-xs"
        >
          UTS #39 <ExternalLink className="size-3" aria-hidden />
        </a>
      }
    />
  );
}
