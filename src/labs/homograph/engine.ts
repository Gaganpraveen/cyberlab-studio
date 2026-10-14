import { confusableLatin, nameOf, scriptOf } from './unicodeData';

/**
 * The homograph analysis engine: pure functions over strings. No DOM, no
 * React, so the whole thing is unit tested. It uses the browser's own URL
 * parser for IDNA/Punycode, which is the real, standards-based path.
 */

export interface CharCell {
  index: number;
  char: string;
  codePoint: number;
  codePointHex: string;
  name: string;
  script: string;
  /** The Latin letter this character imitates, if it is a known confusable. */
  confusable?: string;
  isAscii: boolean;
}

/** Break a string into inspectable per-character cells (by code point). */
export function inspect(value: string): CharCell[] {
  const cells: CharCell[] = [];
  let index = 0;
  for (const char of value) {
    const codePoint = char.codePointAt(0)!;
    const confusable = confusableLatin(codePoint);
    cells.push({
      index: index++,
      char,
      codePoint,
      codePointHex: `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`,
      name: nameOf(codePoint),
      script: scriptOf(codePoint),
      ...(confusable ? { confusable } : {}),
      isAscii: codePoint < 0x80,
    });
  }
  return cells;
}

/** The distinct non-common scripts present in a string. */
export function scriptsIn(value: string): string[] {
  const scripts = new Set<string>();
  for (const char of value) {
    const script = scriptOf(char.codePointAt(0)!);
    if (script !== 'Common' && script !== 'Unknown') scripts.add(script);
  }
  return [...scripts];
}

export interface HostAnalysis {
  input: string;
  /** The hostname the browser's URL parser produced (already IDNA-mapped). */
  ascii: string;
  /** True when the ASCII form differs from the input (it was Punycode-encoded). */
  isPunycode: boolean;
  /** The dot-separated labels of the ASCII hostname. */
  labels: string[];
  /** Labels encoded with the "xn--" ACE prefix. */
  punycodeLabels: string[];
  valid: boolean;
  error?: string;
  scripts: string[];
  mixedScript: boolean;
}

/**
 * Parse a hostname the way a browser does. The WHATWG URL parser applies
 * UTS #46 (IDNA) mapping and Punycode encoding, so this is the real behavior,
 * not a reimplementation.
 */
export function analyzeHost(input: string): HostAnalysis {
  const trimmed = input.trim();
  const scripts = scriptsIn(trimmed);
  try {
    const url = new URL(`http://${trimmed}`);
    const ascii = url.hostname;
    const labels = ascii.split('.');
    return {
      input: trimmed,
      ascii,
      isPunycode: ascii !== trimmed.toLowerCase(),
      labels,
      punycodeLabels: labels.filter((l) => l.startsWith('xn--')),
      valid: true,
      scripts,
      mixedScript: scripts.length > 1,
    };
  } catch (error) {
    return {
      input: trimmed,
      ascii: '',
      isPunycode: false,
      labels: [],
      punycodeLabels: [],
      valid: false,
      error: (error as Error).message,
      scripts,
      mixedScript: scripts.length > 1,
    };
  }
}

/**
 * The "skeleton" of a string: each confusable character replaced by the Latin
 * letter it imitates, lowercased. Two strings with the same skeleton look
 * alike. This mirrors the idea behind Unicode UTS #39 confusable detection.
 */
export function skeleton(value: string): string {
  let result = '';
  for (const char of value) {
    const codePoint = char.codePointAt(0)!;
    result += confusableLatin(codePoint) ?? char.toLowerCase();
  }
  return result;
}

/** Do two names look confusable (same skeleton) but differ in actual characters? */
export function looksLike(a: string, b: string): boolean {
  return a !== b && skeleton(a) === skeleton(b);
}

// --- Detection rules ------------------------------------------------------

export type RuleId = 'blockNonAscii' | 'mixedScript' | 'confusableSkeleton';

export interface RuleConfig {
  blockNonAscii: boolean;
  mixedScript: boolean;
  confusableSkeleton: boolean;
  /** Allowlist of exact hostnames that are always permitted. */
  allowlist: string[];
  /** Protected names whose skeleton an input must not imitate. */
  protectedNames: string[];
}

export const DEFAULT_RULES: RuleConfig = {
  blockNonAscii: false,
  mixedScript: false,
  confusableSkeleton: false,
  allowlist: [],
  protectedNames: [],
};

export interface RuleHit {
  rule: RuleId;
  reason: string;
}

export interface Verdict {
  flagged: boolean;
  hits: RuleHit[];
  allowlisted: boolean;
}

/** Run a rule configuration against one hostname. */
export function evaluate(host: string, rules: RuleConfig): Verdict {
  const normalized = host.trim().toLowerCase();
  if (rules.allowlist.map((h) => h.toLowerCase()).includes(normalized)) {
    return { flagged: false, hits: [], allowlisted: true };
  }

  const hits: RuleHit[] = [];
  const labelsPart = normalized.split('.').slice(0, -1).join('.') || normalized;

  if (rules.blockNonAscii && [...host].some((c) => c.codePointAt(0)! >= 0x80)) {
    hits.push({ rule: 'blockNonAscii', reason: 'Contains a non-ASCII character' });
  }
  if (rules.mixedScript && scriptsIn(labelsPart).length > 1) {
    hits.push({
      rule: 'mixedScript',
      reason: `Mixes scripts: ${scriptsIn(labelsPart).join(' + ')}`,
    });
  }
  if (rules.confusableSkeleton) {
    const hostSkeleton = skeleton(labelsPart);
    for (const name of rules.protectedNames) {
      const protectedSkeleton = skeleton(name.split('.').slice(0, -1).join('.') || name);
      if (hostSkeleton === protectedSkeleton && normalized !== name.toLowerCase()) {
        hits.push({
          rule: 'confusableSkeleton',
          reason: `Looks like the protected name "${name}"`,
        });
        break;
      }
    }
  }

  return { flagged: hits.length > 0, hits, allowlisted: false };
}

// --- Evaluation against a labeled dataset ---------------------------------

export interface Fixture {
  host: string;
  /** Ground truth within the fictional protected-domain context. */
  suspicious: boolean;
  note: string;
}

export interface ConfusionMatrix {
  truePositive: number;
  falsePositive: number;
  trueNegative: number;
  falseNegative: number;
}

export interface FixtureResult extends Fixture {
  verdict: Verdict;
  outcome: 'TP' | 'FP' | 'TN' | 'FN';
}

export interface Evaluation {
  results: FixtureResult[];
  matrix: ConfusionMatrix;
  precision: number;
  recall: number;
  accuracy: number;
}

function outcomeOf(flagged: boolean, suspicious: boolean): FixtureResult['outcome'] {
  if (flagged && suspicious) return 'TP';
  if (flagged && !suspicious) return 'FP';
  if (!flagged && suspicious) return 'FN';
  return 'TN';
}

/** Score a rule configuration against a labeled dataset. */
export function runDataset(fixtures: Fixture[], rules: RuleConfig): Evaluation {
  const matrix: ConfusionMatrix = {
    truePositive: 0,
    falsePositive: 0,
    trueNegative: 0,
    falseNegative: 0,
  };
  const results = fixtures.map((fixture) => {
    const verdict = evaluate(fixture.host, rules);
    const outcome = outcomeOf(verdict.flagged, fixture.suspicious);
    if (outcome === 'TP') matrix.truePositive++;
    else if (outcome === 'FP') matrix.falsePositive++;
    else if (outcome === 'FN') matrix.falseNegative++;
    else matrix.trueNegative++;
    return { ...fixture, verdict, outcome };
  });

  const { truePositive: tp, falsePositive: fp, falseNegative: fn, trueNegative: tn } = matrix;
  // Zero-denominator handling (spec: show metrics with safe denominators).
  const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 1 : tp / (tp + fn);
  const accuracy = (tp + tn) / fixtures.length;

  return { results, matrix, precision, recall, accuracy };
}
