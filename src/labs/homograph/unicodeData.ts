/**
 * A small, curated slice of Unicode data for the homograph lab.
 *
 * The browser does not expose Unicode character *names* or the full
 * confusables table, and shipping all of it would be large. This curated set
 * covers the characters the lab uses and the most common Latin look-alikes.
 * It is a teaching baseline, not a production confusable detector: the lesson
 * says so explicitly and points at Unicode UTS #39 for the real data.
 */

export interface CharInfo {
  name: string;
  script: string;
}

/** Names and scripts for specific code points we reference by name. */
const NAMED: Record<number, CharInfo> = {
  0x61: { name: 'LATIN SMALL LETTER A', script: 'Latin' },
  0x65: { name: 'LATIN SMALL LETTER E', script: 'Latin' },
  0x6f: { name: 'LATIN SMALL LETTER O', script: 'Latin' },
  0x70: { name: 'LATIN SMALL LETTER P', script: 'Latin' },
  0x63: { name: 'LATIN SMALL LETTER C', script: 'Latin' },
  0x78: { name: 'LATIN SMALL LETTER X', script: 'Latin' },
  0x79: { name: 'LATIN SMALL LETTER Y', script: 'Latin' },
  0x69: { name: 'LATIN SMALL LETTER I', script: 'Latin' },
  0x6c: { name: 'LATIN SMALL LETTER L', script: 'Latin' },
  0xfc: { name: 'LATIN SMALL LETTER U WITH DIAERESIS', script: 'Latin' },
  // Cyrillic look-alikes
  0x430: { name: 'CYRILLIC SMALL LETTER A', script: 'Cyrillic' },
  0x435: { name: 'CYRILLIC SMALL LETTER IE', script: 'Cyrillic' },
  0x43e: { name: 'CYRILLIC SMALL LETTER O', script: 'Cyrillic' },
  0x440: { name: 'CYRILLIC SMALL LETTER ER', script: 'Cyrillic' },
  0x441: { name: 'CYRILLIC SMALL LETTER ES', script: 'Cyrillic' },
  0x443: { name: 'CYRILLIC SMALL LETTER U', script: 'Cyrillic' },
  0x445: { name: 'CYRILLIC SMALL LETTER HA', script: 'Cyrillic' },
  0x455: { name: 'CYRILLIC SMALL LETTER DZE', script: 'Cyrillic' },
  0x456: { name: 'CYRILLIC SMALL LETTER BYELORUSSIAN-UKRAINIAN I', script: 'Cyrillic' },
  0x458: { name: 'CYRILLIC SMALL LETTER JE', script: 'Cyrillic' },
  // Greek look-alikes
  0x3b1: { name: 'GREEK SMALL LETTER ALPHA', script: 'Greek' },
  0x3bf: { name: 'GREEK SMALL LETTER OMICRON', script: 'Greek' },
  0x3c1: { name: 'GREEK SMALL LETTER RHO', script: 'Greek' },
  0x3c5: { name: 'GREEK SMALL LETTER UPSILON', script: 'Greek' },
  0x3c7: { name: 'GREEK SMALL LETTER CHI', script: 'Greek' },
  0x3f2: { name: 'GREEK LUNATE SIGMA SYMBOL', script: 'Greek' },
};

/**
 * Confusable "skeleton" map: code point -> the Latin letter it mimics.
 * Mirrors the idea of UTS #39 confusables, limited to common cases.
 */
const CONFUSABLE_TO_LATIN: Record<number, string> = {
  0x430: 'a',
  0x435: 'e',
  0x43e: 'o',
  0x440: 'p',
  0x441: 'c',
  0x443: 'y',
  0x445: 'x',
  0x455: 's',
  0x456: 'i',
  0x458: 'j',
  0x3b1: 'a',
  0x3bf: 'o',
  0x3c1: 'p',
  0x3c5: 'u',
  0x3c7: 'x',
  0x3f2: 'c',
  // Digit / letter confusables
  0x31: 'l',
  0x30: 'o',
};

const SCRIPT_TESTS: Array<[string, RegExp]> = [
  ['Latin', /\p{Script=Latin}/u],
  ['Cyrillic', /\p{Script=Cyrillic}/u],
  ['Greek', /\p{Script=Greek}/u],
  ['Han', /\p{Script=Han}/u],
  ['Arabic', /\p{Script=Arabic}/u],
  ['Hebrew', /\p{Script=Hebrew}/u],
  ['Hiragana', /\p{Script=Hiragana}/u],
  ['Katakana', /\p{Script=Katakana}/u],
  ['Hangul', /\p{Script=Hangul}/u],
];

/** The Unicode script of a single code point, via property escapes. */
export function scriptOf(codePoint: number): string {
  const char = String.fromCodePoint(codePoint);
  const named = NAMED[codePoint];
  if (named) return named.script;
  for (const [name, test] of SCRIPT_TESTS) {
    if (test.test(char)) return name;
  }
  if (/\p{Nd}/u.test(char)) return 'Common';
  if (/[\s\p{P}\p{S}]/u.test(char)) return 'Common';
  return 'Unknown';
}

/** A readable character name. Falls back to a generated U+XXXX label. */
export function nameOf(codePoint: number): string {
  const named = NAMED[codePoint];
  if (named) return named.name;
  const char = String.fromCodePoint(codePoint);
  if (char === '.') return 'FULL STOP';
  if (char === '-') return 'HYPHEN-MINUS';
  if (/[a-z]/.test(char)) return `LATIN SMALL LETTER ${char.toUpperCase()}`;
  if (/[A-Z]/.test(char)) return `LATIN CAPITAL LETTER ${char}`;
  if (/[0-9]/.test(char)) return `DIGIT ${['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'][Number(char)]}`;
  return `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`;
}

/** The Latin letter a code point is confusable with, if any. */
export function confusableLatin(codePoint: number): string | undefined {
  return CONFUSABLE_TO_LATIN[codePoint];
}
