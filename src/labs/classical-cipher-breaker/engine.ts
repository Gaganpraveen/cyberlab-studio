/**
 * Real cryptanalysis of classical ciphers, done with pure deterministic
 * computation in the browser — no network, no randomness. The learner breaks a
 * Caesar cipher by trying all shifts and scoring each against English letter
 * frequencies, then breaks a Vigenere cipher by using the index of coincidence
 * to recover the key length and frequency analysis to recover the key itself.
 *
 * The point of the lab is not that these ciphers are used today (they are not)
 * but *why* they fall: a monoalphabetic cipher preserves letter frequencies,
 * and a repeating-key cipher preserves them within each key column.
 */

/** Relative frequency of each letter A–Z in ordinary English text, as a percent. */
export const ENGLISH_FREQ: readonly number[] = [
  8.17, 1.49, 2.78, 4.25, 12.70, 2.23, 2.02, 6.09, 6.97, 0.15, 0.77, 4.03, 2.41, 6.75, 7.51, 1.93,
  0.1, 5.99, 6.33, 9.06, 2.76, 0.98, 2.36, 0.15, 1.97, 0.07,
];

/** Expected index of coincidence for English (monoalphabetic / plaintext). */
export const ENGLISH_IC = 0.0667;
/** Index of coincidence for uniformly random letters. */
export const RANDOM_IC = 1 / 26;

const A = 65; // 'A'

function isUpper(code: number): boolean {
  return code >= 65 && code <= 90;
}
function isLower(code: number): boolean {
  return code >= 97 && code <= 122;
}

/** Shift every letter forward by `shift` (0–25), preserving case and non-letters. */
export function caesarShift(text: string, shift: number): string {
  const s = ((shift % 26) + 26) % 26;
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (isUpper(code)) out += String.fromCharCode(((code - A + s) % 26) + A);
    else if (isLower(code)) out += String.fromCharCode(((code - 97 + s) % 26) + 97);
    else out += text[i];
  }
  return out;
}

/** Count letters A–Z (case-insensitive); index 0 = A. */
export function letterCounts(text: string): number[] {
  const counts = new Array(26).fill(0);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (isUpper(code)) counts[code - A] += 1;
    else if (isLower(code)) counts[code - 97] += 1;
  }
  return counts;
}

/** Letter frequencies as percentages (sum ~100 over letters present). */
export function letterFrequencies(text: string): number[] {
  const counts = letterCounts(text);
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  return counts.map((c) => (c / total) * 100);
}

/** Chi-squared distance of a text's letter distribution from English. Lower is more English-like. */
export function chiSquared(text: string): number {
  const counts = letterCounts(text);
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return Infinity;
  let sum = 0;
  for (let i = 0; i < 26; i++) {
    const expected = (ENGLISH_FREQ[i] ?? 0) * 0.01 * total;
    const diff = (counts[i] ?? 0) - expected;
    sum += expected > 0 ? (diff * diff) / expected : 0;
  }
  return sum;
}

export interface CaesarCandidate {
  /** The decryption shift applied to the ciphertext. */
  shift: number;
  text: string;
  /** Chi-squared vs English; lower is better. */
  score: number;
}

/** Try all 26 decryption shifts and rank them by how English-like the result is. */
export function breakCaesar(cipher: string): { best: CaesarCandidate; candidates: CaesarCandidate[] } {
  const candidates: CaesarCandidate[] = [];
  for (let shift = 0; shift < 26; shift++) {
    const text = caesarShift(cipher, shift);
    candidates.push({ shift, text, score: chiSquared(text) });
  }
  const sorted = [...candidates].sort((a, b) => a.score - b.score);
  return { best: sorted[0]!, candidates };
}

// --- Vigenere --------------------------------------------------------------

/** Encrypt with a repeating alphabetic key (letters only are shifted). */
export function vigenereEncrypt(text: string, key: string): string {
  return vigenereApply(text, key, 1);
}

/** Decrypt with a repeating alphabetic key. */
export function vigenereDecrypt(text: string, key: string): string {
  return vigenereApply(text, key, -1);
}

function vigenereApply(text: string, key: string, dir: 1 | -1): string {
  const k = key.toUpperCase().replace(/[^A-Z]/g, '');
  if (k.length === 0) return text;
  let out = '';
  let j = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const shift = (k.charCodeAt(j % k.length) - A) * dir;
    if (isUpper(code)) {
      out += String.fromCharCode(((((code - A + shift) % 26) + 26) % 26) + A);
      j++;
    } else if (isLower(code)) {
      out += String.fromCharCode((((((code - 97 + shift) % 26) + 26) % 26)) + 97);
      j++;
    } else {
      out += text[i];
    }
  }
  return out;
}

/** The letters-only uppercase stream of a text (what the statistics run on). */
function lettersOnly(text: string): string {
  return text.toUpperCase().replace(/[^A-Z]/g, '');
}

/** Index of coincidence: the chance two random letters of the text are equal. */
export function indexOfCoincidence(text: string): number {
  const s = lettersOnly(text);
  const counts = letterCounts(s);
  const n = s.length;
  if (n < 2) return 0;
  let sum = 0;
  for (const c of counts) sum += c * (c - 1);
  return sum / (n * (n - 1));
}

/** Split the letter stream into `len` columns (every len-th letter). */
function columns(text: string, len: number): string[] {
  const s = lettersOnly(text);
  const cols: string[] = Array.from({ length: len }, () => '');
  for (let i = 0; i < s.length; i++) {
    const idx = i % len;
    cols[idx] = (cols[idx] ?? '') + (s[i] ?? '');
  }
  return cols;
}

export interface KeyLengthScore {
  length: number;
  /** Average index of coincidence across the columns for this length. */
  ic: number;
}

/** Average column IC for each candidate key length — the real one spikes toward English. */
export function keyLengthScores(cipher: string, maxLen = 12): KeyLengthScore[] {
  const scores: KeyLengthScore[] = [];
  for (let length = 1; length <= maxLen; length++) {
    const cols = columns(cipher, length);
    const avg = cols.reduce((a, c) => a + indexOfCoincidence(c), 0) / cols.length;
    scores.push({ length, ic: avg });
  }
  return scores;
}

/** Pick the key length whose average column IC is closest to English. */
export function guessKeyLength(cipher: string, maxLen = 12): number {
  const scores = keyLengthScores(cipher, maxLen);
  let best = scores[0]!;
  for (const s of scores) {
    if (Math.abs(s.ic - ENGLISH_IC) < Math.abs(best.ic - ENGLISH_IC)) best = s;
  }
  return best.length;
}

/** Recover the key for a known length: solve each column as a Caesar shift. */
export function recoverKey(cipher: string, keyLength: number): string {
  const cols = columns(cipher, keyLength);
  let key = '';
  for (const col of cols) {
    // The key letter is the shift that best de-shifts this column to English.
    const best = breakCaesar(col).best;
    // Decryption shift d means key letter = (26 - d) % 26.
    key += String.fromCharCode(((26 - best.shift) % 26) + A);
  }
  return key;
}

export interface VigenereSolution {
  keyLength: number;
  key: string;
  plaintext: string;
}

/** Full automated attack: find the key length, recover the key, decrypt. */
export function solveVigenere(cipher: string, maxLen = 12): VigenereSolution {
  const keyLength = guessKeyLength(cipher, maxLen);
  const key = recoverKey(cipher, keyLength);
  return { keyLength, key, plaintext: vigenereDecrypt(cipher, key) };
}

// --- The lab's two provided messages (fictional, with flags) ---------------

export const CAESAR_KEY = 7;
export const CAESAR_PLAINTEXT =
  'THE CAESAR CIPHER SHIFTS EVERY LETTER BY THE SAME AMOUNT SO IT KEEPS THE LETTER FREQUENCIES OF THE MESSAGE WHICH IS WHY TRYING ALL TWENTY SIX SHIFTS BREAKS IT IN AN INSTANT. FLAG CTF{ET_TU_BRUTE}';
export const CAESAR_CIPHERTEXT = caesarShift(CAESAR_PLAINTEXT, CAESAR_KEY);
export const CAESAR_FLAG = 'CTF{ET_TU_BRUTE}';

export const VIGENERE_KEY = 'SECRET';
export const VIGENERE_PLAINTEXT =
  'THE VIGENERE CIPHER WAS ONCE CALLED THE INDECIPHERABLE CIPHER BECAUSE A REPEATING KEYWORD HIDES THE LETTER FREQUENCIES THAT GIVE A SIMPLE SUBSTITUTION AWAY. BUT THE KEY REPEATS, AND THAT REPETITION IS ITS UNDOING. MEASURE THE INDEX OF COINCIDENCE FOR EACH CANDIDATE KEY LENGTH AND THE TRUE LENGTH STANDS OUT. SPLIT THE TEXT INTO THAT MANY COLUMNS, SOLVE EACH COLUMN AS AN ORDINARY CAESAR SHIFT WITH FREQUENCY ANALYSIS, AND THE KEYWORD FALLS OUT ONE LETTER AT A TIME. FLAG CTF{INDEX_OF_COINCIDENCE}.';
export const VIGENERE_CIPHERTEXT = vigenereEncrypt(VIGENERE_PLAINTEXT, VIGENERE_KEY);
export const VIGENERE_FLAG = 'CTF{INDEX_OF_COINCIDENCE}';
