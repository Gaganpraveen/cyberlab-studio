/**
 * A deterministic model of reconnaissance and attack-surface reduction for one
 * fictional organization. Everything is a static fixture under the reserved
 * `example.test` domain and reserved IP ranges (TEST-NET-3 203.0.113.0/24 for
 * internet-facing, RFC 1918 10.0.0.0/8 for internal). Nothing is scanned,
 * resolved, or connected to — the "recon" is reading fixtures, and the
 * "hardening" is toggling flags in this model.
 *
 * The arc: open-source intelligence (OSINT) reveals the organization's hosts and
 * services (its footprint); the attack surface is the sum of what is exposed to
 * the internet; the defender shrinks it by moving internal services off the
 * internet, closing risky ports, and stripping leaky metadata.
 */

export type Risk = 'low' | 'medium' | 'high';

export interface PortExposure {
  port: number;
  service: string;
  risk: Risk;
}

export interface Host {
  id: string;
  host: string;
  label: string;
  /** What the host is MEANT to be. Internal hosts exposed to the internet are a bug. */
  intent: 'public' | 'internal';
  ip: string;
  ports: PortExposure[];
  /** Whether this host is currently reachable from the internet. */
  exposedToInternet: boolean;
  /** Holds sensitive data (an admin panel, a database). */
  sensitive?: boolean;
  /** How a recon analyst would discover it. */
  osintHint: string;
}

/** The fictional organization. */
export const ORG_NAME = 'Northwind College';
export const ORG_DOMAIN = 'northwind.example.test';

export const RISK_POINTS: Record<Risk, number> = { low: 1, medium: 3, high: 6 };
const EXPOSED_HOST_BASE = 2;
const INTERNAL_EXPOSED_PENALTY = 10;
const METADATA_LEAK_POINTS = 4;

/** The leaked internal admin panel — found in certificate-transparency logs. */
export const LEAKED_SUBDOMAIN_FLAG = 'CTF{dev_admin_leaked_in_ct_logs}';

function h(host: Omit<Host, 'host'> & { host?: string }): Host {
  return { ...host, host: host.host ?? `${host.id}.${ORG_DOMAIN}` };
}

export const HOSTS: Host[] = [
  h({
    id: 'www',
    label: 'Public website',
    intent: 'public',
    ip: '203.0.113.10',
    exposedToInternet: true,
    ports: [
      { port: 80, service: 'HTTP', risk: 'low' },
      { port: 443, service: 'HTTPS', risk: 'low' },
    ],
    osintHint: 'Appears in DNS enumeration and search results.',
  }),
  h({
    id: 'mail',
    label: 'Mail gateway',
    intent: 'public',
    ip: '203.0.113.11',
    exposedToInternet: true,
    ports: [
      { port: 25, service: 'SMTP', risk: 'medium' },
      { port: 443, service: 'HTTPS (webmail)', risk: 'low' },
    ],
    osintHint: 'MX record in DNS; named in the mail headers of newsletters.',
  }),
  h({
    id: 'vpn',
    label: 'VPN gateway',
    intent: 'public',
    ip: '203.0.113.12',
    exposedToInternet: true,
    ports: [{ port: 443, service: 'HTTPS (VPN)', risk: 'low' }],
    osintHint: 'A VPN concentrator is meant to be reachable; it appears in DNS.',
  }),
  h({
    id: 'dev-admin',
    label: 'Internal admin panel',
    intent: 'internal',
    ip: '10.0.5.20',
    exposedToInternet: true,
    sensitive: true,
    ports: [
      { port: 443, service: 'HTTPS (admin)', risk: 'low' },
      { port: 22, service: 'SSH', risk: 'high' },
      { port: 3389, service: 'RDP', risk: 'high' },
    ],
    osintHint: 'Leaked in a certificate-transparency log entry — never meant to be public.',
  }),
  h({
    id: 'staging',
    label: 'Staging app server',
    intent: 'internal',
    ip: '10.0.5.21',
    exposedToInternet: true,
    ports: [
      { port: 80, service: 'HTTP', risk: 'low' },
      { port: 8080, service: 'HTTP (debug)', risk: 'medium' },
    ],
    osintHint: 'Named in a public job posting describing the deployment pipeline.',
  }),
  h({
    id: 'db',
    label: 'Student records database',
    intent: 'internal',
    ip: '10.0.9.5',
    exposedToInternet: true,
    sensitive: true,
    ports: [{ port: 3306, service: 'MySQL', risk: 'high' }],
    osintHint: 'Connection string committed to a public code repository.',
  }),
];

export interface OsintCard {
  id: string;
  title: string;
  source: string;
  summary: string;
  /** Host ids this piece of intelligence reveals. */
  reveals: string[];
  /** Whether this card also exposes verbose server/document metadata. */
  metadataLeak?: boolean;
}

export const OSINT_CARDS: OsintCard[] = [
  {
    id: 'dns',
    title: 'DNS enumeration',
    source: 'Public DNS records',
    summary: 'Standard records for the public site, mail, and VPN gateway.',
    reveals: ['www', 'mail', 'vpn'],
  },
  {
    id: 'ct-log',
    title: 'Certificate transparency log',
    source: 'crt.sh-style public CT log',
    summary: 'A TLS certificate was issued for an admin hostname that is not in public DNS.',
    reveals: ['dev-admin'],
  },
  {
    id: 'job-post',
    title: 'Job posting',
    source: 'Careers page',
    summary: 'A DevOps posting names the staging server and its toolchain.',
    reveals: ['staging'],
  },
  {
    id: 'code-leak',
    title: 'Public code repository',
    source: 'Open-source mirror',
    summary: 'A committed config file contains a database connection string.',
    reveals: ['db'],
  },
  {
    id: 'doc-meta',
    title: 'Cached document metadata',
    source: 'Indexed PDF',
    summary: 'Author, internal path, and software version are embedded in document metadata.',
    reveals: [],
    metadataLeak: true,
  },
];

export interface SurfaceState {
  /** exposedToInternet, keyed by host id (defaults to each host's own flag). */
  exposed: Record<string, boolean>;
  /** Open ports, keyed by host id (defaults to each host's full port list). */
  openPorts: Record<string, number[]>;
  /** Whether verbose metadata is still being leaked. */
  metadataLeaked: boolean;
}

/** The starting state: everything the fixtures describe is exposed. */
export function initialState(): SurfaceState {
  return {
    exposed: Object.fromEntries(HOSTS.map((x) => [x.id, x.exposedToInternet])),
    openPorts: Object.fromEntries(HOSTS.map((x) => [x.id, x.ports.map((p) => p.port)])),
    metadataLeaked: true,
  };
}

function hostById(id: string): Host | undefined {
  return HOSTS.find((x) => x.id === id);
}

/** The attack-surface score: higher is worse. Only internet-exposed hosts count. */
export function attackSurfaceScore(state: SurfaceState): number {
  let score = 0;
  for (const host of HOSTS) {
    if (!state.exposed[host.id]) continue;
    score += EXPOSED_HOST_BASE;
    if (host.intent === 'internal') score += INTERNAL_EXPOSED_PENALTY;
    const open = state.openPorts[host.id] ?? [];
    for (const port of host.ports) {
      if (open.includes(port.port)) score += RISK_POINTS[port.risk];
    }
  }
  if (state.metadataLeaked) score += METADATA_LEAK_POINTS;
  return score;
}

export type HardeningAction =
  | { kind: 'make-internal'; hostId: string }
  | { kind: 'close-port'; hostId: string; port: number }
  | { kind: 'strip-metadata' };

/** Apply one hardening action, returning a new state (pure). */
export function applyHardening(state: SurfaceState, action: HardeningAction): SurfaceState {
  const next: SurfaceState = {
    exposed: { ...state.exposed },
    openPorts: { ...state.openPorts },
    metadataLeaked: state.metadataLeaked,
  };
  if (action.kind === 'make-internal') {
    next.exposed[action.hostId] = false;
  } else if (action.kind === 'close-port') {
    next.openPorts[action.hostId] = (state.openPorts[action.hostId] ?? []).filter(
      (p) => p !== action.port,
    );
  } else {
    next.metadataLeaked = false;
  }
  return next;
}

/**
 * Minimal exposure: no internal host is reachable from the internet, no exposed
 * host still has a high-risk port open, and metadata is no longer leaking.
 */
export function isMinimalExposure(state: SurfaceState): boolean {
  if (state.metadataLeaked) return false;
  for (const host of HOSTS) {
    if (!state.exposed[host.id]) continue;
    if (host.intent === 'internal') return false;
    const open = state.openPorts[host.id] ?? [];
    const highOpen = host.ports.some((p) => p.risk === 'high' && open.includes(p.port));
    if (highOpen) return false;
  }
  return true;
}

/** Which exposed hosts are internal-intent (the misconfiguration to fix). */
export function exposedInternalHosts(state: SurfaceState): Host[] {
  return HOSTS.filter((x) => state.exposed[x.id] && x.intent === 'internal');
}

/** Did this set of opened OSINT cards reveal every host (a complete footprint)? */
export function footprintComplete(openedCardIds: string[]): boolean {
  const revealed = new Set<string>();
  for (const card of OSINT_CARDS) {
    if (openedCardIds.includes(card.id)) card.reveals.forEach((r) => revealed.add(r));
  }
  return HOSTS.every((x) => revealed.has(x.id));
}

/** The Lockheed Martin Cyber Kill Chain, in order. Recon is phase 1. */
export const KILL_CHAIN = [
  'Reconnaissance',
  'Weaponization',
  'Delivery',
  'Exploitation',
  'Installation',
  'Command and Control',
  'Actions on Objectives',
] as const;

export { hostById };
