import { CheckCircle2, Trophy } from 'lucide-react';

import { Badge } from '@/components/ui/primitives';
import { cn } from '@/lib/cn';

import { type Evaluation, type RuleConfig, type RuleId } from './engine';

const RULE_LABELS: Record<RuleId, { title: string; detail: string }> = {
  blockNonAscii: {
    title: 'Block all non-ASCII',
    detail: 'Flags any name with a character outside basic ASCII. Blunt: punishes every non-English language.',
  },
  mixedScript: {
    title: 'Flag mixed scripts',
    detail: 'Flags a label that combines two writing systems (for example Latin + Cyrillic).',
  },
  confusableSkeleton: {
    title: 'Confusable skeleton match',
    detail: 'Flags a name whose "skeleton" matches a protected name you are defending.',
  },
};

function Toggle({
  id,
  checked,
  onChange,
}: {
  id: RuleId;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  const { title, detail } = RULE_LABELS[id];
  return (
    <label className="border-line bg-surface-2 flex cursor-pointer gap-3 rounded-lg border p-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-accent mt-0.5 size-4 shrink-0"
      />
      <span className="min-w-0">
        <span className="text-fg block text-sm font-medium">{title}</span>
        <span className="text-fg-subtle block text-xs leading-relaxed">{detail}</span>
      </span>
    </label>
  );
}

function MatrixCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'good' | 'bad' | 'neutral';
}) {
  return (
    <div
      className={cn(
        'rounded-lg border p-3 text-center',
        tone === 'good' && 'border-success/30 bg-success-soft',
        tone === 'bad' && value > 0 ? 'border-danger/30 bg-danger-soft' : '',
        tone === 'neutral' && 'border-line bg-surface-2',
        tone === 'bad' && value === 0 && 'border-line bg-surface-2',
      )}
    >
      <div className="text-fg text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-fg-subtle text-xs">{label}</div>
    </div>
  );
}

export function RuleBuilder({
  rules,
  onToggle,
  evaluation,
  solved,
  flag,
}: {
  rules: RuleConfig;
  onToggle: (id: RuleId, value: boolean) => void;
  evaluation: Evaluation;
  solved: boolean;
  flag?: string;
}) {
  const { matrix, precision, recall } = evaluation;
  const perfect = matrix.falsePositive === 0 && matrix.falseNegative === 0;
  const pct = (n: number) => `${Math.round(n * 100)}%`;

  return (
    <div className="space-y-5 p-5">
      <div>
        <h3 className="text-fg font-semibold">Build a detection rule</h3>
        <p className="text-fg-muted mt-1 text-sm">
          Turn rules on and off, then watch the confusion matrix. The goal is to catch every
          imitation of <code className="text-accent-text">campus.test</code> without flagging benign
          international names.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {(Object.keys(RULE_LABELS) as RuleId[]).map((id) => (
          <Toggle key={id} id={id} checked={rules[id]} onChange={(v) => onToggle(id, v)} />
        ))}
      </div>

      {(solved || perfect) && flag && (
        <div className="border-success/40 bg-success-soft flex items-center gap-3 rounded-xl border p-4">
          <Trophy className="text-success size-5 shrink-0" aria-hidden />
          <div>
            <div className="text-fg text-sm font-semibold">Perfect classification. Here is your flag:</div>
            <code className="text-success font-mono text-sm">{flag}</code>
          </div>
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-fg text-sm font-semibold">Confusion matrix</h4>
          <div className="flex gap-2">
            <Badge tone={precision === 1 ? 'success' : 'neutral'}>Precision {pct(precision)}</Badge>
            <Badge tone={recall === 1 ? 'success' : 'neutral'}>Recall {pct(recall)}</Badge>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <MatrixCell label="Caught (true +)" value={matrix.truePositive} tone="good" />
          <MatrixCell label="Missed (false −)" value={matrix.falseNegative} tone="bad" />
          <MatrixCell label="False alarms (false +)" value={matrix.falsePositive} tone="bad" />
          <MatrixCell label="Correctly allowed (true −)" value={matrix.trueNegative} tone="neutral" />
        </div>
      </div>

      <div>
        <h4 className="text-fg mb-2 text-sm font-semibold">Results on each name</h4>
        <div className="border-line overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-fg-subtle text-xs">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Name</th>
                <th className="px-3 py-2 text-left font-medium">Truth</th>
                <th className="px-3 py-2 text-left font-medium">Your rule</th>
                <th className="px-3 py-2 text-left font-medium">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {evaluation.results.map((r) => (
                <tr key={r.host}>
                  <td className="px-3 py-2 font-mono text-[0.8125rem]">{r.host}</td>
                  <td className="px-3 py-2">
                    <span className={r.suspicious ? 'text-danger' : 'text-success'}>
                      {r.suspicious ? 'suspicious' : 'benign'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {r.verdict.flagged ? (
                      <span className="text-danger">flagged</span>
                    ) : (
                      <span className="text-fg-muted">allowed</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {r.outcome === 'TP' || r.outcome === 'TN' ? (
                      <span className="text-success inline-flex items-center gap-1">
                        <CheckCircle2 className="size-3.5" aria-hidden /> {r.outcome}
                      </span>
                    ) : (
                      <span className="text-danger font-medium">{r.outcome}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-fg-subtle mt-2 text-xs leading-relaxed">
          Labels are ground truth within this fictional campus context. “Suspicious” means “imitates
          campus.test”, never a claim about a real website.
        </p>
      </div>
    </div>
  );
}
