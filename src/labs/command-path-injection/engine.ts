/**
 * Deterministic models of two boundary-escape injection flaws, over a tiny fake
 * shell and a fake filesystem. Nothing here touches a real shell or real files —
 * `runCommand` understands four harmless commands and `readFile` serves a fixed
 * map — so the learner can run the attack and then watch each defense stop it.
 *
 * Command injection: user input is concatenated into a shell string, so shell
 * metacharacters (; | && $()) run extra commands. Passing arguments as an array
 * (no shell) or allowlisting the input stops it. Path traversal: user input is
 * used as a file path, so ../ escapes the intended directory. Canonicalizing the
 * path and confining it to a base directory stops it.
 */

export const COMMAND_FLAG = 'CTF{shell_metacharacters_win}';
export const PATH_FLAG = 'CTF{dot_dot_slash_escapes}';

// --- Command injection -----------------------------------------------------

/** A fake filesystem the fake `cat`/`ls` commands can read. */
const FAKE_FS: Record<string, string> = {
  '/flag': COMMAND_FLAG,
  '/etc/passwd': 'root:x:0:0:root:/root:/bin/bash\nwww-data:x:33:33:/var/www:/usr/sbin/nologin',
};

/**
 * A valid hostname: letters, digits, dots, hyphens — but never a *leading*
 * hyphen, which a program reads as an option flag (e.g. `-v`), not a host.
 * This serves as both the input allowlist and the check the fake `ping` runs
 * on its host argument, so option injection is rejected in either defense.
 */
const HOSTNAME = /^[a-z0-9][a-z0-9.-]*$/i;

/**
 * Shell command substitution: `$(...)` and backticks run their inner command
 * first and splice the output back into the command line. Modeled so the
 * vulnerable path treats them as a real shell would, not as inert text.
 */
const SUBSTITUTION = /\$\(([^)]*)\)|`([^`]*)`/g;

function extractSubstitutions(input: string): string[] {
  const found: string[] = [];
  for (const m of input.matchAll(SUBSTITUTION)) {
    found.push((m[1] ?? m[2] ?? '').trim());
  }
  return found;
}

/** Run one parsed command (argv). Only four commands are understood. */
function runCommand(argv: string[]): string {
  const [cmd, ...args] = argv;
  switch (cmd) {
    case 'ping': {
      // `--` ends option parsing: whatever follows is a positional argument.
      const host = (args[0] === '--' ? args[1] : args[0]) ?? '';
      return HOSTNAME.test(host)
        ? `PING ${host}: 3 packets transmitted, 3 received`
        : `ping: ${host || '(empty)'}: Name or service not known`;
    }
    case 'cat':
      return FAKE_FS[args[0] ?? ''] ?? `cat: ${args[0] ?? ''}: No such file or directory`;
    case 'ls':
      return Object.keys(FAKE_FS).join('  ');
    case 'id':
      return 'uid=33(www-data) gid=33(www-data) groups=33(www-data)';
    case '':
    case undefined:
      return '';
    default:
      return `${cmd}: command not found`;
  }
}

/** Split a shell string on the common command separators. */
function splitShell(input: string): string[] {
  return input
    .split(/\s*(?:;|&&|\|\||\|)\s*/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function tokenize(segment: string): string[] {
  return segment.trim().split(/\s+/).filter(Boolean);
}

export interface CmdDefenses {
  /** Pass arguments as an array to the program directly, with no shell. */
  argArray: boolean;
  /** Reject input that is not a bare hostname. */
  allowlist: boolean;
}

export const CMD_NONE: CmdDefenses = { argArray: false, allowlist: false };

export interface CmdResult {
  blocked: boolean;
  /** More than one command ran — injection occurred. */
  injected: boolean;
  /** The shell string that was executed (vulnerable path), for display. */
  executed: string;
  outputs: string[];
  reason?: string;
  flag?: string;
}

/** Model the "ping this host" tool under the chosen defenses. */
export function runPing(host: string, defenses: CmdDefenses): CmdResult {
  if (defenses.allowlist && !HOSTNAME.test(host)) {
    return {
      blocked: true,
      injected: false,
      executed: '',
      outputs: [],
      reason: 'Input rejected: only letters, digits, dots, and hyphens are allowed in a hostname.',
    };
  }

  if (defenses.argArray) {
    // No shell: the whole input is a single argument to ping, and `--` stops a
    // leading `-` from being read as an option. Metacharacters and $(...) are
    // inert — there is no shell to interpret them, and no option to inject.
    return {
      blocked: false,
      injected: false,
      executed: `execFile("ping", ["--", ${JSON.stringify(host)}])`,
      outputs: [runCommand(['ping', '--', host])],
    };
  }

  // Vulnerable: input is concatenated into a shell command string.
  const shellString = `ping ${host}`;

  // A real shell expands $(...) / `...` first — running those commands and
  // splicing their output into the line before it is split and executed. Any
  // substitution means an attacker command ran, so this is injection too.
  const subs = extractSubstitutions(shellString);
  if (subs.length > 0) {
    let i = 0;
    const subOutputs = subs.map((s) => runCommand(tokenize(s)));
    const substituted = shellString.replace(SUBSTITUTION, () => subOutputs[i++] ?? '');
    const segments = splitShell(substituted);
    const outputs = segments.map((s) => runCommand(tokenize(s)));
    const joined = [...subOutputs, ...outputs].join('\n');
    return {
      blocked: false,
      injected: true,
      executed: `sh -c ${JSON.stringify(shellString)}`,
      outputs,
      flag: joined.includes(COMMAND_FLAG) ? COMMAND_FLAG : undefined,
    };
  }

  const segments = splitShell(shellString);
  const outputs = segments.map((s) => runCommand(tokenize(s)));
  const injected = segments.length > 1;
  const joined = outputs.join('\n');
  return {
    blocked: false,
    injected,
    executed: `sh -c ${JSON.stringify(shellString)}`,
    outputs,
    flag: joined.includes(COMMAND_FLAG) ? COMMAND_FLAG : undefined,
  };
}

// --- Path traversal --------------------------------------------------------

export const BASE_DIR = '/var/www/files';

const FILES: Record<string, string> = {
  '/var/www/files/welcome.txt': 'Welcome to the documents service.',
  '/var/www/files/report.txt': 'Q3 report: revenue up, churn down.',
  '/etc/app/secret.txt': `DB_PASSWORD=hunter2\n${PATH_FLAG}`,
};

/** Resolve . and .. in an absolute POSIX path (no filesystem access). */
export function normalizePath(p: string): string {
  const stack: string[] = [];
  for (const part of p.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') stack.pop();
    else stack.push(part);
  }
  return '/' + stack.join('/');
}

export interface PathDefenses {
  /** Resolve the path and require it stays inside the base directory. */
  confine: boolean;
}

export const PATH_NONE: PathDefenses = { confine: false };

export interface PathResult {
  resolved: string;
  escaped: boolean;
  blocked: boolean;
  content: string | null;
  reason?: string;
  flag?: string;
}

/** Model the "view file" tool: read BASE_DIR/<name> under the chosen defenses. */
export function readFile(name: string, defenses: PathDefenses): PathResult {
  const resolved = normalizePath(`${BASE_DIR}/${name}`);
  const escaped = resolved !== BASE_DIR && !resolved.startsWith(`${BASE_DIR}/`);

  if (defenses.confine && escaped) {
    return {
      resolved,
      escaped: true,
      blocked: true,
      content: null,
      reason: `Rejected: ${resolved} is outside ${BASE_DIR}.`,
    };
  }

  const content = FILES[resolved] ?? null;
  return {
    resolved,
    escaped,
    blocked: false,
    content,
    reason: content === null ? `${resolved}: No such file` : undefined,
    flag: content && content.includes(PATH_FLAG) ? PATH_FLAG : undefined,
  };
}
