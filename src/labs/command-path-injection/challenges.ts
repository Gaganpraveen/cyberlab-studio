import { hashAnswer } from '../answers';
import type { ChallengeDefinition } from '../types';
import { COMMAND_FLAG, PATH_FLAG } from './engine';

const lab = 'command-path-injection';

export const challenges: ChallengeDefinition[] = [
  {
    id: 'cmd-inject',
    labId: lab,
    title: 'Escape the ping command',
    difficulty: 'intermediate',
    points: 20,
    kind: 'flag',
    topicIds: ['APP-03'],
    prompt:
      'On the **Command** tab, the tool runs `ping <your input>` through a shell with no defenses. Chain a second command onto the hostname to read `/flag`, then submit it. (Try something like `localhost; cat /flag`.)',
    hints: [
      'Shell metacharacters — `;`, `&&`, `|` — separate commands.',
      'Append `; cat /flag` after a harmless hostname.',
    ],
    acceptedHashes: [hashAnswer(COMMAND_FLAG)],
    solution:
      `Because the input is pasted into a shell string, a ` +
      '`;`' +
      ` ends the ping command and starts a new one of your choosing. ` +
      '`localhost; cat /flag`' +
      ` runs both, and the second prints the flag **${COMMAND_FLAG}**. The shell, not ping, is the vulnerability.`,
  },
  {
    id: 'cmd-term',
    labId: lab,
    title: 'Name the flaw',
    difficulty: 'beginner',
    points: 10,
    kind: 'answer',
    topicIds: ['APP-03'],
    prompt:
      'Running attacker-chosen operating-system commands by smuggling shell metacharacters through an input has a two-word name. **What is it?**',
    hints: [
      'It is not SQL injection — the target is the operating-system shell.',
      'The two words are &ldquo;command ___&rdquo;.',
    ],
    acceptedHashes: [
      hashAnswer('command injection'),
      hashAnswer('os command injection'),
      hashAnswer('shell injection'),
      hashAnswer('command-injection'),
    ],
    solution:
      '**Command injection** (OS command injection) is when untrusted input reaches a shell and its metacharacters are interpreted as syntax, letting an attacker run extra commands. The root cause is building a shell string from input; the cure is to not use a shell at all.',
  },
  {
    id: 'cmd-fix',
    labId: lab,
    title: 'Drop the shell',
    difficulty: 'intermediate',
    points: 20,
    kind: 'task',
    topicIds: ['APP-03', 'APP-02'],
    prompt:
      'Enable **argument-array execution** (run the program directly with an argument list, no shell) and run the injection again. The lab marks this solved once the metacharacters are treated as a literal hostname instead of as commands.',
    hints: [
      'With execFile-style calls, the whole input is one argument — no shell parses it.',
      'The injected `; cat /flag` becomes part of the hostname and simply fails to resolve.',
    ],
    solution:
      'Passing arguments as an array to the program directly (for example `execFile("ping", [host])`) means no shell ever interprets the input, so `;` and `|` lose their power — they are just characters in a hostname. This is the primary fix; an input allowlist is useful defense in depth but is not a substitute for avoiding the shell.',
  },
  {
    id: 'path-traversal',
    labId: lab,
    title: 'Read a file outside the folder',
    difficulty: 'intermediate',
    points: 20,
    kind: 'flag',
    topicIds: ['APP-04'],
    prompt:
      'On the **Path** tab, the viewer serves files from `/var/www/files/<name>` with no checks. Use `../` sequences to climb out and read the secret file, then submit the flag. (Hint: the secret is at `/etc/app/secret.txt`.)',
    hints: [
      'Each `../` moves one directory up from the base folder.',
      'Try `../../../etc/app/secret.txt`.',
    ],
    acceptedHashes: [hashAnswer(PATH_FLAG)],
    solution:
      `The name is joined to the base directory and then the operating system resolves ` +
      '`../`' +
      `, so enough ` +
      '`../`' +
      ` segments climb above the intended folder to any file the process can read. ` +
      '`../../../etc/app/secret.txt`' +
      ` reaches the secret and its flag **${PATH_FLAG}**.`,
  },
  {
    id: 'path-term',
    labId: lab,
    title: 'Name the climb',
    difficulty: 'beginner',
    points: 10,
    kind: 'answer',
    topicIds: ['APP-04'],
    prompt:
      'Using `../` sequences in a filename to escape the intended directory and reach other files has a well-known name (two words). **What is it?**',
    hints: [
      'It is also called &ldquo;directory ___&rdquo;.',
      'The key character sequence is dot-dot-slash.',
    ],
    acceptedHashes: [
      hashAnswer('path traversal'),
      hashAnswer('directory traversal'),
      hashAnswer('path-traversal'),
      hashAnswer('dot dot slash'),
      hashAnswer('directory traversal attack'),
    ],
    solution:
      '**Path traversal** (directory traversal) abuses `../` in a filename to step outside the directory an application meant to confine you to, reaching sensitive files elsewhere on disk. The fix is to resolve the final path and confirm it still sits inside the allowed base directory before opening it.',
  },
  {
    id: 'path-fix',
    labId: lab,
    title: 'Confine the path',
    difficulty: 'intermediate',
    points: 20,
    kind: 'task',
    topicIds: ['APP-04', 'APP-02'],
    prompt:
      'Enable **canonicalize and confine** and try the traversal again. The lab marks this solved once a resolved path that escapes the base directory is rejected.',
    hints: [
      'Resolve the full path first, then check it still begins with the base directory.',
      'A resolved path of /etc/app/secret.txt is outside /var/www/files and must be refused.',
    ],
    solution:
      'The safe pattern is: join the input to the base directory, resolve `.`/`..` to an absolute canonical path, then verify the result is still inside the base directory — and reject it otherwise. Canonicalizing before the check defeats tricks like `....//` and encoded separators. Serving by an allowlist of known filenames is even stronger where it fits.',
  },
];
