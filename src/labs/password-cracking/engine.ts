import { sha256Hex } from '@/lib/sha256';

/**
 * How password storage choices change the cost of cracking. The "fast hash"
 * here is real SHA-256; the "slow hash" is real PBKDF2 via Web Crypto. Every
 * account, password, and hash is fictional and computed in the browser tab.
 *
 * The teaching arc: an unsalted fast hash lets one precomputed table crack
 * everyone at once and makes reused passwords obvious; a per-user salt forces
 * the attacker to start over for each account; a slow key-derivation function
 * multiplies the cost of every single guess.
 */

const encoder = new TextEncoder();

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** The fast, general-purpose hash — the wrong tool for passwords. */
export function fastHash(password: string): string {
  return sha256Hex(password);
}

/** A fast hash with a salt mixed in. Still fast, but no longer precomputable. */
export function saltedFastHash(salt: string, password: string): string {
  return sha256Hex(`${salt}:${password}`);
}

/** The slow, salted key-derivation function — the right tool for passwords. */
export async function pbkdf2Hex(
  password: string,
  salt: string,
  iterations: number,
): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: encoder.encode(salt), iterations, hash: 'SHA-256' },
    keyMaterial,
    256,
  );
  return toHex(new Uint8Array(bits));
}

// --- The lab's fictional breach -------------------------------------------

export interface Account {
  user: string;
  password: string;
}

/** Fictional accounts. Most chose weak passwords; one chose a strong one. */
export const ACCOUNTS: Account[] = [
  { user: 'admin', password: 'password123' },
  { user: 'j.rivera', password: 'letmein' },
  { user: 'l.nguyen', password: 'dragon' },
  { user: 'm.okoro', password: 'password123' }, // reused admin's password
  { user: 's.patel', password: 'river-stapler-9-cobalt' }, // strong, not in the wordlist
  { user: 't.walsh', password: 'qwerty' },
];

/** A short list of common passwords an attacker would try first. */
export const WORDLIST = [
  '123456',
  'password',
  'password123',
  'letmein',
  'qwerty',
  'dragon',
  'monkey',
  'football',
  'iloveyou',
  'admin',
  'welcome',
  'abc123',
];

export interface LeakedHash {
  user: string;
  hash: string;
  salt?: string;
}

/** What an attacker steals when passwords are stored as unsalted fast hashes. */
export const LEAKED_UNSALTED: LeakedHash[] = ACCOUNTS.map((a) => ({
  user: a.user,
  hash: fastHash(a.password),
}));

/** A stable per-user salt for the salted variants. */
export function saltFor(user: string): string {
  return sha256Hex(`salt:${user}`).slice(0, 16);
}

export const LEAKED_SALTED: LeakedHash[] = ACCOUNTS.map((a) => ({
  user: a.user,
  salt: saltFor(a.user),
  hash: saltedFastHash(saltFor(a.user), a.password),
}));

export interface CrackRow {
  user: string;
  password: string | null;
}

export interface CrackReport {
  rows: CrackRow[];
  cracked: number;
  total: number;
  /** How many hash computations the attack took — the cost signal. */
  work: number;
}

/**
 * Crack unsalted hashes: compute each wordlist hash ONCE and reuse it for every
 * account. This is why unsalted hashing is so weak — the work is shared.
 */
export function crackUnsalted(leaked: LeakedHash[], wordlist: string[]): CrackReport {
  const table = new Map<string, string>();
  for (const word of wordlist) table.set(fastHash(word), word);
  const rows = leaked.map((l) => ({ user: l.user, password: table.get(l.hash) ?? null }));
  return {
    rows,
    cracked: rows.filter((r) => r.password !== null).length,
    total: rows.length,
    work: wordlist.length, // one table built, reused for all users
  };
}

/**
 * Crack salted hashes: the salt is unique per user, so the attacker must redo
 * the whole wordlist for every account. The work grows with the number of
 * accounts.
 */
export function crackSalted(leaked: LeakedHash[], wordlist: string[]): CrackReport {
  let work = 0;
  const rows = leaked.map((l) => {
    let found: string | null = null;
    for (const word of wordlist) {
      work += 1;
      if (saltedFastHash(l.salt ?? '', word) === l.hash) {
        found = word;
        break;
      }
    }
    return { user: l.user, password: found };
  });
  return {
    rows,
    cracked: rows.filter((r) => r.password !== null).length,
    total: rows.length,
    work,
  };
}

/** Which accounts share a password (visible only when hashes are unsalted). */
export function reusedPasswordUsers(leaked: LeakedHash[]): string[][] {
  const byHash = new Map<string, string[]>();
  for (const l of leaked) {
    const group = byHash.get(l.hash) ?? [];
    group.push(l.user);
    byHash.set(l.hash, group);
  }
  return Array.from(byHash.values()).filter((g) => g.length > 1);
}

/** Rough cost of a salted, slow-hash dictionary attack, in hash operations. */
export function slowAttackWork(accounts: number, wordlistSize: number, iterations: number): number {
  return accounts * wordlistSize * iterations;
}
