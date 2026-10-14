import type { Fixture } from './engine';

/**
 * The fictional protected domain for this lab. Everything is scoped to this
 * made-up campus context; no real website is ever claimed to be malicious.
 * `.test` is a reserved TLD (RFC 6761) used for examples.
 */
export const PROTECTED_NAME = 'campus.test';

/** The two side-by-side strings the inspector starts with. */
export const DEFAULT_ORIGINAL = 'campus.test';
export const DEFAULT_MODIFIED = 'cаmpus.test'; // second letter is Cyrillic a (U+0430)

/**
 * A labeled dataset for the rule-building exercise. Labels are ground truth
 * *within this fictional context*: "suspicious" means "tries to impersonate
 * campus.test", not a claim about any real site. Includes benign
 * internationalized names that must NOT be flagged.
 */
export const FIXTURES: Fixture[] = [
  { host: 'campus.test', suspicious: false, note: 'The genuine protected name (all ASCII).' },
  { host: 'library.test', suspicious: false, note: 'A different, legitimate campus service.' },
  { host: 'mail.campus.test', suspicious: false, note: 'A legitimate subdomain of the real name.' },
  { host: 'bücher.test', suspicious: false, note: 'A benign German word (bücher). Non-ASCII is not the same as malicious.' },
  { host: 'résumé.test'.normalize('NFC'), suspicious: false, note: 'A benign accented word (résumé).' },
  { host: '学校.test', suspicious: false, note: 'A benign Han name (学校, "school").' },
  { host: 'cаmpus.test', suspicious: true, note: 'Cyrillic a replaces Latin a. Imitates campus.test.' },
  { host: 'campuѕ.test', suspicious: true, note: 'Cyrillic dze replaces the final s.' },
  { host: 'cаmpuѕ.test', suspicious: true, note: 'Two Cyrillic swaps imitate campus.test.' },
  { host: 'campus-test.test', suspicious: true, note: 'Typosquat: a hyphen is not a dot. Different owner.' },
  { host: 'campus.test.evil-login.test', suspicious: true, note: 'Misleading subdomain: the real site is evil-login.test.' },
  { host: 'canpus.test', suspicious: true, note: 'Typosquat: n replaces m (all ASCII, not a homograph).' },
];
