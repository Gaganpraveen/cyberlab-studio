import { describe, expect, it } from 'vitest';

import { hashAnswer } from '../answers';
import {
  analyzeHost,
  type RuleConfig,
  DEFAULT_RULES,
  evaluate,
  inspect,
  looksLike,
  runDataset,
  scriptsIn,
  skeleton,
} from './engine';
import { challenges } from './challenges';
import { FIXTURES, PROTECTED_NAME } from './fixtures';

describe('inspect', () => {
  it('splits by code point with correct metadata', () => {
    const cells = inspect('cаm');
    expect(cells).toHaveLength(3);
    expect(cells[1]).toMatchObject({
      char: 'а',
      codePoint: 0x430,
      codePointHex: 'U+0430',
      script: 'Cyrillic',
      confusable: 'a',
      isAscii: false,
    });
    expect(cells[0]).toMatchObject({ script: 'Latin', isAscii: true });
  });
});

describe('analyzeHost (IDNA via the URL parser)', () => {
  it('matches the spec fixtures exactly', () => {
    expect(analyzeHost('cаmpus.test').ascii).toBe('xn--cmpus-4ve.test');
    expect(analyzeHost('bücher.test').ascii).toBe('xn--bcher-kva.test');
  });

  it('leaves ASCII names unchanged and marks them not-punycode', () => {
    const result = analyzeHost('campus.test');
    expect(result.ascii).toBe('campus.test');
    expect(result.isPunycode).toBe(false);
    expect(result.punycodeLabels).toEqual([]);
  });

  it('detects mixed scripts', () => {
    expect(analyzeHost('cаmpus.test').mixedScript).toBe(true);
    expect(analyzeHost('campus.test').mixedScript).toBe(false);
  });
});

describe('scriptsIn', () => {
  it('ignores common characters like dots', () => {
    expect(scriptsIn('campus.test')).toEqual(['Latin']);
    expect(scriptsIn('cаmpus').sort()).toEqual(['Cyrillic', 'Latin']);
  });
});

describe('skeleton and looksLike', () => {
  it('collapses confusables to Latin', () => {
    expect(skeleton('cаmpuѕ')).toBe('campus');
  });

  it('flags look-alikes but not identical or genuinely different strings', () => {
    expect(looksLike('cаmpus', 'campus')).toBe(true);
    expect(looksLike('campus', 'campus')).toBe(false);
    expect(looksLike('library', 'campus')).toBe(false);
  });
});

describe('evaluate', () => {
  const rules: RuleConfig = {
    ...DEFAULT_RULES,
    confusableSkeleton: true,
    protectedNames: [PROTECTED_NAME],
  };

  it('flags a confusable imitation of the protected name', () => {
    expect(evaluate('cаmpus.test', rules).flagged).toBe(true);
  });

  it('does not flag the genuine name or a benign IDN', () => {
    expect(evaluate('campus.test', rules).flagged).toBe(false);
    expect(evaluate('bücher.test', rules).flagged).toBe(false);
  });

  it('respects the allowlist', () => {
    const verdict = evaluate('bücher.test', {
      ...rules,
      blockNonAscii: true,
      allowlist: ['bücher.test'],
    });
    expect(verdict.flagged).toBe(false);
    expect(verdict.allowlisted).toBe(true);
  });
});

describe('runDataset', () => {
  it('blockNonAscii alone has poor precision: it flags benign IDNs', () => {
    const evaluation = runDataset(FIXTURES, { ...DEFAULT_RULES, blockNonAscii: true });
    // It catches the homographs but also the benign non-ASCII names.
    expect(evaluation.matrix.falsePositive).toBeGreaterThan(0);
    expect(evaluation.precision).toBeLessThan(1);
  });

  it('a combined rule set separates homographs from benign IDNs', () => {
    const evaluation = runDataset(FIXTURES, {
      ...DEFAULT_RULES,
      confusableSkeleton: true,
      protectedNames: [PROTECTED_NAME],
    });
    // Benign bücher.test, résumé.test and 学校.test must NOT be flagged.
    const benign = evaluation.results.filter((r) => !r.suspicious);
    expect(benign.every((r) => !r.verdict.flagged)).toBe(true);
    // The Cyrillic homographs ARE flagged.
    expect(evaluation.results.find((r) => r.host === 'cаmpus.test')?.outcome).toBe('TP');
  });

  it('handles zero denominators without NaN', () => {
    const evaluation = runDataset(FIXTURES, DEFAULT_RULES);
    expect(Number.isFinite(evaluation.precision)).toBe(true);
    expect(Number.isFinite(evaluation.recall)).toBe(true);
  });
});

describe('challenge answers', () => {
  it('every accepted hash corresponds to a real, checkable answer', () => {
    // H-C01: the changed character's code point
    const c01 = challenges.find((c) => c.id === 'homograph-code-point')!;
    expect(c01.acceptedHashes).toContain(hashAnswer('U+0430'));

    // H-C04: the ASCII form of the modified fixture
    const c04 = challenges.find((c) => c.id === 'homograph-punycode')!;
    expect(c04.acceptedHashes).toContain(hashAnswer('xn--cmpus-4ve.test'));
  });

  it('challenge ids are unique and prefixed with the lab id', () => {
    const ids = challenges.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(challenges.every((c) => c.labId === 'homograph')).toBe(true);
  });
});
