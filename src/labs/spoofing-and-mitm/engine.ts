/**
 * A deterministic model of a small local network, ARP, and DNS resolution, used
 * to teach on-path (man-in-the-middle) attacks and their defenses. Everything is
 * a fixture: reserved documentation addresses (192.0.2.0/24, TEST-NET-1) and
 * invented MACs. No packets are sent, nothing is sniffed, and no name is ever
 * really resolved — the "attack" flips flags in this model.
 *
 * The arc: ARP has no authentication, so an attacker can claim the gateway's IP
 * and sit on the path; DNS caches can be poisoned with a forged record. Dynamic
 * ARP inspection (or static entries) defeats the first; DNSSEC defeats the
 * second.
 */

export type Role = 'victim' | 'gateway' | 'server' | 'attacker';

export interface Device {
  id: string;
  name: string;
  ip: string;
  mac: string;
  role: Role;
}

export const DEVICES: Device[] = [
  {
    id: 'alice',
    name: 'Alice (laptop)',
    ip: '192.0.2.10',
    mac: 'aa:aa:aa:00:00:10',
    role: 'victim',
  },
  {
    id: 'gateway',
    name: 'Router / gateway',
    ip: '192.0.2.1',
    // Locally administered, unicast MAC. (A valid unicast address must have the
    // least-significant bit of the first octet clear; `bb` would be multicast.)
    mac: '02:00:00:00:00:01',
    role: 'gateway',
  },
  { id: 'server', name: 'File server', ip: '192.0.2.20', mac: 'cc:cc:cc:00:00:20', role: 'server' },
  {
    id: 'eve',
    name: 'Eve (attacker)',
    ip: '192.0.2.66',
    mac: 'ee:ee:ee:00:00:66',
    role: 'attacker',
  },
];

export function deviceByRole(role: Role): Device {
  const d = DEVICES.find((x) => x.role === role);
  if (!d) throw new Error(`no device with role ${role}`);
  return d;
}

export const GATEWAY_IP = deviceByRole('gateway').ip;
export const ATTACKER_MAC = deviceByRole('attacker').mac;

export const ONPATH_FLAG = 'CTF{on_path_via_arp_spoof}';
export const DNS_POISON_FLAG = 'CTF{resolver_cache_poisoned}';

// --- ARP -------------------------------------------------------------------

export interface ArpState {
  /** ip -> mac, as the victim currently believes it. */
  table: Record<string, string>;
  /** Dynamic ARP Inspection / static entries: rejects unsolicited rebinding. */
  dai: boolean;
}

/** The honest ARP table the victim starts with. */
export function initialArp(): ArpState {
  const table: Record<string, string> = {};
  // A host's own ARP cache lists the *other* hosts it has resolved, not itself.
  // This table is the victim's view, so omit the victim's own entry.
  for (const d of DEVICES) {
    if (d.role === 'victim') continue;
    table[d.ip] = d.mac;
  }
  return { table, dai: false };
}

export interface SpoofResult {
  state: ArpState;
  succeeded: boolean;
}

/**
 * The attacker sends a gratuitous ARP claiming the gateway's IP. Without
 * inspection the victim rebinds the gateway IP to the attacker's MAC and the
 * attacker is now on the path. With DAI, the unsolicited reply is rejected.
 */
export function spoofArp(state: ArpState): SpoofResult {
  if (state.dai) {
    // Inspection drops the forged reply and the trusted binding re-asserts, so a
    // binding poisoned earlier is also corrected the next time the attack is run.
    const table = { ...state.table, [GATEWAY_IP]: deviceByRole('gateway').mac };
    return { state: { ...state, table }, succeeded: false };
  }
  const table = { ...state.table, [GATEWAY_IP]: ATTACKER_MAC };
  return { state: { ...state, table }, succeeded: true };
}

/** Is the attacker on the path — i.e. does the gateway IP resolve to its MAC? */
export function isOnPath(state: ArpState): boolean {
  return state.table[GATEWAY_IP] === ATTACKER_MAC;
}

/**
 * Enable dynamic ARP inspection. This validates replies going forward; it does
 * not retroactively scrub a cache that is already poisoned. An existing forged
 * binding is dropped only when it is next validated (see `spoofArp` under DAI).
 */
export function enableDai(state: ArpState): ArpState {
  return { ...state, dai: true };
}

/** A MAC that is claimed by more than one IP — the tell-tale of ARP spoofing. */
export function duplicateMacs(state: ArpState): string[] {
  const byMac = new Map<string, string[]>();
  for (const [ip, mac] of Object.entries(state.table)) {
    byMac.set(mac, [...(byMac.get(mac) ?? []), ip]);
  }
  return [...byMac.entries()].filter(([, ips]) => ips.length > 1).map(([mac]) => mac);
}

// --- DNS -------------------------------------------------------------------

export const PROTECTED_HOST = 'bank.example.test';
export const HONEST_IP = '192.0.2.200';

export interface DnsState {
  /** host -> ip, the resolver cache. */
  cache: Record<string, string>;
  /** DNSSEC validation: a forged record fails its signature check and is dropped. */
  dnssec: boolean;
}

export function initialDns(): DnsState {
  return { cache: { [PROTECTED_HOST]: HONEST_IP }, dnssec: false };
}

export interface PoisonResult {
  state: DnsState;
  succeeded: boolean;
}

/**
 * Inject a forged record for a host. Without DNSSEC the resolver caches it;
 * with DNSSEC the record fails validation and the cache is unchanged.
 */
export function poisonDns(state: DnsState, host: string, ip: string): PoisonResult {
  if (state.dnssec) {
    // The forged record fails signature validation and is dropped; the signed
    // honest record stands, which also corrects a record poisoned earlier.
    return {
      state: { ...state, cache: { ...state.cache, [PROTECTED_HOST]: HONEST_IP } },
      succeeded: false,
    };
  }
  return { state: { ...state, cache: { ...state.cache, [host]: ip } }, succeeded: true };
}

export function resolve(state: DnsState, host: string): string | undefined {
  return state.cache[host];
}

/**
 * Enable DNSSEC validation. Like inspection, this validates answers going
 * forward; it does not scrub a record that is already poisoned. The forgery is
 * dropped only when the name is resolved (and re-validated) again.
 */
export function enableDnssec(state: DnsState): DnsState {
  return { ...state, dnssec: true };
}
