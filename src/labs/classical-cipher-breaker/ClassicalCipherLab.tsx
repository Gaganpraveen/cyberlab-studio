import { Flag, KeyRound, Play, Sparkles } from 'lucide-react';
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
  CAESAR_CIPHERTEXT,
  CAESAR_FLAG,
  ENGLISH_FREQ,
  ENGLISH_IC,
  type KeyLengthScore,
  RANDOM_IC,
  VIGENERE_CIPHERTEXT,
  VIGENERE_FLAG,
  type VigenereSolution,
  breakCaesar,
  caesarShift,
  guessKeyLength,
  keyLengthScores,
  letterFrequencies,
  solveVigenere,
} from './engine';
import { classicalCipherLab } from './index';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function FreqBars({ text }: { text: string }) {
  const freq = letterFrequencies(text);
  const max = 14;
  return (
    <div className="border-line bg-surface/40 rounded-xl border p-3">
      <div className="text-fg-subtle mb-2 text-xs">
        Letter frequency of the decrypted text (bars) vs English (dashes)
      </div>
      <div className="flex h-24 items-end gap-[2px]">
        {ALPHABET.map((letter, i) => {
          const value = freq[i] ?? 0;
          const english = ENGLISH_FREQ[i] ?? 0;
          return (
            <div key={letter} className="relative flex flex-1 flex-col items-center justify-end">
              <div
                className="bg-accent/80 w-full rounded-sm"
                style={{ height: `${Math.min(100, (value / max) * 100)}%` }}
              />
              <div
                className="bg-fg-subtle absolute left-0 h-[2px] w-full"
                style={{ bottom: `${Math.min(100, (english / max) * 100)}%` }}
                aria-hidden
              />
            </div>
          );
        })}
      </div>
      <div className="text-fg-subtle mt-1 flex gap-[2px] text-[0.6rem]">
        {ALPHABET.map((letter) => (
          <span key={letter} className="flex-1 text-center">
            {letter}
          </span>
        ))}
      </div>
    </div>
  );
}

function IcChart({ scores, best }: { scores: KeyLengthScore[]; best: number }) {
  const max = 0.075;
  return (
    <div className="border-line bg-surface/40 rounded-xl border p-3">
      <div className="text-fg-subtle mb-2 text-xs">
        Average index of coincidence by candidate key length (English ≈ {ENGLISH_IC.toFixed(3)},
        random ≈ {RANDOM_IC.toFixed(3)})
      </div>
      <div className="flex h-32 items-end gap-1.5">
        {scores.map((s) => {
          const isBest = s.length === best;
          return (
            <div key={s.length} className="flex flex-1 flex-col items-center justify-end gap-1">
              <span className="text-fg-subtle text-[0.6rem] tabular-nums">{s.ic.toFixed(3)}</span>
              <div
                className={cn('w-full rounded-sm', isBest ? 'bg-success' : 'bg-accent/50')}
                style={{ height: `${Math.min(100, (s.ic / max) * 100)}%` }}
              />
              <span className={cn('text-[0.65rem] tabular-nums', isBest ? 'text-success' : 'text-fg-subtle')}>
                {s.length}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ClassicalCipherLab() {
  const bestCaesar = useMemo(() => breakCaesar(CAESAR_CIPHERTEXT).best, []);
  const [shift, setShift] = useState(0);
  const [caesarLogged, setCaesarLogged] = useState(false);
  const [scores, setScores] = useState<KeyLengthScore[] | null>(null);
  const [solution, setSolution] = useState<VigenereSolution | null>(null);
  const [log, setLog] = useState<EvidenceEntry[]>([]);
  const add = (e: EvidenceEntry) => setLog((prev) => [...prev, e]);

  const caesarText = caesarShift(CAESAR_CIPHERTEXT, shift);
  const caesarBroken = shift === bestCaesar.shift;

  const applyShift = (next: number) => {
    setShift(next);
    if (next === bestCaesar.shift && !caesarLogged) {
      setCaesarLogged(true);
      markChallengeSolved('cipher-caesar-break');
      add(
        evidence(
          'success',
          `Caesar cipher broken with decryption shift ${bestCaesar.shift}`,
          `The plaintext scores most like English. Flag in the message: ${CAESAR_FLAG}`,
        ),
      );
    }
  };

  const autoBreakCaesar = () => {
    add(
      evidence(
        'info',
        'Scoring all 26 shifts against English letter frequencies',
        'Each candidate is ranked by a chi-squared distance; the lowest is the plaintext.',
      ),
    );
    applyShift(bestCaesar.shift);
  };

  const analyzeKeyLength = () => {
    const s = keyLengthScores(VIGENERE_CIPHERTEXT, 12);
    setScores(s);
    const best = guessKeyLength(VIGENERE_CIPHERTEXT, 12);
    add(
      evidence(
        'info',
        `Index of coincidence points to key length ${best}`,
        'At the true length each column is a single-shift cipher, so its IC climbs back toward English.',
      ),
    );
  };

  const recoverAndDecrypt = () => {
    const sol = solveVigenere(VIGENERE_CIPHERTEXT, 12);
    setSolution(sol);
    if (!scores) setScores(keyLengthScores(VIGENERE_CIPHERTEXT, 12));
    add(
      evidence(
        'success',
        `Recovered the keyword "${sol.key}" and decrypted the message`,
        `Each column was solved as a Caesar shift. Flag in the plaintext: ${VIGENERE_FLAG}`,
      ),
    );
  };

  const reset = () => {
    setShift(0);
    setCaesarLogged(false);
    setScores(null);
    setSolution(null);
    setLog([]);
  };

  const guide = (
    <div className="space-y-5">
      <p className="text-fg-muted text-sm leading-relaxed">
        Classical ciphers hide letters, not their <strong className="text-fg">frequencies</strong>. You will break two
        of them with nothing but counting: a Caesar cipher by trying every shift, and a Vigenere cipher by using the
        index of coincidence to peel a repeating key apart.
      </p>
      <LabSteps
        steps={[
          { title: 'Read the fingerprint', body: 'See how English letter frequencies betray a cipher.' },
          { title: 'Brute-force Caesar', body: 'Score all 26 shifts and take the most English-like one.' },
          { title: 'Find the key length', body: 'Use the index of coincidence to size the Vigenere key.' },
          { title: 'Recover the keyword', body: 'Solve each column as a Caesar shift and read the key.' },
          { title: 'Decrypt', body: 'Read both hidden flags out of the plaintext.' },
        ]}
      />
      <Callout tone="info" title="Real computation, no secrets stored">
        The analysis genuinely runs in your browser — chi-squared scoring and the index of coincidence over the
        provided ciphertext. Nothing is sent anywhere; both messages are fictional.
      </Callout>
    </div>
  );

  const workspace = (
    <Tabs defaultValue="caesar" className="flex h-full flex-col">
      <TabsList className="shrink-0 px-4 pt-2">
        <TabsTrigger value="caesar">Caesar</TabsTrigger>
        <TabsTrigger value="vigenere">Vigenere</TabsTrigger>
      </TabsList>

      {/* --- Caesar --- */}
      <TabsContent value="caesar" className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-4 p-5">
          <div>
            <div className="text-fg-subtle mb-1 text-xs font-semibold tracking-[0.1em] uppercase">Ciphertext</div>
            <pre className="border-line bg-surface-2 text-fg-muted overflow-x-auto rounded-lg border p-3 font-mono text-xs whitespace-pre-wrap">
              {CAESAR_CIPHERTEXT}
            </pre>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <label className="text-fg-muted text-sm">
                Decryption shift: <span className="text-fg font-mono tabular-nums">{shift}</span>
              </label>
              <input
                type="range"
                min={0}
                max={25}
                value={shift}
                onChange={(e) => applyShift(Number(e.target.value))}
                className="accent-accent w-40"
                aria-label="Caesar decryption shift"
              />
            </div>
            <Button size="sm" onClick={autoBreakCaesar} className="gap-1.5">
              <Sparkles className="size-3.5" aria-hidden /> Break automatically
            </Button>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-fg-subtle text-xs font-semibold tracking-[0.1em] uppercase">Decrypted</span>
              {caesarBroken && <Badge tone="success">English found</Badge>}
            </div>
            <pre
              className={cn(
                'overflow-x-auto rounded-lg border p-3 font-mono text-xs whitespace-pre-wrap',
                caesarBroken ? 'border-success/40 bg-success-soft text-fg' : 'border-line bg-surface-2 text-fg-muted',
              )}
            >
              {caesarText}
            </pre>
          </div>

          {caesarBroken && (
            <div className="border-accent/40 bg-accent-soft text-fg flex items-center gap-2 rounded-lg border p-2 font-mono text-xs">
              <Flag className="text-accent-text size-4 shrink-0" aria-hidden />
              {CAESAR_FLAG}
            </div>
          )}

          <FreqBars text={caesarText} />
        </div>
      </TabsContent>

      {/* --- Vigenere --- */}
      <TabsContent value="vigenere" className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-4 p-5">
          <div>
            <div className="text-fg-subtle mb-1 text-xs font-semibold tracking-[0.1em] uppercase">Ciphertext</div>
            <pre className="border-line bg-surface-2 text-fg-muted max-h-32 overflow-auto rounded-lg border p-3 font-mono text-xs whitespace-pre-wrap">
              {VIGENERE_CIPHERTEXT}
            </pre>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={analyzeKeyLength} className="gap-1.5">
              <Play className="size-3.5" aria-hidden /> Analyze key length
            </Button>
            <Button size="sm" onClick={recoverAndDecrypt} className="gap-1.5">
              <KeyRound className="size-3.5" aria-hidden /> Recover key &amp; decrypt
            </Button>
          </div>

          {scores && <IcChart scores={scores} best={guessKeyLength(VIGENERE_CIPHERTEXT, 12)} />}

          {solution && (
            <>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-fg-muted">Recovered key:</span>
                <Badge tone="success" className="font-mono">
                  {solution.key}
                </Badge>
                <span className="text-fg-subtle text-xs">(length {solution.keyLength})</span>
              </div>
              <div>
                <div className="text-fg-subtle mb-1 text-xs font-semibold tracking-[0.1em] uppercase">Decrypted</div>
                <pre className="border-success/40 bg-success-soft text-fg max-h-40 overflow-auto rounded-lg border p-3 font-mono text-xs whitespace-pre-wrap">
                  {solution.plaintext}
                </pre>
              </div>
              <div className="border-accent/40 bg-accent-soft text-fg flex items-center gap-2 rounded-lg border p-2 font-mono text-xs">
                <Flag className="text-accent-text size-4 shrink-0" aria-hidden />
                {VIGENERE_FLAG}
              </div>
            </>
          )}

          <div className="prose-lesson max-w-none text-sm">
            <Markdown compact>
              {`A **Vigenere** cipher uses a repeating keyword, so letter frequencies are smeared across the key and a single frequency count looks almost random. Its weakness is the repeat: the **index of coincidence** rises toward the English value only when you group letters that share a key position. Find that spacing and every group collapses back into a Caesar cipher you already know how to break.`}
            </Markdown>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );

  return (
    <LabLayout
      lab={classicalCipherLab}
      guide={guide}
      workspace={workspace}
      evidence={<EvidenceLog entries={log} onClear={() => setLog([])} />}
      onReset={reset}
    />
  );
}
