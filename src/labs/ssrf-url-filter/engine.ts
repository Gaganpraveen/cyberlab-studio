/**
 * A deterministic model of a server-side URL fetcher (an image proxy or webhook
 * sender) and the private network behind it. No real request is ever made — a
 * fixed DNS map and a fixed set of fake services stand in — so the learner can
 * perform server-side request forgery (SSRF) and then watch each control block
 * it.
 *
 * SSRF tricks a server into fetching an attacker-chosen URL, reaching internal
 * resources the attacker cannot reach directly: cloud metadata, loopback admin
 * panels, private services. The key lesson is that blocking by hostname string
 * is not enough — a benign-looking name can resolve to an internal IP — so the
 * fix resolves the host and refuses internal addresses (and/or allowlists
 * destinations).
 */

export const METADATA_FLAG = 'CTF{metadata_creds_stolen}';
export const ADMIN_FLAG = 'CTF{localhost_is_internal_too}';

/** Fake DNS. A host that is already an IP literal resolves to itself. */
const DNS: Record<string, string> = {
  // 192.0.2.0/24 is TEST-NET-1 (RFC 5737), reserved for documentation. It stands in
  // for a real public host and is treated as external (not internal) by isInternalIp.
  'example.com': '192.0.2.10',
  'api.example.com': '192.0.2.11',
  'app.internal': '10.0.0.5',
  localhost: '127.0.0.1',
  // Looks external, resolves internal — defeats hostname-string blocklists.
  'metadata.evil.example': '169.254.169.254',
};

interface Service {
  body: string;
  flag?: string;
}

/** Fake services keyed by IP. */
const SERVICES: Record<string, Service> = {
  '192.0.2.10': { body: '<!doctype html><title>Example Domain</title>' },
  '192.0.2.11': { body: '{"status":"ok","version":"2"}' },
  '169.254.169.254': {
    body:
      'iam/security-credentials/web-role\nAccessKeyId: AKIAEXAMPLE\nSecretAccessKey: ' +
      METADATA_FLAG,
    flag: METADATA_FLAG,
  },
  '127.0.0.1': {
    body: 'Internal admin panel — delete users, rotate keys.\n' + ADMIN_FLAG,
    flag: ADMIN_FLAG,
  },
  '10.0.0.5': { body: 'Internal billing service (no public route).' },
};

export const ALLOWED_HOSTS: readonly string[] = ['example.com', 'api.example.com'];

/** True for loopback, link-local, and RFC 1918 private ranges. */
export function isInternalIp(ip: string): boolean {
  const parts = ip.split('.').map((n) => Number(n));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return false;
  const a = parts[0] ?? -1;
  const b = parts[1] ?? -1;
  if (a === 127 || a === 0) return true; // loopback / this-host
  if (a === 10) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 169 && b === 254) return true; // link-local (cloud metadata)
  return false;
}

const IP_LITERAL = /^\d{1,3}(\.\d{1,3}){3}$/;

/** Resolve a hostname to an IP via the fake DNS; an IP literal resolves to itself. */
export function resolveHost(host: string): string | undefined {
  if (IP_LITERAL.test(host)) return host;
  return DNS[host];
}

export interface FetchDefenses {
  /** Only fetch hosts on an allowlist of known destinations. */
  allowlist: boolean;
  /** Resolve the host and refuse internal (private/loopback/link-local) IPs. */
  blockInternal: boolean;
}

export const FETCH_NONE: FetchDefenses = { allowlist: false, blockInternal: false };

export interface FetchResult {
  blocked: boolean;
  status: number;
  host: string;
  resolvedIp?: string;
  internal: boolean;
  body?: string;
  reason?: string;
  flag?: string;
}

/** Model the server fetching a user-supplied URL under the chosen defenses. */
export function fetchUrl(rawUrl: string, defenses: FetchDefenses): FetchResult {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { blocked: true, status: 0, host: '', internal: false, reason: 'Invalid URL.' };
  }
  const host = url.hostname;

  if (defenses.allowlist && !ALLOWED_HOSTS.includes(host)) {
    return {
      blocked: true,
      status: 0,
      host,
      internal: false,
      reason: `Host "${host}" is not in the destination allowlist.`,
    };
  }

  const resolvedIp = resolveHost(host);
  if (!resolvedIp) {
    return {
      blocked: false,
      status: 0,
      host,
      internal: false,
      reason: `Could not resolve ${host}.`,
    };
  }
  const internal = isInternalIp(resolvedIp);

  if (defenses.blockInternal && internal) {
    return {
      blocked: true,
      status: 0,
      host,
      resolvedIp,
      internal: true,
      reason: `"${host}" resolves to internal address ${resolvedIp} — request refused.`,
    };
  }

  const svc = SERVICES[resolvedIp];
  if (!svc) {
    return {
      blocked: false,
      status: 404,
      host,
      resolvedIp,
      internal,
      reason: 'No service at that address.',
    };
  }
  return {
    blocked: false,
    status: 200,
    host,
    resolvedIp,
    internal,
    body: svc.body,
    flag: svc.flag,
  };
}
