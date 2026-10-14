/**
 * Real certificate validation with the Web Crypto API, over a fictional CA and
 * fictional certificates. Keys are generated in the browser tab (ECDSA P-256)
 * and signatures are really produced and verified — but no TLS connection is
 * ever made and no real host or certificate is involved. The learner sees why a
 * client rejects expired, self-signed, hostname-mismatched, and untrusted
 * certificates, and how pinning and HSTS add protection.
 */

/** A fixed "current time" so certificate expiry is deterministic. 2026-06-01. */
export const REFERENCE_NOW = Date.UTC(2026, 5, 1);
export const EXPECTED_HOST = 'shop.example.test';

const ALG = { name: 'ECDSA', namedCurve: 'P-256' } as const;
const SIGN_ALG = { name: 'ECDSA', hash: 'SHA-256' } as const;
const encoder = new TextEncoder();

export interface Ca {
  name: string;
  privateKey: CryptoKey;
  publicKey: CryptoKey;
}

export interface Cert {
  subject: string;
  issuer: string;
  notBefore: number;
  notAfter: number;
  /** SHA-256 (hex) of the leaf public key — used for pinning. */
  fingerprint: string;
  /** The to-be-signed content (what the signature covers). */
  tbs: string;
  signature: ArrayBuffer;
  /** Display only: the name of the key that actually signed this cert. */
  signedBy: string;
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function spkiFingerprint(publicKey: CryptoKey): Promise<string> {
  const spki = await crypto.subtle.exportKey('spki', publicKey);
  const digest = await crypto.subtle.digest('SHA-256', spki);
  return toHex(digest);
}

async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(ALG, true, ['sign', 'verify']);
}

/** Create a fictional certificate authority with its own key pair. */
export async function createCa(name: string): Promise<Ca> {
  const pair = await generateKeyPair();
  return { name, privateKey: pair.privateKey, publicKey: pair.publicKey };
}

export interface IssueOptions {
  subject: string;
  notBefore: number;
  notAfter: number;
  /** Sign with this CA. Omit (with selfSigned) to self-sign with the leaf key. */
  ca?: Ca;
  selfSigned?: boolean;
}

/** Issue a leaf certificate: generate a leaf key pair and sign the TBS. */
export async function issueCert(opts: IssueOptions): Promise<Cert> {
  const leaf = await generateKeyPair();
  const fingerprint = await spkiFingerprint(leaf.publicKey);
  const issuer = opts.selfSigned || !opts.ca ? opts.subject : opts.ca.name;
  const tbs = [opts.subject, issuer, opts.notBefore, opts.notAfter, fingerprint].join('|');
  const signerKey = opts.selfSigned || !opts.ca ? leaf.privateKey : opts.ca.privateKey;
  const signature = await crypto.subtle.sign(SIGN_ALG, signerKey, encoder.encode(tbs));
  return {
    subject: opts.subject,
    issuer,
    notBefore: opts.notBefore,
    notAfter: opts.notAfter,
    fingerprint,
    tbs,
    signature,
    signedBy: opts.selfSigned || !opts.ca ? `${opts.subject} (self)` : opts.ca.name,
  };
}

export interface Policy {
  /** The CA the client trusts. A signature it cannot verify means "untrusted". */
  trustedCaPublicKey: CryptoKey;
  /** The hostname the client intended to reach. */
  hostname: string;
  /** The client's current time. */
  now: number;
  /** If set, only a cert with this leaf fingerprint is accepted (pinning). */
  pinnedFingerprint?: string;
}

export interface VerifyReport {
  signatureValid: boolean;
  notExpired: boolean;
  hostnameMatches: boolean;
  pinOk: boolean;
  ok: boolean;
  reasons: string[];
}

function hostnameMatches(certSubject: string, hostname: string): boolean {
  if (certSubject === hostname) return true;
  if (certSubject.startsWith('*.')) {
    const base = certSubject.slice(2);
    const idx = hostname.indexOf('.');
    return idx > 0 && hostname.slice(idx + 1) === base;
  }
  return false;
}

/** Validate a presented certificate against a client trust policy. */
export async function verifyCert(cert: Cert, policy: Policy): Promise<VerifyReport> {
  const signatureValid = await crypto.subtle.verify(
    SIGN_ALG,
    policy.trustedCaPublicKey,
    cert.signature,
    encoder.encode(cert.tbs),
  );
  const notExpired = policy.now >= cert.notBefore && policy.now <= cert.notAfter;
  const matches = hostnameMatches(cert.subject, policy.hostname);
  const pinOk = policy.pinnedFingerprint ? cert.fingerprint === policy.pinnedFingerprint : true;

  const reasons: string[] = [];
  if (!signatureValid) reasons.push('Signature not from a trusted CA (untrusted or self-signed).');
  if (!notExpired) reasons.push('Certificate is outside its validity period (expired or not yet valid).');
  if (!matches) reasons.push(`Certificate subject (${cert.subject}) does not match ${policy.hostname}.`);
  if (!pinOk) reasons.push('Certificate does not match the pinned key.');

  return {
    signatureValid,
    notExpired,
    hostnameMatches: matches,
    pinOk,
    ok: signatureValid && notExpired && matches && pinOk,
    reasons,
  };
}

export const CERT_PIN_FLAG = 'CTF{certificate_pinned}';

export type ScenarioKind = 'valid' | 'expired' | 'self-signed' | 'hostname-mismatch';

export interface ScenarioSpec {
  kind: ScenarioKind;
  title: string;
  subject: string;
  notBefore: number;
  notAfter: number;
  selfSigned?: boolean;
  description: string;
}

const YEAR = 365 * 24 * 60 * 60 * 1000;

/** The four connection scenarios the client will be asked to validate. */
export const SCENARIOS: ScenarioSpec[] = [
  {
    kind: 'valid',
    title: 'Valid certificate',
    subject: EXPECTED_HOST,
    notBefore: REFERENCE_NOW - YEAR,
    notAfter: REFERENCE_NOW + YEAR,
    description: 'Issued by the trusted CA for the right host, within its validity period.',
  },
  {
    kind: 'expired',
    title: 'Expired certificate',
    subject: EXPECTED_HOST,
    notBefore: REFERENCE_NOW - 2 * YEAR,
    notAfter: REFERENCE_NOW - YEAR,
    description: 'Issued by the trusted CA, but its validity period ended before now.',
  },
  {
    kind: 'hostname-mismatch',
    title: 'Hostname mismatch',
    subject: 'other.example.test',
    notBefore: REFERENCE_NOW - YEAR,
    notAfter: REFERENCE_NOW + YEAR,
    description: 'A valid certificate, but issued for a different hostname than requested.',
  },
  {
    kind: 'self-signed',
    title: 'Self-signed certificate',
    subject: EXPECTED_HOST,
    notBefore: REFERENCE_NOW - YEAR,
    notAfter: REFERENCE_NOW + YEAR,
    selfSigned: true,
    description: 'Signed by its own key, not by any CA the client trusts.',
  },
];
