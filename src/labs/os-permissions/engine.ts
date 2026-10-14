/**
 * A deterministic model of Unix file permissions and two privilege-escalation
 * paths that misconfigured permissions open. Nothing real is read or executed —
 * the filesystem is a fixed list and the "exploits" are pure checks on a mode —
 * so the learner can run each attack from a low-privileged account and then fix
 * the mode to close it.
 *
 * The attacker is `lowpriv`: not root, and not the owner or group of the
 * sensitive files, so only the "other" permission bits apply to them. A
 * world-writable root-run script lets them run code as root; a world-readable
 * /etc/shadow lets them read password hashes. chmod closes both.
 */

export const ATTACKER = 'lowpriv';

export const SCRIPT_FLAG = 'CTF{world_writable_root_script}';
export const SHADOW_FLAG = 'CTF{shadow_readable_by_all}';

export interface FileNode {
  path: string;
  owner: string;
  group: string;
  /** Permission mode including the special bits (e.g. 0o4755), 0–0o7777. */
  mode: number;
  note: string;
  /** This file is executed by a root cron/service. */
  rootRuns?: boolean;
  /** Mutable in the lab (the learner can chmod it). */
  mutable?: boolean;
}

export const INITIAL_FILES: FileNode[] = [
  {
    path: '/opt/backup/run.sh',
    owner: 'root',
    group: 'root',
    mode: 0o777,
    note: 'Run every night as root by cron.',
    rootRuns: true,
    mutable: true,
  },
  {
    path: '/etc/shadow',
    owner: 'root',
    group: 'shadow',
    mode: 0o644,
    note: 'Password hashes. Should never be world-readable.',
    mutable: true,
  },
  {
    path: '/usr/bin/checkpw',
    owner: 'root',
    group: 'root',
    mode: 0o4755,
    note: 'Setuid-root helper (note the s bit). Runs as root for any caller.',
  },
  {
    path: '/home/lowpriv/notes.txt',
    owner: 'lowpriv',
    group: 'lowpriv',
    mode: 0o644,
    note: 'Your own notes.',
  },
];

function triad(bits: number): string {
  return (bits & 4 ? 'r' : '-') + (bits & 2 ? 'w' : '-') + (bits & 1 ? 'x' : '-');
}

/** Render a mode like 0o4755 as a symbolic string such as -rwsr-xr-x. */
export function symbolicMode(mode: number): string {
  const special = (mode >> 9) & 7;
  let owner = triad((mode >> 6) & 7);
  let group = triad((mode >> 3) & 7);
  let other = triad(mode & 7);
  if (special & 4) owner = owner.slice(0, 2) + (owner[2] === 'x' ? 's' : 'S');
  if (special & 2) group = group.slice(0, 2) + (group[2] === 'x' ? 's' : 'S');
  if (special & 1) other = other.slice(0, 2) + (other[2] === 'x' ? 't' : 'T');
  return '-' + owner + group + other;
}

/** Render a mode as octal, dropping a leading zero special digit when unset. */
export function octalMode(mode: number): string {
  const special = (mode >> 9) & 7;
  const base = (mode & 0o777).toString(8).padStart(3, '0');
  return special ? `${special}${base}` : base;
}

/** Parse an octal string like "755" or "4755" into a mode number. */
export function parseOctal(input: string): number | null {
  if (!/^[0-7]{3,4}$/.test(input.trim())) return null;
  return parseInt(input.trim(), 8);
}

export function otherCanWrite(mode: number): boolean {
  return (mode & 0o002) !== 0;
}
export function otherCanRead(mode: number): boolean {
  return (mode & 0o004) !== 0;
}

export interface ExploitResult {
  success: boolean;
  reason: string;
  flag?: string;
  content?: string;
}

/** The world-writable root-run script: if `other` can write, the attacker runs code as root. */
export function exploitRootScript(mode: number): ExploitResult {
  if (otherCanWrite(mode)) {
    return {
      success: true,
      reason:
        'The script is world-writable, so you overwrote it with your own commands. The root cron then ran them as root.',
      flag: SCRIPT_FLAG,
    };
  }
  return {
    success: false,
    reason:
      'Permission denied: the script is no longer world-writable, so you cannot change what root runs.',
  };
}

/** /etc/shadow: if `other` can read, the attacker reads the password hashes. */
export function readShadow(mode: number): ExploitResult {
  if (otherCanRead(mode)) {
    return {
      success: true,
      reason: 'The file is world-readable, so you read every password hash on the system.',
      flag: SHADOW_FLAG,
      content: `root:$6$rounds=5000$ab3c...$Hk9...:19000:0:99999:7:::\n${SHADOW_FLAG}`,
    };
  }
  return {
    success: false,
    reason: 'Permission denied: /etc/shadow is no longer readable by other users.',
  };
}
