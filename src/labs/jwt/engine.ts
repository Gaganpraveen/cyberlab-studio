/**
 * A small, honest JWT (JSON Web Token) engine for the lab. It really signs and
 * verifies HS256 tokens with the browser's Web Crypto, so students see genuine
 * signatures — but every token, user, and secret here is fictional and lives
 * only in the current tab.
 *
 * The lab teaches two classic verification mistakes:
 *   1. Trusting the token's own `alg` header (so `alg: "none"` is accepted).
 *   2. Signing with a weak, guessable secret.
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

// --- base64url (what JWTs use) --------------------------------------------

export function bytesToB64url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function b64urlToBytes(input: string): Uint8Array {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((input.length + 3) % 4);
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

function encodeSegment(value: unknown): string {
  return bytesToB64url(enc.encode(JSON.stringify(value)));
}

function decodeSegment<T>(segment: string): T {
  return JSON.parse(dec.decode(b64urlToBytes(segment))) as T;
}

export interface JwtHeader {
  alg: string;
  typ?: string;
}

export interface JwtPayload {
  sub?: string;
  role?: string;
  name?: string;
  [claim: string]: unknown;
}

export interface DecodedJwt {
  header: JwtHeader;
  payload: JwtPayload;
  signature: string;
  signingInput: string;
  valid: boolean;
  error?: string;
}

/** Decode a token WITHOUT verifying it — exactly what an attacker can do too. */
export function decodeJwt(token: string): DecodedJwt {
  const parts = token.split('.');
  const base = { header: { alg: '' }, payload: {}, signature: '', signingInput: '', valid: false };
  if (parts.length !== 3) {
    return { ...base, error: 'A JWT must have three dot-separated parts.' };
  }
  const [h, p, signature] = parts;
  try {
    return {
      header: decodeSegment<JwtHeader>(h!),
      payload: decodeSegment<JwtPayload>(p!),
      signature: signature!,
      signingInput: `${h}.${p}`,
      valid: true,
    };
  } catch {
    return { ...base, error: 'Header or payload is not valid base64url JSON.' };
  }
}

// --- HS256 signing with Web Crypto ----------------------------------------

async function hmacSha256(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return bytesToB64url(new Uint8Array(sig));
}

/** Create a properly signed HS256 token. */
export async function signJwt(payload: JwtPayload, secret: string): Promise<string> {
  const signingInput = `${encodeSegment({ alg: 'HS256', typ: 'JWT' })}.${encodeSegment(payload)}`;
  const signature = await hmacSha256(secret, signingInput);
  return `${signingInput}.${signature}`;
}

/** Forge an UNSIGNED token (alg: none) — the signature slot is left empty. */
export function forgeUnsignedJwt(payload: JwtPayload): string {
  return `${encodeSegment({ alg: 'none', typ: 'JWT' })}.${encodeSegment(payload)}.`;
}

/** Tamper with a signed token's payload but keep its old signature. */
export function tamperPayload(token: string, patch: JwtPayload): string {
  const { header, payload, signature } = decodeJwt(token);
  const signingInput = `${encodeSegment(header)}.${encodeSegment({ ...payload, ...patch })}`;
  return `${signingInput}.${signature}`;
}

export interface VerifyResult {
  valid: boolean;
  payload?: JwtPayload;
  reason?: string;
}

/**
 * The VULNERABLE verifier: it trusts the token's own `alg` header. If the token
 * says `alg: none`, it skips the signature check entirely — so anyone can forge
 * one. This is the bug the lab exploits.
 */
export async function verifyVulnerable(token: string, secret: string): Promise<VerifyResult> {
  const decoded = decodeJwt(token);
  if (!decoded.valid) return { valid: false, reason: decoded.error };
  if (decoded.header.alg === 'none') {
    return { valid: true, payload: decoded.payload };
  }
  const expected = await hmacSha256(secret, decoded.signingInput);
  if (expected !== decoded.signature) return { valid: false, reason: 'Bad signature.' };
  return { valid: true, payload: decoded.payload };
}

/**
 * The STRICT verifier: it pins the algorithm to HS256, rejecting `none` and any
 * other, and always requires a matching signature. This is the fix.
 */
export async function verifyStrict(token: string, secret: string): Promise<VerifyResult> {
  const decoded = decodeJwt(token);
  if (!decoded.valid) return { valid: false, reason: decoded.error };
  if (decoded.header.alg !== 'HS256') {
    return {
      valid: false,
      reason: `Rejected algorithm "${decoded.header.alg}"; only HS256 is allowed.`,
    };
  }
  if (!decoded.signature) return { valid: false, reason: 'Missing signature.' };
  const expected = await hmacSha256(secret, decoded.signingInput);
  if (expected !== decoded.signature) return { valid: false, reason: 'Bad signature.' };
  return { valid: true, payload: decoded.payload };
}

export type VerifierMode = 'vulnerable' | 'strict';

export function verify(mode: VerifierMode, token: string, secret: string): Promise<VerifyResult> {
  return mode === 'strict' ? verifyStrict(token, secret) : verifyVulnerable(token, secret);
}

// --- Weak-secret dictionary check -----------------------------------------

/** A short list of guessable secrets, the kind that should never be used. */
export const WEAK_SECRETS = [
  'secret',
  'password',
  '123456',
  'changeme',
  'admin',
  'letmein',
  'jwtsecret',
  'supersecret',
  'campus',
  'token',
];

/**
 * Try each candidate secret against an HS256 token's signature. Returns the
 * secret that reproduces the signature, or null. This is why a weak secret is
 * fatal: a correct verifier is no defense once the secret is guessed.
 */
export async function crackSecret(token: string, wordlist: string[]): Promise<string | null> {
  const decoded = decodeJwt(token);
  if (!decoded.valid || decoded.header.alg !== 'HS256') return null;
  for (const candidate of wordlist) {
    const expected = await hmacSha256(candidate, decoded.signingInput);
    if (expected === decoded.signature) return candidate;
  }
  return null;
}

// --- The lab's fictional server -------------------------------------------

/** The server's secret is deliberately weak and present in WEAK_SECRETS. */
export const SERVER_SECRET = 'changeme';

export const SESSION_PAYLOAD: JwtPayload = {
  sub: 'l.nguyen',
  name: 'Lee Nguyen',
  role: 'student',
};

export interface GradeCase {
  description: string;
  token: string;
  /** Whether a correct verifier should accept this token. */
  shouldAccept: boolean;
}

export interface GradeRow extends GradeCase {
  accepted: boolean;
  correct: boolean;
}

export interface GradeReport {
  mode: VerifierMode;
  rows: GradeRow[];
  passed: number;
  total: number;
  secure: boolean;
}

/** Build the attack battery against the lab's session token. */
export async function buildBattery(): Promise<GradeCase[]> {
  const legit = await signJwt(SESSION_PAYLOAD, SERVER_SECRET);
  return [
    { description: 'The real student session token', token: legit, shouldAccept: true },
    {
      description: 'Forged admin token with alg: none',
      token: forgeUnsignedJwt({ ...SESSION_PAYLOAD, role: 'admin' }),
      shouldAccept: false,
    },
    {
      description: 'Payload changed to admin, old signature kept',
      token: tamperPayload(legit, { role: 'admin' }),
      shouldAccept: false,
    },
    {
      description: 'HS256 token signed with the wrong secret',
      token: await signJwt({ ...SESSION_PAYLOAD, role: 'admin' }, 'not-the-secret'),
      shouldAccept: false,
    },
  ];
}

/** Run the battery against a verifier mode and grade it. */
export async function gradeVerifier(mode: VerifierMode, secret: string): Promise<GradeReport> {
  const battery = await buildBattery();
  const rows: GradeRow[] = [];
  for (const c of battery) {
    const result = await verify(mode, c.token, secret);
    const correct = c.shouldAccept === result.valid;
    rows.push({ ...c, accepted: result.valid, correct });
  }
  const passed = rows.filter((r) => r.correct).length;
  return { mode, rows, passed, total: rows.length, secure: passed === rows.length };
}
